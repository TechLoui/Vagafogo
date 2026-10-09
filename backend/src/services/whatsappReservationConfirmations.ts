import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { obterFirestoreAdmin } from "./firebaseAdmin";
import { prepararConfirmacaoWhatsapp, type ResultadoEnvio } from "./whatsapp";
import { enviarMensagemTransacionalPeloAgente } from "./agentTransactionalWhatsapp";
import { classificarOrigemReserva, reservaPodeReceberDisparoAutomatico } from "./reservaOrigem";

const WORKER_INTERVAL_MS = Math.max(Number(process.env.WHATSAPP_CONFIRMATION_WORKER_MS ?? 30000), 10000);
const MAX_ATTEMPTS = 5;
const STALE_SENDING_MS = 3 * 60 * 1000;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000, 3 * 60 * 60_000];
const TIMEZONE = "America/Sao_Paulo";

let workerTimer: NodeJS.Timeout | null = null;
let workerRunning = false;

const clean = (value: unknown, maximum = 240) => String(value ?? "").trim().slice(0, maximum);
const dateKey = (date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(date);
const timestampMillis = (value: any) => {
  if (typeof value?.toMillis === "function") return Number(value.toMillis());
  if (typeof value?.toDate === "function") return Number(value.toDate().getTime());
  const parsed = new Date(value ?? 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};
const reservationDateKey = (reserva: FirebaseFirestore.DocumentData) => {
  const value = reserva.data ?? reserva.Data;
  if (typeof value === "string") {
    const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return match?.[1] ?? "";
  }
  const millis = timestampMillis(value);
  return millis > 0 ? dateKey(new Date(millis)) : "";
};

export type ElegibilidadeDataConfirmacaoWhatsapp = "elegivel" | "reserva_passada" | "data_reserva_invalida";

export const classificarDataConfirmacaoWhatsapp = (
  reserva: FirebaseFirestore.DocumentData,
  today = dateKey(),
): ElegibilidadeDataConfirmacaoWhatsapp => {
  const visitDate = reservationDateKey(reserva);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) return "data_reserva_invalida";
  return visitDate < today ? "reserva_passada" : "elegivel";
};

const reservaConfirmada = (reserva: FirebaseFirestore.DocumentData) =>
  reserva.confirmada === true
  && ["pago", "confirmada", "confirmado"].includes(clean(reserva.status, 40).toLowerCase());

const ignorarPorOrigem = (
  transaction: FirebaseFirestore.Transaction,
  ref: FirebaseFirestore.DocumentReference,
  data: FirebaseFirestore.DocumentData,
) => {
  if (reservaPodeReceberDisparoAutomatico(data)) return false;
  transaction.set(ref, {
    whatsappConfirmacaoPendente: false,
    whatsappConfirmacaoStatus: "ignorado",
    whatsappConfirmacaoErro: classificarOrigemReserva(data) === "desconhecida"
      ? "origem_nao_automatizada"
      : "reserva_manual",
    whatsappConfirmacaoProximaTentativaEm: FieldValue.delete(),
    whatsappConfirmacaoAtualizadoEm: FieldValue.serverTimestamp(),
  }, { merge: true });
  return true;
};

export const enfileirarConfirmacaoReservaWhatsapp = async (reservaId: string, reserva?: Record<string, unknown>) => {
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const ref = db.collection("reservas").doc(reservaId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return false;
    const data = { ...snapshot.data(), ...(reserva ?? {}) };
    if (ignorarPorOrigem(transaction, ref, data)) return false;
    if (!reservaConfirmada(data) || data.whatsappConfirmacaoEnviado === true) return false;
    const dateEligibility = classificarDataConfirmacaoWhatsapp(data);
    if (dateEligibility !== "elegivel") {
      transaction.set(ref, {
        whatsappConfirmacaoPendente: false,
        whatsappConfirmacaoStatus: "ignorado",
        whatsappConfirmacaoErro: dateEligibility,
        whatsappConfirmacaoProximaTentativaEm: FieldValue.delete(),
        whatsappConfirmacaoAtualizadoEm: FieldValue.serverTimestamp(),
      }, { merge: true });
      return false;
    }
    if (
      data.whatsappConfirmacaoPendente === true
      && ["aguardando", "enviando"].includes(clean(data.whatsappConfirmacaoStatus, 40))
    ) return false;
    transaction.set(ref, {
      whatsappConfirmacaoPendente: true,
      whatsappConfirmacaoStatus: "aguardando",
      whatsappConfirmacaoProximaTentativaEm: Timestamp.now(),
      whatsappConfirmacaoErro: FieldValue.delete(),
      whatsappConfirmacaoAtualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });
};

export const processarConfirmacaoReservaWhatsapp = async (reservaId: string, force = false): Promise<ResultadoEnvio> => {
  const db = obterFirestoreAdmin();
  if (!db) return { enviado: false, motivo: "firebase_indisponivel" };
  const ref = db.collection("reservas").doc(reservaId);
  const acquired = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    const data = snapshot.data()!;
    if (ignorarPorOrigem(transaction, ref, data)) return null;
    if (!reservaConfirmada(data)) return null;
    const dateEligibility = classificarDataConfirmacaoWhatsapp(data);
    if (dateEligibility !== "elegivel") {
      transaction.set(ref, {
        whatsappConfirmacaoPendente: false,
        whatsappConfirmacaoStatus: "ignorado",
        whatsappConfirmacaoErro: dateEligibility,
        whatsappConfirmacaoProximaTentativaEm: FieldValue.delete(),
        whatsappConfirmacaoAtualizadoEm: FieldValue.serverTimestamp(),
      }, { merge: true });
      return null;
    }
    if (!force && data.whatsappConfirmacaoEnviado === true) return null;
    if (!force && data.whatsappConfirmacaoPendente !== true) return null;
    const status = clean(data.whatsappConfirmacaoStatus, 40);
    const lastAttempt = timestampMillis(data.whatsappConfirmacaoUltimaTentativaEm);
    if (!force && status === "enviando" && lastAttempt > Date.now() - STALE_SENDING_MS) return null;
    const nextAttempt = timestampMillis(data.whatsappConfirmacaoProximaTentativaEm);
    if (!force && nextAttempt > Date.now()) return null;
    const attempts = Math.max(0, Number(data.whatsappConfirmacaoTentativas ?? 0)) + 1;
    transaction.set(ref, {
      whatsappConfirmacaoStatus: "enviando",
      whatsappConfirmacaoTentativas: attempts,
      whatsappConfirmacaoUltimaTentativaEm: FieldValue.serverTimestamp(),
      whatsappConfirmacaoAtualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { data, attempts };
  });

  if (!acquired) return { enviado: false, motivo: "nao_elegivel_ou_aguardando" };
  const prepared = await prepararConfirmacaoWhatsapp(reservaId, {
    ...acquired.data,
    ...(force ? { whatsappConfirmacaoEnviado: false } : {}),
  }, force ? { confirmacaoAutomaticaAtiva: true } : undefined).catch((error): ResultadoEnvio => ({
    enviado: false,
    motivo: error instanceof Error ? error.message : String(error),
  }));
  const result = prepared.enviado && prepared.telefone && prepared.mensagem
    ? await enviarMensagemTransacionalPeloAgente(
      prepared.telefone,
      prepared.mensagem,
      `reserva-confirmada:${reservaId}:${prepared.telefone}${force ? `:manual:${Date.now()}` : ""}`,
      acquired.data.nome ?? acquired.data.Nome,
    ).catch((error): ResultadoEnvio => ({
      enviado: false,
      motivo: error instanceof Error ? error.message : String(error),
    }))
    : prepared;

  if (result.enviado) {
    await ref.set({
      whatsappConfirmacaoEnviado: true,
      whatsappConfirmacaoPendente: false,
      whatsappConfirmacaoStatus: "enviado",
      dataWhatsappConfirmacao: FieldValue.serverTimestamp(),
      whatsappConfirmacaoMensagem: result.mensagem ?? "",
      whatsappConfirmacaoMessageId: result.messageId ?? null,
      whatsappConfirmacaoErro: FieldValue.delete(),
      whatsappConfirmacaoProximaTentativaEm: FieldValue.delete(),
      whatsappConfirmacaoAtualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
    return result;
  }

  const disabled = result.motivo === "desativado";
  const finalFailure = disabled || acquired.attempts >= MAX_ATTEMPTS || result.motivo === "telefone_invalido" || result.motivo === "telefone_sem_whatsapp";
  const retryDelay = RETRY_DELAYS_MS[Math.min(acquired.attempts - 1, RETRY_DELAYS_MS.length - 1)];
  await ref.set({
    whatsappConfirmacaoPendente: !finalFailure,
    whatsappConfirmacaoStatus: disabled ? "desativado" : finalFailure ? "erro" : "aguardando",
    whatsappConfirmacaoErro: result.motivo ?? "erro_envio",
    dataWhatsappConfirmacaoErro: FieldValue.serverTimestamp(),
    ...(finalFailure
      ? { whatsappConfirmacaoProximaTentativaEm: FieldValue.delete() }
      : { whatsappConfirmacaoProximaTentativaEm: Timestamp.fromMillis(Date.now() + retryDelay) }),
    whatsappConfirmacaoAtualizadoEm: FieldValue.serverTimestamp(),
  }, { merge: true });
  return result;
};

export const processarConfirmacoesReservaWhatsapp = async () => {
  if (workerRunning) return;
  const db = obterFirestoreAdmin();
  if (!db) return;
  workerRunning = true;
  try {
    const snapshot = await db.collection("reservas")
      .where("whatsappConfirmacaoPendente", "==", true)
      .limit(10)
      .get();
    for (const document of snapshot.docs) {
      await processarConfirmacaoReservaWhatsapp(document.id).catch((error) => {
        console.error(`[whatsapp][confirmacao] Falha ao processar ${document.id}:`, error);
      });
    }
  } finally {
    workerRunning = false;
  }
};

export const iniciarProcessadorConfirmacoesReservaWhatsapp = () => {
  if (workerTimer) return;
  workerTimer = setInterval(() => void processarConfirmacoesReservaWhatsapp(), WORKER_INTERVAL_MS);
  workerTimer.unref?.();
  void processarConfirmacoesReservaWhatsapp();
};

