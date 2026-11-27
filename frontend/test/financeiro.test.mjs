import assert from 'node:assert/strict';
import test from 'node:test';
import {
  apurarComissaoAsaas,
  classificacaoFinanceiraReserva,
  normalizarDiaFinanceiro,
  pagamentoAsaasRegistrado,
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
  assert.deepEqual(apurarComissaoAsaas(reservas, '2026-10-21', '2026-10-21'), {
    quantidade: 1, base: 290, comissao: 2.9,
  });
});

test('pagamento fora do período não entra mesmo com visita no período', () => {
  assert.equal(reservaNoPeriodoFinanceiro(checkout(), '2026-11-01', '2026-11-01'), false);
  assert.equal(apurarComissaoAsaas([checkout()], '2026-11-01', '2026-11-01').base, 0);
});

test('checkout sem data de pagamento pode aparecer para auditoria, mas não gera comissão', () => {
  const semPagamento = checkout({ paidAt: undefined, createdAt: '2026-10-21T12:00:00Z' });
  assert.equal(reservaNoPeriodoFinanceiro(semPagamento, '2026-10-21', '2026-10-21'), true);
  assert.equal(apurarComissaoAsaas([semPagamento], '2026-10-21', '2026-10-21').comissao, 0);
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

test('manual paga marcada como Asaas entra na mesma base de 1% do checkout', () => {
  const manualAsaas = checkout({ bookingSource: 'manual', paymentRecordedInAsaas: true, value: 123.45 });
  assert.equal(classificacaoFinanceiraReserva(manualAsaas), 'checkout');
  assert.equal(manualAsaas.bookingSource, 'manual', 'A origem permanece manual');
  assert.deepEqual(apurarComissaoAsaas([checkout(), manualAsaas], '2026-10-21', '2026-10-21'), {
    quantidade: 2, base: 413.45, comissao: 4.13,
  });
});

test('desmarcar Asaas retira a manual do filtro Asaas e do 1%, preservando a data', () => {
  const marcada = checkout({ bookingSource: 'manual', paymentRecordedInAsaas: true });
  const desmarcada = { ...marcada, paymentRecordedInAsaas: false };
  assert.equal(classificacaoFinanceiraReserva(desmarcada), 'manual');
  assert.deepEqual(apurarComissaoAsaas([desmarcada], '2026-10-21', '2026-10-21'), {
    quantidade: 0, base: 0, comissao: 0,
  });
  assert.equal(desmarcada.paidAt, marcada.paidAt);
});

test('marcação Asaas não inclui pendentes, canceladas ou estornadas no 1%', () => {
  const reservas = ['aguardando', 'pending', 'cancelado', 'refunded', 'estornado'].map((status) =>
    checkout({ bookingSource: 'manual', paymentRecordedInAsaas: true, status }));
  assert.equal(apurarComissaoAsaas(reservas, '2026-10-21', '2026-10-21').quantidade, 0);
});

test('manual antiga já marcada como Asaas usa cadastro e depois visita se não há data de pagamento', () => {
  const antiga = checkout({ bookingSource: 'manual', paymentRecordedInAsaas: true, paidAt: undefined });
  assert.equal(apurarComissaoAsaas([antiga], '2026-10-18', '2026-10-18').comissao, 2.9);
  assert.equal(apurarComissaoAsaas([antiga], '2026-11-01', '2026-11-01').comissao, 0);
  assert.equal(apurarComissaoAsaas([{ ...antiga, createdAt: undefined }], '2026-11-01', '2026-11-01').comissao, 2.9);
  assert.equal(apurarComissaoAsaas([{ ...antiga, createdAt: undefined, date: '' }], '2026-11-01', '2026-11-01').comissao, 0);
});

test('Asaas manual usa a data do pagamento em Brasília e não a data da visita', () => {
  const manual = checkout({ bookingSource: 'manual', paymentRecordedInAsaas: true, paidAt: '2026-10-22T01:00:00Z' });
  assert.equal(apurarComissaoAsaas([manual], '2026-10-21', '2026-10-21').quantidade, 1);
  assert.equal(apurarComissaoAsaas([manual], '2026-10-22', '2026-11-01').quantidade, 0);
});

test('registro explícito prevalece sobre origem checkout legada; ID e método não definem Asaas', () => {
  assert.equal(pagamentoAsaasRegistrado({ pagamentoRegistradoNoAsaas: true, origem: 'manual' }, 'manual'), true);
  assert.equal(pagamentoAsaasRegistrado({ pagamentoRegistradoNoAsaas: false, origem: 'checkout' }, 'manual'), false);
  assert.equal(pagamentoAsaasRegistrado({ origem: 'checkout' }, 'manual'), true);
  assert.equal(pagamentoAsaasRegistrado({ Origem: ' CHECKOUT ' }, 'manual'), true);
  assert.equal(pagamentoAsaasRegistrado({ origem: 'manual' }, 'manual'), false);
  assert.equal(pagamentoAsaasRegistrado({ pagamentoRegistradoNoAsaas: 'true', origem: 'checkout' }, 'manual'), false);
  assert.equal(pagamentoAsaasRegistrado({ asaasPaymentId: 'pay_test', formaPagamento: 'PIX' }, 'manual'), false);
});
