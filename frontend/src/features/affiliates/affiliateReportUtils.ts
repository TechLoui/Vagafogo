import { affiliateDate, affiliateStatusLabel, commissionLabel } from './affiliateUtils.ts';
import type { AffiliatePage, AffiliateSale } from './types.ts';

export async function loadAffiliateSalesForExport(
  page: (cursor: string | undefined, signal: AbortSignal) => Promise<AffiliatePage<AffiliateSale>>,
  signal: AbortSignal,
  maxRecords = 10_000,
) {
  const all = new Map<string, AffiliateSale>();
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  do {
    signal.throwIfAborted();
    const result = await page(cursor, signal);
    signal.throwIfAborted();
    result.items.forEach((sale) => all.set(sale.id, sale));
    if (all.size > maxRecords) throw new Error('Escolha um período menor para exportar até 10 mil reservas por arquivo.');
    cursor = result.nextCursor || undefined;
    if (cursor && seenCursors.has(cursor)) throw new Error('Não foi possível concluir a exportação. Tente novamente.');
    if (cursor) seenCursors.add(cursor);
  } while (cursor);
  return [...all.values()];
}

export const affiliatePaymentLabel = (method?: AffiliateSale['paymentMethod']) => method
  ? ({ PIX: 'Pix', CREDIT_CARD: 'Cartão', MANUAL: 'Manual' })[method]
  : 'Não informado';

export const affiliateReservationCode = (sale: AffiliateSale) => sale.reservationCode || sale.id;

/** The CSV is for the full selected period, never just the currently visible page. */
export const affiliateSalesCsv = (sales: AffiliateSale[], options: {
  includePartner?: boolean;
  includeAgency?: boolean;
  includeCommission?: boolean;
} = {}) => {
  const header = ['Reserva', 'Criação', 'Visita', 'Horário', 'Experiência', 'Visitantes', 'Status', 'Pagamento', 'Pagamento confirmado em', 'Valor (BRL)'];
  if (options.includeAgency) header.push('Agência');
  if (options.includePartner) header.push('Parceiro');
  if (options.includeCommission) header.push('Regra de comissão', 'Comissão (BRL)');
  const rows = sales.map((sale) => {
    const row = [affiliateReservationCode(sale), affiliateDate(sale.createdAt), affiliateDate(sale.date), sale.time || '', sale.activity,
      sale.guestCount == null ? '' : String(sale.guestCount), affiliateStatusLabel(sale.status), affiliatePaymentLabel(sale.paymentMethod),
      sale.paidAt ? affiliateDate(sale.paidAt) : '', Number.isFinite(sale.value) ? sale.value.toFixed(2).replace('.', ',') : ''];
    if (options.includeAgency) row.push(sale.agencyName || 'Independente');
    if (options.includePartner) row.push(sale.partnerName || '');
    if (options.includeCommission) row.push(commissionLabel(sale.commissionRule), sale.commission == null ? '' : sale.commission.toFixed(2).replace('.', ','));
    return row;
  });
  const escape = (value: string) => {
    // Quoting alone does not stop spreadsheet formula execution in imported CSVs.
    const safe = /^[\s\uFEFF]*[=+\-@]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return `\uFEFF${[header, ...rows].map((row) => row.map(escape).join(';')).join('\r\n')}\r\n`;
};

export function affiliatePeriodPreset(kind: 'month' | 'last30' | 'previousMonth', today: string) {
  const parse = (value: string) => new Date(`${value}T12:00:00Z`);
  const day = (value: Date) => value.toISOString().slice(0, 10);
  if (kind === 'month') return { from: `${today.slice(0, 7)}-01`, to: today };
  if (kind === 'last30') {
    const start = parse(today); start.setUTCDate(start.getUTCDate() - 29);
    return { from: day(start), to: today };
  }
  const last = parse(`${today.slice(0, 7)}-01`); last.setUTCDate(0);
  return { from: `${day(last).slice(0, 7)}-01`, to: day(last) };
}
