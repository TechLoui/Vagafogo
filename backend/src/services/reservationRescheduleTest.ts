import { createHash } from "crypto";
import { obterFirestoreAdmin } from "./firebaseAdmin";
import { RESCHEDULE_REQUESTS, RESCHEDULE_TEST_COLLECTIONS, solicitarRemarcacaoReserva } from "./reservationRescheduling";

type Data = Record<string, any>;
export type ReservationRescheduleTestDependencies = NonNullable<Parameters<typeof solicitarRemarcacaoReserva>[1]>;
const OWNER = "5562991150376";
const NAMESPACE = "v1";
const NAME = "RESERVA TESTE — Uirá (sem venda)";
const ACTIVITY = "EXPERIÊNCIA TESTE — Remarcação";
const SOURCE = /^[A-Za-z0-9_-]{12,100}$/;
const REQUEST_ID = /^[A-Za-z0-9_-]{8,100}$/;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const fixtureIds = (source: string) => {
  const suffix = hash(source).slice(0, 20);
  return { reservation: `qa-reschedule-${suffix}`, package: `qa-experience-${suffix}`, combo: `qa-combo-${suffix}` };
};
const database = (deps: ReservationRescheduleTestDependencies) => {
  const db = deps.db === undefined ? obterFirestoreAdmin() : deps.db;
  if (!db) throw new Error("RESCHEDULING_STORAGE_UNAVAILABLE");
  return db;
};
const text = (value: unknown, max = 200) => typeof value === "string" ? value.slice(0, max) : "";
const integer = (value: unknown) => Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0;
const iso = (value: any): string | null => {
  const milliseconds = value?.toMillis ? value.toMillis() : value instanceof Date ? value.getTime() : typeof value === "number" ? value : NaN;
  const parsed = new Date(milliseconds);
  return milliseconds > 0 && Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
};
const date = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const schedule = (value: any, packageId: string) => {
  if (!value || !date(value.data) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.horario)
    || !value.horariosPorPacote || Object.keys(value.horariosPorPacote).length !== 1
    || value.horariosPorPacote[packageId] !== value.horario) throw new Error("RESCHEDULE_TEST_SCOPE_INVALID");
  return { data: value.data, horario: value.horario as string, horariosPorPacote: { [packageId]: value.horario as string } };
};
const sameSchedule = (left: ReturnType<typeof schedule>, right: ReturnType<typeof schedule>) => left.data === right.data && left.horario === right.horario;
const dayAfter = (now: number, days: number) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const day = `${parts.find((part) => part.type === "year")!.value}-${parts.find((part) => part.type === "month")!.value}-${parts.find((part) => part.type === "day")!.value}`;
  const result = new Date(`${day}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
};
const assertFixture = (fixture: Data, sourceId: string) => {
  const ids = fixtureIds(sourceId);
  if (fixture.testMode !== true || fixture.testNamespace !== NAMESPACE || fixture.sandboxSourceId !== sourceId
    || fixture.telefone !== OWNER || fixture.nome !== NAME || fixture.atividade !== ACTIVITY || fixture.participantes !== 2
    || fixture.valor !== 0 || fixture.pacoteIds?.length !== 1 || fixture.pacoteIds[0] !== ids.package || fixture.comboId !== ids.combo) {
    throw new Error("RESCHEDULE_TEST_SCOPE_INVALID");
  }
  const before = schedule(fixture.sandboxOriginalSchedule, ids.package);
  const requested = schedule(fixture.sandboxRequestedSchedule, ids.package);
  const current = schedule(fixture, ids.package);
  if (before.horario !== "09:00" || requested.horario !== "11:00" || (!sameSchedule(current, before) && !sameSchedule(current, requested))) {
    throw new Error("RESCHEDULE_TEST_SCOPE_INVALID");
  }
  return { ids, before, requested, current };
};
const notice = (value: any) => !value || typeof value !== "object" ? null : {
  status: ["pending", "sent", "failed"].includes(value.status) ? value.status as string : null,
  attempts: integer(value.attempts), sentAt: iso(value.sentAt), nextAttemptAt: iso(value.nextAttemptAt),
  lastError: /^[A-Za-z0-9_:.-]{1,120}$/.test(text(value.lastError, 200)) ? text(value.lastError, 120) : value.lastError ? "NOTIFICATION_FAILED" : null,
  whatsappSentAt: iso(value.whatsappSentAt), messageId: text(value.messageId) || null,
};

/** Internal protected route only: no caller-provided phone, reservation or collection is accepted. */
export const criarTesteRemarcacaoUira = async (input: { confirmacao?: unknown; sourceId?: unknown }, deps: ReservationRescheduleTestDependencies = {}) => {
  if (input?.confirmacao !== "ENVIAR_TESTE_PARA_UIRA") throw new Error("RESCHEDULE_TEST_CONFIRMATION_REQUIRED");
  if (typeof input.sourceId !== "string" || !SOURCE.test(input.sourceId)) throw new Error("RESCHEDULE_TEST_SOURCE_INVALID");
  const sourceId = input.sourceId;
  const db = database(deps);
  const existing = await db.collection(RESCHEDULE_REQUESTS).where("sandboxSourceId", "==", sourceId).limit(2).get();
  if (existing.size > 1) throw new Error("RESCHEDULE_TEST_SOURCE_AMBIGUOUS");
  if (existing.size === 1) return consultarTesteRemarcacaoUira(existing.docs[0].id, { ...deps, db });

  const now = (deps.now || Date.now)();
  const ids = fixtureIds(sourceId);
  const before = { data: dayAfter(now, 7), horario: "09:00", horariosPorPacote: { [ids.package]: "09:00" } };
  const requested = { data: dayAfter(now, 8), horario: "11:00", horariosPorPacote: { [ids.package]: "11:00" } };
  const fixtureRef = db.collection(RESCHEDULE_TEST_COLLECTIONS.reservas).doc(ids.reservation);
  const fixture = await db.runTransaction(async (transaction) => {
    const refs = [fixtureRef, db.collection(RESCHEDULE_TEST_COLLECTIONS.pacotes).doc(ids.package),
      db.collection(RESCHEDULE_TEST_COLLECTIONS.combos).doc(ids.combo),
      db.collection(RESCHEDULE_TEST_COLLECTIONS.disponibilidade).doc(requested.data)];
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
    if (snapshots[0].exists) {
      const current = snapshots[0].data()!;
      assertFixture(current, sourceId);
      return current;
    }
    const value = {
      ...before, nome: NAME, telefone: OWNER, atividade: ACTIVITY, pacoteIds: [ids.package], comboId: ids.combo,
      participantes: 2, adultos: 2, participantesPorTipo: { adulto: 2 }, valor: 0, status: "pago", confirmada: true,
      formaPagamento: "TESTE_SEM_COBRANCA", naoConsomeDisponibilidade: false,
      testMode: true, testNamespace: NAMESPACE, sandboxSourceId: sourceId,
      sandboxOriginalSchedule: before, sandboxRequestedSchedule: requested, createdAt: new Date(now),
    };
    transaction.set(fixtureRef, value);
    if (!snapshots[1].exists) transaction.set(refs[1], { nome: ACTIVITY, ativo: true, modoHorario: "lista", horarios: ["09:00", "11:00"], limite: 2, dias: [0, 1, 2, 3, 4, 5, 6] });
    if (!snapshots[2].exists) transaction.set(refs[2], { nome: "COMBO TESTE — sem venda", ativo: true, pacoteIds: [ids.package] });
    if (!snapshots[3].exists) transaction.set(refs[3], { fechado: false, horarios: {}, vagasExtras: {} });
    return value;
  });
  const verified = assertFixture(fixture, sourceId);
  const workflowDeps: ReservationRescheduleTestDependencies & { testSourceId: string } = { ...deps, db, testSourceId: sourceId };
  const result = await solicitarRemarcacaoReserva({ canal: "whatsapp", telefone: OWNER, sessionId: `whatsapp_${OWNER}`,
    codigo: ids.reservation, novaData: verified.requested.data, novoHorario: verified.requested.horario,
    horariosPorPacote: verified.requested.horariosPorPacote, mensagemCliente: "TESTE AUTORIZADO: quero remarcar esta reserva de teste." }, workflowDeps);
  if (!("solicitacaoId" in result) || typeof result.solicitacaoId !== "string" || !result.solicitacaoId) throw new Error("RESCHEDULE_TEST_REQUEST_NOT_CREATED");
  return consultarTesteRemarcacaoUira(result.solicitacaoId, { ...deps, db });
};

/** Returns allowlisted diagnostics only for a verifiable isolated test request. */
export const consultarTesteRemarcacaoUira = async (id: string, deps: ReservationRescheduleTestDependencies = {}) => {
  if (typeof id !== "string" || !REQUEST_ID.test(id)) throw new Error("RESCHEDULE_TEST_REQUEST_ID_INVALID");
  const db = database(deps);
  const snapshot = await db.collection(RESCHEDULE_REQUESTS).doc(id).get();
  if (!snapshot.exists) throw new Error("RESCHEDULE_TEST_NOT_FOUND");
  const request = snapshot.data()!;
  const sourceId = request.sandboxSourceId;
  const states = ["awaiting_owner", "approved", "rejected", "unavailable", "expired", "failed", "superseded"];
  if (request.testMode !== true || request.testNamespace !== NAMESPACE || typeof sourceId !== "string" || !SOURCE.test(sourceId)
    || request.reservaId !== fixtureIds(sourceId).reservation || request.customerPhone !== OWNER || request.customerName !== NAME
    || request.activity !== ACTIVITY || request.participants !== 2 || !states.includes(request.status) || !/^PR[A-F0-9]{8}$/.test(request.code)
    || (request.id && request.id !== id)) throw new Error("RESCHEDULE_TEST_SCOPE_INVALID");
  const fixtureSnapshot = await db.collection(RESCHEDULE_TEST_COLLECTIONS.reservas).doc(request.reservaId).get();
  if (!fixtureSnapshot.exists) throw new Error("RESCHEDULE_TEST_FIXTURE_NOT_FOUND");
  const fixture = fixtureSnapshot.data()!;
  const verified = assertFixture(fixture, sourceId);
  if (!sameSchedule(schedule(request.antes, verified.ids.package), verified.before)
    || !sameSchedule(schedule(request.depois, verified.ids.package), verified.requested)
    || !sameSchedule(schedule(request.target, verified.ids.package), verified.requested)) throw new Error("RESCHEDULE_TEST_SCOPE_INVALID");
  const decisionSource = text(request.decisionSourceMessageId, 200);
  const receiptId = decisionSource ? hash(`${OWNER}\0${decisionSource}`) : "";
  const receiptSnapshot = receiptId ? await db.collection("crm_agent_reschedule_decisions").doc(receiptId).get() : null;
  const receipt = receiptSnapshot?.exists && receiptSnapshot.data()?.requestId === id && receiptSnapshot.data()?.sourceMessageId === decisionSource ? receiptSnapshot.data()! : null;
  return {
    testMode: true as const, testNamespace: NAMESPACE, sourceId, solicitacaoId: id, codigoSolicitacao: request.code as string, status: request.status as string,
    fixture: { id: request.reservaId as string, nome: NAME, telefone: OWNER, atividade: ACTIVITY, participantes: 2,
      antes: verified.before, atual: verified.current, solicitado: verified.requested },
    ownerNotice: notice(request.ownerNotice), clientNotice: notice(request.clientNotice), ownerMessageId: text(request.ownerMessageId) || null,
    decidedBy: request.decidedBy === OWNER ? OWNER : null, decidedAt: iso(request.decidedAt), decisionSourceMessageId: decisionSource || null,
    receipt: receipt ? { id: receiptId, requestId: id, createdAt: iso(receipt.createdAt), correlacionado: true } : null,
  };
};
