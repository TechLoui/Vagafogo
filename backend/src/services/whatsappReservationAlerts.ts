import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { obterFirestoreAdmin } from "./firebaseAdmin";
import { enviarMensagemWhatsappGerenciada, type ResultadoEnvio } from "./whatsapp";

const DESTINATION_DEFAULT = "5562991150376";
const WORKER_INTERVAL_MS = Math.max(Number(process.env.WHATSAPP_RESERVATION_ALERT_WORKER_MS ?? 15000), 5000);
const MAX_ATTEMPTS = 5;
const STALE_SENDING_MS = 2 * 60 * 1000;

const DEFAULT_TEMPLATE =
  "🌿 Nova reserva recebida\n\n" +
  "Código: {id}\n" +
  "Cliente: {nome}\n" +
  "Telefone: {telefone}\n" +
  "E-mail: {email}\n" +
  "Data: {data}\n" +
  "Horário: {horario}\n" +
  "Atividade: {atividade}\n" +
  "Participantes: {participantes}\n" +
  "Valor: {valor}\n" +
  "Pagamento: {pagamento}\n" +
  "Status: {status}";

let workerTimer: NodeJS.Timeout | null = null;
let workerRunning = false;

const clean = (value: unknown, maximum = 500) => String(value ?? "").trim().slice(0, maximum);
const numberValue = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const normalizePhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
};
const formatCurrency = (value: unknown) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numberValue(value));

const renderTemplate = (template: string, alert: FirebaseFirestore.DocumentData) => {
  const values: Record<string, string> = {
    id: clean(alert.reservaId, 100),
    nome: clean(alert.nome, 160) || "Não informado",
    telefone: clean(alert.telefone, 80) || "Não informado",
    email: clean(alert.email, 240) || "Não informado",
    data: clean(alert.data, 40) || "Não informada",
    horario: clean(alert.horario, 100) || "Não informado",
    atividade: clean(alert.atividade, 300) || "Não informada",
    participantes: String(numberValue(alert.participantes)),
    valor: formatCurrency(alert.valor),
    pagamento: clean(alert.formaPagamento, 80) || "Não informado",
    status: clean(alert.statusReserva, 80) || "aguardando",
  };
  return template.replace(/\{([a-z]+)\}/gi, (match, key) => values[key.toLowerCase()] ?? match).trim();
};

export const enfileirarAvisoNovaReservaEquipe = async (
  reservaId: string,
  reserva: Record<string, unknown>,
) => {
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const ref = db.collection("whatsapp_notificacoes_internas").doc(reservaId);
  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists) return false;
    transaction.create(ref, {
      reservaId,
      nome: clean(reserva.nome ?? reserva.Nome, 160),
      telefone: clean(reserva.telefone ?? reserva.Telefone, 80),
      email: clean(reserva.email ?? reserva.Email, 240),
      data: clean(reserva.data ?? reserva.Data, 40),
      horario: clean(reserva.horario ?? reserva.Horario, 100),
      atividade: clean(reserva.atividade ?? reserva.Atividade, 300),
      participantes: numberValue(reserva.participantes ?? reserva.Participantes),
      valor: numberValue(reserva.valor ?? reserva.Valor),
      formaPagamento: clean(reserva.formaPagamento, 80),
      statusReserva: clean(reserva.status ?? reserva.Status ?? "aguardando", 80),
      status: "aguardando",
      tentativas: 0,
      destino: DESTINATION_DEFAULT,
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    return true;
  });
};

export const reenfileirarAvisoNovaReservaEquipe = async (reservaId: string) => {
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const ref = db.collection("whatsapp_notificacoes_internas").doc(reservaId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("RESERVATION_ALERT_NOT_FOUND");
  await ref.update({
    status: "aguardando",
    tentativas: 0,
    proximaTentativaEm: Timestamp.now(),
    ultimoErro: FieldValue.delete(),
    atualizadoEm: FieldValue.serverTimestamp(),
  });
};

const processOne = async (document: FirebaseFirestore.QueryDocumentSnapshot) => {
  const db = document.ref.firestore;
  const acquired = await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(document.ref);
    if (!fresh.exists) return null;
    const currentStatus = String(fresh.data()?.status ?? "");
    if (!["aguardando", "enviando"].includes(currentStatus)) return null;
    if (currentStatus === "enviando") {
      const lastAttempt = fresh.data()?.ultimaTentativaEm?.toDate?.() as Date | undefined;
      if (!lastAttempt || lastAttempt.getTime() > Date.now() - STALE_SENDING_MS) return null;
    }
    const nextAttempt = fresh.data()?.proximaTentativaEm?.toDate?.() as Date | undefined;
    if (nextAttempt && nextAttempt.getTime() > Date.now()) return null;
    const attempts = Number(fresh.data()?.tentativas ?? 0) + 1;
    transaction.update(document.ref, {
      status: "enviando",
      tentativas: attempts,
      ultimaTentativaEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    return { data: fresh.data()!, attempts };
  });
  if (!acquired) return;

  const configSnapshot = await db.collection("configuracoes").doc("whatsapp").get();
  const config = configSnapshot.exists ? configSnapshot.data()! : {};
  if (config.avisoNovaReservaEquipeAtivo === false) {
    await document.ref.update({ status: "aguardando", atualizadoEm: FieldValue.serverTimestamp() });
    return;
  }
  const destination = normalizePhone(config.avisoNovaReservaEquipeNumero)
    || normalizePhone(acquired.data.destino)
    || DESTINATION_DEFAULT;
  const template = clean(config.mensagemAvisoNovaReservaEquipe, 3000) || DEFAULT_TEMPLATE;
  const message = renderTemplate(template, acquired.data);
  const result: ResultadoEnvio = await enviarMensagemWhatsappGerenciada(destination, message).catch((error): ResultadoEnvio => ({
    enviado: false,
    motivo: error instanceof Error ? error.message : String(error),
  }));

  if (result.enviado) {
    const batch = db.batch();
    batch.update(document.ref, {
      status: "enviado",
      destino: destination,
      mensagem: message,
      messageId: result.messageId ?? null,
      enviadoEm: FieldValue.serverTimestamp(),
      ultimoErro: FieldValue.delete(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    batch.set(db.collection("reservas").doc(String(acquired.data.reservaId)), {
      whatsappAvisoEquipeEnviado: true,
      dataWhatsappAvisoEquipe: FieldValue.serverTimestamp(),
      whatsappAvisoEquipeDestino: destination,
      whatsappAvisoEquipeMensagem: message,
      whatsappAvisoEquipeErro: FieldValue.delete(),
    }, { merge: true });
    await batch.commit();
    return;
  }

  const finalFailure = acquired.attempts >= MAX_ATTEMPTS;
  const retryMinutes = Math.min(30, acquired.attempts * 3);
  const batch = db.batch();
  batch.update(document.ref, {
    status: finalFailure ? "erro" : "aguardando",
    ultimoErro: result.motivo ?? "erro_envio",
    ...(finalFailure ? { erroEm: FieldValue.serverTimestamp() } : { proximaTentativaEm: Timestamp.fromMillis(Date.now() + retryMinutes * 60000) }),
    atualizadoEm: FieldValue.serverTimestamp(),
  });
  batch.set(db.collection("reservas").doc(String(acquired.data.reservaId)), {
    whatsappAvisoEquipeEnviado: false,
    whatsappAvisoEquipeErro: result.motivo ?? "erro_envio",
    dataWhatsappAvisoEquipeErro: FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();
};

export const processarAvisosNovaReservaEquipe = async () => {
  if (workerRunning) return;
  const db = obterFirestoreAdmin();
  if (!db) return;
  workerRunning = true;
  try {
    const config = await db.collection("configuracoes").doc("whatsapp").get();
    if (config.exists && config.data()?.avisoNovaReservaEquipeAtivo === false) return;
    const snapshot = await db.collection("whatsapp_notificacoes_internas").where("status", "in", ["aguardando", "enviando"]).limit(10).get();
    for (const document of snapshot.docs) await processOne(document);
  } finally {
    workerRunning = false;
  }
};

export const iniciarProcessadorAvisosNovaReserva = () => {
  if (workerTimer) return;
  workerTimer = setInterval(() => void processarAvisosNovaReservaEquipe(), WORKER_INTERVAL_MS);
  workerTimer.unref?.();
  void processarAvisosNovaReservaEquipe();
};

export const TEMPLATE_AVISO_NOVA_RESERVA_EQUIPE = DEFAULT_TEMPLATE;
