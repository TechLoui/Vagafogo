import { createHash } from "crypto";
import { obterFirestoreAdmin } from "./firebaseAdmin";
import { enviarMensagemTransacionalPeloAgente } from "./agentTransactionalWhatsapp";
import { listarConversasSitePersistidas, obterConversaSitePersistida, registrarTentativaLembreteReservaSite } from "./siteChatConversations";

const TIMEZONE = "America/Sao_Paulo";
const INACTIVITY_MS = 15 * 60 * 1000;
const SESSION_MS = 2 * 60 * 60 * 1000;
const RETRY_MS = 5 * 60 * 1000;
const CLAIMS = "site_booking_followup_claims";
let running = false;
let timer: NodeJS.Timeout | null = null;
let lastCleanupAt = 0;
let lastMissingFirestoreLogAt = 0;

type FollowupCandidate = {
  sessionId: string;
  phone: string;
  name: string;
  mode: string;
  lastFrom: string;
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
    lastError?: string | null;
  } | null;
};

const localDate = (now: number) => new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date(now));
const localMinutes = (now: number) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(now));
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return value("hour") * 60 + value("minute");
};

export const estadoRetomadaSite = (conversation: FollowupCandidate, now = Date.now()) => {
  const progress = conversation.bookingFollowup;
  if (!progress) return "sem_progresso";
  if (progress.sentAt) return "enviada";
  if (!/^55\d{10,11}$/.test(conversation.phone)) return "sem_whatsapp";
  if (!progress.optedIn) return "sem_autorizacao";
  if (conversation.mode !== "bot") return "atendimento_pausado";
  if (conversation.lastFrom === "client") return "aguardando_bot";
  const idle = now - progress.lastClientAt;
  if (progress.lastClientAt <= 0) return "sem_atividade";
  if (idle >= SESSION_MS) return "sessao_expirada";
  const today = localDate(now);
  if (progress.date && (!/^\d{4}-\d{2}-\d{2}$/.test(progress.date) || progress.date < today)) return "data_passada";
  // Same-day reminders stop before the booked brunch or the trail entry cutoff.
  if (progress.date === today) {
    const hour = /^(\d{2}):(\d{2})$/.exec(progress.hour);
    const cutoff = hour ? Number(hour[1]) * 60 + Number(hour[2]) - 30 : 14 * 60 + 30;
    if (localMinutes(now) >= cutoff) return "visita_proxima";
  }
  if (idle < INACTIVITY_MS) return "aguardando_15_min";
  if (progress.lastAttemptAt && now - progress.lastAttemptAt < RETRY_MS) return "aguardando_nova_tentativa";
  return "pronta";
};

export const reservaSiteElegivelParaLembrete = (conversation: FollowupCandidate, now = Date.now()) =>
  estadoRetomadaSite(conversation, now) === "pronta";

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

export const mensagemRetomadaSite = (candidate: FollowupCandidate) => {
  const progress = candidate.bookingFollowup!;
  const firstName = candidate.name.trim().split(/\s+/)[0] || "";
  const greeting = firstName ? `Oi, ${firstName}! 🌿` : "Oi! 🌿";
  const params = new URLSearchParams({ atendimento: "1", origem: "retomada", sessao: candidate.sessionId, telefone: candidate.phone });
  const link = `https://vagafogo.com.br/?${params.toString()}`;
  const reservationNote = progress.offerId && progress.date
    ? "Sua reserva ainda não foi concluída; a vaga só fica garantida após o pagamento aprovado.\n\n"
    : "";
  return `${greeting}\n\nNossa conversa no site ficou em pausa. Se quiser retomar de onde parou, é só tocar aqui:\n${link}\n\n${reservationNote}A Jatobá está por lá para tirar dúvidas e ajudar você com sua reserva. Se já resolveu tudo, pode desconsiderar esta mensagem. 💚`;
};

export const processarLembretesReservaSite = async (now = Date.now()) => {
  if (running) return 0;
  running = true;
  try {
    const db = obterFirestoreAdmin();
    if (!db) {
      if (now - lastMissingFirestoreLogAt >= 60 * 60 * 1000) {
        lastMissingFirestoreLogAt = now;
        console.error("[site-followup] Firestore Admin indisponivel; conversas do site nao persistem e retomadas nao podem ser enviadas.");
      }
      return 0;
    }
    if (now - lastCleanupAt > 24 * 60 * 60 * 1000) {
      lastCleanupAt = now;
      const stale = await db.collection(CLAIMS).where("createdAt", "<", new Date(now - 8 * 24 * 60 * 60 * 1000)).limit(100).get();
      if (!stale.empty) {
        const batch = db.batch();
        stale.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
    }
    const candidates = (await listarConversasSitePersistidas()).filter((item) => reservaSiteElegivelParaLembrete(item, now)).slice(0, 20);
    let sent = 0;
    for (const candidate of candidates) {
      const claimId = createHash("sha256").update(`${candidate.phone}:${localDate(candidate.bookingFollowup!.lastClientAt)}`).digest("hex");
      const claim = db.collection(CLAIMS).doc(claimId);
      try {
        await claim.create({ sessionId: candidate.sessionId, createdAt: new Date() });
      } catch (error) {
        const code = (error as { code?: unknown })?.code;
        if (code !== 6 && code !== "already-exists") console.error("[site-followup] Falha ao reservar lembrete:", error);
        continue; // another worker already claimed this one-time reminder
      }
      try {
        const current = await obterConversaSitePersistida(candidate.sessionId);
        if (!current || !reservaSiteElegivelParaLembrete(current, Date.now())) {
          await claim.delete();
          continue;
        }
        if (current.bookingFollowup!.date && await matchingReservationExists(current.phone, current.bookingFollowup!.date)) {
          console.info("[site-followup] Reserva ja confirmada; lembrete ignorado:", current.sessionId);
          continue;
        }
        const result = await enviarMensagemTransacionalPeloAgente(
          current.phone,
          mensagemRetomadaSite(current),
          `site-booking-followup:${current.sessionId}`,
          current.name,
          { ...(current.bookingFollowup!.date ? { dataLimite: current.bookingFollowup!.date } : {}), tipoDisparo: "retomada_site" },
        );
        await registrarTentativaLembreteReservaSite(current.sessionId, result.enviado, result.motivo);
        if (result.enviado) {
          sent += 1;
          console.info("[site-followup] Lembrete enviado:", current.sessionId);
        } else {
          console.error("[site-followup] Lembrete nao enviado:", current.sessionId, result.motivo);
          await claim.delete();
        }
      } catch (error) {
        await registrarTentativaLembreteReservaSite(candidate.sessionId, false, error instanceof Error ? error.message : String(error)).catch(() => undefined);
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
  void processarLembretesReservaSite().catch((error) => {
    console.error("[site-followup] Falha ao verificar lembretes iniciais:", error);
  });
  timer = setInterval(() => void processarLembretesReservaSite().catch((error) => {
    console.error("[site-booking] Falha no processador de lembretes:", error);
  }), 60_000);
  timer.unref();
};
