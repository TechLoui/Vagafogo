import { createHash, randomBytes } from "crypto";
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
  nome?: unknown;
  email?: unknown;
  cpf?: unknown;
  whatsappMarketingOptIn?: unknown;
  campaignId?: unknown;
  recipientId?: unknown;
  sessionId?: unknown;
};

type AgentReservationDraftInput = AgentAvailabilityInput & {
  sessionId?: unknown;
  teste?: unknown;
  nome?: unknown;
  email?: unknown;
  cpf?: unknown;
  canalConclusao?: unknown;
  formaPagamento?: unknown;
  whatsappMarketingOptIn?: unknown;
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
  teste?: unknown;
};

type AgentLeadUpdateInput = {
  nome?: unknown;
  etapa?: unknown;
  resultado?: unknown;
  motivo?: unknown;
  proximaAcao?: unknown;
  marketingOptIn?: unknown;
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

const AGENT_LEADS_COLLECTION = "crm_leads_agente";
const AGENT_LEAD_DRAFTS_COLLECTION = "crm_leads_agente_rascunhos";
const AGENT_RESERVATION_DRAFTS_COLLECTION = "crm_agente_reserva_rascunhos";
const AGENT_CHECKOUT_HANDOFFS_COLLECTION = "crm_agente_checkout_handoffs";
const AGENT_LEAD_INACTIVITY_MS = 2 * 60 * 60 * 1000;
const AGENT_LEAD_FINALIZER_INTERVAL_MS = 5 * 60 * 1000;
const AGENT_RESERVATION_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const AGENT_CHECKOUT_HANDOFF_TTL_MS = 2 * 60 * 60 * 1000;

const clean = (value: unknown, maximum: number) => String(value ?? "").trim().slice(0, maximum);
const owns = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
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
const customQuestionAnswers = (value: unknown) => Array.isArray(value)
  ? value.slice(0, 40).map((raw) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
      const item = raw as Record<string, unknown>;
      const conditional = item.perguntaCondicional && typeof item.perguntaCondicional === "object" && !Array.isArray(item.perguntaCondicional)
        ? item.perguntaCondicional as Record<string, unknown>
        : null;
      const answer = {
        pacoteId: clean(item.pacoteId, 100),
        perguntaId: clean(item.perguntaId ?? item.id, 100),
        resposta: clean(item.resposta, 1000),
        ...(conditional ? { perguntaCondicional: { resposta: clean(conditional.resposta, 1000) } } : {}),
      };
      return answer.pacoteId && answer.perguntaId ? answer : null;
    }).filter((item): item is NonNullable<typeof item> => Boolean(item))
  : [];
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
  const normalizedAges: Record<string, number[]> = {};
  types.forEach((type) => {
    const exact = ages[typeKey(type)] ?? ages[type.nome];
    if (exact) {
      normalizedAges[typeKey(type)] = exact;
      return;
    }
    const matchingKey = Object.keys(ages).find((key) => normalizeText(key) === normalizeText(type.nome));
    if (matchingKey) normalizedAges[typeKey(type)] = ages[matchingKey];
  });
  const childType = findType(types, "crian");
  const nonPayingType = findType(types, "nao pag");
  if (childType && Array.isArray(input.idadesCriancas)) normalizedAges[typeKey(childType)] = input.idadesCriancas.map(Number).filter(Number.isFinite).map(Math.trunc);
  if (nonPayingType && Array.isArray(input.idadesNaoPagantes)) normalizedAges[typeKey(nonPayingType)] = input.idadesNaoPagantes.map(Number).filter(Number.isFinite).map(Math.trunc);

  const pending: string[] = [];
  types.forEach((type) => {
    const key = typeKey(type);
    const quantity = nonNegativeInteger(participants[key]);
    if (!type.perguntarIdade || quantity <= 0) return;
    const values = normalizedAges[key] ?? [];
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
  return { participants, ages: normalizedAges, pending };
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

const checkoutTokenHash = (token: string) => createHash("sha256")
  .update(`agente-checkout:v1\0${token}`)
  .digest("hex");

export const criarLinkCartaoAgente = async (input: AgentAvailabilityInput) => {
  const availability = await simularReservaAgente(input);
  if (!availability.disponivel) {
    throw new Error(`AGENT_CHECKOUT_UNAVAILABLE:${availability.motivos.join(",")}`);
  }
  if (!availability.prontoParaPagamento) {
    throw new Error(`AGENT_CHECKOUT_INCOMPLETE:${availability.requisitosPendentes.join(" | ")}`);
  }

  const nome = clean(input.nome, 160);
  const email = clean(input.email, 240).toLowerCase();
  const cpf = String(input.cpf ?? "").replace(/\D/g, "").slice(0, 11);
  const telefone = normalizePhone(input.telefone);
  if (!nome || !/^\S+@\S+\.\S+$/.test(email) || cpf.length !== 11 || telefone.length < 10) {
    throw new Error("AGENT_CHECKOUT_PERSONAL_DATA_REQUIRED");
  }
  if (typeof input.temPet !== "boolean") throw new Error("AGENT_CHECKOUT_PET_ANSWER_REQUIRED");

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
  const offerType = availability.oferta.tipo;
  const offerId = availability.oferta.id;
  const date = availability.data;
  const time = availability.horario === "Sem horario especifico" ? "" : availability.horario;
  const sessionId = clean(input.sessionId, 100);
  const campaignId = clean(input.campaignId, 100);
  const recipientId = clean(input.recipientId, 100);

  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + AGENT_CHECKOUT_HANDOFF_TTL_MS);
  const payload = {
    version: 1,
    tipoOferta: offerType,
    ofertaId: offerId,
    ofertaNome: availability.oferta.nome,
    pacoteIds: availability.oferta.pacoteIds,
    data: date,
    horario: time,
    horariosPorPacote: availability.horariosPorPacote,
    participantesPorTipo: availability.participantesPorTipo,
    idadesPorTipo: availability.idadesPorTipo,
    perguntasPersonalizadas: customQuestionAnswers(input.perguntasPersonalizadas),
    confirmouCarteirinhaBariatrica: input.confirmouCarteirinhaBariatrica === true,
    nome,
    email,
    cpf,
    telefone,
    temPet: input.temPet,
    whatsappMarketingOptIn: input.whatsappMarketingOptIn === true,
    formaPagamento: "CREDIT_CARD" as const,
    valorValidado: availability.valor,
    sessionId: sessionId || null,
    campaignId: campaignId || null,
    recipientId: recipientId || null,
    geradoEm: now.toISOString(),
    expiraEm: expiresAt.toISOString(),
  };
  await db.collection(AGENT_CHECKOUT_HANDOFFS_COLLECTION).doc(checkoutTokenHash(token)).set({
    payload,
    telefone,
    sessionId: sessionId || null,
    criadoEm: now,
    expiraEm: expiresAt,
    acessos: 0,
  });

  query.set("agent_checkout", token);
  if (offerId) query.set(offerType === "combo" ? "combo" : "pacote", offerId);
  if (date) query.set("data", date);
  if (time) query.set("horario", time);
  if (sessionId) query.set("agent_session", sessionId);
  if (campaignId) query.set("cid", campaignId);
  if (recipientId) query.set("rid", recipientId);
  return { url: `${baseUrl}/reservar?${query.toString()}`, expiraEmMinutos: 120, expiraEm: expiresAt.toISOString() };
};

export const obterCheckoutAgente = async (tokenValue: unknown) => {
  const token = clean(tokenValue, 80);
  if (!/^[A-Za-z0-9_-]{40,80}$/.test(token)) throw new Error("AGENT_CHECKOUT_TOKEN_INVALID");
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const ref = db.collection(AGENT_CHECKOUT_HANDOFFS_COLLECTION).doc(checkoutTokenHash(token));
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error("AGENT_CHECKOUT_NOT_FOUND");
  const stored = snapshot.data()!;
  const expiresAt = stored.expiraEm?.toDate?.();
  if (!(expiresAt instanceof Date) || expiresAt.getTime() <= Date.now()) {
    await ref.delete();
    throw new Error("AGENT_CHECKOUT_EXPIRED");
  }
  await ref.set({ acessos: FieldValue.increment(1), ultimoAcessoEm: FieldValue.serverTimestamp() }, { merge: true });
  return stored.payload as Record<string, unknown>;
};

export const processarCheckoutsAgenteExpirados = async () => {
  const db = obterFirestoreAdmin();
  if (!db) return { excluidos: 0 };
  const snapshot = await db.collection(AGENT_CHECKOUT_HANDOFFS_COLLECTION)
    .where("expiraEm", "<=", new Date())
    .limit(100)
    .get();
  if (snapshot.empty) return { excluidos: 0 };
  const batch = db.batch();
  snapshot.docs.forEach((document) => batch.delete(document.ref));
  await batch.commit();
  return { excluidos: snapshot.size };
};

const agentLeadIdentity = (isTest: boolean, sessionId: string, phone: string) =>
  isTest ? `teste\0${sessionId}` : `whatsapp\0${phone}`;

const agentReservationDraftId = (isTest: boolean, sessionId: string, phone: string) => createHash("sha256")
  .update(`agente-reserva-rascunho:v1\0${agentLeadIdentity(isTest, sessionId, phone)}`)
  .digest("hex");

const reservationDraftIdentity = (input: AgentReservationDraftInput) => {
  const sessionId = clean(input.sessionId, 100);
  const phone = normalizePhone(input.telefone);
  const isTest = input.teste === true;
  if (!sessionId || !phone) throw new Error("AGENT_RESERVATION_DRAFT_IDENTITY_REQUIRED");
  return { sessionId, phone, isTest, id: agentReservationDraftId(isTest, sessionId, phone) };
};

const buildReservationDraftPatch = (input: AgentReservationDraftInput) => {
  const patch: Record<string, unknown> = {};
  const copyText = (key: keyof AgentReservationDraftInput, maximum: number) => {
    if (!owns(input, String(key))) return;
    const value = clean(input[key], maximum);
    if (value) patch[String(key)] = value;
  };
  if (owns(input, "tipoOferta")) {
    const value = clean(input.tipoOferta, 20);
    if (value === "pacote" || value === "combo") patch.tipoOferta = value;
  }
  copyText("ofertaId", 100);
  copyText("data", 20);
  copyText("horario", 20);
  copyText("nome", 160);
  copyText("email", 240);
  if (owns(input, "cpf")) {
    const cpf = String(input.cpf ?? "").replace(/\D/g, "").slice(0, 11);
    if (cpf) patch.cpf = cpf;
  }
  if (owns(input, "horariosPorPacote")) patch.horariosPorPacote = timeMap(input.horariosPorPacote);
  if (owns(input, "participantesPorTipo")) patch.participantesPorTipo = numericMap(input.participantesPorTipo);
  if (owns(input, "idadesPorTipo")) patch.idadesPorTipo = ageMap(input.idadesPorTipo);
  if (owns(input, "perguntasPersonalizadas")) patch.perguntasPersonalizadas = customQuestionAnswers(input.perguntasPersonalizadas);
  for (const key of ["confirmouCarteirinhaBariatrica", "temPet", "whatsappMarketingOptIn"] as const) {
    if (owns(input, key) && typeof input[key] === "boolean") patch[key] = input[key];
  }
  if (owns(input, "canalConclusao")) {
    const value = clean(input.canalConclusao, 20);
    if (value === "whatsapp" || value === "site") patch.canalConclusao = value;
  }
  if (owns(input, "formaPagamento")) {
    const value = clean(input.formaPagamento, 30).toUpperCase();
    if (value === "PIX" || value === "CREDIT_CARD") patch.formaPagamento = value;
  }
  return patch;
};

const mergeReservationDraft = (current: Record<string, unknown>, patch: Record<string, unknown>) => {
  const merged = { ...current };
  Object.entries(patch).forEach(([key, value]) => {
    const previous = merged[key];
    if (value && typeof value === "object" && !Array.isArray(value)
      && previous && typeof previous === "object" && !Array.isArray(previous)) {
      merged[key] = { ...(previous as Record<string, unknown>), ...(value as Record<string, unknown>) };
    } else {
      merged[key] = value;
    }
  });
  return merged;
};

export const salvarRascunhoReservaAgente = async (input: AgentReservationDraftInput) => {
  const identity = reservationDraftIdentity(input);
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const ref = db.collection(AGENT_RESERVATION_DRAFTS_COLLECTION).doc(identity.id);
  const existing = await ref.get();
  const previous = existing.exists && existing.data()?.dados && typeof existing.data()!.dados === "object"
    ? existing.data()!.dados as Record<string, unknown>
    : {};
  const dados = mergeReservationDraft(previous, buildReservationDraftPatch(input));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + AGENT_RESERVATION_DRAFT_TTL_MS);
  await ref.set({
    sessionId: identity.sessionId,
    telefone: identity.phone,
    teste: identity.isTest,
    dados,
    ultimaInteracaoEm: now,
    expiraEm: expiresAt,
    atualizadoEm: FieldValue.serverTimestamp(),
    ...(existing.exists ? {} : { criadoEm: FieldValue.serverTimestamp() }),
  }, { merge: false });
  return { encontrado: true, dados, expiraEm: expiresAt.toISOString() };
};

export const obterRascunhoReservaAgente = async (input: AgentReservationDraftInput) => {
  const identity = reservationDraftIdentity(input);
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const ref = db.collection(AGENT_RESERVATION_DRAFTS_COLLECTION).doc(identity.id);
  const snapshot = await ref.get();
  if (!snapshot.exists) return { encontrado: false, dados: {} };
  const stored = snapshot.data()!;
  const storedExpiry = stored.expiraEm?.toDate?.();
  if (!(storedExpiry instanceof Date) || storedExpiry.getTime() <= Date.now()) {
    await ref.delete();
    return { encontrado: false, dados: {} };
  }
  const now = new Date();
  const expiresAt = new Date(now.getTime() + AGENT_RESERVATION_DRAFT_TTL_MS);
  await ref.set({ ultimaInteracaoEm: now, expiraEm: expiresAt, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
  const dados = stored.dados && typeof stored.dados === "object" ? stored.dados as Record<string, unknown> : {};
  return { encontrado: true, dados, expiraEm: expiresAt.toISOString() };
};

export const excluirRascunhoReservaAgente = async (input: AgentReservationDraftInput) => {
  const identity = reservationDraftIdentity(input);
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const ref = db.collection(AGENT_RESERVATION_DRAFTS_COLLECTION).doc(identity.id);
  const snapshot = await ref.get();
  if (snapshot.exists) await ref.delete();
  return { excluido: snapshot.exists };
};

export const processarRascunhosReservaAgenteExpirados = async () => {
  const db = obterFirestoreAdmin();
  if (!db) return { excluidos: 0 };
  const snapshot = await db.collection(AGENT_RESERVATION_DRAFTS_COLLECTION)
    .where("expiraEm", "<=", new Date())
    .limit(100)
    .get();
  if (snapshot.empty) return { excluidos: 0 };
  const batch = db.batch();
  snapshot.docs.forEach((document) => batch.delete(document.ref));
  await batch.commit();
  return { excluidos: snapshot.size };
};

const agentLeadId = (isTest: boolean, sessionId: string, phone: string) => createHash("sha256")
  .update(`agente-lead:v3\0${agentLeadIdentity(isTest, sessionId, phone)}`)
  .digest("hex");

const agentLeadDraftId = (isTest: boolean, sessionId: string, phone: string) => createHash("sha256")
  .update(`agente-lead-draft:v1\0${agentLeadIdentity(isTest, sessionId, phone)}`)
  .digest("hex");

const leadArray = (value: unknown, maximum = 10) => Array.isArray(value)
  ? value.map((item) => clean(item, 160)).filter(Boolean).slice(0, maximum)
  : [];

const buildAgentLeadPatch = (input: AgentLeadInput, sessionId: string, phone: string, isTest: boolean) => {
  const patch: FirebaseFirestore.DocumentData = {
    canal: isTest ? "teste_privado" : "whatsapp",
    teste: isTest,
    origem: isTest ? "simulador_agente" : "agente_whatsapp",
    telefone: phone,
    sessionId,
    etapa: canonicalLeadStage(input.etapa),
    resultado: canonicalLeadOutcome(input.resultado),
    marketingOptIn: input.marketingOptIn === true,
  };
  const copyText = (key: keyof AgentLeadInput, maximum: number) => {
    if (!owns(input, key)) return;
    const value = clean(input[key], maximum);
    if (value) patch[key] = value;
  };
  copyText("nome", 160);
  copyText("email", 240);
  copyText("motivo", 240);
  copyText("dataDesejada", 20);
  copyText("horarioDesejado", 40);
  copyText("formaPagamento", 30);
  copyText("reservaId", 100);
  copyText("pagamentoId", 100);
  copyText("proximaAcao", 240);
  copyText("resumo", 600);
  if (owns(input, "pacoteIds")) {
    const values = leadArray(input.pacoteIds);
    if (values.length) patch.pacoteIds = values;
  }
  if (owns(input, "atividades")) {
    const values = leadArray(input.atividades);
    if (values.length) patch.atividades = values;
  }
  if (owns(input, "participantes")) {
    const participants = nonNegativeInteger(input.participantes);
    if (participants > 0) patch.participantes = participants;
  }
  if (owns(input, "valorEstimado")) {
    const estimatedValue = Number(input.valorEstimado);
    if (Number.isFinite(estimatedValue) && estimatedValue >= 0) patch.valorEstimado = estimatedValue;
  }
  return patch;
};

const finalLeadDataFromDraft = (draft: FirebaseFirestore.DocumentData) => {
  const data = { ...draft };
  delete data.finalizarApos;
  delete data.ultimaInteracaoEm;
  delete data.atualizadoEm;
  delete data.criadoEm;
  delete data.consolidadoEm;
  return data;
};

const consolidateAgentLead = async (
  db: FirebaseFirestore.Firestore,
  draftRef: FirebaseFirestore.DocumentReference,
  draft: FirebaseFirestore.DocumentData,
  overrides: FirebaseFirestore.DocumentData = {},
  deleteDraft = false,
  finalized = true,
) => {
  const isTest = draft.teste === true;
  const sessionId = clean(draft.sessionId, 100);
  const phone = normalizePhone(draft.telefone);
  if (!sessionId || !phone) throw new Error("AGENT_LEAD_IDENTITY_REQUIRED");
  const id = agentLeadId(isTest, sessionId, phone);
  const leadRef = db.collection(AGENT_LEADS_COLLECTION).doc(id);
  const existing = await leadRef.get();
  const merged = { ...draft, ...overrides };
  const paymentPending = merged.etapa === "pagamento_pendente" || merged.resultado === "pagamento_pendente";
  const data = {
    ...finalLeadDataFromDraft(draft),
    ...overrides,
    estadoRegistro: finalized ? "finalizado" : paymentPending ? "aguardando_pagamento" : "em_atendimento",
    finalizado: finalized,
    finalizarApos: finalized ? null : draft.finalizarApos ?? null,
    ultimaInteracaoEm: draft.ultimaInteracaoEm ?? FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
    finalizadoEm: finalized ? FieldValue.serverTimestamp() : null,
    ...(existing.exists ? {} : { criadoEm: FieldValue.serverTimestamp() }),
  };
  if (deleteDraft) {
    const batch = db.batch();
    batch.set(leadRef, data, { merge: true });
    batch.delete(draftRef);
    await batch.commit();
  } else {
    await leadRef.set(data, { merge: true });
  }
  return id;
};

export const registrarLeadAgente = async (input: AgentLeadInput) => {
  const sessionId = clean(input.sessionId, 100);
  const phone = normalizePhone(input.telefone);
  if (!sessionId || !phone) throw new Error("AGENT_LEAD_IDENTITY_REQUIRED");
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const isTest = input.teste === true;
  const draftId = agentLeadDraftId(isTest, sessionId, phone);
  const draftRef = db.collection(AGENT_LEAD_DRAFTS_COLLECTION).doc(draftId);
  const existing = await draftRef.get();
  const patch = buildAgentLeadPatch(input, sessionId, phone, isTest);
  const existingData = existing.exists ? existing.data()! : {};
  // Depois que uma cobranca foi gerada, uma nova interpretacao da IA nao pode
  // rebaixar o atendimento para uma etapa anterior enquanto o webhook decide.
  if (existingData.resultado === "pagamento_pendente") {
    patch.etapa = "pagamento_pendente";
    patch.resultado = "pagamento_pendente";
  }
  const lastInteractionAt = new Date();
  const finalizeAt = new Date(lastInteractionAt.getTime() + AGENT_LEAD_INACTIVITY_MS);
  const draft = {
    ...existingData,
    ...patch,
    ultimaInteracaoEm: lastInteractionAt,
    finalizarApos: finalizeAt,
  };
  await draftRef.set({
    ...patch,
    ultimaInteracaoEm: lastInteractionAt,
    finalizarApos: finalizeAt,
    atualizadoEm: FieldValue.serverTimestamp(),
    ...(existing.exists ? {} : { criadoEm: FieldValue.serverTimestamp() }),
  }, { merge: true });

  // O mesmo documento fica visivel desde o primeiro sinal comercial e e
  // alimentado durante todo o atendimento. Pagamento pendente continua aberto;
  // a confirmacao da reserva e escrita exclusivamente pelo webhook.
  const terminal = patch.etapa === "encerrado_sem_reserva" || patch.resultado === "nao_convertido";
  const id = await consolidateAgentLead(db, draftRef, draft, {}, terminal, terminal);
  return {
    id,
    rascunhoId: draftId,
    registrado: true,
    rascunho: !terminal,
    estadoRegistro: terminal
      ? "finalizado"
      : patch.etapa === "pagamento_pendente" || patch.resultado === "pagamento_pendente"
        ? "aguardando_pagamento"
        : "em_atendimento",
    finalizaAposMinutos: terminal ? null : AGENT_LEAD_INACTIVITY_MS / 60_000,
  };
};

const requireLeadId = (value: unknown) => {
  const id = clean(value, 180);
  if (!id || id.includes("/")) throw new Error("AGENT_LEAD_ID_INVALID");
  return id;
};

export const atualizarLeadAgente = async (idValue: unknown, input: AgentLeadUpdateInput) => {
  const id = requireLeadId(idValue);
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const ref = db.collection(AGENT_LEADS_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("AGENT_LEAD_NOT_FOUND");
  const patch: FirebaseFirestore.DocumentData = {
    atualizadoEm: FieldValue.serverTimestamp(),
  };
  if (Object.prototype.hasOwnProperty.call(input, "nome")) patch.nome = clean(input.nome, 160) || null;
  if (Object.prototype.hasOwnProperty.call(input, "etapa")) patch.etapa = canonicalLeadStage(input.etapa);
  if (Object.prototype.hasOwnProperty.call(input, "resultado")) patch.resultado = canonicalLeadOutcome(input.resultado);
  if (Object.prototype.hasOwnProperty.call(input, "motivo")) patch.motivo = clean(input.motivo, 240) || null;
  if (Object.prototype.hasOwnProperty.call(input, "proximaAcao")) patch.proximaAcao = clean(input.proximaAcao, 240) || null;
  if (Object.prototype.hasOwnProperty.call(input, "marketingOptIn")) patch.marketingOptIn = input.marketingOptIn === true;
  const existingData = existing.data()!;
  const merged = { ...existingData, ...patch };
  const terminal = merged.etapa === "encerrado_sem_reserva"
    || merged.resultado === "nao_convertido"
    || merged.resultado === "reserva_confirmada";
  if (terminal && existingData.finalizado !== true) {
    patch.estadoRegistro = "finalizado";
    patch.finalizado = true;
    patch.finalizarApos = null;
    patch.finalizadoEm = FieldValue.serverTimestamp();
  }
  const phone = normalizePhone(existingData.telefone);
  const sessionId = clean(existingData.sessionId, 100);
  const draftRef = phone && sessionId
    ? db.collection(AGENT_LEAD_DRAFTS_COLLECTION).doc(agentLeadDraftId(existingData.teste === true, sessionId, phone))
    : null;
  const draft = draftRef ? await draftRef.get() : null;
  const batch = db.batch();
  batch.set(ref, patch, { merge: true });
  if (draftRef && draft?.exists) {
    if (terminal) batch.delete(draftRef);
    else batch.set(draftRef, patch, { merge: true });
  }
  await batch.commit();
  return { id, atualizado: true };
};

export const excluirLeadAgente = async (idValue: unknown) => {
  const id = requireLeadId(idValue);
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const ref = db.collection(AGENT_LEADS_COLLECTION).doc(id);
  const existing = await ref.get();
  if (!existing.exists) return { id, excluido: false };
  const data = existing.data()!;
  const phone = normalizePhone(data.telefone);
  const sessionId = clean(data.sessionId, 100);
  const batch = db.batch();
  batch.delete(ref);
  if (phone && sessionId) {
    batch.delete(db.collection(AGENT_LEAD_DRAFTS_COLLECTION).doc(agentLeadDraftId(data.teste === true, sessionId, phone)));
  }
  await batch.commit();
  return { id, excluido: true };
};

export const excluirTodosLeadsAgente = async () => {
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const removeCollection = async (collectionName: string) => {
    const snapshot = await db.collection(collectionName).get();
    let removed = 0;
    for (let offset = 0; offset < snapshot.docs.length; offset += 450) {
      const batch = db.batch();
      const chunk = snapshot.docs.slice(offset, offset + 450);
      chunk.forEach((document) => batch.delete(document.ref));
      await batch.commit();
      removed += chunk.length;
    }
    return removed;
  };
  const [leads, drafts, reservationDrafts] = await Promise.all([
    removeCollection(AGENT_LEADS_COLLECTION),
    removeCollection(AGENT_LEAD_DRAFTS_COLLECTION),
    removeCollection(AGENT_RESERVATION_DRAFTS_COLLECTION),
  ]);
  return { excluidos: leads, rascunhosExcluidos: drafts, rascunhosReservaExcluidos: reservationDrafts };
};

export const processarRascunhosLeadsAgente = async () => {
  const db = obterFirestoreAdmin();
  if (!db) return { processados: 0, erros: 0 };
  const snapshot = await db.collection(AGENT_LEAD_DRAFTS_COLLECTION)
    .where("finalizarApos", "<=", new Date())
    .limit(100)
    .get();
  let processed = 0;
  let errors = 0;
  for (const document of snapshot.docs) {
    try {
      const draft = document.data();
      const paymentPending = draft.etapa === "pagamento_pendente" || draft.resultado === "pagamento_pendente";
      await consolidateAgentLead(db, document.ref, draft, paymentPending ? {
        etapa: "pagamento_pendente",
        resultado: "pagamento_pendente",
        motivo: "pagamento_nao_identificado_apos_2h",
        proximaAcao: "Avaliar recuperacao do pagamento",
      } : {
        resultado: draft.resultado === "atendimento_humano" ? "atendimento_humano" : "aguardando_cliente",
        motivo: "sem_resposta_ha_2h",
        proximaAcao: "Avaliar recuperacao do atendimento",
      }, true);
      processed += 1;
    } catch (error) {
      errors += 1;
      console.error("[agent-leads] Falha ao consolidar rascunho:", error);
    }
  }
  return { processados: processed, erros: errors };
};

export const finalizarLeadAgentePorEncerramento = async (telefone: unknown) => {
  const phone = normalizePhone(telefone);
  if (!phone) return false;
  const db = obterFirestoreAdmin();
  if (!db) return false;
  const sessionId = `whatsapp_${phone}`;
  const draftRef = db.collection(AGENT_LEAD_DRAFTS_COLLECTION).doc(agentLeadDraftId(false, sessionId, phone));
  const leadRef = db.collection(AGENT_LEADS_COLLECTION).doc(agentLeadId(false, sessionId, phone));
  const [draftSnapshot, leadSnapshot] = await Promise.all([draftRef.get(), leadRef.get()]);
  if (!draftSnapshot.exists && !leadSnapshot.exists) return false;
  const base = draftSnapshot.exists ? draftSnapshot.data()! : leadSnapshot.data()!;
  await consolidateAgentLead(db, draftRef, base, {
    resultado: base.resultado === "em_andamento" ? "aguardando_cliente" : base.resultado,
    motivo: clean(base.motivo, 240) || "atendimento_encerrado_manualmente",
    proximaAcao: base.resultado === "pagamento_pendente" ? "Avaliar recuperacao do pagamento" : null,
  }, draftSnapshot.exists, true);
  await db.collection(AGENT_RESERVATION_DRAFTS_COLLECTION)
    .doc(agentReservationDraftId(false, sessionId, phone))
    .delete();
  return true;
};

let agentLeadFinalizerStarted = false;
export const iniciarFinalizadorLeadsAgente = () => {
  if (agentLeadFinalizerStarted) return;
  agentLeadFinalizerStarted = true;
  const run = () => void Promise.all([
    processarRascunhosLeadsAgente(),
    processarRascunhosReservaAgenteExpirados(),
    processarCheckoutsAgenteExpirados(),
  ]).catch((error) => {
    console.error("[agent-leads] Falha no finalizador:", error);
  });
  setTimeout(run, 15_000).unref();
  setInterval(run, AGENT_LEAD_FINALIZER_INTERVAL_MS).unref();
};

export const concluirLeadAgenteComReserva = async (
  telefone: unknown,
  reservaId: unknown,
  pagamentoId?: unknown,
  telefonesAlternativos: unknown[] = [],
) => {
  const phone = normalizePhone(telefone);
  const reservationId = clean(reservaId, 100);
  if (!phone || !reservationId) return false;
  const db = obterFirestoreAdmin();
  if (!db) return false;
  const sessionId = `whatsapp_${phone}`;
  const draftRef = db.collection(AGENT_LEAD_DRAFTS_COLLECTION).doc(agentLeadDraftId(false, sessionId, phone));
  const draftSnapshot = await draftRef.get();
  const leadId = agentLeadId(false, sessionId, phone);
  const leadRef = db.collection(AGENT_LEADS_COLLECTION).doc(leadId);
  const reservationDraftRef = db.collection(AGENT_RESERVATION_DRAFTS_COLLECTION)
    .doc(agentReservationDraftId(false, sessionId, phone));
  const existing = await leadRef.get();
  const aliasPhones = Array.from(new Set(telefonesAlternativos.map(normalizePhone).filter((value) => value && value !== phone))).slice(0, 5);
  const aliasEntries = await Promise.all(aliasPhones.map(async (aliasPhone) => {
    const aliasSessionId = `whatsapp_${aliasPhone}`;
    const aliasLeadRef = db.collection(AGENT_LEADS_COLLECTION).doc(agentLeadId(false, aliasSessionId, aliasPhone));
    const aliasDraftRef = db.collection(AGENT_LEAD_DRAFTS_COLLECTION).doc(agentLeadDraftId(false, aliasSessionId, aliasPhone));
    const aliasReservationDraftRef = db.collection(AGENT_RESERVATION_DRAFTS_COLLECTION)
      .doc(agentReservationDraftId(false, aliasSessionId, aliasPhone));
    const [aliasLead, aliasDraft] = await Promise.all([aliasLeadRef.get(), aliasDraftRef.get()]);
    return { aliasPhone, aliasLeadRef, aliasDraftRef, aliasReservationDraftRef, aliasLead, aliasDraft };
  }));
  const base: FirebaseFirestore.DocumentData = {};
  const mergeMeaningful = (source?: FirebaseFirestore.DocumentData) => {
    if (!source) return;
    Object.entries(source).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      if (Array.isArray(value) && value.length === 0) return;
      base[key] = value;
    });
  };
  aliasEntries.forEach((entry) => {
    if (entry.aliasLead.exists) mergeMeaningful(entry.aliasLead.data());
    if (entry.aliasDraft.exists) mergeMeaningful(finalLeadDataFromDraft(entry.aliasDraft.data()!));
  });
  if (existing.exists) mergeMeaningful(existing.data());
  if (draftSnapshot.exists) mergeMeaningful(finalLeadDataFromDraft(draftSnapshot.data()!));
  const batch = db.batch();
  batch.set(leadRef, {
    ...base,
    canal: "whatsapp",
    teste: false,
    origem: "agente_whatsapp",
    telefone: phone,
    sessionId,
    etapa: "concluida",
    resultado: "reserva_confirmada",
    motivo: null,
    reservaId: reservationId,
    pagamentoId: clean(pagamentoId, 100) || null,
    proximaAcao: null,
    estadoRegistro: "finalizado",
    finalizado: true,
    finalizarApos: null,
    atualizadoEm: FieldValue.serverTimestamp(),
    finalizadoEm: FieldValue.serverTimestamp(),
    ...(base.criadoEm ? {} : { criadoEm: FieldValue.serverTimestamp() }),
  }, { merge: true });
  if (draftSnapshot.exists) batch.delete(draftRef);
  batch.delete(reservationDraftRef);
  aliasEntries.forEach((entry) => {
    if (entry.aliasLead.exists) batch.delete(entry.aliasLeadRef);
    if (entry.aliasDraft.exists) batch.delete(entry.aliasDraftRef);
    batch.delete(entry.aliasReservationDraftRef);
  });
  await batch.commit();
  const checkoutSnapshots = await Promise.all([phone, ...aliasPhones].map((checkoutPhone) =>
    db.collection(AGENT_CHECKOUT_HANDOFFS_COLLECTION).where("telefone", "==", checkoutPhone).limit(50).get()
  ));
  const checkoutDocuments = checkoutSnapshots.flatMap((snapshot) => snapshot.docs);
  if (checkoutDocuments.length > 0) {
    const checkoutBatch = db.batch();
    checkoutDocuments.forEach((document) => checkoutBatch.delete(document.ref));
    await checkoutBatch.commit();
  }
  return true;
};
