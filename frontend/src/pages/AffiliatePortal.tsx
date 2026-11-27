import { useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { FaLeaf, FaPalette, FaSignOutAlt } from 'react-icons/fa';
import { auth } from '../../firebase';
import logo from '../assets/logo.jpg';
import { AffiliateProfileContext, useAffiliateProfile } from '../features/affiliates/AffiliateAccess';
import { AffiliateEntityManager } from '../features/affiliates/AffiliateManagement';
import { AffiliateReport } from '../features/affiliates/AffiliateReport';
import { AgencyLogo } from '../features/affiliates/AgencyLogo';
import { AgencyProfile } from '../features/affiliates/AgencyProfile';
import { AgencySellerPortal } from '../features/affiliates/AgencySellerPortal';
import { brandThemeStyle } from '../features/affiliates/affiliateBranding';
import type { AffiliateEntity } from '../features/affiliates/types';
import { PartnerPortalShell } from '../features/affiliates/PartnerPortalShell';
import { PartnerSharing } from '../features/affiliates/PartnerSharing';
import '../features/affiliates/Affiliate.css';

export function AffiliatePortal() {
  const profile = useAffiliateProfile();
  const agency = profile.identity.role === 'agency';
  const independent = profile.identity.role === 'partner' && profile.identity.agencyId === null;
  const [savedAgency, setSavedAgency] = useState<AffiliateEntity | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const sourceAgency = profile.agency;
  const useSaved = savedAgency?.id === sourceAgency?.id && (savedAgency?.updatedAt || '') >= (sourceAgency?.updatedAt || '');
  const agencyRecord = sourceAgency && useSaved ? { ...sourceAgency,
    logoUrl: savedAgency?.logoUrl, logoVersion: savedAgency?.logoVersion,
    logoUpdatedAt: savedAgency?.logoUpdatedAt, branding: savedAgency?.branding,
  } : sourceAgency;
  const entity = agency ? agencyRecord : profile.partner;
  const [tab, setTab] = useState<'summary' | 'partners' | 'profile'>('summary');
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const logoutPending = useRef(false);
  const navigateTab = (next: 'summary' | 'partners' | 'profile') => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const logout = async () => {
    if (logoutPending.current) return;
    logoutPending.current = true;
    setSigningOut(true); setLogoutError('');
    try { await signOut(auth); }
    catch { setLogoutError('Não foi possível sair da conta. Tente novamente.'); }
    finally { logoutPending.current = false; setSigningOut(false); }
  };
  if (independent) return <PartnerPortalShell />;
  if (!agency && profile.identity.role === 'partner') return <AgencySellerPortal />;
  return (
    <AffiliateProfileContext.Provider value={{ ...profile, ...(agencyRecord ? { agency: agencyRecord } : {}) }}>
    <div className="aff-portal ap-agency" style={brandThemeStyle(agencyRecord?.branding)}>
      <header className="aff-portal-header">
        <a href="/" className="aff-brand"><img src={logo} alt="Vagafogo" /><span>Vagafogo<small>{agency ? 'Portal da agência' : 'Portal do parceiro'}</small></span></a>
        <button type="button" className="aff-button aff-button--secondary" disabled={signingOut} onClick={() => void logout()}><FaSignOutAlt aria-hidden="true" /> {signingOut ? 'Saindo…' : 'Sair'}</button>
      </header>
      <main className="aff-portal-main" id="conteudo-principal" tabIndex={-1}>
        {logoutError && <p className="aff-alert aff-alert--error pp-logout-error" role="alert">{logoutError}</p>}
        <div className="aff-portal-heading">{agency && <AgencyLogo url={agencyRecord?.logoUrl} name={entity?.name || 'Agência'} className="aff-agency-logo--large" />}<div><span className="aff-eyebrow"><FaLeaf aria-hidden="true" />{agency ? 'Agência' : 'Parceiro'}</span><h1>{entity?.name || 'Suas indicações'}</h1><p>{entity?.email || profile.identity.email}</p></div></div>
        {agency && <nav className="aff-tabs" aria-label="Portal da agência"><button type="button" aria-current={tab === 'summary' ? 'page' : undefined} onClick={() => navigateTab('summary')}>Resumo e reservas</button><button type="button" aria-current={tab === 'partners' ? 'page' : undefined} onClick={() => navigateTab('partners')}>Vendedores</button><button type="button" aria-current={tab === 'profile' ? 'page' : undefined} onClick={() => navigateTab('profile')}>Perfil e marca</button></nav>}
        {agency && !agencyRecord?.logoUrl && !onboardingDismissed && tab !== 'profile' && <aside className="ap-onboarding" aria-label="Personalize sua agência"><span><FaPalette aria-hidden="true" /></span><div><h2>Deixe sua agência com a sua marca</h2><p>Adicione sua logo para personalizar o espaço dos vendedores. Você também pode fazer isso depois, em Perfil e marca.</p></div><div className="aff-actions"><button type="button" className="aff-text-button" onClick={() => setOnboardingDismissed(true)}>Agora não</button><button type="button" className="aff-button" onClick={() => navigateTab('profile')}>Adicionar logo</button></div></aside>}
        {agency && tab === 'profile' && agencyRecord ? <AgencyProfile key={agencyRecord.id} agency={agencyRecord} onSaved={(item) => { if (item.id === profile.identity.agencyId) setSavedAgency(item); }} onSkip={() => navigateTab('summary')} /> : agency && tab === 'partners' ? <AffiliateEntityManager kind="partners" agencyId={profile.identity.agencyId ?? undefined} /> : (
          <div className="aff-module">{!agency && <PartnerSharing compact />}<AffiliateReport showPartner={agency} /></div>
        )}
      </main>
    </div>
    </AffiliateProfileContext.Provider>
  );
}
