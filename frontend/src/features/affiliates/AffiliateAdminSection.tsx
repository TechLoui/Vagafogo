import { useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import { AffiliateEntityManager } from './AffiliateManagement';
import { AffiliateReport } from './AffiliateReport';
import { AgencyLogo } from './AgencyLogo';
import type { AffiliateEntity } from './types';
import './Affiliate.css';

export function AffiliateAdminSection() {
  const [tab, setTab] = useState<'agencies' | 'independent' | 'report'>('agencies');
  const [agency, setAgency] = useState<AffiliateEntity | null>(null);
  const [reportScope, setReportScope] = useState<{ name: string; agencyId?: string; partnerId?: string; logoUrl?: string | null } | null>(null);
  const openReport = (entity: AffiliateEntity, kind: 'agency' | 'partner') => {
    setReportScope({ name: entity.name, ...(kind === 'agency' ? { agencyId: entity.id, logoUrl: entity.logoUrl } : { partnerId: entity.id }) });
    setAgency(null); setTab('report');
  };
  return (
    <div className="aff-module">
      <nav className="aff-tabs" aria-label="Gestão de afiliados">
        {([
          ['agencies', 'Agências'], ['independent', 'Parceiros independentes'], ['report', 'Relatório de repasse'],
        ] as const).map(([id, label]) => <button key={id} type="button" aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); setAgency(null); setReportScope(null); }}>{label}</button>)}
      </nav>
      {agency && <div className="aff-context"><button type="button" className="aff-button aff-button--secondary" onClick={() => setAgency(null)}><FaArrowLeft /> Agências</button><h2>Parceiros de {agency.name}</h2></div>}
      {tab === 'report' && <div className="aff-context">{reportScope?.agencyId && <AgencyLogo url={reportScope.logoUrl} name={reportScope.name} />}<div className="aff-context-copy"><h2>{reportScope ? `Repasse de ${reportScope.name}` : 'Relatório de todos os afiliados'}</h2><p className="aff-help">Para conferir o total de uma agência ou independente, abra o relatório no respectivo cadastro.</p></div>{reportScope && <button type="button" className="aff-button aff-button--secondary" onClick={() => setReportScope(null)}>Ver todos</button>}</div>}
      {tab === 'report' ? <AffiliateReport key={reportScope?.agencyId ?? reportScope?.partnerId ?? 'all'} admin agencyId={reportScope?.agencyId} partnerId={reportScope?.partnerId} /> : tab === 'independent' ? (
        <AffiliateEntityManager key="independent" kind="partners" agencyId={null} commissionVisible onReport={(entity) => openReport(entity, 'partner')} />
      ) : agency ? (
        <AffiliateEntityManager key={agency.id} kind="partners" agencyId={agency.id} />
      ) : (
        <AffiliateEntityManager key="agencies" kind="agencies" commissionVisible onSelectAgency={setAgency} onReport={(entity) => openReport(entity, 'agency')} />
      )}
    </div>
  );
}
