import assert from 'node:assert/strict';
import test from 'node:test';
import { parseBookingPrefill, knownBookingParticipants, knownBookingTimes } from '../src/utils/bookingPrefill.ts';

test('recupera contagens, idade infantil e horários sem dados pessoais', () => {
  const params = new URLSearchParams({
    participantes: JSON.stringify({ adulto: 2, crianca_isenta: 1 }),
    idades: JSON.stringify({ crianca_isenta: [1] }),
    horarios: JSON.stringify({ brunch: '09:00' }),
    nome: 'Não importar', cpf: 'Não importar',
  });
  assert.deepEqual(parseBookingPrefill(params), {
    participants: { adulto: 2, crianca_isenta: 1 }, ages: { crianca_isenta: [1] }, times: { brunch: '09:00' },
  });
});

test('rejeita JSON malformado, tipos indevidos, limites e horários inválidos', () => {
  for (const value of ['{', '[]', '{"adulto":"2"}', '{"adulto":-1}', '{"adulto":1.5}', '{"adulto":100}', '{"__proto__":2}', ' '.repeat(8001)]) {
    assert.equal(parseBookingPrefill(new URLSearchParams({ participantes: value })).participants, undefined, value);
  }
  assert.equal(parseBookingPrefill(new URLSearchParams({ participantes: JSON.stringify(Object.fromEntries(Array.from({ length: 31 }, (_, i) => [`tipo${i}`, 1]))) })).participants, undefined);
  for (const value of ['{"crianca":[121]}', '{"crianca":["1"]}', '{"crianca":1}']) {
    assert.equal(parseBookingPrefill(new URLSearchParams({ idades: value })).ages, undefined);
  }
  for (const value of ['{"brunch":"25:00"}', '{"brunch":"9:00"}', '{"brunch":900}']) {
    assert.equal(parseBookingPrefill(new URLSearchParams({ horarios: value })).times, undefined);
  }
});

test('aplica somente IDs de categorias existentes e idades coerentes com a quantidade', () => {
  const result = knownBookingParticipants({ adulto: 2, crianca_isenta: 1, desconhecido: 8 },
    { adulto: [30, 31], crianca_isenta: [1], desconhecido: [3] },
    [{ id: 'adulto' }, { id: 'crianca_isenta', perguntarIdade: true }]);
  assert.deepEqual(result, { quantities: { adulto: 2, crianca_isenta: 1 }, ages: { crianca_isenta: ['1'] } });
  assert.deepEqual(knownBookingParticipants({ crianca: 1 }, { crianca: [1, 2] }, [{ id: 'crianca', perguntarIdade: true }]).ages, {});
});

test('horários exigem pacote selecionado e opção oficial; trilha livre não recebe hora inventada', () => {
  const packages = [{ id: 'brunch', horarios: ['09:00', '11:00'] }, { id: 'trilha', modoHorario: 'intervalo' }, { id: 'outro', horarios: ['09:00'] }];
  assert.deepEqual(knownBookingTimes({ brunch: '09:00', trilha: '09:00', outro: '09:00' }, packages, ['brunch', 'trilha']), { brunch: '09:00' });
  assert.deepEqual(knownBookingTimes({ brunch: '10:00' }, packages, ['brunch'], '09:00'), {});
  assert.deepEqual(knownBookingTimes(undefined, packages, ['brunch'], '09:00'), { brunch: '09:00' });
});
