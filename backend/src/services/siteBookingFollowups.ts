import { createHash } from "crypto";
import { obterFirestoreAdmin } from "./firebaseAdmin";
import { enviarMensagemTransacionalPeloAgente } from "./agentTransactionalWhatsapp";
import { listarConversasSite, obterConversaSite, registrarTentativaLembreteReservaSite } from "./siteChatConversations";

const TIMEZONE = "America/Sao_Paulo";
const INACTIVITY_MS = 30 * 60 * 1000;
const SESSION_MS = 2 * 60 * 60 * 1000;
const RETRY_MS = 5 * 60 * 1000;
const CLAIMS = "site_booking_followup_claims";
let running = false;
let timer: NodeJS.Timeout | null = null;
let lastCleanupAt = 0;

type FollowupCandidate = {
  sessionId: string;
  phone: string;
  name: string;
  mode: string;
  bookingFollowup: {
    step: string;
    date: string;
    hour: string;
    offerId: string;
    offerName: string;
    optedIn: boolean;
    lastClientAt: number;
    sentAt: number | null;
    lastAttemptAt: number | null;
  } | null;
};

const localDate = (now: number) => new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date(now));
const localMinutes = (now: number) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(now));
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return value("hour") * 60 + value("minute");
};

export const reservaSiteElegivelParaLembrete = (conversation: FollowupCandidate, now = Date.now()) => {
  const progress = conversation.bookingFollowup;
  if (!progress || conversation.mode !== "bot" || !/^55\d{10,11}$/.test(conversation.phone)) return false;
  if (!progress.optedIn || !["contact", "summary", "payment"].includes(progress.step)) return false;
  if (!progress.offerId || !/^\d{4}-\d{2}-\d{2}$/.test(progress.date) || progress.sentAt) return false;
  const idle = now - progress.lastClientAt;
  if (idle < INACTIVITY_MS || idle >= SESSION_MS || progress.lastClientAt <= 0) return false;
  if (progress.lastAttemptAt && now - progress.lastAttemptAt < RETRY_MS) return false;
  const today = localDate(now);
  if (progress.date < today) return false;
  // Same-day reminders stop before the booked brunch or the trail entry cutoff.
  if (progress.date === today) {
    const hour = /^(\d{2}):(\d{2})$/.exec(progress.hour);
    const cutoff = hour ? Number(hour[1]) * 60 + Number(hour[2]) - 30 : 14 * 60 + 30;
    if (localMinutes(now) >= cutoff) return false;
  }
  return true;
};

const matchingReservationExists = async (phone: string, date: string) => {
  const db = obterFirestoreAdmin();
  if (!db) return true; // fail closed: do not contact without a reliable status check
  const local = phone.slice(2);
  const formatted = local.length === 11
    ? `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
    : `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  const candidates = await Promise.all([phone, local, formatted, `+55 ${formatted}`].map((value) =>
    db.collection("reservas").where("telefone", "==", value).limit(30).get(),
  ));
  return candidates.some((snapshot) => snapshot.docs.some((doc) => {
    const data = doc.data();
    const reservationDate = String(data.data ?? data.Data ?? "").slice(0, 10);
    const status = String(data.status ?? data.Status ?? "").toLowerCase();
    return reservationDate === date && (data.confirmada === true || ["pago", "confirmada", "confirmado", "approved"].includes(status));
  }));
};

const messageFor = (candidate: FollowupCandidate) => {
  const progress = candidate.bookingFollowup!;
  const firstName = candidate.name.trim().split(/\s+/)[0] || "";
  const greeting = firstName ? `Olá, ${firstName}! 🌿` : "Olá! 🌿";
  const date = progress.date.split("-").reverse().join("/");
  const when = `${date}${progress.hour ? ` às ${progress.hour}` : ""}`;
  const offer = progress.offerName ? ` de ${progress.offerName}` : "";
  return `${greeting}\n\nVocê iniciou uma reserva${offer} para ${when} pelo nosso site, mas ela ainda não foi concluída. A vaga só fica garantida após terminar as etapas e ter o pagamento aprovado.\n\nSe quiser continuar, abra o atendimento em https://vagafogo.com.br/?atendimento=1. Se já concluiu por outro caminho, desconsidere este aviso. 💚`;
};

export const processarLembretesReservaSite = async (now = Date.now()) => {
  if (running) return 0;
  running = true;
  try {
    const db = obterFirestoreAdmin();
    if (!db) return 0;
    if (now - lastCleanupAt > 24 * 60 * 60 * 1000) {
      lastCleanupAt = now;
      const stale = await db.collection(CLAIMS).where("createdAt", "<", new Date(now - 8 * 24 * 60 * 60 * 1000)).limit(100).get();
      if (!stale.empty) {
        const batch = db.batch();
        stale.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
    }
    const candidates = (await listarConversasSite()).filter((item) => reservaSiteElegivelParaLembrete(item, now)).slice(0, 20);
    let sent = 0;
    for (const candidate of candidates) {
      const claimId = createHash("sha256").update(`${candidate.phone}:${candidate.bookingFollowup!.date}`).digest("hex");
      const claim = db.collection(CLAIMS).doc(claimId);
      try {
        await claim.create({ sessionId: candidate.sessionId, createdAt: new Date() });
      } catch {
        continue; // another worker already claimed this one-time reminder
      }
      try {
        const current = await obterConversaSite(candidate.sessionId);
        if (!current || !reservaSiteElegivelParaLembrete(current, Date.now())) continue;
        if (await matchingReservationExists(current.phone, current.bookingFollowup!.date)) continue;
        const result = await enviarMensagemTransacionalPeloAgente(
          current.phone,
          messageFor(current),
          `site-booking-followup:${current.sessionId}`,
          current.name,
          { dataLimite: current.bookingFollowup!.date, tipoDisparo: "retomada_site" },
        );
        await registrarTentativaLembreteReservaSite(current.sessionId, result.enviado);
        if (result.enviado) sent += 1;
        else await claim.delete();
      } catch (error) {
        await registrarTentativaLembreteReservaSite(candidate.sessionId, false).catch(() => undefined);
        await claim.delete().catch(() => undefined);
        console.error("[site-booking] Falha no lembrete de reserva incompleta:", error);
      }
    }
    return sent;
  } finally {
    running = false;
  }
};

export const iniciarProcessadorLembretesReservaSite = () => {
  if (timer) return;
  timer = setInterval(() => void processarLembretesReservaSite().catch((error) => {
    console.error("[site-booking] Falha no processador de lembretes:", error);
  }), 60_000);
  timer.unref();
};
