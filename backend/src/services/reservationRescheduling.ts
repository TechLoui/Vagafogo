import { createHash, randomBytes, randomUUID } from "crypto";
import { obterFirestoreAdmin } from "./firebaseAdmin";
import { canonicalLeadPhone, cpfValidoParaReservaAgente, reservaClientePodeConsultar } from "./agentReservationTools";
import { enviarMensagemTransacionalPeloAgente } from "./agentTransactionalWhatsapp";
import { registrarResultadoRemarcacaoSite } from "./siteChatConversations";
import { telefoneDoUira } from "./siteOwnerEscalation";
import { consultarRemarcacaoDisponivel, aplicarRemarcacaoAutorizada, type RescheduleTarget, type RescheduleCollections } from "./reservationRescheduleAvailability";

export const RESCHEDULE_REQUESTS = "crm_agent_reschedule_requests";
export const RESCHEDULE_TEST_COLLECTIONS: RescheduleCollections = Object.freeze({
  reservas: "crm_agent_reschedule_test_reservas", pacotes: "crm_agent_reschedule_test_pacotes",
  combos: "crm_agent_reschedule_test_combos", disponibilidade: "crm_agent_reschedule_test_disponibilidade",
});
const INTAKES = "crm_agent_reschedule_intakes";
const LOCKS = "crm_agent_reschedule_locks";
const RECEIPTS = "crm_agent_reschedule_decisions";
const OWNER_PHONE = "5562991150376";
const CALL = "Para tratar a alteração com um atendente, por favor, ligue pelo WhatsApp da equipe: https://wa.me/5562992225471. Abra a conversa e toque no botão de chamada, das 08h às 17h.";
const DAY = 24 * 60 * 60_000;
const LEASE = 2 * 60_000;
const MAX_ATTEMPTS = 5;
type Data = Record<string, any>;
type Dependencies = {
  db?: FirebaseFirestore.Firestore | null;
  now?: () => number;
  preview?: typeof consultarRemarcacaoDisponivel;
  apply?: typeof aplicarRemarcacaoAutorizada;
  send?: typeof enviarMensagemTransacionalPeloAgente;
  siteMessage?: typeof registrarResultadoRemarcacaoSite;
  processImmediately?: boolean;
  /** Server-only test harness option. Never accepted from the customer/tool payload. */
  testSourceId?: string;
};
type IntakeInput = {
  sessionId?: unknown; telefone?: unknown; canal?: unknown; nomeContato?: unknown;
  codigo?: unknown; cpf?: unknown; reservaId?: unknown; dataAtual?: unknown;
  novaData?: unknown; novoHorario?: unknown; horariosPorPacote?: unknown;
  consultarPendente?: boolean; mensagemCliente?: unknown;
};
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const clean = (value: unknown, max = 160) => String(value ?? "").trim().slice(0, max);
const testScope = (sourceId: string) => {
  if (!/^[A-Za-z0-9_-]{12,100}$/.test(sourceId)) throw new Error("RESCHEDULING_TEST_SCOPE_INVALID");
  return { testMode: true, testNamespace: "v1", sandboxSourceId: sourceId };
};
const requestCollections = (request: Data): RescheduleCollections | undefined => {
  if (!request.testMode && !request.testNamespace && !request.sandboxSourceId) return undefined;
  const sourceId = String(request.sandboxSourceId || "");
  testScope(sourceId);
  if (request.testMode !== true || request.testNamespace !== "v1"
    || request.reservaId !== `qa-reschedule-${hash(sourceId).slice(0, 20)}`
    || request.customerPhone !== OWNER_PHONE || request.siteSessions?.length) throw new Error("RESCHEDULING_TEST_SCOPE_INVALID");
  return RESCHEDULE_TEST_COLLECTIONS;
};
const intakeCollection = (deps: Dependencies) => deps.testSourceId === undefined ? INTAKES : `${INTAKES}_test`;
const millis = (value: any): number => value?.toMillis ? value.toMillis() : value instanceof Date ? value.getTime() : Number(value) || 0;
const database = (deps: Dependencies) => {
  const db = deps.db === undefined ? obterFirestoreAdmin() : deps.db;
  if (!db) throw new Error("RESCHEDULING_STORAGE_UNAVAILABLE");
  return db;
};
const sessionValid = (sessionId: string, phone: string, channel: string) => channel === "site"
  ? /^site_[A-Za-z0-9_-]{12,110}$/.test(sessionId)
  : channel === "whatsapp" && /^whatsapp_\d{10,15}$/.test(sessionId) && phone && canonicalLeadPhone(sessionId.slice(9)) === phone;
const dateValid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const timeValid = (value: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
const dateLabel = (value: string) => dateValid(value) ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : value;
const scheduleLabel = (value: Data, names: Data = {}) => {
  const times = Object.entries(value.horariosPorPacote || {}).filter(([, time]) => timeValid(String(time)));
  const details = new Set(times.map(([, time]) => time)).size > 1
    ? ` (${times.map(([id, time]) => `${clean(names[id] || "Experiência", 80)}: ${time}`).join("; ")})` : "";
  return `${dateLabel(clean(value.data))}${value.horario ? ` às ${clean(value.horario, 5)}` : ""}${details}`;
};
const noticePending = () => ({ status: "pending", attempts: 0, nextAttemptAt: 0, sentAt: null });
type ReschedulingResponse = { status: string; resposta: string; proximoCampo?: string | null; solicitacaoId?: string; [key: string]: unknown };
const response = (status: string, resposta: string, extra: Data = {}): ReschedulingResponse => ({ status, resposta, ...extra });
const missingPrompt = (field: string) => field === "cpf" ? "Informe o CPF do titular para eu localizar a reserva."
  : field === "codigo" ? "Informe o código da reserva para eu localizar o pedido correto."
    : field === "reserva" ? "Informe a data atual ou o código da reserva que deseja alterar."
      : field === "novoHorario" ? "Qual o novo horário desejado?"
        : "Para qual data deseja mudar? Se quiser alterar apenas o horário, informe o novo horário.";
const resultText = (request: Data) => `${request.testMode ? "🧪 TESTE ISOLADO — nenhuma reserva real foi alterada.\n" : ""}${request.status === "approved"
  ? `Sua reserva foi remarcada no sistema para ${scheduleLabel(request.depois, request.timeLabels)}. A experiência e os participantes foram mantidos. 🌿`
  : request.status === "rejected"
    ? `A alteração não foi autorizada e este pedido não remarcou sua reserva. ${CALL}`
    : `Não foi possível concluir a remarcação solicitada. Sua reserva não foi alterada por este pedido. ${CALL}`}`;
const publicStatus = (request: Data) => request.status === "awaiting_owner" ? "aguardando_autorizacao"
  : request.status === "approved" ? "aprovada" : request.status === "rejected" ? "negada" : "exige_atendimento";
const requestResponse = (request: Data) => response(publicStatus(request), request.status === "awaiting_owner"
  ? `Havia disponibilidade na consulta. Registrei o pedido para ${scheduleLabel(request.depois, request.timeLabels)} e ele aguarda autorização do Uirá. A remarcação ainda não foi confirmada. 🌿`
  : resultText(request), { solicitacaoId: request.id, codigoSolicitacao: request.code, proximoCampo: null });

const startNotifications = (id: string, deps: Dependencies) => {
  if (deps.processImmediately !== false) void processarNotificacaoRemarcacao(id, deps).catch((error) => {
    console.error("[rescheduling] Aviso permanece na fila:", clean(error instanceof Error ? error.message : error));
  });
};

/** Only session-bound context is returned; CPF and reservation documents are never exposed to the model. */
export const obterContextoRemarcacao = async (input: { sessionId?: unknown; telefone?: unknown }, deps: Dependencies = {}) => {
  const sessionId = clean(input.sessionId);
  const phone = canonicalLeadPhone(input.telefone);
  if (!/^site_[A-Za-z0-9_-]{12,110}$|^whatsapp_\d{10,15}$/.test(sessionId)) return { pendente: false };
  const db = database(deps);
  if (deps.testSourceId !== undefined) testScope(deps.testSourceId);
  const snapshot = await db.collection(intakeCollection(deps)).doc(hash(sessionId)).get();
  if (!snapshot.exists) return { pendente: false };
  const intake = snapshot.data()!;
  if ((intake.requesterPhone && intake.requesterPhone !== phone) || millis(intake.expiresAt) <= (deps.now || Date.now)()) return { pendente: false };
  if (intake.requestId) {
    const stored = await db.collection(RESCHEDULE_REQUESTS).doc(intake.requestId).get();
    if (stored.exists) {
      const request = { ...stored.data(), id: stored.id } as Data;
      return { pendente: request.status === "awaiting_owner", contexto: requestResponse(request) };
    }
  }
  return { pendente: true, contexto: { status: "dados_pendentes", proximoCampo: intake.proximoCampo || "novaData", resposta: missingPrompt(intake.proximoCampo),
    novaData: intake.novaData || "", novoHorario: intake.novoHorario || "" } };
};

export const solicitarRemarcacaoReserva = async (input: IntakeInput, deps: Dependencies = {}) => {
  const db = database(deps);
  const now = (deps.now || Date.now)();
  const sessionId = clean(input.sessionId);
  const channel = clean(input.canal);
  const requesterPhone = canonicalLeadPhone(input.telefone);
  if (!sessionValid(sessionId, requesterPhone, channel)) throw new Error("RESCHEDULING_SESSION_INVALID");
  const sandbox = deps.testSourceId === undefined ? null : testScope(deps.testSourceId);
  const collections = sandbox ? RESCHEDULE_TEST_COLLECTIONS : undefined;
  if (sandbox && (requesterPhone !== OWNER_PHONE || channel !== "whatsapp"
    || input.codigo !== `qa-reschedule-${hash(deps.testSourceId!).slice(0, 20)}`)) throw new Error("RESCHEDULING_TEST_SCOPE_INVALID");
  const reservationsCollection = collections?.reservas || "reservas";
  if (input.consultarPendente) {
    const context = await obterContextoRemarcacao(input, deps);
    return context.contexto || response("inexistente", "Não há pedido de remarcação neste atendimento.");
  }
  const intakeRef = db.collection(intakeCollection(deps)).doc(hash(sessionId));
  const stored = await intakeRef.get();
  let intake: Data = stored.exists && millis(stored.data()?.expiresAt) > now ? { ...stored.data() } : {};
  if (intake.requesterPhone && intake.requesterPhone !== requesterPhone) throw new Error("RESCHEDULING_IDENTITY_MISMATCH");
  intake = { ...intake, sessionId, requesterPhone, channel, expiresAt: new Date(now + 7 * DAY), updatedAt: new Date(now) };
  const save = async () => intakeRef.set(intake);
  const missing = async (field: string, text: string) => {
    intake.proximoCampo = field;
    await save();
    return response("dados_pendentes", text, { proximoCampo: field });
  };
  const suppliedCode = clean(input.codigo, 100);
  const suppliedCpf = clean(input.cpf, 20).replace(/\D/g, "");
  const suppliedCurrentDate = clean(input.dataAtual, 10);
  const changedReservation = Boolean(suppliedCode && (intake.reservaId || intake.codigo) && suppliedCode !== (intake.reservaId || intake.codigo))
    || Boolean(suppliedCpf && intake.cpfDigest && hash(suppliedCpf) !== intake.cpfDigest)
    || Boolean(suppliedCurrentDate && intake.reservaDataAtual && suppliedCurrentDate !== intake.reservaDataAtual);
  if (changedReservation) {
    for (const key of ["reservaId", "requestId", "novaData", "novoHorario", "horariosPorPacote", "proximoCampo", "dataAtual", "reservaDataAtual", "codigo"]) delete intake[key];
    if (suppliedCpf && intake.cpfDigest !== hash(suppliedCpf)) {
      delete intake.candidateIds;
      delete intake.cpfDigest;
    }
  }
  if (suppliedCode) {
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(suppliedCode)) return missing(channel === "site" ? "reserva" : "codigo", "Confira o código da reserva informado.");
    intake.codigo = suppliedCode;
  }
  if (suppliedCurrentDate) {
    if (!dateValid(suppliedCurrentDate)) return missing("reserva", "Qual é a data atual da reserva? Informe dia, mês e ano.");
    intake.dataAtual = suppliedCurrentDate;
  }
  if (input.novaData !== undefined) {
    const value = clean(input.novaData, 10);
    if (!dateValid(value)) return missing("novaData", "Qual a nova data desejada? Informe dia, mês e ano para eu consultar as vagas.");
    intake.novaData = value;
  }
  if (input.novoHorario !== undefined) {
    const value = clean(input.novoHorario, 5);
    if (!timeValid(value)) return missing("novoHorario", "Qual o novo horário desejado? Informe, por exemplo, 11:00.");
    intake.novoHorario = value;
  }
  if (input.horariosPorPacote && typeof input.horariosPorPacote === "object" && !Array.isArray(input.horariosPorPacote)) {
    const times = Object.entries(input.horariosPorPacote).filter(([id, time]) => /^[A-Za-z0-9_-]{1,100}$/.test(id) && timeValid(String(time)));
    if (times.length !== Object.keys(input.horariosPorPacote).length || times.length > 20) return missing("novoHorario", "Confira os horários desejados para eu consultar a remarcação.");
    intake.horariosPorPacote = Object.fromEntries(times);
  }
  const suppliedTarget = input.novaData !== undefined || input.novoHorario !== undefined || input.horariosPorPacote !== undefined;
  if (intake.requestId && !suppliedTarget) {
    const request = await db.collection(RESCHEDULE_REQUESTS).doc(intake.requestId).get();
    if (request.exists) return requestResponse({ ...request.data(), id: request.id });
  }
  let reservationId = clean(intake.codigo || intake.reservaId, 100);
  if (channel === "site") {
    const cpf = clean(input.cpf, 20).replace(/\D/g, "");
    if (cpf) {
      if (!cpfValidoParaReservaAgente(cpf)) return missing("cpf", "Informe um CPF válido do titular para eu localizar a reserva.");
      const formatted = `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
      const found = await Promise.all([cpf, formatted].map((value) => db.collection(reservationsCollection).where("cpf", "==", value).limit(31).get()));
      const matches = new Map(found.flatMap((snapshot) => snapshot.docs).filter((doc) => reservaClientePodeConsultar(doc.data(), { canal: "site", cpf })).map((doc) => [doc.id, doc.data()]));
      if (matches.size > 30) return missing("reserva", "Informe o código da reserva que deseja alterar para eu localizar o pedido correto.");
      intake.candidateIds = [...matches.keys()];
      intake.cpfDigest = hash(cpf);
    }
    if (!intake.cpfDigest || !Array.isArray(intake.candidateIds)) return missing("cpf", "Para localizar a reserva que deseja remarcar, informe somente o CPF do titular.");
    const candidateDocs = await Promise.all(intake.candidateIds.map((id: string) => db.collection(reservationsCollection).doc(id).get()));
    const candidates = candidateDocs.filter((doc) => doc.exists && hash(clean(doc.data()?.cpf).replace(/\D/g, "")) === intake.cpfDigest)
      .filter((doc) => !reservationId || doc.id === reservationId)
      .filter((doc) => !intake.dataAtual || clean(doc.data()?.data, 10) === intake.dataAtual);
    if (!candidates.length) return missing("cpf", "Não consegui localizar uma reserva correspondente. Confira o CPF ou o código informado.");
    if (candidates.length > 1) {
      const dates = [...new Set(candidates.slice(0, 3).map((doc) => dateLabel(clean(doc.data()?.data, 10))))];
      return missing("reserva", `Encontrei mais de uma reserva. Qual é a data atual da reserva que deseja alterar${dates.length ? ` (${dates.join(", ")})` : ""}? Se houver duas na mesma data, informe o código.`);
    }
    reservationId = candidates[0].id;
  } else if (!/^[A-Za-z0-9_-]{8,100}$/.test(reservationId)) {
    return missing("codigo", "Para localizar a reserva que deseja remarcar, informe o código da reserva.");
  }
  const reservationDoc = await db.collection(reservationsCollection).doc(reservationId).get();
  const reservation = reservationDoc.data() || {};
  const owns = channel === "site" ? intake.candidateIds.includes(reservationId)
    && hash(clean(reservation.cpf).replace(/\D/g, "")) === intake.cpfDigest
    : reservaClientePodeConsultar(reservation, { canal: "whatsapp", telefone: requesterPhone });
  if (!reservationDoc.exists || !owns) return missing(channel === "site" ? "cpf" : "codigo", "Não consegui localizar uma reserva correspondente a este atendimento. Confira os dados informados.");
  intake.reservaId = reservationId;
  intake.reservaDataAtual = clean(reservation.data, 10);
  if (!intake.novaData && !intake.novoHorario && !Object.keys(intake.horariosPorPacote || {}).length) {
    const wantsHour = /hor[aá]rio|hora\b/i.test(clean(input.mensagemCliente, 400)) && !/dia|data/i.test(clean(input.mensagemCliente, 400));
    return missing(wantsHour ? "novoHorario" : "novaData", wantsHour
      ? "Qual o novo horário desejado? Vou manter a data e consultar as vagas antes de pedir autorização."
      : "Para qual data deseja mudar? Se quiser alterar apenas o horário, pode informar o novo horário.");
  }
  const target: RescheduleTarget = { data: intake.novaData || clean(reservation.data, 10),
    ...(intake.novoHorario ? { horario: intake.novoHorario } : {}),
    ...(intake.horariosPorPacote ? { horariosPorPacote: intake.horariosPorPacote } : {}) };
  const preview = await (deps.preview || consultarRemarcacaoDisponivel)(reservationId, target, { db, now: () => now, ...(collections ? { collections } : {}) });
  await save();
  if (!preview.disponivel) {
    if (preview.status === "exige_atendimento") return response("exige_atendimento", `Essa reserva precisa de conferência por um atendente antes da alteração. ${CALL}`);
    return missing("novaData", "Não encontrei disponibilidade para essa alteração. Sua reserva atual foi mantida. Qual outra data ou horário gostaria que eu consultasse?");
  }
  const phone = canonicalLeadPhone(preview.telefone);
  if (sandbox && phone !== OWNER_PHONE) throw new Error("RESCHEDULING_TEST_SCOPE_INVALID");
  if (!/^55[1-9]\d{9,10}$/.test(phone)) return response("exige_atendimento", `Não consegui confirmar um WhatsApp válido na reserva para enviar o resultado. ${CALL}`);
  const dedupKey = hash(`${reservationId}\0${preview.fingerprint}\0${JSON.stringify(preview.depois)}`);
  const id = randomUUID();
  const ref = db.collection(RESCHEDULE_REQUESTS).doc(id);
  const lockRef = db.collection(sandbox ? `${LOCKS}_test` : LOCKS).doc(hash(reservationId));
  const request = await db.runTransaction(async (transaction) => {
    const lock = await transaction.get(lockRef);
    const activeId = lock.data()?.requestId;
    const oldRef = activeId ? db.collection(RESCHEDULE_REQUESTS).doc(activeId) : null;
    const old = oldRef ? await transaction.get(oldRef) : null;
    if (old?.data()?.status === "awaiting_owner" && old.data()!.dedupKey === dedupKey) {
      const value = old.data()!;
      if (channel === "site" && !value.siteSessions?.includes(sessionId)) {
        value.siteSessions = [...(value.siteSessions || []), sessionId];
        transaction.set(oldRef!, { siteSessions: value.siteSessions }, { merge: true });
      }
      return { ...value, id: activeId };
    }
    if (old?.data()?.status === "awaiting_owner") transaction.set(oldRef!, { status: "superseded", notificationsPending: false, updatedAt: new Date(now) }, { merge: true });
    const value = {
      id, dedupKey, code: `PR${randomBytes(4).toString("hex").toUpperCase()}`, status: "awaiting_owner", reservaId: reservationId,
      antes: preview.antes, depois: preview.depois, target, fingerprint: preview.fingerprint,
      customerName: clean(preview.nome, 120), customerPhone: phone, activity: clean(preview.atividade, 160), participants: preview.participantes,
      timeLabels: Object.fromEntries(preview.pacotes.map((pack) => [pack.id, clean(pack.nome, 80)])),
      siteSessions: channel === "site" ? [sessionId] : [], createdAt: new Date(now), updatedAt: new Date(now), expiresAt: new Date(now + DAY),
      ownerNotice: noticePending(), clientNotice: null, notificationsPending: true, ...(sandbox || {}),
    };
    transaction.set(ref, value);
    transaction.set(lockRef, { requestId: id, updatedAt: new Date(now) });
    return value;
  });
  intake.requestId = request.id;
  intake.proximoCampo = null;
  await save();
  startNotifications(request.id, deps);
  return requestResponse(request);
};

export const decidirRemarcacaoReserva = async (input: { telefoneOperador?: unknown; mensagem?: unknown; sourceMessageId?: unknown; quotedMessageId?: unknown; quotedRequestCode?: unknown }, deps: Dependencies = {}) => {
  if (!telefoneDoUira(input.telefoneOperador)) return { handled: false };
  const decision = clean(input.mensagem, 100).toUpperCase().match(/^([12])(?:\s+(PR[A-F0-9]{8}))?[.!]?$/);
  if (!decision) return { handled: false };
  const sourceId = clean(input.sourceMessageId, 200);
  if (!sourceId) return { handled: true, resposta: "Não consegui identificar esta resposta. Envie novamente 1 para autorizar ou 2 para negar, citando o pedido." };
  const db = database(deps);
  const now = (deps.now || Date.now)();
  const receiptRef = db.collection(RECEIPTS).doc(hash(`${OWNER_PHONE}\0${sourceId}`));
  const already = await receiptRef.get();
  if (already.exists) return already.data()!.result;
  const quoted = clean(input.quotedMessageId, 200);
  const quotedCode = clean(input.quotedRequestCode, 10).toUpperCase();
  let candidates: FirebaseFirestore.QuerySnapshot;
  if (decision[2]) candidates = await db.collection(RESCHEDULE_REQUESTS).where("code", "==", decision[2]).limit(2).get();
  else if (/^PR[A-F0-9]{8}$/.test(quotedCode)) candidates = await db.collection(RESCHEDULE_REQUESTS).where("code", "==", quotedCode).limit(2).get();
  else if (quoted) candidates = await db.collection(RESCHEDULE_REQUESTS).where("ownerMessageId", "==", quoted).limit(2).get();
  else candidates = await db.collection(RESCHEDULE_REQUESTS).where("status", "==", "awaiting_owner").limit(2).get();
  const recordResult = async (result: Data) => db.runTransaction(async (transaction) => {
    const receipt = await transaction.get(receiptRef);
    if (receipt.exists) return receipt.data()!.result;
    transaction.set(receiptRef, { result, createdAt: new Date(now) });
    return result;
  });
  if (candidates.size !== 1) return recordResult({ handled: true, resposta: candidates.size > 1
    ? "Há mais de um pedido aguardando decisão. Cite a mensagem do pedido ou responda 1 CODIGO para autorizar / 2 CODIGO para negar."
    : "Não localizei um pedido pendente correspondente. Confira o código ou cite a mensagem da solicitação." });
  const ref = candidates.docs[0].ref;
  const result = await db.runTransaction(async (transaction) => {
    const [receipt, snapshot] = await Promise.all([transaction.get(receiptRef), transaction.get(ref)]);
    if (receipt.exists) return receipt.data()!.result;
    const request = snapshot.data()!;
    const collections = requestCollections(request);
    let status = request.status;
    if (status === "awaiting_owner") {
      if (millis(request.expiresAt) <= now) status = "expired";
      else if (decision[1] === "2") status = "rejected";
      else {
        try {
          const applied = await (deps.apply || aplicarRemarcacaoAutorizada)(request.reservaId, request.target,
            { db, transaction, expectedFingerprint: request.fingerprint, now: () => now, ...(collections ? { collections } : {}) });
          status = applied.aplicada ? "approved" : "unavailable";
        } catch (error) {
          if (!(error instanceof Error) || error.message !== "RESCHEDULE_RESERVATION_NOT_FOUND") throw error;
          status = "unavailable";
        }
      }
      transaction.set(ref, { status, decidedAt: new Date(now), decidedBy: OWNER_PHONE, decisionSourceMessageId: sourceId, updatedAt: new Date(now),
        clientNotice: noticePending(), notificationsPending: true }, { merge: true });
    }
    const result = { handled: true, solicitacaoId: ref.id, resposta: `${collections ? "🧪 TESTE ISOLADO — " : ""}${status === "approved"
      ? `${request.code}: remarcação salva no sistema para ${scheduleLabel(request.depois, request.timeLabels)}. O aviso ao cliente está na fila.`
      : status === "rejected" ? `${request.code}: pedido negado. O cliente será orientado a ligar pelo WhatsApp da equipe.`
        : `${request.code}: este pedido não pode ser aplicado. A reserva não foi remarcada por esta decisão; o cliente deve falar com a equipe.`}` };
    transaction.set(receiptRef, { result, requestId: ref.id, sourceMessageId: sourceId, createdAt: new Date(now) });
    return result;
  });
  startNotifications(ref.id, deps);
  return result;
};

export const mensagemAutorizacaoRemarcacao = (request: Data) => [
  `🔁 Autorizar remarcação — ${request.code}`,
  ...(request.testMode ? ["🧪 TESTE ISOLADO — não ocupa vagas nem altera reservas reais. O resultado do teste também será enviado a você."] : []),
  `Cliente: ${request.customerName || "Titular da reserva"}`,
  `${request.activity || "Visita"} • ${Number(request.participants) || 0} pessoa(s)`,
  `Atual: ${scheduleLabel(request.antes, request.timeLabels)}`, `Solicitado: ${scheduleLabel(request.depois, request.timeLabels)}`,
  "", "1 — autorizar | 2 — negar", "Se houver mais de um pedido, cite esta mensagem ou responda 1/2 seguido do código.",
  `Contato do cliente: https://wa.me/${request.customerPhone}`,
].join("\n");

export const processarNotificacaoRemarcacao = async (id: string, deps: Dependencies = {}) => {
  const db = database(deps);
  const clock = deps.now || Date.now;
  const ref = db.collection(RESCHEDULE_REQUESTS).doc(id);
  const leaseId = randomUUID();
  const acquired = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    const request = snapshot.data()!;
    if (millis(request.notificationLeaseUntil) > clock()) return null;
    const phase = request.status === "awaiting_owner" ? "ownerNotice"
      : ["approved", "rejected", "unavailable", "expired", "failed"].includes(request.status) ? "clientNotice" : null;
    const notice = phase && request[phase];
    if (!phase || !notice || notice.status !== "pending" || Number(notice.attempts) >= MAX_ATTEMPTS || millis(notice.nextAttemptAt) > clock()) return null;
    transaction.set(ref, { notificationLeaseId: leaseId, notificationLeaseUntil: clock() + LEASE }, { merge: true });
    return { request, phase };
  });
  if (!acquired) return false;
  let delivered = false;
  let messageId = "";
  let error = "";
  let retryAfter = 0;
  let whatsappSentAt: unknown = null;
  let siteSentSessions: string[] = [];
  try {
    const current = (await ref.get()).data()!;
    if (current.status !== acquired.request.status) return false;
    requestCollections(current);
    if (acquired.phase === "ownerNotice") {
      const sent = await (deps.send || enviarMensagemTransacionalPeloAgente)(OWNER_PHONE, mensagemAutorizacaoRemarcacao(current), `rescheduling-owner:${id}`, "Uirá", { tipoDisparo: "remarcacao_autorizacao", siteSessionIds: current.siteSessions || [] });
      delivered = sent.enviado;
      messageId = sent.messageId || "";
      error = sent.motivo || "";
      retryAfter = Number(sent.retryAfterMs) || 0;
    } else {
      const text = resultText(current);
      siteSentSessions = [...(current.clientNotice.siteSentSessions || [])];
      let siteFailed = false;
      for (const sessionId of current.siteSessions || []) {
        if (siteSentSessions.includes(sessionId)) continue;
        try {
          await (deps.siteMessage || registrarResultadoRemarcacaoSite)(sessionId, { from: "bot", text, sourceId: `rescheduling-result:${id}` });
          siteSentSessions.push(sessionId);
        } catch { siteFailed = true; }
      }
      whatsappSentAt = current.clientNotice.whatsappSentAt || null;
      const sent = whatsappSentAt ? { enviado: true, motivo: "", retryAfterMs: 0 }
        : await (deps.send || enviarMensagemTransacionalPeloAgente)(current.customerPhone, text, `rescheduling-customer:${id}`, current.customerName, { tipoDisparo: "remarcacao_resultado", siteSessionIds: current.siteSessions || [] });
      if (sent.enviado && !whatsappSentAt) whatsappSentAt = new Date(clock());
      if ("messageId" in sent) messageId = String(sent.messageId || "");
      delivered = sent.enviado && !siteFailed;
      error = siteFailed ? "SITE_NOTIFICATION_UNAVAILABLE" : sent.motivo || "";
      retryAfter = Number(sent.retryAfterMs) || 0;
    }
  } catch (failure) {
    error = failure instanceof Error ? failure.message : "NOTIFICATION_UNAVAILABLE";
  } finally {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const latest = snapshot.data();
      if (!latest || latest.notificationLeaseId !== leaseId) return;
      const notice = latest[acquired.phase] || noticePending();
      const attempts = Number(notice.attempts) + (error === "DISPATCH_PACED" ? 0 : 1);
      const updated = { ...notice, status: delivered ? "sent" : attempts >= MAX_ATTEMPTS ? "failed" : "pending", attempts,
        sentAt: delivered ? new Date(clock()) : notice.sentAt, lastError: delivered ? null : clean(error, 200),
        nextAttemptAt: delivered ? 0 : clock() + (retryAfter || Math.min(10 * 60_000, 30_000 * 2 ** Math.min(attempts, 4))) };
      const patch: Data = { [acquired.phase]: updated, notificationLeaseUntil: 0, updatedAt: new Date(clock()) };
      if (acquired.phase === "clientNotice") Object.assign(updated, { whatsappSentAt, siteSentSessions, ...(messageId ? { messageId } : {}) });
      if (delivered && acquired.phase === "ownerNotice" && messageId) patch.ownerMessageId = messageId;
      if (acquired.phase === "ownerNotice" && !delivered && attempts >= MAX_ATTEMPTS && latest.status === "awaiting_owner") {
        patch.status = "failed";
        patch.clientNotice = noticePending();
      }
      const finalStatus = patch.status || latest.status;
      patch.notificationsPending = finalStatus === "awaiting_owner" ? updated.status === "pending"
        : acquired.phase === "clientNotice" ? updated.status === "pending" : Boolean(patch.clientNotice || latest.clientNotice?.status === "pending");
      transaction.set(ref, patch, { merge: true });
    });
  }
  return delivered;
};

let worker: NodeJS.Timeout | null = null;
let processing = false;
export const processarNotificacoesRemarcacao = async (deps: Dependencies = {}) => {
  if (processing) return;
  processing = true;
  try {
    const db = database(deps);
    const awaiting = await db.collection(RESCHEDULE_REQUESTS).where("status", "==", "awaiting_owner").get();
    for (const doc of awaiting.docs) {
      if (millis(doc.data().expiresAt) > (deps.now || Date.now)()) continue;
      await db.runTransaction(async (transaction) => {
        const latest = await transaction.get(doc.ref);
        if (latest.data()?.status === "awaiting_owner" && millis(latest.data()?.expiresAt) <= (deps.now || Date.now)()) {
          transaction.set(doc.ref, { status: "expired", clientNotice: noticePending(), notificationsPending: true }, { merge: true });
        }
      });
    }
    const pending = await db.collection(RESCHEDULE_REQUESTS).where("notificationsPending", "==", true).get();
    for (const doc of pending.docs) await processarNotificacaoRemarcacao(doc.id, deps);
  } finally { processing = false; }
};
export const iniciarProcessadorRemarcacoes = () => {
  if (worker) return;
  const run = () => void processarNotificacoesRemarcacao().catch((error) => console.error("[rescheduling] Fila indisponível:", clean(error instanceof Error ? error.message : error)));
  run();
  worker = setInterval(run, 15_000);
  worker.unref();
};
