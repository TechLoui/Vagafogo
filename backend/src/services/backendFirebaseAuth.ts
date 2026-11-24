export const BACKEND_FIREBASE_UID = "vagafogo-server-backend";

type BackendAuthDependencies = {
  getAdminAuth: () => { createCustomToken(uid: string, claims: Record<string, unknown>): Promise<string> } | null;
  signIn: (customToken: string) => Promise<unknown>;
};

/** A single authenticated Web SDK session keeps existing services behind private rules. */
export const criarInicializadorFirebaseBackend = ({ getAdminAuth, signIn }: BackendAuthDependencies) => {
  let initialized = false;
  let pending: Promise<void> | undefined;
  return (): Promise<void> => {
    if (initialized) return Promise.resolve();
    if (pending) return pending;
    pending = (async () => {
      const adminAuth = getAdminAuth();
      if (!adminAuth) throw new Error("BACKEND_FIREBASE_AUTH_UNAVAILABLE");
      const token = await adminAuth.createCustomToken(BACKEND_FIREBASE_UID, { serverBackend: true });
      await signIn(token);
      initialized = true;
    })().catch(() => {
      // Do not log Firebase credential/token payloads or allow an anonymous fallback.
      throw new Error("BACKEND_FIREBASE_AUTH_UNAVAILABLE");
    }).finally(() => { pending = undefined; });
    return pending;
  };
};
