import { useEffect, useRef, useState, type FormEvent } from 'react';
import { FaSyncAlt } from 'react-icons/fa';
import { hojeEmSaoPaulo } from '../../utils/financeiro';
import { affiliateDate, affiliateMoney, affiliateStatusLabel } from './affiliateUtils';
import { AffiliateApiError, getAffiliateSales, getAffiliateSummary } from './affiliateService';
import { AffiliatePreparedState } from './AffiliatePreparedState';
import type { AffiliateReportQuery, AffiliateSale, AffiliateSummary } from './types';

export function AffiliateReport({ admin = false, agencyId, partnerId, showPartner = true }: { admin?: boolean; agencyId?: string; partnerId?: string; showPartner?: boolean }) {
  const today = hojeEmSaoPaulo();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [period, setPeriod] = useState({ from, to });
  const [summary, setSummary] = useState<AffiliateSummary | null>(null);
  const [sales, setSales] = useState<AffiliateSale[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [prepared, setPrepared] = useState(false);
  const requestVersion = useRef(0);
  const query: AffiliateReportQuery = { ...period, ...(agencyId ? { agencyId } : {}), ...(partnerId ? { partnerId } : {}) };

  useEffect(() => {
    const controller = new AbortController();
    requestVersion.current++;
    setLoadingMore(false);
    setSummary(null); setSales([]); setCursor(null);
    setLoading(true); setError(''); setPrepared(false);
    const selected = { ...period, agencyId, partnerId };
    void Promise.all([getAffiliateSummary(selected, controller.signal), getAffiliateSales(selected, undefined, controller.signal)])
      .then(([nextSummary, page]) => { if (!controller.signal.aborted) { setSummary(nextSummary); setSales(page.items); setCursor(page.nextCursor); } })
      .catch((caught) => {
        if (controller.signal.aborted) return;
        if (caught instanceof AffiliateApiError && caught.code === 'AFFILIATES_NOT_ENABLED') setPrepared(true);
        else setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o relatório.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [period, agencyId, partnerId, refresh]);

  const apply = (event: FormEvent) => {
    event.preventDefault();
    if (!from || !to || from > to) { setError('Confira o início e o fim do período.'); return; }
    setPeriod({ from, to });
  };
  const more = async () => {
    if (!cursor || loadingMore) return;
    const version = requestVersion.current;
    setLoadingMore(true); setError('');
    try {
      const page = await getAffiliateSales(query, cursor);
      if (version !== requestVersion.current) return;
      setSales((current) => [...new Map([...current, ...page.items].map((item) => [item.id, item])).values()]);
      setCursor(page.nextCursor);
    } catch (caught) { if (version === requestVersion.current) setError(caught instanceof Error ? caught.message : 'Não foi possível carregar mais reservas.'); }
    finally { if (version === requestVersion.current) setLoadingMore(false); }
  };

  if (prepared) return <AffiliatePreparedState />;

  return (
    <section className="aff-module">
      <form className="aff-period" onSubmit={apply}>
        <label>De<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} required /></label>
        <label>Até<input type="date" value={to} onChange={(event) => setTo(event.target.value)} required /></label>
        <button type="submit" className="aff-button aff-button--secondary" disabled={loading}>Aplicar período</button>
        <button type="button" className="aff-icon-button" title="Atualizar relatório" aria-label="Atualizar relatório" disabled={loading} onClick={() => setRefresh((value) => value + 1)}><FaSyncAlt className={loading ? 'aff-spin' : ''} /></button>
      </form>
      {error && <p className="aff-alert aff-alert--error" role="alert">{error}</p>}
      {loading && !summary ? <p className="aff-empty" role="status">Carregando reservas…</p> : summary && (
        <div className="aff-metrics" aria-busy={loading}>
          <div className="aff-card"><span>Reservas fechadas</span><strong>{summary.paidCount}</strong></div>
          <div className="aff-card"><span>Valor das reservas pagas</span><strong>{affiliateMoney(summary.revenue)}</strong></div>
          <div className="aff-card"><span>Pendentes</span><strong>{summary.pendingCount}</strong></div>
          {admin && <div className="aff-card"><span>Comissão para repasse manual</span><strong>{summary.commission == null ? 'Não definida' : affiliateMoney(summary.commission)}</strong></div>}
        </div>
      )}
      <div className="aff-card aff-scroll" aria-busy={loading}>
        {sales.length === 0 ? <p className="aff-empty">{loading ? 'Carregando reservas…' : error ? 'Relatório não carregado. Tente atualizar.' : 'Nenhuma reserva atribuída neste período.'}</p> : (
          <table className="aff-table"><thead><tr><th>Visita</th><th>Experiência</th>{showPartner && <th>Parceiro</th>}<th>Status</th><th>Valor</th>{admin && <th>Comissão</th>}</tr></thead><tbody>
            {sales.map((sale) => <tr key={sale.id}>
              <td className="aff-date">{affiliateDate(sale.date)}</td><td>{sale.activity || '—'}</td>{showPartner && <td>{sale.partnerName || '—'}</td>}
              <td><span className={`aff-status ${sale.paidAt ? 'is-active' : ''}`}>{affiliateStatusLabel(sale.status)}</span></td>
              <td className="aff-money">{affiliateMoney(sale.value)}</td>
              {admin && <td className="aff-money">{sale.commission == null ? '—' : affiliateMoney(sale.commission)}</td>}
            </tr>)}
          </tbody></table>
        )}
      </div>
      {cursor && <button type="button" className="aff-button aff-button--secondary aff-load-more" disabled={loadingMore || loading} onClick={() => void more()}>{loadingMore ? 'Carregando…' : 'Carregar mais reservas'}</button>}
      <p className="aff-help">O período considera a data do pagamento nas reservas pagas e a data de criação nas demais. A coluna Visita mostra o dia da experiência.{admin && ' As comissões são apuradas para conferência e repasse manual pela administração.'}</p>
    </section>
  );
}
