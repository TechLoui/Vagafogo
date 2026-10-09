import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { obterFirestoreAdmin } from "./firebaseAdmin";
import type { ResultadoEnvio } from "./whatsapp";
import { enviarMensagemTransacionalPeloAgente } from "./agentTransactionalWhatsapp";
import { reservaEhManual, reservaPodeReceberDisparoAutomatico } from "./reservaOrigem";

const DESTINATION_DEFAULT = "5562991150376";
const TIMEZONE = "America/Sao_Paulo";
const WORKER_INTERVAL_MS = Math.max(Number(process.env.WHATSAPP_RESERVATION_ALERT_WORKER_MS ?? 15000), 5000);
const MAX_ATTEMPTS = 5;
const STALE_SENDING_MS = 2 * 60 * 1000;
const MIN_SEND_DELAY_MS = 60_000;
const MAX_SEND_DELAY_MS = 120_000;

const DEFAULT_TEMPLATE =
  "🌿 Reserva para hoje\n\n" +
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
const dateKey = (date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(date);
const localMinutes = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
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
const randomSendDelay = () => MIN_SEND_DELAY_MS + Math.floor(Math.random() * (MAX_SEND_DELAY_MS - MIN_SEND_DELAY_MS + 1));
const formatDateBr = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};

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

const confirmedReservationForToday = (reservation: FirebaseFirestore.DocumentData, today: string) =>
  reservaPodeReceberDisparoAutomatico(reservation)
  && reservation.confirmada === true
  && ["pago", "confirmada", "confirmado"].includes(clean(reservation.status, 40).toLowerCase())
  && reservationDate(reservation.data ?? reservation.Data) === today;

const confirmedReservationForSummary = (reservation: FirebaseFirestore.DocumentData, today: string) =>
  reservation.confirmada === true
  && ["pago", "confirmada", "confirmado"].includes(clean(reservation.status, 40).toLowerCase())
  && reservationDate(reservation.data ?? reservation.Data) === today;

const buildDailySummary = (
  today: string,
  reservations: FirebaseFirestore.QueryDocumentSnapshot[],
) => {
  const ordered = [...reservations].sort((left, right) => {
    const timeDifference = parseMinutes(left.data().horario ?? left.data().Horario, 24 * 60)
      - parseMinutes(right.data().horario ?? right.data().Horario, 24 * 60);
    if (timeDifference) return timeDifference;
    return clean(left.data().nome ?? left.data().Nome, 160)
      .localeCompare(clean(right.data().nome ?? right.data().Nome, 160), "pt-BR");
  });
  const participants = ordered.reduce(
    (total, document) => total + numberValue(document.data().participantes ?? document.data().Participantes),
    0,
  );
  const header = [
    `🌿 Resumo das reservas de hoje — ${formatDateBr(today)}`,
    "",
    `${ordered.length} reserva${ordered.length === 1 ? "" : "s"} • ${participants} participante${participants === 1 ? "" : "s"}`,
    "",
  ].join("\n");
  if (ordered.length === 0) return `${header}Nenhuma reserva confirmada para hoje.`;

  let message = header;
  let includedLines = 0;
  for (const [index, document] of ordered.entries()) {
    const reservation = document.data();
    const time = clean(reservation.horario ?? reservation.Horario, 20) || "Sem horário";
    const name = clean(reservation.nome ?? reservation.Nome, 70) || "Nome não informado";
    const activity = clean(reservation.atividade ?? reservation.Atividade, 100) || "Experiência não informada";
    const quantity = numberValue(reservation.participantes ?? reservation.Participantes);
    const line = `${index + 1}. ${time} • ${name} • ${activity} • ${quantity} pessoa${quantity === 1 ? "" : "s"}\n`;
    if ((message + line).length > 3850) break;
    message += line;
    includedLines += 1;
  }
  const omitted = ordered.length - includedLines;
  if (omitted > 0) message += `\n… e mais ${omitted} reserva${omitted === 1 ? "" : "s"}. Consulte a agenda no Admin.`;
  return message.trim();
};

const processMorningSummary = async (config: FirebaseFirestore.DocumentData) => {
  const db = obterFirestoreAdmin();
  if (!db) return false;
  const today = dateKey();
  if (config.resumoReservasEquipeAtivo === false) return true;
  const summaryMinutes = parseMinutes(config.horarioResumoReservasEquipe, 7 * 60 + 30);
  if (localMinutes() < summaryMinutes) return false;

  const summaryRef = db.collection("whatsapp_resumos_reservas_dia").doc(today);
  const current = await summaryRef.get();
  if (current.data()?.status === "enviado") return true;
  const lastAttempt = timestampMillis(current.data()?.ultimaTentativaEm);
  if (current.data()?.status === "enviando" && lastAttempt > Date.now() - STALE_SENDING_MS) return false;
  const nextAttempt = timestampMillis(current.data()?.proximaTentativaEm);
  if (nextAttempt > Date.now()) return false;

  const reservations = await db.collection("reservas").where("data", "==", today).limit(500).get();
  const eligible = reservations.docs.filter((document) => confirmedReservationForSummary(document.data(), today));
  const reservationIds = eligible.map((document) => document.id);
  const message = buildDailySummary(today, eligible);
  const attempts = Number(current.data()?.tentativas ?? 0) + 1;
  const acquired = await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(summaryRef);
    if (fresh.data()?.status === "enviado") return false;
    const freshLastAttempt = timestampMillis(fresh.data()?.ultimaTentativaEm);
    if (fresh.data()?.status === "enviando" && freshLastAttempt > Date.now() - STALE_SENDING_MS) return false;
    transaction.set(summaryRef, {
      data: today,
      status: "enviando",
      tentativas: attempts,
      reservaIds: reservationIds,
      totalReservas: eligible.length,
      totalParticipantes: eligible.reduce<number>(
        (total, document) => total + numberValue(document.data().participantes ?? document.data().Participantes),
        0,
      ),
      mensagem: message,
      ultimaTentativaEm: FieldValue.serverTimestamp(),
      criadoEm: fresh.data()?.criadoEm ?? FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });
  if (!acquired) return false;

  const destination = normalizePhone(config.avisoNovaReservaEquipeNumero) || DESTINATION_DEFAULT;
  const result: ResultadoEnvio = await enviarMensagemTransacionalPeloAgente(
    destination,
    message,
    `resumo-reservas-dia:${today}:${destination}`,
  ).catch((error): ResultadoEnvio => ({
    enviado: false,
    motivo: error instanceof Error ? error.message : String(error),
  }));

  if (result.enviado) {
    await summaryRef.set({
      status: "enviado",
      destino: destination,
      messageId: result.messageId ?? null,
      enviadoEm: FieldValue.serverTimestamp(),
      ultimoErro: FieldValue.delete(),
      proximaTentativaEm: FieldValue.delete(),
      atualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  }

  const finalFailure = attempts >= MAX_ATTEMPTS;
  await summaryRef.set({
    status: finalFailure ? "erro" : "aguardando",
    ultimoErro: result.motivo ?? "erro_envio",
    ...(finalFailure
      ? { proximaTentativaEm: FieldValue.delete() }
      : { proximaTentativaEm: Timestamp.fromMillis(Date.now() + Math.min(30, attempts * 3) * 60_000) }),
    atualizadoEm: FieldValue.serverTimestamp(),
  }, { merge: true });
  return false;
};

export const enfileirarAvisoNovaReservaEquipe = async (
  reservaId: string,
  reserva: Record<string, unknown>,
) => {
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const ref = db.collection("whatsapp_notificacoes_internas").doc(reservaId);
  const reservaRef = db.collection("reservas").doc(reservaId);
  const today = dateKey();
  const dataReservaInformada = reservationDate(reserva.data ?? reserva.Data);
  const initialStatusByDate = (dataReserva: string, origemAutomatizada: boolean) => !origemAutomatizada
    ? "ignorado"
    : dataReserva === today
      ? "aguardando"
      : "ignorado";
  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    const canonicalSnapshot = await transaction.get(reservaRef);
    if (existing.exists) return false;
    const canonical = { ...(canonicalSnapshot.data() ?? {}), ...reserva };
    const dataReserva = reservationDate(canonical.data ?? canonical.Data) || dataReservaInformada;
    const origemAutomatizada = reservaPodeReceberDisparoAutomatico(canonical);
    const initialStatus = initialStatusByDate(dataReserva, origemAutomatizada);
    const motivo = !origemAutomatizada
      ? reservaEhManual(canonical) ? "reserva_manual" : "origem_nao_automatizada"
      : dataReserva > today
        ? "incluida_no_resumo_da_data"
        : dataReserva < today
          ? "reserva_passada"
          : null;
    transaction.create(ref, {
      reservaId,
      dataEntrada: today,
      nome: clean(canonical.nome ?? canonical.Nome, 160),
      telefone: clean(canonical.telefone ?? canonical.Telefone, 80),
      email: clean(canonical.email ?? canonical.Email, 240),
      data: dataReserva,
      horario: clean(canonical.horario ?? canonical.Horario, 100),
      atividade: clean(canonical.atividade ?? canonical.Atividade, 300),
      participantes: numberValue(canonical.participantes ?? canonical.Participantes),
      valor: numberValue(canonical.valor ?? canonical.Valor),
      formaPagamento: clean(canonical.formaPagamento, 80),
      statusReserva: clean(canonical.status ?? canonical.Status ?? "aguardando", 80),
      status: initialStatus,
      ...(motivo ? { motivo } : {}),
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
  const reservationSnapshot = await db.collection("reservas").doc(reservaId).get();
  const reservation = reservationSnapshot.data() ?? {};
  const visitDate = reservationDate(snapshot.data()?.data);
  const eligible = visitDate === dateKey() && reservaPodeReceberDisparoAutomatico(reservation);
  await ref.update({
    status: eligible ? "aguardando" : "ignorado",
    motivo: eligible ? FieldValue.delete() : reservaEhManual(reservation) ? "reserva_manual" : "fora_da_data_da_visita",
    tentativas: 0,
    proximaTentativaEm: Timestamp.now(),
    ultimoErro: FieldValue.delete(),
    atualizadoEm: FieldValue.serverTimestamp(),
  });
};

const processOne = async (document: FirebaseFirestore.QueryDocumentSnapshot) => {
  const db = document.ref.firestore;
  const today = dateKey();
  const controlRef = db.collection("whatsapp_automacoes_controle").doc(`aviso-reserva-equipe-${today}`);
  const acquired = await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(document.ref);
    if (!fresh.exists) return null;
    const reservationRef = db.collection("reservas").doc(clean(fresh.data()?.reservaId, 100));
    const reservation = await transaction.get(reservationRef);
    const summary = await transaction.get(db.collection("whatsapp_resumos_reservas_dia").doc(today));
    const control = await transaction.get(controlRef);
    const summarizedReservationIds = Array.isArray(summary.data()?.reservaIds)
      ? summary.data()!.reservaIds.map(String)
      : [];
    if (summary.data()?.status === "enviado" && summarizedReservationIds.includes(clean(fresh.data()?.reservaId, 100))) {
      transaction.update(document.ref, {
        status: "ignorado",
        motivo: "incluida_no_resumo_da_manha",
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      return null;
    }
    if (clean(fresh.data()?.dataEntrada, 20) !== today) {
      transaction.update(document.ref, {
        status: "ignorado",
        motivo: "reserva_nao_criada_no_dia",
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      return null;
    }
    if (reservationDate(fresh.data()?.data) !== today) {
      transaction.update(document.ref, {
        status: reservationDate(fresh.data()?.data) > today ? "agendado" : "ignorado",
        motivo: "fora_da_data_da_visita",
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      return null;
    }
    if (!reservation.exists || !confirmedReservationForToday(reservation.data()!, today)) {
      const reservationData = reservation.exists ? reservation.data()! : {};
      const canceled = ["cancelada", "cancelado", "canceled", "cancelled", "estornada", "estornado"]
        .includes(clean(reservationData.status, 40).toLowerCase());
      const manual = reservaEhManual(reservationData);
      transaction.update(document.ref, {
        status: canceled || !reservaPodeReceberDisparoAutomatico(reservationData) ? "ignorado" : "aguardando_confirmacao",
        motivo: canceled
          ? "reserva_cancelada"
          : manual
            ? "reserva_manual"
            : !reservaPodeReceberDisparoAutomatico(reservationData)
              ? "origem_nao_automatizada"
              : "pagamento_nao_confirmado",
        proximaTentativaEm: Timestamp.fromMillis(Date.now() + 5 * 60_000),
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      return null;
    }
    if (timestampMillis(control.data()?.proximoEnvioEm) > Date.now()) return null;
    if (timestampMillis(control.data()?.bloqueadoAte) > Date.now()) return null;
    const currentStatus = String(fresh.data()?.status ?? "");
    if (!["aguardando", "agendado", "aguardando_confirmacao", "enviando"].includes(currentStatus)) return null;
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
    transaction.set(controlRef, {
      data: today,
      bloqueadoAte: Timestamp.fromMillis(Date.now() + 60_000),
      atualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
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
  const result: ResultadoEnvio = await enviarMensagemTransacionalPeloAgente(
    destination,
    message,
    `aviso-reserva:${today}:${clean(acquired.data.reservaId, 100)}`,
  ).catch((error): ResultadoEnvio => ({
    enviado: false,
    motivo: error instanceof Error ? error.message : String(error),
  }));
  const nextSendAt = Timestamp.fromMillis(Date.now() + randomSendDelay());

  if (result.enviado) {
    const batch = db.batch();
    batch.update(document.ref, {
      status: "enviado",
      dataEnvioProgramada: today,
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
    batch.set(controlRef, {
      data: today,
      proximoEnvioEm: nextSendAt,
      bloqueadoAte: FieldValue.delete(),
      enviados: FieldValue.increment(1),
      atualizadoEm: FieldValue.serverTimestamp(),
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
  batch.set(controlRef, {
    data: today,
    proximoEnvioEm: nextSendAt,
    bloqueadoAte: FieldValue.delete(),
    atualizadoEm: FieldValue.serverTimestamp(),
  }, { merge: true });
  await batch.commit();
};

export const processarAvisosNovaReservaEquipe = async () => {
  if (workerRunning) return;
  const db = obterFirestoreAdmin();
  if (!db) return;
  workerRunning = true;
  try {
    const configSnapshot = await db.collection("configuracoes").doc("whatsapp").get();
    const config = configSnapshot.exists ? configSnapshot.data() ?? {} : {};
    if (config.avisoNovaReservaEquipeAtivo === false) return;
    const startAt = parseMinutes(config.horarioResumoReservasEquipe, 7 * 60 + 30);
    const nowMinutes = localMinutes();
    if (nowMinutes < startAt || nowMinutes >= 18 * 60) return;
    const summaryReady = await processMorningSummary(config);
    if (!summaryReady) return;
    const snapshot = await db.collection("whatsapp_notificacoes_internas").where("data", "==", dateKey()).limit(500).get();
    const candidate = snapshot.docs
      .filter((document) => ["aguardando", "agendado", "aguardando_confirmacao", "enviando"].includes(clean(document.data().status, 40)))
      .filter((document) => timestampMillis(document.data().proximaTentativaEm) <= Date.now())
      .sort((left, right) => {
        const timeDifference = parseMinutes(left.data().horario, 24 * 60) - parseMinutes(right.data().horario, 24 * 60);
        return timeDifference || timestampMillis(left.data().criadoEm) - timestampMillis(right.data().criadoEm);
      })[0];
    if (candidate) await processOne(candidate);
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
