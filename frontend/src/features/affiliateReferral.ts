export type AffiliateReferral = {
  referralToken: string;
  contextToken: string;
  expiresAt: string;
  partnerName: string;
  agencyName: string | null;
};

const STORAGE_KEY = 'vagafogo:affiliate-referral:v1';
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const API_BASE = import.meta.env?.VITE_API_BASE ?? 'https://vagafogo-production.up.railway.app';
let pending: { token: string; promise: Promise<AffiliateReferral | null> } | null = null;
let revision = 0;
let memoryReferral: AffiliateReferral | null = null;

export const validStoredAffiliateReferral = (value: unknown, now = Date.now()): AffiliateReferral | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<AffiliateReferral>;
  if (!TOKEN.test(String(item.referralToken ?? '')) || !TOKEN.test(String(item.contextToken ?? ''))
    || typeof item.expiresAt !== 'string' || !Number.isFinite(Date.parse(item.expiresAt))
    || Date.parse(item.expiresAt) <= now || typeof item.partnerName !== 'string') return null;
  return {
    referralToken: item.referralToken!, contextToken: item.contextToken!, expiresAt: item.expiresAt,
    partnerName: item.partnerName.slice(0, 160), agencyName: typeof item.agencyName === 'string' ? item.agencyName.slice(0, 160) : null,
  };
};

const readStored = () => {
  const memory = validStoredAffiliateReferral(memoryReferral);
  if (memory) return memory;
  try { return validStoredAffiliateReferral(JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? 'null')); }
  catch { return null; }
};

export const currentAffiliateContextToken = () => {
  if (typeof window === 'undefined') return undefined;
  const stored = readStored();
  const explicit = new URLSearchParams(window.location.search).get('ref');
  return stored && (explicit === null || explicit.trim() === stored.referralToken) ? stored.contextToken : undefined;
};

export const clearAffiliateReferral = () => {
  if (typeof window === 'undefined') return;
  revision += 1;
  pending = null;
  memoryReferral = null;
  try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* storage is optional */ }
  const url = new URL(window.location.href);
  if (url.searchParams.has('ref')) {
    url.searchParams.delete('ref');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }
};

// A public reference is resolved to a server-owned context. IDs and commission
// values never come from URL parameters or marketing attribution in storage.
export const prepareAffiliateReferral = async (): Promise<AffiliateReferral | null> => {
  if (typeof window === 'undefined') return null;
  const query = new URLSearchParams(window.location.search);
  const explicit = query.get('ref');
  const stored = readStored();
  const token = explicit === null ? stored?.referralToken ?? '' : explicit.trim();
  if (!token) {
    if (explicit !== null) throw new Error('Este link de indicação está incompleto. Peça um novo link ao parceiro.');
    return null;
  }
  if (!TOKEN.test(token)) throw new Error('Este link de indicação não é válido. Peça um novo link ao parceiro.');
  if (stored?.referralToken === token) return stored;
  if (pending?.token === token) return pending.promise;
  const requestRevision = ++revision;

  const promise = (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${API_BASE}/api/affiliates/public/resolve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referralToken: token }), signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      const referral = validStoredAffiliateReferral({ ...body, referralToken: token });
      if (!response.ok || !referral) throw new Error('Não foi possível validar este link de indicação. Tente novamente ou peça um novo link ao parceiro.');
      if (requestRevision !== revision) return null;
      memoryReferral = referral;
      try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(referral)); } catch { /* request still carries the context */ }
      return referral;
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') throw error;
      throw new Error('Não foi possível validar a indicação agora. Tente novamente.');
    } finally {
      window.clearTimeout(timeout);
      if (pending?.token === token) pending = null;
    }
  })();
  pending = { token, promise };
  return promise;
};
