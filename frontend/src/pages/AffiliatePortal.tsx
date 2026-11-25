import { useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { FaLeaf, FaSignOutAlt } from 'react-icons/fa';
import { auth } from '../../firebase';
import logo from '../assets/logo.jpg';
import { useAffiliateProfile } from '../features/affiliates/AffiliateAccess';
import { AffiliateEntityManager } from '../features/affiliates/AffiliateManagement';
import { AffiliateReport } from '../features/affiliates/AffiliateReport';
import { AgencyLogo } from '../features/affiliates/AgencyLogo';
import { PartnerPortalShell } from '../features/affiliates/PartnerPortalShell';
import { PartnerSharing } from '../features/affiliates/PartnerSharing';
import '../features/affiliates/Affiliate.css';

export function AffiliatePortal() {
  const profile = useAffiliateProfile();
  const agency = profile.identity.role === 'agency';
  const independent = profile.identity.role === 'partner' && profile.identity.agencyId === null;
  const entity = agency ? profile.agency : profile.partner;
  const [tab, setTab] = useState<'summary' | 'partners'>('summary');
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const logoutPending = useRef(false);
  const logout = async () => {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setSigningOut(true); setLogoutError('');
    try { await signOut(auth); }
    catch { setLogoutError('Não foi possível sair da conta. Tente novamente.'); }
    finally { logoutPending.current = false; setSigningOut(false); }
  };
  if (independent) return <PartnerPortalShell />;
  return (
    <div className="aff-portal">
      <header className="aff-portal-header">
        <a href="/" className="aff-brand"><img src={logo} alt="Vagafogo" /><span>Vagafogo<small>{agency ? 'Portal da agência' : 'Portal do parceiro'}</small></span></a>
        <button type="button" className="aff-button aff-button--secondary" disabled={signingOut} onClick={() => void logout()}><FaSignOutAlt aria-hidden="true" /> {signingOut ? 'Saindo…' : 'Sair'}</button>
      </header>
      <main className="aff-portal-main" id="conteudo-principal" tabIndex={-1}>
        {logoutError && <p className="aff-alert aff-alert--error pp-logout-error" role="alert">{logoutError}</p>}
        <div className="aff-portal-heading">{agency && <AgencyLogo url={profile.agency?.logoUrl} name={entity?.name || 'Agência'} className="aff-agency-logo--large" />}<div><span className="aff-eyebrow"><FaLeaf aria-hidden="true" />{agency ? 'Agência' : 'Parceiro'}</span><h1>{entity?.name || 'Suas indicações'}</h1><p>{entity?.email || profile.identity.email}</p>{!agency && profile.agency && <div className="aff-network-brand"><AgencyLogo url={profile.agency.logoUrl} name={profile.agency.name} /><span>{profile.agency.name}</span></div>}</div></div>
        {agency && <nav className="aff-tabs" aria-label="Portal da agência"><button type="button" aria-current={tab === 'summary' ? 'page' : undefined} onClick={() => setTab('summary')}>Resumo e reservas</button><button type="button" aria-current={tab === 'partners' ? 'page' : undefined} onClick={() => setTab('partners')}>Parceiros</button></nav>}
        {agency && tab === 'partners' ? <AffiliateEntityManager kind="partners" agencyId={profile.identity.agencyId ?? undefined} /> : (
          <div className="aff-module">{!agency && <PartnerSharing compact />}<AffiliateReport showPartner={agency} /></div>
        )}
      </main>
    </div>
  );
}
