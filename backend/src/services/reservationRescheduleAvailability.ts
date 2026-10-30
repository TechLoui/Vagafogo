import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { obterFirestoreAdmin } from "./firebaseAdmin";
import { reservaContaParaOcupacao, reservaEstaConfirmada } from "./reservaStatus";

type RecordData = Record<string, any>;
export type RescheduleTarget = { data: string; horario?: string; horariosPorPacote?: Record<string, string> };
export type RescheduleSchedule = { data: string; horario: string | null; horariosPorPacote: Record<string, string> };
export type ReschedulePackageAvailability = {
  id: string;
  nome: string;
  modoHorario: string;
  horario: string | null;
  solicitadas: number;
  capacidade: number | null;
  ocupadas: number;
  vagasRestantes: number | null;
  vagasAposRemarcacao: number | null;
};
export type RescheduleAvailability = {
  reservaId: string;
  disponivel: boolean;
  status: "disponivel" | "indisponivel" | "exige_atendimento";
  motivos: string[];
  antes: RescheduleSchedule;
  depois: RescheduleSchedule;
  fingerprint: string;
  nome: string;
  telefone: string;
  atividade: string;
  participantes: number;
  pacotes: ReschedulePackageAvailability[];
};
export type RescheduleCollections = { reservas: string; pacotes: string; combos: string; disponibilidade: string };
export type RescheduleAvailabilityDependencies = {
  db?: FirebaseFirestore.Firestore | null;
  transaction?: FirebaseFirestore.Transaction;
  now?: () => number;
  /** Trusted caller configuration; never populate these names from chat/tool input. */
  collections?: RescheduleCollections;
};

const DEFAULT_COLLECTIONS: RescheduleCollections = {
  reservas: "reservas", pacotes: "pacotes", combos: "combos", disponibilidade: "disponibilidade",
};

const text = (value: unknown) => String(value ?? "").trim();
const plain = (value: unknown) => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const record = (value: unknown): RecordData => value && typeof value === "object" && !Array.isArray(value) ? value as RecordData : {};
const count = (value: unknown) => Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
const sumMap = (value: unknown) => Object.values(record(value)).reduce<number>((total, item) => total + count(item), 0);
const ids = (value: unknown): string[] => Array.isArray(value) ? [...new Set(value.map(text).filter(Boolean))] : [];
const validId = (value: string) => value.length > 0 && value.length <= 180 && value !== "." && value !== ".." && !/[\/\\\u0000-\u001f]/.test(value);
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const time = (value: unknown) => {
  const match = /^(\d{1,2})(?::(\d{2})|h(?:(\d{2}))?)?$/.exec(text(value));
  if (!match || Number(match[1]) > 23 || Number(match[2] ?? match[3] ?? 0) > 59) return "";
  return `${match[1].padStart(2, "0")}:${String(match[2] ?? match[3] ?? "00").padStart(2, "0")}`;
};
const timeMap = (value: unknown) => Object.fromEntries(Object.entries(record(value))
  .filter(([id]) => validId(id)).map(([id, hour]) => [id, time(hour)]).filter(([, hour]) => Boolean(hour)));
const minutes = (hour: string) => Number(hour.slice(0, 2)) * 60 + Number(hour.slice(3, 5));
const localClock = (now: number) => {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  return { date, minutes: Number(parts.find((part) => part.type === "hour")?.value || 0) * 60 + Number(parts.find((part) => part.type === "minute")?.value || 0) };
};
const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, stable(item)]));
  return value === undefined ? null : value;
};
const fingerprint = (reservation: RecordData) => {
  const keys = ["data", "Data", "horario", "Horario", "horariosPorPacote", "pacoteIds", "pacoteId", "comboId", "atividade", "Atividade",
    "participantes", "Participantes", "participantesPorTipo", "gruposParticipacao", "adultos", "bariatrica", "criancas", "naoPagante", "naoPagantes",
    "valor", "Valor", "cotacao", "status", "Status", "confirmada", "naoConsomeDisponibilidade", "chegou", "asaasPaymentId", "pagamentoId", "formaPagamento", "telefone", "Telefone"];
  const identity = {
    cpf: text(reservation.cpf ?? reservation.CPF).replace(/\D/g, ""),
    nome: plain(reservation.nome ?? reservation.Nome).replace(/\s+/g, " "),
  };
  return createHash("sha256").update(JSON.stringify(stable({ ...Object.fromEntries(keys.filter((key) => own(reservation, key)).map((key) => [key, reservation[key]])), identity }))).digest("hex");
};
const groupCount = (group: RecordData) => Math.max(count(group.participantes), sumMap(group.participantesPorTipo));
const totalParticipants = (reservation: RecordData) => Math.max(
  count(reservation.participantes ?? reservation.Participantes), sumMap(reservation.participantesPorTipo),
  count(reservation.adultos) + count(reservation.bariatrica) + count(reservation.criancas) + count(reservation.naoPagante ?? reservation.naoPagantes),
  Array.isArray(reservation.gruposParticipacao) ? reservation.gruposParticipacao.reduce((total: number, group: RecordData) => total + groupCount(record(group)), 0) : 0,
);

const packageIds = (reservation: RecordData, packages: Map<string, RecordData>, combos: Map<string, RecordData>) => {
  const selected = new Set([
    ...ids(reservation.pacoteIds), ...ids(reservation.pacoteId ? [reservation.pacoteId] : []),
    ...(Array.isArray(reservation.gruposParticipacao) ? reservation.gruposParticipacao.flatMap((group: RecordData) => ids(group?.pacoteIds)) : []),
  ]);
  if (!selected.size && reservation.comboId) ids(combos.get(text(reservation.comboId))?.pacoteIds).forEach((id) => selected.add(id));
  if (!selected.size) {
    const activity = plain(reservation.atividade ?? reservation.Atividade);
    for (const [id, pack] of packages) if (plain(pack.nome) && activity.includes(plain(pack.nome))) selected.add(id);
  }
  return [...selected];
};
const participantsForPackage = (reservation: RecordData, packageId: string, strictGroups: boolean) => {
  const groups = Array.isArray(reservation.gruposParticipacao) ? reservation.gruposParticipacao : [];
  if (groups.length) {
    const matching = groups.filter((group: RecordData) => ids(group?.pacoteIds).includes(packageId));
    if (matching.length) return matching.reduce((total: number, group: RecordData) => total + groupCount(record(group)), 0);
    if (strictGroups) return 0;
  }
  return totalParticipants(reservation);
};

const normalizedTarget = (target: RescheduleTarget): RescheduleTarget => {
  if (!target || !validDate(target.data)) throw new Error("RESCHEDULE_TARGET_DATE_INVALID");
  if (target.horario !== undefined && !time(target.horario)) throw new Error("RESCHEDULE_TARGET_TIME_INVALID");
  const rawTimes = target.horariosPorPacote;
  if (rawTimes !== undefined && (!rawTimes || typeof rawTimes !== "object" || Array.isArray(rawTimes)
    || Object.entries(rawTimes).some(([id, hour]) => !validId(id) || !time(hour)))) throw new Error("RESCHEDULE_TARGET_TIMES_INVALID");
  return { data: target.data, ...(target.horario !== undefined ? { horario: time(target.horario) } : {}),
    ...(rawTimes !== undefined ? { horariosPorPacote: timeMap(rawTimes) } : {}) };
};

const loadAvailability = async (reservaId: string, rawTarget: RescheduleTarget, dependencies: RescheduleAvailabilityDependencies) => {
  if (!validId(reservaId)) throw new Error("RESCHEDULE_RESERVATION_ID_INVALID");
  const target = normalizedTarget(rawTarget);
  const collections = dependencies.collections ?? DEFAULT_COLLECTIONS;
  if (Object.keys(DEFAULT_COLLECTIONS).some((key) => typeof collections[key as keyof RescheduleCollections] !== "string"
    || !validId(collections[key as keyof RescheduleCollections]))) throw new Error("RESCHEDULE_COLLECTIONS_INVALID");
  const db = dependencies.db === undefined ? obterFirestoreAdmin() : dependencies.db;
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const tx = dependencies.transaction;
  const readDoc = (reference: FirebaseFirestore.DocumentReference) => tx ? tx.get(reference) : reference.get();
  const readQuery = (query: FirebaseFirestore.Query) => tx ? tx.get(query) : query.get();
  const reservationRef = db.collection(collections.reservas).doc(reservaId);
  const original = await readDoc(reservationRef);
  if (!original.exists) throw new Error("RESCHEDULE_RESERVATION_NOT_FOUND");
  const reservation = original.data()!;
  const before: RescheduleSchedule = {
    data: text(reservation.data ?? reservation.Data),
    horario: time(reservation.horario ?? reservation.Horario) || text(reservation.horario ?? reservation.Horario) || null,
    horariosPorPacote: timeMap(reservation.horariosPorPacote),
  };
  const after: RescheduleSchedule = { data: target.data, horario: target.horario ?? before.horario, horariosPorPacote: { ...before.horariosPorPacote, ...target.horariosPorPacote } };
  const result: RescheduleAvailability = {
    reservaId, disponivel: false, status: "exige_atendimento", motivos: [], antes: before, depois: after,
    fingerprint: fingerprint(reservation), nome: text(reservation.nome ?? reservation.Nome), telefone: text(reservation.telefone ?? reservation.Telefone),
    atividade: text(reservation.atividade ?? reservation.Atividade), participantes: totalParticipants(reservation), pacotes: [],
  };
  const statusSnapshot = { ...reservation, status: reservation.status ?? reservation.Status };
  if (!reservaEstaConfirmada(statusSnapshot)) result.motivos.push("RESERVA_NAO_CONFIRMADA");
  if (reservation.chegou === true) result.motivos.push("RESERVA_JA_UTILIZADA");
  if (reservation.naoConsomeDisponibilidade === true) result.motivos.push("RESERVA_EXCECAO_CAPACIDADE");
  if (!validDate(before.data) || (own(reservation, "data") && own(reservation, "Data") && reservation.data !== reservation.Data)) result.motivos.push("RESERVA_DATA_INCONSISTENTE");
  if (result.participantes <= 0) result.motivos.push("RESERVA_PARTICIPANTES_INVALIDOS");
  if (result.motivos.length) return { result, reservation, reservationRef, db, dayRef: db.collection(collections.disponibilidade).doc(target.data) };

  const dayRef = db.collection(collections.disponibilidade).doc(target.data);
  const [catalogSnapshot, comboSnapshot, daySnapshot, currentSnapshot, legacySnapshot] = await Promise.all([
    readQuery(db.collection(collections.pacotes)), readQuery(db.collection(collections.combos)), readDoc(dayRef),
    readQuery(db.collection(collections.reservas).where("data", "==", target.data)),
    readQuery(db.collection(collections.reservas).where("Data", "==", target.data)),
  ]);
  const packages = new Map(catalogSnapshot.docs.map((document) => [document.id, document.data()]));
  const combos = new Map(comboSnapshot.docs.map((document) => [document.id, document.data()]));
  const selectedIds = packageIds(reservation, packages, combos);
  if (!selectedIds.length || selectedIds.some((id) => !packages.has(id))) result.motivos.push("RESERVA_OFERTA_NAO_IDENTIFICADA");
  if (Object.keys(target.horariosPorPacote || {}).some((id) => !selectedIds.includes(id))) result.motivos.push("HORARIO_DE_PACOTE_NAO_RESERVADO");
  const scheduled = selectedIds.filter((id) => packages.get(id)?.modoHorario !== "intervalo");
  if (target.horario && scheduled.length > 1 && !scheduled.every((id) => target.horariosPorPacote?.[id])) result.motivos.push("HORARIOS_POR_PACOTE_OBRIGATORIOS");
  const primary = scheduled.find((id) => time(before.horario) === before.horariosPorPacote[id]) || scheduled[0] || selectedIds[0];
  if (target.horario && target.horariosPorPacote?.[primary] && target.horario !== target.horariosPorPacote[primary]) result.motivos.push("HORARIO_PRINCIPAL_INCONSISTENTE");
  if (result.motivos.length) return { result, reservation, reservationRef, db, dayRef };

  const day = daySnapshot.data() || {};
  const clock = localClock((dependencies.now || Date.now)());
  const weekday = new Date(`${target.data}T12:00:00Z`).getUTCDay();
  const others = new Map([...currentSnapshot.docs, ...legacySnapshot.docs].filter((document) => document.id !== reservaId).map((document) => [document.id, document.data()]));
  const reasons: string[] = [];
  if (target.data < clock.date) reasons.push("DATA_PASSADA");
  if (day.fechado === true) reasons.push("DIA_FECHADO");
  for (const id of selectedIds) {
    const pack = packages.get(id)!;
    const interval = pack.modoHorario === "intervalo";
    const requested = target.horariosPorPacote?.[id] || (target.horario && (!interval || scheduled.length === 0) ? target.horario : "");
    const selectedTime = requested || after.horariosPorPacote[id] || time(before.horario);
    const listed = Array.isArray(pack.horarios) ? pack.horarios.map(time).filter(Boolean) : [];
    const required = participantsForPackage(reservation, id, true);
    if (required <= 0) { result.motivos.push(`${id}:PARTICIPANTES_NAO_IDENTIFICADOS`); continue; }
    if (pack.ativo === false) reasons.push(`${id}:PACOTE_INATIVO`);
    if (Array.isArray(pack.dias) && pack.dias.length && !pack.dias.map(Number).includes(weekday)) reasons.push(`${id}:DIA_DA_SEMANA_INDISPONIVEL`);
    if (Array.isArray(pack.datasBloqueadas) && pack.datasBloqueadas.includes(target.data)) reasons.push(`${id}:DATA_BLOQUEADA`);
    if (!interval) {
      if (!selectedTime) reasons.push(`${id}:HORARIO_OBRIGATORIO`);
      else if (!listed.includes(selectedTime)) reasons.push(`${id}:HORARIO_FORA_DA_GRADE`);
      if (selectedTime && record(day.horarios)[`${target.data}-${id}-${selectedTime}`] === false) reasons.push(`${id}:HORARIO_BLOQUEADO`);
      if (target.data === clock.date && selectedTime && minutes(selectedTime) <= clock.minutes) reasons.push(`${id}:HORARIO_PASSADO`);
    } else {
      const start = time(pack.horarioInicio);
      const end = time(pack.horarioFim);
      if (!start || !end || minutes(start) > minutes(end)) result.motivos.push(`${id}:FAIXA_DE_HORARIO_INVALIDA`);
      else {
        const cutoff = Math.min(minutes(end), 15 * 60);
        if (selectedTime && (minutes(selectedTime) < minutes(start) || minutes(selectedTime) > cutoff)) reasons.push(`${id}:HORARIO_FORA_DA_FAIXA`);
        if (target.data === clock.date && (clock.minutes >= cutoff || (requested && selectedTime && minutes(selectedTime) <= clock.minutes))) reasons.push(`${id}:HORARIO_PASSADO`);
      }
    }
    if (selectedTime) after.horariosPorPacote[id] = selectedTime;
    const limit = Number(pack.limite ?? 0);
    if (!Number.isFinite(limit) || limit < 0 || !Number.isInteger(limit)) result.motivos.push(`${id}:CAPACIDADE_INVALIDA`);
    let occupied = 0;
    for (const other of others.values()) {
      if (!reservaContaParaOcupacao({ ...other, status: other.status ?? other.Status })) continue;
      if (!packageIds(other, packages, combos).includes(id)) continue;
      const occupiedTime = time(record(other.horariosPorPacote)[id] ?? other.horario ?? other.Horario);
      if (!interval && occupiedTime !== selectedTime) continue;
      occupied += participantsForPackage(other, id, false);
    }
    const extras = record(day.vagasExtras);
    const additional = count(extras[`geral::${target.data}`]) + count(extras[`${target.data}-${id}`])
      + (interval ? 0 : count(extras[`geral::${target.data}::${selectedTime}`]) + count(extras[`${target.data}-${id}-${selectedTime}`]));
    const capacity = limit > 0 ? limit + additional : null;
    const remaining = capacity === null ? null : Math.max(0, capacity - occupied);
    if (remaining !== null && required > remaining) reasons.push(`${id}:VAGAS_INSUFICIENTES`);
    result.pacotes.push({ id, nome: text(pack.nome), modoHorario: interval ? "intervalo" : "lista", horario: selectedTime || null,
      solicitadas: required, capacidade: capacity, ocupadas: occupied, vagasRestantes: remaining,
      vagasAposRemarcacao: remaining === null ? null : Math.max(0, remaining - required) });
  }
  if (target.horario === undefined && target.horariosPorPacote && scheduled.length) {
    after.horario = after.horariosPorPacote[primary] || before.horario;
  }
  result.status = result.motivos.length ? "exige_atendimento" : reasons.length ? "indisponivel" : "disponivel";
  result.motivos.push(...reasons);
  result.disponivel = result.status === "disponivel";
  return { result, reservation, reservationRef, db, dayRef };
};

export const consultarRemarcacaoDisponivel = async (reservaId: string, target: RescheduleTarget, dependencies: RescheduleAvailabilityDependencies = {}): Promise<RescheduleAvailability> =>
  (await loadAvailability(reservaId, target, dependencies)).result;

const reservationPatch = (reservation: RecordData, schedule: RescheduleSchedule) => {
  const patch: RecordData = { data: schedule.data, horario: schedule.horario, horariosPorPacote: schedule.horariosPorPacote };
  if (own(reservation, "Data")) patch.Data = schedule.data;
  if (own(reservation, "Horario")) patch.Horario = schedule.horario;
  if (reservation.cotacao && typeof reservation.cotacao === "object" && !Array.isArray(reservation.cotacao)) {
    const quote = { ...reservation.cotacao };
    if (own(quote, "data")) quote.data = schedule.data;
    if (own(quote, "horario")) quote.horario = schedule.horario;
    if (own(quote, "horariosPorPacote")) quote.horariosPorPacote = schedule.horariosPorPacote;
    if (Array.isArray(quote.pacotes)) quote.pacotes = quote.pacotes.map((pack: RecordData) => pack && typeof pack === "object" && own(pack, "horario") && schedule.horariosPorPacote[pack.id]
      ? { ...pack, horario: schedule.horariosPorPacote[pack.id] } : pack);
    patch.cotacao = quote;
  }
  return patch;
};

/** Caller must verify the owner's authorization. When supplying a transaction,
 * read the approval request first, call this function, then write request state;
 * no more reads are permitted after this function queues the reservation writes. */
export const aplicarRemarcacaoAutorizada = async (reservaId: string, target: RescheduleTarget,
  dependencies: RescheduleAvailabilityDependencies & { expectedFingerprint: string }): Promise<RescheduleAvailability & { aplicada: boolean }> => {
  const db = dependencies.db === undefined ? obterFirestoreAdmin() : dependencies.db;
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const apply = async (transaction: FirebaseFirestore.Transaction) => {
    const loaded = await loadAvailability(reservaId, target, { ...dependencies, db, transaction });
    const result = loaded.result;
    if (!dependencies.expectedFingerprint || result.fingerprint !== dependencies.expectedFingerprint) {
      return { ...result, disponivel: false, status: "exige_atendimento" as const, motivos: ["RESERVA_ALTERADA_DESDE_A_SOLICITACAO"], aplicada: false };
    }
    if (!result.disponivel) return { ...result, aplicada: false };
    const changed = JSON.stringify(stable(result.antes)) !== JSON.stringify(stable(result.depois));
    if (changed) {
      // Every reschedule touching this date reads and increments the same fence.
      // A concurrent approval must retry and see the first moved reservation.
      transaction.set(loaded.dayRef, { remarcacoesRevision: FieldValue.increment(1) }, { merge: true });
      transaction.update(loaded.reservationRef, reservationPatch(loaded.reservation, result.depois));
    }
    return { ...result, aplicada: true };
  };
  return dependencies.transaction ? apply(dependencies.transaction) : db.runTransaction(apply);
};
