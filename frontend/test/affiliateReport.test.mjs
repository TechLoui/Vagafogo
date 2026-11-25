import test from 'node:test';
import assert from 'node:assert/strict';
import { affiliatePaymentLabel, affiliatePeriodPreset, affiliateSalesCsv, loadAffiliateSalesForExport } from '../src/features/affiliates/affiliateReportUtils.ts';

const sale = {
  id: 'reserva-original-123', reservationCode: 'reserva-original-123', createdAt: '2026-11-01T02:00:00Z',
  date: '2026-11-30', time: '10:00', activity: 'Brunch', guestCount: 3,
  status: 'paid', value: 315.5, paidAt: '2026-11-25T12:00:00Z', paymentMethod: 'PIX',
  partnerId: 'partner', partnerName: 'Parceiro', agencyId: null, commission: 31.55,
  commissionRule: { mode: 'percent', value: 10 },
};

test('exportação externa contém os dados de consulta e omite comissão e campos fora do DTO', () => {
  const csv = affiliateSalesCsv([{ ...sale, cpf: 'CONFIDENTIAL_CPF', email: 'CONFIDENTIAL_EMAIL', cartao: 'CONFIDENTIAL_CARD' }]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /"reserva-original-123";"31\/10\/2026";"30\/11\/2026";"10:00";"Brunch";"3";"Paga";"Pix";"25\/11\/2026";"315,50"/);
  assert.doesNotMatch(csv, /comissão|31,55|CONFIDENTIAL|commission/i);
  assert.match(affiliateSalesCsv([sale], { includeCommission: true }), /"Percentual|10%/);
  assert.match(affiliateSalesCsv([sale], { includeCommission: true }), /"31,55"/);
});

test('CSV preserva quebras/aspas e neutraliza fórmulas nas células de texto exportadas', () => {
  const csv = affiliateSalesCsv([{ ...sale, activity: '  =HYPERLINK("malicioso");\nconteúdo', partnerName: '@SOMA(1;2)' }], { includePartner: true });
  assert.ok(csv.includes('"\'  =HYPERLINK(""malicioso"");\nconteúdo"'));
  assert.ok(csv.includes('"\'@SOMA(1;2)"'));
  assert.match(csv, /"315,50"/);
});

test('método e visitantes ausentes permanecem desconhecidos, sem inventar pagamento manual', () => {
  assert.equal(affiliatePaymentLabel(null), 'Não informado');
  assert.equal(affiliatePaymentLabel('MANUAL'), 'Manual');
  const csv = affiliateSalesCsv([{ ...sale, paymentMethod: null, guestCount: null, time: null }]);
  assert.match(csv, /"Brunch";"";"Paga";"Não informado"/);
});

test('atalhos de período incluem 30 dias e tratam a virada do ano e fevereiro bissexto', () => {
  assert.deepEqual(affiliatePeriodPreset('last30', '2026-01-10'), { from: '2025-12-12', to: '2026-01-10' });
  assert.deepEqual(affiliatePeriodPreset('previousMonth', '2026-01-25'), { from: '2025-12-01', to: '2025-12-31' });
  assert.deepEqual(affiliatePeriodPreset('previousMonth', '2024-03-01'), { from: '2024-02-01', to: '2024-02-29' });
  assert.deepEqual(affiliatePeriodPreset('month', '2026-11-25'), { from: '2026-11-01', to: '2026-11-25' });
});

test('exportação percorre páginas vazias e deduplica sem limitar aos registros visíveis', async () => {
  const calls = [];
  const pages = {
    initial: { items: [], nextCursor: 'raw-25' },
    'raw-25': { items: [sale], nextCursor: 'raw-50' },
    'raw-50': { items: [sale, { ...sale, id: 'outra-reserva' }], nextCursor: null },
  };
  const result = await loadAffiliateSalesForExport(async (cursor) => {
    calls.push(cursor);
    return pages[cursor || 'initial'];
  }, new AbortController().signal);
  assert.deepEqual(calls, [undefined, 'raw-25', 'raw-50']);
  assert.deepEqual(result.map((row) => row.id), [sale.id, 'outra-reserva']);
});

test('falha, limite e cursor repetido rejeitam a exportação inteira', async () => {
  const signal = new AbortController().signal;
  await assert.rejects(loadAffiliateSalesForExport(async () => ({ items: [sale], nextCursor: 'repetido' }), signal), /concluir a exportação/);
  await assert.rejects(loadAffiliateSalesForExport(async () => ({ items: [sale, { ...sale, id: 'outra' }], nextCursor: null }), signal, 1), /período menor/);
  let calls = 0;
  await assert.rejects(loadAffiliateSalesForExport(async () => {
    if (calls++) throw new Error('falha na segunda página');
    return { items: [sale], nextCursor: 'seguinte' };
  }, signal), /segunda página/);
});

test('cancelamento interrompe a exportação antes de buscar a página seguinte', async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(loadAffiliateSalesForExport(async () => {
    calls++;
    controller.abort();
    return { items: [sale], nextCursor: 'seguinte' };
  }, controller.signal), { name: 'AbortError' });
  assert.equal(calls, 1);
});
