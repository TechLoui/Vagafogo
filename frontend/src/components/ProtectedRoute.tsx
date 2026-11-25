import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AffiliateProfileContext, useAffiliateSession } from "../features/affiliates/AffiliateAccess";
import { AffiliateAccountChoice } from "../features/affiliates/AffiliateAccountChoice";
import { affiliateHome } from "../features/affiliates/affiliateUtils";
import { AffiliateApiError } from "../features/affiliates/affiliateService";
import type { AffiliateRole } from "../features/affiliates/types";
import "../features/affiliates/Affiliate.css";

export function ProtectedRoute({ children, redirectTo = "/login", allowedRoles = ['admin'], onRoleMismatch = 'redirect' }: {
  children: ReactNode;
  redirectTo?: string;
  allowedRoles?: AffiliateRole[];
  onRoleMismatch?: 'redirect' | 'switch-account';
}) {
  const { user, profile, loading, error, retry } = useAffiliateSession();
  const location = useLocation();
  if (loading && !profile) return <div className="aff-access-state" role="status">Verificando seu acesso…</div>;
  if (!user) return <Navigate to={redirectTo} replace state={{ from: `${location.pathname}${location.search}` }} />;
  if (error || !profile) return (
    <main className="aff-access-state">
      <h1>{error instanceof AffiliateApiError && error.code === 'AFFILIATES_NOT_ENABLED' ? 'Painel em preparação' : 'Acesso indisponível'}</h1>
      <p role="alert">{error?.message || 'Sua conta ainda não possui um perfil habilitado.'}</p>
      <AffiliateAccountChoice email={user.email} onRetry={retry} />
    </main>
  );
  if (!allowedRoles.includes(profile.identity.role)) return onRoleMismatch === 'switch-account' ? (
    <main className="aff-access-state">
      <h1>Escolha a conta para acessar este painel</h1>
      <p>Para abrir este endereço, entre com a conta do {allowedRoles.includes('agency') ? 'responsável pela agência' : 'parceiro'}.</p>
      <AffiliateAccountChoice identity={profile.identity} email={user.email} />
    </main>
  ) : <Navigate to={affiliateHome(profile.identity.role)} replace />;
  return <AffiliateProfileContext.Provider value={profile}>{children}</AffiliateProfileContext.Provider>;
}
