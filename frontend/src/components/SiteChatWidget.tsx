import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import jatobaIcon from "../assets/jatoba-crest.webp";
import { SiteBookingForm } from "./SiteBookingForm";
import type { BookingUi, SiteBookingSelection } from "./SiteBookingForm";

const API_BASE = (import.meta.env.VITE_API_BASE || "https://vagafogo-production.up.railway.app").replace(/\/+$/, "");
const STORAGE_KEY = "vagafogo_jatoba_site_chat_v1";
const STORAGE_TTL_MS = 2 * 60 * 60 * 1000;
const WELCOME = "Olá! Eu sou a Jatobá, atendente da Fazenda Vagafogo. 🌿\n\nAntes de começarmos, como posso chamar você?";
const OFFICIAL_CHECKOUT_HOSTS = new Set(["vagafogo.com.br", "www.vagafogo.com.br"]);

type ChatMedia = {
  type?: string;
  dataUrl?: string;
  pixPayload?: string;
  items?: Array<{ dataUrl?: string; titulo?: string; legenda?: string }>;
};

type ChatPhoto = { dataUrl: string; title: string; caption: string };
type PhotoPreviewState = { items: ChatPhoto[]; index: number };
type ViewportBounds = { mobile: boolean; height: number; top: number };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  media?: ChatMedia | null;
  additional?: string[];
  visibleAdditional?: number;
  createdAt: number;
  animate?: boolean;
};

type StoredChat = {
  expiresAt: number;
  sessionId: string;
  name: string;
  phone: string;
  messages: ChatMessage[];
  bookingUi?: BookingUi | null;
};

type SiteManualMessage = {
  id: string;
  from: "agent";
  text: string;
  ts: number;
};

const BOOKING_UI_STEPS = new Set<BookingUi["step"]>([
  "identity_name", "identity_phone", "phone", "experiences", "date",
  "participants", "contact", "summary", "payment", "availability",
]);

const safeBookingUi = (value: unknown): BookingUi | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<BookingUi>;
  if (!BOOKING_UI_STEPS.has(candidate.step as BookingUi["step"])) return null;
  return {
    ...candidate,
    step: candidate.step as BookingUi["step"],
    fields: Array.isArray(candidate.fields) ? candidate.fields.filter((field): field is string => typeof field === "string") : [],
    draft: candidate.draft && typeof candidate.draft === "object" && !Array.isArray(candidate.draft) ? candidate.draft : undefined,
  };
};

const createId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
const createSessionId = () => `site_${createId().replace(/[^A-Za-z0-9_-]/g, "")}`;
const readViewportBounds = (): ViewportBounds => ({
  mobile: window.innerWidth < 640,
  height: window.visualViewport?.height || window.innerHeight,
  top: window.visualViewport?.offsetTop || 0,
});

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  if (digits.startsWith("55")) return digits;
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
};

const safeStoredChat = (): StoredChat | null => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as StoredChat | null;
    const lastMessageAt = Math.max(0, ...(parsed?.messages || []).map((message) => Number(message.createdAt) || 0));
    const expiresAt = Math.min(Number(parsed?.expiresAt) || 0, lastMessageAt + STORAGE_TTL_MS);
    if (!parsed || expiresAt <= Date.now() || !String(parsed.sessionId).startsWith("site_")) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return {
      ...parsed,
      expiresAt,
      bookingUi: safeBookingUi(parsed.bookingUi),
      messages: Array.isArray(parsed.messages) ? parsed.messages.slice(-50).map((message) => ({ ...message, media: null, visibleAdditional: message.additional?.length || 0, animate: false })) : [],
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

const photosFromMedia = (media?: ChatMedia | null): ChatPhoto[] => {
  if (media?.type === "gallery") {
    return (media.items || [])
      .filter((item): item is { dataUrl: string; titulo?: string; legenda?: string } => Boolean(item.dataUrl))
      .map((item) => ({
        dataUrl: item.dataUrl,
        title: item.titulo || "Foto da Fazenda Vagafogo",
        caption: item.legenda || item.titulo || "",
      }));
  }
  if (media?.type === "image" && media.dataUrl) {
    return [{ dataUrl: media.dataUrl, title: "Foto da Fazenda Vagafogo", caption: "" }];
  }
  return [];
};

function PhotoArrow({ direction, onClick, label, className = "" }: {
  direction: "previous" | "next"; onClick: () => void; label: string; className?: string;
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/95 text-[#214f3e] shadow-md transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20745a] ${className}`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={direction === "previous" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} /></svg>
    </button>
  );
}

function PhotoCarousel({ items, onOpenPreview }: { items: ChatPhoto[]; onOpenPreview: (items: ChatPhoto[], index: number) => void }) {
  const [index, setIndex] = useState(0);
  const active = items[Math.min(index, items.length - 1)];
  if (!active) return null;
  const move = (direction: number) => setIndex((current) => (current + direction + items.length) % items.length);
  return (
    <div className="mt-3 min-w-0 overflow-hidden rounded-2xl border border-[#dfe8dc] bg-[#f7faf5]" aria-label="Fotos enviadas pela Jatobá">
      <div className="relative">
        <button type="button" onClick={() => onOpenPreview(items, index)} aria-label={`Ampliar ${active.title}`} className="block w-full overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#20745a]">
          <img src={active.dataUrl} alt={active.title} loading="lazy" className="h-48 w-full object-cover sm:h-56" />
        </button>
        {items.length > 1 && <>
          <PhotoArrow direction="previous" onClick={() => move(-1)} label="Foto anterior" className="absolute left-2 top-1/2 -translate-y-1/2" />
          <PhotoArrow direction="next" onClick={() => move(1)} label="Próxima foto" className="absolute right-2 top-1/2 -translate-y-1/2" />
        </>}
      </div>
      <div className="flex min-h-10 items-center justify-between gap-2 px-3 py-2 text-xs text-[#526457]">
        <span className="min-w-0 truncate">{active.caption || "Toque para ampliar"}</span>
        {items.length > 1 && <span className="shrink-0 font-semibold tabular-nums">{index + 1} / {items.length}</span>}
      </div>
    </div>
  );
}

function PhotoPreview({ preview, viewport, onChange, onClose }: {
  preview: PhotoPreviewState; viewport: ViewportBounds; onChange: (index: number) => void; onClose: () => void;
}) {
  const { items, index } = preview;
  const active = items[index];
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (items.length > 1 && event.key === "ArrowLeft") onChange((index - 1 + items.length) % items.length);
      if (items.length > 1 && event.key === "ArrowRight") onChange((index + 1) % items.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, items.length, onChange, onClose]);
  if (!active) return null;
  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-[#10251d]/95 text-white" style={viewport.mobile ? { top: viewport.top, bottom: "auto", height: viewport.height } : undefined} role="dialog" aria-modal="true" aria-label="Visualização das fotos da Fazenda Vagafogo">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0"><p className="truncate text-sm font-semibold">{active.title}</p>{items.length > 1 && <p className="text-xs text-white/65">{index + 1} de {items.length}</p>}</div>
        <button type="button" onClick={onClose} aria-label="Fechar foto ampliada" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 hover:bg-white/25"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-12 py-3 sm:px-20">
        <img src={active.dataUrl} alt={active.title} className="max-h-full max-w-full object-contain" />
        {items.length > 1 && <>
          <PhotoArrow direction="previous" onClick={() => onChange((index - 1 + items.length) % items.length)} label="Foto anterior" className="absolute left-2 top-1/2 -translate-y-1/2 sm:left-6" />
          <PhotoArrow direction="next" onClick={() => onChange((index + 1) % items.length)} label="Próxima foto" className="absolute right-2 top-1/2 -translate-y-1/2 sm:right-6" />
        </>}
      </div>
      {active.caption && <p className="max-h-[30%] shrink-0 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 text-center text-sm text-white/85 [overflow-wrap:anywhere] sm:px-6">{active.caption}</p>}
    </div>
  );
}

function MediaBlock({ media, onOpenPreview }: { media?: ChatMedia | null; onOpenPreview: (items: ChatPhoto[], index: number) => void }) {
  const [copied, setCopied] = useState(false);
  if (!media) return null;
  if (media.type === "gallery" || media.type === "image") return <PhotoCarousel items={photosFromMedia(media)} onOpenPreview={onOpenPreview} />;
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
  return null;
}

function SecureCheckoutModal({ url, viewport, onClose }: { url: string; viewport: ViewportBounds; onClose: () => void }) {
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
    <div className="fixed inset-0 z-[110] bg-[#13271f]/70 p-2 backdrop-blur-sm sm:p-5" style={viewport.mobile ? { top: viewport.top, bottom: "auto", height: viewport.height } : undefined} role="dialog" aria-modal="true" aria-label="Pagamento seguro da Fazenda Vagafogo">
      <section className="mx-auto flex h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[26px] bg-white shadow-2xl sm:h-[calc(100dvh-2.5rem)] sm:rounded-[30px]" style={viewport.mobile ? { height: Math.max(0, viewport.height - 16) } : undefined}>
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

export function SiteChatWidget() {
  const location = useLocation();
  const isBookingPage = /^\/reservar\/?$/i.test(location.pathname);
  const hidden = /^\/(admin|CRM|agente|login|formulario)(\/|$)/i.test(location.pathname)
    || new URLSearchParams(location.search).get("checkout_modal") === "1";
  const [redirectedPhone] = useState(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("origem") !== "whatsapp") return "";
    const normalized = normalizePhone(params.get("telefone") || "");
    return normalized.length >= 12 && normalized.length <= 13 ? normalized : "";
  });
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
  const [messages, setMessages] = useState<ChatMessage[]>(initial?.messages?.length ? initial.messages : [{ id: createId(), role: "assistant", content: WELCOME, createdAt: Date.now(), animate: true }]);
  const [bookingUi, setBookingUi] = useState<BookingUi | null>(
    !initial?.name ? { step: "identity_name" }
      : !initial?.phone ? { step: "identity_phone" }
        : initial.bookingUi || null,
  );
  const [sessionRegistered, setSessionRegistered] = useState(Boolean(initial?.messages?.some((message) => message.role === "user")));
  const [expiresAt, setExpiresAt] = useState(initial?.expiresAt || Date.now() + STORAGE_TTL_MS);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState<PhotoPreviewState | null>(null);
  const [humanMode, setHumanMode] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [viewport, setViewport] = useState<ViewportBounds>(readViewportBounds);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const bookingFormRef = useRef<HTMLDivElement>(null);
  const scrollModeRef = useRef<"bottom" | "latest" | "free">("bottom");
  const autoScrollingRef = useRef(false);
  const wasOpenRef = useRef(false);
  const lastPresentedMessageIdRef = useRef(messages.at(-1)?.id || "");
  const sendingRef = useRef(false);
  const manualCursorRef = useRef(0);
  const generationRef = useRef(0);

  const resetConversation = useCallback(() => {
    generationRef.current += 1;
    localStorage.removeItem(STORAGE_KEY);
    setSessionId(createSessionId());
    setName("");
    setPhone(redirectedPhone);
    setMessages([{ id: createId(), role: "assistant", content: WELCOME, createdAt: Date.now(), animate: true }]);
    setBookingUi({ step: "identity_name" });
    setSessionRegistered(false);
    setExpiresAt(Date.now() + STORAGE_TTL_MS);
    setDraft("");
    setLoading(false);
    setError("");
    setCheckoutUrl("");
    setPhotoPreview(null);
    setHumanMode(false);
    manualCursorRef.current = 0;
    sendingRef.current = false;
    scrollModeRef.current = "bottom";
    setShowNewMessages(false);
    setShowHistory(false);
    setExpandedMessageId("");
  }, [redirectedPhone]);

  useEffect(() => {
    const updateViewport = () => {
      const next = readViewportBounds();
      setViewport((current) => current.mobile === next.mobile && Math.abs(current.height - next.height) < 1 && Math.abs(current.top - next.top) < 1 ? current : next);
    };
    window.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
    };
  }, []);

  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener("vagafogo:open-chat", openChat);
    return () => window.removeEventListener("vagafogo:open-chat", openChat);
  }, []);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("atendimento") === "1") setOpen(true);
  }, [location.search]);

  useEffect(() => {
    if (!redirectedPhone) return;
    const cleanLocation = new URL(window.location.href);
    cleanLocation.searchParams.delete("telefone");
    window.history.replaceState(window.history.state, "", `${cleanLocation.pathname}${cleanLocation.search}${cleanLocation.hash}`);
  }, [redirectedPhone]);

  useEffect(() => {
    if (!open || !window.matchMedia("(max-width: 639px)").matches) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  useEffect(() => {
    const persistable = messages.slice(-50).map((message) => ({ ...message, media: undefined, visibleAdditional: undefined, animate: undefined }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      expiresAt,
      sessionId,
      name,
      phone,
      messages: persistable,
      bookingUi,
    } satisfies StoredChat));
  }, [bookingUi, expiresAt, messages, name, phone, sessionId]);

  useEffect(() => {
    const pending = messages.find((message) => message.animate && (message.visibleAdditional ?? message.additional?.length ?? 0) < (message.additional?.length || 0));
    if (!pending && !messages.some((message) => message.animate)) return;
    const timer = window.setTimeout(() => {
      if (pending) {
        setMessages((current) => current.map((message) => message.id === pending.id
          ? { ...message, visibleAdditional: Math.min((message.visibleAdditional || 0) + 1, message.additional?.length || 0) }
          : message));
      } else {
        setMessages((current) => current.map((message) => message.animate ? { ...message, animate: false } : message));
      }
    }, pending ? 460 : 380);
    return () => window.clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setTimeout(resetConversation, Math.max(0, expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [expiresAt, resetConversation]);

  const scrollToLatest = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const latest = latestMessageRef.current;
    const form = bookingFormRef.current;
    const bottom = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    let target = bottom;
    let mode: "bottom" | "latest" = "bottom";
    if (latest && !loading && messages.at(-1)?.role === "assistant") {
      const scrollerRect = scroller.getBoundingClientRect();
      const latestRect = latest.getBoundingClientRect();
      const lastRect = form?.getBoundingClientRect() || latestRect;
      if (lastRect.bottom - latestRect.top > scroller.clientHeight - 16) {
        target = Math.max(0, Math.min(bottom, scroller.scrollTop + latestRect.top - scrollerRect.top - 8));
        mode = "latest";
      }
    }
    autoScrollingRef.current = true;
    scroller.scrollTop = target;
    scrollModeRef.current = mode;
    setShowNewMessages(false);
    requestAnimationFrame(() => requestAnimationFrame(() => { autoScrollingRef.current = false; }));
  }, [loading, messages]);

  useLayoutEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open) return;
    if (justOpened) scrollModeRef.current = "bottom";
    const newest = messages.at(-1);
    const hasNewMessage = newest?.id !== lastPresentedMessageIdRef.current;
    lastPresentedMessageIdRef.current = newest?.id || "";
    if (scrollModeRef.current === "free") {
      if (hasNewMessage && newest?.role === "assistant") setShowNewMessages(true);
      return;
    }
    const frame = requestAnimationFrame(scrollToLatest);
    return () => cancelAnimationFrame(frame);
  }, [bookingUi, fullScreen, loading, messages, open, scrollToLatest, viewport.height, viewport.top]);

  useLayoutEffect(() => {
    if (!open || !showHistory || !bookingUi || !scrollRef.current) return;
    scrollModeRef.current = "free";
    scrollRef.current.scrollTop = 0;
  }, [bookingUi, open, showHistory]);

  useEffect(() => {
    if (!open || !scrollContentRef.current || !scrollRef.current || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (scrollModeRef.current !== "free") scrollToLatest();
    });
    observer.observe(scrollContentRef.current);
    observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, [open, scrollToLatest]);

  useLayoutEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    composer.style.height = "auto";
    composer.style.height = `${Math.min(composer.scrollHeight, Math.max(40, Math.min(112, viewport.height * 0.25)))}px`;
  }, [draft, open, viewport.height]);

  useEffect(() => {
    if (!sessionRegistered || !sessionId) return;
    let disposed = false;
    const generation = generationRef.current;
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
        if (response.status === 410 && !disposed && generation === generationRef.current) {
          resetConversation();
          return;
        }
        if (!response.ok || disposed || generation !== generationRef.current) return;
        const result = await response.json() as { mode?: string; messages?: SiteManualMessage[] };
        if (disposed || generation !== generationRef.current) return;
        setHumanMode(result.mode === "human");
        if (result.mode === "human" || result.mode === "blocked") setBookingUi(null);
        const incoming = Array.isArray(result.messages) ? result.messages : [];
        if (!incoming.length) return;
        manualCursorRef.current = Math.max(manualCursorRef.current, ...incoming.map((message) => Number(message.ts) || 0));
        if (incoming.some((message) => message.from === "agent")) setExpiresAt(Date.now() + STORAGE_TTL_MS);
        setMessages((current) => {
          const ids = new Set(current.map((message) => message.id));
          const additions = incoming
            .filter((message) => message.from === "agent" && message.text && !ids.has(message.id))
            .map((message): ChatMessage => ({
              id: message.id,
              role: "assistant",
              content: message.text,
              createdAt: Number(message.ts) || Date.now(),
              animate: true,
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
  }, [phone, resetConversation, sessionId, sessionRegistered]);

  const send = async (override?: string, submittedPhone?: string, selection?: SiteBookingSelection): Promise<boolean> => {
    const content = (override ?? draft).trim();
    if (!content || loading || sendingRef.current) return false;
    const answeringPhone = !phone && (bookingUi?.step === "phone" || bookingUi?.step === "identity_phone");
    const answerPhone = answeringPhone ? normalizePhone(submittedPhone || content) : "";
    if (answeringPhone && (answerPhone.length < 12 || answerPhone.length > 13)) {
      setError("Informe um WhatsApp válido com DDD.");
      return false;
    }
    const requestPhone = answerPhone || phone;
    const answerName = bookingUi?.step === "identity_name"
      ? (content.match(/^Meu nome é\s+(.+?)\.?$/i)?.[1] || content).trim().replace(/\.$/, "")
      : bookingUi?.step === "contact" && bookingUi.fields?.includes("nome")
        ? content.match(/Nome completo:\s*([^.]*)/i)?.[1]?.trim() || ""
        : "";
    const generation = generationRef.current;
    sendingRef.current = true;
    scrollModeRef.current = "bottom";
    setShowNewMessages(false);
    setShowHistory(false);
    setExpandedMessageId("");
    const history = messages.map((message) => ({ role: message.role, content: message.content })).slice(-50);
    const userMessage: ChatMessage = { id: createId(), role: "user", content, createdAt: Date.now(), animate: true };
    setMessages((current) => [...current.map((message) => message.visibleAdditional !== undefined && message.visibleAdditional < (message.additional?.length || 0)
      ? { ...message, visibleAdditional: message.additional?.length || 0, animate: false }
      : message), userMessage]);
    setExpiresAt(Date.now() + STORAGE_TTL_MS);
    if (!override) setDraft("");
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/atendimento/site/mensagem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagem: content, nome: answerName || name.trim(), telefone: requestPhone, sessionId, messageId: userMessage.id, historico: history, ...(selection ? { respostaInterativa: selection } : {}) }),
      });
      if (generation !== generationRef.current) return false;
      if (response.status === 410) {
        resetConversation();
        setError("O atendimento anterior expirou após 2 horas. Vamos começar novamente por aqui.");
        return false;
      }
      if (response.ok) {
        setSessionRegistered(true);
        if (answerPhone) setPhone(answerPhone);
      }
      const result = await response.json().catch(() => ({}));
      if (generation !== generationRef.current) return false;
      if (!response.ok || (!result.resposta && !result.atendimento_humano)) throw new Error(result.mensagem || "Não foi possível responder agora.");
      if (answerName && result.booking_ui?.step !== "identity_name") setName(answerName);
      if (result.session_id) setSessionId(String(result.session_id));
      setHumanMode(result.atendimento_humano === true);
      setBookingUi(result.atendimento_humano ? null : safeBookingUi(result.booking_ui));
      if (result.resposta) {
        const assistantMessage: ChatMessage = {
          id: createId(),
          role: "assistant",
          content: String(result.resposta),
          media: result.media || null,
          additional: Array.isArray(result.mensagens_adicionais) ? result.mensagens_adicionais : [],
          visibleAdditional: 0,
          createdAt: Date.now(),
          animate: true,
        };
        setMessages((current) => [...current, assistantMessage]);
        setExpiresAt(Date.now() + STORAGE_TTL_MS);
        const checkout = [assistantMessage.content, ...(assistantMessage.additional || [])]
          .map(extractOfficialCardCheckout)
          .find(Boolean);
        if (checkout) setCheckoutUrl(checkout);
      }
      return result.atendimento_humano !== true;
    } catch (cause) {
      if (generation !== generationRef.current) return false;
      setMessages((current) => current.filter((message) => message.id !== userMessage.id));
      setDraft(content);
      setError(cause instanceof Error ? cause.message : "Não foi possível responder agora. Tente novamente.");
      return false;
    } finally {
      if (generation === generationRef.current) {
        sendingRef.current = false;
        setLoading(false);
      }
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  const focusedHistory = Boolean(bookingUi && !humanMode && !showHistory && messages.length > 1);
  const visibleMessages = focusedHistory ? messages.slice(-1) : messages;
  const olderMessageCount = bookingUi && !humanMode ? Math.max(0, messages.length - 1) : 0;
  const isCompactReply = (message: ChatMessage) => message.role === "assistant"
    && message.id === messages.at(-1)?.id
    && Boolean(bookingUi && ["phone", "experiences", "date", "participants"].includes(bookingUi.step))
    && message.content.length > 420
    && !extractOfficialCardCheckout(message.content);

  if (hidden) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[80] sm:bottom-6 sm:right-6">
        {open && (
          <section
            aria-label="Atendimento com a Jatobá"
            className={`flex flex-col overflow-hidden border border-[#dfe7d9] bg-[#f8faf5] shadow-2xl ${fullScreen ? "fixed inset-0 h-[100dvh] w-screen rounded-none sm:inset-4 sm:h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)] sm:rounded-[28px]" : "fixed bottom-2 left-2 right-2 h-[calc(100dvh-1rem)] rounded-[26px] sm:absolute sm:inset-auto sm:bottom-20 sm:right-0 sm:h-[min(720px,calc(100dvh-7rem))] sm:w-[460px] sm:max-w-[calc(100vw-2rem)] sm:rounded-[28px]"}`}
            style={viewport.mobile ? { top: viewport.top + (fullScreen ? 0 : 8), bottom: "auto", height: Math.max(0, viewport.height - (fullScreen ? 0 : 16)) } : undefined}
          >
            <header className="flex shrink-0 items-center gap-1.5 bg-[#214f3e] px-2.5 py-2.5 text-white sm:gap-3 sm:px-4 sm:py-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-white/30 bg-[#f4eddd] sm:h-11 sm:w-11">
                <img src={jatobaIcon} alt="Ícone da Jatobá" className="h-full w-full object-contain p-0.5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg leading-tight">Jatobá</h2>
                <p className="text-[10px] leading-tight text-white/80 sm:text-xs">Atendimento da Fazenda Vagafogo</p>
              </div>
              <button type="button" onClick={() => { if (window.confirm("Reiniciar o atendimento? A conversa exibida neste aparelho será limpa e você começará do início.")) resetConversation(); }} aria-label="Reiniciar atendimento" title="Reiniciar atendimento" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-white/10 sm:h-10 sm:w-10">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 11a9 9 0 1 1 2.5 6.2M3 4v7h7" /></svg>
              </button>
              <button type="button" onClick={() => setFullScreen((value) => !value)} aria-label={fullScreen ? "Reduzir atendimento" : "Abrir atendimento em tela cheia"} aria-pressed={fullScreen} title={fullScreen ? "Reduzir" : "Tela cheia"} className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-white/10 sm:h-10 sm:w-10">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d={fullScreen ? "M8 3v5H3m13-5v5h5M3 16h5v5m13-5h-5v5" : "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"} /></svg>
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar atendimento" className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-white/10 sm:h-10 sm:w-10">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </header>

            <>
                <div className="relative flex min-h-0 flex-1 flex-col">
                  <div ref={scrollRef} onScroll={(event) => { if (autoScrollingRef.current) return; const node = event.currentTarget; const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 80; scrollModeRef.current = nearBottom ? "bottom" : "free"; if (nearBottom) setShowNewMessages(false); }} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
                  <div ref={scrollContentRef} className="space-y-3">
                  {olderMessageCount > 0 && <button type="button" aria-expanded={showHistory} onClick={() => { setShowHistory((value) => !value); if (showHistory) { scrollModeRef.current = "bottom"; requestAnimationFrame(scrollToLatest); } }} className="mx-auto flex items-center gap-2 rounded-full border border-[#dbe6d8] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#4b6d58] shadow-sm transition hover:border-[#a8c8ac] hover:bg-[#f1f7ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20745a]">
                    <span aria-hidden="true">{showHistory ? "⌃" : "⌄"}</span>{showHistory ? "Ocultar conversa anterior" : `Ver conversa anterior (${olderMessageCount})`}
                  </button>}
                  {visibleMessages.map((message, index) => (
                    <Fragment key={message.id}>
                    <div ref={index === visibleMessages.length - 1 && !(message.visibleAdditional ?? message.additional?.length) ? latestMessageRef : undefined} className={`flex min-w-0 items-end gap-2 ${message.role === "user" ? "justify-end" : "justify-start"} ${message.animate ? "site-chat-message-pop" : ""}`}>
                      {message.role === "assistant" && (
                        <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f4eddd]">
                          <img src={jatobaIcon} alt="" className="h-full w-full object-contain p-0.5" />
                        </span>
                      )}
                      <div className={`min-w-0 max-w-[calc(100%-2.25rem)] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm [overflow-wrap:anywhere] sm:max-w-[min(88%,720px)] ${message.role === "user" ? "rounded-br-md bg-[#8b4f23] text-white" : "rounded-bl-md border border-[#e4eadf] bg-white text-[#2d382f]"}`}>
                        <p className={`whitespace-pre-wrap ${isCompactReply(message) && expandedMessageId !== message.id ? "line-clamp-2" : ""}`}><RichText onOpenCheckout={setCheckoutUrl}>{message.content}</RichText></p>
                        {isCompactReply(message) && <button type="button" aria-expanded={expandedMessageId === message.id} onClick={() => setExpandedMessageId((current) => current === message.id ? "" : message.id)} className="mt-2 rounded-full border border-[#d7e6d5] bg-[#f5faf2] px-2.5 py-1 text-[11px] font-semibold text-[#277052] transition hover:bg-[#eaf5e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#20745a]">{expandedMessageId === message.id ? "Mostrar menos" : "Ler resposta completa"}</button>}
                        <MediaBlock media={message.media} onOpenPreview={(items, index) => setPhotoPreview({ items, index })} />
                      </div>
                    </div>
                    {message.additional?.slice(0, message.visibleAdditional ?? message.additional.length).map((extra, extraIndex) => (
                      <div key={`${message.id}:extra:${extraIndex}`} ref={index === visibleMessages.length - 1 && extraIndex === (message.visibleAdditional ?? message.additional?.length ?? 0) - 1 ? latestMessageRef : undefined} className={`ml-9 flex min-w-0 justify-start ${message.animate ? "site-chat-message-pop" : ""}`}>
                        <div className="min-w-0 max-w-full rounded-2xl rounded-bl-md border border-[#e4eadf] bg-white px-3.5 py-2.5 text-sm leading-relaxed text-[#2d382f] shadow-sm [overflow-wrap:anywhere] sm:max-w-[min(88%,720px)]">
                          <p className="whitespace-pre-wrap"><RichText onOpenCheckout={setCheckoutUrl}>{extra}</RichText></p>
                        </div>
                      </div>
                    ))}
                    </Fragment>
                  ))}
                  {messages.length === 1 && messages[0].role === "assistant" && !loading && !bookingUi && (
                    <div className="ml-9 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void send("Quero consultar uma reserva que já fiz") } className="rounded-full border border-[#bfd6c8] bg-white px-3.5 py-2 text-xs font-semibold text-[#215a43] shadow-sm hover:bg-[#eef6f0]">
                        Consultar minha reserva
                      </button>
                    </div>
                  )}
                  {loading && (
                    <div className="flex items-end gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f4eddd]"><img src={jatobaIcon} alt="" className="h-full w-full object-contain p-0.5" /></span>
                      <div role="status" className="flex items-end rounded-2xl rounded-bl-md border border-[#e4eadf] bg-white px-4 py-3 text-sm text-[#607064]">
                        <span>Jatobá está escrevendo</span>
                        <span aria-hidden="true" className="ml-1 inline-flex items-end">
                          {[0, 1, 2].map((index) => <span key={index} className="inline-block motion-safe:animate-bounce motion-reduce:animate-none" style={{ animationDelay: `${index * 160}ms`, animationDuration: "900ms" }}>.</span>)}
                        </span>
                      </div>
                    </div>
                  )}
                  {!loading && !humanMode && bookingUi && !messages.at(-1)?.animate && <div ref={bookingFormRef} className="ml-9 w-[calc(100%-2.25rem)] max-w-[720px] site-chat-message-pop"><SiteBookingForm key={`${messages.at(-1)?.id || sessionId}:${bookingUi.step}`} ui={bookingUi} sending={loading} onAnswer={send} /></div>}
                  </div>
                  </div>
                  {showNewMessages && <button type="button" onClick={scrollToLatest} className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#214f3e] px-4 py-2 text-xs font-semibold text-white shadow-lg">Ver nova resposta ↓</button>}
                </div>
                <div className="shrink-0 border-t border-[#e0e7dc] bg-white p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
                  {humanMode && <div className="mb-2 rounded-xl bg-[#eef6f1] px-3 py-2 text-xs text-[#315c49]">Um atendente da Fazenda está acompanhando esta conversa.</div>}
                  {error && <div className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error} Sua mensagem continua no campo para tentar novamente.</div>}
                  <div className="flex items-end gap-2 rounded-2xl border border-[#d5ded0] bg-[#f8faf5] p-2 focus-within:border-[#4d856b]">
                    <textarea ref={composerRef} value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 4096))} onKeyDown={onKeyDown} disabled={loading} rows={1} placeholder="Digite sua mensagem…" className="max-h-28 min-h-10 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2 text-sm outline-none" />
                    <button type="button" onClick={() => void send()} disabled={loading || !draft.trim()} aria-label="Enviar mensagem" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#20745a] text-white disabled:cursor-not-allowed disabled:opacity-40">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                    </button>
                  </div>
                </div>
            </>
          </section>
        )}

        {!open && !isBookingPage && (
          <button type="button" onClick={() => setOpen(true)} aria-label="Abrir atendimento com a Jatobá" className="group flex items-center gap-3">
            <span className="rounded-full bg-[#263d31] px-4 py-2 text-sm font-semibold text-white shadow-lg">Fale Conosco</span>
            <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border-2 border-white bg-[#f4eddd] shadow-xl shadow-[#214f3e]/30 transition-transform group-hover:scale-105">
              <img src={jatobaIcon} alt="" className="h-full w-full object-contain p-1" />
            </span>
          </button>
        )}
      </div>

      {checkoutUrl && <SecureCheckoutModal url={checkoutUrl} viewport={viewport} onClose={() => setCheckoutUrl("")} />}
      {photoPreview && <PhotoPreview preview={photoPreview} viewport={viewport} onChange={(index) => setPhotoPreview((current) => current ? { ...current, index } : null)} onClose={() => setPhotoPreview(null)} />}
    </>
  );
}
