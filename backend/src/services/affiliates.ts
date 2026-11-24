import { createHash, randomBytes } from "crypto";
import { FieldPath, FieldValue, Firestore } from "firebase-admin/firestore";
import { obterAuthAdmin, obterFirestoreAdmin } from "./firebaseAdmin";

export type AffiliateIdentity = { uid: string; email?: string; role: "admin" | "agency" | "partner"; agencyId: string | null; partnerId: string | null };
export type CommissionRule = { mode: "percent" | "fixed"; value: number };
export type CommercialAttribution = {
  version: 1; agencyId: string | null; agencyName: string | null; partnerId: string; partnerName: string;
  linkId: string; contextId: string; capturedAt: string; bookedAt: string; commissionRule: CommissionRule | null;
  commissionBeneficiary: "agency" | "partner" | null; commissionBeneficiaryId: string | null;
};
export class AffiliateError extends Error {
  constructor(public code: string, public status = 400, message = code) { super(message); }
}
export const affiliatesEnabled = () => process.env.AFFILIATES_ENABLED?.trim().toLowerCase() === "true";
export const assertAffiliatesEnabled = () => { if (!affiliatesEnabled()) throw new AffiliateError("AFFILIATES_NOT_ENABLED", 503); };
export const affiliateDb = (): Firestore => {
  const db = obterFirestoreAdmin();
  if (!db) throw new AffiliateError("AFFILIATE_SERVICE_UNAVAILABLE", 503);
  return db;
};
export const affiliateText = (value: unknown, max = 160) => typeof value === "string" ? value.trim().slice(0, max) : "";
export const affiliateHash = (value: string) => createHash("sha256").update(`affiliate:v1\0${value}`).digest("hex");
export const affiliateId = (value: unknown) => {
  const id = affiliateText(value, 150);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new AffiliateError("AFFILIATE_ID_INVALID");
  return id;
};
const record = (value: unknown): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
export const normalizeCommissionRule = (value: unknown): CommissionRule | null => {
  if (value === null || value === undefined) return null;
  const raw = record(value);
  if ((raw.mode !== "percent" && raw.mode !== "fixed") || typeof raw.value !== "number" || !Number.isFinite(raw.value)
    || raw.value < 0 || raw.value > (raw.mode === "percent" ? 100 : 1_000_000)
    || Math.abs(Math.round(raw.value * 100) - raw.value * 100) > 0.000001
    || Object.keys(raw).some((key) => !["mode", "value"].includes(key))) throw new AffiliateError("AFFILIATE_COMMISSION_INVALID");
  return { mode: raw.mode, value: raw.value };
};
export const commissionAmount = (rule: CommissionRule | null, value: number) => rule === null ? null
  : rule.mode === "fixed" ? rule.value : Math.round(Math.max(0, value) * 100 * rule.value / 100) / 100;
export const requireAffiliateRole = (identity: AffiliateIdentity, roles: AffiliateIdentity["role"][]) => {
  if (!roles.includes(identity.role)) throw new AffiliateError("AFFILIATE_PERMISSION_REQUIRED", 403);
};
export const assertAffiliateScope = (identity: AffiliateIdentity, kind: "agency" | "partner", id: string, entity: Record<string, any>) => {
  if (identity.role === "admin") return;
  const allowed = kind === "agency" ? identity.role === "agency" && identity.agencyId === id
    : identity.role === "agency" ? Boolean(identity.agencyId) && entity.agencyId === identity.agencyId
    : identity.partnerId === id;
  if (!allowed) throw new AffiliateError("AFFILIATE_NOT_FOUND", 404);
};
const collectionFor = (kind: "agency" | "partner") => kind === "agency" ? "affiliate_agencies" : "affiliate_partners";
export const affiliateIso = (value: any): string | null => {
  const date = value?.toDate?.() ?? (value instanceof Date ? value : typeof value === "string" ? new Date(value) : null);
  return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
};
const serialize = (id: string, raw: Record<string, any>, identity: AffiliateIdentity) => ({
  id, name: raw.name, email: raw.email, status: raw.status, agencyId: raw.agencyId ?? null,
  activated: Boolean(raw.memberUid), createdAt: affiliateIso(raw.createdAt), updatedAt: affiliateIso(raw.updatedAt),
  ...(identity.role === "admin" ? { commissionRule: raw.commissionRule ?? null } : {}),
});
export const readAffiliate = async (kind: "agency" | "partner", idValue: unknown, identity: AffiliateIdentity) => {
  const id = affiliateId(idValue);
  const snap = await affiliateDb().collection(collectionFor(kind)).doc(id).get();
  if (!snap.exists) throw new AffiliateError("AFFILIATE_NOT_FOUND", 404);
  const data = snap.data()!;
  assertAffiliateScope(identity, kind, id, data);
  return { id, data, ref: snap.ref };
};
export const getAffiliateProfile = async (kind: "agency" | "partner", id: unknown, identity: AffiliateIdentity) => {
  const item = await readAffiliate(kind, id, identity);
  return serialize(item.id, item.data, identity);
};
const validateEmail = (value: unknown) => {
  const email = affiliateText(value, 254).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new AffiliateError("AFFILIATE_EMAIL_INVALID");
  return email;
};
const assertNewAccountEmail = async (email: string) => {
  const admins = `${process.env.CRM_ADMIN_EMAILS ?? ""},${process.env.FORMULARIOS_ADMIN_EMAILS ?? ""}`.toLowerCase().split(",").map((item) => item.trim());
  if (admins.includes(email)) throw new AffiliateError("AFFILIATE_ACCOUNT_ALREADY_EXISTS", 409);
  const auth = obterAuthAdmin();
  if (!auth) throw new AffiliateError("AFFILIATE_SERVICE_UNAVAILABLE", 503);
  try { await auth.getUserByEmail(email); }
  catch (error) { if ((error as { code?: string }).code === "auth/user-not-found") return; throw error; }
  throw new AffiliateError("AFFILIATE_ACCOUNT_ALREADY_EXISTS", 409);
};
const allowedProfileKeys = ["name", "email", "status", "agencyId", "commissionRule"];
export const saveAffiliate = async (kind: "agency" | "partner", idValue: unknown, input: unknown, identity: AffiliateIdentity) => {
  requireAffiliateRole(identity, kind === "agency" ? ["admin"] : ["admin", "agency"]);
  const raw = record(input);
  if (Object.keys(raw).some((key) => !allowedProfileKeys.includes(key))) throw new AffiliateError("AFFILIATE_FIELD_INVALID");
  const db = affiliateDb();
  const id = idValue ? affiliateId(idValue) : db.collection(collectionFor(kind)).doc().id;
  const existing = idValue ? await readAffiliate(kind, id, identity) : null;
  const previous = existing?.data ?? {};
  const name = own(raw, "name") ? affiliateText(raw.name) : previous.name;
  if (!name) throw new AffiliateError("AFFILIATE_NAME_REQUIRED");
  const email = own(raw, "email") ? validateEmail(raw.email) : previous.email;
  if (!email) throw new AffiliateError("AFFILIATE_EMAIL_INVALID");
  if (existing && own(raw, "email") && email !== previous.email) throw new AffiliateError("AFFILIATE_EMAIL_IMMUTABLE", 409);
  const status = own(raw, "status") ? raw.status : previous.status ?? "active";
  if (status !== "active" && status !== "disabled") throw new AffiliateError("AFFILIATE_STATUS_INVALID");
  let agencyId: string | null = null;
  if (kind === "partner") {
    agencyId = identity.role === "agency" ? identity.agencyId : own(raw, "agencyId") ? raw.agencyId === null ? null : affiliateId(raw.agencyId) : previous.agencyId ?? null;
    if (identity.role === "agency" && own(raw, "agencyId") && raw.agencyId !== identity.agencyId) throw new AffiliateError("AFFILIATE_PERMISSION_REQUIRED", 403);
    if (existing && agencyId !== previous.agencyId) throw new AffiliateError("AFFILIATE_AGENCY_IMMUTABLE", 409);
    if (agencyId) {
      const agency = await db.collection("affiliate_agencies").doc(agencyId).get();
      if (!agency.exists || agency.data()?.status !== "active") throw new AffiliateError("AFFILIATE_AGENCY_DISABLED", 409);
    }
  } else if (own(raw, "agencyId")) throw new AffiliateError("AFFILIATE_FIELD_INVALID");
  if (identity.role !== "admin" && own(raw, "commissionRule")) throw new AffiliateError("AFFILIATE_PERMISSION_REQUIRED", 403);
  if (kind === "partner" && agencyId && raw.commissionRule != null) throw new AffiliateError("AFFILIATE_COMMISSION_INHERITED");
  const commissionRule = kind === "partner" && agencyId ? null
    : own(raw, "commissionRule") ? normalizeCommissionRule(raw.commissionRule) : previous.commissionRule ?? null;
  if (!existing) await assertNewAccountEmail(email);
  const ref = db.collection(collectionFor(kind)).doc(id);
  const now = new Date();
  const data = { name, email, status, ...(kind === "partner" ? { agencyId } : {}), commissionRule,
    updatedAt: now, updatedBy: identity.uid, ...(existing ? {} : { createdAt: now, createdBy: identity.uid }) };
  const emailRef = db.collection("_affiliate_emails").doc(affiliateHash(email));
  await db.runTransaction(async (tx) => {
    const reserved = await tx.get(emailRef);
    if (!existing && reserved.exists) throw new AffiliateError("AFFILIATE_EMAIL_IN_USE", 409);
    if (!existing) tx.create(emailRef, { kind, id, email });
    tx.set(ref, data, { merge: Boolean(existing) });
    if (!existing && kind === "partner") {
      const token = randomBytes(32).toString("base64url");
      tx.create(db.collection("affiliate_links").doc(id), { partnerId: id, agencyId, token, status: "active", createdAt: now });
      tx.create(db.collection("_affiliate_link_tokens").doc(affiliateHash(token)), { linkId: id, partnerId: id, agencyId, createdAt: now });
    }
  });
  return serialize(id, { ...previous, ...data }, identity);
};
export const affiliatePage = (limitValue: unknown, cursorValue: unknown) => {
  const parsed = Number(limitValue ?? 25);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) throw new AffiliateError("AFFILIATE_LIMIT_INVALID");
  return { limit: parsed, cursor: cursorValue ? affiliateId(cursorValue) : null };
};
export const listAffiliates = async (kind: "agency" | "partner", identity: AffiliateIdentity, limitValue?: unknown, cursorValue?: unknown, agencyFilter?: unknown) => {
  requireAffiliateRole(identity, kind === "agency" ? ["admin"] : ["admin", "agency"]);
  const page = affiliatePage(limitValue, cursorValue);
  let query: FirebaseFirestore.Query = affiliateDb().collection(collectionFor(kind));
  if (identity.role === "agency") query = query.where("agencyId", "==", identity.agencyId);
  else if (kind === "partner" && agencyFilter !== undefined && agencyFilter !== "") query = query.where("agencyId", "==", agencyFilter === "null" ? null : affiliateId(agencyFilter));
  query = query.orderBy(FieldPath.documentId());
  if (page.cursor) query = query.startAfter(page.cursor);
  const snapshot = await query.limit(page.limit + 1).get();
  const docs = snapshot.docs.slice(0, page.limit);
  return { items: docs.map((doc) => serialize(doc.id, doc.data(), identity)), nextCursor: snapshot.size > page.limit ? docs[docs.length - 1].id : null };
};
export const affiliateMe = async (identity: AffiliateIdentity) => ({
  identity,
  ...(identity.agencyId ? { agency: await readAffiliate("agency", identity.agencyId, { ...identity, role: "admin" }).then((item) => serialize(item.id, item.data, identity)) } : {}),
  ...(identity.partnerId ? { partner: await readAffiliate("partner", identity.partnerId, identity).then((item) => serialize(item.id, item.data, identity)) } : {}),
});
export const affiliatePublicBase = () => "https://vagafogo.com.br";
export const createAffiliateActivation = async (kind: "agency" | "partner", id: unknown, identity: AffiliateIdentity) => {
  requireAffiliateRole(identity, kind === "agency" ? ["admin"] : ["admin", "agency"]);
  const entity = await readAffiliate(kind, id, identity);
  if (entity.data.status !== "active" || entity.data.memberUid) throw new AffiliateError("AFFILIATE_ACTIVATION_UNAVAILABLE", 409);
  await assertNewAccountEmail(entity.data.email);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const db = affiliateDb();
  const activationId = affiliateHash(token);
  await db.runTransaction(async (tx) => {
    const current = await tx.get(entity.ref);
    if (!current.exists || current.data()?.memberUid || current.data()?.status !== "active") throw new AffiliateError("AFFILIATE_ACTIVATION_UNAVAILABLE", 409);
    tx.create(db.collection("_affiliate_activations").doc(activationId), { kind, entityId: entity.id, email: entity.data.email, expiresAt, createdAt: new Date(), createdBy: identity.uid, usedBy: null });
    tx.update(entity.ref, { activationId });
  });
  return { url: `${affiliatePublicBase()}/afiliados/ativar/${token}`, expiresAt: expiresAt.toISOString() };
};
const activationRecord = async (tokenValue: unknown) => {
  const token = affiliateText(tokenValue, 90);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new AffiliateError("AFFILIATE_ACTIVATION_INVALID", 404);
  const ref = affiliateDb().collection("_affiliate_activations").doc(affiliateHash(token));
  const snap = await ref.get();
  const data = snap.data();
  if (!data || !["agency", "partner"].includes(data.kind) || data.usedBy || (affiliateIso(data.expiresAt) ?? "") <= new Date().toISOString()) throw new AffiliateError("AFFILIATE_ACTIVATION_EXPIRED", 410);
  return { ref, data };
};
export const previewAffiliateActivation = async (token: unknown) => {
  const { ref, data } = await activationRecord(token);
  const entity = await affiliateDb().collection(collectionFor(data.kind)).doc(data.entityId).get();
  if (!entity.exists || entity.data()?.status !== "active" || entity.data()?.activationId !== ref.id) throw new AffiliateError("AFFILIATE_ACTIVATION_EXPIRED", 410);
  return { name: entity.data()!.name, email: data.email, role: data.kind, expiresAt: affiliateIso(data.expiresAt) };
};
export const redeemAffiliateActivation = async (token: unknown, identity: { uid: string; email?: string; claims: Record<string, any> }) => {
  // A committed redemption may be replayed by the same UID after a lost HTTP response.
  const tokenText = affiliateText(token, 90);
  if (!/^[A-Za-z0-9_-]{43}$/.test(tokenText)) throw new AffiliateError("AFFILIATE_ACTIVATION_INVALID", 404);
  const ref = affiliateDb().collection("_affiliate_activations").doc(affiliateHash(tokenText));
  const stored = await ref.get();
  const data = stored.data();
  if (!data) throw new AffiliateError("AFFILIATE_ACTIVATION_INVALID", 404);
  const email = affiliateText(identity.email, 254).toLowerCase();
  if (!email || email !== data.email || identity.claims.admin === true) throw new AffiliateError("AFFILIATE_ACTIVATION_ACCOUNT_MISMATCH", 403);
  const admins = `${process.env.CRM_ADMIN_EMAILS ?? ""},${process.env.FORMULARIOS_ADMIN_EMAILS ?? ""}`.toLowerCase().split(",").map((item) => item.trim());
  if (admins.includes(email)) throw new AffiliateError("AFFILIATE_ACTIVATION_ACCOUNT_MISMATCH", 403);
  const auth = obterAuthAdmin();
  if (!auth) throw new AffiliateError("AFFILIATE_SERVICE_UNAVAILABLE", 503);
  const user = await auth.getUser(identity.uid);
  const createdAt = new Date(user.metadata.creationTime).getTime();
  const issuedAt = new Date(affiliateIso(data.createdAt) ?? "").getTime();
  if (!Number.isFinite(createdAt) || !Number.isFinite(issuedAt) || createdAt < issuedAt) throw new AffiliateError("AFFILIATE_ACCOUNT_ALREADY_EXISTS", 409);
  const db = affiliateDb();
  return db.runTransaction(async (tx) => {
    const entityRef = db.collection(collectionFor(data.kind)).doc(data.entityId);
    const membershipRef = db.collection("affiliate_memberships").doc(identity.uid);
    const [activation, entity, membership] = await Promise.all([tx.get(ref), tx.get(entityRef), tx.get(membershipRef)]);
    const current = activation.data();
    if (current?.usedBy === identity.uid && membership.exists && entity.data()?.memberUid === identity.uid
      && membership.data()?.status === "active") return { membership: { role: membership.data()!.role, agencyId: membership.data()!.agencyId, partnerId: membership.data()!.partnerId }, duplicate: true };
    if (!current || current.usedBy || (affiliateIso(current.expiresAt) ?? "") <= new Date().toISOString()
      || !entity.exists || entity.data()?.activationId !== ref.id || entity.data()?.status !== "active") throw new AffiliateError("AFFILIATE_ACTIVATION_EXPIRED", 410);
    if (membership.exists || entity.data()?.memberUid) throw new AffiliateError("AFFILIATE_ACCOUNT_ALREADY_ASSIGNED", 409);
    const agencyId = data.kind === "agency" ? data.entityId : entity.data()!.agencyId ?? null;
    if (agencyId && data.kind === "partner") {
      const agency = await tx.get(db.collection("affiliate_agencies").doc(agencyId));
      if (!agency.exists || agency.data()?.status !== "active") throw new AffiliateError("AFFILIATE_AGENCY_DISABLED", 403);
    }
    const member = { role: data.kind, agencyId, partnerId: data.kind === "partner" ? data.entityId : null, status: "active", createdAt: new Date() };
    tx.create(membershipRef, member);
    tx.update(entityRef, { memberUid: identity.uid, activatedAt: new Date(), updatedAt: new Date() });
    tx.update(ref, { usedBy: identity.uid, usedAt: new Date() });
    return { membership: { role: member.role, agencyId, partnerId: member.partnerId } };
  });
};
