import test from 'node:test';
import assert from 'node:assert/strict';
import { preencherReservaAsaas } from '../src/utils/preenchimentoReservaAsaas.ts';
import { camposRegistroPagamentoManual } from '../src/utils/registroPagamentoManual.ts';
import { reservaManualNaExibicao } from '../src/utils/classificacaoPagamentoReserva.ts';
import { pagamentoAsaasRegistrado, classificacaoFinanceiraReserva, apurarComissaoAsaas } from '../src/utils/financeiro.ts';

const now = new Date('2026-11-27T15:00:00.000Z');
const catalog = [{ id: 'package', nome: 'Synthetic Brunch', perguntasPersonalizadas: [
  { id: 'question', pergunta: 'Pergunta de preferência', tipo: 'texto', obrigatoria: false },
] }];
const manual = (extra = {}) => ({
  id: 'synthetic-reservation', origem: 'manual', criadaManualmente: true,
  pagamentoRegistradoNoAsaas: false, status: 'pago', confirmada: true,
  data: '2026-12-10', criadoEm: '2026-11-20T12:00:00.000Z', valor: 345.67,
  asaasPaymentId: 'synthetic-existing-provider-id', pagamentoId: 'synthetic-existing-payment-id',
  participantesPorTipo: { adulto: 2, crianca: 1 }, idadesPorTipo: { crianca: [7] },
  commercialAttribution: { agencyId: 'synthetic-agency', partnerId: null, commissionRule: { mode: 'percent', value: 10 } },
  whatsappEnviado: false, whatsappBoasVindasEnviado: false, ...extra,
});
const register = (source, random, original = source, when = now) => {
  const draft = { ...source, ...preencherReservaAsaas(source, catalog, random), pagamentoRegistradoNoAsaas: true };
  return { ...draft, ...camposRegistroPagamentoManual(draft, original, when) };
};
const financial = (source) => ({
  bookingSource: 'manual', paymentRecordedInAsaas: pagamentoAsaasRegistrado(source, 'manual'),
  createdAt: source.criadoEm, paidAt: source.dataPagamento?.toISOString(),
  date: source.data, status: source.status, value: source.valor,
});
const noRandom = () => { throw Error('A converted reservation must not be drawn again'); };

test('conversão paga tira o selo Manual, registra pagamento e entra no 1% sem reescrever a reserva', () => {
  const source = manual();
  const before = structuredClone(source);
  assert.equal(reservaManualNaExibicao(source, true), true);
  assert.deepEqual(apurarComissaoAsaas([financial(source)], '2026-11-27', '2026-11-27'), { quantidade: 0, base: 0, comissao: 0 });
  const converted = register(source, () => 0.9);
  assert.equal(converted.formaPagamento, 'CREDIT_CARD');
  assert.equal(converted.formaPagamentoAutomatica, true);
  assert.equal(converted.perguntasPersonalizadas[0].respostaAutomatica, true);
  assert.equal(reservaManualNaExibicao(converted, true), false);
  assert.equal(classificacaoFinanceiraReserva(financial(converted)), 'checkout');
  assert.deepEqual(converted.dataPagamento, now);
  assert.deepEqual(apurarComissaoAsaas([financial(converted)], '2026-11-27', '2026-11-27'), { quantidade: 1, base: 345.67, comissao: 3.46 });
  for (const field of ['origem', 'criadaManualmente', 'status', 'confirmada', 'data', 'valor', 'asaasPaymentId', 'pagamentoId', 'idadesPorTipo', 'participantesPorTipo', 'commercialAttribution', 'whatsappEnviado', 'whatsappBoasVindasEnviado']) {
    assert.deepEqual(converted[field], source[field], field);
  }
  assert.deepEqual(source, before);
});

test('reabertura de conversão já salva não sorteia método ou respostas nem muda data, valores e IDs', () => {
  const first = register(manual(), () => 0);
  const reopened = register({ ...first, observacao: 'Edição de texto' }, noRandom, first, new Date('2026-12-20T12:00:00.000Z'));
  assert.equal(reopened.formaPagamento, 'PIX');
  assert.equal(reopened.formaPagamentoAutomatica, true);
  assert.equal(reopened.dataPagamento, first.dataPagamento);
  assert.deepEqual(reopened.perguntasPersonalizadas, first.perguntasPersonalizadas);
  assert.deepEqual(reopened.idadesPorTipo, { crianca: [7] });
  assert.equal(reopened.asaasPaymentId, first.asaasPaymentId);
  assert.equal(reopened.pagamentoId, first.pagamentoId);
  assert.deepEqual(apurarComissaoAsaas([financial(reopened)], '2026-12-20', '2026-12-20'), { quantidade: 0, base: 0, comissao: 0 });
});

test('marcar pendentes e canceladas não confirma pagamento nem gera comissão; confirmação posterior explícita entra uma vez', () => {
  for (const status of ['pre_reserva', 'aguardando', 'pending', 'cancelado', 'estornado', 'refunded']) {
    const marked = register(manual({ status }), () => 0);
    assert.equal(marked.status, status);
    assert.equal(marked.dataPagamento, undefined);
    assert.equal(reservaManualNaExibicao(marked, true), false);
    assert.deepEqual(apurarComissaoAsaas([financial(marked)], '2026-11-01', '2026-11-30'), { quantidade: 0, base: 0, comissao: 0 });
  }
  const pending = register(manual({ status: 'aguardando' }), () => 0);
  const paid = register({ ...pending, status: 'pago' }, noRandom, pending);
  assert.deepEqual(paid.dataPagamento, now);
  assert.deepEqual(apurarComissaoAsaas([financial(paid)], '2026-11-27', '2026-11-27'), { quantidade: 1, base: 345.67, comissao: 3.46 });
});
