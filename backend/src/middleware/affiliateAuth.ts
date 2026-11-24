import type { NextFunction, Request, Response } from "express";
import { obterFirestoreAdmin } from "../services/firebaseAdmin";
import {
  AccessAuthError, autenticarIdentidadeFirebase, registrarAcessoAdminCrm,
  responderErroAcesso, usuarioPodeAdministrarCrm, type FirebaseIdentity,
} from "./crmAdminAuth";

export type AffiliateIdentity = {
  uid: string;
  email?: string;
  role: "admin" | "agency" | "partner";
  agencyId: string | null;
  partnerId: string | null;
};

const documentId = (value: unknown): value is string => typeof value === "string"
  && value.length > 0 && value.length <= 128 && value.trim() === value && !value.includes("/");
const forbidden = () => new AccessAuthError(403, "AFFILIATE_PERMISSION_REQUIRED", "Usuario sem permissao para acessar este painel.");
const disabled = () => new AccessAuthError(403, "AFFILIATE_ACCESS_DISABLED", "Este acesso esta desativado.");

export const exigirIdentidadeFirebase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.locals.firebaseIdentity = await autenticarIdentidadeFirebase(req);
    next();
  } catch (error) { responderErroAcesso(res, error); }
};

export const obterIdentidadeFirebase = (res: Response): FirebaseIdentity => {
  const identity = res.locals.firebaseIdentity as FirebaseIdentity | undefined;
  if (!identity?.uid) throw new Error("Identidade Firebase ausente.");
  return identity;
};

export const resolverIdentidadeAfiliado = async (identity: FirebaseIdentity): Promise<AffiliateIdentity> => {
  const base = { uid: identity.uid, ...(identity.email ? { email: identity.email } : {}) };
  if (usuarioPodeAdministrarCrm(identity.claims)) {
    await registrarAcessoAdminCrm(identity);
    return { ...base, role: "admin", agencyId: null, partnerId: null };
  }
  const db = obterFirestoreAdmin();
  if (!db) throw new AccessAuthError(503, "FIREBASE_ADMIN_UNAVAILABLE", "Autorizacao temporariamente indisponivel.");
  const membershipDoc = await db.collection("affiliate_memberships").doc(identity.uid).get();
  if (!membershipDoc.exists) throw forbidden();
  const membership = membershipDoc.data()!;
  if (membership.status !== "active") throw disabled();
  if (membership.role !== "agency" && membership.role !== "partner") throw forbidden();
  const agencyId = membership.agencyId;
  if (membership.role === "agency" && !documentId(agencyId)) throw forbidden();
  if (membership.role === "partner" && agencyId !== null && !documentId(agencyId)) throw forbidden();
  if (agencyId !== null) {
    const agencyDoc = await db.collection("affiliate_agencies").doc(agencyId).get();
    if (!agencyDoc.exists) throw forbidden();
    if (agencyDoc.data()!.status !== "active") throw disabled();
  }
  if (membership.role === "agency") return { ...base, role: "agency", agencyId, partnerId: null };
  if (!documentId(membership.partnerId)) throw forbidden();
  const partnerDoc = await db.collection("affiliate_partners").doc(membership.partnerId).get();
  if (!partnerDoc.exists || partnerDoc.data()!.agencyId !== agencyId) throw forbidden();
  if (partnerDoc.data()!.status !== "active") throw disabled();
  return { ...base, role: "partner", agencyId, partnerId: membership.partnerId };
};

export const exigirAfiliado = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const identity = await autenticarIdentidadeFirebase(req);
    res.locals.firebaseIdentity = identity;
    res.locals.affiliateIdentity = await resolverIdentidadeAfiliado(identity);
    next();
  } catch (error) { responderErroAcesso(res, error); }
};

export const obterIdentidadeAfiliado = (res: Response): AffiliateIdentity => {
  const identity = res.locals.affiliateIdentity as AffiliateIdentity | undefined;
  if (!identity?.uid) throw new Error("Identidade afiliada ausente.");
  return identity;
};
