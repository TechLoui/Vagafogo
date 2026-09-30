import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { obterFirestoreAdmin } from "./firebaseAdmin";

const COLLECTION = "crm_jornadas";
const SESSION_PATTERN = /^[A-Za-z0-9._:-]{8,100}$/;
const ALLOWED_EVENTS = new Set([
  "iniciou",
  "progresso",
  "saida",
  "tentativa_pagamento",
  "erro_pagamento",
  "consentimento_revogado",
]);
const KNOWN_DOMAINS = new Set(["vagafogopiri.com.br", "vagafogo.com.br"]);

type JourneyEventInput = {
  sessionId?: unknown;
  evento?: unknown;
  etapa?: unknown;
  subEtapa?: unknown;
  atribuicao?: unknown;
  contexto?: unknown;
  contato?: unknown;
  consentimentoRecuperacao?: unknown;
  website?: unknown;
};

const clean = (value: unknown, maximum: number) =>
  typeof value === "string" ? value.trim().slice(0, maximum) : "";

const normalizePhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
};

export const normalizarDominioOrigem = (value: unknown) => {
  const raw = clean(value, 180).toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
  const hostname = raw.replace(/^www\./, "").replace(/:\d+$/, "");
  return KNOWN_DOMAINS.has(hostname) ? hostname : hostname;
};

const journeyId = (sessionId: string) =>
  createHash("sha256").update("crm-journey:v1\0").update(sessionId).digest("hex");

const timestampMillis = (value: unknown) => {
  const date = (value as { toDate?: () => Date } | null)?.toDate?.();
  return date instanceof Date ? date.getTime() : 0;
};

const normalizeAttribution = (value: unknown) => {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const entryDomain = normalizarDominioOrigem(raw.entryDomain);
  const referringDomain = normalizarDominioOrigem(raw.referringDomain);
  const sourceDomain = normalizarDominioOrigem(raw.sourceDomain) ||
    (KNOWN_DOMAINS.has(referringDomain) ? referringDomain : entryDomain);
  const sourceChannelRaw = clean(raw.sourceChannel, 30).toLowerCase();
  const sourceChannel = sourceChannelRaw === "whatsapp" ? "whatsapp" : "site";
  const allowedKeys = [
    "entryPath", "capturedAt", "utmSource", "utmMedium", "utmCampaign",
    "utmContent", "utmTerm", "gclid", "fbclid",
  ] as const;
  const attribution: Record<string, string> = {
    ...(entryDomain ? { entryDomain } : {}),
    ...(referringDomain ? { referringDomain } : {}),
    ...(sourceDomain ? { sourceDomain } : {}),
    sourceChannel,
  };
  allowedKeys.forEach((key) => {
    const normalized = clean(raw[key], key === "entryPath" ? 300 : 250);
    if (normalized) attribution[key] = normalized;
  });
  return attribution;
};

const normalizeContext = (value: unknown) => {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const pacoteIds = Array.isArray(raw.pacoteIds)
    ? raw.pacoteIds.map((item) => clean(item, 100)).filter(Boolean).slice(0, 10)
    : [];
  const atividades = Array.isArray(raw.atividades)
    ? raw.atividades.map((item) => clean(item, 160)).filter(Boolean).slice(0, 10)
    : [];
  const participants = Number(raw.participantes);
  const estimatedValue = Number(raw.valorEstimado);
  return {
    ...(pacoteIds.length ? { interessePacoteIds: pacoteIds } : {}),
    ...(atividades.length ? { interesseAtividades: atividades } : {}),
    ...(clean(raw.dataDesejada, 20) ? { dataDesejada: clean(raw.dataDesejada, 20) } : {}),
    ...(clean(raw.horario, 80) ? { horarioDesejado: clean(raw.horario, 80) } : {}),
    ...(Number.isFinite(participants) && participants >= 0 ? { participantes: Math.min(participants, 500) } : {}),
    ...(Number.isFinite(estimatedValue) && estimatedValue >= 0 ? { valorEstimado: Math.min(estimatedValue, 1_000_000) } : {}),
    ...(clean(raw.formaPagamento, 30) ? { formaPagamento: clean(raw.formaPagamento, 30) } : {}),
  };
};

export const registrarEventoJornada = async (input: JourneyEventInput) => {
  if (clean(input.website, 20)) return { ignorado: true };
  const sessionId = clean(input.sessionId, 100);
  if (!SESSION_PATTERN.test(sessionId)) throw new Error("INVALID_JOURNEY_SESSION");
  const evento = clean(input.evento, 40);
  if (!ALLOWED_EVENTS.has(evento)) throw new Error("INVALID_JOURNEY_EVENT");
  const etapa = Math.min(4, Math.max(0, Math.floor(Number(input.etapa) || 0)));
  const subEtapa = clean(input.subEtapa, 80);
  const attribution = normalizeAttribution(input.atribuicao);
  const context = normalizeContext(input.contexto);
  const consent = input.consentimentoRecuperacao === true;
  const rawContact = input.contato && typeof input.contato === "object" && !Array.isArray(input.contato)
    ? input.contato as Record<string, unknown>
    : {};
  const phone = consent ? normalizePhone(rawContact.telefone) : "";
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const ref = db.collection(COLLECTION).doc(journeyId(sessionId));

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const current = snapshot.exists ? snapshot.data()! : {};
    const currentMaxStage = Number(current.etapaMaxima ?? 0);
    const revokeConsent = evento === "consentimento_revogado" ||
      (current.recuperacaoWhatsappOptIn === true && input.consentimentoRecuperacao === false);
    const patch: FirebaseFirestore.DocumentData = {
      sessionId,
      status: current.status === "convertida" ? "convertida" : "em_andamento",
      ultimoEvento: evento,
      ultimaEtapa: etapa,
      etapaMaxima: Math.max(currentMaxStage, etapa),
      ...(subEtapa ? { ultimaSubEtapa: subEtapa } : {}),
      ...attribution,
      ...context,
      eventosContagem: FieldValue.increment(1),
      ultimoEventoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
      [`etapa${etapa}Em`]: FieldValue.serverTimestamp(),
      ...(evento === "saida" ? { ultimaSaidaEm: FieldValue.serverTimestamp() } : {}),
      ...(evento === "tentativa_pagamento" ? { tentouPagamento: true, ultimaTentativaPagamentoEm: FieldValue.serverTimestamp() } : {}),
      ...(evento === "erro_pagamento" ? { ultimoErroPagamento: clean(rawContact.erro, 500) || "erro_pagamento", erroPagamentoEm: FieldValue.serverTimestamp() } : {}),
      ...(!snapshot.exists ? { criadoEm: FieldValue.serverTimestamp(), iniciadoEm: FieldValue.serverTimestamp() } : {}),
    };
    if (consent && phone) {
      Object.assign(patch, {
        recuperacaoWhatsappOptIn: true,
        telefone: phone,
        nome: clean(rawContact.nome, 160) || current.nome || "Cliente",
        email: clean(rawContact.email, 240) || current.email || null,
        consentimentoRecuperacaoEm: current.consentimentoRecuperacaoEm ?? FieldValue.serverTimestamp(),
      });
      transaction.set(db.collection("crm_whatsapp_contatos").doc(phone), {
        telefone: phone,
        nome: clean(rawContact.nome, 160) || current.nome || "Cliente",
        email: clean(rawContact.email, 240) || current.email || null,
        marketingOptIn: true,
        marketingOptInOrigem: "checkout_jornada",
        marketingOptInEm: FieldValue.serverTimestamp(),
        optOutAt: FieldValue.delete(),
        optOutOrigem: FieldValue.delete(),
        atualizadoEm: FieldValue.serverTimestamp(),
      }, { merge: true });
    } else if (revokeConsent) {
      Object.assign(patch, {
        recuperacaoWhatsappOptIn: false,
        telefone: FieldValue.delete(),
        nome: FieldValue.delete(),
        email: FieldValue.delete(),
        consentimentoRevogadoEm: FieldValue.serverTimestamp(),
      });
      const currentPhone = normalizePhone(current.telefone);
      if (currentPhone) {
        transaction.set(db.collection("crm_whatsapp_contatos").doc(currentPhone), {
          marketingOptIn: false,
          optOutAt: FieldValue.serverTimestamp(),
          optOutOrigem: "consentimento_checkout_revogado",
          atualizadoEm: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }
    transaction.set(ref, patch, { merge: true });
  });
  return { registrado: true };
};

export const registrarConclusaoJornadaReserva = async (
  sessionId: unknown,
  reservaId: string,
) => {
  const normalizedSessionId = clean(sessionId, 100);
  if (!SESSION_PATTERN.test(normalizedSessionId)) return false;
  const db = obterFirestoreAdmin();
  if (!db) return false;
  await db.collection(COLLECTION).doc(journeyId(normalizedSessionId)).set({
    sessionId: normalizedSessionId,
    status: "convertida",
    reservaId,
    ultimaEtapa: 4,
    etapaMaxima: 4,
    concluidoEm: FieldValue.serverTimestamp(),
    ultimoEventoEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
  }, { merge: true });
  return true;
};

export const jornadaEstaAbandonada = (data: FirebaseFirestore.DocumentData, cutoffMs: number) =>
  data.status !== "convertida" && timestampMillis(data.ultimoEventoEm) > 0 && timestampMillis(data.ultimoEventoEm) <= cutoffMs;

