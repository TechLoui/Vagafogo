import { obterFirestoreAdmin } from "./firebaseAdmin";
import { canonicalLeadPhone, leadAgenteEstaFinalizado, leadPhoneVariants } from "./agentReservationTools";

type FollowupCandidate = {
  sessionId: string;
  phone: string;
  createdAt?: number;
  bookingFollowup?: { date?: string } | null;
};

type Dependencies = { db?: FirebaseFirestore.Firestore | null };
type Data = Record<string, unknown>;
const MAX_RESULTS = 100;
const LEAD_COLLECTIONS = ["crm_leads_agente", "crm_leads_agente_rascunhos"];

const timestamp = (value: unknown): number => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : 0;
  if (value && typeof value === "object" && "toMillis" in value
    && typeof value.toMillis === "function") return timestamp(value.toMillis());
  if (value && typeof value === "object" && "toDate" in value
    && typeof value.toDate === "function") return timestamp(value.toDate());
  const parsed = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};
const latest = (data: Data, fields: string[]) => Math.max(0, ...fields.map((field) => timestamp(data[field])));
const plain = (value: unknown) => String(value ?? "").trim().toLowerCase();
const validDate = (value: unknown) => {
  const date = String(value ?? "");
  const parsed = new Date(`${date}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === date ? date : "";
};

const phoneForms = (phone: string) => Array.from(new Set(leadPhoneVariants(phone).flatMap((variant) => {
  const local = variant.slice(2);
  const split = local.length === 11 ? 7 : 6;
  const formatted = `(${local.slice(0, 2)}) ${local.slice(2, split)}-${local.slice(split)}`;
  return [variant, local, formatted, `+55 ${formatted}`, `+${variant}`];
})));

const withinConversation = (at: number, startedAt: number) => at > 0
  && (!startedAt || at >= startedAt) && at <= Date.now() + 60_000;

const leadConcludesConversation = (data: Data, candidate: FollowupCandidate, phone: string, startedAt: number) => {
  if (data.teste === true) return false;
  const storedPhone = String(data.telefone ?? "").replace(/\D/g, "");
  if (storedPhone && canonicalLeadPhone(storedPhone) !== phone) return false;
  const sessionId = String(data.sessionId ?? "");
  const exactSession = sessionId === candidate.sessionId;
  // Identified leads are unified under whatsapp_<phone>, including site leads.
  // The site channel and a completion during this chat bind that shared record
  // to the current conversation; an unrelated site session never qualifies.
  const sharedPhoneSession = /^whatsapp_\d{10,15}$/.test(sessionId)
    && canonicalLeadPhone(sessionId.slice("whatsapp_".length)) === phone;
  const siteChannel = data.canal === "site" || data.origem === "agente_site"
    || (Array.isArray(data.canaisAtendimento) && data.canaisAtendimento.includes("site"));
  if (!exactSession && !(sharedPhoneSession && storedPhone && siteChannel && startedAt)) return false;

  const human = data.etapa === "atendimento_humano" || data.resultado === "atendimento_humano";
  const terminal = leadAgenteEstaFinalizado(data.etapa, data.resultado)
    || data.finalizado === true || data.estadoRegistro === "finalizado";
  if (!human && !terminal) return false;
  const completedAt = latest(data, ["finalizadoEm", "concluidoEm", "encerradoEm", "dataPagamento"])
    || latest(data, ["atualizadoEm", "ultimaInteracaoEm", "updatedAt", "criadoEm", "createdAt"]);
  return withinConversation(completedAt, startedAt);
};

const confirmedReservation = (data: Data) => {
  const status = plain(data.status ?? data.Status);
  if (["cancelado", "cancelada", "canceled", "cancelled", "refunded", "reembolsado", "estornado"].includes(status)) return false;
  return data.confirmada === true
    || ["pago", "paid", "confirmada", "confirmado", "confirmed", "received", "approved"].includes(status);
};

/** True means that the reminder must be suppressed. Storage failures throw so
 * callers cannot interpret an unverified completion state as permission to send. */
export const verificarConclusaoRetomadaSite = async (candidate: FollowupCandidate, dependencies: Dependencies = {}): Promise<boolean> => {
  const db = dependencies.db === undefined ? obterFirestoreAdmin() : dependencies.db;
  if (!db) throw new Error("SITE_FOLLOWUP_FIRESTORE_UNAVAILABLE");
  const digits = String(candidate.phone ?? "").replace(/\D/g, "");
  const normalized = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  if (!candidate.sessionId || !/^55[1-9]\d{9,10}$/.test(normalized)) throw new Error("SITE_FOLLOWUP_IDENTITY_INVALID");
  const phone = canonicalLeadPhone(normalized);
  const forms = phoneForms(phone);
  const startedAt = timestamp(candidate.createdAt);
  const date = validDate(candidate.bookingFollowup?.date);
  if (!startedAt && !date) throw new Error("SITE_FOLLOWUP_START_REQUIRED");

  const leadSnapshots = await Promise.all(LEAD_COLLECTIONS.flatMap((collection) => [
    db.collection(collection).where("sessionId", "==", candidate.sessionId).limit(MAX_RESULTS + 1).get(),
    db.collection(collection).where("telefone", "in", forms).limit(MAX_RESULTS + 1).get(),
  ]));
  if (leadSnapshots.some((snapshot) => snapshot.docs.some((document) =>
    leadConcludesConversation(document.data(), candidate, phone, startedAt)))) return true;
  if (leadSnapshots.some((snapshot) => snapshot.docs.length > MAX_RESULTS)) throw new Error("SITE_FOLLOWUP_LEAD_QUERY_LIMIT");

  const reservations = await db.collection("reservas").where("telefone", "in", forms).limit(MAX_RESULTS + 1).get();
  const concluded = reservations.docs.some((document) => {
    const data = document.data();
    if (!confirmedReservation(data)) return false;
    if (canonicalLeadPhone(data.telefone) !== phone) return false;
    if (date) return String(data.data ?? data.Data ?? "").slice(0, 10) === date;
    // A form purchase may have no date in the chat. Only creation or an actual
    // payment/confirmation in this conversation can suppress its reminder.
    const completedAt = latest(data, ["criadoEm", "createdAt", "dataPagamento", "confirmadoEm", "confirmadaEm", "pagoEm"])
      || timestamp(document.createTime);
    return withinConversation(completedAt, startedAt);
  });
  if (concluded) return true;
  if (reservations.docs.length > MAX_RESULTS) throw new Error("SITE_FOLLOWUP_RESERVATION_QUERY_LIMIT");
  return false;
};
