export type AtribuicaoReserva = {
  sessionId: string;
  entryDomain: string;
  entryPath: string;
  referringDomain: string;
  sourceDomain: string;
  sourceChannel: "site" | "whatsapp";
  capturedAt: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  gclid?: string;
  fbclid?: string;
  campaignId?: string;
  recipientId?: string;
  agentSessionId?: string;
};

const STORAGE_KEY = "vagafogo:first-touch-attribution";
const API_BASE = import.meta.env.VITE_API_BASE ?? "https://vagafogo-production.up.railway.app";
const VAGAFOGO_DOMAINS = new Set(["vagafogopiri.com.br", "vagafogo.com.br"]);
let memoryAttribution: AtribuicaoReserva | null = null;

const clean = (value: string | null, maximum = 180) => {
  const normalized = (value ?? "").trim();
  return normalized ? normalized.slice(0, maximum) : undefined;
};

const createSessionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

const referringDomain = () => {
  if (!document.referrer) return "direto";
  try {
    const hostname = new URL(document.referrer).hostname;
    return hostname || "direto";
  } catch {
    return "desconhecido";
  }
};

export const normalizarDominioVagafogo = (value: string | null | undefined) => {
  const hostname = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .replace(/^www\./, "")
    .replace(/:\d+$/, "");
  return hostname;
};

const deriveSource = (entryDomain: string, referrer: string, query: URLSearchParams) => {
  const entry = normalizarDominioVagafogo(entryDomain);
  const referring = normalizarDominioVagafogo(referrer);
  const utmSource = (query.get("utm_source") ?? "").toLowerCase();
  const channelHint = `${utmSource} ${query.get("source_channel") ?? ""} ${query.get("canal_origem") ?? ""}`.toLowerCase();
  const explicitDomain = normalizarDominioVagafogo(query.get("source_domain") ?? query.get("dominio_origem"));
  const sourceChannel = /(^|[^a-z])(whatsapp|wpp|wa)([^a-z]|$)/.test(channelHint) ||
    referring === "wa.me" || referring.endsWith("whatsapp.com")
    ? "whatsapp" as const
    : "site" as const;
  const sourceDomain = VAGAFOGO_DOMAINS.has(explicitDomain)
    ? explicitDomain
    : VAGAFOGO_DOMAINS.has(referring) && referring !== entry
    ? referring
    : entry || referring || "desconhecido";
  return { sourceDomain, sourceChannel };
};

const readStoredAttribution = () => {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as AtribuicaoReserva : null;
  } catch {
    return null;
  }
};

export const inicializarAtribuicao = (): AtribuicaoReserva | null => {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  if (memoryAttribution) return memoryAttribution;

  const stored = readStoredAttribution();
  if (stored?.sessionId) {
    const query = new URLSearchParams(window.location.search);
    const source = deriveSource(
      stored.entryDomain || window.location.hostname,
      stored.referringDomain || referringDomain(),
      query,
    );
    memoryAttribution = {
      ...stored,
      ...source,
      ...(clean(query.get("cid"), 100) ? { campaignId: clean(query.get("cid"), 100) } : {}),
      ...(clean(query.get("rid"), 100) ? { recipientId: clean(query.get("rid"), 100) } : {}),
      ...(clean(query.get("agent_session"), 100) ? { agentSessionId: clean(query.get("agent_session"), 100) } : {}),
    };
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(memoryAttribution));
    } catch {
      // Mantem a atribuicao migrada apenas em memoria.
    }
    return memoryAttribution;
  }

  const query = new URLSearchParams(window.location.search);
  const entryDomain = normalizarDominioVagafogo(window.location.hostname) || "desconhecido";
  const referrer = referringDomain();
  const source = deriveSource(entryDomain, referrer, query);
  const attribution: AtribuicaoReserva = {
    sessionId: createSessionId(),
    entryDomain,
    entryPath: window.location.pathname.slice(0, 300) || "/",
    referringDomain: referrer,
    ...source,
    capturedAt: new Date().toISOString(),
    ...(clean(query.get("utm_source")) ? { utmSource: clean(query.get("utm_source")) } : {}),
    ...(clean(query.get("utm_medium")) ? { utmMedium: clean(query.get("utm_medium")) } : {}),
    ...(clean(query.get("utm_campaign")) ? { utmCampaign: clean(query.get("utm_campaign")) } : {}),
    ...(clean(query.get("utm_content")) ? { utmContent: clean(query.get("utm_content")) } : {}),
    ...(clean(query.get("utm_term")) ? { utmTerm: clean(query.get("utm_term")) } : {}),
    ...(clean(query.get("gclid"), 250) ? { gclid: clean(query.get("gclid"), 250) } : {}),
    ...(clean(query.get("fbclid"), 250) ? { fbclid: clean(query.get("fbclid"), 250) } : {}),
    ...(clean(query.get("cid"), 100) ? { campaignId: clean(query.get("cid"), 100) } : {}),
    ...(clean(query.get("rid"), 100) ? { recipientId: clean(query.get("rid"), 100) } : {}),
    ...(clean(query.get("agent_session"), 100) ? { agentSessionId: clean(query.get("agent_session"), 100) } : {}),
  };

  memoryAttribution = attribution;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch {
    // A atribuicao em memoria ainda funciona quando o navegador bloqueia storage.
  }
  return attribution;
};

export const obterAtribuicaoReserva = () => inicializarAtribuicao();

export const reiniciarJornadaReserva = () => {
  const previous = inicializarAtribuicao();
  if (!previous || typeof window === "undefined") return previous;
  memoryAttribution = {
    ...previous,
    sessionId: createSessionId(),
    capturedAt: new Date().toISOString(),
    entryPath: window.location.pathname.slice(0, 300) || "/",
  };
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(memoryAttribution));
  } catch {
    // A nova jornada continua disponivel em memoria.
  }
  return memoryAttribution;
};

export type EventoJornadaReserva = {
  evento: "iniciou" | "progresso" | "saida" | "tentativa_pagamento" | "erro_pagamento" | "consentimento_revogado";
  etapa?: number;
  subEtapa?: string;
  contexto?: {
    pacoteIds?: string[];
    atividades?: string[];
    dataDesejada?: string;
    horario?: string;
    participantes?: number;
    valorEstimado?: number;
    formaPagamento?: string;
  };
  consentimentoRecuperacao?: boolean;
  contato?: { nome?: string; email?: string; telefone?: string; erro?: string };
};

export const registrarEventoJornadaReserva = (
  evento: EventoJornadaReserva,
  options?: { beacon?: boolean },
) => {
  const atribuicao = obterAtribuicaoReserva();
  if (!atribuicao) return;
  const body = JSON.stringify({
    sessionId: atribuicao.sessionId,
    atribuicao,
    ...evento,
    website: "",
  });
  const url = `${API_BASE}/crm/jornadas/evento`;
  if (options?.beacon && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(url, new Blob([body], { type: "text/plain" }));
    return;
  }
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
};
