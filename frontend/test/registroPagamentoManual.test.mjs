import assert from 'node:assert/strict';
import test from 'node:test';
import { camposRegistroPagamentoManual, dataPagamentoValida, pagamentoAsaasNoEditor } from '../src/utils/registroPagamentoManual.ts';

const agora = new Date('2026-11-27T15:45:00.000Z');
const paga = (extra = {}) => ({ origem: 'manual', criadaManualmente: true, status: 'confirmado', pagamentoRegistradoNoAsaas: true, ...extra });
const salvar = (reserva, instante = agora, original = null) => ({ ...reserva, ...camposRegistroPagamentoManual(reserva, original, instante) });

test('novo registro manual pago no Asaas recebe a data do salvamento sem mudar origem ou status', () => {
  const original = paga();
  const snapshot = structuredClone(original);
  const saved = salvar(original);
  assert.deepEqual(saved.dataPagamento, agora);
  assert.equal(saved.origem, 'manual'); assert.equal(saved.criadaManualmente, true); assert.equal(saved.status, 'confirmado');
  assert.deepEqual(original, snapshot);
});

test('edição de reserva manual paga ganha data quando Asaas é marcado', () => {
  const original = paga({ id: 'reserva-existente', pagamentoRegistradoNoAsaas: false, status: 'pago' });
  const saved = salvar({ ...original, pagamentoRegistradoNoAsaas: true }, agora, original);
  assert.deepEqual(saved.dataPagamento, agora);
  assert.equal(saved.id, original.id);
});

test('desmarcar e marcar novamente preserva a primeira data, sem deslocar o período financeiro', () => {
  const first = salvar(paga());
  const off = salvar({ ...first, pagamentoRegistradoNoAsaas: false }, new Date('2026-11-28T12:00:00Z'), first);
  const on = salvar({ ...off, pagamentoRegistradoNoAsaas: true }, new Date('2026-12-01T12:00:00Z'), off);
  assert.equal(off.dataPagamento, first.dataPagamento);
  assert.equal(on.dataPagamento, first.dataPagamento);
});

test('reabrir e salvar manual legado respeita false explícito; inferência antiga só vale quando o campo não existe', () => {
  const legadoDesmarcado = paga({ origem: 'checkout', pagamentoRegistradoNoAsaas: false });
  const reaberto = { ...legadoDesmarcado, pagamentoRegistradoNoAsaas: pagamentoAsaasNoEditor(legadoDesmarcado, true) };
  const saved = salvar(reaberto, agora, legadoDesmarcado);
  assert.equal(saved.pagamentoRegistradoNoAsaas, false);
  assert.equal('dataPagamento' in saved, false);
  const legadoSemCampo = paga({ origem: 'checkout', pagamentoRegistradoNoAsaas: undefined });
  assert.equal(pagamentoAsaasNoEditor(legadoSemCampo, true), true);
  assert.equal(pagamentoAsaasNoEditor(legadoSemCampo, false), false);
  assert.equal(pagamentoAsaasNoEditor({ origem: ' CHECKOUT ' }, true), true);
  assert.equal(pagamentoAsaasNoEditor({ origem: 'checkout', pagamentoRegistradoNoAsaas: 'true' }, true), false);
});

test('reservas pendentes, canceladas e estornadas não recebem data nem são marcadas pagas', () => {
  for (const status of ['pre_reserva', 'aguardando', 'pending', 'processing', 'cancelado', 'estornado', 'refunded']) {
    const original = paga({ status, confirmada: true });
    assert.deepEqual(camposRegistroPagamentoManual(original, null, agora), {});
    const saved = salvar(original);
    assert.equal(saved.status, status);
    assert.equal('dataPagamento' in saved, false);
  }
});

test('reservas sem registro Asaas não recebem propriedade dataPagamento undefined', () => {
  for (const flag of [undefined, false, 'true', 1]) {
    const fields = camposRegistroPagamentoManual(paga({ pagamentoRegistradoNoAsaas: flag }), null, agora);
    assert.deepEqual(fields, {});
    assert.equal(Object.hasOwn(fields, 'dataPagamento'), false);
  }
});

test('Date, timestamp Firestore e strings válidas existentes permanecem com o mesmo valor e identidade', () => {
  const timestamp = Object.freeze({ toDate: () => new Date('2026-10-20T12:00:00Z') });
  for (const originalDate of [new Date('2026-10-20T12:00:00Z'), timestamp, '2026-10-20T12:00:00Z', '2026-10-20', '20/10/2026']) {
    const original = paga({ dataPagamento: originalDate });
    assert.deepEqual(camposRegistroPagamentoManual(original, original, agora), {});
    assert.equal(salvar(original).dataPagamento, originalDate);
  }
});

test('datas inválidas são substituídas somente para registro pago no Asaas', () => {
  for (const value of [undefined, null, '', false, 123, new Date('invalid'), 'invalid', '2026-02-31', '31/02/2026', {}, { toDate: () => new Date('invalid') }, { toDate: () => { throw new Error('invalid'); } }]) {
    assert.equal(dataPagamentoValida(value), false);
    assert.deepEqual(camposRegistroPagamentoManual(paga({ dataPagamento: value }), null, agora), { dataPagamento: agora });
    assert.deepEqual(camposRegistroPagamentoManual(paga({ dataPagamento: value, status: 'aguardando' }), null, agora), {});
  }
});

test('usa a confirmação legada somente quando não há status e não altera flags ou dados de afiliados', () => {
  const source = Object.freeze({ partnerId: 'partner', commissionRule: { mode: 'percent', value: 10 } });
  const original = paga({ status: undefined, confirmada: true, commercialAttribution: source, whatsappEnviado: false });
  const saved = salvar(original);
  assert.deepEqual(saved.dataPagamento, agora);
  assert.equal(saved.commercialAttribution, source);
  assert.equal(saved.whatsappEnviado, false);
  assert.deepEqual(camposRegistroPagamentoManual({ ...original, confirmada: false }, null, agora), {});
});

test('edição comum de manual já Asaas e paga não cria data retroativa nem desloca histórico para hoje', () => {
  for (const original of [paga(), paga({ origem: 'checkout', pagamentoRegistradoNoAsaas: undefined })]) {
    const reaberta = { ...original, pagamentoRegistradoNoAsaas: pagamentoAsaasNoEditor(original, true), observacao: 'Texto editado' };
    const saved = salvar(reaberta, agora, original);
    assert.equal('dataPagamento' in saved, false);
  }
});

test('registro Asaas que passa de pendente a pago recebe data; status cancelado não é uma nova confirmação de pagamento', () => {
  for (const status of ['pre_reserva', 'aguardando', 'pending']) {
    const original = paga({ status });
    const saved = salvar({ ...original, status: 'pago' }, agora, original);
    assert.deepEqual(saved.dataPagamento, agora);
  }
  const cancelada = paga({ status: 'cancelado' });
  assert.deepEqual(camposRegistroPagamentoManual({ ...cancelada, status: 'confirmado' }, cancelada, agora), {});
});

test('manual antiga com campo Asaas ausente passa a registrar pagamento apenas quando marcada explicitamente', () => {
  const original = paga({ origem: 'manual', pagamentoRegistradoNoAsaas: undefined });
  const saved = salvar({ ...original, pagamentoRegistradoNoAsaas: true }, agora, original);
  assert.deepEqual(saved.dataPagamento, agora);
});
