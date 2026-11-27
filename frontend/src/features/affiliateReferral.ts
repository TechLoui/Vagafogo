import { normalizeAgencyBranding } from './affiliates/affiliateBranding.ts';
import type { AgencyBranding } from './affiliates/types';

export type AffiliateReferral = {
  referralToken: string;
  contextToken: string;
  expiresAt: string;
  partnerName: string | null;
  agencyName: string | null;
  agencySlug?: string;
  agencyLogoUrl?: string;
  agencyBranding?: AgencyBranding;
};

const STORAGE_KEY = 'vagafogo:affiliate-referral:v1';
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const API_BASE = import.meta.env?.VITE_API_BASE ?? 'https://vagafogo-production.up.railway.app';
let pending: { key: string; promise: Promise<AffiliateReferral | null> } | null = null;
let revision = 0;
let memoryReferral: AffiliateReferral | null = null;

const RESERVED_PATHS = new Set(['admin', 'agente', 'agencia', 'afiliados', 'api', 'assets', 'brunch', 'crm', 'educacao-ambiental', 'formulario', 'historia', 'index', 'login', 'minha-reserva', 'parceiro', 'planeje-sua-visita', 'reservar', 'trilha', 'output', 'backend', 'frontend', 'public', 'static']);
const canonicalSlug = (value: unknown) => typeof value === 'string' && value.length >= 3 && value.length <= 60
  && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && !RESERVED_PATHS.has(value) ? value : null;
export const agencySlugFromPath = (pathname: string): string | null => {
  const match = /^\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  try { return canonicalSlug(decodeURIComponent(match[1]).toLowerCase()); } catch { return null; }
};
const visibleSlug = () => {
  if (typeof window === 'undefined') return null;
  return agencySlugFromPath(window.location.pathname || new URL(window.location.href).pathname);
};
const validLogoUrl = (value: unknown) => {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value), api = new URL(API_BASE);
    return url.origin === api.origin && !url.username && !url.password && !url.hash
      && /^\/api\/affiliates\/public\/agencies\/[A-Za-z0-9_-]{1,128}\/logo$/.test(url.pathname)
      && /^\?v=[a-f0-9]{24}$/.test(url.search) ? url.href : undefined;
  } catch { return undefined; }
};

export const validStoredAffiliateReferral = (value: unknown, now = Date.now()): AffiliateReferral | null => {
  if (!value || typeof value !== 'object') return null;
  const item = value as Partial<AffiliateReferral>;
  if (!TOKEN.test(String(item.referralToken ?? '')) || !TOKEN.test(String(item.contextToken ?? ''))
    || typeof item.expiresAt !== 'string' || !Number.isFinite(Date.parse(item.expiresAt))
    || Date.parse(item.expiresAt) <= now || (typeof item.partnerName !== 'string' && item.partnerName !== null)) return null;
  const agencyName = typeof item.agencyName === 'string' && item.agencyName.trim() ? item.agencyName.trim().slice(0, 160) : null;
  if (item.partnerName === null && !agencyName) return null;
  const slug = item.agencySlug === undefined ? undefined : canonicalSlug(item.agencySlug);
  if (slug === null) return null;
  const branding = normalizeAgencyBranding(item.agencyBranding), logoUrl = validLogoUrl(item.agencyLogoUrl);
  return {
    referralToken: item.referralToken!, contextToken: item.contextToken!, expiresAt: item.expiresAt,
    partnerName: item.partnerName === null ? null : item.partnerName.slice(0, 160), agencyName,
    ...(slug ? { agencySlug: slug } : {}), ...(logoUrl ? { agencyLogoUrl: logoUrl } : {}),
    ...(branding ? { agencyBranding: branding } : {}),
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
  const slug = visibleSlug();
  if (slug) return stored?.agencySlug === slug ? stored.contextToken : undefined;
  const explicit = new URLSearchParams(window.location.search).get('ref');
  return stored && (explicit === null || explicit.trim() === stored.referralToken) ? stored.contextToken : undefined;
};

const discardStored = () => {
  memoryReferral = null;
  try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* storage is optional */ }
};

export const clearAffiliateReferral = () => {
  if (typeof window === 'undefined') return;
  revision += 1;
  pending = null;
  discardStored();
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
  const slug = visibleSlug();
  if (slug) return prepareAgencyReferral(slug);
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
  return resolveReferral(`ref:${token}`, '/resolve', { referralToken: token }, token);
};

export const prepareAgencyReferral = async (value: string): Promise<AffiliateReferral | null> => {
  if (typeof window === 'undefined') return null;
  const slug = canonicalSlug(value);
  if (!slug) { revision++; pending = null; discardStored(); throw new Error('Este endereço de agência não é válido. Confira o link recebido.'); }
  const cached = validStoredAffiliateReferral(memoryReferral);
  if (cached?.agencySlug === slug && cached.partnerName === null) return cached;
  return resolveReferral(`slug:${slug}`, '/resolve-slug', { slug }, undefined, slug);
};

const resolveReferral = (key: string, endpoint: string, payload: Record<string, string>, token?: string, slug?: string): Promise<AffiliateReferral | null> => {
  if (pending?.key === key) return pending.promise;
  const requestRevision = ++revision;
  discardStored();
  const promise = (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${API_BASE}/api/affiliates/public${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      if (requestRevision !== revision) return null;
      const referral = validStoredAffiliateReferral({ ...body, ...(token ? { referralToken: token } : {}) });
      if (!response.ok || !referral || (slug && (referral.agencySlug !== slug || referral.partnerName !== null))) throw new Error('Não foi possível validar este link de indicação. Tente novamente ou peça um novo link ao responsável.');
      memoryReferral = referral;
      try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(referral)); } catch { /* request still carries the context */ }
      return referral;
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') throw error;
      throw new Error('Não foi possível validar a indicação agora. Tente novamente.');
    } finally {
      window.clearTimeout(timeout);
      if (pending?.key === key) pending = null;
    }
  })();
  pending = { key, promise };
  return promise;
};
