import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { signOut } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaBan,
  FaBars,
  FaChartLine,
  FaCheckCircle,
  FaCog,
  FaComments,
  FaEdit,
  FaEye,
  FaEyeSlash,
  FaHeadset,
  FaImage,
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

type TabKey = "overview" | "sessions" | "leads" | "gallery" | "whatsapp" | "prompt" | "diagnostics" | "settings";
type ContactMode = "bot" | "human" | "blocked";

type AgentStatus = {
  connected?: boolean;
  ready?: boolean;
  build?: string;
  connectedNumber?: string | null;
  lastState?: string | null;
  lastError?: string | null;
  lastMessageAt?: string | null;
  privacy?: { conversationStorage?: string; ttlSeconds?: number; firestoreMessages?: boolean; mediaBinariesStored?: boolean };
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
  followupStartTime: string;
  followupEndTime: string;
  followupTimezone: string;
};

type AgentLead = {
  id: string;
  sessionId?: string;
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
  recordState: "em_atendimento" | "aguardando_pagamento" | "finalizado";
  isFinalized: boolean;
  finalizeAt?: string;
  finalizedAt?: string;
  isTest: boolean;
};

type GalleryCategory = "brunch" | "trilha" | "espacos" | "combo" | "educacao_ambiental";
type GalleryPhoto = {
  id: string;
  categoria: GalleryCategory;
  titulo: string;
  legenda?: string | null;
  mimeType: string;
  filename: string;
  sizeBytes: number;
  ativo: boolean;
  previewUrl?: string;
  padrao?: boolean;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "https://vagafogo-production.up.railway.app";

const tabs: Array<{ key: TabKey; label: string; icon: IconType }> = [
  { key: "overview", label: "Visão geral", icon: FaRobot },
  { key: "sessions", label: "Atendimentos", icon: FaHeadset },
  { key: "leads", label: "Leads gerados", icon: FaChartLine },
  { key: "gallery", label: "Galeria", icon: FaImage },
  { key: "whatsapp", label: "WhatsApp", icon: FaWhatsapp },
  { key: "prompt", label: "Assistente", icon: FaEdit },
  { key: "diagnostics", label: "Diagnóstico", icon: FaPlug },
  { key: "settings", label: "Comportamento", icon: FaCog },
];

const titles: Record<TabKey, { title: string; subtitle: string }> = {
  overview: { title: "Agente Vagafogo", subtitle: "Atendimento, privacidade e operação do WhatsApp em um só lugar." },
  sessions: { title: "Atendimentos ativos", subtitle: "Assuma, devolva ao bot ou bloqueie contatos específicos." },
  leads: { title: "Leads em acompanhamento", subtitle: "Acompanhe a coleta desde o primeiro interesse até o encerramento, sem armazenar a conversa." },
  gallery: { title: "Galeria do agente", subtitle: "Cadastre as fotos que a Jatobá pode enviar durante o atendimento." },
  whatsapp: { title: "Conexão do WhatsApp", subtitle: "Conecte o número do agente e valide o envio antes de operar." },
  prompt: { title: "Assistente e prompt", subtitle: "Ajuste o comportamento da IA e teste sem enviar mensagens reais." },
  diagnostics: { title: "Diagnóstico dos serviços", subtitle: "Verificação sob demanda da integração entre os serviços." },
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
const normalizedLeadToken = (value: unknown) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "");
const canonicalLeadStage = (value: unknown) => {
  const stage = normalizedLeadToken(value);
  if (["contato_iniciado", "interesse_identificado", "cotacao", "dados_em_coleta", "aguardando_confirmacao", "pagamento_pendente", "concluida", "atendimento_humano", "encerrado_sem_reserva"].includes(stage)) return stage;
  if (/conclu|confirmad|reserva_realizada|pagamento_aprovado/.test(stage)) return "concluida";
  if (/humano/.test(stage)) return "atendimento_humano";
  if (/encerr|perdid|desist|sem_interesse/.test(stage)) return "encerrado_sem_reserva";
  if (/pagamento|pix|cobranca/.test(stage)) return "pagamento_pendente";
  if (/aguard.*confirm/.test(stage)) return "aguardando_confirmacao";
  if (/dado|colet/.test(stage)) return "dados_em_coleta";
  if (/cotac|disponib|orcamento/.test(stage)) return "cotacao";
  if (/interess/.test(stage)) return "interesse_identificado";
  return "contato_iniciado";
};
const canonicalLeadOutcome = (value: unknown) => {
  const outcome = normalizedLeadToken(value);
  if (["em_andamento", "aguardando_cliente", "pagamento_pendente", "reserva_confirmada", "nao_convertido", "atendimento_humano"].includes(outcome)) return outcome;
  if (/reserva_confirm|pagamento_(aprovado|confirmado)|pago|conclu/.test(outcome)) return "reserva_confirmada";
  if (/humano/.test(outcome)) return "atendimento_humano";
  if (/nao_convert|perdid|encerr|desist|sem_interesse/.test(outcome)) return "nao_convertido";
  if (/pagamento|pix|cobranca/.test(outcome)) return "pagamento_pendente";
  if (/aguard/.test(outcome)) return "aguardando_cliente";
  return "em_andamento";
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
  const selectedJidRef = useRef<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const selected = useMemo(() => contacts.find((item) => item.jid === selectedJid) ?? null, [contacts, selectedJid]);
  const operational = Boolean(status.ready && status.contactControls?.ready !== false);

  useEffect(() => {
    selectedJidRef.current = selectedJid;
  }, [selectedJid]);

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
      const sessionId = raw.sessionId ? String(raw.sessionId) : undefined;
      const sessionPhone = sessionId?.match(/^whatsapp_(\d{10,15})$/)?.[1];
      const rawPhone = String(raw.telefone ?? "");
      const isLegacyLid = Boolean(sessionId?.includes("@lid"));
      const stage = canonicalLeadStage(raw.etapa);
      const outcome = canonicalLeadOutcome(raw.resultado);
      const storedState = String(raw.estadoRegistro ?? "");
      const isFinalized = raw.finalizado === true
        || storedState === "finalizado"
        || Boolean(raw.finalizadoEm)
        || outcome === "reserva_confirmada"
        || outcome === "nao_convertido";
      const recordState = isFinalized
        ? "finalizado"
        : storedState === "aguardando_pagamento" || stage === "pagamento_pendente" || outcome === "pagamento_pendente"
          ? "aguardando_pagamento"
          : "em_atendimento";
      return {
        id: document.id,
        sessionId,
        phone: sessionPhone || (isLegacyLid ? "" : rawPhone),
        name: raw.nome ? String(raw.nome) : undefined,
        stage,
        outcome,
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
        recordState,
        isFinalized,
        finalizeAt: normalizeTimestamp(raw.finalizarApos),
        finalizedAt: normalizeTimestamp(raw.finalizadoEm),
        isTest: raw.teste === true,
      } satisfies AgentLead;
    }).sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
    const unique = new Map<string, AgentLead>();
    next.forEach((lead) => {
      const normalizedPhone = lead.phone.replace(/\D/g, "");
      const nameAndIntent = `${normalizedLeadToken(lead.name)}:${lead.desiredDate || ""}:${lead.activities.map(normalizedLeadToken).sort().join(",")}`;
      const key = normalizedPhone ? `telefone:${normalizedPhone}` : nameAndIntent !== "::" ? `contexto:${nameAndIntent}` : lead.sessionId || lead.id;
      if (!unique.has(key)) unique.set(key, lead);
    });
    setLeads(Array.from(unique.values()));
    setLeadsError("");
    setLeadsLoading(false);
  }, () => {
    setLeadsError("Não foi possível carregar os leads estruturados.");
    setLeadsLoading(false);
  }), []);

  const showMessage = useCallback((text: string) => {
    setError("");
    setNotice(text);
    window.setTimeout(() => setNotice(""), 4_000);
  }, []);

  const showError = useCallback((caught: unknown) => {
    setNotice("");
    setError(caught instanceof Error ? caught.message : "Não foi possível concluir a ação.");
  }, []);

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
        <div className="agent-sidebar__privacy"><FaShieldAlt /><strong>Histórico temporário</strong><span>Mensagens e marcadores de mídia expiram automaticamente em 7 dias.</span></div>
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
                const requestId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
                  ? `manual-${crypto.randomUUID()}`
                  : `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                const optimisticId = `pending-${requestId}`;
                if (selectedJidRef.current === jid) {
                  setMessages((current) => [...current, { id: optimisticId, from: "agent", text, ts: Date.now() }]);
                }
                try {
                  await api(`/crm/agente/contatos/${encodeURIComponent(jid)}/enviar`, { method: "POST", body: JSON.stringify({ text, requestId }) });
                  const data = await api(`/crm/agente/contatos/${encodeURIComponent(jid)}/mensagens`) as { messages?: Message[] };
                  if (selectedJidRef.current === jid) {
                    setMessages(Array.isArray(data.messages) ? data.messages : []);
                  }
                  await loadContacts(true);
                } catch (caught) {
                  if (selectedJidRef.current === jid) {
                    setMessages((current) => current.filter((message) => message.id !== optimisticId));
                  }
                  showError(caught);
                  throw caught;
                }
              }}
              onCloseSession={async (contact) => {
                try {
                  await api(`/crm/agente/contatos/${encodeURIComponent(contact.jid)}/sessao`, {
                    method: "DELETE",
                    body: JSON.stringify({ phone: contactPhone(contact) }),
                  });
                  setSelectedJid(null);
                  setMessages([]);
                  await loadContacts(true);
                  showMessage("Sessão encerrada, conteúdo descartado e lead finalizado.");
                } catch (caught) { showError(caught); }
              }}
            />
          ) : tab === "leads" ? (
            <LeadsPanel leads={leads} loading={leadsLoading} error={leadsError} onMessage={showMessage} onError={showError} />
          ) : tab === "gallery" ? (
            <GalleryPanel onMessage={showMessage} onError={showError} />
          ) : tab === "whatsapp" ? (
            <WhatsappPanel status={status} onReload={() => loadStatus()} onMessage={showMessage} onError={showError} />
          ) : tab === "prompt" ? (
            <PromptPanel onMessage={showMessage} onError={showError} />
          ) : tab === "diagnostics" ? (
            <DiagnosticsPanel onError={showError} />
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
        <ul><li><FaCheckCircle /><span><strong>Retenção temporária</strong>Mensagens de texto e marcadores de mídia sobrevivem a redeploys por até 7 dias.</span></li><li><FaCheckCircle /><span><strong>Expiração automática</strong>Remoção em {durationLabel(status.privacy?.ttlSeconds)}.</span></li><li><FaCheckCircle /><span><strong>Sem arquivo de mídia</strong>Áudios e imagens não são copiados para o banco.</span></li></ul>
      </article>
      <article className="agent-card agent-next-card">
        <div className="agent-card__title"><span><FaQrcode /></span><div><h2>Fluxo de reserva</h2><p>Integração preparada para homologação.</p></div></div>
        <ol><li className="is-current"><b>1</b><span><strong>Consulta real</strong>Experiências, horários e vagas</span></li><li className="is-current"><b>2</b><span><strong>Pagamento seguro</strong>PIX no WhatsApp ou cartão no site</span></li><li className="is-current"><b>3</b><span><strong>Confirmação</strong>Status atualizado pelo sistema Vagafogo</span></li><li className="is-current"><b>4</b><span><strong>Lead final</strong>Registro estruturado sem conversa</span></li></ol>
        <button onClick={() => onOpen("diagnostics")}>Ver diagnóstico<FaArrowLeft /></button>
      </article>
    </section>
  </>;
}

const readableLeadValue = (value: string) => value
  .replace(/_/g, " ")
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

function LeadsPanel({ leads, loading, error, onMessage, onError }: { leads: AgentLead[]; loading: boolean; error: string; onMessage: (message: string) => void; onError: (error: unknown) => void }) {
  const [search, setSearch] = useState("");
  const [outcome, setOutcome] = useState("all");
  const [origin, setOrigin] = useState("all");
  const [recordState, setRecordState] = useState("all");
  const [editing, setEditing] = useState<AgentLead | null>(null);
  const [saving, setSaving] = useState(false);
  const [resendingConfirmation, setResendingConfirmation] = useState<string | null>(null);
  const outcomes = useMemo(() => Array.from(new Set(leads.map((lead) => lead.outcome))).sort(), [leads]);
  const filtered = useMemo(() => leads.filter((lead) => {
    if (outcome !== "all" && lead.outcome !== outcome) return false;
    if (origin === "real" && lead.isTest) return false;
    if (origin === "test" && !lead.isTest) return false;
    if (recordState !== "all" && lead.recordState !== recordState) return false;
    const haystack = `${lead.name || ""} ${lead.phone} ${lead.activities.join(" ")} ${lead.summary || ""} ${lead.reservationId || ""}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  }), [leads, origin, outcome, recordState, search]);
  const confirmed = leads.filter((lead) => lead.outcome === "reserva_confirmada" || Boolean(lead.reservationId)).length;
  const inProgress = leads.filter((lead) => !lead.isFinalized).length;
  const finalized = leads.filter((lead) => lead.isFinalized).length;
  const testCount = leads.filter((lead) => lead.isTest).length;

  const saveLead = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await api(`/crm/agente/leads/${encodeURIComponent(editing.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          nome: editing.name || "",
          etapa: editing.stage,
          resultado: editing.outcome,
          motivo: editing.reason || "",
          proximaAcao: editing.nextAction || "",
          marketingOptIn: editing.marketingOptIn,
        }),
      });
      setEditing(null);
      onMessage("Lead atualizado.");
    } catch (caught) {
      onError(caught);
    } finally {
      setSaving(false);
    }
  };

  const deleteLead = async (lead: AgentLead) => {
    if (!window.confirm(`Excluir definitivamente o lead de ${lead.name || formatPhone(lead.phone) || "contato sem nome"}?`)) return;
    try {
      await api(`/crm/agente/leads/${encodeURIComponent(lead.id)}`, { method: "DELETE" });
      if (editing?.id === lead.id) setEditing(null);
      onMessage("Lead excluído.");
    } catch (caught) {
      onError(caught);
    }
  };

  const resendConfirmation = async (lead: AgentLead) => {
    if (!lead.reservationId || resendingConfirmation) return;
    setResendingConfirmation(lead.id);
    try {
      await api(`/crm/agente/reservas/${encodeURIComponent(lead.reservationId)}/reenviar-confirmacao`, { method: "POST" });
      onMessage("Confirmação da reserva reenviada pelo WhatsApp do agente.");
    } catch (caught) {
      onError(caught);
    } finally {
      setResendingConfirmation(null);
    }
  };

  return <section className="agent-leads">
    <div className="agent-lead-metrics">
      <article><small>Leads estruturados</small><strong>{leads.length}</strong><span>{testCount} de teste</span></article>
      <article><small>Em acompanhamento</small><strong>{inProgress}</strong><span>Atualizados durante a conversa</span></article>
      <article><small>Finalizados</small><strong>{finalized}</strong><span>Encerrados ou inativos há 2 horas</span></article>
      <article><small>Reservas vinculadas</small><strong>{confirmed}</strong><span>Conversão identificada</span></article>
    </div>
    <article className="agent-card agent-leads-card">
      <div className="agent-card__title"><span><FaChartLine /></span><div><h2>Dados interpretados pelo agente</h2><p>O mesmo lead aparece no primeiro interesse, recebe novos dados durante a conversa e mostra quando foi finalizado.</p></div></div>
      <div className="agent-lead-filters">
        <label><FaSearch /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome, telefone, interesse ou reserva" /></label>
        <select value={recordState} onChange={(event) => setRecordState(event.target.value)}><option value="all">Todos os acompanhamentos</option><option value="em_atendimento">Em atendimento</option><option value="aguardando_pagamento">Aguardando pagamento</option><option value="finalizado">Finalizados</option></select>
        <select value={outcome} onChange={(event) => setOutcome(event.target.value)}><option value="all">Todos os resultados</option>{outcomes.map((item) => <option key={item} value={item}>{readableLeadValue(item)}</option>)}</select>
        <select value={origin} onChange={(event) => setOrigin(event.target.value)}><option value="all">Reais e testes</option><option value="real">Somente reais</option><option value="test">Somente testes</option></select>
      </div>
      {loading ? <p className="agent-empty">Carregando leads estruturados…</p> : error ? <div className="agent-lead-error"><FaBan />{error}</div> : filtered.length === 0 ? <p className="agent-empty">Nenhum lead encontrado com esses filtros.</p> : <div className="agent-lead-list">{filtered.map((lead) => <article key={lead.id}>
        <header><span className="agent-avatar">{(lead.name || lead.phone || "L").charAt(0).toUpperCase()}</span><div><strong>{lead.name || "Nome ainda não coletado"}</strong><small>{formatPhone(lead.phone)}</small></div><div className="agent-lead-badges">{lead.isTest ? <em className="is-test">TESTE</em> : null}<em className={`is-record-${lead.recordState}`}>{lead.recordState === "finalizado" ? "Finalizado" : lead.recordState === "aguardando_pagamento" ? "Aguardando pagamento" : "Em atendimento"}</em><em className={lead.reservationId ? "is-converted" : ""}>{readableLeadValue(lead.outcome)}</em></div></header>
        <div className="agent-lead-data"><span><small>Etapa</small><strong>{readableLeadValue(lead.stage)}</strong></span><span><small>Interesse</small><strong>{lead.activities.length ? lead.activities.join(" + ") : "Não informado"}</strong></span><span><small>Data desejada</small><strong>{lead.desiredDate || "Não informada"}</strong></span><span><small>Participantes</small><strong>{lead.participants ?? "—"}</strong></span><span><small>Valor estimado</small><strong>{lead.estimatedValue == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(lead.estimatedValue)}</strong></span><span><small>Última atualização</small><strong>{dateTimeLabel(lead.updatedAt)}</strong></span><span><small>{lead.isFinalized ? "Finalização" : "Fechamento por inatividade"}</small><strong>{dateTimeLabel(lead.isFinalized ? lead.finalizedAt : lead.finalizeAt)}</strong></span></div>
        {lead.summary ? <p>{lead.summary}</p> : null}
        <footer><span className={lead.marketingOptIn ? "is-allowed" : ""}>{lead.marketingOptIn ? "Opt-in confirmado" : "Sem opt-in"}</span>{lead.paymentMethod ? <span>Pagamento: {readableLeadValue(lead.paymentMethod)}</span> : null}{lead.reservationId ? <span>Reserva: {lead.reservationId}</span> : lead.nextAction ? <span>Próxima ação: {lead.nextAction}</span> : null}{lead.reservationId ? <button className="agent-link" disabled={resendingConfirmation === lead.id} onClick={() => void resendConfirmation(lead)}><FaPaperPlane /> {resendingConfirmation === lead.id ? "Reenviando…" : "Reenviar confirmação"}</button> : null}<button className="agent-link" onClick={() => setEditing({ ...lead })}><FaEdit /> Gerenciar</button><button className="agent-link is-danger" onClick={() => void deleteLead(lead)}><FaTrash /> Excluir</button></footer>
      </article>)}</div>}
    </article>
    {editing ? <div className="agent-modal-backdrop" onClick={() => !saving && setEditing(null)}><article className="agent-modal agent-lead-editor" onClick={(event) => event.stopPropagation()}><header><div><small>GERENCIAR LEAD</small><h2>{editing.name || formatPhone(editing.phone)}</h2>{editing.isTest ? <span className="agent-test-badge">Lead de teste</span> : null}</div><button onClick={() => setEditing(null)} disabled={saving} aria-label="Fechar"><FaTimes /></button></header><div className="agent-lead-editor__grid"><label>Nome<input value={editing.name || ""} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label><label>Etapa<select value={editing.stage} onChange={(event) => setEditing({ ...editing, stage: event.target.value })}>{["contato_iniciado", "interesse_identificado", "cotacao", "dados_em_coleta", "aguardando_confirmacao", "pagamento_pendente", "concluida", "atendimento_humano", "encerrado_sem_reserva"].map((item) => <option key={item} value={item}>{readableLeadValue(item)}</option>)}</select></label><label>Resultado<select value={editing.outcome} onChange={(event) => setEditing({ ...editing, outcome: event.target.value })}>{["em_andamento", "aguardando_cliente", "pagamento_pendente", "reserva_confirmada", "nao_convertido", "atendimento_humano"].map((item) => <option key={item} value={item}>{readableLeadValue(item)}</option>)}</select></label><label>Motivo<input value={editing.reason || ""} onChange={(event) => setEditing({ ...editing, reason: event.target.value })} /></label><label className="is-wide">Próxima ação<input value={editing.nextAction || ""} onChange={(event) => setEditing({ ...editing, nextAction: event.target.value })} /></label><label className="agent-check is-wide"><input type="checkbox" checked={editing.marketingOptIn} onChange={(event) => setEditing({ ...editing, marketingOptIn: event.target.checked })} /> Opt-in de marketing confirmado</label></div><footer><button className="agent-link" onClick={() => setEditing(null)} disabled={saving}>Cancelar</button><button className="agent-primary" onClick={() => void saveLead()} disabled={saving}><FaSave />{saving ? "Salvando…" : "Salvar alterações"}</button></footer></article></div> : null}
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
  onCloseSession: (contact: Contact) => void;
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
  const sendLockRef = useRef(false);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    if (!props.selected) return;
    const timer = window.setInterval(props.onRefreshMessages, 3_000);
    return () => window.clearInterval(timer);
  }, [props.selected, props.onRefreshMessages]);

  useEffect(() => {
    stickToBottomRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [props.selected?.jid]);

  const lastMessageId = props.messages.at(-1)?.id;
  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [lastMessageId, props.messages.length]);

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
    if (!props.selected || !text || sendLockRef.current) return;
    sendLockRef.current = true;
    stickToBottomRef.current = true;
    setReply("");
    setSending(true);
    try {
      await props.onSend(props.selected.jid, text);
    } catch {
      setReply((current) => current || text);
    } finally {
      sendLockRef.current = false;
      setSending(false);
    }
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
          <button className="is-close" title="Encerrar sessão e finalizar lead" onClick={() => props.onCloseSession(props.selected!)}><FaTrash /></button>
        </div></header>
        {contactMode(props.selected) === "blocked" ? <div className="agent-blocked-banner"><FaBan /><span><strong>Contato bloqueado</strong>O bot e os envios manuais não mandarão mensagens para este número.</span></div> : null}
        <div className="agent-thread-scroll" ref={threadRef} onScroll={(event) => {
          const element = event.currentTarget;
          stickToBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight <= 72;
        }}>{props.messages.length === 0 ? <p className="agent-empty">Sem mensagens na memória desta instância.</p> : props.messages.map((message) => <div key={message.id} className={`agent-bubble-row from-${message.from}`}><div><small>{message.from === "client" ? contactName(props.selected) : message.from === "agent" ? "Atendente" : "Bot"}</small><p>{message.text}</p><time>{timeLabel(message.ts)}</time></div></div>)}</div>
        <footer>{contactMode(props.selected) !== "human" ? <p>{contactMode(props.selected) === "blocked" ? "Desbloqueie o contato antes de enviar." : "Assuma o atendimento para responder manualmente."}</p> : <><input value={reply} onChange={(event) => setReply(event.target.value)} onKeyDown={(event) => {
          if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
          event.preventDefault();
          if (!event.repeat) void send();
        }} placeholder="Responder como atendente…" /><button onClick={() => void send()} disabled={sending || !reply.trim()}><FaPaperPlane /></button></>}</footer>
      </>}
    </div>
  </section>;
}

const galleryCategoryLabels: Record<GalleryCategory, string> = {
  brunch: "Brunch",
  trilha: "Trilha",
  espacos: "Espaços e natureza",
  combo: "Combo Brunch + Trilha",
  educacao_ambiental: "Educação ambiental",
};

function GalleryPanel({ onMessage, onError }: { onMessage: (text: string) => void; onError: (error: unknown) => void }) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<GalleryCategory>("espacos");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api("/crm/agente/galeria") as { fotos?: GalleryPhoto[] };
      setPhotos(Array.isArray(data.fotos) ? data.fotos : []);
    } catch (caught) {
      onError(caught);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => { void load(); }, [load]);

  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || !title.trim()) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      onError(new Error("Use uma imagem JPG, PNG ou WebP."));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onError(new Error("A imagem deve ter no máximo 5 MB."));
      return;
    }
    setUploading(true);
    try {
      await api("/crm/agente/galeria", {
        method: "POST",
        headers: {
          "Content-Type": file.type,
          "X-File-Name": encodeURIComponent(file.name),
          "X-Gallery-Category": encodeURIComponent(category),
          "X-Gallery-Title": encodeURIComponent(title.trim()),
          "X-Gallery-Caption": encodeURIComponent(caption.trim()),
        },
        body: file,
      });
      setFile(null);
      setTitle("");
      setCaption("");
      const input = document.getElementById("agent-gallery-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await load();
      onMessage("Foto adicionada à galeria da Jatobá.");
    } catch (caught) {
      onError(caught);
    } finally {
      setUploading(false);
    }
  };

  const remove = async (photo: GalleryPhoto) => {
    if (!window.confirm(`Excluir a foto “${photo.titulo}”?`)) return;
    try {
      await api(`/crm/agente/galeria/${encodeURIComponent(photo.id)}`, { method: "DELETE" });
      await load();
      onMessage("Foto removida da galeria.");
    } catch (caught) {
      onError(caught);
    }
  };

  const toggleDefault = async (photo: GalleryPhoto) => {
    const active = !photo.ativo;
    try {
      await api(`/crm/agente/galeria/padroes/${encodeURIComponent(photo.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ ativo: active }),
      });
      await load();
      onMessage(active ? "Foto padrão restaurada para o agente." : "Foto padrão ocultada do agente.");
    } catch (caught) {
      onError(caught);
    }
  };

  return <section className="agent-gallery-layout">
    <article className="agent-card agent-gallery-form">
      <div className="agent-card__title"><span><FaImage /></span><div><h2>Adicionar foto</h2><p>Estas imagens são permanentes e separadas do histórico temporário das conversas.</p></div></div>
      <form onSubmit={upload}>
        <label>Categoria<select value={category} onChange={(event) => setCategory(event.target.value as GalleryCategory)}>{Object.entries(galleryCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Título<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Ex.: Mesa do brunch" /></label>
        <label>Legenda opcional<textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={500} placeholder="Legenda curta enviada junto da imagem" /></label>
        <label className="agent-gallery-file">Imagem<input id="agent-gallery-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><span>{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : "JPG, PNG ou WebP · até 5 MB"}</span></label>
        <button className="agent-primary" type="submit" disabled={uploading || !file || !title.trim()}><FaImage />{uploading ? "Enviando…" : "Adicionar à galeria"}</button>
      </form>
    </article>
    <article className="agent-card agent-gallery-list-card">
      <div className="agent-card__title"><span><FaImage /></span><div><h2>Fotos disponíveis</h2><p>A Jatobá escolhe até três imagens da categoria solicitada.</p></div></div>
      {loading ? <p className="agent-empty">Carregando galeria…</p> : photos.length === 0 ? <p className="agent-empty">Nenhuma foto cadastrada. Adicione as primeiras imagens para habilitar o envio pelo bot.</p> : <div className="agent-gallery-grid">{photos.map((photo) => <article key={photo.id} className={!photo.ativo ? "is-inactive" : ""}>
        {photo.previewUrl ? <img src={photo.previewUrl} alt={photo.titulo} /> : <div className="agent-gallery-placeholder"><FaImage /></div>}
        <div><small>{galleryCategoryLabels[photo.categoria] || photo.categoria}</small><strong>{photo.titulo}</strong>{photo.legenda ? <p>{photo.legenda}</p> : null}<span>{photo.padrao ? photo.ativo ? "Foto padrão do site · ativa" : "Foto padrão do site · oculta" : `${(photo.sizeBytes / 1024 / 1024).toFixed(1)} MB`}</span></div>
        {photo.padrao
          ? <button type="button" className="agent-gallery-visibility" onClick={() => void toggleDefault(photo)} title={photo.ativo ? "Ocultar foto do agente" : "Restaurar foto para o agente"}>{photo.ativo ? <FaEyeSlash /> : <FaEye />}</button>
          : <button type="button" onClick={() => void remove(photo)} title="Excluir foto"><FaTrash /></button>}
      </article>)}</div>}
    </article>
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
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; text: string; media?: { type?: string; dataUrl?: string; items?: Array<{ dataUrl?: string; titulo?: string }> } }>>([]);
  const [sessionId, setSessionId] = useState("");
  const [testing, setTesting] = useState(false);
  useEffect(() => { api("/crm/agente/prompt").then((data) => setPrompt(String((data as { prompt?: string }).prompt || ""))).catch(onError).finally(() => setLoading(false)); }, [onError]);
  const test = async () => { const pergunta = input.trim(); if (!pergunta) return; setHistory((items) => [...items, { role: "user", text: pergunta }]); setInput(""); setTesting(true); try { const data = await api("/crm/agente/testar", { method: "POST", body: JSON.stringify({ pergunta, session_id: sessionId }) }) as { resposta?: string; session_id?: string; media?: { type?: string; dataUrl?: string; items?: Array<{ dataUrl?: string; titulo?: string }> } }; if (data.session_id) setSessionId(data.session_id); setHistory((items) => [...items, { role: "assistant", text: String(data.resposta || "Resposta vazia"), media: data.media }]); } catch (caught) { onError(caught); } finally { setTesting(false); } };
  return <div className="agent-prompt-grid"><article className="agent-card agent-prompt-editor"><div className="agent-card__title"><span><FaEdit /></span><div><h2>Prompt principal</h2><p>Não inclua regras de preço ou disponibilidade que pertencem ao sistema.</p></div></div>{loading ? <p>Carregando…</p> : <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />}<button className="agent-primary" disabled={saving || !prompt.trim()} onClick={async () => { setSaving(true); try { await api("/crm/agente/prompt", { method: "POST", body: JSON.stringify({ prompt }) }); onMessage("Prompt salvo. As novas regras entram na próxima resposta sem apagar as sessões ativas."); } catch (caught) { onError(caught); } finally { setSaving(false); } }}><FaSave />{saving ? "Salvando…" : "Salvar prompt"}</button></article><article className="agent-card agent-chat-test"><div className="agent-card__title"><span><FaComments /></span><div><h2>Teste privado</h2><p>Não envia WhatsApp nem cria cobrança. Leads usam o número padrão +55 (00) 00000-0000 e recebem o sinalizador TESTE.</p></div></div><div className="agent-test-history">{history.length === 0 ? <p>Envie uma pergunta para validar o comportamento.</p> : history.map((item, index) => <div key={`${item.role}-${index}`} className={item.role}>{item.media?.type === "gallery" ? <span className="agent-test-gallery">{item.media.items?.map((photo, photoIndex) => photo.dataUrl ? <img key={`${photo.titulo || "foto"}-${photoIndex}`} src={photo.dataUrl} alt={photo.titulo || "Foto da galeria"} /> : null)}</span> : item.media?.type === "image" && item.media.dataUrl ? <img className="agent-test-image" src={item.media.dataUrl} alt="Imagem gerada pelo fluxo" /> : null}<span>{item.text}</span></div>)}</div><div className="agent-test-input"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void test(); }} placeholder="Pergunte como se fosse um cliente…" /><button onClick={() => void test()} disabled={testing || !input.trim()}><FaPaperPlane /></button></div><button className="agent-link" onClick={() => { setHistory([]); setSessionId(""); }}>Iniciar novo teste</button></article></div>;
}

function DiagnosticsPanel({ onError }: { onError: (error: unknown) => void }) {
  const [diagnostic, setDiagnostic] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const diagnosticData = await api("/crm/agente/diagnostico") as Record<string, unknown>;
      setDiagnostic(diagnosticData);
    } catch (caught) {
      onError(caught);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => { void load(); }, [load]);

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
  return <div className="agent-reservation-tests">
    <article className="agent-card agent-diagnostic-card"><div className="agent-card__title"><span><FaPlug /></span><div><h2>Diagnóstico dos serviços</h2><p>Confirma a ponte entre os dois Railways sem expor credenciais.</p></div></div>{loading ? <p className="agent-empty">Verificando integrações…</p> : <div className="agent-diagnostic-list">{checks.map((check) => <div className={check.ok ? "is-ok" : "is-failed"} key={check.label}><span>{check.ok ? <FaCheckCircle /> : <FaTimes />}</span><strong>{check.label}</strong><em>{check.ok ? "Pronto" : "Pendente"}</em></div>)}</div>}<button className="agent-primary" type="button" onClick={() => void load()} disabled={loading}><FaSyncAlt /> Atualizar diagnóstico</button></article>
  </div>;
}

function SettingsPanel({ onMessage, onError }: { onMessage: (text: string) => void; onError: (error: unknown) => void }) {
  const [config, setConfig] = useState<AgentConfig>({
    typingEnabled: true,
    replyDelayMs: 0,
    typingMsPerChar: 45,
    typingMinMs: 1500,
    typingMaxMs: 9000,
    followupStartTime: "07:45",
    followupEndTime: "18:00",
    followupTimezone: "America/Sao_Paulo",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => { api("/crm/agente/config").then((data) => setConfig((current) => ({ ...current, ...(data as Partial<AgentConfig>) }))).catch(onError).finally(() => setLoading(false)); }, [onError]);
  const field = (label: string, key: keyof AgentConfig, divisor = 1) => <label>{label}<input type="number" min="0" step={divisor === 1000 ? .5 : 5} value={Number(config[key]) / divisor} onChange={(event) => setConfig((current) => ({ ...current, [key]: Math.round(Number(event.target.value) * divisor) }))} /></label>;
  return <article className="agent-card agent-settings">
    <div className="agent-card__title"><span><FaCog /></span><div><h2>Comportamento de envio</h2><p>Ritmo das respostas e horário permitido para retomadas automáticas.</p></div></div>
    {loading ? <p>Carregando…</p> : <>
      <label className="agent-toggle"><input type="checkbox" checked={config.typingEnabled} onChange={(event) => setConfig((current) => ({ ...current, typingEnabled: event.target.checked }))} /><span /><div><strong>Simular “digitando…”</strong><small>Mostra presença antes de cada resposta.</small></div></label>
      <div className="agent-settings-grid">{field("Atraso antes de responder (s)", "replyDelayMs", 1000)}{field("Digitação mínima (s)", "typingMinMs", 1000)}{field("Digitação máxima (s)", "typingMaxMs", 1000)}{field("Velocidade (ms por caractere)", "typingMsPerChar")}</div>
      <div className="agent-card__title"><span><FaComments /></span><div><h2>Janela de retomadas</h2><p>Lembretes por falta de resposta ficam retidos fora deste período e saem na próxima janela.</p></div></div>
      <div className="agent-settings-grid">
        <label>Início permitido<input type="time" value={config.followupStartTime} onChange={(event) => setConfig((current) => ({ ...current, followupStartTime: event.target.value }))} /></label>
        <label>Fim permitido<input type="time" value={config.followupEndTime} onChange={(event) => setConfig((current) => ({ ...current, followupEndTime: event.target.value }))} /></label>
        <label>Fuso horário<select value={config.followupTimezone} onChange={(event) => setConfig((current) => ({ ...current, followupTimezone: event.target.value }))}><option value="America/Sao_Paulo">Brasília — America/Sao_Paulo</option></select></label>
      </div>
      <button className="agent-primary" disabled={saving || !config.followupStartTime || !config.followupEndTime} onClick={async () => { setSaving(true); try { await api("/crm/agente/config", { method: "POST", body: JSON.stringify(config) }); onMessage("Configuração salva."); } catch (caught) { onError(caught); } finally { setSaving(false); } }}><FaSave />{saving ? "Salvando…" : "Salvar configurações"}</button>
    </>}
  </article>;
}
