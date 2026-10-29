import { createHash, randomUUID } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { obterFirestoreAdmin } from "./firebaseAdmin";
import { enviarMensagemTransacionalPeloAgente } from "./agentTransactionalWhatsapp";
import type { ResultadoEnvio } from "./whatsapp";

const COLLECTION = "whatsapp_alertas_atendimento_humano";
export const DESTINO_ALERTA_ATENDIMENTO_HUMANO = "5562991150376";
const configuredInterval = Number(process.env.WHATSAPP_HANDOFF_ALERT_WORKER_MS ?? 15000);
const WORKER_INTERVAL_MS = Number.isFinite(configuredInterval) ? Math.max(configuredInterval, 5000) : 15000;
const MAX_ATTEMPTS = 5;
const STALE_SENDING_MS = 2 * 60 * 1000;
const MAX_ALERT_AGE_MS = 24 * 60 * 60 * 1000;
const RETRY_DELAYS_MS = [30_000, 60_000, 3 * 60_000, 10 * 60_000, 30 * 60_000];

let workerTimer: NodeJS.Timeout | null = null;
let workerRunning = false;

const clean = (value: unknown, maximum = 500) => String(value ?? "").trim().slice(0, maximum);
export const normalizarTelefoneAlertaAtendimentoHumano = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  const phone = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return /^55[1-9]\d(?:[2-9]\d{7}|9\d{8})$/.test(phone) ? phone : "";
};
const timestampMillis = (value: any) => {
  if (typeof value?.toMillis === "function") return Number(value.toMillis());
  if (typeof value?.toDate === "function") return Number(value.toDate().getTime());
  const parsed = new Date(value ?? 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};
const createdMillis = (data: Record<string, unknown>, documentCreatedAt?: unknown) => {
  const values = [data.criadoEm, data.createdAt, documentCreatedAt].map(timestampMillis).filter((value) => value > 0);
  return values.length ? Math.min(...values) : 0;
};
const alertId = (phone: string, sourceMessageId: string) => createHash("sha256")
  .update(`handoff:v2\0${phone}\0${sourceMessageId}`).digest("hex");

const reasonLabels: Record<string, string> = {
  alteracao_reserva: "Alteração de reserva",
  cancelamento_reserva: "Cancelamento de reserva",
  problema_pagamento: "Problema de pagamento",
  solicitacao_cliente: "Cliente solicitou atendente",
  excecao_operacional: "Exceção operacional",
  objeto_perdido: "Objeto perdido",
  ligacao_nao_atendida: "Ligação sem atendimento — contato com o Uirá",
};

export const montarMensagemAlertaAtendimentoHumano = (alert: Record<string, unknown>) => {
  const name = clean(alert.nome, 120) || "Nome não identificado";
  const phone = normalizarTelefoneAlertaAtendimentoHumano(alert.telefone);
  const reason = reasonLabels[clean(alert.motivo, 80).toLowerCase()] || "Atendimento depende da equipe";
  const summary = String(alert.resumo ?? "").trim().slice(-2000)
    || clean(alert.ultimaMensagem, 500) || "Verificar a conversa no painel.";
  const lastMessage = clean(alert.ultimaMensagem, 500);
  return [
    "👤 Atendimento humano necessário", "",
    `Cliente: ${name}`,
    `Telefone: ${phone ? `+${phone}` : "Não identificado"}`,
    `Motivo: ${reason}`,
    `Resumo: ${summary}`,
    ...(lastMessage && !summary.includes(lastMessage) ? [`Última mensagem: ${lastMessage}`] : []),
    "", "O bot foi pausado para este contato.",
    ...(phone ? [`Abrir conversa com o cliente: https://wa.me/${phone}`] : []),
    "Painel de atendimento: https://vagafogo.com.br/agente",
  ].join("\n");
};

type AlertDependencies = {
  db?: FirebaseFirestore.Firestore | null;
  send?: typeof enviarMensagemTransacionalPeloAgente;
  now?: () => number;
  processImmediately?: boolean;
};
const database = (dependencies: AlertDependencies) => dependencies.db === undefined ? obterFirestoreAdmin() : dependencies.db;

export const processarAlertaAtendimentoHumano = async (id: string, dependencies: AlertDependencies = {}): Promise<ResultadoEnvio> => {
  const db = database(dependencies);
  if (!db) return { enviado: false, motivo: "firebase_indisponivel" };
  const now = dependencies.now || Date.now;
  const ref = db.collection(COLLECTION).doc(id);
  const leaseId = randomUUID();
  const acquired = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    const data = snapshot.data()!;
    const status = clean(data.status, 40);
    if (!["aguardando", "enviando"].includes(status)) return null;
    const createdAt = createdMillis(data, snapshot.createTime);
    if (!createdAt || now() - createdAt >= MAX_ALERT_AGE_MS) {
      transaction.set(ref, {
        status: "expirado", ultimoErro: "alerta_mais_de_24h_ou_sem_data",
        proximaTentativaEm: FieldValue.delete(), leaseId: FieldValue.delete(),
        atualizadoEm: FieldValue.serverTimestamp(),
      }, { merge: true });
      return null;
    }
    const phone = normalizarTelefoneAlertaAtendimentoHumano(data.telefone);
    if (!phone) {
      transaction.set(ref, {
        status: "erro_final", ultimoErro: "HANDOFF_PHONE_INVALID",
        proximaTentativaEm: FieldValue.delete(), atualizadoEm: FieldValue.serverTimestamp(),
      }, { merge: true });
      return null;
    }
    const attempts = Math.max(0, Number(data.tentativas ?? 0)) || 0;
    if (status === "enviando" && timestampMillis(data.ultimaTentativaEm) > now() - STALE_SENDING_MS) return null;
    if (attempts >= MAX_ATTEMPTS) {
      transaction.set(ref, {
        status: "erro_final", ultimoErro: "limite_tentativas_atingido",
        proximaTentativaEm: FieldValue.delete(), leaseId: FieldValue.delete(),
        atualizadoEm: FieldValue.serverTimestamp(),
      }, { merge: true });
      return null;
    }
    if (timestampMillis(data.proximaTentativaEm) > now()) return null;
    transaction.set(ref, {
      status: "enviando", tentativas: attempts + 1, leaseId,
      destino: DESTINO_ALERTA_ATENDIMENTO_HUMANO,
      ultimaTentativaEm: Timestamp.fromMillis(now()), atualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { data: { ...data, telefone: phone }, attempts: attempts + 1 };
  });
  if (!acquired) return { enviado: false, motivo: "nao_elegivel_ou_aguardando" };

  const message = montarMensagemAlertaAtendimentoHumano(acquired.data);
  const result: ResultadoEnvio = await (dependencies.send || enviarMensagemTransacionalPeloAgente)(
    DESTINO_ALERTA_ATENDIMENTO_HUMANO,
    message,
    `atendimento-humano:${id}`,
    "Uirá",
    { tipoDisparo: "alerta_atendimento_humano" },
  ).catch((error): ResultadoEnvio => ({ enviado: false, motivo: error instanceof Error ? error.message : String(error) }));

  await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(ref);
    if (!fresh.exists || fresh.data()?.leaseId !== leaseId || fresh.data()?.status !== "enviando") return;
    if (result.enviado) {
      transaction.set(ref, {
        status: "enviado", destino: DESTINO_ALERTA_ATENDIMENTO_HUMANO,
        mensagem: message, messageId: result.messageId ?? null,
        enviadoEm: FieldValue.serverTimestamp(), ultimoErro: FieldValue.delete(),
        proximaTentativaEm: FieldValue.delete(), leaseId: FieldValue.delete(), atualizadoEm: FieldValue.serverTimestamp(),
      }, { merge: true });
      return;
    }
    const paced = result.motivo === "DISPATCH_PACED";
    const finalFailure = !paced && acquired.attempts >= MAX_ATTEMPTS;
    const retryDelay = paced ? Math.max(1000, result.retryAfterMs || 60_000)
      : RETRY_DELAYS_MS[Math.min(acquired.attempts - 1, RETRY_DELAYS_MS.length - 1)];
    transaction.set(ref, {
      status: finalFailure ? "erro_final" : "aguardando",
      tentativas: paced ? acquired.attempts - 1 : acquired.attempts,
      ultimoErro: clean(result.motivo, 300) || "erro_envio",
      proximaTentativaEm: finalFailure ? FieldValue.delete() : Timestamp.fromMillis(now() + retryDelay),
      leaseId: FieldValue.delete(), atualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
  return result;
};

export const enfileirarAlertaAtendimentoHumano = async (payload: Record<string, unknown>, dependencies: AlertDependencies = {}) => {
  const db = database(dependencies);
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const telefone = normalizarTelefoneAlertaAtendimentoHumano(payload.telefone);
  const sourceMessageId = clean(payload.sourceMessageId, 180);
  if (!telefone) throw new Error("HANDOFF_PHONE_INVALID");
  if (!sourceMessageId) throw new Error("HANDOFF_SOURCE_MESSAGE_REQUIRED");
  const id = alertId(telefone, sourceMessageId);
  const ref = db.collection(COLLECTION).doc(id);
  const motivo = clean(payload.motivo, 80) || "excecao_operacional";
  const legacyId = createHash("sha256").update(`handoff:v1\0${telefone}\0${sourceMessageId}\0${motivo}`).digest("hex");
  const queued = await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists) return { created: false, id };
    // Um callback repetido após reativar o serviço deve reutilizar o evento
    // antigo, inclusive para expirá-lo, sem criar uma cópia com data nova.
    const legacy = await transaction.get(db.collection(COLLECTION).doc(legacyId));
    if (legacy.exists) return { created: false, id: legacyId };
    transaction.create(ref, {
      telefone, sourceMessageId, destino: DESTINO_ALERTA_ATENDIMENTO_HUMANO,
      nome: clean(payload.nome, 120), motivo,
      resumo: String(payload.resumo ?? "").trim().slice(-2000), ultimaMensagem: clean(payload.ultimaMensagem, 500),
      canal: clean(payload.canal, 20), status: "aguardando", tentativas: 0,
      criadoEm: Timestamp.fromMillis((dependencies.now || Date.now)()), atualizadoEm: FieldValue.serverTimestamp(),
    });
    return { created: true, id };
  });
  if (dependencies.processImmediately !== false) {
    void processarAlertaAtendimentoHumano(queued.id, dependencies).catch((error) => {
      console.error(`[whatsapp][handoff] Falha ao processar ${queued.id}:`, error);
    });
  }
  return { enfileirado: queued.created, duplicado: !queued.created, id: queued.id, destino: DESTINO_ALERTA_ATENDIMENTO_HUMANO };
};

export const processarAlertasAtendimentoHumano = async (dependencies: AlertDependencies = {}) => {
  if (workerRunning) return;
  const db = database(dependencies);
  if (!db) return;
  workerRunning = true;
  try {
    const snapshot = await db.collection(COLLECTION).where("status", "in", ["aguardando", "enviando"]).limit(25).get();
    for (const document of snapshot.docs) {
      await processarAlertaAtendimentoHumano(document.id, dependencies).catch((error) => {
        console.error(`[whatsapp][handoff] Falha ao reprocessar ${document.id}:`, error);
      });
    }
  } finally {
    workerRunning = false;
  }
};

export const iniciarProcessadorAlertasAtendimentoHumano = () => {
  if (workerTimer) return;
  const run = () => void processarAlertasAtendimentoHumano().catch((error) => {
    console.error("[whatsapp][handoff] Falha no processador:", error);
  });
  workerTimer = setInterval(run, WORKER_INTERVAL_MS);
  workerTimer.unref?.();
  run();
};
