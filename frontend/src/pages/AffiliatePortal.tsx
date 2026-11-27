import { useState } from 'react';
import { FaPalette } from 'react-icons/fa';
import { AffiliateProfileContext, useAffiliateProfile } from '../features/affiliates/AffiliateAccess';
import { AffiliateEntityManager } from '../features/affiliates/AffiliateManagement';
import { AgencyProfile } from '../features/affiliates/AgencyProfile';
import { AgencyOfficialLink } from '../features/affiliates/AgencyOfficialLink';
import { AgencyPortalShell, type AgencyPortalView } from '../features/affiliates/AgencyPortalShell';
import { AgencySellerPortal } from '../features/affiliates/AgencySellerPortal';
import { PartnerDashboard } from '../features/affiliates/PartnerDashboard';
import { PartnerPortalShell } from '../features/affiliates/PartnerPortalShell';
import type { AffiliateEntity, AffiliateLink } from '../features/affiliates/types';
import '../features/affiliates/Affiliate.css';

export function AffiliatePortal() {
  const profile = useAffiliateProfile();
  const [view, setView] = useState<AgencyPortalView>('overview');
  const [savedAgency, setSavedAgency] = useState<AffiliateEntity | null>(null);
  const [savedLink, setSavedLink] = useState<{ agencyId: string; publicSlug: string; linkUpdatedAt: string } | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const sourceAgency = profile.agency;
  const useSavedBrand = savedAgency?.id === sourceAgency?.id && (savedAgency?.updatedAt || '') >= (sourceAgency?.updatedAt || '');
  const brandedAgency = sourceAgency && useSavedBrand ? { ...sourceAgency,
    logoUrl: savedAgency?.logoUrl, logoVersion: savedAgency?.logoVersion,
    logoUpdatedAt: savedAgency?.logoUpdatedAt, branding: savedAgency?.branding,
  } : sourceAgency;
  const useSavedLink = savedLink?.agencyId === sourceAgency?.id && (savedLink?.linkUpdatedAt || '') >= (sourceAgency?.linkUpdatedAt || '');
  const agencyRecord = brandedAgency && useSavedLink ? { ...brandedAgency, publicSlug: savedLink?.publicSlug, linkUpdatedAt: savedLink?.linkUpdatedAt } : brandedAgency;

  const updateLink = (link: AffiliateLink) => {
    if (!link.agencyId || link.agencyId !== profile.identity.agencyId || link.partnerId !== null || !link.slug) return;
    setSavedLink({ agencyId: link.agencyId, publicSlug: link.slug, linkUpdatedAt: link.updatedAt || link.createdAt || new Date().toISOString() });
  };

  if (profile.identity.role === 'partner') return profile.identity.agencyId === null ? <PartnerPortalShell /> : <AgencySellerPortal />;
  if (profile.identity.role !== 'agency' || !agencyRecord || agencyRecord.id !== profile.identity.agencyId) return <main className="aff-access-state"><h1>Perfil indisponível</h1><p>Não foi possível carregar os dados da sua agência. Atualize a página para verificar seu acesso.</p></main>;

  return <AffiliateProfileContext.Provider value={{ ...profile, agency: agencyRecord }}>
    <AgencyPortalShell agency={agencyRecord} view={view} onNavigate={setView}>
      {!agencyRecord.logoUrl && !onboardingDismissed && view === 'overview' && <aside className="ap-onboarding" aria-label="Personalize sua agência"><span><FaPalette aria-hidden="true" /></span><div><h2>Deixe sua agência com a sua marca</h2><p>Adicione sua logo para personalizar o espaço dos vendedores. Você também pode fazer isso depois, em Perfil e marca.</p></div><div className="aff-actions"><button type="button" className="aff-text-button" onClick={() => setOnboardingDismissed(true)}>Agora não</button><button type="button" className="aff-button" onClick={() => setView('profile')}>Adicionar logo</button></div></aside>}
      {view === 'profile' ? <AgencyProfile key={agencyRecord.id} agency={agencyRecord} onSaved={(item) => { if (item.id === profile.identity.agencyId) setSavedAgency(item); }} onSkip={() => setView('overview')} />
        : view === 'sellers' ? <AffiliateEntityManager kind="partners" agencyId={profile.identity.agencyId ?? undefined} />
          : view === 'sharing' ? <AgencyOfficialLink agency={agencyRecord} onSaved={updateLink} />
            : <PartnerDashboard mode="agency" view={view} onNavigate={setView} onSellers={() => setView('sellers')} />}
    </AgencyPortalShell>
  </AffiliateProfileContext.Provider>;
}
