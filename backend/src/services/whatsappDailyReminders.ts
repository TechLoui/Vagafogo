import { createHash } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { obterFirestoreAdmin } from "./firebaseAdmin";
import { enviarMensagemWhatsappGerenciada, type ResultadoEnvio } from "./whatsapp";
import { TEMPLATE_LEMBRETE_DIA_PADRAO } from "./whatsappAutomationConfig";

const TIMEZONE = "America/Sao_Paulo";
const WORKER_INTERVAL_MS = Math.max(Number(process.env.WHATSAPP_DAILY_REMINDER_WORKER_MS ?? 15000), 10000);
const DISCOVERY_INTERVAL_MS = Math.max(Number(process.env.WHATSAPP_DAILY_REMINDER_DISCOVERY_MS ?? 300000), 60000);
const STALE_SENDING_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;

let workerTimer: NodeJS.Timeout | null = null;
let workerRunning = false;
let lastDiscoveryAt = 0;
let cachedConfig: FirebaseFirestore.DocumentData | null = null;
let cachedConfigAt = 0;

const clean = (value: unknown, maximum = 500) => String(value ?? "").trim().slice(0, maximum);
const normalizePhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
};
const dateKey = (date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(date);
const localMinutes = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return value("hour") * 60 + value("minute");
};
const parseMinutes = (value: unknown, fallback = 8 * 60) => {
  const match = /^(\d{1,2}):(\d{2})/.exec(clean(value, 20));
  if (!match) return fallback;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 ? hours * 60 + minutes : fallback;
};
const reservationDate = (value: unknown) => {
  const raw = clean(value, 40);
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
  if (iso) return iso[1];
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(raw);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : "";
};
const timestampMillis = (value: any) => {
  if (typeof value?.toMillis === "function") return Number(value.toMillis());
  if (typeof value?.toDate === "function") return Number(value.toDate().getTime());
  const parsed = new Date(value ?? 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};
const hashId = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 40);
const clamp = (value: unknown, minimum: number, maximum: number, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, Math.floor(parsed))) : fallback;
};
const randomDelayMs = (config: FirebaseFirestore.DocumentData) => {
  const minimum = clamp(config.intervaloLembreteDiaMinSegundos, 60, 600, 60);
  const maximum = Math.max(minimum, clamp(config.intervaloLembreteDiaMaxSegundos, 60, 900, 120));
  return (minimum + Math.floor(Math.random() * (maximum - minimum + 1))) * 1000;
};
const eligibleReservation = (data: FirebaseFirestore.DocumentData, today: string) => {
  const reservationTime = parseMinutes(data.horario ?? data.Horario, -1);
  const visitHasNotPassed = reservationTime < 0 || localMinutes() < reservationTime;
  return data.origem !== "manual"
    && data.confirmada === true
    && ["pago", "confirmada", "confirmado"].includes(clean(data.status, 40).toLowerCase())
    && reservationDate(data.data ?? data.Data) === today
    && Boolean(normalizePhone(data.telefone ?? data.Telefone))
    && visitHasNotPassed;
};

const getConfig = async (force = false) => {
  if (!force && cachedConfig && Date.now() - cachedConfigAt < 60_000) return cachedConfig;
  const db = obterFirestoreAdmin();
  if (!db) return {};
  const snapshot = await db.collection("configuracoes").doc("whatsapp").get();
  cachedConfig = snapshot.exists ? snapshot.data() ?? {} : {};
  cachedConfigAt = Date.now();
  return cachedConfig;
};

const buildInstructions = (reservation: FirebaseFirestore.DocumentData) => {
  const activity = clean(reservation.atividade ?? reservation.Atividade, 500)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const lines: string[] = [];
  if (activity.includes("brunch")) lines.push("• O horário reservado é para estar sentado à mesa; há 15 minutos de tolerância.");
  if (activity.includes("trilha")) {
    lines.push("• A trilha funciona das 09h às 16h, com entrada até 15h e saída até 16h.");
    lines.push("• Na trilha não entram pets e não é permitido levar alimentos; água é permitida.");
  }
  const hasBariatric = Number(reservation.bariatrica ?? 0) > 0;
  if (hasBariatric) lines.push("• Apresente a carteirinha bariátrica na recepção.");
  lines.push("• A Fazenda fica a cerca de 5 km do centro histórico, com acesso pelo Alto do Carmo; siga as placas na estrada.");
  return lines.join("\n");
};

const renderMessage = (template: string, reservation: FirebaseFirestore.DocumentData) => {
  const fullName = clean(reservation.nome ?? reservation.Nome, 160);
  const firstName = fullName.split(/\s+/).filter(Boolean)[0] || "visitante";
  const values: Record<string, string> = {
    nome: firstName,
    nomecompleto: fullName,
    data: clean(reservation.data ?? reservation.Data, 40),
    horario: clean(reservation.horario ?? reservation.Horario, 100) || "conforme sua reserva",
    atividade: clean(reservation.atividade ?? reservation.Atividade, 500) || "Visita à Fazenda Vagafogo",
    participantes: String(Number(reservation.participantes ?? reservation.Participantes ?? 0)),
    instrucoes: buildInstructions(reservation),
  };
  return template.replace(/\{([a-z]+)\}/gi, (match, key) => values[String(key).toLowerCase()] ?? match).trim();
};

const enqueueToday = async () => {
  const db = obterFirestoreAdmin();
  if (!db) return 0;
  const today = dateKey();
  const snapshot = await db.collection("reservas").where("data", "==", today).limit(500).get();
  const eligible = snapshot.docs.filter((reservation) => eligibleReservation(reservation.data(), today));
  if (eligible.length === 0) return 0;

  const refs = eligible.map((reservation) =>
    db.collection("whatsapp_lembretes_dia").doc(hashId(`${today}:${reservation.id}`)),
  );
  const existing = await db.getAll(...refs);
  const batch = db.batch();
  let queued = 0;
  existing.forEach((item, index) => {
    if (item.exists) return;
    const reservation = eligible[index];
    const data = reservation.data();
    batch.create(item.ref, {
      reservaId: reservation.id,
      dataReserva: today,
      nome: clean(data.nome ?? data.Nome, 160),
      telefone: normalizePhone(data.telefone ?? data.Telefone),
      horario: clean(data.horario ?? data.Horario, 100),
      atividade: clean(data.atividade ?? data.Atividade, 500),
      participantes: Number(data.participantes ?? data.Participantes ?? 0),
      status: "aguardando",
      tentativas: 0,
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    queued += 1;
  });
  if (queued > 0) await batch.commit();
  return queued;
};

const processOne = async (config: FirebaseFirestore.DocumentData) => {
  const db = obterFirestoreAdmin();
  if (!db) return;
  const today = dateKey();
  const controlRef = db.collection("whatsapp_automacoes_controle").doc(`lembrete-dia-${today}`);
  const controlSnapshot = await controlRef.get();
  if (timestampMillis(controlSnapshot.data()?.proximoEnvioEm) > Date.now()) return;
  if (timestampMillis(controlSnapshot.data()?.bloqueadoAte) > Date.now()) return;
  const pending = await db.collection("whatsapp_lembretes_dia").where("dataReserva", "==", today).limit(500).get();
  const candidates = pending.docs
    .filter((doc) => ["aguardando", "enviando"].includes(clean(doc.data().status, 30)))
    .sort((a, b) => {
      const timeDifference = parseMinutes(a.data().horario, 24 * 60) - parseMinutes(b.data().horario, 24 * 60);
      return timeDifference || timestampMillis(a.data().criadoEm) - timestampMillis(b.data().criadoEm);
    });
  for (const document of candidates) {
    const acquired = await db.runTransaction(async (transaction) => {
      const fresh = await transaction.get(document.ref);
      const control = await transaction.get(controlRef);
      if (!fresh.exists) return null;
      const data = fresh.data()!;
      if (!["aguardando", "enviando"].includes(clean(data.status, 30))) return null;
      const nextGlobal = timestampMillis(control.data()?.proximoEnvioEm);
      if (nextGlobal > Date.now()) return null;
      const blockedUntil = timestampMillis(control.data()?.bloqueadoAte);
      if (blockedUntil > Date.now()) return null;
      const lastAttempt = timestampMillis(data.ultimaTentativaEm);
      if (data.status === "enviando" && lastAttempt > Date.now() - STALE_SENDING_MS) return null;
      const nextAttempt = timestampMillis(data.proximaTentativaEm);
      if (nextAttempt > Date.now()) return null;
      const sentToday = Number(control.data()?.enviados ?? 0);
      const dailyLimit = clamp(config.limiteDiarioLembreteDia, 1, 500, 100);
      if (sentToday >= dailyLimit) return null;
      const attempts = Number(data.tentativas ?? 0) + 1;
      transaction.set(document.ref, {
        status: "enviando",
        tentativas: attempts,
        ultimaTentativaEm: FieldValue.serverTimestamp(),
        atualizadoEm: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(controlRef, {
        data: today,
        bloqueadoAte: Timestamp.fromMillis(Date.now() + 60_000),
        atualizadoEm: FieldValue.serverTimestamp(),
      }, { merge: true });
      return { data, attempts };
    });
    if (!acquired) continue;

    const reservationRef = db.collection("reservas").doc(clean(acquired.data.reservaId, 120));
    const reservationSnapshot = await reservationRef.get();
    if (!reservationSnapshot.exists || !eligibleReservation(reservationSnapshot.data()!, today)) {
      await document.ref.set({ status: "ignorado", motivo: "reserva_nao_elegivel", atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
      return;
    }
    const reservation = reservationSnapshot.data()!;
    const template = clean(config.mensagemLembreteDia, 4096) || TEMPLATE_LEMBRETE_DIA_PADRAO;
    const message = renderMessage(template, reservation).slice(0, 4096);
    const result: ResultadoEnvio = await enviarMensagemWhatsappGerenciada(
      normalizePhone(reservation.telefone ?? reservation.Telefone),
      message,
    ).catch((error): ResultadoEnvio => ({ enviado: false, motivo: error instanceof Error ? error.message : String(error) }));
    const nextGlobalAt = Timestamp.fromMillis(Date.now() + randomDelayMs(config));
    if (result.enviado) {
      const batch = db.batch();
      batch.set(document.ref, {
        status: "enviado",
        mensagem: message,
        messageId: result.messageId ?? null,
        enviadoEm: FieldValue.serverTimestamp(),
        ultimoErro: FieldValue.delete(),
        atualizadoEm: FieldValue.serverTimestamp(),
      }, { merge: true });
      batch.set(reservationRef, {
        whatsappLembreteDiaEnviado: true,
        whatsappLembreteDiaData: today,
        whatsappLembreteDiaEm: FieldValue.serverTimestamp(),
        whatsappLembreteDiaMensagem: message,
        whatsappLembreteDiaMessageId: result.messageId ?? null,
      }, { merge: true });
      batch.set(controlRef, {
        data: today,
        proximoEnvioEm: nextGlobalAt,
        bloqueadoAte: FieldValue.delete(),
        enviados: FieldValue.increment(1),
        atualizadoEm: FieldValue.serverTimestamp(),
      }, { merge: true });
      await batch.commit();
      return;
    }

    const finalFailure = acquired.attempts >= MAX_ATTEMPTS || result.motivo === "telefone_invalido" || result.motivo === "telefone_sem_whatsapp";
    const batch = db.batch();
    batch.set(document.ref, {
      status: finalFailure ? "erro" : "aguardando",
      ultimoErro: result.motivo ?? "erro_envio",
      ...(finalFailure ? { proximaTentativaEm: FieldValue.delete() } : { proximaTentativaEm: Timestamp.fromMillis(Date.now() + acquired.attempts * 5 * 60_000) }),
      atualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
    batch.set(controlRef, {
      data: today,
      proximoEnvioEm: nextGlobalAt,
      bloqueadoAte: FieldValue.delete(),
      atualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
    await batch.commit();
    return;
  }
};

export const processarLembretesWhatsappDoDia = async () => {
  if (workerRunning) return;
  workerRunning = true;
  try {
    const config = await getConfig();
    if (config.lembreteDiaAtivo === false) return;
    const scheduledMinutes = parseMinutes(config.horarioLembreteDia, 8 * 60);
    const nowMinutes = localMinutes();
    if (nowMinutes < scheduledMinutes || nowMinutes >= 18 * 60) return;
    if (Date.now() - lastDiscoveryAt >= DISCOVERY_INTERVAL_MS) {
      lastDiscoveryAt = Date.now();
      await enqueueToday();
    }
    await processOne(config);
  } catch (error) {
    console.error("[whatsapp][lembrete-dia] Falha no processador:", error);
  } finally {
    workerRunning = false;
  }
};

export const iniciarProcessadorLembretesWhatsappDoDia = () => {
  if (workerTimer) return;
  workerTimer = setInterval(() => void processarLembretesWhatsappDoDia(), WORKER_INTERVAL_MS);
  workerTimer.unref?.();
  void processarLembretesWhatsappDoDia();
};

