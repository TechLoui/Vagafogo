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
  confirmouResumo?: unknown;
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
  reservaId?: unknown;
  pagamentoId?: unknown;
  pixLinkVagafogo?: unknown;
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
    "atendimento_concluido",
    "encerrado_sem_reserva",
  ]);
  if (exact.has(stage)) return stage;
  if (/conclu|confirmad|reserva_realizada|pagamento_aprovado/.test(stage)) return "concluida";
  if (/atendimento_concluido|duvida_resolvida/.test(stage)) return "atendimento_concluido";
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
    "duvida_resolvida",
    "nao_convertido",
    "atendimento_humano",
  ]);
  if (exact.has(outcome)) return outcome;
  if (/reserva_confirm|pagamento_(aprovado|confirmado)|pago|conclu/.test(outcome)) return "reserva_confirmada";
  if (/duvida.*resolvid|atendimento.*concluid/.test(outcome)) return "duvida_resolvida";
  if (/humano|atendente|handoff/.test(outcome)) return "atendimento_humano";
  if (/nao_convert|sem_reserva|desist|cancel|perdid/.test(outcome)) return "nao_convertido";
  if (/pagamento|pix|cobranca/.test(outcome)) return "pagamento_pendente";
  if (/aguard|sem_resposta|cliente_responder/.test(outcome)) return "aguardando_cliente";
  return "em_andamento";
};
export const leadAgenteEstaFinalizado = (etapa: unknown, resultado: unknown) => {
  const stage = canonicalLeadStage(etapa);
  const outcome = canonicalLeadOutcome(resultado);
  return stage === "atendimento_concluido"
    || stage === "encerrado_sem_reserva"
    || outcome === "duvida_resolvida"
    || outcome === "nao_convertido"
    || outcome === "reserva_confirmada";
};
export const reservaAgenteTemConfirmacaoResumo = (input: Pick<AgentAvailabilityInput, "confirmouResumo">) =>
  input.confirmouResumo === true;

export const cpfValidoParaReservaAgente = (value: unknown) => {
  const cpf = String(value ?? "").replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calculateDigit = (length: number, initialWeight: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (initialWeight - index);
    }
    const digit = (sum * 10) % 11;
    return digit === 10 ? 0 : digit;
  };

  return calculateDigit(9, 10) === Number(cpf[9])
    && calculateDigit(10, 11) === Number(cpf[10]);
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
export const leadPhoneVariants = (value: unknown) => {
  const phone = normalizePhone(value);
  const variants = [phone];
  if (phone.length === 13 && phone[4] === "9") {
    variants.push(`${phone.slice(0, 4)}${phone.slice(5)}`);
  } else if (phone.length === 12 && /^[6-9]$/.test(phone[4] ?? "")) {
    variants.push(`${phone.slice(0, 4)}9${phone.slice(4)}`);
  }
  return Array.from(new Set(variants.filter(Boolean)));
};
export const canonicalLeadPhone = (value: unknown) => {
  const variants = leadPhoneVariants(value);
  return variants.find((phone) => phone.length === 13 && phone.startsWith("55") && phone[4] === "9")
    ?? variants[0]
    ?? "";
};

const agentLeadStageRank: Record<string, number> = {
  contato_iniciado: 0,
  interesse_identificado: 1,
  cotacao: 2,
  dados_em_coleta: 3,
  aguardando_confirmacao: 4,
  pagamento_pendente: 5,
  atendimento_humano: 6,
  atendimento_concluido: 7,
  encerrado_sem_reserva: 7,
  concluida: 8,
};

const agentLeadCycleReset: FirebaseFirestore.DocumentData = {
  motivo: null,
  dataDesejada: null,
  horarioDesejado: null,
  participantes: null,
  valorEstimado: null,
  formaPagamento: null,
  reservaId: null,
  pagamentoId: null,
  pacoteIds: [],
  atividades: [],
  proximaAcao: null,
  resumo: null,
  tentativasRetomada: 0,
  ultimaRetomadaEm: null,
  suspensoPorInatividade: false,
};

export const resolverTransicaoLeadAgente = (
  currentValue: FirebaseFirestore.DocumentData = {},
  incomingValue: FirebaseFirestore.DocumentData = {},
) => {
  const current = { ...currentValue };
  const incoming = { ...incomingValue };
  const currentStage = canonicalLeadStage(current.etapa);
  const currentOutcome = canonicalLeadOutcome(current.resultado);
  const incomingStage = canonicalLeadStage(incoming.etapa);
  const incomingOutcome = canonicalLeadOutcome(incoming.resultado);
  const incomingTerminal = leadAgenteEstaFinalizado(incomingStage, incomingOutcome);
  const currentlyFinalized = current.finalizado === true
    || String(current.estadoRegistro ?? "") === "finalizado"
    || Boolean(current.finalizadoEm)
    || leadAgenteEstaFinalizado(currentStage, currentOutcome);

  // Um retorno tardio da IA nunca pode rebaixar uma reserva cujo webhook ja
  // confirmou. Uma conversa realmente nova chega sem os identificadores da
  // cobranca/reserva anterior e pode reabrir normalmente o mesmo contato.
  if (currentOutcome === "reserva_confirmada" && !incomingTerminal) {
    const currentReservationId = clean(current.reservaId, 100);
    const currentPaymentId = clean(current.pagamentoId, 100);
    const incomingReservationId = clean(incoming.reservaId, 100);
    const incomingPaymentId = clean(incoming.pagamentoId, 100);
    const sameConversion = incomingStage === "pagamento_pendente"
      || Boolean(incomingReservationId && currentReservationId && incomingReservationId === currentReservationId)
      || Boolean(incomingPaymentId && currentPaymentId && incomingPaymentId === currentPaymentId);
    if (sameConversion) {
      return {
        patch: {
          ...incoming,
          etapa: "concluida",
          resultado: "reserva_confirmada",
          reservaId: currentReservationId || incomingReservationId || null,
          pagamentoId: currentPaymentId || incomingPaymentId || null,
          proximaAcao: null,
        },
        reaberto: false,
        retomado: false,
        regressaoIgnorada: true,
      };
    }
  }

  if (currentlyFinalized && !incomingTerminal) {
    const suspendedCycle = currentOutcome === "aguardando_cliente" || currentOutcome === "pagamento_pendente";
    return {
      patch: {
        ...(suspendedCycle ? {
          motivo: null,
          proximaAcao: null,
          tentativasRetomada: 0,
          ultimaRetomadaEm: null,
          suspensoPorInatividade: false,
        } : agentLeadCycleReset),
        ...incoming,
        cicloAtendimento: suspendedCycle
          ? Math.max(1, nonNegativeInteger(current.cicloAtendimento, 10_000) || 1)
          : Math.max(1, nonNegativeInteger(current.cicloAtendimento, 10_000) || 1) + 1,
        reabertoEm: suspendedCycle ? current.reabertoEm ?? null : new Date(),
        retomadoEm: suspendedCycle ? new Date() : null,
        finalizado: false,
        finalizadoEm: null,
      },
      reaberto: !suspendedCycle,
      retomado: suspendedCycle,
      regressaoIgnorada: false,
    };
  }

  const patch = { ...incoming };
  if (!incomingTerminal && (agentLeadStageRank[incomingStage] ?? 0) < (agentLeadStageRank[currentStage] ?? 0)) {
    patch.etapa = currentStage;
  }
  if (currentOutcome === "pagamento_pendente" && incomingOutcome !== "reserva_confirmada") {
    patch.etapa = "pagamento_pendente";
    patch.resultado = "pagamento_pendente";
  } else if (currentOutcome === "atendimento_humano" && !incomingTerminal) {
    patch.etapa = "atendimento_humano";
    patch.resultado = "atendimento_humano";
  }
  return {
    patch,
    reaberto: false,
    retomado: false,
    regressaoIgnorada: patch.etapa !== incoming.etapa || patch.resultado !== incoming.resultado,
  };
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

  const comboHasCustomPrice = Boolean(combo && types.some((type) => priceForType(combo.raw, type) > 0));
  const comboFixedPrice = combo ? Math.max(0, Number(combo.raw.preco) || 0) : 0;
  const comboDiscount = combo ? Math.min(100, Math.max(0, Number(combo.raw.desconto) || 0)) : 0;
  const unitPriceForOffer = (type: CustomerType) => {
    if (offerType === "combo" && combo) {
      if (comboHasCustomPrice) return priceForType(combo.raw, type);
      if (comboFixedPrice > 0) return comboFixedPrice;
      const packageSum = packages.reduce((total, record) => total + priceForType(record.raw, type), 0);
      return packageSum * (1 - comboDiscount / 100);
    }
    return packages.reduce((total, record) => total + priceForType(record.raw, type), 0);
  };
  const quote = types
    .map((type) => {
      const quantity = nonNegativeInteger(participation.participants[typeKey(type)]);
      const unitPrice = Math.round(unitPriceForOffer(type) * 100) / 100;
      return {
        tipoId: typeKey(type),
        nome: type.nome,
        quantidade: quantity,
        idades: participation.ages[typeKey(type)] ?? [],
        precoUnitario: unitPrice,
        subtotal: Math.round(quantity * unitPrice * 100) / 100,
      };
    })
    .filter((item) => item.quantidade > 0);
  const value = Math.round(quote.reduce((total, item) => total + item.subtotal, 0) * 100) / 100;
  const offerName = offerType === "combo" ? clean(combo!.raw.nome, 160) : clean(packages[0].raw.nome, 160);
  const pending = Array.from(new Set([
    ...participation.pending,
    ...questionValidation.pending,
    ...petRequirements,
    ...(owns(input, "cpf") && clean(input.cpf, 40) && !cpfValidoParaReservaAgente(input.cpf)
      ? ["Informe um CPF valido antes de confirmar o resumo ou criar o pagamento."]
      : []),
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
    cotacao: quote,
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
  if (!reservaAgenteTemConfirmacaoResumo(input)) throw new Error("AGENT_CHECKOUT_SUMMARY_CONFIRMATION_REQUIRED");
  const availability = await simularReservaAgente(input);
  if (!availability.disponivel) {
    throw new Error(`AGENT_CHECKOUT_UNAVAILABLE:${availability.motivos.join(",")}`);
  }
  if (!availability.prontoParaPagamento) {
    throw new Error(`AGENT_CHECKOUT_INCOMPLETE:${availability.requisitosPendentes.join(" | ")}`);
  }

  const nome = clean(input.nome, 160);
  const email = clean(input.email, 240).toLowerCase();
  const cpf = String(input.cpf ?? "").replace(/\D/g, "");
  const telefone = normalizePhone(input.telefone);
  if (!nome || !/^\S+@\S+\.\S+$/.test(email) || !cpfValidoParaReservaAgente(cpf) || telefone.length < 10) {
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

export const criarLinkPixExistenteAgente = async (input: {
  reservaId?: unknown;
  paymentId?: unknown;
  telefone?: unknown;
}) => {
  const reservaId = clean(input.reservaId, 100);
  const paymentId = clean(input.paymentId, 100);
  const telefone = normalizePhone(input.telefone);
  if (!reservaId || !paymentId || telefone.length < 10) {
    throw new Error("AGENT_EXISTING_PIX_IDENTITY_REQUIRED");
  }

  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const reservationSnapshot = await db.collection("reservas").doc(reservaId).get();
  if (!reservationSnapshot.exists) throw new Error("AGENT_EXISTING_PIX_RESERVATION_NOT_FOUND");
  const reservation = reservationSnapshot.data()!;
  if (clean(reservation.asaasPaymentId, 100) !== paymentId) {
    throw new Error("AGENT_EXISTING_PIX_PAYMENT_MISMATCH");
  }
  const reservationPhone = normalizePhone(reservation.telefone);
  if (!leadPhoneVariants(reservationPhone).some((value) => leadPhoneVariants(telefone).includes(value))) {
    throw new Error("AGENT_EXISTING_PIX_PHONE_MISMATCH");
  }

  const attempts = await db.collection("_payment_idempotency")
    .where("paymentId", "==", paymentId)
    .limit(1)
    .get();
  const responseBody = attempts.docs[0]?.data()?.responseBody;
  const charge = responseBody && typeof responseBody === "object"
    ? (responseBody as Record<string, any>).cobranca
    : null;
  const pixKey = clean(charge?.pixKey, 2_000);
  const qrCodeImage = String(charge?.qrCodeImage ?? "").trim();
  if (!pixKey || !qrCodeImage.startsWith("data:image/")) {
    throw new Error("AGENT_EXISTING_PIX_DATA_UNAVAILABLE");
  }

  const pacoteIds = Array.isArray(reservation.pacoteIds)
    ? reservation.pacoteIds.map((value: unknown) => clean(value, 100)).filter(Boolean)
    : [];
  const comboId = clean(reservation.comboId, 100);
  const offerId = comboId || pacoteIds[0] || "";
  if (!offerId || pacoteIds.length === 0) throw new Error("AGENT_EXISTING_PIX_OFFER_UNAVAILABLE");
  const firstParticipationGroup = Array.isArray(reservation.gruposParticipacao)
    && reservation.gruposParticipacao[0]
    && typeof reservation.gruposParticipacao[0] === "object"
    ? reservation.gruposParticipacao[0] as Record<string, unknown>
    : {};

  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + AGENT_CHECKOUT_HANDOFF_TTL_MS);
  const payload = {
    version: 1,
    tipo: "pix_existente",
    tipoOferta: comboId ? "combo" : "pacote",
    ofertaId: offerId,
    ofertaNome: clean(reservation.atividade, 240),
    pacoteIds,
    data: clean(reservation.data, 20),
    horario: clean(reservation.horario, 20),
    horariosPorPacote: timeMap(reservation.horariosPorPacote),
    participantesPorTipo: numericMap(reservation.participantesPorTipo),
    idadesPorTipo: ageMap(reservation.idadesPorTipo ?? firstParticipationGroup.idadesPorTipo),
    perguntasPersonalizadas: customQuestionAnswers(reservation.perguntasPersonalizadas),
    confirmouCarteirinhaBariatrica: reservation.confirmouCarteirinhaBariatrica === true,
    nome: clean(reservation.nome, 160),
    email: clean(reservation.email, 240),
    cpf: String(reservation.cpf ?? "").replace(/\D/g, ""),
    telefone: reservationPhone,
    temPet: reservation.temPet === true,
    whatsappMarketingOptIn: reservation.whatsappMarketingOptIn === true,
    formaPagamento: "PIX",
    valorValidado: Number(reservation.valor ?? 0),
    reservaId,
    paymentId,
    pixKey,
    qrCodeImage,
    pixExpirationDate: clean(charge?.expirationDate, 80) || null,
    sessionId: clean(reservation.atribuicao?.sessionId, 100) || null,
    geradoEm: now.toISOString(),
    expiraEm: expiresAt.toISOString(),
  };
  await db.collection(AGENT_CHECKOUT_HANDOFFS_COLLECTION).doc(checkoutTokenHash(token)).set({
    payload,
    telefone: reservationPhone,
    sessionId: payload.sessionId,
    reservaId,
    paymentId,
    tipo: "pix_existente",
    criadoEm: now,
    expiraEm: expiresAt,
    acessos: 0,
  });

  return {
    url: `https://vagafogo.com.br/reservar?agent_checkout=${encodeURIComponent(token)}`,
    expiraEmMinutos: 120,
    expiraEm: expiresAt.toISOString(),
    reservaId,
    paymentId,
  };
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
  const isTest = input.teste === true;
  const rawPhone = normalizePhone(input.telefone);
  const phone = isTest ? rawPhone : canonicalLeadPhone(rawPhone);
  if (!sessionId || !phone) throw new Error("AGENT_RESERVATION_DRAFT_IDENTITY_REQUIRED");
  const canonicalSessionId = isTest ? sessionId : `whatsapp_${phone}`;
  return {
    sessionId: canonicalSessionId,
    phone,
    isTest,
    id: agentReservationDraftId(isTest, canonicalSessionId, phone),
  };
};

const reservationDraftAliasRefs = (
  db: FirebaseFirestore.Firestore,
  input: AgentReservationDraftInput,
  identity: ReturnType<typeof reservationDraftIdentity>,
) => {
  if (identity.isTest) return [] as FirebaseFirestore.DocumentReference[];
  return leadPhoneVariants(input.telefone)
    .filter((phone) => phone !== identity.phone)
    .map((phone) => {
      const sessionId = `whatsapp_${phone}`;
      return db.collection(AGENT_RESERVATION_DRAFTS_COLLECTION)
        .doc(agentReservationDraftId(false, sessionId, phone));
    });
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
    const cpf = String(input.cpf ?? "").replace(/\D/g, "");
    if (cpf) patch.cpf = cpf;
  }
  if (owns(input, "horariosPorPacote")) patch.horariosPorPacote = timeMap(input.horariosPorPacote);
  if (owns(input, "participantesPorTipo")) patch.participantesPorTipo = numericMap(input.participantesPorTipo);
  if (owns(input, "idadesPorTipo")) patch.idadesPorTipo = ageMap(input.idadesPorTipo);
  if (owns(input, "perguntasPersonalizadas")) patch.perguntasPersonalizadas = customQuestionAnswers(input.perguntasPersonalizadas);
  for (const key of ["confirmouCarteirinhaBariatrica", "temPet", "whatsappMarketingOptIn", "confirmouResumo"] as const) {
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
  copyText("reservaId", 100);
  copyText("pagamentoId", 100);
  copyText("pixLinkVagafogo", 500);
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
  const aliasRefs = reservationDraftAliasRefs(db, input, identity);
  const [existing, ...aliasSnapshots] = await Promise.all([ref.get(), ...aliasRefs.map((aliasRef) => aliasRef.get())]);
  const previous = aliasSnapshots.reduce<Record<string, unknown>>((merged, snapshot) => {
    const data = snapshot.exists ? snapshot.data()?.dados : null;
    return data && typeof data === "object" ? mergeReservationDraft(merged, data as Record<string, unknown>) : merged;
  }, {});
  if (existing.exists && existing.data()?.dados && typeof existing.data()!.dados === "object") {
    Object.assign(previous, mergeReservationDraft(previous, existing.data()!.dados as Record<string, unknown>));
  }
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
  const existingAliasRefs = aliasRefs.filter((_, index) => aliasSnapshots[index]?.exists);
  if (existingAliasRefs.length) {
    const batch = db.batch();
    existingAliasRefs.forEach((aliasRef) => batch.delete(aliasRef));
    await batch.commit();
  }
  return { encontrado: true, dados, expiraEm: expiresAt.toISOString() };
};

export const obterRascunhoReservaAgente = async (input: AgentReservationDraftInput) => {
  const identity = reservationDraftIdentity(input);
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const ref = db.collection(AGENT_RESERVATION_DRAFTS_COLLECTION).doc(identity.id);
  const aliasRefs = reservationDraftAliasRefs(db, input, identity);
  let snapshot = await ref.get();
  let sourceRef = ref;
  if (!snapshot.exists) {
    for (const aliasRef of aliasRefs) {
      const aliasSnapshot = await aliasRef.get();
      if (!aliasSnapshot.exists) continue;
      snapshot = aliasSnapshot;
      sourceRef = aliasRef;
      break;
    }
  }
  if (!snapshot.exists) return { encontrado: false, dados: {} };
  const stored = snapshot.data()!;
  const storedExpiry = stored.expiraEm?.toDate?.();
  if (!(storedExpiry instanceof Date) || storedExpiry.getTime() <= Date.now()) {
    await sourceRef.delete();
    return { encontrado: false, dados: {} };
  }
  const now = new Date();
  const expiresAt = new Date(now.getTime() + AGENT_RESERVATION_DRAFT_TTL_MS);
  if (sourceRef.path !== ref.path) {
    const batch = db.batch();
    batch.set(ref, {
      ...stored,
      sessionId: identity.sessionId,
      telefone: identity.phone,
      ultimaInteracaoEm: now,
      expiraEm: expiresAt,
      atualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: false });
    batch.delete(sourceRef);
    await batch.commit();
  } else {
    await ref.set({ ultimaInteracaoEm: now, expiraEm: expiresAt, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
  }
  const dados = stored.dados && typeof stored.dados === "object" ? stored.dados as Record<string, unknown> : {};
  return { encontrado: true, dados, expiraEm: expiresAt.toISOString() };
};

export const excluirRascunhoReservaAgente = async (input: AgentReservationDraftInput) => {
  const identity = reservationDraftIdentity(input);
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const ref = db.collection(AGENT_RESERVATION_DRAFTS_COLLECTION).doc(identity.id);
  const refs = [ref, ...reservationDraftAliasRefs(db, input, identity)];
  const snapshots = await Promise.all(refs.map((item) => item.get()));
  const existingRefs = refs.filter((_, index) => snapshots[index]?.exists);
  if (existingRefs.length) {
    const batch = db.batch();
    existingRefs.forEach((item) => batch.delete(item));
    await batch.commit();
  }
  return { excluido: existingRefs.length > 0 };
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
  };
  if (owns(input, "marketingOptIn")) patch.marketingOptIn = input.marketingOptIn === true;
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

const mergeMeaningfulLeadData = (
  target: FirebaseFirestore.DocumentData,
  source?: FirebaseFirestore.DocumentData,
) => {
  if (!source) return target;
  Object.entries(source).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null && target[key] !== undefined) return;
    if (Array.isArray(value) && value.length === 0 && Array.isArray(target[key]) && target[key].length > 0) return;
    if (value === "" && target[key] !== undefined) return;
    target[key] = value;
  });
  return target;
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
  const requestedSessionId = clean(input.sessionId, 100);
  const rawPhone = normalizePhone(input.telefone);
  if (!requestedSessionId || !rawPhone) throw new Error("AGENT_LEAD_IDENTITY_REQUIRED");
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const isTest = input.teste === true;
  const phone = isTest ? rawPhone : canonicalLeadPhone(rawPhone);
  const sessionId = isTest ? requestedSessionId : `whatsapp_${phone}`;
  const draftId = agentLeadDraftId(isTest, sessionId, phone);
  const draftRef = db.collection(AGENT_LEAD_DRAFTS_COLLECTION).doc(draftId);
  const leadRef = db.collection(AGENT_LEADS_COLLECTION).doc(agentLeadId(isTest, sessionId, phone));
  const [existing, existingLead] = await Promise.all([draftRef.get(), leadRef.get()]);

  const aliases = isTest ? [] : leadPhoneVariants(rawPhone).filter((candidate) => candidate !== phone);
  const aliasEntries = await Promise.all(aliases.map(async (aliasPhone) => {
    const aliasSessionId = `whatsapp_${aliasPhone}`;
    const aliasDraftRef = db.collection(AGENT_LEAD_DRAFTS_COLLECTION)
      .doc(agentLeadDraftId(false, aliasSessionId, aliasPhone));
    const aliasLeadRef = db.collection(AGENT_LEADS_COLLECTION)
      .doc(agentLeadId(false, aliasSessionId, aliasPhone));
    const [aliasDraft, aliasLead] = await Promise.all([aliasDraftRef.get(), aliasLeadRef.get()]);
    return { aliasDraftRef, aliasLeadRef, aliasDraft, aliasLead };
  }));

  const currentData: FirebaseFirestore.DocumentData = {};
  const sources = [
    ...aliasEntries.flatMap((entry) => [
      ...(entry.aliasLead.exists ? [entry.aliasLead.data()!] : []),
      ...(entry.aliasDraft.exists ? [entry.aliasDraft.data()!] : []),
    ]),
    ...(existingLead.exists ? [existingLead.data()!] : []),
    ...(existing.exists ? [existing.data()!] : []),
  ].sort((a, b) => Number(canonicalLeadOutcome(a.resultado) === "reserva_confirmada")
    - Number(canonicalLeadOutcome(b.resultado) === "reserva_confirmada"));
  sources.forEach((source) => mergeMeaningfulLeadData(currentData, source));

  const incomingPatch = buildAgentLeadPatch(input, sessionId, phone, isTest);
  const transition = resolverTransicaoLeadAgente(currentData, incomingPatch);
  const patch: FirebaseFirestore.DocumentData = {
    ...transition.patch,
    telefone: phone,
    sessionId,
    cicloAtendimento: transition.patch.cicloAtendimento
      ?? Math.max(1, nonNegativeInteger(currentData.cicloAtendimento, 10_000) || 1),
    inatividadeGerenciada: !isTest,
    // Toda chamada de registro decorre de uma nova mensagem do cliente; ao
    // retomar, a contagem anterior deixa de valer para este novo intervalo.
    tentativasRetomada: nonNegativeInteger(transition.patch.tentativasRetomada, 3),
  };
  const lastInteractionAt = new Date();
  // No WhatsApp, o gateway e a fonte da verdade para a inatividade: ele envia
  // duas retomadas respeitando a janela de horario e so entao suspende. O timer
  // local de 2h permanece apenas no simulador, onde nao existe gateway.
  const finalizeAt = isTest ? new Date(lastInteractionAt.getTime() + AGENT_LEAD_INACTIVITY_MS) : null;
  const draft = {
    ...currentData,
    ...patch,
    ultimaInteracaoEm: lastInteractionAt,
    finalizarApos: finalizeAt,
    finalizado: false,
    finalizadoEm: null,
  };
  await draftRef.set({
    ...patch,
    ultimaInteracaoEm: lastInteractionAt,
    finalizarApos: finalizeAt,
    finalizado: false,
    finalizadoEm: null,
    atualizadoEm: FieldValue.serverTimestamp(),
    ...((existing.exists || aliasEntries.some((entry) => entry.aliasDraft.exists)) ? {} : { criadoEm: FieldValue.serverTimestamp() }),
  }, { merge: true });

  // O mesmo documento fica visivel desde o primeiro sinal comercial e e
  // alimentado durante todo o atendimento. Pagamento pendente continua aberto;
  // a confirmacao da reserva e escrita exclusivamente pelo webhook.
  const terminal = leadAgenteEstaFinalizado(patch.etapa, patch.resultado);
  const id = await consolidateAgentLead(db, draftRef, draft, {}, terminal, terminal);
  const duplicateRefs = aliasEntries.flatMap((entry) => [
    ...(entry.aliasDraft.exists ? [entry.aliasDraftRef] : []),
    ...(entry.aliasLead.exists ? [entry.aliasLeadRef] : []),
  ]);
  if (duplicateRefs.length) {
    const batch = db.batch();
    duplicateRefs.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
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
    finalizaAposMinutos: terminal || !isTest ? null : AGENT_LEAD_INACTIVITY_MS / 60_000,
    cicloAtendimento: patch.cicloAtendimento,
    reaberto: transition.reaberto,
    retomado: transition.retomado,
    regressaoIgnorada: transition.regressaoIgnorada,
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
  const terminal = leadAgenteEstaFinalizado(merged.etapa, merged.resultado);
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

type AgentIntegritySeverity = "critica" | "atencao";
type AgentIntegrityIssue = {
  id: string;
  tipo: string;
  severidade: AgentIntegritySeverity;
  titulo: string;
  descricao: string;
  leadId?: string;
  reservaId?: string;
  detectadoEm?: string;
};

const integrityTimestamp = (value: unknown) => {
  if (value && typeof value === "object") {
    const timestamp = value as { toMillis?: () => number; toDate?: () => Date };
    if (typeof timestamp.toMillis === "function") return timestamp.toMillis();
    if (typeof timestamp.toDate === "function") return timestamp.toDate().getTime();
  }
  const parsed = new Date(value as string | number | Date).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const maskedIntegrityPhone = (value: unknown) => {
  const phone = canonicalLeadPhone(value);
  if (!phone) return "telefone não identificado";
  return `final ${phone.slice(-4)}`;
};

const reservationAgentSession = (data: FirebaseFirestore.DocumentData) => {
  const attribution = data.atribuicao && typeof data.atribuicao === "object"
    ? data.atribuicao as Record<string, unknown>
    : {};
  return clean(attribution.agentSessionId ?? data.agentSessionId, 100);
};

const reservationAgentPhone = (data: FirebaseFirestore.DocumentData) => {
  const match = /^whatsapp_(\d{10,15})$/i.exec(reservationAgentSession(data));
  return canonicalLeadPhone(match?.[1] ?? data.telefone ?? data.Telefone);
};

const reservationCameFromAgent = (data: FirebaseFirestore.DocumentData) => {
  const attribution = data.atribuicao && typeof data.atribuicao === "object"
    ? data.atribuicao as Record<string, unknown>
    : {};
  const source = normalizeText(attribution.sourceChannel ?? data.canalOrigem);
  const medium = normalizeText(attribution.utmMedium);
  return source === "whatsapp" && (medium === "agente" || Boolean(reservationAgentSession(data)));
};

const reservationIsConfirmed = (data: FirebaseFirestore.DocumentData) => data.confirmada === true
  || /^(pago|paid|confirmad[ao])$/.test(normalizeText(data.status));

const reservationIntegrityDate = (document: FirebaseFirestore.QueryDocumentSnapshot) => {
  const data = document.data();
  return integrityTimestamp(data.dataPagamento)
    || integrityTimestamp(data.atualizadoEm)
    || integrityTimestamp(data.criadoEm)
    || document.createTime.toMillis();
};

const reservationIntentKey = (data: FirebaseFirestore.DocumentData) => {
  const offer = clean(data.comboId ?? data.pacoteId ?? data.ofertaId ?? data.atividade ?? data.Atividade, 160);
  const date = clean(data.data ?? data.Data, 20);
  const time = clean(data.horario ?? data.Horario, 20);
  return [reservationAgentPhone(data), normalizeText(offer), date, time].join("|");
};

export const diagnosticarIntegridadeAgente = async (periodoDiasValue: unknown = 30) => {
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const periodoDias = Math.min(90, Math.max(1, nonNegativeInteger(periodoDiasValue, 90) || 30));
  const cutoff = Date.now() - periodoDias * 24 * 60 * 60 * 1000;
  const [leadSnapshot, reservationSnapshot, notificationSnapshot] = await Promise.all([
    db.collection(AGENT_LEADS_COLLECTION).limit(1000).get(),
    db.collection("reservas").limit(1000).get(),
    db.collection("whatsapp_notificacoes_internas").limit(500).get(),
  ]);
  const issues: AgentIntegrityIssue[] = [];
  const addIssue = (issue: AgentIntegrityIssue) => {
    if (!issues.some((item) => item.id === issue.id)) issues.push(issue);
  };

  const leads = leadSnapshot.docs
    .map((document) => ({ id: document.id, data: document.data() }))
    .filter((item) => item.data.teste !== true);
  const leadsByPhone = new Map<string, Array<{ id: string; data: FirebaseFirestore.DocumentData }>>();
  leads.forEach((lead) => {
    const phone = canonicalLeadPhone(lead.data.telefone);
    if (!phone) return;
    const group = leadsByPhone.get(phone) ?? [];
    group.push(lead);
    leadsByPhone.set(phone, group);
  });
  leadsByPhone.forEach((group, phone) => {
    if (group.length < 2) return;
    addIssue({
      id: `lead-duplicado:${phone}`,
      tipo: "lead_duplicado",
      severidade: "critica",
      titulo: "Mais de um lead para o mesmo contato",
      descricao: `${group.length} registros encontrados para o ${maskedIntegrityPhone(phone)}. O fluxo deve manter apenas um lead consolidado.`,
      leadId: group[0].id,
    });
  });

  leads.forEach((lead) => {
    const result = canonicalLeadOutcome(lead.data.resultado);
    const updatedAt = integrityTimestamp(lead.data.atualizadoEm) || integrityTimestamp(lead.data.finalizadoEm);
    if (result === "reserva_confirmada" && !clean(lead.data.reservaId, 100)) {
      addIssue({
        id: `lead-confirmado-sem-reserva:${lead.id}`,
        tipo: "lead_confirmado_sem_reserva",
        severidade: "critica",
        titulo: "Lead confirmado sem vínculo com a reserva",
        descricao: `O lead do ${maskedIntegrityPhone(lead.data.telefone)} está convertido, mas não possui reservaId.`,
        leadId: lead.id,
        detectadoEm: updatedAt ? new Date(updatedAt).toISOString() : undefined,
      });
    }
    if (result === "pagamento_pendente" && updatedAt > 0 && updatedAt <= Date.now() - AGENT_LEAD_INACTIVITY_MS) {
      addIssue({
        id: `pagamento-pendente:${lead.id}`,
        tipo: "pagamento_pendente",
        severidade: "atencao",
        titulo: "Pagamento pendente há mais de 2 horas",
        descricao: `O ${maskedIntegrityPhone(lead.data.telefone)} está disponível para uma estratégia de recuperação.`,
        leadId: lead.id,
        detectadoEm: new Date(updatedAt).toISOString(),
      });
    }
  });

  const agentReservations = reservationSnapshot.docs.filter((document) => {
    const data = document.data();
    return reservationCameFromAgent(data) && reservationIntegrityDate(document) >= cutoff;
  });
  const reservationsByIntent = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
  agentReservations.forEach((document) => {
    const key = reservationIntentKey(document.data());
    if (!key.replace(/\|/g, "")) return;
    const group = reservationsByIntent.get(key) ?? [];
    group.push(document);
    reservationsByIntent.set(key, group);
  });
  reservationsByIntent.forEach((group, key) => {
    const confirmed = group.filter((item) => reservationIsConfirmed(item.data()));
    const pending = group.filter((item) => !reservationIsConfirmed(item.data()));
    if (!confirmed.length || !pending.length) return;
    addIssue({
      id: `reserva-provisoria-duplicada:${key}`,
      tipo: "reserva_provisoria_duplicada",
      severidade: "critica",
      titulo: "Reserva confirmada com tentativa pendente duplicada",
      descricao: `${pending.length} tentativa(s) pendente(s) devem ser consolidadas com a reserva confirmada ${confirmed[0].id}.`,
      reservaId: confirmed[0].id,
      detectadoEm: new Date(Math.max(...group.map(reservationIntegrityDate))).toISOString(),
    });
  });

  for (const reservation of agentReservations) {
    const data = reservation.data();
    if (!reservationIsConfirmed(data)) continue;
    const phone = reservationAgentPhone(data);
    const matchingLead = leads.find((lead) => clean(lead.data.reservaId, 100) === reservation.id)
      ?? (phone ? leadsByPhone.get(phone)?.find((lead) => canonicalLeadOutcome(lead.data.resultado) === "reserva_confirmada") : undefined);
    const reservationAt = reservationIntegrityDate(reservation);
    if (!matchingLead) {
      addIssue({
        id: `reserva-sem-lead:${reservation.id}`,
        tipo: "reserva_confirmada_sem_lead",
        severidade: "critica",
        titulo: "Reserva paga sem lead convertido",
        descricao: `A reserva ${reservation.id} foi confirmada pelo agente, mas o CRM não possui o lead finalizado correspondente (${maskedIntegrityPhone(phone)}).`,
        reservaId: reservation.id,
        detectadoEm: new Date(reservationAt).toISOString(),
      });
    }
    const confirmationSent = data.whatsappAgenteConfirmacaoPagamentoEnviado === true;
    const confirmationError = clean(data.whatsappAgenteConfirmacaoPagamentoErro, 240);
    const confirmationLate = reservationAt <= Date.now() - 10 * 60 * 1000;
    if (!confirmationSent && confirmationError) {
      addIssue({
        id: `confirmacao-erro:${reservation.id}`,
        tipo: "confirmacao_whatsapp_erro",
        severidade: "critica",
        titulo: "Falha no agradecimento da reserva paga",
        descricao: `A confirmação da reserva ${reservation.id} falhou: ${confirmationError}.`,
        reservaId: reservation.id,
        detectadoEm: new Date(reservationAt).toISOString(),
      });
    } else if (!confirmationSent && confirmationLate) {
      addIssue({
        id: `confirmacao-pendente:${reservation.id}`,
        tipo: "confirmacao_whatsapp_pendente",
        severidade: "atencao",
        titulo: "Agradecimento ainda não enviado",
        descricao: `A reserva ${reservation.id} está paga há mais de 10 minutos sem confirmação no WhatsApp do cliente.`,
        reservaId: reservation.id,
        detectadoEm: new Date(reservationAt).toISOString(),
      });
    }
  }

  notificationSnapshot.docs.forEach((document) => {
    const data = document.data();
    const eventAt = integrityTimestamp(data.atualizadoEm) || integrityTimestamp(data.erroEm) || document.createTime.toMillis();
    if (eventAt < cutoff || normalizeText(data.status) !== "erro") return;
    addIssue({
      id: `aviso-interno-erro:${document.id}`,
      tipo: "aviso_nova_reserva_erro",
      severidade: "atencao",
      titulo: "Aviso interno de nova reserva falhou",
      descricao: `O aviso da reserva ${document.id} para a equipe terminou em erro: ${clean(data.ultimoErro, 240) || "motivo não informado"}.`,
      reservaId: document.id,
      detectadoEm: new Date(eventAt).toISOString(),
    });
  });

  issues.sort((left, right) => {
    if (left.severidade !== right.severidade) return left.severidade === "critica" ? -1 : 1;
    return String(right.detectadoEm ?? "").localeCompare(String(left.detectadoEm ?? ""));
  });
  const criticas = issues.filter((item) => item.severidade === "critica").length;
  const atencao = issues.length - criticas;
  return {
    ok: issues.length === 0,
    periodoDias,
    resumo: { criticas, atencao, total: issues.length },
    itens: issues.slice(0, 50),
    analisados: {
      leads: leads.length,
      reservas: agentReservations.length,
      notificacoes: notificationSnapshot.size,
    },
  };
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
      if (draft.inatividadeGerenciada === true && draft.teste !== true) {
        // O gateway ainda nao concluiu as duas tentativas. Nao feche antes
        // dele, principalmente quando a janela 18:00-07:45 adiou os envios.
        continue;
      }
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

const localizarLeadAgentePorTelefone = async (db: FirebaseFirestore.Firestore, telefone: unknown) => {
  const phoneVariants = leadPhoneVariants(telefone);
  const canonical = canonicalLeadPhone(telefone);
  const orderedPhones = Array.from(new Set([canonical, ...phoneVariants].filter(Boolean)));
  for (const phone of orderedPhones) {
    const sessionId = `whatsapp_${phone}`;
    const draftRef = db.collection(AGENT_LEAD_DRAFTS_COLLECTION).doc(agentLeadDraftId(false, sessionId, phone));
    const leadRef = db.collection(AGENT_LEADS_COLLECTION).doc(agentLeadId(false, sessionId, phone));
    const [draftSnapshot, leadSnapshot] = await Promise.all([draftRef.get(), leadRef.get()]);
    if (draftSnapshot.exists || leadSnapshot.exists) {
      return { phone, sessionId, draftRef, leadRef, draftSnapshot, leadSnapshot };
    }
  }
  return null;
};

export const registrarInatividadeLeadAgente = async (telefone: unknown, tentativaValue: unknown) => {
  const tentativa = Math.min(3, Math.max(1, nonNegativeInteger(tentativaValue, 3)));
  const db = obterFirestoreAdmin();
  if (!db) return { atualizado: false, motivo: "firebase_indisponivel" };
  const located = await localizarLeadAgentePorTelefone(db, telefone);
  if (!located) return { atualizado: false, motivo: "lead_nao_encontrado" };
  const { draftRef, leadRef, draftSnapshot, leadSnapshot } = located;
  const base = draftSnapshot.exists ? draftSnapshot.data()! : leadSnapshot.data()!;
  const stage = canonicalLeadStage(base.etapa);
  const outcome = canonicalLeadOutcome(base.resultado);
  if (outcome === "reserva_confirmada" || outcome === "duvida_resolvida" || stage === "concluida") {
    return { atualizado: false, motivo: "lead_ja_finalizado" };
  }
  if (stage === "atendimento_humano" || outcome === "atendimento_humano") {
    return { atualizado: false, motivo: "atendimento_humano" };
  }

  const paymentPending = stage === "pagamento_pendente" || outcome === "pagamento_pendente";
  if (tentativa < 3) {
    const patch: FirebaseFirestore.DocumentData = {
      tentativasRetomada: Math.max(tentativa, nonNegativeInteger(base.tentativasRetomada, 3)),
      ultimaRetomadaEm: FieldValue.serverTimestamp(),
      resultado: paymentPending ? "pagamento_pendente" : "aguardando_cliente",
      motivo: `retomada_automatica_${tentativa}_enviada`,
      proximaAcao: tentativa === 1
        ? "Aguardar resposta; segunda retomada automatica programada"
        : "Aguardar resposta; suspender se nao houver retorno",
      atualizadoEm: FieldValue.serverTimestamp(),
    };
    const batch = db.batch();
    batch.set(leadRef, patch, { merge: true });
    if (draftSnapshot.exists) batch.set(draftRef, patch, { merge: true });
    await batch.commit();
    return { atualizado: true, tentativa, finalizado: false, id: leadRef.id };
  }

  await consolidateAgentLead(db, draftRef, base, paymentPending ? {
    etapa: "pagamento_pendente",
    resultado: "pagamento_pendente",
    motivo: "pagamento_nao_identificado_apos_2_retomadas",
    proximaAcao: "Elegivel para recuperacao de pagamento",
    tentativasRetomada: 2,
    suspensoPorInatividade: true,
  } : {
    resultado: "aguardando_cliente",
    motivo: "sem_resposta_apos_2_retomadas",
    proximaAcao: "Elegivel para recuperacao do atendimento",
    tentativasRetomada: 2,
    suspensoPorInatividade: true,
  }, draftSnapshot.exists, true);
  return { atualizado: true, tentativa, finalizado: true, id: leadRef.id };
};

export const finalizarLeadAgentePorEncerramento = async (telefone: unknown) => {
  const db = obterFirestoreAdmin();
  if (!db) return false;
  const located = await localizarLeadAgentePorTelefone(db, telefone);
  if (!located) return false;
  const { phone, sessionId, draftRef, leadRef, draftSnapshot, leadSnapshot } = located;
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

export const finalizarLeadAgentePorDuvidaResolvida = async (telefone: unknown, motivoValue?: unknown) => {
  if (!leadPhoneVariants(telefone).length) return { atualizado: false, motivo: "telefone_invalido" };
  const db = obterFirestoreAdmin();
  if (!db) return { atualizado: false, motivo: "firebase_indisponivel" };
  const customerDeferred = canonicalLeadValue(motivoValue) === "cliente_adiou_decisao";
  const located = await localizarLeadAgentePorTelefone(db, telefone);
  if (!located) return { atualizado: false, motivo: "lead_nao_encontrado" };
  const { draftRef, leadRef, draftSnapshot, leadSnapshot } = located;
  const base = draftSnapshot.exists ? draftSnapshot.data()! : leadSnapshot.data()!;
  const stage = canonicalLeadStage(base.etapa);
  const outcome = canonicalLeadOutcome(base.resultado);
  const protectedFlow = ["dados_em_coleta", "aguardando_confirmacao", "pagamento_pendente", "atendimento_humano", "concluida"].includes(stage)
    || ["pagamento_pendente", "reserva_confirmada", "atendimento_humano"].includes(outcome);
  if (protectedFlow) return { atualizado: false, motivo: "fluxo_pendente_ou_convertido" };
  const alreadyFinalized = ["atendimento_concluido", "encerrado_sem_reserva"].includes(stage)
    || ["duvida_resolvida", "nao_convertido"].includes(outcome);
  // Se o gateway trouxe a intencao mais especifica depois do fechamento
  // generico, reclassifique o mesmo lead em vez de criar outro registro.
  const canRefineDeferred = customerDeferred && outcome === "duvida_resolvida";
  if (alreadyFinalized && !canRefineDeferred) {
    return { atualizado: false, motivo: "ja_finalizado" };
  }
  const closure = customerDeferred ? {
    etapa: "encerrado_sem_reserva",
    resultado: "nao_convertido",
    motivo: "cliente_adiou_decisao",
    proximaAcao: "Aguardar nova iniciativa do cliente; nao realizar retomada automatica",
    resumo: "Cliente informou que vai decidir e retornar se desejar prosseguir.",
  } : {
    etapa: "atendimento_concluido",
    resultado: "duvida_resolvida",
    motivo: "duvida_resolvida_pelo_bot",
    proximaAcao: "Nenhuma acao pendente",
    resumo: "Duvida atendida e atendimento encerrado apos confirmacao do cliente.",
  };
  await consolidateAgentLead(db, draftRef, base, closure, draftSnapshot.exists, true);
  return { atualizado: true, id: leadRef.id };
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
