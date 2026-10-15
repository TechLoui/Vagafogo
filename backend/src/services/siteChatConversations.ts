import { randomUUID } from "crypto";
import { obterFirestoreAdmin } from "./firebaseAdmin";

const COLLECTION = process.env.SITE_CHAT_CONVERSATIONS_COLLECTION?.trim() || "crm_agent_site_conversations";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_MESSAGES = 120;

export type SiteConversationMode = "bot" | "human" | "blocked";
export type SiteConversationSender = "client" | "bot" | "agent";

export type SiteConversationMessage = {
  id: string;
  sourceId?: string;
  from: SiteConversationSender;
  text: string;
  ts: number;
  mediaType?: string;
};

type SiteConversation = {
  id: string;
  jid: string;
  sessionId: string;
  channel: "site";
  name: string;
  phone: string;
  mode: SiteConversationMode;
  status: SiteConversationMode;
  unread: number;
  messages: SiteConversationMessage[];
  lastMessage: string;
  lastMessageAt: number;
  lastFrom: SiteConversationSender;
  blockReason: string | null;
  controlUpdatedAt: number | null;
  updatedBy: string | null;
  handoffPending: boolean;
  handoffRequestedAt: number | null;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

const conversations = new Map<string, SiteConversation>();
const mutationLocks = new Map<string, Promise<void>>();
let hydrationPromise: Promise<void> | null = null;
let lastPersistentCleanupAt = 0;

const normalizeTimestamp = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === "object" && "toMillis" in value && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return (value as { toMillis: () => number }).toMillis();
  }
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeMessage = (value: unknown): SiteConversationMessage | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const from = String(raw.from ?? "");
  const text = String(raw.text ?? "").trim().slice(0, 12_000);
  if (!text || !["client", "bot", "agent"].includes(from)) return null;
  return {
    id: String(raw.id ?? randomUUID()).slice(0, 200),
    sourceId: raw.sourceId ? String(raw.sourceId).slice(0, 200) : undefined,
    from: from as SiteConversationSender,
    text,
    ts: normalizeTimestamp(raw.ts, Date.now()),
    mediaType: raw.mediaType ? String(raw.mediaType).slice(0, 80) : undefined,
  };
};

const normalizeConversation = (id: string, value: Record<string, unknown>): SiteConversation | null => {
  const sessionId = String(value.sessionId ?? id).trim();
  if (!/^site_[A-Za-z0-9_-]{12,110}$/.test(sessionId)) return null;
  const messages = (Array.isArray(value.messages) ? value.messages : [])
    .map(normalizeMessage)
    .filter((item): item is SiteConversationMessage => Boolean(item))
    .slice(-MAX_MESSAGES);
  const last = messages.length ? messages[messages.length - 1] : undefined;
  const modeValue = String(value.mode ?? value.status ?? "bot");
  const mode: SiteConversationMode = ["bot", "human", "blocked"].includes(modeValue)
    ? modeValue as SiteConversationMode
    : "bot";
  const now = Date.now();
  return {
    id: sessionId,
    jid: `site:${sessionId}`,
    sessionId,
    channel: "site",
    name: String(value.name ?? "").trim().slice(0, 120),
    phone: String(value.phone ?? "").replace(/\D/g, "").slice(0, 15),
    mode,
    status: mode,
    unread: Math.max(0, Math.floor(Number(value.unread) || 0)),
    messages,
    lastMessage: String(value.lastMessage ?? last?.text ?? "").slice(0, 12_000),
    lastMessageAt: normalizeTimestamp(value.lastMessageAt, last?.ts ?? now),
    lastFrom: (["client", "bot", "agent"].includes(String(value.lastFrom))
      ? String(value.lastFrom)
      : last?.from ?? "client") as SiteConversationSender,
    blockReason: value.blockReason ? String(value.blockReason).slice(0, 250) : null,
    controlUpdatedAt: value.controlUpdatedAt ? normalizeTimestamp(value.controlUpdatedAt) : null,
    updatedBy: value.updatedBy ? String(value.updatedBy).slice(0, 200) : null,
    handoffPending: mode === "human" && String(value.updatedBy ?? "") === "jatoba",
    handoffRequestedAt: mode === "human" && String(value.updatedBy ?? "") === "jatoba"
      ? normalizeTimestamp(value.controlUpdatedAt, now)
      : null,
    createdAt: normalizeTimestamp(value.createdAt, now),
    updatedAt: normalizeTimestamp(value.updatedAt, last?.ts ?? now),
    expiresAt: normalizeTimestamp(value.expiresAt, now + TTL_MS),
  };
};

const serializeConversation = (conversation: SiteConversation) => ({
  ...conversation,
  createdAt: new Date(conversation.createdAt),
  updatedAt: new Date(conversation.updatedAt),
  expiresAt: new Date(conversation.expiresAt),
  lastMessageAt: new Date(conversation.lastMessageAt),
  controlUpdatedAt: conversation.controlUpdatedAt ? new Date(conversation.controlUpdatedAt) : null,
});

const hydrate = async () => {
  if (hydrationPromise) return hydrationPromise;
  hydrationPromise = (async () => {
    const firestore = obterFirestoreAdmin();
    if (!firestore) return;
    try {
      const snapshot = await firestore.collection(COLLECTION).where("expiresAt", ">", new Date()).get();
      snapshot.docs.forEach((document) => {
        const conversation = normalizeConversation(document.id, document.data() as Record<string, unknown>);
        if (conversation) conversations.set(conversation.sessionId, conversation);
      });
    } catch (error) {
      console.error("[site-chat] Nao foi possivel restaurar as conversas do site:", error);
    }
  })();
  return hydrationPromise;
};

const persist = async (conversation: SiteConversation) => {
  const firestore = obterFirestoreAdmin();
  if (!firestore) return;
  try {
    await firestore.collection(COLLECTION).doc(conversation.sessionId).set(serializeConversation(conversation));
  } catch (error) {
    console.error("[site-chat] Nao foi possivel persistir a conversa:", error);
  }
};

const removeExpired = async () => {
  const now = Date.now();
  const expired = Array.from(conversations.values()).filter((item) => item.expiresAt <= now);
  expired.forEach((item) => conversations.delete(item.sessionId));
  const firestore = obterFirestoreAdmin();
  if (!firestore) return;
  if (expired.length) {
    await Promise.all(expired.map((item) => firestore.collection(COLLECTION).doc(item.sessionId).delete().catch(() => undefined)));
  }
  if (now - lastPersistentCleanupAt < 60 * 60 * 1000) return;
  lastPersistentCleanupAt = now;
  try {
    const snapshot = await firestore.collection(COLLECTION).where("expiresAt", "<=", new Date(now)).limit(200).get();
    if (!snapshot.empty) {
      const batch = firestore.batch();
      snapshot.docs.forEach((document) => batch.delete(document.ref));
      await batch.commit();
    }
  } catch (error) {
    console.error("[site-chat] Nao foi possivel limpar conversas expiradas:", error);
  }
};

const mutate = async <T>(sessionId: string, operation: () => Promise<T>): Promise<T> => {
  const prior = mutationLocks.get(sessionId) ?? Promise.resolve();
  let result!: T;
  const next = prior.catch(() => undefined).then(async () => { result = await operation(); });
  mutationLocks.set(sessionId, next);
  try {
    await next;
    return result;
  } finally {
    if (mutationLocks.get(sessionId) === next) mutationLocks.delete(sessionId);
  }
};

export const isSiteConversationJid = (value: unknown) => /^site:site_[A-Za-z0-9_-]{12,110}$/.test(String(value ?? ""));

export const siteSessionIdFromJid = (value: unknown) => {
  const jid = String(value ?? "");
  return isSiteConversationJid(jid) ? jid.slice(5) : "";
};

export const registrarMensagemConversaSite = async (sessionId: string, input: {
  from: SiteConversationSender;
  text: string;
  sourceId?: string;
  name?: string;
  phone?: string;
  mediaType?: string;
  incrementUnread?: boolean;
}) => mutate(sessionId, async () => {
  await hydrate();
  const now = Date.now();
  const text = String(input.text ?? "").trim().slice(0, 12_000);
  if (!text) throw new Error("SITE_CHAT_MESSAGE_EMPTY");
  const sourceId = String(input.sourceId ?? "").trim().slice(0, 200);
  let conversation: SiteConversation | null | undefined = conversations.get(sessionId);
  if (!conversation) {
    conversation = normalizeConversation(sessionId, {
      sessionId,
      name: input.name,
      phone: input.phone,
      messages: [],
      createdAt: now,
      updatedAt: now,
      expiresAt: now + TTL_MS,
    });
  }
  if (!conversation) throw new Error("SITE_CHAT_SESSION_INVALID");
  const duplicate = sourceId && conversation.messages.find((message) => message.sourceId === sourceId);
  if (duplicate) return { conversation, message: duplicate, duplicated: true };

  const message: SiteConversationMessage = {
    id: sourceId || randomUUID(),
    sourceId: sourceId || undefined,
    from: input.from,
    text,
    ts: now,
    mediaType: input.mediaType ? String(input.mediaType).slice(0, 80) : undefined,
  };
  conversation.name = String(input.name ?? conversation.name).trim().slice(0, 120);
  conversation.phone = String(input.phone ?? conversation.phone).replace(/\D/g, "").slice(0, 15);
  conversation.messages = [...conversation.messages, message].slice(-MAX_MESSAGES);
  conversation.lastMessage = message.text;
  conversation.lastMessageAt = message.ts;
  conversation.lastFrom = message.from;
  conversation.updatedAt = now;
  conversation.expiresAt = now + TTL_MS;
  if (input.incrementUnread) conversation.unread += 1;
  conversations.set(sessionId, conversation);
  await persist(conversation);
  return { conversation, message, duplicated: false };
});

export const obterConversaSite = async (sessionId: string) => {
  await hydrate();
  await removeExpired();
  return conversations.get(sessionId) ?? null;
};

export const listarConversasSite = async () => {
  await hydrate();
  await removeExpired();
  return Array.from(conversations.values())
    .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
    .map(({ messages: _messages, ...conversation }) => ({ ...conversation }));
};

export const listarMensagensConversaSite = async (sessionId: string, after = 0, onlyAgent = false) => {
  const conversation = await obterConversaSite(sessionId);
  if (!conversation) return [];
  return conversation.messages.filter((message) => message.ts > after && (!onlyAgent || message.from === "agent"));
};

export const marcarConversaSiteLida = async (sessionId: string) => mutate(sessionId, async () => {
  await hydrate();
  const conversation = conversations.get(sessionId);
  if (!conversation || conversation.unread === 0) return conversation ?? null;
  conversation.unread = 0;
  conversation.updatedAt = Date.now();
  conversations.set(sessionId, conversation);
  await persist(conversation);
  return conversation;
});

export const alterarModoConversaSite = async (sessionId: string, input: {
  mode: SiteConversationMode;
  reason?: string;
  updatedBy?: string;
}) => mutate(sessionId, async () => {
  await hydrate();
  const conversation = conversations.get(sessionId);
  if (!conversation) throw new Error("SITE_CHAT_SESSION_NOT_FOUND");
  const now = Date.now();
  conversation.mode = input.mode;
  conversation.status = input.mode;
  conversation.blockReason = input.mode === "blocked" ? String(input.reason ?? "").trim().slice(0, 250) || null : null;
  conversation.updatedBy = String(input.updatedBy ?? "").trim().slice(0, 200) || null;
  conversation.controlUpdatedAt = now;
  conversation.handoffPending = input.mode === "human" && conversation.updatedBy === "jatoba";
  conversation.handoffRequestedAt = conversation.handoffPending ? now : null;
  conversation.updatedAt = now;
  conversation.expiresAt = now + TTL_MS;
  conversations.set(sessionId, conversation);
  await persist(conversation);
  return conversation;
});

export const removerConversaSite = async (sessionId: string) => mutate(sessionId, async () => {
  await hydrate();
  const existed = conversations.delete(sessionId);
  const firestore = obterFirestoreAdmin();
  if (firestore) await firestore.collection(COLLECTION).doc(sessionId).delete().catch((error) => {
    console.error("[site-chat] Nao foi possivel excluir a conversa:", error);
  });
  return existed;
});
