import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { obterFirestoreAdmin } from "./firebaseAdmin";
import { reservaContaParaOcupacao } from "./reservaStatus";

type AgentAvailabilityInput = {
  tipoOferta?: unknown;
  ofertaId?: unknown;
  pacoteId?: unknown;
  comboId?: unknown;
  data?: unknown;
  horario?: unknown;
  horariosPorPacote?: unknown;
  participantesPorTipo?: unknown;
  idadesPorTipo?: unknown;
  idadesCriancas?: unknown;
  idadesNaoPagantes?: unknown;
  adultos?: unknown;
  bariatrica?: unknown;
  criancas?: unknown;
  naoPagantes?: unknown;
  temPet?: unknown;
  confirmouCarteirinhaBariatrica?: unknown;
  perguntasPersonalizadas?: unknown;
  telefone?: unknown;
  campaignId?: unknown;
  recipientId?: unknown;
};

type AgentLeadInput = {
  sessionId?: unknown;
  telefone?: unknown;
  nome?: unknown;
  email?: unknown;
  etapa?: unknown;
  resultado?: unknown;
  motivo?: unknown;
  pacoteIds?: unknown;
  atividades?: unknown;
  dataDesejada?: unknown;
  horarioDesejado?: unknown;
  participantes?: unknown;
  valorEstimado?: unknown;
  formaPagamento?: unknown;
  reservaId?: unknown;
  pagamentoId?: unknown;
  marketingOptIn?: unknown;
  proximaAcao?: unknown;
  resumo?: unknown;
};

type CustomerType = {
  id: string;
  nome: string;
  descricao: string;
  perguntarIdade: boolean;
  idadeMinima?: number;
  idadeMaxima?: number;
};

type PackageRecord = { id: string; raw: FirebaseFirestore.DocumentData };
type ComboRecord = { id: string; raw: FirebaseFirestore.DocumentData };

const clean = (value: unknown, maximum: number) => String(value ?? "").trim().slice(0, maximum);
const normalizeText = (value: unknown) => clean(value, 300).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const canonicalLeadValue = (value: unknown) => normalizeText(value).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const canonicalLeadStage = (value: unknown) => {
  const stage = canonicalLeadValue(value);
  const exact = new Set([
    "contato_iniciado",
    "interesse_identificado",
    "cotacao",
    "dados_em_coleta",
    "aguardando_confirmacao",
    "pagamento_pendente",
    "concluida",
    "atendimento_humano",
    "encerrado_sem_reserva",
  ]);
  if (exact.has(stage)) return stage;
  if (/conclu|confirmad|reserva_realizada|pagamento_aprovado/.test(stage)) return "concluida";
  if (/humano|atendente|handoff/.test(stage)) return "atendimento_humano";
  if (/sem_reserva|nao_convert|desist|cancel|encerrad/.test(stage)) return "encerrado_sem_reserva";
  if (/pagamento|pix|cobranca/.test(stage)) return "pagamento_pendente";
  if (/aguardando_confirm|decisao|confirmacao/.test(stage)) return "aguardando_confirmacao";
  if (/dados|coleta|checklist|cadastro/.test(stage)) return "dados_em_coleta";
  if (/cotacao|orcamento|disponibilidade|valor/.test(stage)) return "cotacao";
  if (/interesse|experiencia_escolhida/.test(stage)) return "interesse_identificado";
  return "contato_iniciado";
};
const canonicalLeadOutcome = (value: unknown) => {
  const outcome = canonicalLeadValue(value);
  const exact = new Set([
    "em_andamento",
    "aguardando_cliente",
    "pagamento_pendente",
    "reserva_confirmada",
    "nao_convertido",
    "atendimento_humano",
  ]);
  if (exact.has(outcome)) return outcome;
  if (/reserva_confirm|pagamento_(aprovado|confirmado)|pago|conclu/.test(outcome)) return "reserva_confirmada";
  if (/humano|atendente|handoff/.test(outcome)) return "atendimento_humano";
  if (/nao_convert|sem_reserva|desist|cancel|perdid/.test(outcome)) return "nao_convertido";
  if (/pagamento|pix|cobranca/.test(outcome)) return "pagamento_pendente";
  if (/aguard|sem_resposta|cliente_responder/.test(outcome)) return "aguardando_cliente";
  return "em_andamento";
};
const nonNegativeInteger = (value: unknown, maximum = 500) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(0, Math.trunc(number))) : 0;
};
const normalizePhone = (value: unknown) => {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 15);
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
};
const dateKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
const parseMinutes = (value: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59 ? hour * 60 + minute : null;
};
const typeKey = (type: CustomerType) => type.id || normalizeText(type.nome);
const numericMap = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, number>;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .map(([key, quantity]) => [clean(key, 100), nonNegativeInteger(quantity)])
    .filter(([key]) => Boolean(key))) as Record<string, number>;
};
const ageMap = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, number[]>;
  const result: Record<string, number[]> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, ages]) => {
    if (!Array.isArray(ages)) return;
    result[clean(key, 100)] = ages
      .map((age) => Number(age))
      .filter((age) => Number.isFinite(age) && age >= 0 && age <= 120)
      .map(Math.trunc);
  });
  return result;
};
const timeMap = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {} as Record<string, string>;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .map(([key, time]) => [clean(key, 100), clean(time, 20)])
    .filter(([key, time]) => Boolean(key) && Boolean(time))) as Record<string, string>;
};
const valueFromMap = (map: Record<string, unknown> | undefined, type: CustomerType) => {
  if (!map) return undefined;
  if (type.id && type.id in map) return Number(map[type.id]);
  if (type.nome in map) return Number(map[type.nome]);
  const normalizedName = normalizeText(type.nome);
  for (const [key, value] of Object.entries(map)) {
    if (normalizeText(key) === normalizedName) return Number(value);
  }
  return undefined;
};
const legacyPriceForType = (raw: FirebaseFirestore.DocumentData, type: CustomerType) => {
  const name = normalizeText(type.nome);
  if (name.includes("adult")) return Number(raw.precoAdulto ?? 0) || 0;
  if (name.includes("crian")) return Number(raw.precoCrianca ?? 0) || 0;
  if (name.includes("bariat")) return Number(raw.precoBariatrica ?? raw.precoAdulto ?? 0) || 0;
  return 0;
};
const priceForType = (raw: FirebaseFirestore.DocumentData, type: CustomerType) => {
  const mapped = valueFromMap(raw.precosPorTipo && typeof raw.precosPorTipo === "object" ? raw.precosPorTipo : undefined, type);
  return Number.isFinite(mapped) ? Math.max(0, Number(mapped)) : legacyPriceForType(raw, type);
};
const serializeQuestion = (question: Record<string, unknown>, packageId: string, packageName: string) => {
  const conditional = question.perguntaCondicional && typeof question.perguntaCondicional === "object"
    ? question.perguntaCondicional as Record<string, unknown>
    : null;
  return {
    pacoteId: packageId,
    pacoteNome: packageName,
    id: clean(question.id, 100),
    pergunta: clean(question.pergunta, 300),
    tipo: clean(question.tipo, 40),
    obrigatoria: question.obrigatoria === true,
    ...(conditional ? {
      perguntaCondicional: {
        pergunta: clean(conditional.pergunta, 300),
        tipo: clean(conditional.tipo, 40),
        obrigatoria: conditional.obrigatoria === true,
        condicao: clean(conditional.condicao, 40),
      },
    } : {}),
  };
};

const participantCountForPackage = (reservation: FirebaseFirestore.DocumentData, packageId: string) => {
  if (Array.isArray(reservation.gruposParticipacao)) {
    const fromGroups = reservation.gruposParticipacao.reduce((total: number, group: Record<string, unknown>) => {
      const ids = Array.isArray(group.pacoteIds) ? group.pacoteIds.map(String) : [];
      return ids.includes(packageId) ? total + nonNegativeInteger(group.participantes) : total;
    }, 0);
    if (fromGroups > 0) return fromGroups;
  }
  return Math.max(
    nonNegativeInteger(reservation.participantes),
    nonNegativeInteger(reservation.adultos) + nonNegativeInteger(reservation.bariatrica) +
      nonNegativeInteger(reservation.criancas) + nonNegativeInteger(reservation.naoPagante),
  );
};

const loadCatalogRecords = async () => {
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const [typeSnapshot, packageSnapshot, comboSnapshot] = await Promise.all([
    db.collection("tipos_clientes").get(),
    db.collection("pacotes").get(),
    db.collection("combos").get(),
  ]);
  const types: CustomerType[] = typeSnapshot.docs.map((document) => {
    const raw = document.data();
    const minimum = Number(raw.idadeMinima);
    const maximum = Number(raw.idadeMaxima);
    return {
      id: document.id,
      nome: clean(raw.nome, 160),
      descricao: clean(raw.descricao, 500),
      perguntarIdade: raw.perguntarIdade === true,
      ...(Number.isFinite(minimum) ? { idadeMinima: Math.max(0, Math.trunc(minimum)) } : {}),
      ...(Number.isFinite(maximum) ? { idadeMaxima: Math.min(120, Math.trunc(maximum)) } : {}),
    };
  }).filter((type) => type.nome);
  const packages: PackageRecord[] = packageSnapshot.docs.map((document) => ({ id: document.id, raw: document.data() }));
  const combos: ComboRecord[] = comboSnapshot.docs.map((document) => ({ id: document.id, raw: document.data() }));
  return { db, types, packages, combos };
};

const serializePackage = (record: PackageRecord, types: CustomerType[]) => {
  const { id, raw } = record;
  const name = clean(raw.nome, 160);
  const prices = Object.fromEntries(types.map((type) => [typeKey(type), priceForType(raw, type)]));
  return {
    id,
    tipoOferta: "pacote" as const,
    nome: name,
    ativo: raw.ativo !== false,
    tipo: clean(raw.tipo, 120),
    descricao: clean(raw.descricao, 800),
    aviso: clean(raw.aviso, 800),
    aceitaPet: raw.aceitaPet === true,
    modoHorario: clean(raw.modoHorario, 30) || "lista",
    horarios: Array.isArray(raw.horarios) ? raw.horarios.map((item: unknown) => clean(item, 20)).filter(Boolean) : [],
    horarioInicio: clean(raw.horarioInicio, 20),
    horarioFim: clean(raw.horarioFim, 20),
    intervaloMinutos: nonNegativeInteger(raw.intervaloMinutos, 1440) || 60,
    diasSemana: Array.isArray(raw.dias) ? raw.dias.map(Number).filter((day: number) => Number.isInteger(day) && day >= 0 && day <= 6) : [],
    datasBloqueadas: Array.isArray(raw.datasBloqueadas) ? raw.datasBloqueadas.map((item: unknown) => clean(item, 20)).filter(Boolean) : [],
    limite: nonNegativeInteger(raw.limite, 10000),
    precosPorTipo: prices,
    precos: {
      adulto: Number(raw.precoAdulto ?? 0) || 0,
      bariatrica: Number(raw.precoBariatrica ?? raw.precoAdulto ?? 0) || 0,
      crianca: Number(raw.precoCrianca ?? 0) || 0,
      naoPagante: 0,
    },
    perguntas: Array.isArray(raw.perguntasPersonalizadas)
      ? raw.perguntasPersonalizadas.map((question: Record<string, unknown>) => serializeQuestion(question, id, name))
      : [],
  };
};

export const listarCatalogoAgente = async () => {
  const { types, packages, combos } = await loadCatalogRecords();
  const activePackages = packages.map((record) => serializePackage(record, types))
    .filter((item) => item.nome && item.ativo)
    .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"));
  const packageById = new Map(activePackages.map((item) => [item.id, item]));
  const activeCombos = combos.map(({ id, raw }) => {
    const packageIds = Array.isArray(raw.pacoteIds) ? raw.pacoteIds.map(String).filter((packageId: string) => packageById.has(packageId)) : [];
    const prices = Object.fromEntries(types.map((type) => [typeKey(type), priceForType(raw, type)]));
    const included = packageIds.map((packageId: string) => packageById.get(packageId)!).filter(Boolean);
    const scheduled = included.find((item) => item.modoHorario !== "intervalo" && item.horarios.length > 0);
    return {
      id,
      tipoOferta: "combo" as const,
      nome: clean(raw.nome, 160),
      ativo: raw.ativo !== false,
      descricao: clean(raw.descricao, 800) || `Inclui ${included.map((item) => item.nome).join(" + ")}`,
      pacoteIds: packageIds,
      inclui: included.map((item) => ({ id: item.id, nome: item.nome, modoHorario: item.modoHorario, horarios: item.horarios, horarioInicio: item.horarioInicio, horarioFim: item.horarioFim, aviso: item.aviso })),
      horarios: scheduled?.horarios ?? [],
      horarioInicio: scheduled?.horarioInicio ?? included.find((item) => item.horarioInicio)?.horarioInicio ?? "",
      horarioFim: scheduled?.horarioFim ?? included.find((item) => item.horarioFim)?.horarioFim ?? "",
      precosPorTipo: prices,
      preco: Number(raw.preco ?? 0) || 0,
      desconto: Number(raw.desconto ?? 0) || 0,
    };
  }).filter((item) => item.nome && item.ativo && item.pacoteIds.length > 0)
    .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"));
  return { tiposClientes: types, pacotes: activePackages, combos: activeCombos };
};

export const listarExperienciasAgente = async () => (await listarCatalogoAgente()).pacotes;

const findType = (types: CustomerType[], term: string) => types.find((type) => normalizeText(type.nome).includes(term));
const normalizeParticipation = (input: AgentAvailabilityInput, types: CustomerType[]) => {
  const direct = numericMap(input.participantesPorTipo);
  const participants: Record<string, number> = {};
  if (Object.keys(direct).length > 0) {
    types.forEach((type) => {
      const value = valueFromMap(direct, type);
      participants[typeKey(type)] = Number.isFinite(value) ? nonNegativeInteger(value) : 0;
    });
    const knownKeys = new Set(types.flatMap((type) => [type.id, type.nome, normalizeText(type.nome)]));
    const unknown = Object.keys(direct).filter((key) => !knownKeys.has(key) && !types.some((type) => normalizeText(key) === normalizeText(type.nome)));
    if (unknown.length > 0) throw new Error(`AGENT_PARTICIPANT_TYPE_INVALID:${unknown.join(",")}`);
  } else {
    const legacy = [
      ["adult", input.adultos],
      ["bariat", input.bariatrica],
      ["crian", input.criancas],
      ["nao pag", input.naoPagantes],
    ] as const;
    legacy.forEach(([term, quantity]) => {
      const type = findType(types, term);
      if (type) participants[typeKey(type)] = nonNegativeInteger(quantity);
    });
  }
  types.forEach((type) => { if (!(typeKey(type) in participants)) participants[typeKey(type)] = 0; });

  const ages = ageMap(input.idadesPorTipo);
  const childType = findType(types, "crian");
  const nonPayingType = findType(types, "nao pag");
  if (childType && Array.isArray(input.idadesCriancas)) ages[typeKey(childType)] = input.idadesCriancas.map(Number).filter(Number.isFinite).map(Math.trunc);
  if (nonPayingType && Array.isArray(input.idadesNaoPagantes)) ages[typeKey(nonPayingType)] = input.idadesNaoPagantes.map(Number).filter(Number.isFinite).map(Math.trunc);

  const pending: string[] = [];
  types.forEach((type) => {
    const key = typeKey(type);
    const quantity = nonNegativeInteger(participants[key]);
    if (!type.perguntarIdade || quantity <= 0) return;
    const values = ages[key] ?? [];
    if (values.length !== quantity) {
      pending.push(`Informe a idade de cada participante da categoria ${type.nome}.`);
      return;
    }
    if (values.some((age) => age < 0 || age > 120)) pending.push(`Existe idade invalida na categoria ${type.nome}.`);
    if (type.idadeMinima !== undefined && values.some((age) => age < type.idadeMinima!)) pending.push(`A categoria ${type.nome} exige idade minima de ${type.idadeMinima} anos.`);
    if (type.idadeMaxima !== undefined && values.some((age) => age > type.idadeMaxima!)) pending.push(`A categoria ${type.nome} aceita idade maxima de ${type.idadeMaxima} anos.`);
  });
  const bariatricType = findType(types, "bariat");
  if (bariatricType && nonNegativeInteger(participants[typeKey(bariatricType)]) > 0 && input.confirmouCarteirinhaBariatrica !== true) {
    pending.push("Confirme que o cliente foi informado de que deve enviar/apresentar a carteirinha bariatrica para validacao.");
  }
  return { participants, ages, pending };
};

const validateRequiredQuestions = (packages: PackageRecord[], input: AgentAvailabilityInput) => {
  const answers = Array.isArray(input.perguntasPersonalizadas) ? input.perguntasPersonalizadas as Array<Record<string, unknown>> : [];
  const pending: string[] = [];
  const questions: ReturnType<typeof serializeQuestion>[] = [];
  packages.forEach(({ id, raw }) => {
    const packageName = clean(raw.nome, 160);
    const rawQuestions = Array.isArray(raw.perguntasPersonalizadas) ? raw.perguntasPersonalizadas as Array<Record<string, unknown>> : [];
    rawQuestions.forEach((rawQuestion) => {
      const question = serializeQuestion(rawQuestion, id, packageName);
      questions.push(question);
      if (!question.obrigatoria) return;
      const answer = answers.find((item) => clean(item.pacoteId, 100) === id && clean(item.perguntaId ?? item.id, 100) === question.id);
      const value = clean(answer?.resposta, 1000).toLowerCase();
      const valid = question.tipo === "sim_nao" ? value === "sim" || value === "nao" : Boolean(value);
      if (!valid) pending.push(`Responda a pergunta obrigatoria \"${question.pergunta}\" de ${packageName}.`);
      const conditional = question.perguntaCondicional;
      if (valid && conditional && conditional.obrigatoria && value === normalizeText(conditional.condicao)) {
        const conditionalAnswer = answer?.perguntaCondicional && typeof answer.perguntaCondicional === "object"
          ? answer.perguntaCondicional as Record<string, unknown>
          : undefined;
        const conditionalValue = clean(conditionalAnswer?.resposta, 1000).toLowerCase();
        const conditionalValid = conditional.tipo === "sim_nao"
          ? conditionalValue === "sim" || conditionalValue === "nao"
          : Boolean(conditionalValue);
        if (!conditionalValid) pending.push(`Responda a pergunta complementar \"${conditional.pergunta}\" de ${packageName}.`);
      }
    });
  });
  return { questions, pending };
};

export const simularReservaAgente = async (input: AgentAvailabilityInput) => {
  const offerType = clean(input.tipoOferta, 20) === "combo" || clean(input.comboId, 100) ? "combo" : "pacote";
  const offerId = clean(input.ofertaId ?? (offerType === "combo" ? input.comboId : input.pacoteId), 100);
  const date = clean(input.data, 20);
  const defaultTime = clean(input.horario, 20);
  const requestedTimes = timeMap(input.horariosPorPacote);
  if (!offerId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("AGENT_AVAILABILITY_INPUT_INVALID");
  if (date < dateKey()) throw new Error("AGENT_DATE_IN_PAST");

  const { db, types, packages: allPackages, combos } = await loadCatalogRecords();
  const combo = offerType === "combo" ? combos.find((item) => item.id === offerId) : undefined;
  if (offerType === "combo" && (!combo || combo.raw.ativo === false)) throw new Error("AGENT_COMBO_NOT_FOUND");
  const packageIds = offerType === "combo"
    ? (Array.isArray(combo!.raw.pacoteIds) ? combo!.raw.pacoteIds.map(String) : [])
    : [offerId];
  const packages = packageIds.map((id) => allPackages.find((item) => item.id === id)).filter((item): item is PackageRecord => Boolean(item));
  if (packages.length !== packageIds.length || packages.length === 0) throw new Error("AGENT_PACKAGE_NOT_FOUND");

  const participation = normalizeParticipation(input, types);
  const participants = Object.values(participation.participants).reduce((total, quantity) => total + nonNegativeInteger(quantity), 0);
  if (participants <= 0) throw new Error("AGENT_PARTICIPANTS_REQUIRED");
  const questionValidation = validateRequiredQuestions(packages, input);
  const petRequirements = input.temPet === true
    ? packages
        .filter(({ raw }) => raw.aceitaPet !== true)
        .map(({ raw }) => `${clean(raw.nome, 160)} nao aceita pets. Confirme que o pet nao sera levado.`)
    : [];
  const [daySnapshot, reservationsSnapshot] = await Promise.all([
    db.collection("disponibilidade").doc(date).get(),
    db.collection("reservas").where("data", "==", date).get(),
  ]);
  const dayData = daySnapshot.exists ? daySnapshot.data()! : {};
  const weekday = new Date(`${date}T12:00:00-03:00`).getUTCDay();
  const reasons: string[] = [];
  const packageResults = packages.map(({ id, raw }) => {
    const name = clean(raw.nome, 160);
    const mode = clean(raw.modoHorario, 30) || "lista";
    const listedTimes = Array.isArray(raw.horarios) ? raw.horarios.map(String) : [];
    const selectedTime = clean(requestedTimes[id] ?? (packages.length === 1 ? defaultTime : ""), 20);
    const days = Array.isArray(raw.dias) ? raw.dias.map(Number) : [];
    const blockedDates = Array.isArray(raw.datasBloqueadas) ? raw.datasBloqueadas.map(String) : [];
    const packageReasons: string[] = [];
    if (raw.ativo === false) packageReasons.push("PACOTE_INATIVO");
    if (dayData.fechado === true) packageReasons.push("DIA_FECHADO");
    if (days.length && !days.includes(weekday)) packageReasons.push("DIA_DA_SEMANA_INDISPONIVEL");
    if (blockedDates.includes(date)) packageReasons.push("DATA_BLOQUEADA");
    if (mode !== "intervalo" && !selectedTime) packageReasons.push("HORARIO_OBRIGATORIO");
    if (selectedTime && mode !== "intervalo" && listedTimes.length && !listedTimes.includes(selectedTime)) packageReasons.push("HORARIO_FORA_DA_GRADE");
    if (selectedTime && mode !== "intervalo" && dayData.horarios?.[`${date}-${id}-${selectedTime}`] === false) packageReasons.push("HORARIO_BLOQUEADO");
    if (mode === "intervalo" && selectedTime) {
      const selectedMinutes = parseMinutes(selectedTime);
      const start = parseMinutes(clean(raw.horarioInicio, 20));
      const end = parseMinutes(clean(raw.horarioFim, 20));
      if (selectedMinutes === null || start === null || end === null || selectedMinutes < start || selectedMinutes > end) packageReasons.push("HORARIO_FORA_DA_FAIXA");
    }

    let occupied = 0;
    reservationsSnapshot.docs.forEach((document) => {
      const reservation = document.data();
      if (!reservaContaParaOcupacao(reservation)) return;
      const ids = new Set<string>([
        ...(Array.isArray(reservation.pacoteIds) ? reservation.pacoteIds.map(String) : []),
        ...(Array.isArray(reservation.gruposParticipacao)
          ? reservation.gruposParticipacao.flatMap((group: Record<string, unknown>) => Array.isArray(group.pacoteIds) ? group.pacoteIds.map(String) : [])
          : []),
      ]);
      if (!ids.has(id) && normalizeText(reservation.atividade) !== normalizeText(name)) return;
      const reservationTime = clean(reservation.horariosPorPacote?.[id] ?? reservation.horario ?? reservation.Horario, 20);
      if (mode !== "intervalo" && reservationTime !== selectedTime) return;
      occupied += participantCountForPackage(reservation, id);
    });
    const extrasRaw = dayData.vagasExtras ?? {};
    const extras = nonNegativeInteger(extrasRaw[`geral::${date}`], 10000) +
      nonNegativeInteger(extrasRaw[`${date}-${id}`], 10000) +
      (mode === "intervalo" ? 0 : nonNegativeInteger(extrasRaw[`geral::${date}::${selectedTime}`], 10000) + nonNegativeInteger(extrasRaw[`${date}-${id}-${selectedTime}`], 10000));
    const capacity = nonNegativeInteger(raw.limite, 10000) + extras;
    const remaining = capacity > 0 ? Math.max(0, capacity - occupied) : null;
    if (remaining !== null && participants > remaining) packageReasons.push("VAGAS_INSUFICIENTES");
    packageReasons.forEach((reason) => reasons.push(`${id}:${reason}`));
    return {
      id,
      nome: name,
      modoHorario: mode,
      horario: selectedTime || null,
      horarioInicio: clean(raw.horarioInicio, 20) || null,
      horarioFim: clean(raw.horarioFim, 20) || null,
      aceitaPet: raw.aceitaPet === true,
      aviso: clean(raw.aviso, 800) || null,
      ocupadas: occupied,
      vagasRestantes: remaining,
    };
  });

  const totalByPackage = (record: PackageRecord) => types.reduce((total, type) =>
    total + nonNegativeInteger(participation.participants[typeKey(type)]) * priceForType(record.raw, type), 0);
  let value = 0;
  if (offerType === "combo" && combo) {
    const hasCustomPrice = types.some((type) => priceForType(combo.raw, type) > 0);
    if (hasCustomPrice) {
      value = types.reduce((total, type) => total + nonNegativeInteger(participation.participants[typeKey(type)]) * priceForType(combo.raw, type), 0);
    } else if (Number(combo.raw.preco) > 0) {
      value = Number(combo.raw.preco) * participants;
    } else {
      value = packages.reduce((total, record) => total + totalByPackage(record), 0);
      const discount = Math.min(100, Math.max(0, Number(combo.raw.desconto) || 0));
      if (discount > 0) value *= 1 - discount / 100;
    }
  } else {
    value = packages.reduce((total, record) => total + totalByPackage(record), 0);
  }
  value = Math.round(value * 100) / 100;
  const offerName = offerType === "combo" ? clean(combo!.raw.nome, 160) : clean(packages[0].raw.nome, 160);
  const pending = Array.from(new Set([
    ...participation.pending,
    ...questionValidation.pending,
    ...petRequirements,
  ]));
  const times = Object.fromEntries(packageResults.filter((item) => item.horario).map((item) => [item.id, item.horario as string]));
  const categorySummary = Object.fromEntries(types.map((type) => [typeKey(type), {
    nome: type.nome,
    quantidade: nonNegativeInteger(participation.participants[typeKey(type)]),
    idades: participation.ages[typeKey(type)] ?? [],
  }]));
  const standardQuantity = (term: string) => {
    const type = findType(types, term);
    return type ? nonNegativeInteger(participation.participants[typeKey(type)]) : 0;
  };

  return {
    disponivel: reasons.length === 0,
    prontoParaPagamento: reasons.length === 0 && pending.length === 0,
    motivos: reasons,
    requisitosPendentes: pending,
    oferta: { tipo: offerType, id: offerId, nome: offerName, pacoteIds: packageIds },
    pacote: { id: offerId, nome: offerName, modoHorario: packages.length === 1 ? clean(packages[0].raw.modoHorario, 30) || "lista" : "combo" },
    pacotes: packageResults,
    data: date,
    horario: defaultTime || Object.values(times)[0] || "Sem horario especifico",
    horariosPorPacote: times,
    participantes: participants,
    participantesPorTipo: participation.participants,
    idadesPorTipo: participation.ages,
    resumoCategorias: categorySummary,
    categoriasLegadas: {
      adultos: standardQuantity("adult"),
      bariatrica: standardQuantity("bariat"),
      criancas: standardQuantity("crian"),
      naoPagantes: standardQuantity("nao pag"),
    },
    vagasRestantes: packageResults.reduce<number | null>((remaining, item) => {
      if (item.vagasRestantes === null) return remaining;
      return remaining === null ? item.vagasRestantes : Math.min(remaining, item.vagasRestantes);
    }, null),
    valor: value,
    moeda: "BRL",
    perguntas: questionValidation.questions,
    aviso: "A criacao do pagamento revalida oferta, data, horarios, categorias, idades, perguntas, valor e vagas.",
  };
};

export const criarLinkCartaoAgente = (input: AgentAvailabilityInput & { sessionId?: unknown }) => {
  // O checkout do Agente sempre permanece no dominio oficial. Mesmo uma
  // variavel de ambiente incorreta nunca pode transformar este retorno em um
  // link direto do provedor de pagamento.
  const configuredBaseUrl = (process.env.PUBLIC_SITE_BASE_URL ?? "https://vagafogo.com.br").trim();
  let baseUrl = "https://vagafogo.com.br";
  try {
    const parsed = new URL(configuredBaseUrl);
    if (parsed.protocol === "https:" && ["vagafogo.com.br", "www.vagafogo.com.br"].includes(parsed.hostname.toLowerCase())) {
      baseUrl = `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
    }
  } catch {
    // Mantem o dominio oficial quando a configuracao nao for uma URL valida.
  }
  const query = new URLSearchParams({
    source_channel: "whatsapp",
    utm_source: "whatsapp",
    utm_medium: "agente",
    utm_campaign: "reserva_assistida",
  });
  const offerType = clean(input.tipoOferta, 20) === "combo" || clean(input.comboId, 100) ? "combo" : "pacote";
  const offerId = clean(input.ofertaId ?? (offerType === "combo" ? input.comboId : input.pacoteId), 100);
  const date = clean(input.data, 20);
  const time = clean(input.horario, 20) || Object.values(timeMap(input.horariosPorPacote))[0] || "";
  const sessionId = clean(input.sessionId, 100);
  const campaignId = clean(input.campaignId, 100);
  const recipientId = clean(input.recipientId, 100);
  if (offerId) query.set(offerType === "combo" ? "combo" : "pacote", offerId);
  if (date) query.set("data", date);
  if (time) query.set("horario", time);
  if (sessionId) query.set("agent_session", sessionId);
  if (campaignId) query.set("cid", campaignId);
  if (recipientId) query.set("rid", recipientId);
  return { url: `${baseUrl}/reservar?${query.toString()}`, expiraEmMinutos: 120 };
};

export const registrarLeadAgente = async (input: AgentLeadInput) => {
  const sessionId = clean(input.sessionId, 100);
  const phone = normalizePhone(input.telefone);
  if (!sessionId || !phone) throw new Error("AGENT_LEAD_IDENTITY_REQUIRED");
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const leadId = createHash("sha256").update(`agente-lead:v1\0${phone}`).digest("hex");
  const array = (value: unknown, maximum = 10) => Array.isArray(value) ? value.map((item) => clean(item, 160)).filter(Boolean).slice(0, maximum) : [];
  const participants = nonNegativeInteger(input.participantes);
  const estimatedValue = Number(input.valorEstimado);
  const patch: FirebaseFirestore.DocumentData = {
    canal: "whatsapp",
    telefone: phone,
    sessionId,
    nome: clean(input.nome, 160) || null,
    email: clean(input.email, 240) || null,
    etapa: canonicalLeadStage(input.etapa),
    resultado: canonicalLeadOutcome(input.resultado),
    motivo: clean(input.motivo, 240) || null,
    pacoteIds: array(input.pacoteIds),
    atividades: array(input.atividades),
    dataDesejada: clean(input.dataDesejada, 20) || null,
    horarioDesejado: clean(input.horarioDesejado, 40) || null,
    participantes: participants || null,
    valorEstimado: Number.isFinite(estimatedValue) && estimatedValue >= 0 ? estimatedValue : null,
    formaPagamento: clean(input.formaPagamento, 30) || null,
    reservaId: clean(input.reservaId, 100) || null,
    pagamentoId: clean(input.pagamentoId, 100) || null,
    marketingOptIn: input.marketingOptIn === true,
    proximaAcao: clean(input.proximaAcao, 240) || null,
    resumo: clean(input.resumo, 600) || null,
    atualizadoEm: FieldValue.serverTimestamp(),
  };
  const leadRef = db.collection("crm_leads_agente").doc(leadId);
  const existing = await leadRef.get();
  await leadRef.set({ ...patch, ...(existing.exists ? {} : { criadoEm: FieldValue.serverTimestamp() }) }, { merge: true });
  return { id: leadId, registrado: true };
};

export const concluirLeadAgenteComReserva = async (telefone: unknown, reservaId: unknown, pagamentoId?: unknown) => {
  const phone = normalizePhone(telefone);
  const reservationId = clean(reservaId, 100);
  if (!phone || !reservationId) return false;
  const db = obterFirestoreAdmin();
  if (!db) return false;
  const leadId = createHash("sha256").update(`agente-lead:v1\0${phone}`).digest("hex");
  await db.collection("crm_leads_agente").doc(leadId).set({
    canal: "whatsapp",
    telefone: phone,
    etapa: "concluida",
    resultado: "reserva_confirmada",
    reservaId: reservationId,
    pagamentoId: clean(pagamentoId, 100) || null,
    proximaAcao: null,
    atualizadoEm: FieldValue.serverTimestamp(),
  }, { merge: true });
  return true;
};
