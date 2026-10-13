import { createHash } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { obterFirestoreAdmin } from "./firebaseAdmin";
import { enviarMensagemTransacionalPeloAgente } from "./agentTransactionalWhatsapp";
import type { ResultadoEnvio } from "./whatsapp";

const COLLECTION = "whatsapp_alertas_atendimento_humano";
const DESTINATION_DEFAULT = "5562991150376";
const WORKER_INTERVAL_MS = Math.max(Number(process.env.WHATSAPP_HANDOFF_ALERT_WORKER_MS ?? 30000), 10000);
const MAX_ATTEMPTS = 5;
const STALE_SENDING_MS = 2 * 60 * 1000;
const RETRY_DELAYS_MS = [30_000, 60_000, 3 * 60_000, 10 * 60_000, 30 * 60_000];

let workerTimer: NodeJS.Timeout | null = null;
let workerRunning = false;

const clean = (value: unknown, maximum = 500) => String(value ?? "").trim().slice(0, maximum);
const normalizePhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
};
const timestampMillis = (value: any) => {
  if (typeof value?.toMillis === "function") return Number(value.toMillis());
  if (typeof value?.toDate === "function") return Number(value.toDate().getTime());
  const parsed = new Date(value ?? 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};
const alertId = (telefone: string, sourceMessageId: string, motivo: string) => createHash("sha256")
  .update(`handoff:v1\0${telefone}\0${sourceMessageId}\0${motivo}`)
  .digest("hex");

const reasonLabels: Record<string, string> = {
  alteracao_reserva: "Alteracao de reserva",
  cancelamento_reserva: "Cancelamento de reserva",
  problema_pagamento: "Problema de pagamento",
  solicitacao_cliente: "Cliente solicitou atendente",
  excecao_operacional: "Excecao operacional",
};
const reasonLabel = (value: unknown) => reasonLabels[clean(value, 80).toLowerCase()] ?? "Atendimento depende da equipe";

export const montarMensagemAlertaAtendimentoHumano = (alert: Record<string, unknown>) => {
  const nome = clean(alert.nome, 120) || "Nome nao identificado";
  const telefone = normalizePhone(alert.telefone) || "Nao identificado";
  const resumo = clean(alert.resumo, 600) || clean(alert.ultimaMensagem, 600) || "Verificar a conversa no painel.";
  const ultimaMensagem = clean(alert.ultimaMensagem, 500);
  return [
    "👤 Atendimento humano necessario",
    "",
    `Cliente: ${nome}`,
    `Telefone: +${telefone}`,
    `Motivo: ${reasonLabel(alert.motivo)}`,
    `Resumo: ${resumo}`,
    ...(ultimaMensagem && ultimaMensagem !== resumo ? [`Ultima mensagem: ${ultimaMensagem}`] : []),
    "",
    "O bot foi pausado para este contato.",
    "Assuma o atendimento em: https://vagafogo.com.br/agente",
  ].join("\n");
};

const processOne = async (id: string) => {
  const db = obterFirestoreAdmin();
  if (!db) return { enviado: false, motivo: "firebase_indisponivel" };
  const ref = db.collection(COLLECTION).doc(id);
  const acquired = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    const data = snapshot.data()!;
    const status = clean(data.status, 40);
    if (status === "enviado") return null;
    const attempts = Math.max(0, Number(data.tentativas ?? 0));
    if (attempts >= MAX_ATTEMPTS) return null;
    if (status === "enviando" && timestampMillis(data.ultimaTentativaEm) > Date.now() - STALE_SENDING_MS) return null;
    if (timestampMillis(data.proximaTentativaEm) > Date.now()) return null;
    transaction.set(ref, {
      status: "enviando",
      tentativas: attempts + 1,
      ultimaTentativaEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { data, attempts: attempts + 1 };
  });
  if (!acquired) return { enviado: false, motivo: "nao_elegivel_ou_aguardando" };

  const mensagem = montarMensagemAlertaAtendimentoHumano(acquired.data);
  const result: ResultadoEnvio = await enviarMensagemTransacionalPeloAgente(
    acquired.data.destino,
    mensagem,
    `atendimento-humano:${id}`,
    "Uira",
  ).catch((error): ResultadoEnvio => ({ enviado: false, motivo: error instanceof Error ? error.message : String(error) }));

  if (result.enviado) {
    await ref.set({
      status: "enviado",
      mensagem,
      messageId: result.messageId ?? null,
      enviadoEm: FieldValue.serverTimestamp(),
      ultimoErro: FieldValue.delete(),
      proximaTentativaEm: FieldValue.delete(),
      atualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
    return result;
  }

  const finalFailure = acquired.attempts >= MAX_ATTEMPTS;
  const retryDelay = RETRY_DELAYS_MS[Math.min(acquired.attempts - 1, RETRY_DELAYS_MS.length - 1)];
  await ref.set({
    status: finalFailure ? "erro_final" : "aguardando",
    ultimoErro: clean(result.motivo, 300) || "erro_envio",
    ...(finalFailure
      ? { proximaTentativaEm: FieldValue.delete() }
      : { proximaTentativaEm: Timestamp.fromMillis(Date.now() + retryDelay) }),
    atualizadoEm: FieldValue.serverTimestamp(),
  }, { merge: true });
  return result;
};

export const enfileirarAlertaAtendimentoHumano = async (payload: Record<string, unknown>) => {
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const telefone = normalizePhone(payload.telefone);
  const sourceMessageId = clean(payload.sourceMessageId, 180);
  const motivo = clean(payload.motivo, 80) || "excecao_operacional";
  if (!telefone) throw new Error("HANDOFF_PHONE_INVALID");
  if (!sourceMessageId) throw new Error("HANDOFF_SOURCE_MESSAGE_REQUIRED");
  const config = await db.collection("configuracoes").doc("whatsapp").get();
  const destino = normalizePhone(
    config.data()?.avisoAtendimentoHumanoNumero
    ?? config.data()?.avisoNovaReservaEquipeNumero
    ?? DESTINATION_DEFAULT,
  ) || DESTINATION_DEFAULT;
  const id = alertId(telefone, sourceMessageId, motivo);
  const ref = db.collection(COLLECTION).doc(id);
  const created = await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists) return false;
    transaction.create(ref, {
      telefone,
      nome: clean(payload.nome, 120),
      motivo,
      resumo: clean(payload.resumo, 600),
      ultimaMensagem: clean(payload.ultimaMensagem, 500),
      sourceMessageId,
      destino,
      status: "aguardando",
      tentativas: 0,
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    return true;
  });
  void processOne(id).catch((error) => console.error(`[whatsapp][handoff] Falha ao processar ${id}:`, error));
  return { enfileirado: created, duplicado: !created, id, destino };
};

export const processarAlertasAtendimentoHumano = async () => {
  if (workerRunning) return;
  const db = obterFirestoreAdmin();
  if (!db) return;
  workerRunning = true;
  try {
    const snapshot = await db.collection(COLLECTION).where("status", "in", ["aguardando", "enviando"]).limit(10).get();
    for (const document of snapshot.docs) {
      await processOne(document.id).catch((error) => {
        console.error(`[whatsapp][handoff] Falha ao reprocessar ${document.id}:`, error);
      });
    }
  } finally {
    workerRunning = false;
  }
};

export const iniciarProcessadorAlertasAtendimentoHumano = () => {
  if (workerTimer) return;
  workerTimer = setInterval(() => void processarAlertasAtendimentoHumano(), WORKER_INTERVAL_MS);
  workerTimer.unref?.();
  void processarAlertasAtendimentoHumano();
};
