import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import jatobaIcon from "../assets/jatoba-assistant.png";
import { SiteBookingForm } from "./SiteBookingForm";

const API_BASE = (import.meta.env.VITE_API_BASE || "https://vagafogo-production.up.railway.app").replace(/\/+$/, "");
const STORAGE_KEY = "vagafogo_jatoba_site_chat_v1";
const STORAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const WELCOME = "Olá! Eu sou a Jatobá, atendente da Fazenda Vagafogo. 🌿\n\nComo posso te ajudar?";
const OFFICIAL_CHECKOUT_HOSTS = new Set(["vagafogo.com.br", "www.vagafogo.com.br"]);

type ChatMedia = {
  type?: string;
  dataUrl?: string;
  pixPayload?: string;
  items?: Array<{ dataUrl?: string; titulo?: string; legenda?: string }>;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  media?: ChatMedia | null;
  additional?: string[];
  createdAt: number;
};

type StoredChat = {
  expiresAt: number;
  sessionId: string;
  name: string;
  phone: string;
  messages: ChatMessage[];
};

type SiteManualMessage = {
  id: string;
  from: "agent";
  text: string;
  ts: number;
};

const createId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
const createSessionId = () => `site_${createId().replace(/[^A-Za-z0-9_-]/g, "")}`;

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  if (digits.startsWith("55")) return digits;
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
};

const formatPhone = (value: string) => {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55")) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  const split = digits.length === 11 ? 7 : 6;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`;
};

const safeStoredChat = (): StoredChat | null => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as StoredChat | null;
    if (!parsed || parsed.expiresAt < Date.now() || !String(parsed.sessionId).startsWith("site_")) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return {
      ...parsed,
      messages: Array.isArray(parsed.messages) ? parsed.messages.slice(-50).map((message) => ({ ...message, media: null })) : [],
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

const cleanUrl = (value: string) => value
  .replace(/\\&/g, "&")
  .replace(/&amp;/g, "&")
  .replace(/[),.;]+$/, "");

const isOfficialCardCheckout = (value: string) => {
  try {
    const url = new URL(cleanUrl(value));
    return OFFICIAL_CHECKOUT_HOSTS.has(url.hostname.toLowerCase())
      && url.pathname.replace(/\/+$/, "") === "/reservar"
      && url.searchParams.has("agent_checkout");
  } catch {
    return false;
  }
};

const extractOfficialCardCheckout = (text: string) => {
  const urls = text.match(/https?:\/\/[^\s<>\]]+/g) || [];
  return urls.map(cleanUrl).find(isOfficialCardCheckout) || "";
};

const checkoutModalUrl = (value: string) => {
  const url = new URL(value);
  url.searchParams.set("checkout_modal", "1");
  return url.toString();
};

function PaymentLink({ href, label, onOpen }: { href: string; label: string; onOpen: (url: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(cleanUrl(href))}
      className="my-1 inline-flex items-center gap-2 rounded-xl bg-[#20745a] px-3.5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-[#195e49] focus:outline-none focus:ring-2 focus:ring-[#20745a]/30"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 15h3" />
      </svg>
      {label}
    </button>
  );
}

function RichText({ children, onOpenCheckout }: { children: string; onOpenCheckout: (url: string) => void }) {
  const parts = children.split(/(\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>]+|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g);
  return (
    <>
      {parts.map((part, index): ReactNode => {
        const markdownLink = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
        if (markdownLink) {
          if (isOfficialCardCheckout(markdownLink[2])) {
            return <PaymentLink key={index} href={markdownLink[2]} label={markdownLink[1] || "Abrir pagamento seguro"} onOpen={onOpenCheckout} />;
          }
          return <a key={index} href={cleanUrl(markdownLink[2])} target="_blank" rel="noreferrer" className="font-semibold text-[#20745a] underline underline-offset-2">{markdownLink[1]}</a>;
        }
        if (part.startsWith("http")) {
          const url = cleanUrl(part);
          if (isOfficialCardCheckout(url)) {
            return <PaymentLink key={`${part}-${index}`} href={url} label="Abrir pagamento seguro" onOpen={onOpenCheckout} />;
          }
          return <a key={`${part}-${index}`} href={url} target="_blank" rel="noreferrer" className="font-semibold text-[#20745a] underline underline-offset-2">{url}</a>;
        }
        if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("*") && part.endsWith("*"))) {
          return <strong key={index}>{part.replace(/^\*{1,2}|\*{1,2}$/g, "")}</strong>;
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

function MediaBlock({ media }: { media?: ChatMedia | null }) {
  const [copied, setCopied] = useState(false);
  if (!media) return null;
  if (media.type === "gallery" && media.items?.length) {
    return (
      <div className="mt-3 grid gap-2">
        {media.items.slice(0, 3).map((item, index) => item.dataUrl ? (
          <figure key={index} className="overflow-hidden rounded-2xl bg-white">
            <a href={item.dataUrl} target="_blank" rel="noreferrer" aria-label={`Ampliar ${item.titulo || "foto da Fazenda Vagafogo"}`}><img src={item.dataUrl} alt={item.titulo || item.legenda || "Foto da Fazenda Vagafogo"} loading="lazy" className="max-h-56 w-full object-cover" /></a>
            {(item.legenda || item.titulo) && <figcaption className="px-3 py-2 text-xs text-[#5f574d]">{item.legenda || item.titulo}</figcaption>}
          </figure>
        ) : null)}
      </div>
    );
  }
  if (media.type === "pix") {
    return (
      <div className="mt-3 rounded-2xl border border-[#dbe7d3] bg-white p-3">
        {media.dataUrl && <img src={media.dataUrl} alt="QR Code PIX" className="mx-auto mb-3 w-full max-w-52 rounded-xl" />}
        {media.pixPayload && (
          <>
            <p className="mb-1 text-xs font-semibold text-[#3b4b36]">PIX copia e cola</p>
            <p className="max-h-24 overflow-auto break-all rounded-lg bg-[#f3f7ee] p-2 text-[11px] leading-relaxed text-[#3b4b36]">{media.pixPayload}</p>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(media.pixPayload || "").then(() => setCopied(true))}
              className="mt-2 w-full rounded-xl bg-[#20745a] px-3 py-2 text-sm font-semibold text-white"
            >
              {copied ? "Código copiado" : "Copiar código PIX"}
            </button>
          </>
        )}
      </div>
    );
  }
  if (media.type === "image" && media.dataUrl) {
    return <a href={media.dataUrl} target="_blank" rel="noreferrer" aria-label="Ampliar imagem enviada pela Jatobá"><img src={media.dataUrl} alt="Imagem enviada pela Jatobá" loading="lazy" className="mt-3 max-h-56 w-full rounded-2xl object-cover" /></a>;
  }
  return null;
}

function SecureCheckoutModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, url]);

  return (
    <div className="fixed inset-0 z-[110] bg-[#13271f]/70 p-2 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-label="Pagamento seguro da Fazenda Vagafogo">
      <section className="mx-auto flex h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[26px] bg-white shadow-2xl sm:h-[calc(100dvh-2.5rem)] sm:rounded-[30px]">
        <header className="border-b border-[#dce6da] bg-[#f8faf5] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e7f2ea] text-[#20745a]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
                <path d="m9 12 2 2 4-5" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg leading-tight text-[#263d31] sm:text-xl">Pagamento seguro</h2>
              <p className="mt-1 text-xs leading-relaxed text-[#5f6d63] sm:text-sm">
                Você continuará no ambiente oficial da Fazenda Vagafogo. Os dados do cartão são preenchidos somente nesta página e nunca ficam registrados no chat.
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Fechar pagamento" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#425149] transition hover:bg-[#e7eee4]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 bg-white">
          {loading && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-white">
              <div className="text-center text-sm text-[#5f6d63]">
                <span className="mx-auto mb-3 block h-8 w-8 animate-spin rounded-full border-2 border-[#cddbcf] border-t-[#20745a]" />
                Abrindo o checkout seguro…
              </div>
            </div>
          )}
          <iframe
            key={url}
            src={checkoutModalUrl(url)}
            title="Checkout seguro da Fazenda Vagafogo"
            className="h-full w-full border-0"
            allow="payment *; clipboard-write 'self'"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setLoading(false)}
          />
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[#dce6da] bg-white px-4 py-2.5 pb-[max(.625rem,env(safe-area-inset-bottom))] text-[11px] text-[#69766d] sm:px-6 sm:text-xs">
          <span className="inline-flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#20745a]" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
            vagafogo.com.br
          </span>
          <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-[#20745a] underline underline-offset-2">Abrir em tela cheia</a>
        </footer>
      </section>
    </div>
  );
}

export function openSiteChat() {
  window.dispatchEvent(new CustomEvent("vagafogo:open-chat"));
}

export function SiteChatWidget() {
  const location = useLocation();
  const hidden = /^\/(admin|CRM|agente|login|formulario)(\/|$)/i.test(location.pathname)
    || new URLSearchParams(location.search).get("checkout_modal") === "1";
  const redirectedPhone = useMemo(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("origem") !== "whatsapp") return "";
    const normalized = normalizePhone(params.get("telefone") || "");
    return normalized.length >= 12 && normalized.length <= 13 ? normalized : "";
  }, [location.search]);
  const stored = useMemo(safeStoredChat, []);
  const initial = useMemo(() => {
    if (!stored) return null;
    if (redirectedPhone && normalizePhone(stored.phone) !== redirectedPhone) return null;
    return stored;
  }, [redirectedPhone, stored]);
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState(initial?.sessionId || createSessionId());
  const [name, setName] = useState(initial?.name || "");
  const [phone, setPhone] = useState(initial?.phone || redirectedPhone || "");
  const [started, setStarted] = useState(Boolean(initial?.phone && (!redirectedPhone || initial.name)));
  const [messages, setMessages] = useState<ChatMessage[]>(initial?.messages?.length ? initial.messages : []);
  const [sessionRegistered, setSessionRegistered] = useState(Boolean(initial?.messages?.some((message) => message.role === "user")));
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [humanMode, setHumanMode] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [bookingFormOpen, setBookingFormOpen] = useState(false);
  const [waitingSeconds, setWaitingSeconds] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bookingFormRef = useRef<HTMLDivElement>(null);
  const followMessagesRef = useRef(true);
  const showCurrentBookingStep = useCallback(() => {
    bookingFormRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const sendingRef = useRef(false);
  const manualCursorRef = useRef(0);

  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener("vagafogo:open-chat", openChat);
    return () => window.removeEventListener("vagafogo:open-chat", openChat);
  }, []);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("atendimento") === "1") setOpen(true);
  }, [location.search]);

  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 639px)").matches) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  useEffect(() => {
    if (!started) return;
    const persistable = messages.slice(-50).map(({ media: _media, ...message }) => message);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      expiresAt: Date.now() + STORAGE_TTL_MS,
      sessionId,
      name,
      phone,
      messages: persistable,
    } satisfies StoredChat));
  }, [messages, name, phone, sessionId, started]);

  useEffect(() => {
    if (!open || !followMessagesRef.current) return;
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  }, [messages, loading, open, bookingFormOpen]);

  useEffect(() => {
    if (!bookingFormOpen) return;
    requestAnimationFrame(showCurrentBookingStep);
  }, [bookingFormOpen, showCurrentBookingStep]);

  useEffect(() => {
    if (!loading) { setWaitingSeconds(0); return; }
    const startedAt = Date.now();
    const timer = window.setInterval(() => setWaitingSeconds(Math.floor((Date.now() - startedAt) / 1000)), 500);
    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (!started || !sessionRegistered || !sessionId || !phone) return;
    let disposed = false;
    const poll = async () => {
      try {
        const query = new URLSearchParams({
          telefone: normalizePhone(phone),
          after: String(manualCursorRef.current),
        });
        const response = await fetch(`${API_BASE}/atendimento/site/sessao/${encodeURIComponent(sessionId)}/mensagens?${query.toString()}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok || disposed) return;
        const result = await response.json() as { mode?: string; messages?: SiteManualMessage[] };
        setHumanMode(result.mode === "human");
        const incoming = Array.isArray(result.messages) ? result.messages : [];
        if (!incoming.length) return;
        manualCursorRef.current = Math.max(manualCursorRef.current, ...incoming.map((message) => Number(message.ts) || 0));
        setMessages((current) => {
          const ids = new Set(current.map((message) => message.id));
          const additions = incoming
            .filter((message) => message.from === "agent" && message.text && !ids.has(message.id))
            .map((message): ChatMessage => ({
              id: message.id,
              role: "assistant",
              content: message.text,
              createdAt: Number(message.ts) || Date.now(),
            }));
          return additions.length ? [...current, ...additions] : current;
        });
      } catch {
        // O polling é silencioso para não interromper a conversa do visitante.
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 3_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [phone, sessionId, sessionRegistered, started]);

  const begin = (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizePhone(phone);
    if (redirectedPhone && name.trim().length < 2) {
      setError("Informe seu nome para iniciar o atendimento.");
      return;
    }
    if (normalized.length < 12 || normalized.length > 13) {
      setError("Informe um WhatsApp válido com DDD.");
      return;
    }
    setPhone(normalized);
    setStarted(true);
    setError("");
    if (redirectedPhone) {
      const cleanLocation = new URL(window.location.href);
      cleanLocation.searchParams.delete("telefone");
      window.history.replaceState(window.history.state, "", `${cleanLocation.pathname}${cleanLocation.search}${cleanLocation.hash}`);
    }
    if (!messages.length) setMessages([{ id: createId(), role: "assistant", content: WELCOME, createdAt: Date.now() }]);
  };

  const send = async (override?: string): Promise<boolean> => {
    const content = (override ?? draft).trim();
    if (!content || loading || sendingRef.current) return false;
    sendingRef.current = true;
    followMessagesRef.current = true;
    const history = messages.map((message) => ({ role: message.role, content: message.content })).slice(-50);
    const userMessage: ChatMessage = { id: createId(), role: "user", content, createdAt: Date.now() };
    setMessages((current) => [...current, userMessage]);
    if (!override) setDraft("");
    if (!override && /\b(quero|gostaria|vamos|pode|preciso|desejo).{0,40}\b(reservar|reserva)\b/i.test(content)) setBookingFormOpen(true);
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/atendimento/site/mensagem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem: content, nome: name.trim(), telefone: phone, sessionId, messageId: userMessage.id, historico: history }),
      });
      if (response.ok) setSessionRegistered(true);
      const result = await response.json().catch(() => ({}));
      if (!response.ok || (!result.resposta && !result.atendimento_humano)) throw new Error(result.mensagem || "Não foi possível responder agora.");
      if (result.session_id) setSessionId(String(result.session_id));
      setHumanMode(result.atendimento_humano === true);
      if (result.resposta) {
        const assistantMessage: ChatMessage = {
          id: createId(),
          role: "assistant",
          content: String(result.resposta),
          media: result.media || null,
          additional: Array.isArray(result.mensagens_adicionais) ? result.mensagens_adicionais : [],
          createdAt: Date.now(),
        };
        setMessages((current) => [...current, assistantMessage]);
        const checkout = [assistantMessage.content, ...(assistantMessage.additional || [])]
          .map(extractOfficialCardCheckout)
          .find(Boolean);
        if (checkout) setCheckoutUrl(checkout);
      }
      return result.atendimento_humano !== true;
    } catch (cause) {
      setMessages((current) => current.filter((message) => message.id !== userMessage.id));
      setDraft(content);
      setError(cause instanceof Error ? cause.message : "Não foi possível responder agora. Tente novamente.");
      return false;
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  if (hidden) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[80] sm:bottom-6 sm:right-6">
        {open && (
          <section
            aria-label="Atendimento com a Jatobá"
            className={`flex flex-col overflow-hidden border border-[#dfe7d9] bg-[#f8faf5] shadow-2xl ${fullScreen ? "fixed inset-0 h-[100dvh] w-screen rounded-none sm:inset-4 sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:rounded-[28px]" : "fixed bottom-2 left-2 right-2 h-[calc(100dvh-1rem)] rounded-[26px] sm:absolute sm:inset-auto sm:bottom-20 sm:right-0 sm:h-[min(680px,calc(100dvh-7rem))] sm:w-[410px] sm:rounded-[28px]"}`}
          >
            <header className="flex items-center gap-3 bg-[#214f3e] px-4 py-3.5 text-white">
              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white/30 bg-[#f4eddd]">
                <img src={jatobaIcon} alt="Ícone da Jatobá" className="h-full w-full object-contain p-0.5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg leading-tight">Jatobá</h2>
                <p className="text-xs text-white/80">Atendimento da Fazenda Vagafogo</p>
              </div>
              <button type="button" onClick={() => setFullScreen((value) => !value)} aria-label={fullScreen ? "Reduzir atendimento" : "Abrir atendimento em tela cheia"} aria-pressed={fullScreen} title={fullScreen ? "Reduzir" : "Tela cheia"} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d={fullScreen ? "M8 3v5H3m13-5v5h5M3 16h5v5m13-5h-5v5" : "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"} /></svg>
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar atendimento" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </header>

            {!started ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4">
                <div className="flex items-end gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f4eddd]">
                    <img src={jatobaIcon} alt="" className="h-full w-full object-contain p-0.5" />
                  </span>
                  <div className="max-w-[86%] rounded-2xl rounded-bl-md border border-[#e4eadf] bg-white px-3.5 py-3 text-sm leading-relaxed text-[#2d382f] shadow-sm">
                    <p className="whitespace-pre-wrap">{WELCOME}</p>
                  </div>
                </div>

                <form onSubmit={begin} className="ml-10 mt-3 rounded-2xl border border-[#dfe7d9] bg-white p-4 shadow-sm">
                  <h3 className="font-display text-lg text-[#263d31]">{redirectedPhone ? "Como podemos chamar você?" : "Antes de começarmos"}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#657066]">{redirectedPhone ? "Seu WhatsApp já foi identificado. Informe seu nome para a Jatobá continuar o atendimento por aqui." : "Informe seu WhatsApp para manter o atendimento e a reserva organizados. Isso não autoriza o envio de campanhas."}</p>
                  <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-[#526057]">Primeiro nome {!redirectedPhone && <span className="normal-case font-normal text-[#7d877f]">(opcional)</span>}</label>
                  <input value={name} onChange={(event) => setName(event.target.value.slice(0, 120))} required={Boolean(redirectedPhone)} autoFocus={Boolean(redirectedPhone)} placeholder="Como podemos chamar você?" className="mt-1 w-full rounded-xl border border-[#d6dfd1] bg-[#fbfcfa] px-3.5 py-3 text-sm outline-none focus:border-[#4d856b] focus:ring-2 focus:ring-[#4d856b]/20" />
                  {!redirectedPhone && <><label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-[#526057]">WhatsApp</label><input value={formatPhone(phone)} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" required placeholder="(62) 99999-9999" className="mt-1 w-full rounded-xl border border-[#d6dfd1] bg-[#fbfcfa] px-3.5 py-3 text-sm outline-none focus:border-[#4d856b] focus:ring-2 focus:ring-[#4d856b]/20" /></>}
                  {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
                  <button type="submit" className="mt-4 w-full rounded-xl bg-[#8b4f23] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#8b4f23]/15 hover:bg-[#743f1b]">{redirectedPhone ? "Continuar com a Jatobá" : "Continuar no chat"}</button>
                  <p className="mt-3 text-center text-[10px] leading-relaxed text-[#7b837c]">O histórico fica disponível neste aparelho por até 7 dias.</p>
                </form>
              </div>
            ) : (
              <>
                <div className={`min-h-0 flex-1 ${bookingFormOpen ? `grid grid-rows-[minmax(145px,38%)_minmax(0,1fr)] ${fullScreen ? "sm:grid-cols-[minmax(0,1fr)_minmax(360px,46%)] sm:grid-rows-1" : ""}` : "flex flex-col"}`}>
                  <div ref={scrollRef} onScroll={(event) => { const node = event.currentTarget; followMessagesRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80; }} className="min-h-0 overflow-y-auto px-3 py-4 sm:px-4">
                  <div className="space-y-3">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex items-end gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      {message.role === "assistant" && (
                        <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f4eddd]">
                          <img src={jatobaIcon} alt="" className="h-full w-full object-contain p-0.5" />
                        </span>
                      )}
                      <div className={`max-w-[85%] rounded-2xl px-3.5 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[min(78%,720px)] ${message.role === "user" ? "rounded-br-md bg-[#8b4f23] text-white" : "rounded-bl-md border border-[#e4eadf] bg-white text-[#2d382f]"}`}>
                        <p className="whitespace-pre-wrap"><RichText onOpenCheckout={setCheckoutUrl}>{message.content}</RichText></p>
                        <MediaBlock media={message.media} />
                        {message.additional?.map((extra, index) => <p key={index} className="mt-3 whitespace-pre-wrap"><RichText onOpenCheckout={setCheckoutUrl}>{extra}</RichText></p>)}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex items-end gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f4eddd]"><img src={jatobaIcon} alt="" className="h-full w-full object-contain p-0.5" /></span>
                      <div className="rounded-2xl rounded-bl-md border border-[#e4eadf] bg-white px-4 py-3 text-sm text-[#607064]">{waitingSeconds >= 3 ? "Jatobá está consultando as informações para você" : "Jatobá está escrevendo"}<span className="animate-pulse">…</span></div>
                    </div>
                  )}
                  </div>
                  </div>
                  {bookingFormOpen && <div ref={bookingFormRef} className={`min-h-0 overflow-y-auto border-t border-[#dfe8dc] p-3 sm:p-4 ${fullScreen ? "sm:border-l sm:border-t-0" : ""}`}><div className="mx-auto max-w-[720px]"><SiteBookingForm sessionId={sessionId} sending={loading} onClose={() => setBookingFormOpen(false)} onStepChange={showCurrentBookingStep} onStep={send} /></div></div>}
                </div>
                <div className="border-t border-[#e0e7dc] bg-white p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
                  {humanMode && <div className="mb-2 rounded-xl bg-[#eef6f1] px-3 py-2 text-xs text-[#315c49]">Um atendente da Fazenda está acompanhando esta conversa.</div>}
                  {error && <div className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error} Sua mensagem continua no campo para tentar novamente.</div>}
                  {!bookingFormOpen && !humanMode && <button type="button" onClick={() => setBookingFormOpen(true)} className="mb-2 rounded-full border border-[#bfd8c5] bg-[#eff7ef] px-3 py-1.5 text-xs font-semibold text-[#20745a] hover:bg-[#e5f1e7]">📅 Planejar reserva com campos</button>}
                  <div className="flex items-end gap-2 rounded-2xl border border-[#d5ded0] bg-[#f8faf5] p-2 focus-within:border-[#4d856b]">
                    <textarea value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 4096))} onKeyDown={onKeyDown} disabled={loading} rows={1} placeholder="Digite sua mensagem…" className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none" />
                    <button type="button" onClick={() => void send()} disabled={loading || !draft.trim()} aria-label="Enviar mensagem" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#20745a] text-white disabled:cursor-not-allowed disabled:opacity-40">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {!open && (
          <button type="button" onClick={() => setOpen(true)} aria-label="Abrir atendimento com a Jatobá" className="group flex items-center gap-3">
            <span className="hidden rounded-full bg-[#263d31] px-4 py-2 text-sm font-semibold text-white shadow-lg sm:block">Fale com a Jatobá</span>
            <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border-2 border-white bg-[#f4eddd] shadow-xl shadow-[#214f3e]/30 transition-transform group-hover:scale-105">
              <img src={jatobaIcon} alt="" className="h-full w-full object-contain p-1" />
            </span>
          </button>
        )}
      </div>

      {checkoutUrl && <SecureCheckoutModal url={checkoutUrl} onClose={() => setCheckoutUrl("")} />}
    </>
  );
}
