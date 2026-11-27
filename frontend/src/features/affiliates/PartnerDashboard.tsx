import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { FaArrowRight, FaArrowUp, FaCalendarAlt, FaCheckCircle, FaClock, FaLeaf, FaMapMarkerAlt, FaSyncAlt, FaTimesCircle, FaWallet } from 'react-icons/fa';
import forestImage from '../../assets/trilhaecologica/trilhaecologica-2.jpg';
import brunchImage from '../../assets/hero/hero-2-800.webp';
import { hojeEmSaoPaulo } from '../../utils/financeiro';
import { AffiliateApiError, getAffiliateSummary } from './affiliateService';
import { affiliateDate, affiliateMoney } from './affiliateUtils';
import { affiliatePeriodPreset } from './affiliateReportUtils';
import { AffiliatePreparedState } from './AffiliatePreparedState';
import { AffiliateReport } from './AffiliateReport';
import { PartnerSharing } from './PartnerSharing';
import { PortalArtwork } from './PortalArtwork';
import type { AffiliateSummary } from './types';
import './PartnerDashboard.css';

export type PartnerView = 'overview' | 'reservations' | 'reports' | 'sharing';
export type PartnerDashboardMode = 'partner' | 'agency';

function PartnerOverview({ onNavigate, mode, onSellers }: { onNavigate: (view: PartnerView) => void; mode: PartnerDashboardMode; onSellers?: () => void }) {
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
  const choosePeriod = (kind: 'month' | 'last30' | 'previousMonth') => {
    const next = affiliatePeriodPreset(kind, today);
    setFrom(next.from); setTo(next.to); setPeriodError(''); setPeriod(next);
  };
  const agency = mode === 'agency';
  const total = summary ? summary.paidCount + summary.pendingCount + summary.cancelledCount : 0;
  const rate = summary && total > 0 ? summary.paidCount / total : 0;
  const paymentRate = total > 0 ? new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 }).format(rate) : '—';
  const average = summary && summary.paidCount > 0 ? affiliateMoney(summary.revenue / summary.paidCount) : '—';
  const segments = summary ? [
    { label: 'Pagas', count: summary.paidCount, color: '#2f775c', icon: FaCheckCircle },
    { label: 'Pendentes', count: summary.pendingCount, color: '#d4a565', icon: FaClock },
    { label: 'Canceladas ou estornadas', count: summary.cancelledCount, color: '#c7d2cb', icon: FaTimesCircle },
  ] : [];
  let offset = 0;
  const circumference = 2 * Math.PI * 51;

  if (prepared) return <AffiliatePreparedState />;

  return <section className="pd-overview" aria-label={agency ? 'Visão geral da agência' : 'Visão geral da parceria'}>
    <div className="pd-hero">
      <img src={forestImage} alt="Riacho na mata preservada do Santuário Vagafogo" className="pd-hero-image" fetchPriority="high" />
      <div className="pd-hero-shade" />
      <div className="pd-hero-copy"><span className="pd-eyebrow"><FaLeaf aria-hidden="true" /> Conexões que fazem bem</span>
        <h2>{agency ? 'Sua agência,' : 'Sua parceria,'}<br /><em>{agency ? 'em boa companhia.' : 'em movimento.'}</em></h2>
        <p>{agency ? 'Mais pessoas perto da natureza, com a força da sua equipe.' : 'Cada indicação aproxima novas pessoas do Vagafogo.'}</p>
        <button type="button" onClick={() => onNavigate('sharing')} className="pd-hero-cta">{agency ? 'Divulgar minha agência' : 'Compartilhar meu link'} <FaArrowRight aria-hidden="true" /></button>
      </div>
      <span className="pd-hero-location"><FaMapMarkerAlt aria-hidden="true" /> Vagafogo · Pirenópolis</span>
    </div>

    <div className="pd-results-heading">
      <div><span className="pd-kicker">{agency ? 'RESULTADOS DA AGÊNCIA' : 'SEU DESEMPENHO'}</span><h2>Um olhar sobre seus resultados</h2><p>{agency ? 'As reservas da sua agência e dos seus vendedores, reunidas.' : 'Reservas atribuídas ao seu link, em um só lugar.'}</p></div>
      <form className="pd-period" onSubmit={applyPeriod}>
        <label>De<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPeriodError(''); }} aria-invalid={Boolean(periodError)} aria-describedby={periodError ? 'partner-period-error' : undefined} required /></label>
        <label>Até<input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPeriodError(''); }} aria-invalid={Boolean(periodError)} aria-describedby={periodError ? 'partner-period-error' : undefined} required /></label>
        <button type="submit" className="pd-period-apply" aria-label="Aplicar período" disabled={loading}><FaArrowRight aria-hidden="true" /><span>Aplicar</span></button>
        <button type="button" className="pd-period-refresh" aria-label="Atualizar resumo" title="Atualizar resumo" disabled={loading} onClick={() => setRefresh((value) => value + 1)}><FaSyncAlt className={loading ? 'aff-spin' : ''} aria-hidden="true" /></button>
      </form>
    </div>
    {periodError && <p id="partner-period-error" className="aff-alert aff-alert--error" role="alert">{periodError}</p>}
    <div className="pd-period-toolbar"><p className="pd-period-caption"><FaCalendarAlt aria-hidden="true" /> {affiliateDate(period.from)} a {affiliateDate(period.to)} · São Paulo</p><div className="pd-period-presets" aria-label="Períodos rápidos">{([['month', 'Este mês'], ['last30', 'Últimos 30 dias'], ['previousMonth', 'Mês passado']] as const).map(([kind, label]) => { const preset = affiliatePeriodPreset(kind, today); return <button key={kind} type="button" disabled={loading} aria-pressed={period.from === preset.from && period.to === preset.to} onClick={() => choosePeriod(kind)}>{label}</button>; })}</div></div>
    {loading ? <div className="pd-stat-grid" role="status"><span className="pd-sr-only">Carregando resumo das reservas…</span>{[0, 1, 2, 3].map((item) => <div className="pd-stat pd-skeleton" key={item} aria-hidden="true"><i /><span /><strong /></div>)}</div>
      : error ? <div className="pp-feedback"><p className="aff-alert aff-alert--error" role="alert">{error}</p><button type="button" className="aff-button aff-button--secondary" onClick={() => setRefresh((value) => value + 1)}>Tentar novamente</button></div>
      : summary && <>
        <div className="pd-stat-grid">
          {[
            { label: 'Valor das reservas pagas', value: affiliateMoney(summary.revenue), note: 'Pagamentos confirmados', icon: FaWallet, theme: 'revenue' },
            { label: 'Reservas pagas', value: String(summary.paidCount), note: 'Pagamento confirmado', icon: FaCheckCircle, theme: 'paid' },
            { label: 'Aguardando pagamento', value: String(summary.pendingCount), note: 'Reservas pendentes', icon: FaClock, theme: 'pending' },
            { label: 'Canceladas ou estornadas', value: String(summary.cancelledCount), note: 'No período selecionado', icon: FaTimesCircle, theme: 'cancelled' },
          ].map(({ label, value, note, icon: Icon, theme }, index) => <div className={`pd-stat pd-stat--${theme}`} style={{ '--pd-order': index } as CSSProperties} key={theme}><div className="pd-stat-top"><span>{label}</span><i><Icon aria-hidden="true" /></i></div><strong>{value}</strong><small><span />{note}</small></div>)}
        </div>
        <div className="pd-insight-grid">
          <div className="pd-panel pd-performance">
            <div className="pd-panel-heading"><div><span className="pd-kicker">PANORAMA DO PERÍODO</span><h3>{agency ? 'Como estão as reservas da agência' : 'Como estão suas indicações'}</h3></div><span className="pd-count-pill">{total} {total === 1 ? 'reserva' : 'reservas'}</span></div>
            <div className="pd-performance-body">
              <div className="pd-donut" role="img" aria-label={`${summary.paidCount} reservas pagas, ${summary.pendingCount} pendentes e ${summary.cancelledCount} canceladas ou estornadas`}>
                <svg viewBox="0 0 128 128" aria-hidden="true"><circle cx="64" cy="64" r="51" fill="none" stroke="#edf1eb" strokeWidth="11" />
                  {segments.map((item) => { const arc = total ? item.count / total * circumference : 0; const start = offset; offset += arc; return item.count > 0 && <circle className="pd-donut-segment" key={item.label} cx="64" cy="64" r="51" fill="none" stroke={item.color} strokeWidth="11" strokeDasharray={`${arc} ${circumference - arc}`} strokeDashoffset={-start} />; })}
                </svg><div><strong>{paymentRate}</strong><span>taxa de pagamento</span></div>
              </div>
              <ul className="pd-status-legend">{segments.map((item) => <li key={item.label}><span><i style={{ background: item.color }} />{item.label}</span><strong>{item.count}</strong></li>)}</ul>
            </div>
            <div className="pd-secondary-stats"><div><span>Ticket médio pago</span><strong>{average}</strong></div><div><span>Reservas no período</span><strong>{total}</strong></div><button type="button" onClick={() => onNavigate('reservations')}>Consultar reservas <FaArrowRight aria-hidden="true" /></button></div>
            <p className="pd-footnote">Taxa de pagamento: reservas pagas ÷ todas as reservas do período. A base considera reservas, não visitantes.</p>
          </div>
          <div className="pd-discover-card">
            <img src={brunchImage} alt="Brunch artesanal servido na Vagafogo" loading="lazy" />
            <div><span className="pd-kicker">BOAS EXPERIÊNCIAS SE COMPARTILHAM</span><h3>{agency ? 'Uma nova conexão,' : 'Sua próxima indicação'}<br />começa com um link.</h3><button type="button" onClick={() => onNavigate('sharing')}>{agency ? 'Divulgar a agência' : 'Divulgar meu link'} <FaArrowUp aria-hidden="true" /></button></div>
          </div>
        </div>
        {total === 0 && <div className="pd-empty-note"><FaLeaf aria-hidden="true" /><div><strong>Nenhuma reserva neste período.</strong><p>Escolha outro período ou divulgue {agency ? 'sua agência' : 'seu link'} para receber novas indicações.</p></div><button type="button" onClick={() => onNavigate('sharing')}>{agency ? 'Divulgar agência' : 'Ver meu link'} <FaArrowRight aria-hidden="true" /></button></div>}
      </>}
    <div className="pd-workspace-heading"><span className="pd-kicker">SUA PARCERIA, NA PRÁTICA</span><h2>O próximo passo está aqui</h2></div>
    <div className="pd-feature-grid">
      <button type="button" className="pd-feature-card" onClick={agency && onSellers ? onSellers : () => onNavigate('reservations')}><div><span className="pd-feature-label">{agency && onSellers ? 'SUA EQUIPE' : 'ACOMPANHAMENTO'}</span><h3>{agency && onSellers ? 'Seus vendedores' : 'Suas reservas'}</h3><p>{agency && onSellers ? 'Organize os acessos da sua equipe e acompanhe suas indicações.' : 'Consulte os detalhes e a situação de cada reserva indicada.'}</p><span className="pd-feature-link">{agency && onSellers ? 'Ver vendedores' : 'Consultar reservas'} <FaArrowRight aria-hidden="true" /></span></div><PortalArtwork kind={agency && onSellers ? 'network' : 'reservations'} className="pd-feature-artwork" /></button>
      <button type="button" className="pd-feature-card" onClick={() => onNavigate('reports')}><div><span className="pd-feature-label">VISÃO DOS RESULTADOS</span><h3>Seus relatórios</h3><p>Escolha um período, confira os pagamentos e baixe o relatório completo.</p><span className="pd-feature-link">Abrir relatórios <FaArrowRight aria-hidden="true" /></span></div><PortalArtwork kind={agency ? 'reservations' : 'network'} className="pd-feature-artwork" /></button>
      <button type="button" className="pd-feature-card" onClick={() => onNavigate('sharing')}><div><span className="pd-feature-label">NOVAS CONEXÕES</span><h3>{agency ? 'O link da sua agência' : 'Seu link, mais longe'}</h3><p>{agency ? 'Use o endereço oficial da agência para apresentar o Vagafogo.' : 'Encontre seu link de indicação e compartilhe uma boa experiência.'}</p><span className="pd-feature-link">{agency ? 'Divulgar agência' : 'Compartilhar link'} <FaArrowRight aria-hidden="true" /></span></div><PortalArtwork kind="sharing" className="pd-feature-artwork" /></button>
    </div>
    <p className="pd-footnote">O período considera a data do pagamento nas reservas pagas e a data de criação nas demais.</p>
  </section>;
}

export function PartnerDashboard({ view, onNavigate, mode = 'partner', onSellers }: { view: PartnerView; onNavigate: (view: PartnerView) => void; mode?: PartnerDashboardMode; onSellers?: () => void }) {
  return <div className={`pd-dashboard pd-dashboard--${mode}`}><div className="pd-page" key={view}>
    {view === 'overview' && <PartnerOverview onNavigate={onNavigate} mode={mode} onSellers={onSellers} />}
    {view === 'reservations' && <AffiliateReport view="reservations" showPartner={mode === 'agency'} />}
    {view === 'reports' && <AffiliateReport view="reports" showPartner={mode === 'agency'} />}
    {view === 'sharing' && <PartnerSharing />}
  </div></div>;
}
