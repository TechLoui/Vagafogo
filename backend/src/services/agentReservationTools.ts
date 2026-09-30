import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { obterFirestoreAdmin } from "./firebaseAdmin";
import { reservaContaParaOcupacao } from "./reservaStatus";

type AgentAvailabilityInput = {
  pacoteId?: unknown;
  data?: unknown;
  horario?: unknown;
  adultos?: unknown;
  bariatrica?: unknown;
  criancas?: unknown;
  naoPagantes?: unknown;
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

const clean = (value: unknown, maximum: number) => String(value ?? "").trim().slice(0, maximum);
const normalizeText = (value: unknown) => clean(value, 300).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
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

export const listarExperienciasAgente = async () => {
  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const snapshot = await db.collection("pacotes").get();
  return snapshot.docs
    .map((document) => {
      const raw = document.data();
      return {
        id: document.id,
        nome: clean(raw.nome, 160),
        ativo: raw.ativo !== false,
        tipo: clean(raw.tipo, 120),
        aceitaPet: raw.aceitaPet === true,
        modoHorario: clean(raw.modoHorario, 30) || "lista",
        horarios: Array.isArray(raw.horarios) ? raw.horarios.map((item: unknown) => clean(item, 20)).filter(Boolean) : [],
        horarioInicio: clean(raw.horarioInicio, 20),
        horarioFim: clean(raw.horarioFim, 20),
        intervaloMinutos: nonNegativeInteger(raw.intervaloMinutos, 1440) || 60,
        diasSemana: Array.isArray(raw.dias) ? raw.dias.map(Number).filter((day: number) => Number.isInteger(day) && day >= 0 && day <= 6) : [],
        datasBloqueadas: Array.isArray(raw.datasBloqueadas) ? raw.datasBloqueadas.map((item: unknown) => clean(item, 20)).filter(Boolean) : [],
        limite: nonNegativeInteger(raw.limite, 10000),
        precos: {
          adulto: Number(raw.precoAdulto ?? 0) || 0,
          bariatrica: Number(raw.precoBariatrica ?? raw.precoAdulto ?? 0) || 0,
          crianca: Number(raw.precoCrianca ?? 0) || 0,
          naoPagante: 0,
        },
        perguntas: Array.isArray(raw.perguntasPersonalizadas)
          ? raw.perguntasPersonalizadas.map((question: Record<string, unknown>) => ({
              id: clean(question.id, 100),
              pergunta: clean(question.pergunta, 300),
              tipo: clean(question.tipo, 40),
              obrigatoria: question.obrigatoria === true,
            }))
          : [],
      };
    })
    .filter((item) => item.nome && item.ativo)
    .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"));
};

export const simularReservaAgente = async (input: AgentAvailabilityInput) => {
  const packageId = clean(input.pacoteId, 100);
  const date = clean(input.data, 20);
  const time = clean(input.horario, 20);
  if (!packageId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("AGENT_AVAILABILITY_INPUT_INVALID");
  if (date < dateKey()) throw new Error("AGENT_DATE_IN_PAST");

  const db = obterFirestoreAdmin();
  if (!db) throw new Error("FIREBASE_ADMIN_UNAVAILABLE");
  const [packageSnapshot, daySnapshot, reservationsSnapshot] = await Promise.all([
    db.collection("pacotes").doc(packageId).get(),
    db.collection("disponibilidade").doc(date).get(),
    db.collection("reservas").where("data", "==", date).get(),
  ]);
  if (!packageSnapshot.exists) throw new Error("AGENT_PACKAGE_NOT_FOUND");
  const packageData = packageSnapshot.data()!;
  const dayData = daySnapshot.exists ? daySnapshot.data()! : {};
  const requested = {
    adultos: nonNegativeInteger(input.adultos),
    bariatrica: nonNegativeInteger(input.bariatrica),
    criancas: nonNegativeInteger(input.criancas),
    naoPagantes: nonNegativeInteger(input.naoPagantes),
  };
  const participants = requested.adultos + requested.bariatrica + requested.criancas + requested.naoPagantes;
  if (participants <= 0) throw new Error("AGENT_PARTICIPANTS_REQUIRED");

  const weekday = new Date(`${date}T12:00:00-03:00`).getUTCDay();
  const days = Array.isArray(packageData.dias) ? packageData.dias.map(Number) : [];
  const blockedDates = Array.isArray(packageData.datasBloqueadas) ? packageData.datasBloqueadas.map(String) : [];
  const mode = clean(packageData.modoHorario, 30) || "lista";
  const listedTimes = Array.isArray(packageData.horarios) ? packageData.horarios.map(String) : [];
  const reasons: string[] = [];
  if (packageData.ativo === false) reasons.push("PACOTE_INATIVO");
  if (dayData.fechado === true) reasons.push("DIA_FECHADO");
  if (days.length && !days.includes(weekday)) reasons.push("DIA_DA_SEMANA_INDISPONIVEL");
  if (blockedDates.includes(date)) reasons.push("DATA_BLOQUEADA");
  if (!time) reasons.push("HORARIO_OBRIGATORIO");
  if (time && mode !== "intervalo" && listedTimes.length && !listedTimes.includes(time)) reasons.push("HORARIO_FORA_DA_GRADE");
  if (time && mode !== "intervalo" && dayData.horarios?.[`${date}-${packageId}-${time}`] === false) reasons.push("HORARIO_BLOQUEADO");
  if (time && mode === "intervalo") {
    const selectedMinutes = parseMinutes(time);
    const start = parseMinutes(clean(packageData.horarioInicio, 20));
    const end = parseMinutes(clean(packageData.horarioFim, 20));
    if (selectedMinutes === null || start === null || end === null || selectedMinutes < start || selectedMinutes > end) reasons.push("HORARIO_FORA_DA_FAIXA");
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
    if (!ids.has(packageId) && normalizeText(reservation.atividade) !== normalizeText(packageData.nome)) return;
    const reservationTime = clean(reservation.horariosPorPacote?.[packageId] ?? reservation.horario ?? reservation.Horario, 20);
    if (mode !== "intervalo" && reservationTime !== time) return;
    occupied += participantCountForPackage(reservation, packageId);
  });

  const extrasRaw = dayData.vagasExtras ?? {};
  const extras = nonNegativeInteger(extrasRaw[`geral::${date}`], 10000) +
    nonNegativeInteger(extrasRaw[`${date}-${packageId}`], 10000) +
    (mode === "intervalo" ? 0 : nonNegativeInteger(extrasRaw[`geral::${date}::${time}`], 10000) + nonNegativeInteger(extrasRaw[`${date}-${packageId}-${time}`], 10000));
  const capacity = nonNegativeInteger(packageData.limite, 10000) + extras;
  const remaining = capacity > 0 ? Math.max(0, capacity - occupied) : null;
  if (remaining !== null && participants > remaining) reasons.push("VAGAS_INSUFICIENTES");
  const prices = {
    adulto: Number(packageData.precoAdulto ?? 0) || 0,
    bariatrica: Number(packageData.precoBariatrica ?? packageData.precoAdulto ?? 0) || 0,
    crianca: Number(packageData.precoCrianca ?? 0) || 0,
  };
  const value = requested.adultos * prices.adulto + requested.bariatrica * prices.bariatrica + requested.criancas * prices.crianca;

  return {
    disponivel: reasons.length === 0,
    motivos: reasons,
    pacote: { id: packageId, nome: clean(packageData.nome, 160), modoHorario: mode, aceitaPet: packageData.aceitaPet === true },
    data: date,
    horario: time,
    participantes: participants,
    ocupadas: occupied,
    vagasRestantes: remaining,
    valor: value,
    moeda: "BRL",
    precos: prices,
    perguntasObrigatorias: Array.isArray(packageData.perguntasPersonalizadas)
      ? packageData.perguntasPersonalizadas.filter((item: Record<string, unknown>) => item.obrigatoria === true).map((item: Record<string, unknown>) => clean(item.pergunta, 300)).filter(Boolean)
      : [],
    aviso: "A criacao do pagamento revalida disponibilidade, valores e horario para evitar conflito de vagas.",
  };
};

export const criarLinkCartaoAgente = (input: AgentAvailabilityInput & { sessionId?: unknown }) => {
  const baseUrl = (process.env.PUBLIC_SITE_BASE_URL ?? "https://vagafogo.com.br").trim().replace(/\/+$/, "");
  const query = new URLSearchParams({
    source_channel: "whatsapp",
    utm_source: "whatsapp",
    utm_medium: "agente",
    utm_campaign: "reserva_assistida",
  });
  const packageId = clean(input.pacoteId, 100);
  const date = clean(input.data, 20);
  const time = clean(input.horario, 20);
  const sessionId = clean(input.sessionId, 100);
  const campaignId = clean(input.campaignId, 100);
  const recipientId = clean(input.recipientId, 100);
  if (packageId) query.set("pacote", packageId);
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
    etapa: clean(input.etapa, 60) || "contato_iniciado",
    resultado: clean(input.resultado, 60) || "em_andamento",
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

export const concluirLeadAgenteComReserva = async (
  telefone: unknown,
  reservaId: unknown,
  pagamentoId?: unknown,
) => {
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

