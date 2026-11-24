import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { AffiliateProfileContext, useAffiliateSession } from "../features/affiliates/AffiliateAccess";
import { affiliateHome } from "../features/affiliates/affiliateUtils";
import { AffiliateApiError } from "../features/affiliates/affiliateService";
import type { AffiliateRole } from "../features/affiliates/types";
import "../features/affiliates/Affiliate.css";

export function ProtectedRoute({ children, redirectTo = "/login", allowedRoles = ['admin'] }: {
  children: ReactNode;
  redirectTo?: string;
  allowedRoles?: AffiliateRole[];
}) {
  const { user, profile, loading, error, retry } = useAffiliateSession();
  const location = useLocation();
  if (loading && !profile) return <div className="aff-access-state" role="status">Verificando seu acesso…</div>;
  if (!user) return <Navigate to={redirectTo} replace state={{ from: `${location.pathname}${location.search}` }} />;
  if (error || !profile) return (
    <main className="aff-access-state">
      <h1>{error instanceof AffiliateApiError && error.code === 'AFFILIATES_NOT_ENABLED' ? 'Painel em preparação' : 'Acesso indisponível'}</h1>
      <p role="alert">{error?.message || 'Sua conta ainda não possui um perfil habilitado.'}</p>
      <div className="aff-actions">
        <button type="button" className="aff-button" onClick={retry}>Verificar novamente</button>
        <button type="button" className="aff-button aff-button--secondary" onClick={() => void signOut(auth)}>Sair da conta</button>
      </div>
    </main>
  );
  if (!allowedRoles.includes(profile.identity.role)) return <Navigate to={affiliateHome(profile.identity.role)} replace />;
  return <AffiliateProfileContext.Provider value={profile}>{children}</AffiliateProfileContext.Provider>;
}
