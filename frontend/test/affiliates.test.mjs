import test from 'node:test';
import assert from 'node:assert/strict';
import {
  affiliateHome, affiliateDate, commissionLabel, parseCommissionRule,
} from '../src/features/affiliates/affiliateUtils.ts';

test('cada perfil entra em seu painel próprio', () => {
  assert.equal(affiliateHome('admin'), '/CRM');
  assert.equal(affiliateHome('agency'), '/agencia');
  assert.equal(affiliateHome('partner'), '/parceiro');
});

test('comissão desabilitada não cria regra e percentual aceita os limites do contrato', () => {
  assert.equal(parseCommissionRule('disabled', ''), null);
  assert.equal(parseCommissionRule('disabled', 'valor anterior'), null);
  assert.deepEqual(parseCommissionRule('percent', '0'), { mode: 'percent', value: 0 });
  assert.deepEqual(parseCommissionRule('percent', '100'), { mode: 'percent', value: 100 });
  assert.deepEqual(parseCommissionRule('percent', '5,25'), { mode: 'percent', value: 5.25 });
  for (const value of ['', '-1', '100,01', 'NaN', 'Infinity']) {
    assert.throws(() => parseCommissionRule('percent', value));
  }
});

test('comissão fixa aceita centavos e rejeita valor negativo ou precisão excessiva', () => {
  assert.deepEqual(parseCommissionRule('fixed', '10,50'), { mode: 'fixed', value: 10.5 });
  assert.deepEqual(parseCommissionRule('fixed', '1000.01'), { mode: 'fixed', value: 1000.01 });
  for (const value of ['', '-0,01', 'dez', '2,345', '1000000,01']) {
    assert.throws(() => parseCommissionRule('fixed', value));
  }
  assert.equal(commissionLabel(null), 'Não definida');
  assert.equal(commissionLabel({ mode: 'percent', value: 5.25 }), '5,25%');
  assert.match(commissionLabel({ mode: 'fixed', value: 10.5 }), /10,50 por reserva$/);
});

test('data de visita sem hora preserva o dia e instante financeiro usa São Paulo', () => {
  assert.equal(affiliateDate('2026-11-24'), '24/11/2026');
  assert.equal(affiliateDate('2026-11-24T01:00:00Z'), '23/11/2026');
  assert.equal(affiliateDate('inválida'), '—');
  assert.equal(affiliateDate(null), '—');
});
