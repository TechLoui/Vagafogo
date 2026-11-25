import { useEffect, useState, type FormEvent } from 'react';
import { FaArrowRight, FaCalendarAlt, FaChartBar, FaCheckCircle, FaClock, FaLeaf, FaLink, FaReceipt, FaSyncAlt, FaTimesCircle, FaWallet } from 'react-icons/fa';
import { hojeEmSaoPaulo } from '../../utils/financeiro';
import { useAffiliateProfile } from './AffiliateAccess';
import { AffiliateApiError, getAffiliateSummary } from './affiliateService';
import { affiliateDate, affiliateMoney } from './affiliateUtils';
import { AffiliatePreparedState } from './AffiliatePreparedState';
import { AffiliateReport } from './AffiliateReport';
import { PartnerSharing } from './PartnerSharing';
import type { AffiliateSummary } from './types';
import './PartnerPortal.css';

type PartnerView = 'overview' | 'reservations' | 'reports' | 'sharing';

function PartnerOverview({ onNavigate }: { onNavigate: (view: PartnerView) => void }) {
  const today = hojeEmSaoPaulo();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [period, setPeriod] = useState({ from, to });
  const [summary, setSummary] = useState<AffiliateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodError, setPeriodError] = useState('');
  const [prepared, setPrepared] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setPrepared(false); setSummary(null);
    void getAffiliateSummary(period, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setSummary(result); })
      .catch((caught) => {
        if (controller.signal.aborted) return;
        if (caught instanceof AffiliateApiError && caught.code === 'AFFILIATES_NOT_ENABLED') setPrepared(true);
        else setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o resumo.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [period, refresh]);

  const applyPeriod = (event: FormEvent) => {
    event.preventDefault();
    if (!from || !to || from > to) { setPeriodError('Confira o início e o fim do período.'); return; }
    setPeriodError(''); setPeriod({ from, to });
  };
  const total = summary ? summary.paidCount + summary.pendingCount + summary.cancelledCount : 0;
  const paymentRate = summary && total > 0 ? new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 }).format(summary.paidCount / total) : '—';
  const average = summary && summary.paidCount > 0 ? affiliateMoney(summary.revenue / summary.paidCount) : '—';

  if (prepared) return <AffiliatePreparedState />;

  return (
    <section className="pp-overview" aria-labelledby="partner-overview-title">
      <div className="pp-section-heading"><div><h2 id="partner-overview-title">Suas indicações em números</h2><p>Um resumo das reservas atribuídas ao seu link.</p></div></div>
      <form className="pp-period" onSubmit={applyPeriod}>
        <label>De<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPeriodError(''); }} aria-invalid={Boolean(periodError)} aria-describedby={periodError ? 'partner-period-error' : undefined} required /></label>
        <label>Até<input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPeriodError(''); }} aria-invalid={Boolean(periodError)} aria-describedby={periodError ? 'partner-period-error' : undefined} required /></label>
        <button type="submit" className="aff-button" disabled={loading}>Aplicar período</button>
        <button type="button" className="aff-icon-button" aria-label="Atualizar resumo" title="Atualizar resumo" disabled={loading} onClick={() => setRefresh((value) => value + 1)}><FaSyncAlt className={loading ? 'aff-spin' : ''} aria-hidden="true" /></button>
      </form>
      {periodError && <p id="partner-period-error" className="aff-alert aff-alert--error" role="alert">{periodError}</p>}
      <p className="pp-period-caption"><FaCalendarAlt aria-hidden="true" /> {affiliateDate(period.from)} a {affiliateDate(period.to)} · São Paulo</p>
      {loading ? (
        <div className="pp-metrics pp-metrics--loading" role="status"><span className="pp-sr-only">Carregando resumo das reservas…</span>{Array.from({ length: 6 }, (_, index) => <div className="pp-metric-skeleton" key={index} aria-hidden="true"><span /><span /></div>)}</div>
      ) : error ? (
        <div className="pp-feedback"><p className="aff-alert aff-alert--error" role="alert">{error}</p><button type="button" className="aff-button aff-button--secondary" onClick={() => setRefresh((value) => value + 1)}><FaSyncAlt aria-hidden="true" /> Tentar novamente</button></div>
      ) : summary && (
        <>
          <div className="pp-metrics">
            <div className="pp-metric pp-metric--featured"><FaWallet aria-hidden="true" /><span>Valor das reservas pagas</span><strong>{affiliateMoney(summary.revenue)}</strong><small>Total pago no período</small></div>
            <div className="pp-metric"><FaCheckCircle aria-hidden="true" /><span>Reservas pagas</span><strong>{summary.paidCount}</strong><small>Pagamento confirmado</small></div>
            <div className="pp-metric"><FaClock aria-hidden="true" /><span>Aguardando pagamento</span><strong>{summary.pendingCount}</strong><small>Reservas pendentes</small></div>
            <div className="pp-metric"><FaTimesCircle aria-hidden="true" /><span>Canceladas ou estornadas</span><strong>{summary.cancelledCount}</strong><small>No período selecionado</small></div>
            <div className="pp-metric"><FaReceipt aria-hidden="true" /><span>Ticket médio pago</span><strong>{average}</strong><small>Valor pago ÷ reservas pagas</small></div>
            <div className="pp-metric"><FaChartBar aria-hidden="true" /><span>Taxa de pagamento</span><strong>{paymentRate}</strong><small>Pagas ÷ todas as {total} reservas</small></div>
          </div>
          <p className="pp-calculation-note">A taxa compara reservas pagas, pendentes e canceladas do período. Ela considera reservas, não visitantes.</p>
          {total === 0 && <div className="pp-empty-state"><span className="pp-heading-icon" aria-hidden="true"><FaLeaf /></span><h3>Nenhuma reserva neste período</h3><p>Escolha outro período ou compartilhe seu link para receber novas indicações.</p><button type="button" className="aff-button aff-button--secondary" onClick={() => onNavigate('sharing')}>Divulgar meu link <FaArrowRight aria-hidden="true" /></button></div>}
        </>
      )}
      <div className="pp-quick-actions">
        <button type="button" onClick={() => onNavigate('reservations')}><span className="pp-heading-icon"><FaReceipt aria-hidden="true" /></span><span><strong>Consultar reservas</strong><small>Veja o status e os detalhes das suas indicações.</small></span><FaArrowRight aria-hidden="true" /></button>
        <button type="button" onClick={() => onNavigate('sharing')}><span className="pp-heading-icon"><FaLink aria-hidden="true" /></span><span><strong>Compartilhar meu link</strong><small>Leve mais pessoas para conhecer o Vagafogo.</small></span><FaArrowRight aria-hidden="true" /></button>
      </div>
      <p className="aff-help">O período considera a data do pagamento nas reservas pagas e a data de criação nas demais.</p>
    </section>
  );
}

export function PartnerDashboard() {
  const profile = useAffiliateProfile();
  const [view, setView] = useState<PartnerView>('overview');
  const navigation = [
    { id: 'overview', label: 'Visão geral', icon: FaChartBar },
    { id: 'reservations', label: 'Reservas', icon: FaReceipt },
    { id: 'reports', label: 'Relatórios', icon: FaCalendarAlt },
    { id: 'sharing', label: 'Divulgação', icon: FaLink },
  ] as const;

  return (
    <div className="pp-dashboard">
      <div className="pp-hero">
        <div className="pp-identity"><span className="pp-eyebrow"><FaLeaf aria-hidden="true" /> Parceiro independente</span><h1>{profile.partner?.name || 'Suas indicações'}</h1><p>{profile.partner?.email || profile.identity.email}</p></div>
        <div className="pp-hero-note"><span className="pp-hero-mark" aria-hidden="true"><FaLeaf /></span><p>Mais pessoas<br /><strong>perto da natureza.</strong></p></div>
      </div>
      <nav className="pp-navigation" aria-label="Painel do parceiro independente">
        {navigation.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}><Icon aria-hidden="true" /><span>{label}</span></button>)}
      </nav>
      <div className="pp-view">
        {view === 'overview' && <PartnerOverview onNavigate={setView} />}
        {view === 'reservations' && <AffiliateReport view="reservations" showPartner={false} />}
        {view === 'reports' && <AffiliateReport view="reports" showPartner={false} />}
        {view === 'sharing' && <PartnerSharing />}
      </div>
    </div>
  );
}
