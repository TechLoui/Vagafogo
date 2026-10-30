import { createHash, randomUUID } from "crypto";
import { obterFirestoreAdmin } from "./firebaseAdmin";
import { requestAgentService } from "./agentGateway";

export const SITE_WHATSAPP_DISPATCH_COLLECTION = "crm_agent_site_whatsapp_dispatches";
const TTL = 7 * 24 * 60 * 60_000;
const LEASE = 60_000;
const SESSION = /^site_[A-Za-z0-9_-]{12,110}$/;
type Data = Record<string, any>;
type Dependencies = {
  db?: FirebaseFirestore.Firestore | null;
  now?: () => number;
  receipt?: (requestId: string) => Promise<{ status: string; messageId?: unknown; jid?: unknown; sentAt?: unknown }>;
};
export type SiteDispatchIntent = {
  siteSessionIds?: string[];
  requestId: string;
  phone: string;
  text: string;
  dispatchKind?: string;
};
export type SiteDispatchResult = { enviado: boolean; motivo?: unknown; messageId?: unknown; jid?: unknown };
export type SiteDispatchDisplayMessage = {
  id: string; sourceId: string; from: "bot"; text: string; ts: number;
  channel: "whatsapp_dispatch"; dispatchStatus: "pending" | "sent" | "failed";
  recipientLabel: string; phone: string; requestId: string; messageId: string | null;
};
const text = (value: unknown, max = 200) => String(value ?? "").trim().slice(0, max);
const milliseconds = (value: any): number => value?.toMillis ? value.toMillis()
  : value instanceof Date ? value.getTime() : typeof value === "number" ? value
    : typeof value === "string" ? Date.parse(value) || 0 : 0;
const database = (deps: Dependencies) => {
  const db = deps.db === undefined ? obterFirestoreAdmin() : deps.db;
  if (!db) throw new Error("SITE_DISPATCH_STORAGE_UNAVAILABLE");
  return db;
};
export const validarSessoesDisparoSite = (values?: string[]): string[] => {
  if (values === undefined) return [];
  if (!Array.isArray(values) || values.length > 20 || values.some((value) => typeof value !== "string" || !SESSION.test(value))) {
    throw new Error("SITE_DISPATCH_SESSION_INVALID");
  }
  return [...new Set(values)];
};
const identity = (sessionId: string, requestId: string) => createHash("sha256").update(`${sessionId}\0${requestId}`).digest("hex");
const recipient = (kind: string) => ["remarcacao_autorizacao", "alerta_atendimento_humano"].includes(kind) ? "Uirá" : "Cliente";

/** Separate admin-only ledger. Never writes visitor messages, leads or controls. */
export const registrarIntencaoDisparoSite = async (input: SiteDispatchIntent, deps: Dependencies = {}): Promise<string[]> => {
  const sessions = validarSessoesDisparoSite(input.siteSessionIds);
  if (!sessions.length) return [];
  const requestId = text(input.requestId, 160);
  const phone = text(input.phone, 20).replace(/\D/g, "");
  const body = text(input.text, 4096);
  if (!requestId || !/^55\d{10,11}$/.test(phone) || !body) throw new Error("SITE_DISPATCH_INPUT_INVALID");
  const kind = text(input.dispatchKind || "transacional", 80);
  const db = database(deps);
  const now = (deps.now || Date.now)();
  const refs = sessions.map((sessionId) => db.collection(SITE_WHATSAPP_DISPATCH_COLLECTION).doc(identity(sessionId, requestId)));
  await db.runTransaction(async (transaction) => {
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
    snapshots.forEach((snapshot, index) => {
      const previous = snapshot.data();
      if (previous && (previous.requestId !== requestId || previous.sessionId !== sessions[index]
        || previous.phone !== phone || previous.text !== body || previous.dispatchKind !== kind)) {
        throw new Error("SITE_DISPATCH_IDEMPOTENCY_CONFLICT");
      }
      if (previous?.status === "sent") return;
      transaction.set(refs[index], {
        sessionId: sessions[index], requestId, phone, text: body, dispatchKind: kind, recipientLabel: recipient(kind),
        status: "pending", messageId: null, jid: null, lastError: null,
        createdAt: previous?.createdAt || new Date(now), updatedAt: new Date(now),
        expiresAt: previous?.expiresAt || new Date(now + TTL), sentAt: null,
        reconcileAttempts: Number(previous?.reconcileAttempts) || 0, nextReconcileAt: now + 30_000,
      }, { merge: true });
    });
  });
  return refs.map((ref) => ref.id);
};

export const concluirDisparoSite = async (ids: string[], result: SiteDispatchResult, deps: Dependencies = {}) => {
  if (!ids.length) return;
  const db = database(deps);
  const now = (deps.now || Date.now)();
  const refs = ids.map((id) => db.collection(SITE_WHATSAPP_DISPATCH_COLLECTION).doc(id));
  await db.runTransaction(async (transaction) => {
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
    snapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) throw new Error("SITE_DISPATCH_INTENT_NOT_FOUND");
      if (snapshot.data()?.status === "sent") return;
      transaction.set(refs[index], {
        status: result.enviado ? "sent" : "failed", updatedAt: new Date(now),
        sentAt: result.enviado ? new Date(now) : null,
        messageId: result.enviado ? text(result.messageId) || null : null,
        jid: result.enviado ? text(result.jid) || null : null,
        lastError: result.enviado ? null : text(result.motivo || "envio_nao_confirmado"),
        nextReconcileAt: 0,
      }, { merge: true });
    });
  });
};

/** Trusted legacy receipt only. Backfills the ledger and NEVER calls the gateway. */
export const registrarDisparoConfirmadoSite = async (input: SiteDispatchIntent & {
  sentAt: unknown; messageId?: unknown; jid?: unknown;
}, deps: Dependencies = {}) => {
  const sentAt = milliseconds(input.sentAt);
  const now = (deps.now || Date.now)();
  if (!sentAt || sentAt > now + 60_000) throw new Error("SITE_DISPATCH_RECEIPT_INVALID");
  if (sentAt <= now - TTL) return [];
  const historical = { ...deps, now: () => sentAt };
  const ids = await registrarIntencaoDisparoSite(input, historical);
  await concluirDisparoSite(ids, { enviado: true, messageId: input.messageId, jid: input.jid }, historical);
  return ids;
};

const display = (id: string, value: Data): SiteDispatchDisplayMessage => {
  const status: SiteDispatchDisplayMessage["dispatchStatus"] = value.status === "sent" ? "sent" : value.status === "failed" ? "failed" : "pending";
  const label = recipient(text(value.dispatchKind, 80));
  const state = status === "sent" ? "✅ Enviado pelo WhatsApp."
    : status === "failed" ? `❌ Envio não confirmado${value.lastError ? ` (${text(value.lastError)})` : ""}.`
      : "⏳ Envio ainda não confirmado.";
  return {
    id: `site-whatsapp-dispatch:${id}`, sourceId: `site-whatsapp-dispatch:${id}`, from: "bot",
    text: `📤 WhatsApp → ${label} (${text(value.phone, 20)})\n${state}\n\n${text(value.text, 4096)}`,
    ts: milliseconds(value.updatedAt) || milliseconds(value.createdAt), channel: "whatsapp_dispatch",
    dispatchStatus: status, recipientLabel: label, phone: text(value.phone, 20), requestId: text(value.requestId, 160),
    messageId: text(value.messageId) || null,
  };
};

/** Call only from authenticated administrative routes. */
export const consultarDisparosSite = async (sessionId: string, after = 0, deps: Dependencies = {}) => {
  if (!SESSION.test(sessionId)) throw new Error("SITE_DISPATCH_SESSION_INVALID");
  const now = (deps.now || Date.now)();
  const snapshot = await database(deps).collection(SITE_WHATSAPP_DISPATCH_COLLECTION).where("sessionId", "==", sessionId).get();
  return snapshot.docs.filter((doc) => milliseconds(doc.data().expiresAt) > now)
    .map((doc) => display(doc.id, doc.data())).filter((message) => message.ts > after)
    .sort((left, right) => left.ts - right.ts || left.id.localeCompare(right.id));
};

/** Administrative contact summaries; never merge into the visitor conversation. */
export const listarResumosDisparosSite = async (deps: Dependencies = {}) => {
  const now = (deps.now || Date.now)();
  const snapshot = await database(deps).collection(SITE_WHATSAPP_DISPATCH_COLLECTION).where("expiresAt", ">", new Date(now)).get();
  const summaries = new Map<string, { sessionId: string; lastMessage: string; lastMessageAt: number; lastFrom: "bot"; dispatchCount: number; dispatchStatus: string }>();
  for (const doc of snapshot.docs) {
    const value = doc.data();
    if (!SESSION.test(value.sessionId) || milliseconds(value.expiresAt) <= now) continue;
    const message = display(doc.id, value);
    const previous = summaries.get(value.sessionId);
    if (!previous || message.ts >= previous.lastMessageAt) {
      summaries.set(value.sessionId, { sessionId: value.sessionId, lastMessage: message.text, lastMessageAt: message.ts,
        lastFrom: "bot", dispatchCount: (previous?.dispatchCount || 0) + 1, dispatchStatus: message.dispatchStatus });
    } else previous.dispatchCount += 1;
  }
  return [...summaries.values()].sort((left, right) => right.lastMessageAt - left.lastMessageAt);
};

const gatewayReceipt = async (requestId: string) => {
  const result = await requestAgentService("gateway", `/api/whatsapp/transactional-send/status?requestId=${encodeURIComponent(requestId)}`, { method: "GET" });
  const body = result.body as Data | null;
  if (result.status >= 300 || !body || body.ok === false || !["sent", "sending", "failed", "notfound", "not_found"].includes(body.status)) throw new Error("SITE_DISPATCH_RECEIPT_UNAVAILABLE");
  return body as { status: string; messageId?: unknown; jid?: unknown; sentAt?: unknown };
};

/** Read receipts only: an interrupted intent must NEVER initiate a delayed send. */
export const processarDisparosSitePendentes = async (deps: Dependencies = {}) => {
  const db = database(deps);
  const clock = deps.now || Date.now;
  const expired = await db.collection(SITE_WHATSAPP_DISPATCH_COLLECTION).where("expiresAt", "<=", new Date(clock())).limit(100).get();
  if (!expired.empty) {
    const batch = db.batch();
    expired.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  const pending = await db.collection(SITE_WHATSAPP_DISPATCH_COLLECTION).where("status", "==", "pending").get();
  let confirmed = 0;
  for (const doc of pending.docs) {
    const value = doc.data();
    if (milliseconds(value.expiresAt) <= clock() || milliseconds(value.nextReconcileAt) > clock()) continue;
    const leaseId = randomUUID();
    const acquired = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(doc.ref);
      const current = snapshot.data();
      if (!current || current.status !== "pending" || milliseconds(current.expiresAt) <= clock()
        || milliseconds(current.reconcileLeaseUntil) > clock() || milliseconds(current.nextReconcileAt) > clock()) return null;
      transaction.set(doc.ref, { reconcileLeaseId: leaseId, reconcileLeaseUntil: clock() + LEASE }, { merge: true });
      return current;
    });
    if (!acquired) continue;
    let receipt: Awaited<ReturnType<typeof gatewayReceipt>> | null = null;
    let error = "";
    try { receipt = await (deps.receipt || gatewayReceipt)(acquired.requestId); }
    catch { error = "SITE_DISPATCH_RECEIPT_UNAVAILABLE"; }
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(doc.ref);
      const current = snapshot.data();
      if (!current || current.reconcileLeaseId !== leaseId || current.status !== "pending") return;
      const sent = receipt?.status === "sent";
      const failed = receipt?.status === "failed";
      const attempts = (Number(current.reconcileAttempts) || 0) + 1;
      transaction.set(doc.ref, {
        ...(sent ? { status: "sent", sentAt: new Date(milliseconds(receipt?.sentAt) || clock()),
          messageId: text(receipt?.messageId) || null, jid: text(receipt?.jid) || null, updatedAt: new Date(clock()) } : {}),
        ...(failed ? { status: "failed", sentAt: null, updatedAt: new Date(clock()) } : {}),
        lastError: sent ? null : error || `GATEWAY_${text(receipt?.status || "unavailable", 40).toUpperCase()}`,
        gatewayStatus: receipt?.status || "unavailable", reconcileAttempts: attempts, reconcileLeaseUntil: 0,
        nextReconcileAt: sent || failed ? 0 : clock() + Math.min(60 * 60_000, 30_000 * 2 ** Math.min(attempts, 7)),
      }, { merge: true });
      if (sent) confirmed += 1;
    });
  }
  return confirmed;
};

let worker: NodeJS.Timeout | null = null;
let running = false;
export const iniciarProcessadorDisparosSite = () => {
  if (worker) return;
  const run = async () => {
    if (running) return;
    running = true;
    try { await processarDisparosSitePendentes(); }
    catch { console.error("[site-dispatch] Reconciliação de comprovantes indisponível."); }
    finally { running = false; }
  };
  void run();
  worker = setInterval(() => void run(), 30_000);
  worker.unref();
};
