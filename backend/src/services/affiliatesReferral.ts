import { randomBytes } from "crypto";
import { FieldPath } from "firebase-admin/firestore";
import {
  AffiliateError, AffiliateIdentity, CommercialAttribution, affiliateDb, affiliateHash, affiliateId, affiliateIso,
  affiliatePage, affiliatePublicBase, affiliateText, commissionAmount, normalizeCommissionRule, assertAffiliatesEnabled,
} from "./affiliates";

const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const contextRef = (token: unknown) => {
  const clean = affiliateText(token, 90);
  if (!TOKEN.test(clean)) throw new AffiliateError("AFFILIATE_CONTEXT_INVALID");
  return affiliateDb().collection("_affiliate_contexts").doc(affiliateHash(clean));
};
const activePartner = async (partnerId: string, agencyId: string | null) => {
  const db = affiliateDb();
  const partner = await db.collection("affiliate_partners").doc(partnerId).get();
  if (!partner.exists || partner.data()?.status !== "active" || (partner.data()?.agencyId ?? null) !== agencyId) throw new AffiliateError("AFFILIATE_LINK_UNAVAILABLE", 410);
  const agency = agencyId ? await db.collection("affiliate_agencies").doc(agencyId).get() : null;
  if (agencyId && (!agency?.exists || agency.data()?.status !== "active")) throw new AffiliateError("AFFILIATE_LINK_UNAVAILABLE", 410);
  return { partner: partner.data()!, agency: agency?.data() ?? null };
};
export const resolveAffiliateLink = async (tokenValue: unknown) => {
  assertAffiliatesEnabled();
  const token = affiliateText(tokenValue, 90);
  if (!TOKEN.test(token)) throw new AffiliateError("AFFILIATE_LINK_INVALID", 404);
  const db = affiliateDb();
  const lookup = await db.collection("_affiliate_link_tokens").doc(affiliateHash(token)).get();
  if (!lookup.exists) throw new AffiliateError("AFFILIATE_LINK_INVALID", 404);
  const link = lookup.data()!;
  const current = await db.collection("affiliate_links").doc(link.linkId).get();
  if (!current.exists || current.data()?.status !== "active" || current.data()?.token !== token) throw new AffiliateError("AFFILIATE_LINK_UNAVAILABLE", 410);
  const { partner, agency } = await activePartner(link.partnerId, link.agencyId ?? null);
  const contextToken = randomBytes(32).toString("base64url");
  const capturedAt = new Date();
  const expiresAt = new Date(capturedAt.getTime() + 7 * 86400000);
  await contextRef(contextToken).create({ linkId: link.linkId, partnerId: link.partnerId, agencyId: link.agencyId ?? null, capturedAt, expiresAt });
  return { contextToken, expiresAt: expiresAt.toISOString(), partnerName: partner.name, agencyName: agency?.name ?? null };
};
export const validateAffiliateContext = async (token: unknown) => {
  const snapshot = await contextRef(token).get();
  const context = snapshot.data();
  if (!context || (affiliateIso(context.expiresAt) ?? "") <= new Date().toISOString()) throw new AffiliateError("AFFILIATE_CONTEXT_EXPIRED", 410);
  const link = await affiliateDb().collection("affiliate_links").doc(context.linkId).get();
  if (!link.exists || link.data()?.status !== "active") throw new AffiliateError("AFFILIATE_LINK_UNAVAILABLE", 410);
  const { partner, agency } = await activePartner(context.partnerId, context.agencyId ?? null);
  return { context, partner, agency };
};
// Only this server function constructs commercial snapshots; request IDs are never accepted as ownership.
export const snapshotAffiliateContext = async (token: unknown): Promise<CommercialAttribution | undefined> => {
  if (token === undefined || token === null || token === "") return undefined;
  assertAffiliatesEnabled();
  const { context, partner, agency } = await validateAffiliateContext(token);
  const owner = agency ?? partner;
  return {
    version: 1, agencyId: context.agencyId ?? null, agencyName: agency?.name ?? null,
    partnerId: context.partnerId, partnerName: partner.name, linkId: context.linkId, contextId: affiliateHash(String(token)),
    capturedAt: affiliateIso(context.capturedAt)!, bookedAt: new Date().toISOString(),
    commissionRule: normalizeCommissionRule(owner.commissionRule),
    commissionBeneficiary: context.agencyId ? "agency" : "partner",
    commissionBeneficiaryId: context.agencyId ?? context.partnerId,
  };
};
export const vincularContextoAfiliadoSessao = async (token: unknown, sessionValue: unknown) => {
  await validateAffiliateContext(token);
  const sessionId = affiliateText(sessionValue, 100);
  if (!/^(?:site_[A-Za-z0-9_-]{12,98}|whatsapp_\d{10,15})$/.test(sessionId)) throw new AffiliateError("AFFILIATE_SESSION_INVALID");
  const ref = affiliateDb().collection("_affiliate_session_contexts").doc(affiliateHash(sessionId));
  await affiliateDb().runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists && existing.data()?.contextToken !== token && (affiliateIso(existing.data()?.expiresAt) ?? "") > new Date().toISOString()) throw new AffiliateError("AFFILIATE_SESSION_ALREADY_BOUND", 409);
    const { context } = await validateAffiliateContext(token);
    tx.set(ref, { sessionId, contextToken: token, expiresAt: context.expiresAt });
  });
  return { bound: true };
};
export const obterContextoAfiliadoSessao = async (sessionValue: unknown) => {
  const sessionId = affiliateText(sessionValue, 100);
  if (!sessionId) return undefined;
  const snapshot = await affiliateDb().collection("_affiliate_session_contexts").doc(affiliateHash(sessionId)).get();
  if (!snapshot.exists || (affiliateIso(snapshot.data()?.expiresAt) ?? "") <= new Date().toISOString()) return undefined;
  return snapshot.data()?.contextToken as string | undefined;
};
export const listAffiliateLinks = async (identity: AffiliateIdentity, filters: Record<string, unknown>) => {
  const page = affiliatePage(filters.limit, filters.cursor);
  let query: FirebaseFirestore.Query = affiliateDb().collection("affiliate_links");
  if (identity.role === "partner") query = query.where("partnerId", "==", identity.partnerId);
  else if (identity.role === "agency") query = query.where("agencyId", "==", identity.agencyId);
  else if (filters.partnerId) query = query.where("partnerId", "==", affiliateId(filters.partnerId));
  else if (filters.agencyId) query = query.where("agencyId", "==", filters.agencyId === "null" ? null : affiliateId(filters.agencyId));
  query = query.orderBy(FieldPath.documentId());
  if (page.cursor) query = query.startAfter(page.cursor);
  const snapshot = await query.limit(page.limit + 1).get();
  const docs = snapshot.docs.slice(0, page.limit);
  return { items: docs.map((doc) => {
    const data = doc.data();
    return { id: doc.id, partnerId: data.partnerId, label: "Formulário de reserva", status: data.status,
      url: `${affiliatePublicBase()}/reservar?ref=${encodeURIComponent(data.token)}`, createdAt: affiliateIso(data.createdAt) };
  }), nextCursor: snapshot.size > page.limit ? docs[docs.length - 1].id : null };
};

const paid = (value: unknown) => ["pago", "confirmado", "paid", "confirmed", "received", "recebido", "approved", "aprovado"].includes(affiliateText(value).toLowerCase());
const cancelled = (value: unknown) => /cancel|estorn|reembol|refund|chargeback/.test(affiliateText(value).toLowerCase());
const cents = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : -1;
const providerPaidAt = (payment: Record<string, any>) => {
  for (const value of [payment.confirmedDate, payment.paymentDate, payment.clientPaymentDate]) {
    if (typeof value !== "string") continue;
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
    if (Number.isFinite(date.getTime())) return date;
  }
  return new Date();
};
const financialDay = (iso: string) => {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};
export const affiliatePaymentMatches = (reservationId: string, reservation: Record<string, any>, payment: Record<string, any>) => {
  const expected = affiliateText(reservation.asaasPaymentId ?? reservation.pagamentoId, 100);
  return Boolean(expected) && payment.id === expected && payment.externalReference === reservationId
    && cents(payment.value) === cents(reservation.valor) && cents(payment.value) >= 0;
};
export const recordAffiliatePaymentEvidence = async (reservationId: string, payment: Record<string, any>) => {
  const db = affiliateDb();
  return db.runTransaction(async (tx) => {
    const reservationRef = db.collection("reservas").doc(affiliateId(reservationId));
    const evidenceRef = db.collection("_affiliate_payment_evidence").doc(reservationId);
    const [reservation, evidence] = await Promise.all([tx.get(reservationRef), tx.get(evidenceRef)]);
    if (!reservation.exists || !reservation.data()?.commercialAttribution) return false;
    const raw = reservation.data()!;
    if (!affiliatePaymentMatches(reservationId, raw, payment)) throw new AffiliateError("AFFILIATE_PAYMENT_MISMATCH", 409);
    const status = affiliateText(payment.status).toUpperCase();
    const terminal = /REFUND|CHARGEBACK|DELETED|CANCEL/.test(status) || payment.deleted === true;
    const isPaid = ["CONFIRMED", "RECEIVED", "PAID"].includes(status);
    if (!terminal && !isPaid) return false;
    if (evidence.data()?.state === "cancelled" && !terminal) return false;
    tx.set(evidenceRef, { paymentId: payment.id, state: terminal ? "cancelled" : "paid", providerStatus: status,
      value: payment.value, verifiedAt: new Date(), paidAt: evidence.data()?.paidAt ?? (isPaid ? providerPaidAt(payment) : null) }, { merge: true });
    if (terminal) tx.update(reservationRef, { status: "estornado", confirmada: false });
    return isPaid && !terminal;
  });
};
// A public webhook is only a notification. Financial evidence is fetched with the server's provider credential.
export const revalidateAffiliateWebhook = async (reservationId: string, paymentId: string) => {
  const reservation = await affiliateDb().collection("reservas").doc(affiliateId(reservationId)).get();
  if (!reservation.exists || !reservation.data()?.commercialAttribution) return null;
  if (!/^pay_[A-Za-z0-9_-]+$/.test(paymentId) || !process.env.ASAAS_API_KEY) throw new AffiliateError("AFFILIATE_PAYMENT_VERIFICATION_UNAVAILABLE", 503);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`https://api.asaas.com/v3/payments/${encodeURIComponent(paymentId)}`, {
      headers: { accept: "application/json", access_token: process.env.ASAAS_API_KEY }, signal: controller.signal,
    });
    if (!response.ok) throw new AffiliateError("AFFILIATE_PAYMENT_VERIFICATION_UNAVAILABLE", 503);
    const payment = await response.json() as Record<string, any>;
    await recordAffiliatePaymentEvidence(reservationId, payment);
    return payment;
  } finally { clearTimeout(timeout); }
};

export const affiliateSaleDto = (id: string, raw: Record<string, any>, evidence: Record<string, any> | undefined, identity: AffiliateIdentity) => {
  const source = raw.commercialAttribution as CommercialAttribution;
  const eligible = paid(raw.status) && !cancelled(raw.status) && evidence?.state === "paid"
    && evidence.paymentId === (raw.asaasPaymentId ?? raw.pagamentoId) && cents(evidence.value) === cents(raw.valor);
  const isCancelled = cancelled(raw.status) || evidence?.state === "cancelled";
  return { id, date: affiliateText(raw.data, 10), activity: affiliateText(raw.atividade, 300),
    status: isCancelled ? "cancelled" : eligible ? "paid" : "pending", value: Math.max(0, Number(raw.valor) || 0),
    paidAt: eligible ? affiliateIso(evidence?.paidAt) : null,
    partnerId: source.partnerId, partnerName: source.partnerName, agencyId: source.agencyId,
    ...(identity.role === "admin" ? { commissionRule: source.commissionRule ?? null,
      commission: eligible ? commissionAmount(source.commissionRule, Number(raw.valor)) : null,
      commissionBeneficiary: source.commissionBeneficiary, commissionBeneficiaryId: source.commissionBeneficiaryId } : {}),
  };
};
const dateFilters = (filters: Record<string, unknown>) => {
  const dates = ["from", "to"].map((key) => {
    if (!filters[key]) return "";
    const text = affiliateText(filters[key], 12);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(new Date(`${text}T12:00:00Z`).getTime())
      || new Date(`${text}T12:00:00Z`).toISOString().slice(0, 10) !== text) throw new AffiliateError("AFFILIATE_DATE_INVALID");
    return text;
  });
  if (dates[0] && dates[1] && dates[0] > dates[1]) throw new AffiliateError("AFFILIATE_DATE_INVALID");
  return dates;
};
const salesQuery = (identity: AffiliateIdentity, filters: Record<string, unknown>) => {
  let query: FirebaseFirestore.Query = affiliateDb().collection("reservas");
  if (identity.role === "partner") query = query.where("commercialAttribution.partnerId", "==", identity.partnerId);
  else if (identity.role === "agency") query = query.where("commercialAttribution.agencyId", "==", identity.agencyId);
  else if (filters.partnerId) query = query.where("commercialAttribution.partnerId", "==", affiliateId(filters.partnerId));
  else if (filters.agencyId && filters.agencyId !== "null") query = query.where("commercialAttribution.agencyId", "==", affiliateId(filters.agencyId));
  else query = query.where("commercialAttribution.version", "==", 1);
  return query.orderBy(FieldPath.documentId());
};
const reportPage = async (identity: AffiliateIdentity, filters: Record<string, unknown>, limit: number, cursor?: string | null) => {
  const [from, to] = dateFilters(filters);
  let query = salesQuery(identity, filters);
  if (cursor) query = query.startAfter(cursor);
  const snapshot = await query.limit(limit + 1).get();
  const docs = snapshot.docs.slice(0, limit);
  const items = (await Promise.all(docs.map(async (doc) => {
    const raw = doc.data();
    const source = raw.commercialAttribution;
    if (!source || source.version !== 1 || (identity.role === "partner" && source.partnerId !== identity.partnerId)
      || (identity.role === "agency" && source.agencyId !== identity.agencyId)
      || (identity.role === "admin" && filters.agencyId === "null" && source.agencyId !== null)) return null;
    const evidence = await affiliateDb().collection("_affiliate_payment_evidence").doc(doc.id).get();
    const dto = affiliateSaleDto(doc.id, raw, evidence.data(), identity);
    const financialDate = financialDay(dto.paidAt ?? affiliateIso(raw.criadoEm) ?? source.bookedAt ?? "");
    return (!from || financialDate >= from) && (!to || financialDate <= to) ? dto : null;
  }))).filter((item): item is NonNullable<typeof item> => item !== null);
  return { items, nextCursor: snapshot.size > limit ? docs[docs.length - 1].id : null };
};
export const listAffiliateSales = async (identity: AffiliateIdentity, filters: Record<string, unknown>) => {
  const page = affiliatePage(filters.limit, filters.cursor);
  return reportPage(identity, filters, page.limit, page.cursor);
};
export const affiliateSummary = async (identity: AffiliateIdentity, filters: Record<string, unknown>) => {
  let cursor: string | null = null;
  let paidCount = 0, pendingCount = 0, cancelledCount = 0, revenueCents = 0, commissionCents = 0, configured = false;
  do {
    const page = await reportPage(identity, filters, 500, cursor);
    for (const item of page.items) {
      if (item.status === "paid") { paidCount++; revenueCents += Math.round(item.value * 100); }
      else if (item.status === "cancelled") cancelledCount++;
      else pendingCount++;
      if (identity.role === "admin" && "commissionRule" in item && item.commissionRule !== null) configured = true;
      if (identity.role === "admin" && "commission" in item && item.commission != null) commissionCents += Math.round(item.commission * 100);
    }
    cursor = page.nextCursor;
  } while (cursor);
  return { paidCount, pendingCount, cancelledCount, revenue: revenueCents / 100, currency: "BRL",
    ...(identity.role === "admin" ? { commission: configured ? commissionCents / 100 : null, commissionConfigured: configured } : {}) };
};
