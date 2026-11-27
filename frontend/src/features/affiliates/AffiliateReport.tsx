import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FaCreditCard, FaDownload, FaEye, FaPen, FaQrcode, FaSearch, FaSyncAlt } from 'react-icons/fa';
import { hojeEmSaoPaulo } from '../../utils/financeiro';
import { affiliateDate, affiliateMoney, affiliateStatusLabel } from './affiliateUtils';
import { affiliatePaymentLabel, affiliatePeriodPreset, affiliateReservationCode, affiliateSalesCsv, affiliateSellerLabel, loadAffiliateSalesForExport } from './affiliateReportUtils';
import { AffiliateApiError, getAffiliateSales, getAffiliateSummary } from './affiliateService';
import { AffiliatePreparedState } from './AffiliatePreparedState';
import { AffiliateDialog } from './AffiliateDialog';
import { AgencyLogo } from './AgencyLogo';
import type { AffiliateReportQuery, AffiliateSale, AffiliateSummary } from './types';
import './AffiliateReport.css';

function PaymentMethod({ method }: { method?: AffiliateSale['paymentMethod'] }) {
  const Icon = method === 'PIX' ? FaQrcode : method === 'CREDIT_CARD' ? FaCreditCard : method === 'MANUAL' ? FaPen : null;
  return <span className="afr-payment">{Icon && <Icon aria-hidden="true" />}{affiliatePaymentLabel(method)}</span>;
}

function ReservationDetails({ sale, admin, onClose }: { sale: AffiliateSale; admin: boolean; onClose: () => void }) {
  return <AffiliateDialog title="Detalhes da reserva" onClose={onClose}>
    <div className="afr-detail">
      <span className={`aff-status ${sale.status === 'paid' ? 'is-active' : ''}`}>{affiliateStatusLabel(sale.status)}</span>
      <h3>{sale.activity || 'Experiência Vagafogo'}</h3>
      <dl>
        <div><dt>Código da reserva</dt><dd className="afr-code">{affiliateReservationCode(sale)}</dd></div>
        <div><dt>Data da visita</dt><dd>{affiliateDate(sale.date)}</dd></div>
        <div><dt>Horário</dt><dd>{sale.time || 'Não informado'}</dd></div>
        <div><dt>Visitantes</dt><dd>{sale.guestCount ?? 'Não informado'}</dd></div>
        <div><dt>Criada em</dt><dd>{affiliateDate(sale.createdAt)}</dd></div>
        {sale.agencyId && <div><dt>Origem</dt><dd>{affiliateSellerLabel(sale)}</dd></div>}
        <div><dt>Pagamento</dt><dd><PaymentMethod method={sale.paymentMethod} /></dd></div>
        <div><dt>Valor da reserva</dt><dd>{affiliateMoney(sale.value)}</dd></div>
        <div><dt>Pagamento confirmado em</dt><dd>{sale.paidAt ? affiliateDate(sale.paidAt) : 'Sem confirmação'}</dd></div>
        {admin && <div><dt>Comissão para repasse</dt><dd>{sale.commission == null ? 'Sem comissão elegível' : affiliateMoney(sale.commission)}</dd></div>}
      </dl>
      <button type="button" className="aff-button aff-button--secondary" onClick={onClose}>Fechar detalhes</button>
    </div>
  </AffiliateDialog>;
}

export function AffiliateReport({ admin = false, agencyId, partnerId, showPartner = true, view = 'summary' }: {
  admin?: boolean; agencyId?: string; partnerId?: string; showPartner?: boolean;
  view?: 'summary' | 'reservations' | 'reports';
}) {
  const today = hojeEmSaoPaulo();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AffiliateReportQuery['status']>();
  const [paymentMethod, setPaymentMethod] = useState<AffiliateReportQuery['paymentMethod']>();
  const [filters, setFilters] = useState<AffiliateReportQuery>({ from, to });
  const [summary, setSummary] = useState<AffiliateSummary | null>(null);
  const [sales, setSales] = useState<AffiliateSale[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState('');
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [prepared, setPrepared] = useState(false);
  const [selectedSale, setSelectedSale] = useState<AffiliateSale | null>(null);
  const requestVersion = useRef(0);
  const exportController = useRef<AbortController | null>(null);
  const pageInFlight = useRef(false);
  const query: AffiliateReportQuery = { ...filters, ...(agencyId ? { agencyId } : {}), ...(partnerId ? { partnerId } : {}) };
  const total = summary ? summary.paidCount + summary.pendingCount + summary.cancelledCount : null;

  useEffect(() => {
    const controller = new AbortController();
    requestVersion.current++;
    exportController.current?.abort(); exportController.current = null;
    pageInFlight.current = false;
    setLoadingMore(false); setExporting(false); setExportNotice(''); setSelectedSale(null);
    setSummary(null); setSales([]); setCursor(null);
    setLoading(true); setError(''); setPrepared(false);
    const selected = { ...filters, agencyId, partnerId };
    void Promise.all([getAffiliateSummary(selected, controller.signal), view === 'reports'
      ? Promise.resolve({ items: [] as AffiliateSale[], nextCursor: null })
      : getAffiliateSales(selected, undefined, controller.signal)])
      .then(([nextSummary, page]) => { if (!controller.signal.aborted) { setSummary(nextSummary); setSales(page.items); setCursor(page.nextCursor); } })
      .catch((caught) => {
        if (controller.signal.aborted) return;
        if (caught instanceof AffiliateApiError && caught.code === 'AFFILIATES_NOT_ENABLED') setPrepared(true);
        else setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o relatório.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); exportController.current?.abort(); };
  }, [filters, agencyId, partnerId, refresh, view]);

  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (!from || !to || from > to) { setError('Confira o início e o fim do período.'); return; }
    setFilters({ from, to, q: search.trim() || undefined, status, paymentMethod });
  };
  const preset = (kind: 'month' | 'last30' | 'previousMonth') => {
    const period = affiliatePeriodPreset(kind, today);
    setFrom(period.from); setTo(period.to);
    setFilters({ ...period, q: search.trim() || undefined, status, paymentMethod });
  };
  const more = async () => {
    if (!cursor || pageInFlight.current) return;
    const version = requestVersion.current;
    pageInFlight.current = true; setLoadingMore(true); setError('');
    try {
      const page = await getAffiliateSales(query, cursor);
      if (version !== requestVersion.current) return;
      setSales((current) => [...new Map([...current, ...page.items].map((item) => [item.id, item])).values()]);
      setCursor(page.nextCursor);
    } catch (caught) { if (version === requestVersion.current) setError(caught instanceof Error ? caught.message : 'Não foi possível carregar mais reservas.'); }
    finally { if (version === requestVersion.current) { pageInFlight.current = false; setLoadingMore(false); } }
  };
  const download = async () => {
    if (exportController.current || loading || total === 0) return;
    const controller = new AbortController();
    exportController.current = controller; setExporting(true); setExportNotice(''); setError('');
    try {
      const all = await loadAffiliateSalesForExport((next, signal) => getAffiliateSales(query, next, signal, 100), controller.signal);
      const csv = affiliateSalesCsv(all, { includePartner: showPartner, includeAgency: admin && !agencyId, includeCommission: admin });
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url; link.download = `vagafogo-reservas-${filters.from}-${filters.to}.csv`;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setExportNotice(`${all.length} ${all.length === 1 ? 'reserva exportada' : 'reservas exportadas'} com os filtros aplicados.`);
    } catch (caught) {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Não foi possível exportar as reservas.');
    } finally {
      if (exportController.current === controller) { exportController.current = null; setExporting(false); }
    }
  };

  if (prepared) return <AffiliatePreparedState />;
  const sections = [
    { label: 'Pagas', count: summary?.paidCount || 0, className: 'paid' },
    { label: 'Pendentes', count: summary?.pendingCount || 0, className: 'pending' },
    { label: 'Canceladas / estornadas', count: summary?.cancelledCount || 0, className: 'cancelled' },
  ];
  return <section className="aff-module afr-report">
    {view !== 'summary' && <div className="afr-heading"><div><h2>{view === 'reports' ? 'Relatórios das suas indicações' : 'Suas reservas'}</h2>
      <p>{view === 'reports' ? 'Confira os resultados do período e baixe o relatório completo.' : 'Consulte as reservas atribuídas ao seu link e acompanhe cada pagamento.'}</p></div></div>}
    <div className="aff-card afr-filter-card">
      <div className="afr-presets" aria-label="Períodos rápidos">{([['month', 'Este mês'], ['last30', 'Últimos 30 dias'], ['previousMonth', 'Mês passado']] as const).map(([key, label]) =>
        <button type="button" key={key} className="aff-text-button" disabled={loading} onClick={() => preset(key)}>{label}</button>)}</div>
      <form className="aff-period afr-filters" onSubmit={apply}>
        <label className="afr-date-filter">De<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} required /></label>
        <label className="afr-date-filter">Até<input type="date" value={to} onChange={(event) => setTo(event.target.value)} required /></label>
        <label>Status<select value={status || ''} onChange={(event) => setStatus((event.target.value || undefined) as AffiliateReportQuery['status'])}>
          <option value="">Todos</option><option value="paid">Pagas</option><option value="pending">Pendentes</option><option value="cancelled">Canceladas / estornadas</option>
        </select></label>
        <label>Pagamento<select value={paymentMethod || ''} onChange={(event) => setPaymentMethod((event.target.value || undefined) as AffiliateReportQuery['paymentMethod'])}>
          <option value="">Todos</option><option value="PIX">Pix</option><option value="CREDIT_CARD">Cartão</option><option value="MANUAL">Manual</option>
        </select></label>
        <label className="afr-search">Código ou experiência<span><FaSearch aria-hidden="true" /><input type="search" value={search} maxLength={120} placeholder="Buscar reservas" onChange={(event) => setSearch(event.target.value)} /></span></label>
        <button type="submit" className="aff-button" disabled={loading}>Aplicar filtros</button>
        <button type="button" className="aff-icon-button" title="Atualizar relatório" aria-label="Atualizar relatório" disabled={loading} onClick={() => setRefresh((value) => value + 1)}><FaSyncAlt className={loading ? 'aff-spin' : ''} /></button>
      </form>
      <div className="afr-applied"><span>Período aplicado: {affiliateDate(filters.from)} a {affiliateDate(filters.to)}{filters.q && ` · Busca: ${filters.q}`}{filters.status && ` · ${affiliateStatusLabel(filters.status)}`}{filters.paymentMethod && ` · ${affiliatePaymentLabel(filters.paymentMethod)}`}</span></div>
    </div>
    {error && <p className="aff-alert aff-alert--error" role="alert">{error}</p>}
    {loading && <p className="aff-empty afr-loading" role="status">Carregando reservas…</p>}
    {!loading && summary && view !== 'reservations' && <div className="aff-metrics afr-metrics">
      <div className="aff-card"><span>Reservas pagas</span><strong>{summary.paidCount}</strong></div>
      <div className="aff-card"><span>Valor das reservas pagas</span><strong>{affiliateMoney(summary.revenue)}</strong></div>
      <div className="aff-card"><span>Pendentes</span><strong>{summary.pendingCount}</strong></div>
      <div className="aff-card"><span>Canceladas / estornadas</span><strong>{summary.cancelledCount}</strong></div>
      {view === 'reports' && <div className="aff-card"><span>Ticket médio das pagas</span><strong>{affiliateMoney(summary.paidCount ? summary.revenue / summary.paidCount : 0)}</strong></div>}
      {admin && <div className="aff-card"><span>Comissão para repasse manual</span><strong>{summary.commission == null ? 'Sem comissão apurada' : affiliateMoney(summary.commission)}</strong></div>}
    </div>}
    {!loading && summary && view === 'reports' && <div className="aff-card afr-distribution">
      <div><h3>Situação das reservas</h3><p>{total} {total === 1 ? 'reserva no período' : 'reservas no período'}</p></div>
      {total ? <div className="afr-status-bar" aria-hidden="true">{sections.filter((item) => item.count > 0).map((item) => <span className={`afr-segment--${item.className}`} style={{ width: `${item.count / total * 100}%` }} key={item.className} />)}</div> : <p className="afr-muted">Os resultados aparecerão quando houver reservas atribuídas no período.</p>}
      <ul>{sections.map((item) => <li key={item.className}><span><i className={`afr-segment--${item.className}`} aria-hidden="true" />{item.label}</span><strong>{item.count}</strong></li>)}</ul>
    </div>}
    <div className="afr-results-toolbar">
      <p aria-live="polite">{total == null ? 'Consulte os resultados do período.' : view === 'reports' ? `${total} reservas com os filtros aplicados` : `${sales.length} de ${total} reservas carregadas`}</p>
      <div className="aff-actions"><button type="button" className="aff-button aff-button--secondary" disabled={loading || exporting || total == null || total === 0} onClick={() => void download()}><FaDownload aria-hidden="true" />{exporting ? 'Preparando CSV…' : 'Exportar CSV completo'}</button>
        {exporting && <button type="button" className="aff-text-button" onClick={() => { exportController.current?.abort(); exportController.current = null; setExporting(false); setExportNotice('Exportação cancelada.'); }}>Cancelar exportação</button>}</div>
    </div>
    {exportNotice && <p className="aff-alert" role="status">{exportNotice}</p>}
    {view === 'reports' && <p className="aff-help">O CSV inclui todas as páginas com os filtros aplicados. Valores em reais; cada linha corresponde a uma reserva.</p>}
    {view !== 'reports' && !loading && <div className="aff-card aff-scroll" aria-busy={loadingMore}>
      {sales.length === 0 ? <div className="afr-empty"><FaSearch aria-hidden="true" /><h3>{error ? 'Não foi possível carregar as reservas' : total && cursor ? 'Há reservas nas próximas páginas' : 'Nenhuma reserva encontrada'}</h3><p>{error ? 'Atualize o relatório para tentar novamente.' : total && cursor ? 'Continue a consulta para ver os resultados dos filtros aplicados.' : filters.q || filters.status || filters.paymentMethod ? 'Tente outro período ou ajuste os filtros.' : 'As reservas feitas pelo seu link aparecerão aqui.'}</p></div> :
        <table className="aff-table aff-table--responsive afr-table"><thead><tr><th>Reserva</th><th>Visita</th><th>Experiência</th>{admin && !agencyId && <th>Agência</th>}{showPartner && <th>Vendedor</th>}<th>Pagamento</th><th>Status</th><th>Valor</th>{admin && <th>Comissão</th>}<th><span className="afr-sr-only">Detalhes</span></th></tr></thead><tbody>
          {sales.map((sale) => <tr key={sale.id}>
            <td data-label="Reserva"><strong className="afr-code afr-code--table" title={affiliateReservationCode(sale)}>{affiliateReservationCode(sale)}</strong><span className="aff-table-subtitle">{sale.guestCount == null ? 'Visitantes não informados' : `${sale.guestCount} ${sale.guestCount === 1 ? 'visitante' : 'visitantes'}`}</span></td>
            <td className="aff-date" data-label="Visita">{affiliateDate(sale.date)}{sale.time && <span className="aff-table-subtitle">{sale.time}</span>}</td><td data-label="Experiência">{sale.activity || '—'}</td>
            {admin && !agencyId && <td data-label="Agência">{sale.agencyId ? <div className="aff-report-agency"><AgencyLogo url={sale.agencyLogoUrl} name={sale.agencyName || 'Agência'} /><span>{sale.agencyName || 'Agência'}</span></div> : 'Independente'}</td>}
            {showPartner && <td data-label="Vendedor">{affiliateSellerLabel(sale)}</td>}
            <td data-label="Pagamento"><PaymentMethod method={sale.paymentMethod} /></td>
            <td data-label="Status"><span className={`aff-status ${sale.status === 'paid' ? 'is-active' : ''}`}>{affiliateStatusLabel(sale.status)}</span></td>
            <td data-label="Valor" className="aff-money">{affiliateMoney(sale.value)}</td>
            {admin && <td data-label="Comissão" className="aff-money">{sale.commission == null ? '—' : affiliateMoney(sale.commission)}</td>}
            <td className="afr-details-cell"><button type="button" className="aff-button aff-button--secondary aff-button--small" aria-label={`Ver detalhes da reserva ${affiliateReservationCode(sale)}`} onClick={() => setSelectedSale(sale)}><FaEye aria-hidden="true" />Detalhes</button></td>
          </tr>)}
        </tbody></table>}
    </div>}
    {view !== 'reports' && cursor && !loading && (total == null || sales.length < total) && <button type="button" className="aff-button aff-button--secondary aff-load-more" disabled={loadingMore} onClick={() => void more()}>{loadingMore ? 'Carregando…' : sales.length ? 'Carregar mais reservas' : 'Continuar consulta'}</button>}
    <p className="aff-help">O período considera a data do pagamento nas reservas pagas e a data de criação nas demais. A data da visita é exibida separadamente.{admin && ' As comissões são apuradas para conferência e repasse manual pela administração.'}</p>
    {selectedSale && <ReservationDetails sale={selectedSale} admin={admin} onClose={() => setSelectedSale(null)} />}
  </section>;
}
