import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import type { IconType } from "react-icons";
import {
  FaArrowRight,
  FaBars,
  FaBell,
  FaBullhorn,
  FaCalendarAlt,
  FaChartBar,
  FaChartLine,
  FaCheck,
  FaCheckCircle,
  FaChevronDown,
  FaChevronRight,
  FaClock,
  FaCog,
  FaDollarSign,
  FaDownload,
  FaEye,
  FaEyeSlash,
  FaExclamationCircle,
  FaFileAlt,
  FaFilter,
  FaGlobe,
  FaHome,
  FaImage,
  FaLeaf,
  FaLink,
  FaMoneyBillWave,
  FaPlus,
  FaRobot,
  FaSearch,
  FaSignOutAlt,
  FaSlidersH,
  FaSyncAlt,
  FaTimes,
  FaUserFriends,
  FaUsers,
  FaWhatsapp,
} from "react-icons/fa";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { auth, db } from "../../firebase";
import logo from "../assets/logo.jpg";
import heroImage from "../assets/Carrossel-1.jpg";
import "./CRM.css";

dayjs.locale("pt-br");

type SectionKey =
  | "dashboard"
  | "reservas"
  | "jornadas"
  | "clientes"
  | "campanhas"
  | "relatorios"
  | "financeiro"
  | "configuracoes";
type PeriodKey = "today" | "7days" | "30days" | "month" | "custom";
type CampaignSegment =
  | "inactive90"
  | "inactive180"
  | "inactive365"
  | "recurring"
  | "brunch"
  | "trail"
  | "pending"
  | "abandoned"
  | "lost";
type ReservationFlow =
  | "site_organic"
  | "agent_card"
  | "agent_pix"
  | "whatsapp"
  | "manual"
  | "unknown";

type RawReservation = Record<string, unknown> & {
  nome?: unknown;
  Nome?: unknown;
  email?: unknown;
  Email?: unknown;
  telefone?: unknown;
  Telefone?: unknown;
  cpf?: unknown;
  CPF?: unknown;
  data?: unknown;
  Data?: unknown;
  horario?: unknown;
  Horario?: unknown;
  atividade?: unknown;
  Atividade?: unknown;
  participantes?: unknown;
  Participantes?: unknown;
  adultos?: unknown;
  Adultos?: unknown;
  criancas?: unknown;
  Criancas?: unknown;
  naoPagante?: unknown;
  bariatrica?: unknown;
  participantesPorTipo?: unknown;
  valor?: unknown;
  Valor?: unknown;
  status?: unknown;
  Status?: unknown;
  origem?: unknown;
  criadaEm?: unknown;
  criadoEm?: unknown;
  dataPagamento?: unknown;
  confirmada?: unknown;
  chegou?: unknown;
  formaPagamento?: unknown;
  whatsappEnviado?: unknown;
  whatsappBoasVindasEnviado?: unknown;
  whatsappConfirmacaoEnviado?: unknown;
  asaasPaymentId?: unknown;
  pagamentoId?: unknown;
  statusPagamentoIntegracao?: unknown;
  atribuicao?: unknown;
  canalOrigem?: unknown;
  dominioOrigem?: unknown;
  agentSessionId?: unknown;
};

type CRMReservation = {
  id: string;
  name: string;
  email?: string;
  phone: string;
  date: string;
  time: string;
  activity: string;
  people: number;
  value: number;
  status: string;
  origin: "manual" | "checkout" | "whatsapp" | "unknown";
  flow: ReservationFlow;
  sourceDomain?: string;
  sourceChannel?: "site" | "whatsapp" | "unknown";
  sourceAttribution: "captured" | "historical_inference" | "none";
  createdAt?: string;
  paidAt?: string;
  arrived?: boolean;
  paymentMethod?: string;
  whatsappSent: boolean;
  campaignId?: string;
  paymentId?: string;
  agentSessionId?: string;
  confirmed: boolean;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  bookings: number;
  total: number;
  firstVisit: string;
  lastVisit: string;
  daysInactive: number;
  interests: string[];
  status: "VIP" | "Recorrente" | "Ativo" | "Inativo";
};

type CampaignRecord = {
  id: string;
  name: string;
  segment: CampaignSegment;
  segmentLabel: string;
  message: string;
  audienceSize: number;
  status:
    | "rascunho"
    | "agendada"
    | "enviando"
    | "concluida"
    | "pausada"
    | "cancelada";
  createdAt?: string;
  segmentSize?: number;
  eligible?: number;
  queued?: number;
  sent?: number;
  delivered?: number;
  read?: number;
  replies?: number;
  errors?: number;
  ignored?: number;
  optedOut?: number;
  withoutConsent?: number;
  duplicatesRemoved?: number;
  intervalMin?: number;
  intervalMax?: number;
  dailyLimit?: number;
  quietStart?: string;
  quietEnd?: string;
  variants?: string[];
  media?: CampaignMedia;
  clicks?: number;
  bookings?: number;
  conversions?: number;
  revenue?: number;
};

type CampaignMedia = {
  storagePath: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  filename: string;
  sizeBytes: number;
};

type CampaignRecipient = {
  id: string;
  name: string;
  phone: string;
  status: string;
  attempts: number;
  variant?: number;
  sentAt?: string;
  error?: string;
  responseType?: string;
  clickedAt?: string;
  convertedAt?: string;
  reservationId?: string;
};

type JourneyRecord = {
  id: string;
  sessionId: string;
  status: string;
  stage: number;
  substage?: string;
  sourceDomain?: string;
  sourceChannel: "site" | "whatsapp";
  name?: string;
  phone?: string;
  email?: string;
  recoveryOptIn: boolean;
  activities: string[];
  desiredDate?: string;
  estimatedValue: number;
  lastEventAt?: string;
  reservationId?: string;
  paymentAttempted: boolean;
};

type AgentLeadRecord = {
  id: string;
  sessionId?: string;
  phone: string;
  name?: string;
  email?: string;
  stage: string;
  outcome: string;
  reason?: string;
  activities: string[];
  desiredDate?: string;
  participants?: number;
  estimatedValue?: number;
  paymentMethod?: string;
  reservationId?: string;
  marketingOptIn: boolean;
  nextAction?: string;
  summary?: string;
  updatedAt?: string;
  isTest: boolean;
};

const API_BASE =
  import.meta.env.VITE_API_BASE ?? "https://vagafogo-production.up.railway.app";
const NEW_DOMAINS_LAUNCH_DATE = dayjs("2026-09-26").startOf("day");

const sectionMeta: Record<SectionKey, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Oportunidades e campanhas",
    subtitle:
      "Leads, recuperação e resultados para orientar as próximas ações.",
  },
  reservas: {
    title: "Reservas",
    subtitle: "Consulta gerencial das experiências registradas.",
  },
  jornadas: {
    title: "Jornadas e oportunidades",
    subtitle:
      "Acompanhe origem, avanço, conversão e oportunidades reais de recuperação.",
  },
  clientes: {
    title: "Clientes",
    subtitle: "Histórico, recorrência e tempo desde a última visita.",
  },
  campanhas: {
    title: "Campanhas",
    subtitle:
      "Planeje públicos de WhatsApp usando segmentos derivados das reservas.",
  },
  relatorios: {
    title: "Análises e relatórios",
    subtitle: "Análises baseadas exclusivamente nos campos presentes no banco.",
  },
  financeiro: {
    title: "Visão financeira",
    subtitle: "Visão gerencial dos valores das reservas.",
  },
  configuracoes: {
    title: "Integrações e dados",
    subtitle:
      "Cobertura atual, integrações e próximos passos de instrumentação.",
  },
};

const navigation: Array<{ key: SectionKey; label: string; icon: IconType }> = [
  { key: "dashboard", label: "Dashboard", icon: FaHome },
  { key: "reservas", label: "Reservas", icon: FaCalendarAlt },
  { key: "jornadas", label: "Jornadas", icon: FaChartLine },
  { key: "clientes", label: "Clientes", icon: FaUsers },
  { key: "campanhas", label: "Campanhas", icon: FaBullhorn },
  { key: "relatorios", label: "Relatórios", icon: FaChartBar },
  { key: "financeiro", label: "Financeiro", icon: FaDollarSign },
  { key: "configuracoes", label: "Fontes de dados", icon: FaCog },
];

const segmentMeta: Record<
  CampaignSegment,
  { label: string; description: string }
> = {
  inactive90: {
    label: "Sem visita há 90+ dias",
    description:
      "Clientes confirmados sem nova data de visita nos últimos 90 dias.",
  },
  inactive180: {
    label: "Sem visita há 180+ dias",
    description: "Público de reativação com ausência mais longa.",
  },
  inactive365: {
    label: "Sem visita há 1 ano",
    description: "Clientes históricos sem retorno há pelo menos 365 dias.",
  },
  recurring: {
    label: "Clientes recorrentes",
    description: "Pessoas com duas ou mais reservas confirmadas.",
  },
  brunch: {
    label: "Experiência Brunch",
    description: "Clientes que já reservaram uma experiência com Brunch.",
  },
  trail: {
    label: "Experiência Trilha",
    description: "Clientes que já reservaram uma experiência com Trilha.",
  },
  pending: {
    label: "Pagamento não concluído",
    description: "Reservas ainda com status pendente ou pré-reserva.",
  },
  abandoned: {
    label: "Checkout abandonado",
    description:
      "Pessoas que pararam há 30+ minutos e autorizaram ajuda pelo WhatsApp.",
  },
  lost: {
    label: "Oportunidades perdidas",
    description:
      "Checkouts e atendimentos comerciais encerrados sem reserva, com opt-in válido.",
  },
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const compactNumber = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const normalizeSourceDomain = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .replace(/^www\./, "")
    .replace(/:\d+$/, "");
const formatPhone = (value: unknown) => {
  let digits = String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 13);
  if (!digits) return "";
  if (!digits.startsWith("55") && digits.length <= 11) digits = `55${digits}`;
  const country = digits.slice(0, 2);
  const area = digits.slice(2, 4);
  const local = digits.slice(4);
  const first = local.length > 8 ? local.slice(0, 5) : local.slice(0, 4);
  const last = local.length > 8 ? local.slice(5, 9) : local.slice(4, 8);
  return `+${country}${area ? ` (${area}` : ""}${area.length === 2 ? ")" : ""}${first ? ` ${first}` : ""}${last ? `-${last}` : ""}`;
};
const toNumber = (value: unknown) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;
const rawValue = (record: RawReservation, lower: string, upper: string) =>
  record[lower] ?? record[upper];

const normalizeDate = (value: unknown) => {
  if (typeof value === "string") {
    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  }
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return dayjs(value.toDate()).format("YYYY-MM-DD");
  }
  return "";
};

const normalizeTimestamp = (value: unknown) => {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }
  return undefined;
};

const participantsFrom = (reservation: RawReservation) => {
  const declared = toNumber(
    rawValue(reservation, "participantes", "Participantes"),
  );
  if (declared > 0) return declared;
  if (
    reservation.participantesPorTipo &&
    typeof reservation.participantesPorTipo === "object"
  ) {
    return Object.values(reservation.participantesPorTipo).reduce<number>(
      (total, value) => total + toNumber(value),
      0,
    );
  }
  return (
    toNumber(rawValue(reservation, "adultos", "Adultos")) +
    toNumber(rawValue(reservation, "criancas", "Criancas")) +
    toNumber(reservation.naoPagante) +
    toNumber(reservation.bariatrica)
  );
};

const isCancelled = (status: string) =>
  normalizeText(status).includes("cancel");
const isPending = (status: string) => {
  const value = normalizeText(status);
  return (
    value.includes("aguard") ||
    value.includes("pending") ||
    value.includes("processing") ||
    value.includes("pre_reserva") ||
    value.includes("pre-reserva") ||
    value.includes("verificacao")
  );
};
const isPaid = (status: string) =>
  [
    "pago",
    "confirmado",
    "paid",
    "confirmed",
    "approved",
    "aprovado",
    "received",
    "recebido",
  ].includes(normalizeText(status));
const statusLabel = (status: string) =>
  normalizeText(status).includes("verificacao")
    ? "Em verificação"
    : isCancelled(status)
    ? "Cancelada"
    : isPending(status)
      ? "Pendente"
      : isPaid(status)
        ? "Confirmada"
        : "Não classificada";
const humanizeCrmLabel = (value: string) => {
  const normalized = value.replaceAll("_", " ").replaceAll("-", " ").trim();
  return normalized
    ? normalized.charAt(0).toUpperCase() + normalized.slice(1)
    : "Não informado";
};
const agentLeadSignal = (lead: AgentLeadRecord) =>
  normalizeText(`${lead.stage} ${lead.outcome} ${lead.reason ?? ""}`);
const agentLeadIsConfirmed = (lead: AgentLeadRecord) =>
  /reserva confirm|pagamento (aprovado|confirmado)|\bpago\b|concluida/.test(
    agentLeadSignal(lead),
  );
const agentLeadIsLost = (lead: AgentLeadRecord) =>
  /nao convert|encerrado sem reserva|pagamento (nao identificado|expirado|nao concluido)|abandono|desistencia|desistiu|oportunidade perdida/.test(
    agentLeadSignal(lead),
  );
const agentLeadIsClosedWithoutOpportunity = (lead: AgentLeadRecord) =>
  !agentLeadIsLost(lead) &&
  /duvida resolvida|atendimento concluido|sem oportunidade|descart|irrelevante|assunto nao comercial|bloqueado/.test(
    agentLeadSignal(lead),
  );
const agentLeadIsOpen = (lead: AgentLeadRecord) =>
  !agentLeadIsConfirmed(lead) &&
  !agentLeadIsLost(lead) &&
  !agentLeadIsClosedWithoutOpportunity(lead);
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "--";
const daysSince = (date: string) =>
  Math.max(0, dayjs().startOf("day").diff(dayjs(date).startOf("day"), "day"));
const originLabel = (origin: CRMReservation["origin"]) =>
  origin === "manual"
    ? "Manual"
    : origin === "whatsapp"
      ? "WhatsApp"
      : origin === "checkout"
        ? "Checkout do site"
        : "Não identificada";
const reservationFlowLabel = (flow: ReservationFlow) =>
  flow === "site_organic"
    ? "Site direto"
    : flow === "agent_card"
      ? "Bot → site · Cartão"
      : flow === "agent_pix"
        ? "Bot · PIX"
        : flow === "whatsapp"
          ? "WhatsApp"
          : flow === "manual"
            ? "Manual"
            : "Não identificada";
const percent = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;
const ABANDONMENT_MINUTES = 30;
const journeyIsAbandoned = (journey: JourneyRecord, now = Date.now()) =>
  journey.status !== "convertida" &&
  Boolean(journey.lastEventAt) &&
  dayjs(now).diff(dayjs(journey.lastEventAt), "minute") >= ABANDONMENT_MINUTES;
const VAGAFOGO_DOMAINS = new Set(["vagafogopiri.com.br", "vagafogo.com.br"]);

const reservationIntentKey = (reservation: CRMReservation) => {
  const phone = reservation.phone.replace(/\D/g, "");
  return [
    reservation.agentSessionId,
    phone,
    reservation.date,
    reservation.time,
    normalizeText(reservation.activity),
    reservation.people,
    Math.round(reservation.value * 100),
  ].join("|");
};

const consolidateReservationsForCrm = (items: CRMReservation[]) => {
  const confirmedIntents = new Set(
    items
      .filter(
        (item) =>
          Boolean(item.agentSessionId) &&
          (item.confirmed || isPaid(item.status)),
      )
      .map(reservationIntentKey),
  );

  return items.filter(
    (item) =>
      !(
        item.agentSessionId &&
        !item.paymentId &&
        !item.confirmed &&
        isPending(item.status) &&
        confirmedIntents.has(reservationIntentKey(item))
      ),
  );
};

const exportCsv = (
  filename: string,
  rows: Array<Record<string, string | number>>,
) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) =>
    `"${String(value).replace(/"/g, '""')}"`;
  const csv = [
    headers.map(escape).join(";"),
    ...rows.map((row) =>
      headers.map((header) => escape(row[header])).join(";"),
    ),
  ].join("\n");
  const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

function SectionTitle({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="crm-section-title">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {actions ? (
        <div className="crm-section-title__actions">{actions}</div>
      ) : null}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
  action,
}: {
  icon: IconType;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="crm-empty">
      <span>
        <Icon />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function CRM() {
  const [activeSection, setActiveSection] = useState<SectionKey>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>("30days");
  const [customStart, setCustomStart] = useState(
    dayjs().subtract(29, "day").format("YYYY-MM-DD"),
  );
  const [customEnd, setCustomEnd] = useState(dayjs().format("YYYY-MM-DD"));
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [financialValuesVisible, setFinancialValuesVisible] = useState(false);
  const [reservations, setReservations] = useState<CRMReservation[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [reservationsError, setReservationsError] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [campaignsError, setCampaignsError] = useState("");
  const [journeys, setJourneys] = useState<JourneyRecord[]>([]);
  const [journeysError, setJourneysError] = useState("");
  const [agentLeads, setAgentLeads] = useState<AgentLeadRecord[]>([]);
  const [agentLeadsError, setAgentLeadsError] = useState("");
  const [journeyClock, setJourneyClock] = useState(() => Date.now());
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      onSnapshot(
        collection(db, "reservas"),
        (snapshot) => {
          const next = consolidateReservationsForCrm(
            snapshot.docs.map((document) => {
              const raw = document.data() as RawReservation;
              const attribution =
                raw.atribuicao && typeof raw.atribuicao === "object"
                  ? (raw.atribuicao as Record<string, unknown>)
                  : {};
              const originRaw = normalizeText(raw.origem);
              const channelRaw = normalizeText(
                raw.canalOrigem ?? attribution.sourceChannel,
              );
              const recordedOrigin: CRMReservation["origin"] =
                originRaw === "manual"
                  ? "manual"
                  : originRaw.includes("whatsapp") || channelRaw === "whatsapp"
                    ? "whatsapp"
                    : originRaw === "checkout" ||
                        Object.keys(attribution).length > 0
                      ? "checkout"
                      : "unknown";
              const entryDomain = normalizeSourceDomain(
                attribution.entryDomain,
              );
              const referrerDomain = normalizeSourceDomain(
                attribution.referringDomain,
              );
              const capturedSourceDomain =
                normalizeSourceDomain(
                  raw.dominioOrigem ?? attribution.sourceDomain,
                ) ||
                (VAGAFOGO_DOMAINS.has(referrerDomain) &&
                referrerDomain !== entryDomain
                  ? referrerDomain
                  : entryDomain);
              const createdAt = normalizeTimestamp(
                raw.criadoEm ?? raw.criadaEm,
              );
              const reservationDate = normalizeDate(
                rawValue(raw, "data", "Data"),
              );
              const historicalReference = createdAt || reservationDate;
              const historicalPiri =
                recordedOrigin !== "manual" &&
                recordedOrigin !== "whatsapp" &&
                !capturedSourceDomain &&
                Boolean(historicalReference) &&
                dayjs(historicalReference).isBefore(NEW_DOMAINS_LAUNCH_DATE);
              const origin: CRMReservation["origin"] =
                historicalPiri && recordedOrigin === "unknown"
                  ? "checkout"
                  : recordedOrigin;
              const sourceDomain =
                capturedSourceDomain ||
                (historicalPiri ? "vagafogopiri.com.br" : "");
              const hasCapturedAttribution = Boolean(
                capturedSourceDomain ||
                  raw.canalOrigem ||
                  attribution.sourceChannel ||
                  attribution.sessionId,
              );
              const storedStatus = String(
                rawValue(raw, "status", "Status") ??
                  (raw.confirmada ? "confirmado" : ""),
              );
              const paymentIntegrationStatus = normalizeText(
                raw.statusPagamentoIntegracao,
              );
              const displayStatus =
                paymentIntegrationStatus === "verificacao_pendente" &&
                isPending(storedStatus)
                  ? "verificacao_pagamento"
                  : storedStatus;
              const paymentMethod = raw.formaPagamento
                ? String(raw.formaPagamento)
                : undefined;
              const normalizedPaymentMethod = normalizeText(paymentMethod);
              const attributedSessionId = String(
                attribution.agentSessionId ?? raw.agentSessionId ?? "",
              ).trim();
              const journeySessionId = String(attribution.sessionId ?? "").trim();
              const attributionFromAgent =
                normalizeText(attribution.utmMedium) === "agente" ||
                normalizeText(attribution.utmCampaign) === "reserva_assistida";
              const agentSessionId =
                attributedSessionId ||
                (attributionFromAgent && /^whatsapp_\d{10,15}$/i.test(journeySessionId)
                  ? journeySessionId
                  : undefined);
              const flow: ReservationFlow =
                origin === "manual"
                  ? "manual"
                  : agentSessionId && normalizedPaymentMethod.includes("pix")
                    ? "agent_pix"
                    : agentSessionId &&
                        (normalizedPaymentMethod.includes("card") ||
                          normalizedPaymentMethod.includes("cartao") ||
                          normalizedPaymentMethod.includes("credit"))
                      ? "agent_card"
                      : origin === "checkout" && !agentSessionId
                        ? "site_organic"
                        : origin === "whatsapp" || agentSessionId
                          ? "whatsapp"
                          : "unknown";
              return {
                id: document.id,
                name: String(rawValue(raw, "nome", "Nome") ?? "").trim(),
                email:
                  String(rawValue(raw, "email", "Email") ?? "").trim() ||
                  undefined,
                phone: String(
                  rawValue(raw, "telefone", "Telefone") ?? "",
                ).trim(),
                date: reservationDate,
                time: String(
                  rawValue(raw, "horario", "Horario") ??
                    "Sem horário específico",
                ),
                activity: String(
                  rawValue(raw, "atividade", "Atividade") ??
                    "Experiência não identificada",
                ),
                people: participantsFrom(raw),
                value: toNumber(rawValue(raw, "valor", "Valor")),
                status: displayStatus,
                origin,
                flow,
                sourceDomain: sourceDomain || undefined,
                sourceChannel:
                  channelRaw === "whatsapp"
                    ? "whatsapp"
                    : origin === "checkout"
                      ? "site"
                      : "unknown",
                sourceAttribution: historicalPiri
                  ? "historical_inference"
                  : hasCapturedAttribution
                    ? "captured"
                    : "none",
                createdAt,
                paidAt: normalizeTimestamp(raw.dataPagamento),
                arrived:
                  typeof raw.chegou === "boolean" ? raw.chegou : undefined,
                paymentMethod,
                whatsappSent:
                  raw.whatsappEnviado === true ||
                  raw.whatsappBoasVindasEnviado === true ||
                  raw.whatsappConfirmacaoEnviado === true,
                campaignId: attribution.campaignId
                  ? String(attribution.campaignId)
                  : undefined,
                paymentId: String(
                  raw.asaasPaymentId ?? raw.pagamentoId ?? "",
                ).trim() || undefined,
                agentSessionId,
                confirmed: raw.confirmada === true,
              } satisfies CRMReservation;
            })
            .filter((item) => Boolean(item.date && item.name)),
          );
          setReservations(next);
          setReservationsError("");
          setReservationsLoading(false);
        },
        () => {
          setReservationsError("Não foi possível ler a coleção de reservas.");
          setReservationsLoading(false);
        },
      ),
    [],
  );

  useEffect(
    () =>
      onSnapshot(
        collection(db, "crm_jornadas"),
        (snapshot) => {
          const next = snapshot.docs.map((document) => {
            const raw = document.data() as Record<string, unknown>;
            return {
              id: document.id,
              sessionId: String(raw.sessionId ?? document.id),
              status: String(raw.status ?? "em_andamento"),
              stage: Math.min(
                4,
                Math.max(0, toNumber(raw.etapaMaxima ?? raw.ultimaEtapa)),
              ),
              substage: raw.ultimaSubEtapa
                ? String(raw.ultimaSubEtapa)
                : undefined,
              sourceDomain:
                normalizeSourceDomain(raw.sourceDomain ?? raw.entryDomain) ||
                undefined,
              sourceChannel:
                raw.sourceChannel === "whatsapp" ? "whatsapp" : "site",
              name: raw.nome ? String(raw.nome) : undefined,
              phone: raw.telefone ? String(raw.telefone) : undefined,
              email: raw.email ? String(raw.email) : undefined,
              recoveryOptIn: raw.recuperacaoWhatsappOptIn === true,
              activities: Array.isArray(raw.interesseAtividades)
                ? raw.interesseAtividades.map(String)
                : [],
              desiredDate: raw.dataDesejada
                ? String(raw.dataDesejada)
                : undefined,
              estimatedValue: toNumber(raw.valorEstimado),
              lastEventAt: normalizeTimestamp(raw.ultimoEventoEm),
              reservationId: raw.reservaId ? String(raw.reservaId) : undefined,
              paymentAttempted: raw.tentouPagamento === true,
            } satisfies JourneyRecord;
          });
          setJourneys(next);
          setJourneysError("");
        },
        () =>
          setJourneysError(
            "Não foi possível ler as jornadas do checkout. Publique as regras atualizadas do Firestore.",
          ),
      ),
    [],
  );

  useEffect(
    () =>
      onSnapshot(
        collection(db, "crm_leads_agente"),
        (snapshot) => {
          const leads = snapshot.docs
            .map((document) => {
              const raw = document.data() as Record<string, unknown>;
              const sessionId = raw.sessionId
                ? String(raw.sessionId)
                : undefined;
              const sessionPhone = sessionId?.match(
                /^whatsapp_(\d{10,15})$/,
              )?.[1];
              const rawPhone = String(raw.telefone ?? "");
              const isLegacyLid = Boolean(sessionId?.includes("@lid"));
              return {
                id: document.id,
                sessionId,
                phone: sessionPhone || (isLegacyLid ? "" : rawPhone),
                name: raw.nome ? String(raw.nome) : undefined,
                email: raw.email ? String(raw.email) : undefined,
                stage: String(raw.etapa ?? "contato_iniciado"),
                outcome: String(raw.resultado ?? "em_andamento"),
                reason: raw.motivo ? String(raw.motivo) : undefined,
                activities: Array.isArray(raw.atividades)
                  ? raw.atividades.map(String)
                  : [],
                desiredDate: raw.dataDesejada
                  ? String(raw.dataDesejada)
                  : undefined,
                participants:
                  raw.participantes == null
                    ? undefined
                    : toNumber(raw.participantes),
                estimatedValue:
                  raw.valorEstimado == null
                    ? undefined
                    : toNumber(raw.valorEstimado),
                paymentMethod: raw.formaPagamento
                  ? String(raw.formaPagamento)
                  : undefined,
                reservationId: raw.reservaId
                  ? String(raw.reservaId)
                  : undefined,
                marketingOptIn: raw.marketingOptIn === true,
                nextAction: raw.proximaAcao
                  ? String(raw.proximaAcao)
                  : undefined,
                summary: raw.resumo ? String(raw.resumo) : undefined,
                updatedAt: normalizeTimestamp(raw.atualizadoEm ?? raw.criadoEm),
                isTest: raw.teste === true,
              } satisfies AgentLeadRecord;
            })
            .sort((a, b) =>
              (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
            );
          const unique = new Map<string, AgentLeadRecord>();
          leads.forEach((lead) => {
            const phoneDigits = lead.phone.replace(/\D/g, "");
            const nameAndIntent = `${normalizeText(lead.name)}:${lead.desiredDate || ""}:${lead.activities.map(normalizeText).sort().join(",")}`;
            const key = phoneDigits
              ? `telefone:${phoneDigits}`
              : nameAndIntent !== "::"
                ? `contexto:${nameAndIntent}`
                : lead.sessionId || lead.id;
            if (!unique.has(key)) unique.set(key, lead);
          });
          setAgentLeads(Array.from(unique.values()));
          setAgentLeadsError("");
        },
        () =>
          setAgentLeadsError(
            "Não foi possível ler os leads estruturados do Agente.",
          ),
      ),
    [],
  );

  useEffect(
    () =>
      onSnapshot(
        collection(db, "crm_campanhas"),
        (snapshot) => {
          const next = snapshot.docs.map((document) => {
            const raw = document.data() as Record<string, unknown>;
            const rawMedia =
              raw.midia && typeof raw.midia === "object"
                ? (raw.midia as Record<string, unknown>)
                : null;
            return {
              id: document.id,
              name: String(raw.nome ?? "Campanha sem nome"),
              segment: String(raw.segmento ?? "inactive180") as CampaignSegment,
              segmentLabel: String(raw.segmentoLabel ?? "Segmento"),
              message: String(raw.mensagem ?? ""),
              audienceSize: toNumber(raw.publicoEstimado),
              status: String(
                raw.status ?? "rascunho",
              ) as CampaignRecord["status"],
              createdAt: normalizeTimestamp(raw.criadoEm),
              segmentSize: toNumber(raw.publicoSegmento),
              eligible: toNumber(raw.publicoElegivel ?? raw.publicoEstimado),
              queued: toNumber(raw.aguardando),
              sent: toNumber(raw.enviadas),
              delivered: toNumber(raw.entregues),
              read: toNumber(raw.lidas),
              replies: toNumber(raw.respostas),
              errors: toNumber(raw.erros),
              ignored: toNumber(raw.ignoradas),
              optedOut: toNumber(raw.optOut),
              withoutConsent: toNumber(raw.semConsentimento),
              duplicatesRemoved: toNumber(raw.duplicidadesEliminadas),
              intervalMin: toNumber(raw.intervaloMinSegundos),
              intervalMax: toNumber(raw.intervaloMaxSegundos),
              dailyLimit: toNumber(raw.limiteDiario),
              quietStart: String(raw.horarioInicio ?? ""),
              quietEnd: String(raw.horarioFim ?? ""),
              variants: Array.isArray(raw.variacoes)
                ? raw.variacoes.map(String)
                : raw.mensagem
                  ? [String(raw.mensagem)]
                  : [],
              media: rawMedia
                ? {
                    storagePath: String(rawMedia.storagePath ?? ""),
                    mimeType: String(
                      rawMedia.mimeType ?? "image/jpeg",
                    ) as CampaignMedia["mimeType"],
                    filename: String(rawMedia.filename ?? "imagem"),
                    sizeBytes: toNumber(rawMedia.sizeBytes),
                  }
                : undefined,
              clicks: toNumber(raw.cliques),
              bookings: toNumber(raw.reservasGeradas),
              conversions: toNumber(raw.conversoes),
              revenue: toNumber(raw.receitaAtribuida),
            };
          });
          setCampaigns(next);
          setCampaignsError("");
        },
        () =>
          setCampaignsError(
            "A coleção de campanhas ainda precisa ter as regras publicadas.",
          ),
      ),
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const timer = window.setInterval(() => setJourneyClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const closeSearch = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      )
        setSearch("");
    };
    document.addEventListener("mousedown", closeSearch);
    return () => document.removeEventListener("mousedown", closeSearch);
  }, []);

  const periodBounds = useMemo(() => {
    const today = dayjs().startOf("day");
    if (period === "today") return { start: today, end: today.endOf("day") };
    if (period === "7days")
      return { start: today.subtract(6, "day"), end: today.endOf("day") };
    if (period === "month")
      return { start: today.startOf("month"), end: today.endOf("month") };
    if (period === "custom")
      return {
        start: dayjs(customStart).startOf("day"),
        end: dayjs(customEnd).endOf("day"),
      };
    return { start: today.subtract(29, "day"), end: today.endOf("day") };
  }, [customEnd, customStart, period]);

  const filteredReservations = useMemo(
    () =>
      reservations.filter((item) => {
        const date = dayjs(item.date);
        return (
          date.isValid() &&
          !date.isBefore(periodBounds.start) &&
          !date.isAfter(periodBounds.end)
        );
      }),
    [periodBounds, reservations],
  );

  const customers = useMemo<Customer[]>(() => {
    const map = new Map<string, Omit<Customer, "daysInactive" | "status">>();
    reservations
      .filter(
        (item) =>
          isPaid(item.status) && !dayjs(item.date).isAfter(dayjs(), "day"),
      )
      .forEach((reservation) => {
        const phoneKey = reservation.phone.replace(/\D/g, "");
        const key =
          phoneKey || normalizeText(reservation.email || reservation.name);
        if (!key) return;
        const previous = map.get(key);
        const interests = new Set(previous?.interests ?? []);
        interests.add(reservation.activity);
        map.set(key, {
          id: key,
          name: reservation.name,
          phone: reservation.phone,
          email: reservation.email,
          bookings: (previous?.bookings ?? 0) + 1,
          total: (previous?.total ?? 0) + reservation.value,
          firstVisit:
            !previous || reservation.date < previous.firstVisit
              ? reservation.date
              : previous.firstVisit,
          lastVisit:
            !previous || reservation.date > previous.lastVisit
              ? reservation.date
              : previous.lastVisit,
          interests: [...interests],
        });
      });
    return [...map.values()]
      .map((customer) => {
        const inactive = daysSince(customer.lastVisit);
        return {
          ...customer,
          daysInactive: inactive,
          status:
            inactive >= 180
              ? "Inativo"
              : customer.total >= 1500
                ? "VIP"
                : customer.bookings >= 2
                  ? "Recorrente"
                  : "Ativo",
        } as Customer;
      })
      .sort((a, b) => b.total - a.total);
  }, [reservations]);

  const filteredCustomers = useMemo(
    () =>
      customers.filter((item) => {
        const date = dayjs(item.lastVisit);
        return (
          date.isValid() &&
          !date.isBefore(periodBounds.start) &&
          !date.isAfter(periodBounds.end)
        );
      }),
    [customers, periodBounds],
  );
  const filteredJourneys = useMemo(
    () =>
      journeys.filter((item) => {
        const date = dayjs(item.lastEventAt);
        return (
          date.isValid() &&
          !date.isBefore(periodBounds.start) &&
          !date.isAfter(periodBounds.end)
        );
      }),
    [journeys, periodBounds],
  );
  const filteredAgentLeads = useMemo(
    () =>
      agentLeads.filter((item) => {
        const date = dayjs(item.updatedAt);
        return (
          date.isValid() &&
          !date.isBefore(periodBounds.start) &&
          !date.isAfter(periodBounds.end)
        );
      }),
    [agentLeads, periodBounds],
  );
  const filteredCampaigns = useMemo(
    () =>
      campaigns.filter((item) => {
        const date = dayjs(item.createdAt);
        return (
          date.isValid() &&
          !date.isBefore(periodBounds.start) &&
          !date.isAfter(periodBounds.end)
        );
      }),
    [campaigns, periodBounds],
  );

  const pendingReservations = useMemo(
    () => reservations.filter((item) => isPending(item.status)),
    [reservations],
  );
  const recoverableJourneyCount = useMemo(
    () =>
      journeys.filter(
        (item) =>
          journeyIsAbandoned(item, journeyClock) &&
          item.recoveryOptIn &&
          item.phone,
      ).length,
    [journeyClock, journeys],
  );
  const lostAudienceCount = useMemo(() => {
    const phones = new Set<string>();
    journeys.forEach((item) => {
      const phone = item.phone?.replace(/\D/g, "");
      if (
        phone &&
        journeyIsAbandoned(item, journeyClock) &&
        item.recoveryOptIn
      )
        phones.add(phone);
    });
    agentLeads.forEach((item) => {
      const phone = item.phone.replace(/\D/g, "");
      if (phone && !item.isTest && item.marketingOptIn && agentLeadIsLost(item))
        phones.add(phone);
    });
    return phones.size;
  }, [agentLeads, journeyClock, journeys]);
  const audienceFor = (segment: CampaignSegment) => {
    if (segment === "pending") return pendingReservations.length;
    if (segment === "abandoned")
      return journeys.filter(
        (item) => journeyIsAbandoned(item) && item.recoveryOptIn && item.phone,
      ).length;
    if (segment === "lost") return lostAudienceCount;
    if (segment === "inactive90")
      return customers.filter((item) => item.daysInactive >= 90).length;
    if (segment === "inactive180")
      return customers.filter((item) => item.daysInactive >= 180).length;
    if (segment === "inactive365")
      return customers.filter((item) => item.daysInactive >= 365).length;
    if (segment === "recurring")
      return customers.filter((item) => item.bookings >= 2).length;
    if (segment === "brunch")
      return customers.filter((item) =>
        item.interests.some((value) => normalizeText(value).includes("brunch")),
      ).length;
    return customers.filter((item) =>
      item.interests.some((value) => normalizeText(value).includes("trilha")),
    ).length;
  };

  const searchResults = useMemo(() => {
    const term = normalizeText(search);
    if (term.length < 2) return [];
    const customerResults = customers
      .filter((item) =>
        normalizeText(`${item.name} ${item.phone} ${item.email}`).includes(
          term,
        ),
      )
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        title: item.name,
        detail: `${item.bookings} reserva(s) · última visita ${dayjs(item.lastVisit).format("DD/MM/YYYY")}`,
        section: "clientes" as SectionKey,
        type: "Cliente",
      }));
    const reservationResults = reservations
      .filter((item) =>
        normalizeText(
          `${item.name} ${item.phone} ${item.email} ${item.id}`,
        ).includes(term),
      )
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        title: item.name,
        detail: `${item.activity} · ${dayjs(item.date).format("DD/MM/YYYY")}`,
        section: "reservas" as SectionKey,
        type: "Reserva",
      }));
    return [...customerResults, ...reservationResults].slice(0, 7);
  }, [customers, reservations, search]);

  const selectSection = (section: SectionKey) => {
    setActiveSection(section);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/CRM/login", { replace: true });
  };
  const periodLabel =
    period === "today"
      ? "Hoje"
      : period === "7days"
        ? "7 dias"
        : period === "30days"
          ? "30 dias"
          : period === "month"
            ? "Este mês"
            : `${dayjs(customStart).format("DD/MM/YYYY")} a ${dayjs(customEnd).format("DD/MM/YYYY")}`;
  const originCoverage = percent(
    reservations.filter((item) => item.origin !== "unknown").length,
    reservations.length,
  );

  const exportCurrentSection = () => {
    if (activeSection === "financeiro" && !financialValuesVisible) {
      setToast("Revele os valores financeiros antes de exportar o relatório.");
      return;
    }
    const reservationRows = filteredReservations.map((item) => ({
      reserva: item.id,
      cliente: item.name,
      telefone: item.phone,
      experiencia: item.activity,
      data: item.date,
      horario: item.time,
      pessoas: item.people,
      valor: item.value,
      status: statusLabel(item.status),
      origem: originLabel(item.origin),
      dominioOrigem: item.sourceDomain ?? "",
      campanhaId: item.campaignId ?? "",
      tipoAtribuicao:
        item.sourceAttribution === "historical_inference"
          ? "Histórico informado"
          : item.sourceAttribution === "captured"
            ? "Capturada"
            : "Não identificada",
    }));
    const rows: Array<Record<string, string | number>> =
      activeSection === "dashboard"
        ? [
            ...filteredJourneys
              .filter(
                (item) =>
                  journeyIsAbandoned(item) &&
                  item.recoveryOptIn &&
                  item.phone,
              )
              .map((item) => ({
                tipo: "Checkout abandonado",
                contato: item.name ?? "Nome não informado",
                telefone: item.phone ?? "",
                interesse: item.activities.join(" + "),
                etapa: `Etapa ${item.stage}`,
                resultado: item.status,
                proximaAcao: "Recuperar pelo WhatsApp",
                ultimaAtividade: item.lastEventAt ?? "",
              })),
            ...filteredAgentLeads
              .filter(agentLeadIsOpen)
              .map((item) => ({
                tipo: "Lead do agente",
                contato: item.name ?? "Nome não informado",
                telefone: item.phone,
                interesse: item.activities.join(" + "),
                etapa: humanizeCrmLabel(item.stage),
                resultado: humanizeCrmLabel(item.outcome),
                proximaAcao: item.nextAction ?? "Acompanhar atendimento",
                ultimaAtividade: item.updatedAt ?? "",
              })),
          ]
        : activeSection === "clientes"
        ? filteredCustomers.map((item) => ({
            cliente: item.name,
            telefone: item.phone,
            email: item.email ?? "",
            reservas: item.bookings,
            total: item.total,
            primeiraVisita: item.firstVisit,
            ultimaVisita: item.lastVisit,
            diasSemVisita: item.daysInactive,
            segmento: item.status,
          }))
        : activeSection === "jornadas"
          ? [
              ...filteredJourneys.map((item) => ({
                tipo: "Jornada do site",
                sessao: item.sessionId,
                status: item.status,
                etapa: item.stage,
                canal: item.sourceChannel,
                dominio: item.sourceDomain ?? "",
                nome: item.name ?? "",
                telefone: item.phone ?? "",
                optInMarketing: item.recoveryOptIn ? "Sim" : "Não",
                interesse: item.activities.join(" + "),
                dataDesejada: item.desiredDate ?? "",
                valorEstimado: item.estimatedValue,
                ultimaAtividade: item.lastEventAt ?? "",
                reserva: item.reservationId ?? "",
              })),
              ...filteredAgentLeads.map((item) => ({
                tipo: "Lead do agente",
                sessao: item.id,
                status: item.outcome,
                etapa: item.stage,
                canal: "whatsapp",
                dominio: "",
                nome: item.name ?? "",
                telefone: item.phone,
                optInMarketing: item.marketingOptIn ? "Sim" : "Não",
                interesse: item.activities.join(" + "),
                dataDesejada: item.desiredDate ?? "",
                valorEstimado: item.estimatedValue ?? 0,
                ultimaAtividade: item.updatedAt ?? "",
                reserva: item.reservationId ?? "",
              })),
            ]
          : activeSection === "campanhas"
            ? filteredCampaigns.map((item) => ({
                campanha: item.name,
                segmento: item.segmentLabel,
                status: item.status,
                criadaEm: item.createdAt ?? "",
                formato: item.media ? "Foto + legenda" : "Texto",
                elegiveis: item.eligible ?? item.audienceSize,
                aguardando: item.queued ?? 0,
                enviadas: item.sent ?? 0,
                entregues: item.delivered ?? 0,
                lidas: item.read ?? 0,
                respostas: item.replies ?? 0,
                cliques: item.clicks ?? 0,
                reservas: item.bookings ?? 0,
                conversoesPagas: item.conversions ?? 0,
                receitaAtribuida: item.revenue ?? 0,
                erros: item.errors ?? 0,
                optOut: item.optedOut ?? 0,
                duplicidadesRemovidas: item.duplicatesRemoved ?? 0,
              }))
            : activeSection === "configuracoes"
              ? [
                  {
                    indicador: "Reservas válidas",
                    valor: filteredReservations.length,
                    periodo: periodLabel,
                  },
                  {
                    indicador: "Origem classificada",
                    valor: filteredReservations.filter(
                      (item) => item.origin !== "unknown",
                    ).length,
                    periodo: periodLabel,
                  },
                  {
                    indicador: "Atribuição capturada",
                    valor: filteredReservations.filter(
                      (item) => item.sourceAttribution === "captured",
                    ).length,
                    periodo: periodLabel,
                  },
                  {
                    indicador: "Atribuição histórica informada",
                    valor: filteredReservations.filter(
                      (item) =>
                        item.sourceAttribution === "historical_inference",
                    ).length,
                    periodo: periodLabel,
                  },
                  {
                    indicador: "Jornadas",
                    valor: filteredJourneys.length,
                    periodo: periodLabel,
                  },
                  {
                    indicador: "Abandonos recuperáveis",
                    valor: filteredJourneys.filter(
                      (item) =>
                        journeyIsAbandoned(item) &&
                        item.recoveryOptIn &&
                        item.phone,
                    ).length,
                    periodo: periodLabel,
                  },
                ]
              : reservationRows;
    const exportRows =
      activeSection === "dashboard"
        ? rows.filter((row, index, list) => {
            const phone = String(row.telefone ?? "").replace(/\D/g, "");
            if (!phone) return true;
            return (
              list.findIndex(
                (candidate) =>
                  String(candidate.telefone ?? "").replace(/\D/g, "") ===
                  phone,
              ) === index
            );
          })
        : rows;
    if (!exportRows.length) {
      setToast(
        `Não há dados em ${periodLabel.toLowerCase()} para exportar nesta aba.`,
      );
      return;
    }
    exportCsv(
      `${activeSection}-${dayjs().format("YYYY-MM-DD")}.csv`,
      exportRows,
    );
    setToast(
      `Relatório de ${sectionMeta[activeSection].title.toLowerCase()} exportado.`,
    );
  };

  return (
    <div className="crm-app">
      {toast ? (
        <div className="crm-toast">
          <FaCheckCircle /> {toast}
        </div>
      ) : null}
      {sidebarOpen ? (
        <button
          className="crm-sidebar-scrim"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <aside
        className={`crm-sidebar ${sidebarOpen ? "crm-sidebar--open" : ""}`}
      >
        <div className="crm-sidebar__brand">
          <img src={logo} alt="Vagafogo" />
          <div>
            <strong>Vagafogo</strong>
            <span>CRM</span>
          </div>
          <button
            className="crm-sidebar__close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
          >
            <FaTimes />
          </button>
        </div>
        <nav className="crm-sidebar__nav" aria-label="Navegação principal">
          <span className="crm-sidebar__label">Gestão</span>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                className={activeSection === item.key ? "is-active" : ""}
                onClick={() => selectSection(item.key)}
              >
                <Icon />
                <span>{item.label}</span>
                {item.key === "jornadas" && recoverableJourneyCount ? (
                  <small>{recoverableJourneyCount}</small>
                ) : null}
              </button>
            );
          })}
          <button type="button" onClick={() => navigate("/agente")}>
            <FaRobot />
            <span>Agente WhatsApp</span>
          </button>
        </nav>
        <div className="crm-sidebar__quote">
          <FaLeaf />
          <p>Dados para reconectar pessoas.</p>
          <span>Relacionamento com propósito.</span>
        </div>
      </aside>

      <div className="crm-shell">
        <header
          className="crm-topbar"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(244, 251, 255, .98), rgba(238, 249, 253, .9) 52%, rgba(236, 248, 247, .5)), url(${heroImage})`,
          }}
        >
          <div className="crm-topbar__identity">
            <button
              className="crm-mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu"
            >
              <FaBars />
            </button>
            <div>
              <strong>Painel CRM Vagafogo</strong>
              <span>Relacionamento orientado por dados reais.</span>
            </div>
          </div>
          <div className="crm-global-search" ref={searchRef}>
            <FaSearch />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente, telefone, e-mail ou reserva..."
              aria-label="Busca global"
            />
            {search ? (
              <button onClick={() => setSearch("")} aria-label="Limpar busca">
                <FaTimes />
              </button>
            ) : (
              <kbd>⌘ K</kbd>
            )}
            {search.length >= 2 ? (
              <div className="crm-search-results">
                <span>Resultados da busca</span>
                {searchResults.length ? (
                  searchResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => {
                        selectSection(result.section);
                        setSearch("");
                      }}
                    >
                      <div>
                        <strong>{result.title}</strong>
                        <small>{result.detail}</small>
                      </div>
                      <em>{result.type}</em>
                    </button>
                  ))
                ) : (
                  <p>Nenhum cliente ou reserva encontrado.</p>
                )}
              </div>
            ) : null}
          </div>
          <div className="crm-topbar__actions">
            <div className="crm-popover-anchor">
              <button
                className="crm-icon-button"
                onClick={() => setNotificationsOpen((value) => !value)}
                aria-label="Notificações"
              >
                <FaBell />
                {pendingReservations.length ? <i /> : null}
              </button>
              {notificationsOpen ? (
                <div className="crm-notifications">
                  <div>
                    <strong>Pontos de atenção</strong>
                    <button onClick={() => setNotificationsOpen(false)}>
                      <FaTimes />
                    </button>
                  </div>
                  <article>
                    <span className="is-orange">
                      <FaClock />
                    </span>
                    <p>
                      <strong>
                        {pendingReservations.length} pagamentos não concluídos
                      </strong>
                      <small>Registros atualmente disponíveis no banco</small>
                    </p>
                  </article>
                  <article>
                    <span className="is-blue">
                      <FaLink />
                    </span>
                    <p>
                      <strong>Origem identificada em {originCoverage}%</strong>
                      <small>O histórico ainda não possui domínio ou UTM</small>
                    </p>
                  </article>
                  <article>
                    <span className="is-green">
                      <FaUsers />
                    </span>
                    <p>
                      <strong>
                        {
                          customers.filter((item) => item.daysInactive >= 180)
                            .length
                        }{" "}
                        clientes para reativação
                      </strong>
                      <small>Sem visita há pelo menos 180 dias</small>
                    </p>
                  </article>
                </div>
              ) : null}
            </div>
            <div className="crm-popover-anchor">
              <button
                className="crm-user-menu"
                onClick={() => setProfileOpen((value) => !value)}
              >
                <span>AD</span>
                <div>
                  <strong>Administrador</strong>
                  <small>Gestão completa</small>
                </div>
                <FaChevronDown />
              </button>
              {profileOpen ? (
                <div className="crm-profile-menu">
                  <button
                    onClick={() => {
                      selectSection("configuracoes");
                      setProfileOpen(false);
                    }}
                  >
                    <FaCog /> Fontes de dados
                  </button>
                  <button onClick={handleLogout}>
                    <FaSignOutAlt /> Sair do CRM
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="crm-main" id="conteudo-principal" tabIndex={-1}>
          <div className="crm-page-head">
            <div>
              <span className="crm-page-head__eyebrow">
                {activeSection === "dashboard"
                  ? dayjs().format("dddd, D [de] MMMM")
                  : "CRM Vagafogo"}
              </span>
              <h1>
                {activeSection === "dashboard"
                  ? "Oportunidades para agir"
                  : sectionMeta[activeSection].title}
              </h1>
              <p>{sectionMeta[activeSection].subtitle}</p>
            </div>
            <div className="crm-page-head__tools">
              {(["today", "7days", "30days", "month"] as PeriodKey[]).map(
                (key) => (
                  <button
                    key={key}
                    className={period === key ? "is-active" : ""}
                    onClick={() => setPeriod(key)}
                  >
                    {key === "today"
                      ? "Hoje"
                      : key === "7days"
                        ? "7 dias"
                        : key === "30days"
                          ? "30 dias"
                          : "Este mês"}
                  </button>
                ),
              )}
              <div className="crm-popover-anchor">
                <button
                  aria-label="Período personalizado"
                  className={period === "custom" ? "is-active" : ""}
                  onClick={() => setPeriodMenuOpen((value) => !value)}
                >
                  <span className="crm-custom-label">
                    {period === "custom"
                      ? `${dayjs(customStart).format("DD/MM")} – ${dayjs(customEnd).format("DD/MM")}`
                      : "Personalizado"}
                  </span>
                  <FaCalendarAlt />
                </button>
                {periodMenuOpen ? (
                  <div className="crm-period-menu">
                    <strong>Escolha o período</strong>
                    <label>
                      De
                      <input
                        type="date"
                        value={customStart}
                        max={customEnd}
                        onChange={(event) => setCustomStart(event.target.value)}
                      />
                    </label>
                    <label>
                      Até
                      <input
                        type="date"
                        value={customEnd}
                        min={customStart}
                        onChange={(event) => setCustomEnd(event.target.value)}
                      />
                    </label>
                    <button
                      onClick={() => {
                        setPeriod("custom");
                        setPeriodMenuOpen(false);
                      }}
                    >
                      Aplicar período
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                className="crm-period-export"
                onClick={exportCurrentSection}
                title={`Exportar ${sectionMeta[activeSection].title} no período selecionado`}
              >
                <FaDownload />
                <span>Exportar</span>
              </button>
            </div>
          </div>

          {reservationsError ? (
            <div className="crm-demo-notice">
              <FaExclamationCircle />
              <span>
                <strong>Falha de sincronização.</strong> {reservationsError}
              </span>
            </div>
          ) : null}

          {activeSection === "dashboard" ? (
            <OpportunityDashboardSection
              reservations={filteredReservations}
              customers={customers}
              campaigns={filteredCampaigns}
              journeys={filteredJourneys}
              agentLeads={filteredAgentLeads}
              financialValuesVisible={financialValuesVisible}
              onToggleFinancialValues={() =>
                setFinancialValuesVisible((visible) => !visible)
              }
              onNavigate={selectSection}
            />
          ) : activeSection === "reservas" ? (
            <ReservationsSection
              reservations={filteredReservations}
              loading={reservationsLoading}
              periodLabel={periodLabel}
              valuesVisible={financialValuesVisible}
              onToggleValues={() =>
                setFinancialValuesVisible((visible) => !visible)
              }
            />
          ) : activeSection === "jornadas" ? (
            <JourneysSection
              customers={filteredCustomers}
              journeys={filteredJourneys}
              agentLeads={filteredAgentLeads}
              journeysError={[journeysError, agentLeadsError]
                .filter(Boolean)
                .join(" ")}
              onCreateCampaign={() => selectSection("campanhas")}
            />
          ) : activeSection === "clientes" ? (
            <CustomersSection customers={filteredCustomers} />
          ) : activeSection === "campanhas" ? (
            <CampaignsSection
              campaigns={filteredCampaigns}
              campaignsError={campaignsError}
              customers={customers}
              pendingReservations={pendingReservations}
              audienceFor={audienceFor}
              onToast={setToast}
            />
          ) : activeSection === "relatorios" ? (
            <ReportsSection
              reservations={filteredReservations}
              allReservations={filteredReservations}
              customers={filteredCustomers}
            />
          ) : activeSection === "financeiro" ? (
            <FinanceSection
              reservations={filteredReservations}
              periodLabel={periodLabel}
              valuesVisible={financialValuesVisible}
              onToggleValues={() =>
                setFinancialValuesVisible((visible) => !visible)
              }
            />
          ) : (
            <DataSourcesSection
              reservations={filteredReservations}
              journeys={filteredJourneys}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function OpportunityDashboardSection({
  reservations,
  customers,
  campaigns,
  journeys,
  agentLeads,
  financialValuesVisible,
  onToggleFinancialValues,
  onNavigate,
}: {
  reservations: CRMReservation[];
  customers: Customer[];
  campaigns: CampaignRecord[];
  journeys: JourneyRecord[];
  agentLeads: AgentLeadRecord[];
  financialValuesVisible: boolean;
  onToggleFinancialValues: () => void;
  onNavigate: (section: SectionKey) => void;
}) {
  const pending = reservations.filter(
    (item) => isPending(item.status) && item.origin !== "manual" && item.phone,
  );
  const abandonedJourneys = journeys.filter((item) => journeyIsAbandoned(item));
  const recoverableJourneys = abandonedJourneys.filter(
    (item) => item.recoveryOptIn && item.phone,
  );
  const realAgentLeads = agentLeads.filter((item) => !item.isTest);
  const openLeads = realAgentLeads.filter(agentLeadIsOpen);
  const displayedOpenLeads = agentLeads.filter(agentLeadIsOpen);
  const lostLeads = realAgentLeads.filter(agentLeadIsLost);
  const isPaymentLead = (lead: AgentLeadRecord) =>
    /pagamento|pix|cobranca/.test(agentLeadSignal(lead));
  const isWaitingLead = (lead: AgentLeadRecord) =>
    /aguardando cliente|sem resposta|inatividade|suspens/.test(
      agentLeadSignal(lead),
    );
  const paymentLeads = openLeads.filter(isPaymentLead);
  const waitingLeads = openLeads.filter(
    (lead) => !isPaymentLead(lead) && isWaitingLead(lead),
  );
  const activeLeads = openLeads.filter(
    (lead) => !isPaymentLead(lead) && !isWaitingLead(lead),
  );
  const confirmedLeads = realAgentLeads.filter(agentLeadIsConfirmed);
  const closedLeads = realAgentLeads.filter(agentLeadIsClosedWithoutOpportunity);
  const contactKey = (phone: string | undefined, fallback: string) =>
    phone?.replace(/\D/g, "") || fallback;
  const recoverableKeys = new Set(
    recoverableJourneys.map((item) =>
      contactKey(item.phone, `jornada:${item.sessionId}`),
    ),
  );
  const paymentKeys = new Set([
    ...pending.map((item) => contactKey(item.phone, `reserva:${item.id}`)),
    ...paymentLeads.map((item) =>
      contactKey(item.phone, `agente:${item.sessionId ?? item.id}`),
    ),
  ]);
  const lostKeys = new Set([
    ...abandonedJourneys.map((item) =>
      contactKey(item.phone, `jornada:${item.sessionId}`),
    ),
    ...lostLeads.map((item) =>
      contactKey(item.phone, `agente:${item.sessionId ?? item.id}`),
    ),
  ]);
  const recoverableLostKeys = new Set([
    ...recoverableJourneys.map((item) =>
      contactKey(item.phone, `jornada:${item.sessionId}`),
    ),
    ...lostLeads
      .filter((item) => item.marketingOptIn && item.phone)
      .map((item) =>
        contactKey(item.phone, `agente:${item.sessionId ?? item.id}`),
      ),
  ]);
  const opportunityKeys = new Set([
    ...recoverableKeys,
    ...openLeads.map((item) =>
      contactKey(item.phone, `agente:${item.sessionId ?? item.id}`),
    ),
    ...paymentKeys,
  ]);
  const inactive90 = customers.filter((item) => item.daysInactive >= 90);
  const inactive180 = customers.filter((item) => item.daysInactive >= 180);
  const recurring = customers.filter((item) => item.bookings >= 2);
  const activeCampaigns = campaigns.filter((item) =>
    ["agendada", "enviando", "pausada"].includes(normalizeText(item.status)),
  );
  const campaignTotals = campaigns.reduce(
    (totals, campaign) => ({
      eligible:
        totals.eligible + (campaign.eligible ?? campaign.audienceSize ?? 0),
      sent: totals.sent + (campaign.sent ?? 0),
      replies: totals.replies + (campaign.replies ?? 0),
      conversions: totals.conversions + (campaign.conversions ?? 0),
      revenue: totals.revenue + (campaign.revenue ?? 0),
    }),
    { eligible: 0, sent: 0, replies: 0, conversions: 0, revenue: 0 },
  );
  const confirmedReservations = reservations.filter((item) => isPaid(item.status));
  const cancelledReservations = reservations.filter((item) => isCancelled(item.status));
  const confirmedRevenue = confirmedReservations.reduce(
    (sum, item) => sum + item.value,
    0,
  );
  const pendingRevenue = pending.reduce((sum, item) => sum + item.value, 0);
  const averageTicket = confirmedReservations.length
    ? confirmedRevenue / confirmedReservations.length
    : 0;
  const reservationConversion = percent(
    confirmedReservations.length,
    confirmedReservations.length + pending.length + cancelledReservations.length,
  );
  const displayMoney = (value: number) =>
    financialValuesVisible ? currency.format(value) : "R$ •••••";
  const flowColors: Record<ReservationFlow, string> = {
    site_organic: "#159fd5",
    agent_card: "#6758c7",
    agent_pix: "#21aa70",
    whatsapp: "#45b9c1",
    manual: "#f0a238",
    unknown: "#a7b4bd",
  };
  const reservationFlows = (
    [
      "site_organic",
      "agent_card",
      "agent_pix",
      "whatsapp",
      "manual",
      "unknown",
    ] as ReservationFlow[]
  )
    .map((flow) => {
      const items = reservations.filter((item) => item.flow === flow);
      return {
        flow,
        label: reservationFlowLabel(flow),
        count: items.length,
        confirmed: items.filter((item) => isPaid(item.status)).length,
        color: flowColors[flow],
      };
    })
    .filter((item) => item.count > 0);
  const maxFlowCount = Math.max(1, ...reservationFlows.map((item) => item.count));
  const revenueByDayMap = new Map<string, number>();
  confirmedReservations.forEach((item) =>
    revenueByDayMap.set(
      item.date,
      (revenueByDayMap.get(item.date) ?? 0) + item.value,
    ),
  );
  const revenueByDay = Array.from(revenueByDayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([date, value]) => ({ date, value }));
  const maxDailyRevenue = Math.max(1, ...revenueByDay.map((item) => item.value));
  const metrics = [
    {
      label: "Oportunidades abertas",
      value: opportunityKeys.size,
      hint: "contatos únicos para agir",
      icon: FaUserFriends,
      tone: "blue",
    },
    {
      label: "Oportunidades perdidas",
      value: lostKeys.size,
      hint: `${recoverableLostKeys.size} aptas para recuperação`,
      icon: FaExclamationCircle,
      tone: "red",
    },
    {
      label: "Reservas confirmadas",
      value: confirmedReservations.length,
      hint: `${reservationConversion}% de conversão`,
      icon: FaCheckCircle,
      tone: "green",
    },
    {
      label: "Receita confirmada",
      value: displayMoney(confirmedRevenue),
      hint: `${confirmedReservations.length} pagamentos no período`,
      icon: FaMoneyBillWave,
      tone: "orange",
    },
    {
      label: "Conversão de reservas",
      value: `${reservationConversion}%`,
      hint: "confirmadas sobre decisões registradas",
      icon: FaChartLine,
      tone: "green",
    },
    {
      label: "Campanhas ativas",
      value: activeCampaigns.length,
      hint: `${campaigns.length} no período`,
      icon: FaBullhorn,
      tone: "blue",
    },
  ];
  const radarItems = [
    {
      label: "Recuperar oportunidades perdidas",
      description: "Checkouts e conversas encerradas sem reserva, com opt-in.",
      count: recoverableLostKeys.size,
      icon: FaExclamationCircle,
      tone: "red",
      section: "campanhas" as SectionKey,
    },
    {
      label: "Recuperar checkout abandonado",
      description: "Parou no formulário e autorizou contato pelo WhatsApp.",
      count: recoverableKeys.size,
      icon: FaLink,
      tone: "blue",
      section: "jornadas" as SectionKey,
    },
    {
      label: "Retomar conversa do agente",
      description: "Atendimento iniciado, mas ainda sem uma conclusão.",
      count: openLeads.length,
      icon: FaWhatsapp,
      tone: "green",
      section: "jornadas" as SectionKey,
    },
    {
      label: "Acompanhar pagamento pendente",
      description: "Cliente chegou à cobrança e ainda não concluiu.",
      count: paymentKeys.size,
      icon: FaClock,
      tone: "orange",
      section: "jornadas" as SectionKey,
    },
  ];
  const funnel = [
    { label: "Novos / em atendimento", value: activeLeads.length, tone: "#169fd2" },
    { label: "Aguardando cliente", value: waitingLeads.length, tone: "#75c7e6" },
    { label: "Pagamento pendente", value: paymentLeads.length, tone: "#f3a33b" },
    { label: "Oportunidade perdida", value: lostLeads.length, tone: "#df5360" },
    { label: "Reserva confirmada", value: confirmedLeads.length, tone: "#23ae75" },
    { label: "Sem oportunidade", value: closedLeads.length, tone: "#a8b6c0" },
  ];
  const maxFunnel = Math.max(1, ...funnel.map((item) => item.value));
  const recentCampaigns = campaigns
    .slice()
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 4);
  const recentOpportunityKeys = new Set<string>();
  const recentOpportunities = [
    ...recoverableJourneys.map((item) => ({
      id: `jornada-${item.id}`,
      name: item.name ?? "Nome não informado",
      phone: item.phone ?? "",
      interest: item.activities.join(" + ") || "Reserva pelo site",
      stage: `Checkout na etapa ${item.stage}`,
      nextAction: "Recuperar pelo WhatsApp",
      updatedAt: item.lastEventAt,
      isTest: false,
    })),
    ...displayedOpenLeads.map((item) => ({
      id: `agente-${item.id}`,
      name: item.name ?? "Nome não informado",
      phone: item.phone,
      interest: item.activities.join(" + ") || "Interesse em coleta",
      stage: humanizeCrmLabel(item.stage),
      nextAction: item.nextAction ?? "Acompanhar atendimento",
      updatedAt: item.updatedAt,
      isTest: item.isTest,
    })),
  ]
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .filter((item) => {
      const key = contactKey(item.phone, item.id);
      if (recentOpportunityKeys.has(key)) return false;
      recentOpportunityKeys.add(key);
      return true;
    })
    .slice(0, 6);

  return (
    <div className="crm-dashboard">
      <div className="crm-metrics-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article
              className={`crm-metric-card crm-tone--${metric.tone}`}
              key={metric.label}
            >
              <span className="crm-metric-card__icon"><Icon /></span>
              <div>
                <p>{metric.label}</p>
                <strong>{metric.value}</strong>
                <em>{metric.hint}</em>
              </div>
            </article>
          );
        })}
      </div>

      <div className="crm-dashboard-grid crm-dashboard-grid--opportunities">
        <article className="crm-card crm-opportunity-radar">
          <div className="crm-card__head">
            <div><span><FaFilter /></span><h3>Radar de oportunidades</h3></div>
            <button onClick={() => onNavigate("jornadas")}>Ver todas <FaArrowRight /></button>
          </div>
          <p className="crm-card__intro">
            Filas reais que podem virar atendimento, recuperação ou campanha.
          </p>
          <div className="crm-opportunity-radar__grid">
            {radarItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={item.label}
                  className={`crm-opportunity-item crm-tone--${item.tone}`}
                  onClick={() => onNavigate(item.section)}
                >
                  <span><Icon /></span>
                  <div><strong>{item.label}</strong><small>{item.description}</small></div>
                  <em>{item.count}</em>
                  <FaChevronRight />
                </button>
              );
            })}
          </div>
        </article>

        <article className="crm-card crm-campaign-overview">
          <div className="crm-card__head">
            <div><span><FaBullhorn /></span><h3>Campanhas no período</h3></div>
            <button onClick={() => onNavigate("campanhas")}>Gerenciar <FaArrowRight /></button>
          </div>
          <div className="crm-campaign-summary">
            <div><span>Elegíveis</span><strong>{campaignTotals.eligible}</strong></div>
            <div><span>Enviadas</span><strong>{campaignTotals.sent}</strong></div>
            <div><span>Respostas</span><strong>{campaignTotals.replies}</strong></div>
            <div><span>Conversões</span><strong>{campaignTotals.conversions}</strong></div>
          </div>
          <div className="crm-dashboard-campaigns">
            {recentCampaigns.length ? recentCampaigns.map((campaign) => {
              const eligible = Math.max(1, campaign.eligible ?? campaign.audienceSize ?? 0);
              const processed = (campaign.sent ?? 0) + (campaign.errors ?? 0) + (campaign.ignored ?? 0);
              return (
                <div key={campaign.id} className="crm-dashboard-campaign">
                  <div>
                    <p><strong>{campaign.name}</strong><span>{humanizeCrmLabel(campaign.status)}</span></p>
                    <small>{campaign.segmentLabel}</small>
                  </div>
                  <div className="crm-dashboard-campaign__progress">
                    <i><span style={{ width: `${Math.min(100, percent(processed, eligible))}%` }} /></i>
                    <em>{processed}/{eligible}</em>
                  </div>
                </div>
              );
            }) : (
              <div className="crm-dashboard-empty">
                <FaBullhorn /><p><strong>Nenhuma campanha neste período</strong><span>Crie uma campanha a partir dos públicos disponíveis.</span></p>
              </div>
            )}
          </div>
        </article>
      </div>

      <div className="crm-dashboard-grid crm-dashboard-grid--analytics">
        <article className="crm-card crm-dashboard-finance">
          <div className="crm-card__head">
            <div><span><FaMoneyBillWave /></span><h3>Resumo financeiro</h3></div>
            <button
              type="button"
              onClick={onToggleFinancialValues}
              aria-label={
                financialValuesVisible
                  ? "Ocultar valores financeiros"
                  : "Mostrar valores financeiros"
              }
            >
              {financialValuesVisible ? <FaEyeSlash /> : <FaEye />}
              {financialValuesVisible ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <div className="crm-dashboard-finance__grid">
            <div>
              <span>Confirmado</span>
              <strong className={!financialValuesVisible ? "is-private" : ""}>
                {displayMoney(confirmedRevenue)}
              </strong>
              <small>{confirmedReservations.length} reservas pagas</small>
            </div>
            <div>
              <span>Pendente</span>
              <strong className={!financialValuesVisible ? "is-private" : ""}>
                {displayMoney(pendingRevenue)}
              </strong>
              <small>{pending.length} pagamentos</small>
            </div>
            <div>
              <span>Ticket médio</span>
              <strong className={!financialValuesVisible ? "is-private" : ""}>
                {displayMoney(averageTicket)}
              </strong>
              <small>por reserva confirmada</small>
            </div>
            <div>
              <span>Receita de campanhas</span>
              <strong className={!financialValuesVisible ? "is-private" : ""}>
                {displayMoney(campaignTotals.revenue)}
              </strong>
              <small>{campaignTotals.conversions} conversões atribuídas</small>
            </div>
          </div>
          <button
            type="button"
            className="crm-dashboard-finance__link"
            onClick={() => onNavigate("financeiro")}
          >
            Abrir análise financeira <FaArrowRight />
          </button>
        </article>

        <article className="crm-card crm-flow-analysis">
          <div className="crm-card__head">
            <div><span><FaGlobe /></span><h3>Reservas por fluxo</h3></div>
            <button onClick={() => onNavigate("reservas")}>Filtrar <FaArrowRight /></button>
          </div>
          {reservationFlows.length ? (
            <div className="crm-flow-analysis__list">
              {reservationFlows.map((item) => (
                <div key={item.flow}>
                  <p>
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                    <small>{percent(item.confirmed, item.count)}% confirmadas</small>
                  </p>
                  <i>
                    <span
                      style={{
                        width: `${Math.max(4, (item.count / maxFlowCount) * 100)}%`,
                        background: item.color,
                      }}
                    />
                  </i>
                </div>
              ))}
            </div>
          ) : (
            <div className="crm-dashboard-empty">
              <FaGlobe /><p><strong>Sem reservas no período</strong><span>Altere o filtro de datas para comparar os canais.</span></p>
            </div>
          )}
        </article>

        <article className="crm-card crm-revenue-trend">
          <div className="crm-card__head">
            <div><span><FaChartBar /></span><h3>Receita confirmada por dia</h3></div>
            <small>Últimos {revenueByDay.length || 0} dias com vendas</small>
          </div>
          {revenueByDay.length ? (
            <div className={`crm-revenue-trend__chart${financialValuesVisible ? "" : " is-hidden"}`}>
              {revenueByDay.map((item) => (
                <div key={item.date}>
                  <span
                    style={{
                      height: financialValuesVisible
                        ? `${Math.max(6, (item.value / maxDailyRevenue) * 100)}%`
                        : "18%",
                    }}
                  />
                  <small>{dayjs(item.date).format("DD/MM")}</small>
                  <em>
                    {financialValuesVisible ? currency.format(item.value) : "oculto"}
                  </em>
                </div>
              ))}
            </div>
          ) : (
            <div className="crm-dashboard-empty">
              <FaChartBar /><p><strong>Sem receita confirmada</strong><span>Os pagamentos aprovados aparecerão neste gráfico.</span></p>
            </div>
          )}
        </article>
      </div>

      <div className="crm-dashboard-grid crm-dashboard-grid--strategy">
        <article className="crm-card crm-latest-leads crm-opportunity-table">
          <div className="crm-card__head">
            <div><span><FaUserFriends /></span><h3>Oportunidades recentes</h3></div>
            <button onClick={() => onNavigate("jornadas")}>Acompanhar <FaArrowRight /></button>
          </div>
          {recentOpportunities.length ? (
            <div className="crm-table-wrap">
              <table>
                <thead><tr><th>Contato</th><th>Interesse</th><th>Etapa</th><th>Próxima ação</th><th>Atualização</th></tr></thead>
                <tbody>
                  {recentOpportunities.map((opportunity) => (
                    <tr key={opportunity.id}>
                      <td><strong>{opportunity.name}</strong><small>{formatPhone(opportunity.phone)}</small></td>
                      <td>{opportunity.interest}</td>
                      <td>
                        <span className="crm-pill crm-pill--interessado">{opportunity.stage}</span>
                        {opportunity.isTest ? <small className="crm-test-flag">Teste</small> : null}
                      </td>
                      <td>{opportunity.nextAction}</td>
                      <td>{opportunity.updatedAt ? dayjs(opportunity.updatedAt).format("DD/MM, HH:mm") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="crm-dashboard-empty">
              <FaCheckCircle /><p><strong>Nenhuma oportunidade aberta no período</strong><span>Novos abandonos e conversas aparecerão aqui.</span></p>
            </div>
          )}
        </article>

        <article className="crm-card crm-lead-funnel">
          <div className="crm-card__head">
            <div><span><FaChartBar /></span><h3>Funil dos leads</h3></div>
          </div>
          <div className="crm-lead-funnel__list">
            {funnel.map((item) => (
              <div key={item.label}>
                <p><span>{item.label}</span><strong>{item.value}</strong></p>
                <i><span style={{ width: `${Math.max(3, (item.value / maxFunnel) * 100)}%`, background: item.tone }} /></i>
              </div>
            ))}
          </div>
          <small className="crm-card__note">
            Cada lead aparece em uma única etapa conforme seu estado mais atual.
          </small>
        </article>

        <article className="crm-card crm-reactivation">
          <div className="crm-card__head">
            <div><span><FaUsers /></span><h3>Públicos para estratégia</h3></div>
            <button onClick={() => onNavigate("campanhas")}>Criar campanha <FaArrowRight /></button>
          </div>
          <div className="crm-reactivation__list">
            <div><span><FaExclamationCircle /></span><p><strong>Oportunidades perdidas</strong><small>{recoverableLostKeys.size} contatos com opt-in</small></p><em className="is-ready">Disponível</em></div>
            <div><span><FaClock /></span><p><strong>Sem visita há 90+ dias</strong><small>{inactive90.length} clientes</small></p><em className="is-ready">Disponível</em></div>
            <div><span><FaUsers /></span><p><strong>Sem visita há 180+ dias</strong><small>{inactive180.length} clientes</small></p><em className="is-ready">Disponível</em></div>
            <div><span><FaSyncAlt /></span><p><strong>Clientes recorrentes</strong><small>{recurring.length} clientes</small></p><em className="is-ready">Disponível</em></div>
          </div>
          <blockquote>Públicos calculados pela base atual de reservas confirmadas.</blockquote>
        </article>
      </div>
    </div>
  );
}

function ReservationsSection({
  reservations,
  loading,
  periodLabel,
  valuesVisible,
  onToggleValues,
}: {
  reservations: CRMReservation[];
  loading: boolean;
  periodLabel: string;
  valuesVisible: boolean;
  onToggleValues: () => void;
}) {
  const [filter, setFilter] = useState("todas");
  const [source, setSource] = useState("todas");
  const [flow, setFlow] = useState<ReservationFlow | "todas">("todas");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const sourceOptions = Array.from(
    new Set(
      reservations
        .map((item) => item.sourceDomain)
        .filter((item): item is string => Boolean(item)),
    ),
  ).sort();
  const visible = reservations
    .filter((item) => {
      const search = normalizeText(
        `${item.name} ${item.activity} ${item.phone} ${item.sourceDomain ?? ""} ${reservationFlowLabel(item.flow)} ${item.paymentMethod ?? ""}`,
      );
      const matches =
        filter === "todas" ||
        (filter === "confirmadas" && isPaid(item.status)) ||
        (filter === "pendentes" && isPending(item.status)) ||
        (filter === "canceladas" && isCancelled(item.status)) ||
        normalizeText(item.activity).includes(filter);
      const matchesSource =
        source === "todas" ||
        (source === "sem-dominio"
          ? !item.sourceDomain
          : item.sourceDomain === source);
      const matchesFlow = flow === "todas" || item.flow === flow;
      return (
        matches &&
        matchesSource &&
        matchesFlow &&
        search.includes(normalizeText(query))
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = visible.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  useEffect(() => setPage(1), [filter, flow, query, source]);
  const download = () =>
    exportCsv(
      `reservas-${dayjs().format("YYYY-MM-DD")}.csv`,
      visible.map((item) => ({
        reserva: item.id,
        cliente: item.name,
        telefone: item.phone,
        experiencia: item.activity,
        data: item.date,
        horario: item.time,
        pessoas: item.people,
        valor: item.value,
        status: statusLabel(item.status),
        origem: originLabel(item.origin),
        fluxo: reservationFlowLabel(item.flow),
        formaPagamento: item.paymentMethod ?? "",
        dominioOrigem: item.sourceDomain ?? "",
        campanhaId: item.campaignId ?? "",
        tipoAtribuicao:
          item.sourceAttribution === "historical_inference"
            ? "Histórico informado"
            : item.sourceAttribution === "captured"
              ? "Capturada"
              : "Não identificada",
      })),
    );
  return (
    <section className="crm-section">
      <SectionTitle
        title="Histórico de reservas"
        subtitle={`Consulta no período: ${periodLabel}. Esta área não cria ou altera reservas.`}
        actions={
          <>
            <button
              type="button"
              className="crm-privacy-toggle"
              onClick={onToggleValues}
              aria-pressed={valuesVisible}
            >
              {valuesVisible ? <FaEyeSlash /> : <FaEye />}
              {valuesVisible ? "Ocultar valores" : "Mostrar valores"}
            </button>
            <button className="crm-secondary-button" onClick={download}>
              <FaDownload /> Exportar CSV
            </button>
          </>
        }
      />
      <div className="crm-summary-strip">
        <article>
          <span className="is-blue">
            <FaCalendarAlt />
          </span>
          <div>
            <small>Registros no período</small>
            <strong>{reservations.length}</strong>
          </div>
        </article>
        <article>
          <span className="is-green">
            <FaCheckCircle />
          </span>
          <div>
            <small>Confirmadas</small>
            <strong>
              {reservations.filter((item) => isPaid(item.status)).length}
            </strong>
          </div>
        </article>
        <article>
          <span className="is-orange">
            <FaClock />
          </span>
          <div>
            <small>Pendentes</small>
            <strong>
              {reservations.filter((item) => isPending(item.status)).length}
            </strong>
          </div>
        </article>
        <article>
          <span className="is-violet">
            <FaMoneyBillWave />
          </span>
          <div>
            <small>Receita confirmada</small>
            <strong className={!valuesVisible ? "is-private" : ""}>
              {valuesVisible
                ? currency.format(
                    reservations
                      .filter((item) => isPaid(item.status))
                      .reduce((sum, item) => sum + item.value, 0),
                  )
                : "R$ •••••"}
            </strong>
          </div>
        </article>
      </div>
      <div className="crm-card crm-data-card">
        <div className="crm-data-toolbar">
          <div className="crm-inline-search">
            <FaSearch />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar reserva, cliente ou domínio"
            />
          </div>
          <div className="crm-filter-tabs">
            {[
              "todas",
              "brunch",
              "trilha",
              "confirmadas",
              "pendentes",
              "canceladas",
            ].map((item) => (
              <button
                className={filter === item ? "is-active" : ""}
                onClick={() => setFilter(item)}
                key={item}
              >
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
          <select
            aria-label="Filtrar fluxo da reserva"
            value={flow}
            onChange={(event) =>
              setFlow(event.target.value as ReservationFlow | "todas")
            }
          >
            <option value="todas">Todos os fluxos</option>
            <option value="site_organic">Site direto</option>
            <option value="agent_card">Bot → site · Cartão</option>
            <option value="agent_pix">Bot · PIX</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="manual">Manual</option>
            <option value="unknown">Não identificada</option>
          </select>
          <select
            aria-label="Filtrar domínio de origem"
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="todas">Todos os domínios</option>
            <option value="sem-dominio">Sem domínio registrado</option>
            {sourceOptions.map((domain) => (
              <option value={domain} key={domain}>
                {domain}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <div className="crm-loading">
            <FaSyncAlt /> Sincronizando reservas...
          </div>
        ) : pageItems.length ? (
          <>
            <div className="crm-table-wrap">
              <table className="crm-data-table">
                <thead>
                  <tr>
                    <th>Reserva</th>
                    <th>Cliente</th>
                    <th>Experiência</th>
                    <th>Data</th>
                    <th>Valor</th>
                    <th>Origem</th>
                    <th>Domínio</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="crm-code">
                          #{item.id.slice(-6).toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="crm-person-cell">
                          <span>{initials(item.name)}</span>
                          <div>
                            <strong>{item.name}</strong>
                            <small>
                              {formatPhone(item.phone) ||
                                "Telefone não informado"}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>{item.activity}</td>
                      <td>
                        <strong>{dayjs(item.date).format("DD/MM/YYYY")}</strong>
                        <small className="crm-cell-subtitle">{item.time}</small>
                      </td>
                      <td>
                        <strong className={!valuesVisible ? "is-private" : ""}>
                          {valuesVisible ? currency.format(item.value) : "R$ •••••"}
                        </strong>
                      </td>
                      <td>
                        <span className="crm-origin-badge">
                          {reservationFlowLabel(item.flow)}
                        </span>
                        {item.paymentMethod ? (
                          <small className="crm-cell-subtitle">
                            {humanizeCrmLabel(item.paymentMethod)}
                          </small>
                        ) : null}
                      </td>
                      <td>
                        <strong>{item.sourceDomain ?? "—"}</strong>
                        {item.sourceAttribution === "historical_inference" ? (
                          <small className="crm-cell-subtitle">
                            Histórico informado
                          </small>
                        ) : null}
                      </td>
                      <td>
                        <span
                          className={`crm-status crm-status--${isCancelled(item.status) ? "cancelled" : isPending(item.status) ? "pending" : "confirmed"}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              total={visible.length}
              pageSize={pageSize}
              setPage={setPage}
            />
          </>
        ) : (
          <EmptyState
            icon={FaCalendarAlt}
            title="Nenhuma reserva encontrada"
            text="Altere o período ou os filtros selecionados."
          />
        )}
      </div>
    </section>
  );
}

function JourneysSection({
  customers,
  journeys,
  agentLeads,
  journeysError,
  onCreateCampaign,
}: {
  customers: Customer[];
  journeys: JourneyRecord[];
  agentLeads: AgentLeadRecord[];
  journeysError: string;
  onCreateCampaign: () => void;
}) {
  const [view, setView] = useState<"abandoned" | "reactivation">("abandoned");
  const [agentFilter, setAgentFilter] = useState<
    "all" | "open" | "lost" | "confirmed" | "closed"
  >("all");
  const [segment, setSegment] = useState<"90" | "180" | "365">("180");
  const threshold = Number(segment);
  const inactive = customers
    .filter((item) => item.daysInactive >= threshold)
    .sort((a, b) => b.daysInactive - a.daysInactive);
  const abandoned = journeys
    .filter(journeyIsAbandoned)
    .sort((a, b) => (b.lastEventAt ?? "").localeCompare(a.lastEventAt ?? ""));
  const recoverable = abandoned.filter(
    (item) => item.recoveryOptIn && item.phone,
  );
  const converted = journeys.filter((item) => item.status === "convertida");
  const active = journeys.filter(
    (item) => item.status !== "convertida" && !journeyIsAbandoned(item),
  );
  const realAgentLeads = agentLeads.filter((item) => !item.isTest);
  const lostAgentLeads = realAgentLeads.filter(agentLeadIsLost);
  const visibleAgentLeads = agentLeads.filter((item) => {
    if (agentFilter === "open") return agentLeadIsOpen(item);
    if (agentFilter === "lost") return agentLeadIsLost(item);
    if (agentFilter === "confirmed") return agentLeadIsConfirmed(item);
    if (agentFilter === "closed")
      return agentLeadIsClosedWithoutOpportunity(item);
    return true;
  });
  const domainStats = ["vagafogopiri.com.br", "vagafogo.com.br"].map(
    (domain) => ({
      domain,
      started: journeys.filter((item) => item.sourceDomain === domain).length,
      converted: journeys.filter(
        (item) => item.sourceDomain === domain && item.status === "convertida",
      ).length,
    }),
  );
  const stageLabel = (stage: number) =>
    ["Pacotes", "Data", "Horários", "Participantes", "Pagamento"][stage] ??
    "Início";

  return (
    <section className="crm-section">
      <SectionTitle
        title="Jornadas e recuperação"
        subtitle="Jornadas pela última atividade no período; reativação pela última visita, sem armazenar contato antes do consentimento."
        actions={
          <button className="crm-primary-button" onClick={onCreateCampaign}>
            <FaBullhorn /> Planejar campanha
          </button>
        }
      />
      {journeysError ? (
        <div className="crm-demo-notice">
          <FaExclamationCircle />
          <span>{journeysError}</span>
        </div>
      ) : null}
      <div className="crm-summary-strip crm-summary-strip--five">
        <article>
          <span className="is-blue">
            <FaGlobe />
          </span>
          <div>
            <small>Jornadas iniciadas</small>
            <strong>{journeys.length}</strong>
          </div>
        </article>
        <article>
          <span className="is-green">
            <FaCheckCircle />
          </span>
          <div>
            <small>Convertidas em reserva</small>
            <strong>{converted.length}</strong>
          </div>
        </article>
        <article>
          <span className="is-orange">
            <FaClock />
          </span>
          <div>
            <small>Em andamento</small>
            <strong>{active.length}</strong>
          </div>
        </article>
        <article>
          <span className="is-red">
            <FaUserFriends />
          </span>
          <div>
            <small>Recuperáveis com opt-in</small>
            <strong>{recoverable.length}</strong>
          </div>
        </article>
        <article>
          <span className="is-red">
            <FaExclamationCircle />
          </span>
          <div>
            <small>Perdidas pelo Agente</small>
            <strong>{lostAgentLeads.length}</strong>
          </div>
        </article>
      </div>
      <div className="crm-journey-availability">
        <article className="crm-card is-available">
          <span>
            <FaCheckCircle />
          </span>
          <div>
            <h3>Sites instrumentados</h3>
            <p>
              Domínio de origem, canal, UTMs, etapa alcançada, interesses,
              tentativa de pagamento, conversão e abandono após{" "}
              {ABANDONMENT_MINUTES} minutos.
            </p>
          </div>
        </article>
        <article className="crm-card is-available">
          <span>
            <FaRobot />
          </span>
          <div>
            <h3>Agente integrado</h3>
            <p>
              O atendimento envia apenas lead estruturado: etapa, resultado,
              interesse, data, participantes, valor, reserva e próxima ação —
              sem gravar a conversa.
            </p>
          </div>
        </article>
      </div>
      <div className="crm-card crm-data-card">
        <div className="crm-data-toolbar">
          <div>
            <strong className="crm-toolbar-title">
              Leads estruturados do Agente
            </strong>
            <small className="crm-toolbar-caption">
              {agentLeads.length} atualizado(s) no período · conversa bruta não
              armazenada
            </small>
          </div>
          <select
            aria-label="Filtrar resultado dos leads do Agente"
            value={agentFilter}
            onChange={(event) =>
              setAgentFilter(event.target.value as typeof agentFilter)
            }
          >
            <option value="all">Todos os resultados</option>
            <option value="open">Em andamento</option>
            <option value="lost">Oportunidades perdidas</option>
            <option value="confirmed">Reservas confirmadas</option>
            <option value="closed">Encerrados sem oportunidade</option>
          </select>
        </div>
        {visibleAgentLeads.length ? (
          <>
            <div className="crm-table-wrap">
              <table className="crm-data-table">
                <thead>
                  <tr>
                    <th>Contato</th>
                    <th>Etapa</th>
                    <th>Resultado</th>
                    <th>Interesse</th>
                    <th>Valor</th>
                    <th>Próxima ação</th>
                    <th>Atualização</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAgentLeads
                    .slice()
                    .sort((a, b) =>
                      (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
                    )
                    .slice(0, 100)
                    .map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="crm-person-cell">
                            <span>{initials(item.name ?? "Lead")}</span>
                            <div>
                              <strong>{item.name ?? "Lead do WhatsApp"}</strong>
                              <small>{formatPhone(item.phone)}{item.isTest ? " · TESTE PRIVADO" : ""}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="crm-pill crm-pill--aguardando-decisao">
                            {item.stage.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td>
                          <strong>{item.outcome.replaceAll("_", " ")}</strong>
                          {item.reason ? (
                            <small className="crm-cell-subtitle">
                              {item.reason}
                            </small>
                          ) : null}
                        </td>
                        <td>
                          {item.activities.join(" + ") || "Não informado"}
                          {item.desiredDate ? (
                            <small className="crm-cell-subtitle">
                              {dayjs(item.desiredDate).format("DD/MM/YYYY")} ·{" "}
                              {item.participants ?? 0} pessoa(s)
                            </small>
                          ) : null}
                        </td>
                        <td>
                          {item.estimatedValue == null
                            ? "—"
                            : currency.format(item.estimatedValue)}
                          {item.paymentMethod ? (
                            <small className="crm-cell-subtitle">
                              {item.paymentMethod}
                            </small>
                          ) : null}
                        </td>
                        <td>
                          {item.reservationId
                            ? `Reserva ${item.reservationId}`
                            : item.nextAction || "—"}
                          {item.marketingOptIn ? (
                            <small className="crm-cell-subtitle">
                              Opt-in de marketing
                            </small>
                          ) : null}
                        </td>
                        <td>
                          {item.updatedAt
                            ? dayjs(item.updatedAt).format("DD/MM/YYYY HH:mm")
                            : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState
            icon={FaRobot}
            title="Nenhum lead do Agente no período"
            text="Os resumos estruturados aparecerão aqui ao final dos atendimentos do WhatsApp."
          />
        )}
      </div>
      <div className="crm-card crm-data-card">
        <div className="crm-data-toolbar">
          <div>
            <strong className="crm-toolbar-title">
              Origem das novas jornadas
            </strong>
            <small className="crm-toolbar-caption">
              Medição válida a partir da publicação desta instrumentação
            </small>
          </div>
        </div>
        <div className="crm-summary-strip">
          {domainStats.map((item) => (
            <article key={item.domain}>
              <span className="is-blue">
                <FaGlobe />
              </span>
              <div>
                <small>{item.domain}</small>
                <strong>{item.started}</strong>
                <em>
                  {item.converted} convertida(s) ·{" "}
                  {percent(item.converted, item.started)}%
                </em>
              </div>
            </article>
          ))}
          <article>
            <span className="is-green">
              <FaWhatsapp />
            </span>
            <div>
              <small>Entrada via WhatsApp</small>
              <strong>
                {
                  journeys.filter((item) => item.sourceChannel === "whatsapp")
                    .length
                }
              </strong>
              <em>UTM/referrer identificado</em>
            </div>
          </article>
        </div>
      </div>
      <div className="crm-card crm-data-card">
        <div className="crm-data-toolbar">
          <div className="crm-filter-tabs">
            <button
              className={view === "abandoned" ? "is-active" : ""}
              onClick={() => setView("abandoned")}
            >
              Abandono do checkout
            </button>
            <button
              className={view === "reactivation" ? "is-active" : ""}
              onClick={() => setView("reactivation")}
            >
              Reativação histórica
            </button>
          </div>
          {view === "reactivation" ? (
            <select
              value={segment}
              onChange={(event) =>
                setSegment(event.target.value as typeof segment)
              }
            >
              <option value="90">90+ dias</option>
              <option value="180">180+ dias</option>
              <option value="365">1 ano ou mais</option>
            </select>
          ) : (
            <span className="crm-toolbar-caption">
              {recoverable.length} com contato e consentimento
            </span>
          )}
        </div>
        {view === "abandoned" ? (
          abandoned.length ? (
            <>
              <div className="crm-table-wrap">
                <table className="crm-data-table">
                  <thead>
                    <tr>
                      <th>Contato</th>
                      <th>Origem</th>
                      <th>Última etapa</th>
                      <th>Interesse</th>
                      <th>Última atividade</th>
                      <th>Recuperação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abandoned.slice(0, 100).map((item) => (
                      <tr key={item.id}>
                        <td>
                          {item.phone ? (
                            <div className="crm-person-cell">
                              <span>{initials(item.name ?? "Cliente")}</span>
                              <div>
                                <strong>{item.name ?? "Cliente"}</strong>
                                <small>{formatPhone(item.phone)}</small>
                              </div>
                            </div>
                          ) : (
                            <span>Visitante anônimo</span>
                          )}
                        </td>
                        <td>
                          <strong>
                            {item.sourceChannel === "whatsapp"
                              ? "WhatsApp"
                              : (item.sourceDomain ?? "Site não identificado")}
                          </strong>
                        </td>
                        <td>
                          <span className="crm-pill crm-pill--aguardando-decisao">
                            {stageLabel(item.stage)}
                          </span>
                          <small className="crm-cell-subtitle">
                            {item.paymentAttempted
                              ? "Tentou pagar"
                              : (item.substage ?? "")}
                          </small>
                        </td>
                        <td>
                          {item.activities.slice(0, 2).join(" + ") ||
                            "Não selecionado"}
                        </td>
                        <td>
                          {item.lastEventAt
                            ? dayjs(item.lastEventAt).format("DD/MM/YYYY HH:mm")
                            : "—"}
                        </td>
                        <td>
                          {item.recoveryOptIn && item.phone ? (
                            <span className="crm-status crm-status--confirmed">
                              Opt-in válido
                            </span>
                          ) : (
                            <span className="crm-status crm-status--pending">
                              Somente métrica
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="crm-pagination">
                <span>
                  Mostrando {Math.min(100, abandoned.length)} de{" "}
                  {abandoned.length} jornadas abandonadas
                </span>
              </div>
            </>
          ) : (
            <EmptyState
              icon={FaFileAlt}
              title="Nenhum abandono registrado"
              text="As novas jornadas aparecerão aqui após ficarem sem atividade por 30 minutos."
            />
          )
        ) : (
          <>
            <div className="crm-table-wrap">
              <table className="crm-data-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Telefone</th>
                    <th>Última visita</th>
                    <th>Sem retornar</th>
                    <th>Reservas</th>
                    <th>Valor histórico</th>
                    <th>Interesses</th>
                  </tr>
                </thead>
                <tbody>
                  {inactive.slice(0, 50).map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="crm-person-cell">
                          <span>{initials(item.name)}</span>
                          <strong>{item.name}</strong>
                        </div>
                      </td>
                      <td>{formatPhone(item.phone) || "Não informado"}</td>
                      <td>{dayjs(item.lastVisit).format("DD/MM/YYYY")}</td>
                      <td>
                        <span className="crm-pill crm-pill--aguardando-decisao">
                          {item.daysInactive} dias
                        </span>
                      </td>
                      <td>{item.bookings}</td>
                      <td>{currency.format(item.total)}</td>
                      <td>
                        <div className="crm-tag-list">
                          {item.interests.slice(0, 2).map((interest) => (
                            <span key={interest}>{interest}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="crm-pagination">
              <span>
                Mostrando os primeiros {Math.min(50, inactive.length)} de{" "}
                {inactive.length} clientes
              </span>
            </div>
          </>
        )}
      </div>
      <div className="crm-instrumentation-grid">
        <article className="crm-card">
          <span>
            <FaGlobe />
          </span>
          <h3>Sites Vagafogo</h3>
          <p>
            Os domínios publicados são normalizados sem “www”; travessias
            preservam o primeiro site por referrer ou parâmetro de origem.
          </p>
          <em>Ativo para novos acessos</em>
        </article>
        <article className="crm-card">
          <span>
            <FaFileAlt />
          </span>
          <h3>Abandono consentido</h3>
          <p>
            Jornadas sem contato servem apenas para métricas. Nome e WhatsApp só
            aparecem após o visitante marcar a autorização.
          </p>
          <em>Ativo</em>
        </article>
        <article className="crm-card">
          <span>
            <FaRobot />
          </span>
          <h3>WhatsApp integrado</h3>
          <p>
            O Agente usa sessionId para consultar disponibilidade, iniciar
            pagamento e registrar o resultado estruturado sem duplicar bancos.
          </p>
          <em>Preparado para homologação</em>
        </article>
      </div>
    </section>
  );
}

function CustomersSection({ customers }: { customers: Customer[] }) {
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("Todos");
  const [page, setPage] = useState(1);
  const visible = customers.filter(
    (item) =>
      (segment === "Todos" || item.status === segment) &&
      normalizeText(`${item.name} ${item.phone} ${item.email}`).includes(
        normalizeText(query),
      ),
  );
  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = visible.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  useEffect(() => setPage(1), [query, segment]);
  const download = () =>
    exportCsv(
      `clientes-${dayjs().format("YYYY-MM-DD")}.csv`,
      visible.map((item) => ({
        cliente: item.name,
        telefone: item.phone,
        email: item.email ?? "",
        reservas: item.bookings,
        total: item.total,
        ultimaVisita: item.lastVisit,
        diasSemVisita: item.daysInactive,
        segmento: item.status,
      })),
    );
  return (
    <section className="crm-section">
      <SectionTitle
        title="Base de clientes"
        subtitle="Clientes deduplicados com última visita no período selecionado."
        actions={
          <button className="crm-secondary-button" onClick={download}>
            <FaDownload /> Exportar base
          </button>
        }
      />
      <div className="crm-summary-strip">
        <article>
          <span className="is-blue">
            <FaUsers />
          </span>
          <div>
            <small>Clientes identificados</small>
            <strong>{customers.length}</strong>
          </div>
        </article>
        <article>
          <span className="is-green">
            <FaSyncAlt />
          </span>
          <div>
            <small>Recorrentes</small>
            <strong>
              {customers.filter((item) => item.bookings >= 2).length}
            </strong>
          </div>
        </article>
        <article>
          <span className="is-violet">
            <FaLeaf />
          </span>
          <div>
            <small>Alto valor</small>
            <strong>
              {customers.filter((item) => item.total >= 1500).length}
            </strong>
          </div>
        </article>
        <article>
          <span className="is-orange">
            <FaClock />
          </span>
          <div>
            <small>Inativos 180+</small>
            <strong>
              {customers.filter((item) => item.daysInactive >= 180).length}
            </strong>
          </div>
        </article>
      </div>
      <div className="crm-card crm-data-card">
        <div className="crm-data-toolbar">
          <div className="crm-inline-search">
            <FaSearch />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar cliente"
            />
          </div>
          <select
            value={segment}
            onChange={(event) => setSegment(event.target.value)}
          >
            <option>Todos</option>
            <option>Ativo</option>
            <option>Recorrente</option>
            <option>VIP</option>
            <option>Inativo</option>
          </select>
        </div>
        {pageItems.length ? (
          <>
            <div className="crm-customer-grid">
              {pageItems.map((item) => (
                <article key={item.id} className="crm-customer-card">
                  <div className="crm-customer-card__head">
                    <span>{initials(item.name)}</span>
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {item.email ||
                          formatPhone(item.phone) ||
                          "Contato não informado"}
                      </small>
                    </div>
                    <em className={`is-${normalizeText(item.status)}`}>
                      {item.status}
                    </em>
                  </div>
                  <div className="crm-customer-card__stats">
                    <div>
                      <small>Reservas</small>
                      <strong>{item.bookings}</strong>
                    </div>
                    <div>
                      <small>Total gasto</small>
                      <strong>{currency.format(item.total)}</strong>
                    </div>
                    <div>
                      <small>Sem visita</small>
                      <strong>{item.daysInactive} dias</strong>
                    </div>
                  </div>
                  <div className="crm-customer-card__footer">
                    <div className="crm-tag-list">
                      {item.interests.slice(0, 2).map((interest) => (
                        <span key={interest}>{interest}</span>
                      ))}
                    </div>
                    <span className="crm-last-date">
                      Última: {dayjs(item.lastVisit).format("DD/MM/YY")}
                    </span>
                  </div>
                </article>
              ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              total={visible.length}
              pageSize={pageSize}
              setPage={setPage}
            />
          </>
        ) : (
          <EmptyState
            icon={FaUsers}
            title="Nenhum cliente encontrado"
            text="Ajuste a busca ou selecione outro segmento."
          />
        )}
      </div>
    </section>
  );
}

function CampaignsSection({
  campaigns,
  campaignsError,
  customers,
  pendingReservations,
  audienceFor,
  onToast,
}: {
  campaigns: CampaignRecord[];
  campaignsError: string;
  customers: Customer[];
  pendingReservations: CRMReservation[];
  audienceFor: (segment: CampaignSegment) => number;
  onToast: (message: string) => void;
}) {
  const defaultVariants = [
    "Olá {nome}! Sentimos sua falta por aqui. Que tal viver uma nova experiência na Vagafogo? Responda esta mensagem se quiser saber as próximas datas.",
    "Oi, {nome}! Faz um tempo desde a sua última visita. Preparamos novos momentos na natureza e podemos ajudar você a escolher a melhor experiência.",
  ];
  const abandonedVariants = [
    "Olá {nome}! Você começou uma reserva na Vagafogo, mas não concluiu. Se quiser, responda esta mensagem e ajudamos a continuar de onde parou.",
    "Oi, {nome}! Notamos que sua reserva na Vagafogo ficou incompleta. Posso ajudar com datas, horários ou pagamento?",
  ];
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] =
    useState<CampaignSegment>("inactive180");
  const [variants, setVariants] = useState(defaultVariants);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [testingInternal, setTestingInternal] = useState(false);
  const [actionId, setActionId] = useState("");
  const [detailsCampaign, setDetailsCampaign] = useState<CampaignRecord | null>(
    null,
  );
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [recipientFilter, setRecipientFilter] = useState("todos");
  const [capability, setCapability] = useState<{
    envioHabilitado: boolean;
    conectado?: boolean;
    recomendacao?: string;
  } | null>(null);

  useEffect(() => {
    if (!mediaFile) {
      setMediaPreview("");
      return;
    }
    const url = URL.createObjectURL(mediaFile);
    setMediaPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [mediaFile]);

  useEffect(() => {
    const loadCapability = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const response = await fetch(`${API_BASE}/crm/campanhas/capacidade`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) setCapability(await response.json());
      } catch {
        setCapability(null);
      }
    };
    void loadCapability();
  }, []);

  useEffect(() => {
    if (!detailsCampaign) {
      setRecipients([]);
      return;
    }
    return onSnapshot(
      collection(db, "crm_campanhas", detailsCampaign.id, "destinatarios"),
      (snapshot) => {
        setRecipients(
          snapshot.docs.map((document) => {
            const raw = document.data() as Record<string, unknown>;
            return {
              id: document.id,
              name: String(raw.nome ?? "Cliente"),
              phone: String(raw.telefone ?? ""),
              status: String(raw.status ?? "aguardando"),
              attempts: toNumber(raw.tentativas),
              variant:
                raw.variacaoIndice === undefined
                  ? undefined
                  : toNumber(raw.variacaoIndice) + 1,
              sentAt: normalizeTimestamp(raw.enviadoEm),
              error: raw.ultimoErro
                ? String(raw.ultimoErro)
                : raw.erroAposEnvio
                  ? String(raw.erroAposEnvio)
                  : undefined,
              responseType: raw.tipoResposta
                ? String(raw.tipoResposta)
                : undefined,
              clickedAt: normalizeTimestamp(raw.clicadoEm),
              convertedAt: normalizeTimestamp(raw.convertidoEm),
              reservationId: raw.reservaIdGerada
                ? String(raw.reservaIdGerada)
                : undefined,
            };
          }),
        );
      },
      () => onToast("Não foi possível carregar os destinatários da campanha."),
    );
  }, [detailsCampaign, onToast]);

  const openBuilder = (segment: CampaignSegment) => {
    setSelectedSegment(segment);
    setVariants(
      segment === "abandoned" || segment === "lost"
        ? abandonedVariants
        : defaultVariants,
    );
    setMediaFile(null);
    setModalOpen(true);
  };

  const authenticatedRequest = async (
    path: string,
    body?: unknown,
    method = "POST",
  ) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
    const token = await user.getIdToken();
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const messages: Record<string, string> = {
        CAMPAIGN_SENDING_DISABLED:
          "O envio real permanece bloqueado até a ativação segura do provedor de campanhas.",
        CAMPAIGN_WITHOUT_ELIGIBLE_RECIPIENTS:
          "Nenhum contato desse público possui consentimento de marketing válido.",
        CRM_AUTH_POLICY_NOT_CONFIGURED:
          "Configure os administradores autorizados antes de operar campanhas.",
      };
      throw new Error(
        messages[data?.error] ?? data?.error ?? `Erro ${response.status}`,
      );
    }
    return data;
  };

  const uploadCampaignMedia = async (file: File): Promise<CampaignMedia> => {
    const allowedTypes: CampaignMedia["mimeType"][] = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type as CampaignMedia["mimeType"]))
      throw new Error("Use uma imagem JPG, PNG ou WebP.");
    if (!file.size || file.size > 5 * 1024 * 1024)
      throw new Error("A imagem deve ter no máximo 5 MB.");
    const user = auth.currentUser;
    if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
    const token = await user.getIdToken();
    const response = await fetch(`${API_BASE}/crm/campanhas/midia`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": file.type,
        "X-File-Name": encodeURIComponent(file.name),
      },
      body: file,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.midia) {
      const messages: Record<string, string> = {
        CAMPAIGN_MEDIA_TYPE_INVALID: "Use uma imagem JPG, PNG ou WebP.",
        CAMPAIGN_MEDIA_SIZE_INVALID: "A imagem deve ter no máximo 5 MB.",
        CAMPAIGN_MEDIA_CONTENT_INVALID:
          "O arquivo não contém uma imagem válida.",
      };
      throw new Error(
        messages[data?.error] ??
          data?.error ??
          "Não foi possível enviar a imagem.",
      );
    }
    return data.midia as CampaignMedia;
  };

  const saveDraft = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const validVariants = variants.map((value) => value.trim()).filter(Boolean);
    if (!validVariants.length) {
      onToast("Adicione ao menos uma variação de mensagem.");
      return;
    }
    setSaving(true);
    let uploadedMedia: CampaignMedia | undefined;
    try {
      if (mediaFile) uploadedMedia = await uploadCampaignMedia(mediaFile);
      const result = await authenticatedRequest("/crm/campanhas", {
        nome: String(data.get("name") ?? "").trim(),
        segmento: selectedSegment,
        variacoes: validVariants,
        intervaloMinSegundos: Number(data.get("intervalMin") ?? 120),
        intervaloMaxSegundos: Number(data.get("intervalMax") ?? 240),
        limiteDiario: Number(data.get("dailyLimit") ?? 100),
        horarioInicio: String(data.get("quietStart") ?? "08:00"),
        horarioFim: String(data.get("quietEnd") ?? "18:00"),
        maxTentativas: Number(data.get("maxAttempts") ?? 3),
        ...(uploadedMedia ? { midia: uploadedMedia } : {}),
      });
      setModalOpen(false);
      setMediaFile(null);
      onToast(
        `Rascunho criado: ${result.publicoElegivel} contato(s) com consentimento; ${result.semConsentimento} excluído(s) sem opt-in.`,
      );
    } catch (error) {
      if (uploadedMedia) {
        void authenticatedRequest(
          "/crm/campanhas/midia",
          { storagePath: uploadedMedia.storagePath },
          "DELETE",
        ).catch(() => undefined);
      }
      onToast(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a campanha.",
      );
    } finally {
      setSaving(false);
    }
  };

  const sendInternalTest = async () => {
    const validVariants = variants.map((value) => value.trim()).filter(Boolean);
    if (!validVariants.length) {
      onToast("Adicione ao menos uma variação antes do teste.");
      return;
    }
    if (
      !window.confirm(
        "Enviar agora um único teste desta campanha para o número interno configurado? Nenhum cliente da base será incluído.",
      )
    )
      return;
    setTestingInternal(true);
    let uploadedMedia: CampaignMedia | undefined;
    try {
      if (mediaFile) uploadedMedia = await uploadCampaignMedia(mediaFile);
      const result = await authenticatedRequest(
        "/crm/campanhas/teste-interno",
        {
          variacoes: validVariants,
          ...(uploadedMedia ? { midia: uploadedMedia } : {}),
        },
      );
      uploadedMedia = undefined;
      if (!result.enviado)
        throw new Error(
          `Teste não enviado: ${result.motivo ?? "erro desconhecido"}.`,
        );
      onToast(
        `Teste interno enviado para ${result.destinoMascarado} com a variação ${result.variacao} (${result.formato === "foto_legenda" ? "foto + legenda" : "texto"}).`,
      );
    } catch (error) {
      if (uploadedMedia) {
        void authenticatedRequest(
          "/crm/campanhas/midia",
          { storagePath: uploadedMedia.storagePath },
          "DELETE",
        ).catch(() => undefined);
      }
      onToast(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir o teste interno.",
      );
    } finally {
      setTestingInternal(false);
    }
  };

  const runAction = async (campaign: CampaignRecord, action: string) => {
    setActionId(`${campaign.id}:${action}`);
    try {
      const result = await authenticatedRequest(
        `/crm/campanhas/${campaign.id}/${action}`,
      );
      onToast(
        action === "reenfileirar-erros"
          ? `${result.reenfileirados ?? 0} erro(s) recolocado(s) na fila.`
          : "Campanha atualizada.",
      );
    } catch (error) {
      onToast(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a campanha.",
      );
    } finally {
      setActionId("");
    }
  };

  const totalSent = campaigns.reduce((sum, item) => sum + (item.sent ?? 0), 0);
  const totalQueued = campaigns.reduce(
    (sum, item) => sum + (item.queued ?? 0),
    0,
  );
  const totalErrors = campaigns.reduce(
    (sum, item) => sum + (item.errors ?? 0),
    0,
  );
  const visibleRecipients = recipients.filter(
    (item) => recipientFilter === "todos" || item.status === recipientFilter,
  );
  const statusTone = (status: CampaignRecord["status"]) =>
    status === "concluida"
      ? "confirmed"
      : status === "cancelada"
        ? "cancelled"
        : "pending";

  return (
    <section className="crm-section">
      <SectionTitle
        title="Operação de campanhas"
        subtitle="O histórico e seus indicadores respeitam o período selecionado; o público operacional usa a base atual completa."
        actions={
          <button
            className="crm-primary-button"
            onClick={() => openBuilder("inactive180")}
          >
            <FaPlus /> Nova campanha
          </button>
        }
      />
      {campaignsError ? (
        <div className="crm-demo-notice">
          <FaExclamationCircle />
          <span>{campaignsError}</span>
        </div>
      ) : null}
      <div
        className={`crm-whatsapp-connection ${capability?.conectado ? "crm-whatsapp-connection--ready" : ""}`}
      >
        <div className="crm-whatsapp-connection__head">
          <div className="crm-whatsapp-connection__title">
            <span>
              <FaWhatsapp />
            </span>
            <div>
              <small>Sessão exclusiva para disparos</small>
              <h3>Central WhatsApp do Admin</h3>
              <p>
                Campanhas, avisos internos e automações usam esta sessão. O
                número do Agente permanece separado e exclusivo para
                atendimento.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="crm-primary-button"
            onClick={() => window.location.assign("/admin?aba=whatsapp")}
          >
            <FaWhatsapp /> Abrir Central WhatsApp
          </button>
        </div>
      </div>
      <div className="crm-summary-strip">
        <article>
          <span className="is-blue">
            <FaBullhorn />
          </span>
          <div>
            <small>Campanhas registradas</small>
            <strong>{campaigns.length}</strong>
          </div>
        </article>
        <article>
          <span className="is-green">
            <FaWhatsapp />
          </span>
          <div>
            <small>Envios efetuados</small>
            <strong>{compactNumber.format(totalSent)}</strong>
          </div>
        </article>
        <article>
          <span className="is-orange">
            <FaClock />
          </span>
          <div>
            <small>Aguardando envio</small>
            <strong>{compactNumber.format(totalQueued)}</strong>
          </div>
        </article>
        <article>
          <span className="is-red">
            <FaExclamationCircle />
          </span>
          <div>
            <small>Erros finais</small>
            <strong>{compactNumber.format(totalErrors)}</strong>
          </div>
        </article>
      </div>
      <div className="crm-campaign-compliance">
        <FaCheckCircle />
        <div>
          <strong>Proteções aplicadas</strong>
          <p>
            Telefone deduplicado, opt-in obrigatório, opt-out automático por
            “SAIR”, horário permitido, limite diário, intervalo aleatório
            configurável, tentativas controladas, pausa, foto com legenda e
            auditoria por destinatário.
          </p>
        </div>
        <span
          className={capability?.envioHabilitado ? "is-enabled" : "is-disabled"}
        >
          {capability?.envioHabilitado
            ? "Envio habilitado"
            : "Envio real bloqueado"}
        </span>
      </div>
      <div className="crm-segment-grid">
        {(Object.keys(segmentMeta) as CampaignSegment[]).map((segment) => (
          <article className="crm-card" key={segment}>
            <span>
              <FaFilter />
            </span>
            <div>
              <h3>{segmentMeta[segment].label}</h3>
              <p>{segmentMeta[segment].description}</p>
              <strong>
                {audienceFor(segment)} contatos na base · opt-in verificado ao
                criar
              </strong>
            </div>
            <button onClick={() => openBuilder(segment)}>
              Configurar <FaChevronRight />
            </button>
          </article>
        ))}
      </div>
      <div className="crm-card crm-campaign-history">
        <div className="crm-card__head">
          <div>
            <span>
              <FaBullhorn />
            </span>
            <h3>Campanhas e progresso</h3>
          </div>
          <small>
            Base atual: {customers.filter((item) => item.phone).length} clientes
            com telefone · {pendingReservations.length} pagamentos pendentes
          </small>
        </div>
        {campaigns.length ? (
          <div className="crm-campaign-operations">
            {campaigns
              .slice()
              .sort((a, b) =>
                (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
              )
              .map((item) => {
                const eligible = item.eligible ?? item.audienceSize;
                const remaining =
                  item.queued ??
                  Math.max(
                    0,
                    eligible -
                      (item.sent ?? 0) -
                      (item.errors ?? 0) -
                      (item.ignored ?? 0),
                  );
                const progress = percent(
                  Math.max(0, eligible - remaining),
                  eligible,
                );
                const conversionRate = percent(
                  item.conversions ?? 0,
                  item.sent ?? 0,
                );
                return (
                  <article key={item.id} className="crm-campaign-operation">
                    <div className="crm-campaign-operation__head">
                      <div>
                        <strong>{item.name}</strong>
                        <small>
                          {item.segmentLabel} · criada{" "}
                          {item.createdAt
                            ? dayjs(item.createdAt).format("DD/MM/YYYY HH:mm")
                            : "--"}
                        </small>
                      </div>
                      <span
                        className={`crm-status crm-status--${statusTone(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="crm-campaign-progress">
                      <div>
                        <i style={{ width: `${progress}%` }} />
                      </div>
                      <strong>{progress}%</strong>
                      <small>{remaining} faltando</small>
                    </div>
                    <div className="crm-campaign-operation__stats">
                      <div>
                        <small>Elegíveis</small>
                        <strong>{eligible}</strong>
                      </div>
                      <div>
                        <small>Enviadas</small>
                        <strong>{item.sent ?? 0}</strong>
                      </div>
                      <div>
                        <small>Entregues</small>
                        <strong>{item.delivered ?? 0}</strong>
                      </div>
                      <div>
                        <small>Respostas</small>
                        <strong>{item.replies ?? 0}</strong>
                      </div>
                      <div>
                        <small>Cliques</small>
                        <strong>{item.clicks ?? 0}</strong>
                      </div>
                      <div>
                        <small>Reservas</small>
                        <strong>{item.bookings ?? 0}</strong>
                      </div>
                      <div>
                        <small>Pagas</small>
                        <strong>{item.conversions ?? 0}</strong>
                      </div>
                      <div>
                        <small>Conversão</small>
                        <strong>{conversionRate}%</strong>
                      </div>
                      <div>
                        <small>Receita</small>
                        <strong>{currency.format(item.revenue ?? 0)}</strong>
                      </div>
                      <div className={(item.errors ?? 0) ? "has-error" : ""}>
                        <small>Erros</small>
                        <strong>{item.errors ?? 0}</strong>
                      </div>
                    </div>
                    <div className="crm-campaign-operation__meta">
                      <span>
                        <FaClock /> {item.intervalMin || 120}–
                        {item.intervalMax || 240}s ·{" "}
                        {item.quietStart || "08:00"}–{item.quietEnd || "18:00"}
                      </span>
                      <span>
                        <FaUsers /> {item.withoutConsent ?? 0} sem opt-in ·{" "}
                        {item.duplicatesRemoved ?? 0} duplicados removidos
                      </span>
                      {item.media ? (
                        <span>
                          <FaImage /> Foto + legenda · {item.media.filename}
                        </span>
                      ) : (
                        <span>
                          <FaFileAlt /> Somente texto
                        </span>
                      )}
                    </div>
                    <div className="crm-campaign-operation__actions">
                      <button
                        onClick={() => {
                          setDetailsCampaign(item);
                          setRecipientFilter("todos");
                        }}
                      >
                        Ver destinatários
                      </button>
                      {item.status === "rascunho" ? (
                        <button
                          className="is-primary"
                          disabled={
                            !eligible || actionId === `${item.id}:iniciar`
                          }
                          onClick={() => runAction(item, "iniciar")}
                        >
                          Iniciar
                        </button>
                      ) : null}
                      {["agendada", "enviando"].includes(item.status) ? (
                        <button onClick={() => runAction(item, "pausar")}>
                          Pausar
                        </button>
                      ) : null}
                      {item.status === "pausada" ? (
                        <button
                          className="is-primary"
                          onClick={() => runAction(item, "retomar")}
                        >
                          Retomar
                        </button>
                      ) : null}
                      {(item.errors ?? 0) > 0 ? (
                        <button
                          onClick={() => runAction(item, "reenfileirar-erros")}
                        >
                          <FaSyncAlt /> Reprocessar erros
                        </button>
                      ) : null}
                      {!["concluida", "cancelada"].includes(item.status) ? (
                        <button
                          className="is-danger"
                          onClick={() => runAction(item, "cancelar")}
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
          </div>
        ) : (
          <EmptyState
            icon={FaBullhorn}
            title="Nenhuma campanha registrada no período"
            text="Mude o período ou crie um rascunho usando um segmento real e somente contatos com opt-in."
            action={
              <button
                className="crm-primary-button crm-empty-action"
                onClick={() => openBuilder("inactive180")}
              >
                <FaPlus /> Criar rascunho
              </button>
            }
          />
        )}
      </div>
      <div className="crm-campaign-safety">
        <FaExclamationCircle />
        <div>
          <strong>Variações não garantem proteção contra bloqueios</strong>
          <p>
            No WhatsApp Web, a proteção depende principalmente de enviar só para
            quem aceitou receber contato, manter conteúdo relevante, limites
            moderados, pausas e interromper imediatamente ao detectar rejeição
            ou bloqueio.
          </p>
        </div>
      </div>

      {modalOpen ? (
        <div
          className="crm-modal-backdrop"
          onMouseDown={() => setModalOpen(false)}
        >
          <form
            className="crm-modal crm-modal--campaign"
            onSubmit={saveDraft}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="crm-modal__head">
              <div>
                <span>Campanha com opt-in</span>
                <h2>Planejar campanha</h2>
              </div>
              <button type="button" onClick={() => setModalOpen(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="crm-modal__fields crm-modal__fields--single">
              <div className="crm-campaign-form-grid">
                <label>
                  Nome da campanha
                  <input
                    name="name"
                    required
                    placeholder="Ex.: Convite para voltar à Trilha"
                  />
                </label>
                <label>
                  Segmento
                  <select
                    value={selectedSegment}
                    onChange={(event) =>
                      setSelectedSegment(event.target.value as CampaignSegment)
                    }
                  >
                    {(Object.keys(segmentMeta) as CampaignSegment[]).map(
                      (segment) => (
                        <option value={segment} key={segment}>
                          {segmentMeta[segment].label} ({audienceFor(segment)}{" "}
                          na base)
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              <div className="crm-campaign-media">
                <div className="crm-campaign-media__copy">
                  <span>
                    <FaImage />
                  </span>
                  <div>
                    <strong>Foto da campanha (opcional)</strong>
                    <small>
                      JPG, PNG ou WebP, até 5 MB. Cada variação abaixo será
                      enviada como legenda da mesma foto.
                    </small>
                  </div>
                </div>
                {mediaPreview ? (
                  <div className="crm-campaign-media__preview">
                    <img src={mediaPreview} alt="Prévia da campanha" />
                    <div>
                      <strong>{mediaFile?.name}</strong>
                      <small>
                        {mediaFile
                          ? `${(mediaFile.size / 1024 / 1024).toFixed(2)} MB`
                          : ""}
                      </small>
                      <button type="button" onClick={() => setMediaFile(null)}>
                        Remover foto
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="crm-campaign-media__picker">
                    <FaPlus /> Selecionar foto
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) =>
                        setMediaFile(event.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                )}
              </div>
              <div className="crm-campaign-variants">
                <div>
                  <strong>
                    {mediaFile
                      ? "Variações A/B da legenda"
                      : "Variações A/B da mensagem"}
                  </strong>
                  <small>
                    Até cinco textos. Use {"{link}"} para escolher a posição; se
                    não usar, o link individual de rastreamento será anexado
                    automaticamente.
                  </small>
                </div>
                {variants.map((value, index) => (
                  <label key={index}>
                    {mediaFile ? "Legenda" : "Variação"} {index + 1}
                    <textarea
                      value={value}
                      onChange={(event) =>
                        setVariants((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? event.target.value : item,
                          ),
                        )
                      }
                      rows={4}
                      required={index === 0}
                    />
                    {variants.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setVariants((current) =>
                            current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                      >
                        Remover
                      </button>
                    ) : null}
                  </label>
                ))}
                {variants.length < 5 ? (
                  <button
                    className="crm-add-variant"
                    type="button"
                    onClick={() => setVariants((current) => [...current, ""])}
                  >
                    <FaPlus /> Adicionar {mediaFile ? "legenda" : "variação"}
                  </button>
                ) : null}
              </div>
              <div className="crm-campaign-settings">
                <label>
                  Intervalo mínimo (seg.)
                  <input
                    name="intervalMin"
                    type="number"
                    min="60"
                    max="3600"
                    defaultValue="120"
                    required
                  />
                </label>
                <label>
                  Intervalo máximo (seg.)
                  <input
                    name="intervalMax"
                    type="number"
                    min="60"
                    max="7200"
                    defaultValue="240"
                    required
                  />
                </label>
                <label>
                  Limite diário
                  <input
                    name="dailyLimit"
                    type="number"
                    min="10"
                    max="500"
                    defaultValue="100"
                    required
                  />
                </label>
                <label>
                  Tentativas por contato
                  <input
                    name="maxAttempts"
                    type="number"
                    min="1"
                    max="5"
                    defaultValue="3"
                    required
                  />
                </label>
                <label>
                  Início permitido
                  <input
                    name="quietStart"
                    type="time"
                    defaultValue="08:00"
                    required
                  />
                </label>
                <label>
                  Fim permitido
                  <input
                    name="quietEnd"
                    type="time"
                    defaultValue="18:00"
                    required
                  />
                </label>
              </div>
              <div className="crm-modal-audience">
                <FaUsers />
                <span>
                  <strong>
                    {audienceFor(selectedSegment)} contatos no segmento antes da
                    validação
                  </strong>
                  <small>
                    Ao salvar, o backend deduplica telefones e exclui quem não
                    possui opt-in ou solicitou descadastro.
                  </small>
                </span>
              </div>
              <div className="crm-internal-test-note">
                <FaWhatsapp />
                <span>
                  <strong>Teste da campanha atual</strong>
                  <small>
                    Envia uma variação desta campanha — com a foto e legenda
                    anexadas, quando houver — somente para o número interno. Não
                    usa os modelos de nova reserva ou agradecimento.
                  </small>
                </span>
              </div>
            </div>
            <div className="crm-modal__actions">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving || testingInternal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="is-test"
                onClick={sendInternalTest}
                disabled={saving || testingInternal}
              >
                <FaWhatsapp />{" "}
                {testingInternal
                  ? "Enviando campanha..."
                  : "Testar esta campanha"}
              </button>
              <button type="submit" disabled={saving || testingInternal}>
                <FaCheck />{" "}
                {saving
                  ? mediaFile
                    ? "Enviando foto e preparando público..."
                    : "Preparando público..."
                  : "Criar rascunho"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {detailsCampaign ? (
        <div
          className="crm-modal-backdrop"
          onMouseDown={() => setDetailsCampaign(null)}
        >
          <div
            className="crm-modal crm-modal--details"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="crm-modal__head">
              <div>
                <span>Auditoria por destinatário</span>
                <h2>{detailsCampaign.name}</h2>
              </div>
              <button type="button" onClick={() => setDetailsCampaign(null)}>
                <FaTimes />
              </button>
            </div>
            <div className="crm-recipient-filters">
              {[
                "todos",
                "aguardando",
                "enviado",
                "entregue",
                "lido",
                "respondido",
                "erro",
                "opt_out",
              ].map((status) => (
                <button
                  className={recipientFilter === status ? "is-active" : ""}
                  onClick={() => setRecipientFilter(status)}
                  key={status}
                >
                  {status} (
                  {status === "todos"
                    ? recipients.length
                    : recipients.filter((item) => item.status === status)
                        .length}
                  )
                </button>
              ))}
            </div>
            <div className="crm-recipient-list">
              <table>
                <thead>
                  <tr>
                    <th>Contato</th>
                    <th>Status</th>
                    <th>Tentativas</th>
                    <th>Variação</th>
                    <th>Envio</th>
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRecipients.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <small>{formatPhone(item.phone)}</small>
                      </td>
                      <td>
                        <span
                          className={`crm-status crm-status--${item.status === "erro" || item.status === "opt_out" ? "cancelled" : ["lido", "respondido", "entregue"].includes(item.status) ? "confirmed" : "pending"}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td>{item.attempts}</td>
                      <td>{item.variant ? `#${item.variant}` : "—"}</td>
                      <td>
                        {item.sentAt
                          ? dayjs(item.sentAt).format("DD/MM HH:mm")
                          : "—"}
                      </td>
                      <td className={item.error ? "has-error" : ""}>
                        {item.error ||
                          (item.convertedAt
                            ? `Pagamento convertido · ${item.reservationId ?? "reserva"}`
                            : item.reservationId
                              ? `Reserva ${item.reservationId}`
                              : item.clickedAt
                                ? "Clicou no link"
                                : item.responseType
                                  ? `Resposta: ${item.responseType}`
                                  : "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visibleRecipients.length ? (
                <p>Nenhum destinatário neste filtro.</p>
              ) : null}
            </div>
            <div className="crm-modal__actions">
              <button type="button" onClick={() => setDetailsCampaign(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ReportsSection({
  reservations,
  allReservations,
  customers,
}: {
  reservations: CRMReservation[];
  allReservations: CRMReservation[];
  customers: Customer[];
}) {
  const cards = [
    {
      title: "Reservas do período",
      value: reservations.length,
      text: "Quantidade e status no intervalo selecionado.",
      icon: FaCalendarAlt,
      tone: "blue",
    },
    {
      title: "Clientes históricos",
      value: customers.length,
      text: "Contatos deduplicados a partir de reservas confirmadas.",
      icon: FaUsers,
      tone: "green",
    },
    {
      title: "Origem identificada",
      value: `${percent(allReservations.filter((item) => item.origin !== "unknown").length, allReservations.length)}%`,
      text: "Novas reservas distinguem domínio Vagafogo, WhatsApp e cadastro manual.",
      icon: FaLink,
      tone: "orange",
    },
    {
      title: "Chegada rastreada",
      value: `${percent(allReservations.filter((item) => item.arrived !== undefined).length, allReservations.length)}%`,
      text: "Cobertura do campo chegou no histórico.",
      icon: FaCheckCircle,
      tone: "violet",
    },
  ];
  const exportReport = () =>
    exportCsv(
      `relatorio-crm-${dayjs().format("YYYY-MM-DD")}.csv`,
      reservations.map((item) => ({
        data: item.date,
        cliente: item.name,
        telefone: item.phone,
        experiencia: item.activity,
        pessoas: item.people,
        valor: item.value,
        status: statusLabel(item.status),
        origem: originLabel(item.origin),
        dominioOrigem: item.sourceDomain ?? "",
        campanhaId: item.campaignId ?? "",
        tipoAtribuicao:
          item.sourceAttribution === "historical_inference"
            ? "Histórico informado"
            : item.sourceAttribution === "captured"
              ? "Capturada"
              : "Não identificada",
      })),
    );
  return (
    <section className="crm-section">
      <SectionTitle
        title="Relatórios"
        subtitle="Somente indicadores auditáveis na estrutura atual."
        actions={
          <button className="crm-primary-button" onClick={exportReport}>
            <FaDownload /> Exportar período
          </button>
        }
      />
      <div className="crm-report-grid crm-report-grid--four">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article className="crm-card crm-report-card" key={card.title}>
              <span className={`is-${card.tone}`}>
                <Icon />
              </span>
              <div>
                <h3>{card.title}</h3>
                <strong className="crm-report-value">{card.value}</strong>
                <p>{card.text}</p>
              </div>
            </article>
          );
        })}
      </div>
      <article className="crm-card crm-report-preview">
        <div className="crm-card__head">
          <div>
            <span>
              <FaChartBar />
            </span>
            <h3>Receita confirmada por experiência</h3>
          </div>
          <small>Período selecionado</small>
        </div>
        <div className="crm-report-bars">
          {["Brunch", "Trilha", "Combo"].map((label) => {
            const items = reservations.filter(
              (item) =>
                isPaid(item.status) &&
                (label === "Combo"
                  ? normalizeText(item.activity).includes("+") ||
                    (normalizeText(item.activity).includes("brunch") &&
                      normalizeText(item.activity).includes("trilha"))
                  : normalizeText(item.activity).includes(
                      normalizeText(label),
                    )),
            );
            const total = items.reduce((sum, item) => sum + item.value, 0);
            const maximum = Math.max(
              1,
              ...reservations.map((item) => item.value),
            );
            return (
              <div key={label}>
                <span>{label}</span>
                <i>
                  <span
                    style={{
                      width: `${Math.min(100, Math.max(3, (total / maximum) * 8))}%`,
                    }}
                  />
                </i>
                <strong>{currency.format(total)}</strong>
              </div>
            );
          })}
        </div>
      </article>
    </section>
  );
}

function FinanceSection({
  reservations,
  periodLabel,
  valuesVisible,
  onToggleValues,
}: {
  reservations: CRMReservation[];
  periodLabel: string;
  valuesVisible: boolean;
  onToggleValues: () => void;
}) {
  const paid = reservations.filter((item) => isPaid(item.status));
  const pending = reservations.filter((item) => isPending(item.status));
  const cancelled = reservations.filter((item) => isCancelled(item.status));
  const paidValue = paid.reduce((sum, item) => sum + item.value, 0);
  const pendingValue = pending.reduce((sum, item) => sum + item.value, 0);
  const cancelledValue = cancelled.reduce((sum, item) => sum + item.value, 0);
  const byExperience = ["Brunch", "Trilha", "Combo"].map((label) => ({
    label,
    value: paid
      .filter((item) =>
        label === "Combo"
          ? normalizeText(item.activity).includes("+") ||
            (normalizeText(item.activity).includes("brunch") &&
              normalizeText(item.activity).includes("trilha"))
          : normalizeText(item.activity).includes(normalizeText(label)),
      )
      .reduce((sum, item) => sum + item.value, 0),
  }));
  const max = Math.max(1, ...byExperience.map((item) => item.value));
  const displayMoney = (value: number) =>
    valuesVisible ? currency.format(value) : "R$ •••••";
  return (
    <section className="crm-section">
      <SectionTitle
        title="Financeiro"
        subtitle={`Visão gerencial · ${periodLabel}. Não substitui o sistema contábil.`}
        actions={
          <button
            type="button"
            className="crm-privacy-toggle"
            onClick={onToggleValues}
            aria-pressed={valuesVisible}
            aria-label={
              valuesVisible
                ? "Ocultar valores financeiros"
                : "Revelar valores financeiros"
            }
          >
            {valuesVisible ? <FaEyeSlash /> : <FaEye />}
            <span>{valuesVisible ? "Ocultar valores" : "Mostrar valores"}</span>
          </button>
        }
      />
      <div className="crm-finance-hero">
        <div>
          <span>Receita confirmada</span>
          <strong className={!valuesVisible ? "is-private" : ""}>
            {displayMoney(paidValue)}
          </strong>
          <small>{paid.length} reservas pagas no período</small>
        </div>
        <FaChartLine />
      </div>
      <div className="crm-summary-strip">
        <article>
          <span className="is-green">
            <FaCheckCircle />
          </span>
          <div>
            <small>Pagamentos confirmados</small>
            <strong>{paid.length}</strong>
          </div>
        </article>
        <article>
          <span className="is-orange">
            <FaClock />
          </span>
          <div>
            <small>Valores pendentes</small>
            <strong className={!valuesVisible ? "is-private" : ""}>
              {displayMoney(pendingValue)}
            </strong>
          </div>
        </article>
        <article>
          <span className="is-red">
            <FaTimes />
          </span>
          <div>
            <small>Cancelamentos</small>
            <strong className={!valuesVisible ? "is-private" : ""}>
              {displayMoney(cancelledValue)}
            </strong>
          </div>
        </article>
        <article>
          <span className="is-blue">
            <FaMoneyBillWave />
          </span>
          <div>
            <small>Ticket médio</small>
            <strong className={!valuesVisible ? "is-private" : ""}>
              {displayMoney(paid.length ? paidValue / paid.length : 0)}
            </strong>
          </div>
        </article>
      </div>
      <div className="crm-finance-grid">
        <article className="crm-card">
          <div className="crm-card__head">
            <div>
              <span>
                <FaChartBar />
              </span>
              <h3>Receita por experiência</h3>
            </div>
          </div>
          <div className="crm-experience-bars">
            {byExperience.map((item) => (
              <div key={item.label}>
                <div>
                  <span>{item.label}</span>
                  <strong className={!valuesVisible ? "is-private" : ""}>
                    {displayMoney(item.value)}
                  </strong>
                </div>
                <i>
                  <span
                    style={{
                      width: valuesVisible
                        ? `${(item.value / max) * 100}%`
                        : "0%",
                    }}
                  />
                </i>
              </div>
            ))}
          </div>
        </article>
        <article className="crm-card">
          <div className="crm-card__head">
            <div>
              <span>
                <FaFileAlt />
              </span>
              <h3>Movimentações recentes</h3>
            </div>
          </div>
          <div className="crm-transactions">
            {reservations
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map((item) => (
                <div key={item.id}>
                  <span
                    className={
                      isPaid(item.status)
                        ? "is-green"
                        : isPending(item.status)
                          ? "is-orange"
                          : "is-red"
                    }
                  >
                    {isPaid(item.status) ? <FaCheck /> : <FaClock />}
                  </span>
                  <p>
                    <strong>{item.name}</strong>
                    <small>
                      {item.activity} · {dayjs(item.date).format("DD/MM")}
                    </small>
                  </p>
                  <em className={!valuesVisible ? "is-private" : ""}>
                    {displayMoney(item.value)}
                  </em>
                </div>
              ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function DataSourcesSection({
  reservations,
  journeys,
}: {
  reservations: CRMReservation[];
  journeys: JourneyRecord[];
}) {
  const attributedReservations = reservations.filter(
    (item) => item.sourceDomain || item.origin === "whatsapp",
  );
  const capturedReservations = reservations.filter(
    (item) => item.sourceAttribution === "captured",
  );
  const inferredReservations = reservations.filter(
    (item) => item.sourceAttribution === "historical_inference",
  );
  const recoverableJourneys = journeys.filter(
    (item) => journeyIsAbandoned(item) && item.recoveryOptIn && item.phone,
  );
  return (
    <section className="crm-section">
      <SectionTitle
        title="Cobertura e integrações"
        subtitle="Auditoria no período selecionado das fontes, medições e etapas de ativação."
      />
      <div className="crm-source-grid">
        <article className="crm-card crm-source-card is-connected">
          <div>
            <span>
              <FaCalendarAlt />
            </span>
            <em>Conectado</em>
          </div>
          <h3>Sistema de reservas</h3>
          <strong>{reservations.length} registros válidos</strong>
          <p>
            Nome, telefone, experiência, data, participantes, valor e status
            alimentam clientes, financeiro e reativação.
          </p>
        </article>
        <article className="crm-card crm-source-card is-connected">
          <div>
            <span>
              <FaLink />
            </span>
            <em>
              {capturedReservations.length} capturadas ·{" "}
              {inferredReservations.length} históricas
            </em>
          </div>
          <h3>Origem e domínio</h3>
          <strong>
            {attributedReservations.length} reservas classificadas
          </strong>
          <p>
            Domínio, canal, página de entrada, referência, UTMs e campanha são
            gravados nas novas reservas.
          </p>
        </article>
        <article className="crm-card crm-source-card is-connected">
          <div>
            <span>
              <FaGlobe />
            </span>
            <em>{journeys.length} jornadas</em>
          </div>
          <h3>Funil do checkout</h3>
          <strong>
            {recoverableJourneys.length} abandono(s) recuperável(is)
          </strong>
          <p>
            Etapas, interesse e conversão são medidos por sessão. Contato fica
            disponível somente com opt-in explícito.
          </p>
        </article>
        <article className="crm-card crm-source-card is-connected">
          <div>
            <span>
              <FaWhatsapp />
            </span>
            <em>Duas sessões independentes</em>
          </div>
          <h3>WhatsApp</h3>
          <strong>Agente para atendimento; Admin para campanhas</strong>
          <p>
            O QR Code do bot fica em /agente. Campanhas e automações usam a
            Central WhatsApp do Admin e registram envio, erro, resposta, clique,
            reserva e receita atribuída.
          </p>
        </article>
      </div>
      <div className="crm-card crm-data-roadmap">
        <div className="crm-card__head">
          <div>
            <span>
              <FaSlidersH />
            </span>
            <h3>Checklist para ativação</h3>
          </div>
        </div>
        <ol>
          <li>
            <span>1</span>
            <div>
              <strong>Publicar os dois repositórios</strong>
              <p>
                Agente e Vagafogo continuam em serviços Railway separados;
                publicar também as regras atualizadas do Firestore.
              </p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>Configurar a ponte privada</strong>
              <p>
                Informar as URLs dos dois serviços do Agente e o mesmo token
                interno nos três serviços.
              </p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>Homologar em /agente</strong>
              <p>
                Validar diagnóstico, simulação de disponibilidade, conversa
                privada, PIX controlado e confirmação após o pagamento.
              </p>
            </div>
          </li>
          <li>
            <span>4</span>
            <div>
              <strong>Testar campanhas</strong>
              <p>
                Enviar texto e foto + legenda somente ao número interno e
                conferir entrega, clique, resposta, reserva e receita atribuída.
              </p>
            </div>
          </li>
          <li>
            <span>5</span>
            <div>
              <strong>Liberar a fila real</strong>
              <p>
                Ativar campanhas somente depois dos testes e definir a retenção
                de jornadas, auditorias e leads estruturados.
              </p>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}

function Pagination({
  currentPage,
  totalPages,
  total,
  pageSize,
  setPage,
}: {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}) {
  return (
    <div className="crm-pagination">
      <span>
        Exibindo {(currentPage - 1) * pageSize + 1}–
        {Math.min(currentPage * pageSize, total)} de {total}
      </span>
      <div>
        <button
          disabled={currentPage === 1}
          onClick={() => setPage((value) => Math.max(1, value - 1))}
        >
          Anterior
        </button>
        <em>
          {currentPage} / {totalPages}
        </em>
        <button
          disabled={currentPage === totalPages}
          onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
