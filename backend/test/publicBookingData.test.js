const test = require('node:test');
const assert = require('node:assert/strict');
const { resumirOcupacaoPublica, publicBookingDateValid, codigoConsultaValido, cpfConsultaValido, reservaPublicaDoTitular, consultarReservasPublicasTitular } = require('../dist/services/publicBookingData');
const { transferirIndicacaoContinuacaoSite } = require('../dist/services/siteWhatsAppContinuation');

test('ocupação pública agrega por atividade/horário e não expõe clientes ou reservas', () => {
  const records = [
    { id: 'secret', nome: 'Private', cpf: '52998224725', email: 'private@example.com', status: 'pago', pacoteIds: ['brunch', 'trilha'], horario: '10:00', horariosPorPacote: { trilha: '11:00' }, participantes: 4, participantesPorTipo: { adulto: 2, crianca: 1, free: 1 }, naoPagante: 1 },
    { status: 'confirmado', pacoteIds: ['brunch'], horario: '10:00', participantes: 2 },
    { status: 'cancelado', pacoteIds: ['brunch'], horario: '10:00', participantes: 100 },
    { status: 'pago', naoConsomeDisponibilidade: true, pacoteIds: ['brunch'], horario: '10:00', participantes: 100 },
  ];
  const result = resumirOcupacaoPublica(records);
  assert.deepEqual(result, [
    { pacoteIds: ['brunch'], horario: '10:00', participantes: 6 },
    { pacoteIds: ['trilha'], horario: '11:00', participantes: 4 },
  ]);
  assert.doesNotMatch(JSON.stringify(result), /secret|Private|cpf|email|52998224725/);
});

test('combo usa participantes de cada grupo, e registros legados continuam ocupando vagas', () => {
  const result = resumirOcupacaoPublica([
    { status: 'pago', gruposParticipacao: [{ pacoteIds: ['a', 'b'], participantesPorTipo: { adulto: 2, free: 1 }, participantes: 3 }], horario: '9:00' },
    { status: 'pago', atividade: 'Brunch Gastronômico', adultos: 2, naoPagante: 1, horario: '10:00' },
  ], [{ id: 'brunch', nome: 'Brunch Gastronômico' }]);
  assert.deepEqual(result, [
    { pacoteIds: ['a'], horario: '09:00', participantes: 3 },
    { pacoteIds: ['b'], horario: '09:00', participantes: 3 },
    { pacoteIds: ['brunch'], horario: '10:00', participantes: 3 },
  ]);
});

test('consulta do titular exige CPF correspondente e devolve DTO sem dados pessoais ou comerciais internos', () => {
  const record = { telefone: '+55 (62) 99999-1234', cpf: '52998224725', email: 'secret@example.com', nome: 'Private', valor: 100, participantes: 3, status: 'pago', data: '2026-12-01', atividade: 'Brunch', commercialAttribution: { partnerId: 'private' }, observacao: 'internal' };
  const result = reservaPublicaDoTitular('reservation', record, '52998224725');
  assert.equal(result.participantes, 3);
  assert.equal(reservaPublicaDoTitular('reservation', record, '11144477735'), null);
  assert.equal(reservaPublicaDoTitular('reservation', record, ''), null);
  assert.doesNotMatch(JSON.stringify(result), /telefone|cpf|email|Private|partner|internal/);
});

test('validação pública rejeita datas impossíveis, CPF inválido e código curto ou caminho', () => {
  assert.equal(publicBookingDateValid('2026-02-30'), false);
  assert.equal(publicBookingDateValid('2026-12-01'), true);
  assert.equal(cpfConsultaValido('52998224725'), true);
  assert.equal(cpfConsultaValido('11111111111'), false);
  assert.equal(codigoConsultaValido('curto'), false);
  assert.equal(codigoConsultaValido('../reservas/outra-reserva'), false);
  assert.equal(codigoConsultaValido('52cddcbf-3cbd-4323-ad19-ac47d40dbca0'), true);
});

test('consulta pública lê somente a reserva do código, exige CPF e nunca pesquisa histórico', async () => {
  const code = '52cddcbf-3cbd-4323-ad19-ac47d40dbca0';
  const reads = [];
  const db = { collection(name) {
    assert.equal(name, 'reservas');
    return { doc(id) { reads.push(id); return { get: async () => ({
      exists: id === code, id, data: () => ({ cpf: '529.982.247-25', status: 'pago', atividade: 'Brunch' }),
    }) }; } };
  } };
  assert.equal((await consultarReservasPublicasTitular('52998224725', code, db)).length, 1);
  assert.deepEqual(await consultarReservasPublicasTitular('11144477735', code, db), []);
  assert.deepEqual(await consultarReservasPublicasTitular('52998224725', '12345678901234567890', db), []);
  assert.deepEqual(await consultarReservasPublicasTitular('52998224725', 'curto', db), []);
  assert.deepEqual(reads, [code, code, '12345678901234567890']);
});

test('continuação no WhatsApp transporta apenas o contexto validado da sessão, fora do texto do modelo', async () => {
  const bindings = [];
  const dependencies = { read: async (session) => session === 'site_original' ? 'server-context' : undefined,
    bind: async (...args) => { bindings.push(args); return { bound: true }; } };
  await transferirIndicacaoContinuacaoSite('site_original', '5562999991234', dependencies, true);
  await transferirIndicacaoContinuacaoSite('site_without_referral', '5562999991234', dependencies, true);
  await transferirIndicacaoContinuacaoSite('site_original', '123', dependencies, true);
  assert.deepEqual(bindings, [['server-context', 'whatsapp_5562999991234']]);
});
