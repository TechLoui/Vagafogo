import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { FaCopy, FaExternalLinkAlt, FaLeaf, FaSignOutAlt } from 'react-icons/fa';
import { auth } from '../../firebase';
import logo from '../assets/logo.jpg';
import { useAffiliateProfile } from '../features/affiliates/AffiliateAccess';
import { AffiliateEntityManager } from '../features/affiliates/AffiliateManagement';
import { AffiliateReport } from '../features/affiliates/AffiliateReport';
import { AgencyLogo } from '../features/affiliates/AgencyLogo';
import { getAffiliateLinks } from '../features/affiliates/affiliateService';
import type { AffiliateLink } from '../features/affiliates/types';
import '../features/affiliates/Affiliate.css';

function PartnerLink() {
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  useEffect(() => {
    let disposed = false;
    void getAffiliateLinks().then((page) => { if (!disposed) setLinks(page.items); })
      .catch((caught) => { if (!disposed) setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o link.'); })
      .finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, []);
  return (
    <section className="aff-card aff-link-card">
      <div><h2>Seu link de reserva</h2><p>Compartilhe este endereço para identificar suas indicações.</p></div>
      {loading && <p role="status">Carregando link…</p>}
      {error && <p className="aff-alert aff-alert--error" role="alert">{error}</p>}
      {links.filter((link) => link.status === 'active').map((link) => <div key={link.id} className="aff-share-row">
        <input readOnly value={link.url} aria-label="Seu link de reserva" onFocus={(event) => event.currentTarget.select()} />
        <button type="button" className="aff-button" onClick={() => void navigator.clipboard.writeText(link.url).then(() => setCopied(link.id)).catch(() => setError('Selecione e copie o endereço do seu link.'))}><FaCopy />{copied === link.id ? 'Copiado' : 'Copiar link'}</button>
        <a className="aff-icon-button" href={link.url} target="_blank" rel="noreferrer" title="Abrir formulário" aria-label="Abrir formulário de reserva"><FaExternalLinkAlt /></a>
      </div>)}
      {!loading && !error && !links.some((link) => link.status === 'active') && <p className="aff-muted">Seu link está indisponível. Entre em contato com o responsável pelo seu cadastro.</p>}
    </section>
  );
}

export function AffiliatePortal() {
  const profile = useAffiliateProfile();
  const agency = profile.identity.role === 'agency';
  const entity = agency ? profile.agency : profile.partner;
  const [tab, setTab] = useState<'summary' | 'partners'>('summary');
  return (
    <div className="aff-portal">
      <header className="aff-portal-header">
        <a href="/" className="aff-brand"><img src={logo} alt="Vagafogo" /><span>Vagafogo<small>{agency ? 'Portal da agência' : 'Portal do parceiro'}</small></span></a>
        <button type="button" className="aff-button aff-button--secondary" onClick={() => void signOut(auth)}><FaSignOutAlt /> Sair</button>
      </header>
      <main className="aff-portal-main" id="conteudo-principal" tabIndex={-1}>
        <div className="aff-portal-heading">{agency && <AgencyLogo url={profile.agency?.logoUrl} name={entity?.name || 'Agência'} className="aff-agency-logo--large" />}<div><span className="aff-eyebrow"><FaLeaf aria-hidden="true" />{agency ? 'Agência' : 'Parceiro'}</span><h1>{entity?.name || 'Suas indicações'}</h1><p>{entity?.email || profile.identity.email}</p>{!agency && profile.agency && <div className="aff-network-brand"><AgencyLogo url={profile.agency.logoUrl} name={profile.agency.name} /><span>{profile.agency.name}</span></div>}</div></div>
        {agency && <nav className="aff-tabs" aria-label="Portal da agência"><button type="button" aria-current={tab === 'summary' ? 'page' : undefined} onClick={() => setTab('summary')}>Resumo e reservas</button><button type="button" aria-current={tab === 'partners' ? 'page' : undefined} onClick={() => setTab('partners')}>Parceiros</button></nav>}
        {agency && tab === 'partners' ? <AffiliateEntityManager kind="partners" agencyId={profile.identity.agencyId ?? undefined} /> : (
          <div className="aff-module">{!agency && <PartnerLink />}<AffiliateReport showPartner={agency} /></div>
        )}
      </main>
    </div>
  );
}
