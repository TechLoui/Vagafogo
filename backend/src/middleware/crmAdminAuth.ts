import type { NextFunction, Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import { obterAuthAdmin, obterFirestoreAdmin } from "../services/firebaseAdmin";

export type CrmAdminIdentity = { uid: string; email?: string };
export type FirebaseIdentity = CrmAdminIdentity & {
  emailVerified: boolean;
  claims: DecodedIdToken;
};

export class AccessAuthError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

const configuredEmails = () => process.env.CRM_ADMIN_EMAILS ?? process.env.FORMULARIOS_ADMIN_EMAILS ?? "";
const allowedEmails = (rawValue: string) => new Set(rawValue.split(",")
  .map((email) => email.trim().toLocaleLowerCase("en-US")).filter(Boolean));

export const politicaAdminCrmConfigurada = (rawValue = configuredEmails()) => allowedEmails(rawValue).size > 0;

export const usuarioPodeAdministrarCrm = (
  claims: { admin?: unknown; email?: unknown; email_verified?: unknown },
  rawValue = configuredEmails(),
) => claims.admin === true || (claims.email_verified === true && typeof claims.email === "string"
  && allowedEmails(rawValue).has(claims.email.trim().toLocaleLowerCase("en-US")));

export const autenticarIdentidadeFirebase = async (req: Request): Promise<FirebaseIdentity> => {
  const token = /^Bearer\s+(.+)$/i.exec(req.get("Authorization")?.trim() ?? "")?.[1]?.trim();
  if (!token) throw new AccessAuthError(401, "AUTH_REQUIRED", "Autenticacao necessaria.");
  const auth = obterAuthAdmin();
  if (!auth) throw new AccessAuthError(503, "FIREBASE_ADMIN_UNAVAILABLE", "Autenticacao temporariamente indisponivel.");
  try {
    const claims = await auth.verifyIdToken(token, true);
    const email = typeof claims.email === "string" ? claims.email.trim() : "";
    return { uid: claims.uid, ...(email ? { email } : {}), emailVerified: claims.email_verified === true, claims };
  } catch {
    throw new AccessAuthError(401, "INVALID_AUTH_TOKEN", "Sessao invalida ou expirada.");
  }
};

/** Server-owned approval for legacy browser Firestore access. Never a membership role. */
export const registrarAcessoAdminCrm = async (identity: FirebaseIdentity) => {
  const firestore = obterFirestoreAdmin();
  if (!firestore) throw new AccessAuthError(503, "FIREBASE_ADMIN_UNAVAILABLE", "Autorizacao temporariamente indisponivel.");
  const expiresAt = Math.min(Number(identity.claims.exp) * 1000, Date.now() + 60 * 60 * 1000);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new AccessAuthError(401, "INVALID_AUTH_TOKEN", "Sessao invalida ou expirada.");
  }
  try {
    await firestore.collection("_crm_admin_access").doc(identity.uid).set({
      status: "active", approvedUntil: Timestamp.fromMillis(expiresAt),
      ...(identity.email ? { email: identity.email } : {}),
    });
  } catch {
    throw new AccessAuthError(503, "ADMIN_ACCESS_UNAVAILABLE", "Autorizacao temporariamente indisponivel.");
  }
};

export const responderErroAcesso = (res: Response, error: unknown) => {
  const known = error instanceof AccessAuthError;
  res.status(known ? error.status : 503).json({
    error: known ? error.message : "Autorizacao temporariamente indisponivel.",
    code: known ? error.code : "AUTHORIZATION_UNAVAILABLE",
  });
};

export const exigirAdminCrm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const identity = await autenticarIdentidadeFirebase(req);
    if (!politicaAdminCrmConfigurada() && identity.claims.admin !== true) {
      throw new AccessAuthError(503, "CRM_AUTH_POLICY_NOT_CONFIGURED", "A politica de acesso do CRM nao esta configurada.");
    }
    if (!usuarioPodeAdministrarCrm(identity.claims)) {
      throw new AccessAuthError(403, "CRM_PERMISSION_REQUIRED", "Usuario sem permissao para gerenciar o CRM.");
    }
    await registrarAcessoAdminCrm(identity);
    res.locals.firebaseIdentity = identity;
    res.locals.crmAdmin = { uid: identity.uid, ...(identity.email ? { email: identity.email } : {}) } satisfies CrmAdminIdentity;
    next();
  } catch (error) { responderErroAcesso(res, error); }
};

export const obterIdentidadeAdminCrm = (res: Response): CrmAdminIdentity => {
  const identity = res.locals.crmAdmin as CrmAdminIdentity | undefined;
  if (!identity?.uid) throw new Error("Identidade administrativa ausente.");
  return identity;
};
