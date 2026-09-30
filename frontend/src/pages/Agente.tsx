import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { signOut } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaBan,
  FaBars,
  FaCalendarAlt,
  FaChartLine,
  FaCheckCircle,
  FaCog,
  FaComments,
  FaEdit,
  FaHeadset,
  FaPaperPlane,
  FaPlug,
  FaQrcode,
  FaRobot,
  FaSave,
  FaSearch,
  FaShieldAlt,
  FaSignOutAlt,
  FaSyncAlt,
  FaTimes,
  FaTrash,
  FaUnlink,
  FaUser,
  FaWhatsapp,
} from "react-icons/fa";
import type { IconType } from "react-icons";
import { auth, db } from "../../firebase";
import logo from "../assets/logo.jpg";
import "./Agente.css";

type TabKey = "overview" | "sessions" | "leads" | "whatsapp" | "prompt" | "tests" | "settings";
type ContactMode = "bot" | "human" | "blocked";

type AgentStatus = {
  connected?: boolean;
  ready?: boolean;
  build?: string;
  connectedNumber?: string | null;
  lastState?: string | null;
  lastError?: string | null;
  lastMessageAt?: string | null;
  privacy?: { conversationStorage?: string; ttlSeconds?: number; firestoreMessages?: boolean };
  contactControls?: { ready?: boolean; lastError?: string | null };
};

type Contact = {
  id: string;
  jid: string;
  name?: string | null;
  phone?: string | null;
  lastMessage?: string;
  lastMessageAt?: number;
  lastFrom?: string;
  status?: ContactMode;
  mode?: ContactMode;
  unread?: number;
  blockReason?: string | null;
  controlUpdatedAt?: number | null;
};

type Message = {
  id: string;
  from: "client" | "bot" | "agent";
  text: string;
  ts: number;
  mediaType?: string;
};

type AgentConfig = {
  typingEnabled: boolean;
  replyDelayMs: number;
  typingMsPerChar: number;
  typingMinMs: number;
  typingMaxMs: number;
};

type AgentPackage = {
  id: string;
  nome: string;
  tipoOferta?: "pacote" | "combo";
  pacoteIds?: string[];
  inclui?: Array<{ id: string; nome: string; modoHorario?: string; horarios?: string[]; horarioInicio?: string; horarioFim?: string }>;
  modoHorario?: string;
  horarios?: string[];
  horarioInicio?: string;
  horarioFim?: string;
};

type AgentCustomerType = {
  id: string;
  nome: string;
  descricao?: string;
  perguntarIdade?: boolean;
};

type AgentLead = {
  id: string;
  phone: string;
  name?: string;
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
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "https://vagafogo-production.up.railway.app";

const tabs: Array<{ key: TabKey; label: string; icon: IconType }> = [
  { key: "overview", label: "Visão geral", icon: FaRobot },
  { key: "sessions", label: "Atendimentos", icon: FaHeadset },
  { key: "leads", label: "Leads gerados", icon: FaChartLine },
  { key: "whatsapp", label: "WhatsApp", icon: FaWhatsapp },
  { key: "prompt", label: "Assistente", icon: FaEdit },
  { key: "tests", label: "Testar reserva", icon: FaCalendarAlt },
  { key: "settings", label: "Comportamento", icon: FaCog },
];

const titles: Record<TabKey, { title: string; subtitle: string }> = {
  overview: { title: "Agente Vagafogo", subtitle: "Atendimento, privacidade e operação do WhatsApp em um só lugar." },
  sessions: { title: "Atendimentos ativos", subtitle: "Assuma, devolva ao bot ou bloqueie contatos específicos." },
  leads: { title: "Leads gerados", subtitle: "Confira os dados estruturados enviados pelo agente, sem armazenar a conversa." },
  whatsapp: { title: "Conexão do WhatsApp", subtitle: "Conecte o número do agente e valide o envio antes de operar." },
  prompt: { title: "Assistente e prompt", subtitle: "Ajuste o comportamento da IA e teste sem enviar mensagens reais." },
  tests: { title: "Homologação da reserva", subtitle: "Valide integrações, disponibilidade e preço sem criar reserva ou cobrança." },
  settings: { title: "Comportamento de envio", subtitle: "Configure espera e simulação de digitação para respostas naturais." },
};

async function api(path: string, options: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const detail = typeof data === "object" && data
      ? String((data as { error?: string; detail?: string }).detail || (data as { error?: string }).error || "")
      : String(data || "");
    throw new Error(detail || `HTTP ${response.status}`);
  }
  return data;
}

const contactMode = (contact?: Contact | null): ContactMode => contact?.mode || contact?.status || "bot";
const contactPhone = (contact?: Contact | null) => contact?.phone || contact?.jid?.split("@")[0]?.split(":")[0] || "";
const contactName = (contact?: Contact | null) => contact?.name || contactPhone(contact) || "Contato";
const timeLabel = (value?: number) => value ? new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
const dateTimeLabel = (value?: string | number | null) => value ? new Date(value).toLocaleString("pt-BR") : "—";
const durationLabel = (seconds?: number) => {
  if (!seconds) return "12 horas";
  if (seconds % 3600 === 0) return `${seconds / 3600} horas`;
  return `${Math.round(seconds / 60)} minutos`;
};
const normalizeTimestamp = (value: unknown) => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
};
const numericValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const phoneDigits = (value: string) => value.replace(/\D/g, "").slice(0, 13);
const formatPhone = (value?: string | null) => {
  let digits = phoneDigits(value ?? "");
  if (!digits) return "";
  if (!digits.startsWith("55") && digits.length <= 11) digits = `55${digits}`;
  const country = digits.slice(0, 2);
  const area = digits.slice(2, 4);
  const local = digits.slice(4);
  const first = local.length > 8 ? local.slice(0, 5) : local.slice(0, 4);
  const last = local.length > 8 ? local.slice(5, 9) : local.slice(4, 8);
  return `+${country}${area ? ` (${area}` : ""}${area.length === 2 ? ")" : ""}${first ? ` ${first}` : ""}${last ? `-${last}` : ""}`;
};

export function Agente() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [status, setStatus] = useState<AgentStatus>({});
  const [statusLoading, setStatusLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [leads, setLeads] = useState<AgentLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsError, setLeadsError] = useState("");
  const [selectedJid, setSelectedJid] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const selected = useMemo(() => contacts.find((item) => item.jid === selectedJid) ?? null, [contacts, selectedJid]);
  const operational = Boolean(status.ready && status.contactControls?.ready !== false);

  const loadStatus = useCallback(async (quiet = false) => {
    if (!quiet) setStatusLoading(true);
    try {
      const data = await api("/crm/agente/status") as AgentStatus;
      setStatus(data);
    } catch (caught) {
      setStatus({ lastError: caught instanceof Error ? caught.message : "Serviço indisponível" });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadContacts = useCallback(async (quiet = false) => {
    if (!quiet) setContactsLoading(true);
    try {
      const data = await api("/crm/agente/contatos") as { contacts?: Contact[] };
      setContacts(Array.isArray(data.contacts) ? data.contacts : []);
    } catch (caught) {
      if (!quiet) setError(caught instanceof Error ? caught.message : "Não foi possível carregar os contatos.");
    } finally {
      setContactsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    void loadContacts();
    const statusTimer = window.setInterval(() => void loadStatus(true), 8_000);
    const contactsTimer = window.setInterval(() => void loadContacts(true), 4_000);
    return () => {
      window.clearInterval(statusTimer);
      window.clearInterval(contactsTimer);
    };
  }, [loadContacts, loadStatus]);

  useEffect(() => onSnapshot(collection(db, "crm_leads_agente"), (snapshot) => {
    const next = snapshot.docs.map((document) => {
      const raw = document.data() as Record<string, unknown>;
      return {
        id: document.id,
        phone: String(raw.telefone ?? ""),
        name: raw.nome ? String(raw.nome) : undefined,
        stage: String(raw.etapa ?? "contato_iniciado"),
        outcome: String(raw.resultado ?? "em_andamento"),
        reason: raw.motivo ? String(raw.motivo) : undefined,
        activities: Array.isArray(raw.atividades) ? raw.atividades.map(String) : [],
        desiredDate: raw.dataDesejada ? String(raw.dataDesejada) : undefined,
        participants: numericValue(raw.participantes),
        estimatedValue: numericValue(raw.valorEstimado),
        paymentMethod: raw.formaPagamento ? String(raw.formaPagamento) : undefined,
        reservationId: raw.reservaId ? String(raw.reservaId) : undefined,
        marketingOptIn: raw.marketingOptIn === true,
        nextAction: raw.proximaAcao ? String(raw.proximaAcao) : undefined,
        summary: raw.resumo ? String(raw.resumo) : undefined,
        updatedAt: normalizeTimestamp(raw.atualizadoEm ?? raw.criadoEm),
      } satisfies AgentLead;
    }).sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
    setLeads(next);
    setLeadsError("");
    setLeadsLoading(false);
  }, () => {
    setLeadsError("Não foi possível carregar os leads estruturados.");
    setLeadsLoading(false);
  }), []);

  const showMessage = (text: string) => {
    setError("");
    setNotice(text);
    window.setTimeout(() => setNotice(""), 4_000);
  };

  const showError = (caught: unknown) => {
    setNotice("");
    setError(caught instanceof Error ? caught.message : "Não foi possível concluir a ação.");
  };

  const selectTab = (next: TabKey) => {
    setTab(next);
    setMobileMenu(false);
  };

  const modeCounts = useMemo(() => contacts.reduce((acc, item) => {
    acc[contactMode(item)] += 1;
    return acc;
  }, { bot: 0, human: 0, blocked: 0 }), [contacts]);

  return (
    <div className="agent-app">
      <button className="agent-mobile-menu" onClick={() => setMobileMenu(true)} aria-label="Abrir menu"><FaBars /></button>
      {mobileMenu ? <button className="agent-backdrop" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} /> : null}
      <aside className={`agent-sidebar ${mobileMenu ? "is-open" : ""}`}>
        <button className="agent-sidebar__close" onClick={() => setMobileMenu(false)} aria-label="Fechar menu"><FaTimes /></button>
        <div className="agent-brand"><img src={logo} alt="Vagafogo" /><div><strong>Agente Vagafogo</strong><span>ATENDIMENTO INTELIGENTE</span></div></div>
        <nav aria-label="Navegação do agente">
          <small>Operação</small>
          {tabs.map((item) => {
            const Icon = item.icon;
            return <button key={item.key} className={tab === item.key ? "is-active" : ""} onClick={() => selectTab(item.key)}><Icon /><span>{item.label}</span>{item.key === "sessions" && modeCounts.human ? <b>{modeCounts.human}</b> : item.key === "leads" && leads.length ? <b>{leads.length}</b> : null}</button>;
          })}
        </nav>
        <div className="agent-sidebar__privacy"><FaShieldAlt /><strong>Sem histórico permanente</strong><span>Mensagens e áudios existem apenas durante a sessão ativa.</span></div>
        <button className="agent-sidebar__back" onClick={() => navigate("/CRM")}><FaArrowLeft /> Voltar ao CRM</button>
      </aside>

      <div className="agent-shell">
        <header className="agent-topbar">
          <div><span>PAINEL OPERACIONAL</span><strong>{titles[tab].title}</strong><p>{titles[tab].subtitle}</p></div>
          <div className="agent-topbar__actions">
            <span className={`agent-live-status ${operational ? "is-online" : ""}`}><i />{statusLoading ? "Verificando" : operational ? "WhatsApp conectado" : status.ready ? "Envios protegidos" : "WhatsApp desconectado"}</span>
            <button onClick={() => { void loadStatus(); void loadContacts(); }} title="Atualizar"><FaSyncAlt /></button>
            <button onClick={() => void signOut(auth)} title="Sair"><FaSignOutAlt /></button>
          </div>
        </header>

        <main className="agent-main">
          {notice ? <div className="agent-alert is-success"><FaCheckCircle />{notice}</div> : null}
          {error ? <div className="agent-alert is-error"><FaBan />{error}<button onClick={() => setError("")}><FaTimes /></button></div> : null}

          {tab === "overview" ? (
            <Overview status={status} contacts={contacts} counts={modeCounts} onOpen={selectTab} />
          ) : tab === "sessions" ? (
            <Sessions
              contacts={contacts}
              loading={contactsLoading}
              selected={selected}
              messages={messages}
              onSelect={async (jid) => {
                setSelectedJid(jid);
                try {
                  const data = await api(`/crm/agente/contatos/${encodeURIComponent(jid)}/mensagens`) as { messages?: Message[] };
                  setMessages(Array.isArray(data.messages) ? data.messages : []);
                } catch (caught) { showError(caught); }
              }}
              onClearSelection={() => { setSelectedJid(null); setMessages([]); }}
              onRefreshMessages={async () => {
                if (!selectedJid) return;
                try {
                  const data = await api(`/crm/agente/contatos/${encodeURIComponent(selectedJid)}/mensagens`) as { messages?: Message[] };
                  setMessages(Array.isArray(data.messages) ? data.messages : []);
                } catch { /* polling visual manual */ }
              }}
              onMode={async (contact, mode, reason = "") => {
                try {
                  await api(`/crm/agente/contatos/${encodeURIComponent(contact.jid)}/modo`, {
                    method: "POST",
                    body: JSON.stringify({ mode, reason, phone: contactPhone(contact), name: contactName(contact) }),
                  });
                  await loadContacts(true);
                  showMessage(mode === "blocked" ? "Contato bloqueado para qualquer envio." : mode === "human" ? "Atendimento assumido." : "Contato devolvido ao bot.");
                } catch (caught) { showError(caught); }
              }}
              onBlockNumber={async ({ phone, name, reason }) => {
                const digits = phone.replace(/\D/g, "");
                const jid = `${digits}@s.whatsapp.net`;
                try {
                  await api(`/crm/agente/contatos/${encodeURIComponent(jid)}/modo`, {
                    method: "POST",
                    body: JSON.stringify({ mode: "blocked", reason, phone: digits, name }),
                  });
                  await loadContacts(true);
                  showMessage("Número adicionado à lista de bloqueio.");
                } catch (caught) { showError(caught); }
              }}
              onSend={async (jid, text) => {
                try {
                  await api(`/crm/agente/contatos/${encodeURIComponent(jid)}/enviar`, { method: "POST", body: JSON.stringify({ text }) });
                  const data = await api(`/crm/agente/contatos/${encodeURIComponent(jid)}/mensagens`) as { messages?: Message[] };
                  setMessages(Array.isArray(data.messages) ? data.messages : []);
                  await loadContacts(true);
                } catch (caught) { showError(caught); throw caught; }
              }}
              onCloseSession={async (jid) => {
                try {
                  await api(`/crm/agente/contatos/${encodeURIComponent(jid)}/sessao`, { method: "DELETE" });
                  setSelectedJid(null);
                  setMessages([]);
                  await loadContacts(true);
                  showMessage("Sessão encerrada e conteúdo descartado.");
                } catch (caught) { showError(caught); }
              }}
            />
          ) : tab === "leads" ? (
            <LeadsPanel leads={leads} loading={leadsLoading} error={leadsError} />
          ) : tab === "whatsapp" ? (
            <WhatsappPanel status={status} onReload={() => loadStatus()} onMessage={showMessage} onError={showError} />
          ) : tab === "prompt" ? (
            <PromptPanel onMessage={showMessage} onError={showError} />
          ) : tab === "tests" ? (
            <ReservationTestPanel onError={showError} />
          ) : (
            <SettingsPanel onMessage={showMessage} onError={showError} />
          )}
        </main>
      </div>
    </div>
  );
}

function Overview({ status, contacts, counts, onOpen }: { status: AgentStatus; contacts: Contact[]; counts: Record<ContactMode, number>; onOpen: (tab: TabKey) => void }) {
  const controlsUnavailable = status.contactControls?.ready === false;
  const cards = [
    { label: "Sessões ativas", value: contacts.filter((item) => item.lastMessageAt).length, tone: "blue", icon: FaComments },
    { label: "Com o bot", value: counts.bot, tone: "green", icon: FaRobot },
    { label: "Atendimento humano", value: counts.human, tone: "orange", icon: FaUser },
    { label: "Contatos bloqueados", value: counts.blocked, tone: "red", icon: FaBan },
  ];
  return <>
    <section className="agent-metrics">{cards.map((card) => { const Icon = card.icon; return <article key={card.label} className={`tone-${card.tone}`}><span><Icon /></span><div><small>{card.label}</small><strong>{card.value}</strong></div></article>; })}</section>
    <section className="agent-overview-grid">
      <article className="agent-card agent-connection-card">
        <div className="agent-card__title"><span><FaWhatsapp /></span><div><h2>Canal de atendimento</h2><p>Esta sessão atende clientes e confirma reservas iniciadas pelo Agente. Campanhas usam outra sessão no Admin.</p></div></div>
        <div className={`agent-connection-state ${status.ready && !controlsUnavailable ? "is-online" : ""}`}><i /><div><strong>{status.ready ? controlsUnavailable ? "Conectado, com envios protegidos" : "WhatsApp conectado" : "WhatsApp desconectado"}</strong><span>{controlsUnavailable ? status.contactControls?.lastError || "Lista de bloqueios indisponível" : status.connectedNumber ? `Número: +${status.connectedNumber}` : status.lastError || "Conecte pelo QR Code para iniciar."}</span></div></div>
        <dl><div><dt>Último evento</dt><dd>{dateTimeLabel(status.lastMessageAt)}</dd></div><div><dt>Versão do gateway</dt><dd>{status.build || "—"}</dd></div></dl>
        <button onClick={() => onOpen("whatsapp")}>{status.ready ? "Gerenciar conexão" : "Conectar agora"}<FaArrowLeft /></button>
      </article>
      <article className="agent-card agent-privacy-card">
        <div className="agent-card__title"><span><FaShieldAlt /></span><div><h2>Privacidade das conversas</h2><p>Configuração aplicada no gateway.</p></div></div>
        <ul><li><FaCheckCircle /><span><strong>Sem Firestore para mensagens</strong>O conteúdo não é gravado no banco.</span></li><li><FaCheckCircle /><span><strong>Memória temporária</strong>Expiração em {durationLabel(status.privacy?.ttlSeconds)}.</span></li><li><FaCheckCircle /><span><strong>Controle separado</strong>Somente o modo bot, humano ou bloqueado permanece.</span></li></ul>
      </article>
      <article className="agent-card agent-next-card">
        <div className="agent-card__title"><span><FaQrcode /></span><div><h2>Fluxo de reserva</h2><p>Integração preparada para homologação.</p></div></div>
        <ol><li className="is-current"><b>1</b><span><strong>Consulta real</strong>Experiências, horários e vagas</span></li><li className="is-current"><b>2</b><span><strong>Pagamento seguro</strong>PIX no WhatsApp ou cartão no site</span></li><li className="is-current"><b>3</b><span><strong>Confirmação</strong>Status atualizado pelo sistema Vagafogo</span></li><li className="is-current"><b>4</b><span><strong>Lead final</strong>Registro estruturado sem conversa</span></li></ol>
        <button onClick={() => onOpen("tests")}>Abrir homologação<FaArrowLeft /></button>
      </article>
    </section>
  </>;
}

const readableLeadValue = (value: string) => value
  .replace(/_/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

function LeadsPanel({ leads, loading, error }: { leads: AgentLead[]; loading: boolean; error: string }) {
  const [search, setSearch] = useState("");
  const [outcome, setOutcome] = useState("all");
  const outcomes = useMemo(() => Array.from(new Set(leads.map((lead) => lead.outcome))).sort(), [leads]);
  const filtered = useMemo(() => leads.filter((lead) => {
    if (outcome !== "all" && lead.outcome !== outcome) return false;
    const haystack = `${lead.name || ""} ${lead.phone} ${lead.activities.join(" ")} ${lead.summary || ""} ${lead.reservationId || ""}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  }), [leads, outcome, search]);
  const confirmed = leads.filter((lead) => lead.outcome === "reserva_confirmada" || Boolean(lead.reservationId)).length;
  const inProgress = leads.filter((lead) => !lead.reservationId && !["perdido", "encerrado", "sem_interesse"].includes(lead.outcome)).length;
  const optedIn = leads.filter((lead) => lead.marketingOptIn).length;

  return <section className="agent-leads">
    <div className="agent-lead-metrics">
      <article><small>Leads estruturados</small><strong>{leads.length}</strong><span>Sem conversa armazenada</span></article>
      <article><small>Em andamento</small><strong>{inProgress}</strong><span>Podem exigir próxima ação</span></article>
      <article><small>Reservas vinculadas</small><strong>{confirmed}</strong><span>Conversão identificada</span></article>
      <article><small>Opt-in de marketing</small><strong>{optedIn}</strong><span>Elegíveis para campanhas</span></article>
    </div>
    <article className="agent-card agent-leads-card">
      <div className="agent-card__title"><span><FaChartLine /></span><div><h2>Dados interpretados pelo agente</h2><p>Use esta lista para validar se a IA encerrou o atendimento com as informações comerciais corretas.</p></div></div>
      <div className="agent-lead-filters">
        <label><FaSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome, telefone, interesse ou reserva" /></label>
        <select value={outcome} onChange={(event) => setOutcome(event.target.value)}><option value="all">Todos os resultados</option>{outcomes.map((item) => <option key={item} value={item}>{readableLeadValue(item)}</option>)}</select>
      </div>
      {loading ? <p className="agent-empty">Carregando leads estruturados…</p> : error ? <div className="agent-lead-error"><FaBan />{error}</div> : filtered.length === 0 ? <p className="agent-empty">Nenhum lead encontrado com esses filtros.</p> : <div className="agent-lead-list">{filtered.map((lead) => <article key={lead.id}>
        <header><span className="agent-avatar">{(lead.name || lead.phone || "L").charAt(0).toUpperCase()}</span><div><strong>{lead.name || "Nome ainda não coletado"}</strong><small>{formatPhone(lead.phone)}</small></div><em className={lead.reservationId ? "is-converted" : ""}>{readableLeadValue(lead.outcome)}</em></header>
        <div className="agent-lead-data"><span><small>Etapa</small><strong>{readableLeadValue(lead.stage)}</strong></span><span><small>Interesse</small><strong>{lead.activities.length ? lead.activities.join(" + ") : "Não informado"}</strong></span><span><small>Data desejada</small><strong>{lead.desiredDate || "Não informada"}</strong></span><span><small>Participantes</small><strong>{lead.participants ?? "—"}</strong></span><span><small>Valor estimado</small><strong>{lead.estimatedValue == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(lead.estimatedValue)}</strong></span><span><small>Última atualização</small><strong>{dateTimeLabel(lead.updatedAt)}</strong></span></div>
        {lead.summary ? <p>{lead.summary}</p> : null}
        <footer><span className={lead.marketingOptIn ? "is-allowed" : ""}>{lead.marketingOptIn ? "Opt-in confirmado" : "Sem opt-in"}</span>{lead.paymentMethod ? <span>Pagamento: {readableLeadValue(lead.paymentMethod)}</span> : null}{lead.reservationId ? <span>Reserva: {lead.reservationId}</span> : lead.nextAction ? <span>Próxima ação: {lead.nextAction}</span> : null}</footer>
      </article>)}</div>}
    </article>
  </section>;
}

type SessionsProps = {
  contacts: Contact[];
  loading: boolean;
  selected: Contact | null;
  messages: Message[];
  onSelect: (jid: string) => void;
  onClearSelection: () => void;
  onRefreshMessages: () => void;
  onMode: (contact: Contact, mode: ContactMode, reason?: string) => void;
  onBlockNumber: (data: { phone: string; name: string; reason: string }) => void;
  onSend: (jid: string, text: string) => Promise<void>;
  onCloseSession: (jid: string) => void;
};

function Sessions(props: SessionsProps) {
  const [search, setSearch] = useState("");
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [phone, setPhone] = useState(() => formatPhone("55"));
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!props.selected) return;
    const timer = window.setInterval(props.onRefreshMessages, 3_000);
    return () => window.clearInterval(timer);
  }, [props.selected, props.onRefreshMessages]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [props.messages]);

  const filtered = props.contacts.filter((item) => {
    const haystack = `${contactName(item)} ${contactPhone(item)} ${item.lastMessage || ""}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  const submitBlock = (event: FormEvent) => {
    event.preventDefault();
    if (phone.replace(/\D/g, "").length < 10) return;
    props.onBlockNumber({ phone, name, reason });
    setShowBlockForm(false);
    setPhone(formatPhone("55")); setName(""); setReason("");
  };

  const send = async () => {
    const text = reply.trim();
    if (!props.selected || !text) return;
    setSending(true);
    try { await props.onSend(props.selected.jid, text); setReply(""); } finally { setSending(false); }
  };

  return <section className="agent-sessions">
    <aside className={`agent-contact-list ${props.selected ? "has-selection" : ""}`}>
      <div className="agent-contact-tools"><label><FaSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome ou telefone" /></label><button onClick={() => setShowBlockForm((value) => !value)}><FaBan /> Bloquear número</button></div>
      {showBlockForm ? <form className="agent-block-form" onSubmit={submitBlock}><strong>Novo bloqueio</strong><input type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(formatPhone(event.target.value))} placeholder="+55 (62) 99999-9999" /><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome opcional" /><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo opcional" /><div><button type="button" onClick={() => setShowBlockForm(false)}>Cancelar</button><button type="submit">Bloquear</button></div></form> : null}
      <div className="agent-contact-scroll">
        {props.loading ? <p className="agent-empty">Carregando contatos…</p> : filtered.length === 0 ? <p className="agent-empty">Nenhum contato ativo ou bloqueado.</p> : filtered.map((item) => {
          const mode = contactMode(item);
          return <button key={item.jid} className={props.selected?.jid === item.jid ? "is-active" : ""} onClick={() => props.onSelect(item.jid)}><span className="agent-avatar">{contactName(item).charAt(0).toUpperCase()}</span><span className="agent-contact-copy"><strong>{contactName(item)}</strong><small>{item.lastMessage || item.blockReason || formatPhone(contactPhone(item))}</small><em className={`mode-${mode}`}>{mode === "bot" ? "Bot" : mode === "human" ? "Humano" : "Bloqueado"}</em></span><time>{timeLabel(item.lastMessageAt)}</time>{item.unread ? <b>{item.unread}</b> : null}</button>;
        })}
      </div>
    </aside>
    <div className={`agent-thread ${props.selected ? "has-selection" : ""}`}>
      {!props.selected ? <div className="agent-thread-empty"><FaComments /><strong>Selecione um atendimento</strong><span>As mensagens aparecem somente enquanto a sessão estiver ativa.</span></div> : <>
        <header><button className="agent-thread-back" onClick={props.onClearSelection}><FaArrowLeft /></button><span className="agent-avatar">{contactName(props.selected).charAt(0).toUpperCase()}</span><div><strong>{contactName(props.selected)}</strong><small>{formatPhone(contactPhone(props.selected))}</small></div><div className="agent-thread-actions">
          {contactMode(props.selected) === "blocked" ? <button className="is-bot" onClick={() => props.onMode(props.selected!, "bot")}><FaRobot /> Desbloquear e devolver ao bot</button> : <>
            {contactMode(props.selected) === "human" ? <button className="is-bot" onClick={() => props.onMode(props.selected!, "bot")}><FaRobot /> Devolver ao bot</button> : <button className="is-human" onClick={() => props.onMode(props.selected!, "human")}><FaUser /> Assumir</button>}
            <button className="is-block" onClick={() => props.onMode(props.selected!, "blocked", "Bloqueado pelo painel do agente")}><FaBan /> Bloquear</button>
          </>}
          <button className="is-close" title="Encerrar e descartar sessão" onClick={() => props.onCloseSession(props.selected!.jid)}><FaTrash /></button>
        </div></header>
        {contactMode(props.selected) === "blocked" ? <div className="agent-blocked-banner"><FaBan /><span><strong>Contato bloqueado</strong>O bot e os envios manuais não mandarão mensagens para este número.</span></div> : null}
        <div className="agent-thread-scroll" ref={threadRef}>{props.messages.length === 0 ? <p className="agent-empty">Sem mensagens na memória desta instância.</p> : props.messages.map((message) => <div key={message.id} className={`agent-bubble-row from-${message.from}`}><div><small>{message.from === "client" ? contactName(props.selected) : message.from === "agent" ? "Atendente" : "Bot"}</small><p>{message.text}</p><time>{timeLabel(message.ts)}</time></div></div>)}</div>
        <footer>{contactMode(props.selected) !== "human" ? <p>{contactMode(props.selected) === "blocked" ? "Desbloqueie o contato antes de enviar." : "Assuma o atendimento para responder manualmente."}</p> : <><input value={reply} onChange={(event) => setReply(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void send(); }} placeholder="Responder como atendente…" /><button onClick={() => void send()} disabled={sending || !reply.trim()}><FaPaperPlane /></button></>}</footer>
      </>}
    </div>
  </section>;
}

function WhatsappPanel({ status, onReload, onMessage, onError }: { status: AgentStatus; onReload: () => Promise<void>; onMessage: (text: string) => void; onError: (error: unknown) => void }) {
  const [qr, setQr] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [phone, setPhone] = useState(() => formatPhone("5562991150376"));
  const [text, setText] = useState("Teste do Agente Vagafogo. Se você recebeu esta mensagem, a conexão está funcionando.");
  const [sending, setSending] = useState(false);

  const connect = async () => {
    setConnecting(true); setQr("");
    try {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        try {
          const data = await api("/crm/agente/qrcode") as { qrCode?: string };
          if (data.qrCode) { setQr(data.qrCode); return; }
        } catch (caught) {
          if (attempt > 0) throw caught;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 2_000));
        await onReload();
        if (status.ready) return;
      }
      throw new Error("O QR Code não foi gerado dentro do prazo.");
    } catch (caught) { onError(caught); } finally { setConnecting(false); }
  };

  const canSend = Boolean(status.ready && status.contactControls?.ready !== false);
  return <div className="agent-two-columns">
    <article className="agent-card agent-whatsapp-card"><div className="agent-card__title"><span><FaWhatsapp /></span><div><h2>Número do agente</h2><p>Use apenas este gateway para o número conectado.</p></div></div><div className={`agent-connection-state ${status.ready ? "is-online" : ""}`}><i /><div><strong>{status.ready ? "Conectado e pronto" : "Desconectado"}</strong><span>{status.connectedNumber ? formatPhone(status.connectedNumber) : status.lastState || "Aguardando conexão"}</span></div></div>
      {!status.ready ? <button className="agent-primary" onClick={() => void connect()} disabled={connecting}><FaPlug />{connecting ? "Gerando QR Code…" : "Conectar por QR Code"}</button> : <button className="agent-danger-outline" onClick={async () => { try { await api("/crm/agente/logout", { method: "POST" }); setQr(""); await onReload(); onMessage("WhatsApp desconectado."); } catch (caught) { onError(caught); } }}><FaUnlink /> Desconectar</button>}
      {qr ? <div className="agent-qr"><img src={qr} alt="QR Code do WhatsApp" /><strong>Escaneie em Aparelhos conectados</strong><span>WhatsApp → Menu → Aparelhos conectados → Conectar aparelho</span></div> : null}
      {status.lastError || status.contactControls?.lastError ? <p className="agent-inline-error">{status.contactControls?.lastError || status.lastError}</p> : null}
    </article>
    <article className="agent-card agent-test-card"><div className="agent-card__title"><span><FaPaperPlane /></span><div><h2>Disparo de teste</h2><p>Valide uma mensagem isolada antes de ativar os fluxos.</p></div></div><label>Telefone com DDI<input type="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(formatPhone(event.target.value))} placeholder="+55 (62) 99999-9999" /></label><label>Mensagem<textarea value={text} onChange={(event) => setText(event.target.value)} /></label><button className="agent-primary" disabled={sending || !canSend || !phone || !text.trim()} onClick={async () => { setSending(true); try { await api("/crm/agente/teste-whatsapp", { method: "POST", body: JSON.stringify({ phone, text }) }); onMessage("Mensagem de teste enviada."); } catch (caught) { onError(caught); } finally { setSending(false); } }}><FaPaperPlane />{sending ? "Enviando…" : "Enviar teste"}</button><small>Contatos bloqueados não recebem nem mesmo disparos de teste.</small></article>
  </div>;
}

function PromptPanel({ onMessage, onError }: { onMessage: (text: string) => void; onError: (error: unknown) => void }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [sessionId, setSessionId] = useState("");
  const [testing, setTesting] = useState(false);
  useEffect(() => { api("/crm/agente/prompt").then((data) => setPrompt(String((data as { prompt?: string }).prompt || ""))).catch(onError).finally(() => setLoading(false)); }, [onError]);
  const test = async () => { const pergunta = input.trim(); if (!pergunta) return; setHistory((items) => [...items, { role: "user", text: pergunta }]); setInput(""); setTesting(true); try { const data = await api("/crm/agente/testar", { method: "POST", body: JSON.stringify({ pergunta, session_id: sessionId }) }) as { resposta?: string; session_id?: string }; if (data.session_id) setSessionId(data.session_id); setHistory((items) => [...items, { role: "assistant", text: String(data.resposta || "Resposta vazia") }]); } catch (caught) { onError(caught); } finally { setTesting(false); } };
  return <div className="agent-prompt-grid"><article className="agent-card agent-prompt-editor"><div className="agent-card__title"><span><FaEdit /></span><div><h2>Prompt principal</h2><p>Não inclua regras de preço ou disponibilidade que pertencem ao sistema.</p></div></div>{loading ? <p>Carregando…</p> : <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />}<button className="agent-primary" disabled={saving || !prompt.trim()} onClick={async () => { setSaving(true); try { await api("/crm/agente/prompt", { method: "POST", body: JSON.stringify({ prompt }) }); onMessage("Prompt salvo e sessões de IA reiniciadas."); } catch (caught) { onError(caught); } finally { setSaving(false); } }}><FaSave />{saving ? "Salvando…" : "Salvar prompt"}</button></article><article className="agent-card agent-chat-test"><div className="agent-card__title"><span><FaComments /></span><div><h2>Teste privado</h2><p>Esta conversa não é enviada ao WhatsApp.</p></div></div><div className="agent-test-history">{history.length === 0 ? <p>Envie uma pergunta para validar o comportamento.</p> : history.map((item, index) => <div key={`${item.role}-${index}`} className={item.role}>{item.text}</div>)}</div><div className="agent-test-input"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void test(); }} placeholder="Pergunte como se fosse um cliente…" /><button onClick={() => void test()} disabled={testing || !input.trim()}><FaPaperPlane /></button></div><button className="agent-link" onClick={() => { setHistory([]); setSessionId(""); }}>Iniciar novo teste</button></article></div>;
}

function ReservationTestPanel({ onError }: { onError: (error: unknown) => void }) {
  const [diagnostic, setDiagnostic] = useState<Record<string, unknown> | null>(null);
  const [offers, setOffers] = useState<AgentPackage[]>([]);
  const [customerTypes, setCustomerTypes] = useState<AgentCustomerType[]>([]);
  const [offerKey, setOfferKey] = useState("");
  const [date, setDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const [time, setTime] = useState("");
  const [adults, setAdults] = useState(1);
  const [bariatric, setBariatric] = useState(0);
  const [children, setChildren] = useState(0);
  const [nonPaying, setNonPaying] = useState(0);
  const [childAges, setChildAges] = useState("");
  const [nonPayingAges, setNonPayingAges] = useState("");
  const [bariatricConfirmed, setBariatricConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const parseAges = (value: string) => value.split(/[,;\s]+/).map(Number).filter((item) => Number.isFinite(item) && item >= 0 && item <= 120);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [diagnosticData, catalog] = await Promise.all([
        api("/crm/agente/diagnostico") as Promise<Record<string, unknown>>,
        api("/crm/agente/testes/pacotes") as Promise<{ pacotes?: AgentPackage[]; combos?: AgentPackage[]; tiposClientes?: AgentCustomerType[] }>,
      ]);
      const packages = Array.isArray(catalog.pacotes) ? catalog.pacotes.map((item) => ({ ...item, tipoOferta: "pacote" as const })) : [];
      const combos = Array.isArray(catalog.combos) ? catalog.combos.map((item) => ({ ...item, tipoOferta: "combo" as const })) : [];
      const nextOffers = [...combos, ...packages];
      setDiagnostic(diagnosticData);
      setOffers(nextOffers);
      setCustomerTypes(Array.isArray(catalog.tiposClientes) ? catalog.tiposClientes : []);
      setOfferKey((current) => current || (nextOffers[0] ? `${nextOffers[0].tipoOferta}:${nextOffers[0].id}` : ""));
      setTime((current) => current || nextOffers[0]?.horarios?.[0] || nextOffers[0]?.horarioInicio || "");
    } catch (caught) {
      onError(caught);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => { void load(); }, [load]);

  const selectedOffer = offers.find((item) => `${item.tipoOferta}:${item.id}` === offerKey);
  const simulate = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedOffer) return;
    const participantsByType = Object.fromEntries(customerTypes.map((type) => {
      const name = normalize(type.nome);
      const quantity = name.includes("adult") ? adults : name.includes("bariat") ? bariatric : name.includes("crian") ? children : name.includes("nao pag") ? nonPaying : 0;
      return [type.id, quantity];
    }));
    const agesByType = Object.fromEntries(customerTypes.flatMap((type) => {
      const name = normalize(type.nome);
      if (name.includes("crian")) return [[type.id, parseAges(childAges)]];
      if (name.includes("nao pag")) return [[type.id, parseAges(nonPayingAges)]];
      return [];
    }));
    const included = selectedOffer.tipoOferta === "combo" ? selectedOffer.inclui ?? [] : [selectedOffer];
    const times = Object.fromEntries(included
      .filter((item) => item.modoHorario !== "intervalo" && time)
      .map((item) => [item.id, time]));
    setTesting(true);
    setResult(null);
    try {
      const data = await api("/crm/agente/testes/reserva", {
        method: "POST",
        body: JSON.stringify({
          tipoOferta: selectedOffer.tipoOferta,
          ofertaId: selectedOffer.id,
          data: date,
          horario: time,
          horariosPorPacote: times,
          participantesPorTipo: participantsByType,
          idadesPorTipo: agesByType,
          confirmouCarteirinhaBariatrica: bariatric === 0 || bariatricConfirmed,
          perguntasPersonalizadas: [],
        }),
      }) as { resultado?: Record<string, unknown> };
      setResult(data.resultado ?? null);
    } catch (caught) {
      onError(caught);
    } finally {
      setTesting(false);
    }
  };

  const config = diagnostic?.configuracao && typeof diagnostic.configuracao === "object" ? diagnostic.configuracao as Record<string, unknown> : {};
  const gateway = diagnostic?.gateway && typeof diagnostic.gateway === "object" ? diagnostic.gateway as Record<string, unknown> : {};
  const ai = diagnostic?.ai && typeof diagnostic.ai === "object" ? diagnostic.ai as Record<string, unknown> : {};
  const reservations = diagnostic?.reservas && typeof diagnostic.reservas === "object" ? diagnostic.reservas as Record<string, unknown> : {};
  const checks = [
    { label: "Gateway do WhatsApp", ok: gateway.ok === true },
    { label: "Backend da IA", ok: ai.ok === true },
    { label: "Banco de reservas", ok: reservations.ok === true },
    { label: "Token entre serviços", ok: config.tokenInterno === true },
    { label: "Asaas no Vagafogo", ok: config.asaas === true },
  ];
  const pending = Array.isArray(result?.requisitosPendentes) ? result.requisitosPendentes.map(String) : [];
  const offerResult = result?.oferta && typeof result.oferta === "object" ? result.oferta as { nome?: string } : {};
  const needsTime = selectedOffer?.tipoOferta === "combo"
    ? (selectedOffer.inclui ?? []).some((item) => item.modoHorario !== "intervalo")
    : selectedOffer?.modoHorario !== "intervalo";

  return <div className="agent-reservation-tests">
    <article className="agent-card agent-diagnostic-card"><div className="agent-card__title"><span><FaPlug /></span><div><h2>Diagnóstico dos serviços</h2><p>Confirma a ponte entre os dois Railways sem expor credenciais.</p></div></div>{loading ? <p className="agent-empty">Verificando integrações…</p> : <div className="agent-diagnostic-list">{checks.map((check) => <div className={check.ok ? "is-ok" : "is-failed"} key={check.label}><span>{check.ok ? <FaCheckCircle /> : <FaTimes />}</span><strong>{check.label}</strong><em>{check.ok ? "Pronto" : "Pendente"}</em></div>)}</div>}<button className="agent-primary" type="button" onClick={() => void load()} disabled={loading}><FaSyncAlt /> Atualizar diagnóstico</button></article>
    <form className="agent-card agent-simulation-card" onSubmit={simulate}>
      <div className="agent-card__title"><span><FaCalendarAlt /></span><div><h2>Simular disponibilidade</h2><p>Testa experiências e combos reais sem gravar reserva ou cobrança.</p></div></div>
      <label>Oferta<select value={offerKey} onChange={(event) => { const nextKey = event.target.value; const next = offers.find((item) => `${item.tipoOferta}:${item.id}` === nextKey); setOfferKey(nextKey); setTime(next?.horarios?.[0] || next?.horarioInicio || ""); }}>{offers.map((item) => <option value={`${item.tipoOferta}:${item.id}`} key={`${item.tipoOferta}:${item.id}`}>{item.tipoOferta === "combo" ? "Combo · " : ""}{item.nome}</option>)}</select></label>
      <div className="agent-simulation-grid">
        <label>Data<input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} required /></label>
        <label>Horário principal<input type="time" value={time} min={selectedOffer?.horarioInicio} max={selectedOffer?.horarioFim} onChange={(event) => setTime(event.target.value)} required={needsTime} /></label>
        <label>Adultos<input type="number" min="0" max="100" value={adults} onChange={(event) => setAdults(Number(event.target.value))} /></label>
        <label>Bariátrica<input type="number" min="0" max="100" value={bariatric} onChange={(event) => setBariatric(Number(event.target.value))} /></label>
        <label>Crianças<input type="number" min="0" max="100" value={children} onChange={(event) => setChildren(Number(event.target.value))} /></label>
        <label>Não pagantes<input type="number" min="0" max="100" value={nonPaying} onChange={(event) => setNonPaying(Number(event.target.value))} /></label>
        {children > 0 ? <label>Idades das crianças<input value={childAges} onChange={(event) => setChildAges(event.target.value)} placeholder="Ex.: 6, 10" /></label> : null}
        {nonPaying > 0 ? <label>Idades dos não pagantes<input value={nonPayingAges} onChange={(event) => setNonPayingAges(event.target.value)} placeholder="Ex.: 2, 3" /></label> : null}
      </div>
      {bariatric > 0 ? <label className="agent-toggle"><input type="checkbox" checked={bariatricConfirmed} onChange={(event) => setBariatricConfirmed(event.target.checked)} /><span /><div><strong>Carteirinha bariátrica explicada</strong><small>Confirma que a exigência de validação foi informada.</small></div></label> : null}
      <button className="agent-primary" disabled={testing || loading || !selectedOffer || !date || (needsTime && !time)}><FaSearch />{testing ? "Consultando…" : "Consultar vaga e preço"}</button>
      {result ? <div className={`agent-simulation-result ${result.disponivel === true ? "is-ok" : "is-failed"}`}><strong>{result.disponivel === true ? result.prontoParaPagamento === true ? "Disponível e completo" : "Disponível, com dados pendentes" : "Indisponível"}</strong><span>{String(offerResult.nome || selectedOffer?.nome || "Oferta")} · {String(result.data || date)}{time ? ` às ${String(result.horario || time)}` : ""}</span><dl><div><dt>Participantes</dt><dd>{String(result.participantes ?? 0)}</dd></div><div><dt>Vagas restantes</dt><dd>{result.vagasRestantes == null ? "Sem limite" : String(result.vagasRestantes)}</dd></div><div><dt>Valor</dt><dd>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(result.valor ?? 0))}</dd></div></dl>{pending.length ? <small>Pendente: {pending.join(" · ")}</small> : null}{Array.isArray(result.motivos) && result.motivos.length ? <small>Motivos: {result.motivos.map(String).join(", ")}</small> : null}</div> : null}
    </form>
  </div>;
}

function SettingsPanel({ onMessage, onError }: { onMessage: (text: string) => void; onError: (error: unknown) => void }) {
  const [config, setConfig] = useState<AgentConfig>({ typingEnabled: true, replyDelayMs: 0, typingMsPerChar: 45, typingMinMs: 1500, typingMaxMs: 9000 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api("/crm/agente/config").then((data) => setConfig((current) => ({ ...current, ...(data as Partial<AgentConfig>) }))).catch(onError).finally(() => setLoading(false)); }, [onError]);
  const field = (label: string, key: keyof AgentConfig, divisor = 1) => <label>{label}<input type="number" min="0" step={divisor === 1000 ? .5 : 5} value={Number(config[key]) / divisor} onChange={(event) => setConfig((current) => ({ ...current, [key]: Math.round(Number(event.target.value) * divisor) }))} /></label>;
  return <article className="agent-card agent-settings"><div className="agent-card__title"><span><FaCog /></span><div><h2>Ritmo das respostas</h2><p>Essas configurações se aplicam ao atendimento automático.</p></div></div>{loading ? <p>Carregando…</p> : <><label className="agent-toggle"><input type="checkbox" checked={config.typingEnabled} onChange={(event) => setConfig((current) => ({ ...current, typingEnabled: event.target.checked }))} /><span /><div><strong>Simular “digitando…”</strong><small>Mostra presença antes de cada resposta.</small></div></label><div className="agent-settings-grid">{field("Atraso antes de responder (s)", "replyDelayMs", 1000)}{field("Digitação mínima (s)", "typingMinMs", 1000)}{field("Digitação máxima (s)", "typingMaxMs", 1000)}{field("Velocidade (ms por caractere)", "typingMsPerChar")}</div><button className="agent-primary" disabled={saving} onClick={async () => { setSaving(true); try { await api("/crm/agente/config", { method: "POST", body: JSON.stringify(config) }); onMessage("Configuração salva."); } catch (caught) { onError(caught); } finally { setSaving(false); } }}><FaSave />{saving ? "Salvando…" : "Salvar configurações"}</button></>}</article>;
}
