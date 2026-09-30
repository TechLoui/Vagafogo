import type { NextFunction, Request, Response } from "express";
import { obterAuthAdmin } from "../services/firebaseAdmin";

export type CrmAdminIdentity = {
  uid: string;
  email?: string;
};

const allowedEmails = () =>
  new Set(
    (process.env.CRM_ADMIN_EMAILS ?? process.env.FORMULARIOS_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLocaleLowerCase("en-US"))
      .filter(Boolean),
  );

export const exigirAdminCrm = async (req: Request, res: Response, next: NextFunction) => {
  const auth = obterAuthAdmin();
  if (!auth) {
    res.status(503).json({ error: "Autenticacao administrativa indisponivel.", code: "FIREBASE_ADMIN_UNAVAILABLE" });
    return;
  }

  const authorization = req.get("Authorization")?.trim() ?? "";
  const token = /^Bearer\s+(.+)$/i.exec(authorization)?.[1]?.trim() ?? "";
  if (!token) {
    res.status(401).json({ error: "Autenticacao necessaria.", code: "AUTH_REQUIRED" });
    return;
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const email = typeof decoded.email === "string" ? decoded.email.trim() : "";
    const allowlist = allowedEmails();
    if (allowlist.size === 0 && decoded.admin !== true) {
      res.status(503).json({ error: "A politica de acesso do CRM nao esta configurada.", code: "CRM_AUTH_POLICY_NOT_CONFIGURED" });
      return;
    }
    const allowed = decoded.admin === true || (decoded.email_verified === true && allowlist.has(email.toLocaleLowerCase("en-US")));
    if (!allowed) {
      res.status(403).json({ error: "Usuario sem permissao para gerenciar o CRM.", code: "CRM_PERMISSION_REQUIRED" });
      return;
    }
    res.locals.crmAdmin = { uid: decoded.uid, ...(email ? { email } : {}) } satisfies CrmAdminIdentity;
    next();
  } catch {
    res.status(401).json({ error: "Sessao invalida ou expirada.", code: "INVALID_AUTH_TOKEN" });
  }
};

export const obterIdentidadeAdminCrm = (res: Response): CrmAdminIdentity => {
  const identity = res.locals.crmAdmin as CrmAdminIdentity | undefined;
  if (!identity?.uid) throw new Error("Identidade administrativa ausente.");
  return identity;
};
