import { FieldValue } from "firebase-admin/firestore";
import { obterFirestoreAdmin } from "./firebaseAdmin";
import { classificarDataDisparo, dataAtualWhatsapp } from "./whatsappDispatchDate";

const CLEANUP_INTERVAL_MS = Math.max(
  Number(process.env.WHATSAPP_EXPIRED_QUEUE_CLEANUP_MS ?? 5 * 60_000),
  60_000,
);
const QUERY_LIMIT = 400;

let cleanupTimer: NodeJS.Timeout | null = null;
let cleanupRunning = false;

const activeQueueStatuses = new Set([
  "aguardando",
  "agendado",
  "aguardando_confirmacao",
  "enviando",
  "erro",
]);

const expireDatedQueue = async (
  collectionName: string,
  dateField: string,
  today: string,
) => {
  const db = obterFirestoreAdmin();
  if (!db) return 0;
  const snapshot = await db.collection(collectionName)
    .where(dateField, "<", today)
    .limit(QUERY_LIMIT)
    .get();
  const candidates = snapshot.docs.filter((document) =>
    activeQueueStatuses.has(String(document.data().status ?? "").trim().toLowerCase()),
  );
  if (candidates.length === 0) return 0;
  const batch = db.batch();
  candidates.forEach((document) => batch.set(document.ref, {
    status: "expirado",
    motivo: "data_ultrapassada",
    proximaTentativaEm: FieldValue.delete(),
    atualizadoEm: FieldValue.serverTimestamp(),
  }, { merge: true }));
  await batch.commit();
  return candidates.length;
};

const expireReservationFlags = async (
  pendingField: string,
  statusField: string,
  errorField: string,
  nextAttemptField: string,
  today: string,
) => {
  const db = obterFirestoreAdmin();
  if (!db) return 0;
  const snapshot = await db.collection("reservas")
    .where(pendingField, "==", true)
    .limit(QUERY_LIMIT)
    .get();
  const candidates = snapshot.docs.map((document) => ({
    document,
    validity: classificarDataDisparo(document.data().data ?? document.data().Data, today),
  })).filter(({ validity }) => validity !== "valido");
  if (candidates.length === 0) return 0;
  const batch = db.batch();
  candidates.forEach(({ document, validity }) => batch.set(document.ref, {
    [pendingField]: false,
    [statusField]: "expirado",
    [errorField]: validity === "expirado" ? "reserva_passada" : "data_reserva_invalida",
    [nextAttemptField]: FieldValue.delete(),
    whatsappFilaExpiradaEm: FieldValue.serverTimestamp(),
  }, { merge: true }));
  await batch.commit();
  return candidates.length;
};

export const limparFilasWhatsappVencidas = async () => {
  const today = dataAtualWhatsapp();
  const [lembretes, avisos, resumos, confirmacoes, confirmacoesAgente] = await Promise.all([
    expireDatedQueue("whatsapp_lembretes_dia", "dataReserva", today),
    expireDatedQueue("whatsapp_notificacoes_internas", "data", today),
    expireDatedQueue("whatsapp_resumos_reservas_dia", "data", today),
    expireReservationFlags(
      "whatsappConfirmacaoPendente",
      "whatsappConfirmacaoStatus",
      "whatsappConfirmacaoErro",
      "whatsappConfirmacaoProximaTentativaEm",
      today,
    ),
    expireReservationFlags(
      "whatsappAgenteConfirmacaoPagamentoPendente",
      "whatsappAgenteConfirmacaoPagamentoStatus",
      "whatsappAgenteConfirmacaoPagamentoErro",
      "whatsappAgenteConfirmacaoPagamentoProximaTentativaEm",
      today,
    ),
  ]);
  return {
    data: today,
    lembretes,
    avisos,
    resumos,
    confirmacoes,
    confirmacoesAgente,
    total: lembretes + avisos + resumos + confirmacoes + confirmacoesAgente,
  };
};

export const iniciarLimpezaFilasWhatsappVencidas = () => {
  if (cleanupTimer) return;
  const run = async () => {
    if (cleanupRunning) return;
    cleanupRunning = true;
    try {
      const result = await limparFilasWhatsappVencidas();
      if (result.total > 0) {
        console.log(`[whatsapp][filas] ${result.total} disparo(s) vencido(s) retirado(s) das filas.`);
      }
    } catch (error) {
      console.error("[whatsapp][filas] Falha ao limpar disparos vencidos:", error);
    } finally {
      cleanupRunning = false;
    }
  };
  cleanupTimer = setInterval(() => void run(), CLEANUP_INTERVAL_MS);
  cleanupTimer.unref?.();
};
