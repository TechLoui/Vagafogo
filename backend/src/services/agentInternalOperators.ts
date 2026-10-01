import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { obterFirestoreAdmin } from "./firebaseAdmin";
import {
  normalizarStatusReserva,
  reservaContaParaOcupacao,
  reservaEstaConfirmada,
} from "./reservaStatus";

const OPERATORS_COLLECTION = "crm_agente_operadores";
const AUDIT_COLLECTION = "crm_agente_operacoes_internas";
const CLIENT_STATE_COLLECTIONS = [
  "crm_leads_agente",
  "crm_leads_agente_rascunhos",
  "crm_agente_reserva_rascunhos",
] as const;
const CLIENT_STATE_CLEANUP_VERSION = 2;

export type AgentInternalPermission =
  | "consultarReservas"
  | "consultarDisponibilidade"
  | "alterarDisponibilidade"
  | "verDadosPessoais"
  | "verFinanceiro";

export type AgentInternalPermissions = Record<AgentInternalPermission, boolean>;

const DEFAULT_PERMISSIONS: AgentInternalPermissions = {
  consultarReservas: true,
  consultarDisponibilidade: true,
  alterarDisponibilidade: false,
  verDadosPessoais: false,
  verFinanceiro: false,
};

const clean = (value: unknown, maximum: number) => String(value ?? "").trim().slice(0, maximum);
const normalizeText = (value: unknown) => clean(value, 300)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();
const normalizePhone = (value: unknown) => {
  let digits = String(value ?? "").replace(/\D/g, "").slice(0, 15);
  if (!digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`;
  if (!/^55\d{10,11}$/.test(digits)) throw new Error("AGENT_INTERNAL_PHONE_INVALID");
  return digits;
};

// O WhatsApp ainda pode entregar celulares brasileiros pelo JID historico sem
// o nono digito, mesmo que o numero tenha sido cadastrado no painel com ele.
// As duas formas representam a mesma pessoa apenas para identificacao interna;
// o numero original da sessao continua sendo usado para responder no WhatsApp.
export const operatorPhoneVariants = (value: unknown) => {
  const phone = normalizePhone(value);
  const variants = [phone];
  if (phone.length === 13 && phone[4] === "9") {
    variants.push(`${phone.slice(0, 4)}${phone.slice(5)}`);
  } else if (phone.length === 12 && /^[6-9]$/.test(phone[4] ?? "")) {
    variants.push(`${phone.slice(0, 4)}9${phone.slice(4)}`);
  }
  return Array.from(new Set(variants));
};
const normalizeDate = (value: unknown) => {
  const date = clean(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00-03:00`))) {
    throw new Error("AGENT_INTERNAL_DATE_INVALID");
  }
  return date;
};
const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const numberValue = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const nonNegativeInteger = (value: unknown, maximum = 10000) => Math.min(maximum, Math.max(0, Math.trunc(numberValue(value))));
const permissionsFrom = (value: unknown): AgentInternalPermissions => {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(
    Object.keys(DEFAULT_PERMISSIONS).map((key) => [key, raw[key] === true]),
  ) as AgentInternalPermissions;
};
const operatorId = (phone: string) => createHash("sha256").update(`agente-operador:v1\0${phone}`).digest("hex");

const serializeTimestamp = (value: unknown) => {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return undefined;
};

const serializeOperator = (id: string, data: FirebaseFirestore.DocumentData) => ({
  id,
  nome: clean(data.nome, 120),
  telefone: clean(data.telefone, 15),
  ativo: data.ativo !== false,
  permissoes: permissionsFrom(data.permissoes),
  criadoEm: serializeTimestamp(data.criadoEm),
  atualizadoEm: serializeTimestamp(data.atualizadoEm),
  atualizadoPor: clean(data.atualizadoPor, 180),
});

const firestore = () => {
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  return db;
};

const clearClientStateForOperator = async (db: FirebaseFirestore.Firestore, phone: string) => {
  const phoneVariants = operatorPhoneVariants(phone);
  const snapshots = await Promise.all(
    CLIENT_STATE_COLLECTIONS.flatMap((collection) => phoneVariants.map(
      (phoneVariant) => db.collection(collection).where("telefone", "==", phoneVariant).get(),
    )),
  );
  const references = Array.from(new Map(
    snapshots.flatMap((snapshot) => snapshot.docs.map((document) => [document.ref.path, document.ref] as const)),
  ).values());
  for (let offset = 0; offset < references.length; offset += 450) {
    const batch = db.batch();
    references.slice(offset, offset + 450).forEach((reference) => batch.delete(reference));
    await batch.commit();
  }
  return references.length;
};

export const listarOperadoresInternosAgente = async () => {
  const snapshot = await firestore().collection(OPERATORS_COLLECTION).get();
  return snapshot.docs
    .map((document) => serializeOperator(document.id, document.data()))
    .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"));
};

export const listarAuditoriaOperadoresAgente = async (limitValue: unknown = 30) => {
  const limit = Math.max(1, Math.min(100, nonNegativeInteger(limitValue, 100) || 30));
  const snapshot = await firestore().collection(AUDIT_COLLECTION)
    .orderBy("criadoEm", "desc")
    .limit(limit)
    .get();
  return snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      operadorNome: clean(data.operadorNome, 120) || "Operador",
      operadorTelefone: clean(data.operadorTelefone, 15),
      acao: clean(data.acao, 50),
      alvo: data.alvo && typeof data.alvo === "object" ? data.alvo : {},
      resumo: clean(data.resumo, 500),
      criadoEm: serializeTimestamp(data.criadoEm),
    };
  });
};

export const salvarOperadorInternoAgente = async (
  input: Record<string, unknown>,
  updatedBy: string,
) => {
  const db = firestore();
  const phone = normalizePhone(input.telefone);
  const name = clean(input.nome, 120);
  if (!name) throw new Error("AGENT_INTERNAL_NAME_REQUIRED");
  const id = operatorId(phone);
  const ref = db.collection(OPERATORS_COLLECTION).doc(id);
  const existing = await ref.get();
  await ref.set({
    nome: name,
    telefone: phone,
    ativo: input.ativo !== false,
    permissoes: permissionsFrom(input.permissoes ?? DEFAULT_PERMISSIONS),
    ...(existing.exists ? {} : { criadoEm: FieldValue.serverTimestamp() }),
    atualizadoEm: FieldValue.serverTimestamp(),
    atualizadoPor: clean(updatedBy, 180),
  }, { merge: true });
  // Ao promover um numero para acesso interno, qualquer rascunho ou lead de
  // cliente desse telefone deixa de existir. Reservas historicas nao sao
  // apagadas; somente o estado comercial criado pelo agente.
  await clearClientStateForOperator(db, phone);
  await ref.set({
    limpezaIdentidadeVersao: CLIENT_STATE_CLEANUP_VERSION,
    limpezaIdentidadeEm: FieldValue.serverTimestamp(),
  }, { merge: true });
  const saved = await ref.get();
  return serializeOperator(saved.id, saved.data() ?? {});
};

export const atualizarOperadorInternoAgente = async (
  id: string,
  input: Record<string, unknown>,
  updatedBy: string,
) => {
  const db = firestore();
  const ref = db.collection(OPERATORS_COLLECTION).doc(clean(id, 100));
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("AGENT_INTERNAL_OPERATOR_NOT_FOUND");
  const current = snapshot.data() ?? {};
  await ref.update({
    ...(Object.prototype.hasOwnProperty.call(input, "nome") ? { nome: clean(input.nome, 120) } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "ativo") ? { ativo: input.ativo === true } : {}),
    ...(Object.prototype.hasOwnProperty.call(input, "permissoes")
      ? { permissoes: permissionsFrom(input.permissoes) }
      : {}),
    atualizadoEm: FieldValue.serverTimestamp(),
    atualizadoPor: clean(updatedBy, 180),
  });
  const saved = await ref.get();
  return serializeOperator(saved.id, { ...current, ...(saved.data() ?? {}) });
};

export const excluirOperadorInternoAgente = async (id: string) => {
  const db = firestore();
  const ref = db.collection(OPERATORS_COLLECTION).doc(clean(id, 100));
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("AGENT_INTERNAL_OPERATOR_NOT_FOUND");
  await ref.delete();
  return { excluido: true };
};

export const obterContextoOperadorInternoAgente = async (phoneValue: unknown) => {
  let phoneVariants: string[] = [];
  try { phoneVariants = operatorPhoneVariants(phoneValue); } catch { return { autorizado: false }; }
  const db = firestore();
  const snapshots = await Promise.all(
    phoneVariants.map((phone) => db.collection(OPERATORS_COLLECTION).doc(operatorId(phone)).get()),
  );
  const snapshot = snapshots.find((candidate) => candidate.exists && candidate.data()?.ativo !== false);
  if (!snapshot) return { autorizado: false };
  const snapshotData = snapshot.data() ?? {};
  const operator = serializeOperator(snapshot.id, snapshotData);
  if (snapshotData.limpezaIdentidadeVersao !== CLIENT_STATE_CLEANUP_VERSION) {
    await clearClientStateForOperator(db, operator.telefone);
    await snapshot.ref.set({
      limpezaIdentidadeVersao: CLIENT_STATE_CLEANUP_VERSION,
      limpezaIdentidadeEm: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  return {
    autorizado: true,
    operador: {
      id: operator.id,
      nome: operator.nome,
      telefone: operator.telefone,
      permissoes: operator.permissoes,
    },
  };
};

const requireOperator = async (phoneValue: unknown, permission: AgentInternalPermission) => {
  const context = await obterContextoOperadorInternoAgente(phoneValue);
  if (!context.autorizado || !context.operador) throw new Error("AGENT_INTERNAL_ACCESS_DENIED");
  if (!context.operador.permissoes[permission]) throw new Error("AGENT_INTERNAL_PERMISSION_DENIED");
  return context.operador;
};

const reservationParticipants = (data: FirebaseFirestore.DocumentData) => Math.max(
  nonNegativeInteger(data.participantes ?? data.Participantes),
  nonNegativeInteger(data.adultos ?? data.Adultos)
    + nonNegativeInteger(data.bariatrica)
    + nonNegativeInteger(data.criancas ?? data.Criancas)
    + nonNegativeInteger(data.naoPagante),
);

const reservationStatusGroup = (data: FirebaseFirestore.DocumentData) => {
  if (reservaEstaConfirmada(data)) return "confirmada";
  const status = normalizarStatusReserva(data.status ?? data.Status);
  if (status.includes("cancel") || status.includes("recus") || status.includes("refus")) return "cancelada";
  if (/aguard|pend|process|pre.?reserva|verificacao/.test(status)) return "pendente";
  return "outro";
};

const reservationsForDate = async (date: string) => {
  const db = firestore();
  const [lower, upper] = await Promise.all([
    db.collection("reservas").where("data", "==", date).get(),
    db.collection("reservas").where("Data", "==", date).get(),
  ]);
  const unique = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  [...lower.docs, ...upper.docs].forEach((document) => unique.set(document.id, document));
  return [...unique.values()];
};

export const consultarReservasOperadorAgente = async (input: Record<string, unknown>) => {
  const operator = await requireOperator(input.telefoneOperador, "consultarReservas");
  const date = normalizeDate(input.data);
  const documents = await reservationsForDate(date);
  const groups = { confirmadas: 0, pendentes: 0, canceladas: 0, outras: 0 };
  let participants = 0;
  let confirmedValue = 0;
  const details = documents.map((document) => {
    const data = document.data();
    const group = reservationStatusGroup(data);
    if (group === "confirmada") groups.confirmadas += 1;
    else if (group === "pendente") groups.pendentes += 1;
    else if (group === "cancelada") groups.canceladas += 1;
    else groups.outras += 1;
    const people = reservationParticipants(data);
    if (group === "confirmada") {
      participants += people;
      confirmedValue += numberValue(data.valor ?? data.Valor);
    }
    const item: Record<string, unknown> = {
      id: document.id,
      horario: clean(data.horario ?? data.Horario, 20) || "Sem horário",
      experiencia: clean(data.atividade ?? data.Atividade, 240) || "Não informada",
      participantes: people,
      status: group,
      origem: clean(data.origem, 40) || "não informada",
    };
    if (operator.permissoes.verDadosPessoais) {
      item.cliente = clean(data.nome ?? data.Nome, 160) || "Nome não informado";
      item.telefone = clean(data.telefone ?? data.Telefone, 30);
    }
    if (operator.permissoes.verFinanceiro) item.valor = numberValue(data.valor ?? data.Valor);
    return item;
  }).sort((left, right) => String(left.horario).localeCompare(String(right.horario)));
  return {
    data: date,
    total: documents.length,
    ...groups,
    participantesConfirmados: participants,
    ...(operator.permissoes.verFinanceiro ? { valorConfirmado: Math.round(confirmedValue * 100) / 100 } : {}),
    reservas: input.incluirDetalhes === false ? [] : details.slice(0, 100),
    detalhesLimitados: details.length > 100,
  };
};

const reservationPackageIds = (data: FirebaseFirestore.DocumentData) => new Set<string>([
  ...(Array.isArray(data.pacoteIds) ? data.pacoteIds.map(String) : []),
  ...(Array.isArray(data.gruposParticipacao)
    ? data.gruposParticipacao.flatMap((group: Record<string, unknown>) => Array.isArray(group.pacoteIds) ? group.pacoteIds.map(String) : [])
    : []),
]);

const participantsForPackage = (data: FirebaseFirestore.DocumentData, packageId: string) => {
  if (Array.isArray(data.gruposParticipacao)) {
    const count = data.gruposParticipacao.reduce((total: number, group: Record<string, unknown>) => {
      const ids = Array.isArray(group.pacoteIds) ? group.pacoteIds.map(String) : [];
      return ids.includes(packageId) ? total + nonNegativeInteger(group.participantes) : total;
    }, 0);
    if (count > 0) return count;
  }
  return reservationParticipants(data);
};

export const consultarDisponibilidadeOperadorAgente = async (input: Record<string, unknown>) => {
  await requireOperator(input.telefoneOperador, "consultarDisponibilidade");
  const db = firestore();
  const date = normalizeDate(input.data);
  const [packagesSnapshot, daySnapshot, reservationDocuments] = await Promise.all([
    db.collection("pacotes").get(),
    db.collection("disponibilidade").doc(date).get(),
    reservationsForDate(date),
  ]);
  const day = daySnapshot.exists ? daySnapshot.data() ?? {} : {};
  const weekday = new Date(`${date}T12:00:00-03:00`).getUTCDay();
  const reservations = reservationDocuments.map((document) => document.data()).filter(reservaContaParaOcupacao);
  const packages = packagesSnapshot.docs.map((document) => {
    const raw = document.data();
    const id = document.id;
    const name = clean(raw.nome, 160) || id;
    const mode = clean(raw.modoHorario, 30) || "lista";
    const baseCapacity = nonNegativeInteger(raw.limite);
    const blockedDate = Array.isArray(raw.datasBloqueadas) && raw.datasBloqueadas.map(String).includes(date);
    const unavailableWeekday = Array.isArray(raw.dias) && raw.dias.length > 0 && !raw.dias.map(Number).includes(weekday);
    const relevant = reservations.filter((reservation) => {
      const ids = reservationPackageIds(reservation);
      return ids.has(id) || normalizeText(reservation.atividade ?? reservation.Atividade) === normalizeText(name);
    });
    const dayExtra = nonNegativeInteger(day.vagasExtras?.[`geral::${date}`])
      + nonNegativeInteger(day.vagasExtras?.[`${date}-${id}`]);
    if (mode === "intervalo") {
      const occupied = relevant.reduce((total, reservation) => total + participantsForPackage(reservation, id), 0);
      const capacity = baseCapacity + dayExtra;
      return {
        id,
        nome: name,
        modoHorario: mode,
        horarioInicio: clean(raw.horarioInicio, 20),
        horarioFim: clean(raw.horarioFim, 20),
        aberto: raw.ativo !== false && day.fechado !== true && !blockedDate && !unavailableWeekday,
        capacidade: capacity || null,
        ocupadas: occupied,
        vagasRestantes: capacity > 0 ? Math.max(0, capacity - occupied) : null,
      };
    }
    const times = Array.isArray(raw.horarios) ? raw.horarios.map(String) : [];
    return {
      id,
      nome: name,
      modoHorario: mode,
      aberto: raw.ativo !== false && day.fechado !== true && !blockedDate && !unavailableWeekday,
      horarios: times.map((time) => {
        const occupied = relevant
          .filter((reservation) => clean(reservation.horariosPorPacote?.[id] ?? reservation.horario ?? reservation.Horario, 20) === time)
          .reduce((total, reservation) => total + participantsForPackage(reservation, id), 0);
        const extra = dayExtra
          + nonNegativeInteger(day.vagasExtras?.[`geral::${date}::${time}`])
          + nonNegativeInteger(day.vagasExtras?.[`${date}-${id}-${time}`]);
        const capacity = baseCapacity + extra;
        return {
          horario: time,
          aberto: day.horarios?.[`${date}-${id}-${time}`] !== false,
          capacidade: capacity || null,
          ocupadas: occupied,
          vagasRestantes: capacity > 0 ? Math.max(0, capacity - occupied) : null,
        };
      }),
    };
  }).filter((item) => item.nome);
  return { data: date, diaFechado: day.fechado === true, pacotes: packages };
};

type AvailabilityAction =
  | "fechar_dia"
  | "abrir_dia"
  | "fechar_pacote"
  | "abrir_pacote"
  | "fechar_horario"
  | "abrir_horario"
  | "definir_vagas_extras";

export const alterarDisponibilidadeOperadorAgente = async (input: Record<string, unknown>) => {
  const operator = await requireOperator(input.telefoneOperador, "alterarDisponibilidade");
  if (input.confirmado !== true) throw new Error("AGENT_INTERNAL_CONFIRMATION_REQUIRED");
  const simulation = input.simulacao === true;
  const db = firestore();
  const date = normalizeDate(input.data);
  if (date < todayKey()) throw new Error("AGENT_INTERNAL_PAST_DATE_NOT_ALLOWED");
  const action = clean(input.acao, 40) as AvailabilityAction;
  const allowed = new Set<AvailabilityAction>([
    "fechar_dia", "abrir_dia", "fechar_pacote", "abrir_pacote",
    "fechar_horario", "abrir_horario", "definir_vagas_extras",
  ]);
  if (!allowed.has(action)) throw new Error("AGENT_INTERNAL_ACTION_INVALID");
  const dayRef = db.collection("disponibilidade").doc(date);
  const beforeDaySnapshot = await dayRef.get();
  const beforeDay = beforeDaySnapshot.exists ? beforeDaySnapshot.data() ?? {} : {};
  const packageId = clean(input.pacoteId, 100);
  const time = clean(input.horario, 20);
  let summary = "";
  let target: Record<string, unknown> = { data: date };

  if (action === "fechar_dia" || action === "abrir_dia") {
    const closed = action === "fechar_dia";
    if (!simulation) {
      await dayRef.set({ data: date, fechado: closed ? true : FieldValue.delete() }, { merge: true });
    }
    summary = closed ? `Dia ${date} fechado para novas reservas.` : `Dia ${date} reaberto para reservas.`;
  } else {
    if (!packageId) throw new Error("AGENT_INTERNAL_PACKAGE_REQUIRED");
    const packageRef = db.collection("pacotes").doc(packageId);
    const packageSnapshot = await packageRef.get();
    if (!packageSnapshot.exists) throw new Error("AGENT_INTERNAL_PACKAGE_NOT_FOUND");
    const packageData = packageSnapshot.data() ?? {};
    const packageName = clean(packageData.nome, 160) || packageId;
    target = { data: date, pacoteId: packageId, pacote: packageName, ...(time ? { horario: time } : {}) };
    if (action === "fechar_pacote" || action === "abrir_pacote") {
      const close = action === "fechar_pacote";
      if (clean(packageData.modoHorario, 30) === "intervalo") {
        if (!simulation) {
          await packageRef.update({
            datasBloqueadas: close ? FieldValue.arrayUnion(date) : FieldValue.arrayRemove(date),
          });
        }
      } else {
        const times = Array.isArray(packageData.horarios) ? packageData.horarios.map(String) : [];
        const horarios = { ...(beforeDay.horarios ?? {}) } as Record<string, boolean>;
        times.forEach((item) => {
          const key = `${date}-${packageId}-${item}`;
          if (close) horarios[key] = false;
          else delete horarios[key];
        });
        if (!simulation) await dayRef.set({ data: date, horarios }, { merge: true });
      }
      summary = close
        ? `${packageName} fechado em ${date}.`
        : `${packageName} reaberto em ${date}.`;
    } else if (action === "fechar_horario" || action === "abrir_horario") {
      if (!time || !/^\d{1,2}:\d{2}$/.test(time)) throw new Error("AGENT_INTERNAL_TIME_REQUIRED");
      const validTimes = Array.isArray(packageData.horarios) ? packageData.horarios.map(String) : [];
      if (!validTimes.includes(time)) throw new Error("AGENT_INTERNAL_TIME_NOT_FOUND");
      const key = `${date}-${packageId}-${time}`;
      const horarios = { ...(beforeDay.horarios ?? {}) } as Record<string, boolean>;
      if (action === "fechar_horario") horarios[key] = false;
      else delete horarios[key];
      if (!simulation) await dayRef.set({ data: date, horarios }, { merge: true });
      summary = action === "fechar_horario"
        ? `${packageName} às ${time} fechado em ${date}.`
        : `${packageName} às ${time} reaberto em ${date}.`;
    } else {
      const quantity = nonNegativeInteger(input.quantidade, 500);
      const key = time ? `${date}-${packageId}-${time}` : `${date}-${packageId}`;
      const extras = { ...(beforeDay.vagasExtras ?? {}) } as Record<string, number>;
      if (quantity > 0) extras[key] = quantity;
      else delete extras[key];
      if (!simulation) await dayRef.set({ data: date, vagasExtras: extras }, { merge: true });
      summary = quantity > 0
        ? `${quantity} vaga(s) extra(s) definida(s) para ${packageName}${time ? ` às ${time}` : ""} em ${date}.`
        : `Vagas extras removidas de ${packageName}${time ? ` às ${time}` : ""} em ${date}.`;
    }
  }

  if (simulation) {
    return {
      alterado: false,
      simulado: true,
      acao: action,
      resumo: `Simulação segura: ${summary}`,
      alvo: target,
    };
  }

  const afterDaySnapshot = await dayRef.get();
  await db.collection(AUDIT_COLLECTION).add({
    operadorId: operator.id,
    operadorNome: operator.nome,
    operadorTelefone: operator.telefone,
    acao: action,
    alvo: target,
    antes: beforeDay,
    depois: afterDaySnapshot.exists ? afterDaySnapshot.data() ?? {} : {},
    resumo: summary,
    criadoEm: FieldValue.serverTimestamp(),
  });
  return { alterado: true, simulado: false, acao: action, resumo: summary, alvo: target };
};

