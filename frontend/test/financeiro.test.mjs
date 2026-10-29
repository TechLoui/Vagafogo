import assert from 'node:assert/strict';
import test from 'node:test';
import {
  apurarComissaoCheckout,
  normalizarDiaFinanceiro,
  reservaNoPeriodoFinanceiro,
} from '../src/utils/financeiro.ts';

const checkout = (overrides = {}) => ({
  bookingSource: 'checkout', status: 'pago', value: 290,
  createdAt: '2026-10-18T12:00:00Z', paidAt: '2026-10-21T16:00:00Z',
  date: '2026-11-01', ...overrides,
});

test('comissão usa somente checkout pago na data do pagamento', () => {
  const reservas = [
    checkout(),
    checkout({ bookingSource: 'manual', value: 130 }),
    checkout({ status: 'aguardando', value: 100 }),
    checkout({ status: 'cancelado', value: 200 }),
  ];
  assert.deepEqual(apurarComissaoCheckout(reservas, '2026-10-21', '2026-10-21'), {
    quantidade: 1, base: 290, comissao: 2.9,
  });
});

test('pagamento fora do período não entra mesmo com visita no período', () => {
  assert.equal(reservaNoPeriodoFinanceiro(checkout(), '2026-11-01', '2026-11-01'), false);
  assert.equal(apurarComissaoCheckout([checkout()], '2026-11-01', '2026-11-01').base, 0);
});

test('checkout sem data de pagamento pode aparecer para auditoria, mas não gera comissão', () => {
  const semPagamento = checkout({ paidAt: undefined, createdAt: '2026-10-21T12:00:00Z' });
  assert.equal(reservaNoPeriodoFinanceiro(semPagamento, '2026-10-21', '2026-10-21'), true);
  assert.equal(apurarComissaoCheckout([semPagamento], '2026-10-21', '2026-10-21').comissao, 0);
});

test('manual sem data de pagamento usa cadastro e depois visita legada', () => {
  const manual = checkout({ bookingSource: 'manual', paidAt: undefined });
  assert.equal(reservaNoPeriodoFinanceiro(manual, '2026-10-18', '2026-10-18'), true);
  assert.equal(reservaNoPeriodoFinanceiro({ ...manual, createdAt: undefined }, '2026-11-01', '2026-11-01'), true);
});

test('timestamps de pagamento seguem o dia de Brasília', () => {
  assert.equal(normalizarDiaFinanceiro('2026-10-22T01:00:00Z'), '2026-10-21');
  assert.equal(normalizarDiaFinanceiro('21/10/2026'), '2026-10-21');
});
