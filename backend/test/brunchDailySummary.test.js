const test = require('node:test');
const assert = require('node:assert/strict');
const { buildBrunchDailyEntries } = require('../dist/services/brunchDailySummary');
const catalog = {
  pacotes: [{ id: 'brunch', nome: 'Brunch Gastronômico' }, { id: 'trail', nome: 'Trilha Ecológica' }],
  combos: [{ id: 'combo', nome: 'Experiência completa', pacoteIds: ['brunch', 'trail'] }],
  tiposClientes: [{ id: 'a', nome: 'Adulto' }, { id: 'c', nome: 'Criança' }, { id: 'b', nome: 'Bariátrico' },
    { id: 'i', nome: 'Idoso' }, { id: 'n', nome: 'Não pagante' }],
};
const doc = (raw, id = 'r1') => ({ id, data: () => raw });
const raw = (overrides = {}) => ({ nome: 'Mariana', origem: 'checkout', canalOrigem: 'site', pacoteIds: ['brunch'], horario: '08:00', ...overrides });
const group = (refId, map, extra = {}) => ({ tipo: 'pacote', refId, nome: refId === 'trail' ? 'Trilha' : 'Brunch',
  pacoteIds: [refId], participantesPorTipo: map, ...extra });
const quantities = (entry) => Object.fromEntries(entry.categories.map((category) => [category.label, category.quantity]));

test('Brunch uses its real package time and all catalog types; online non-paying mirror is counted once', () => {
  const result = buildBrunchDailyEntries([doc(raw({ participantesPorTipo: { a: 2, c: 1, b: 1, i: 1, n: 2 }, naoPagante: 2,
    participantes: 999, horariosPorPacote: { brunch: '10:00', trail: '09:00' } }))], catalog);
  assert.equal(result.entries.length, 1); assert.equal(result.entries[0].time, '10:00'); assert.equal(result.totalParticipants, 7);
  assert.deepEqual(quantities(result.entries[0]), { Adulto: 2, Bariátrico: 1, Criança: 1, Idoso: 1, 'Não pagante': 2 });
  assert.deepEqual(result.reservationIds, ['r1']);
});

test('known trail IDs override a discordant historical Brunch title and do not borrow a trail time', () => {
  const result = buildBrunchDailyEntries([doc(raw({ atividade: 'Brunch', pacoteIds: ['trail'], participantes: 5 }))], catalog);
  assert.deepEqual(result, { entries: [], reservationIds: [], totalParticipants: 0 });
});

test('a real combo resolves Brunch IDs even when its display name has no Brunch word', () => {
  const result = buildBrunchDailyEntries([doc(raw({ pacoteIds: [], comboId: 'combo', atividade: 'Experiência completa',
    participantesPorTipo: { a: 3 }, horariosPorPacote: { brunch: '11:00', trail: '09:00' } }))], catalog);
  assert.equal(result.entries[0].time, '11:00'); assert.equal(result.totalParticipants, 3);
});

test('separate trail5 and Brunch2 groups include only the Brunch composition, never global7', () => {
  const result = buildBrunchDailyEntries([doc(raw({ pacoteIds: ['brunch', 'trail'], participantesPorTipo: { a: 7 }, participantes: 7,
    gruposParticipacao: [group('trail', { a: 5 }), group('brunch', { a: 2 })], horariosPorPacote: { brunch: '12:00', trail: '09:00' } }))], catalog);
  assert.equal(result.totalParticipants, 2); assert.deepEqual(quantities(result.entries[0]), { Adulto: 2 });
  assert.equal(result.entries[0].time, '12:00');
});

test('a combo group counts once per time; exact duplicate groups are removed but different refIds stay distinct', () => {
  const comboA = { tipo: 'combo', refId: 'combo', nome: 'Brunch + Trilha', pacoteIds: ['brunch', 'trail'], participantesPorTipo: { a: 2 } };
  const comboB = { ...comboA, refId: 'another-combo' };
  const result = buildBrunchDailyEntries([doc(raw({ participantesPorTipo: { a: 99 }, gruposParticipacao: [comboA, structuredClone(comboA), comboB],
    horariosPorPacote: { brunch: '10:00', trail: '09:00' } }))], catalog);
  assert.equal(result.entries.length, 1); assert.equal(result.totalParticipants, 4);
});

test('distinct real Brunch times stay separate and group package times precede reservation fallback', () => {
  const result = buildBrunchDailyEntries([doc(raw({ gruposParticipacao: [
    group('brunch', { a: 2 }, { horariosPorPacote: { brunch: '12:00' } }),
    group('brunch', { i: 1 }, { horariosPorPacote: { brunch: '9:00' } }),
  ], horariosPorPacote: { brunch: '11:00' } }))], catalog);
  assert.deepEqual(result.entries.map((entry) => [entry.time, entry.total]), [['09:00', 1], ['12:00', 2]]);
  assert.deepEqual(result.reservationIds, ['r1']); assert.equal(result.totalParticipants, 3);
});

test('two Brunch IDs at the same time in one combo do not duplicate the participant group', () => {
  const withSecond = { ...catalog, pacotes: [...catalog.pacotes, { id: 'brunch-special', nome: 'Gastronomia', tipo: 'brunch' }],
    combos: [{ id: 'double', nome: 'Combo', pacoteIds: ['brunch', 'brunch-special', 'trail'] }] };
  const result = buildBrunchDailyEntries([doc(raw({ comboId: 'double', pacoteIds: [], participantesPorTipo: { a: 3 },
    horariosPorPacote: { brunch: '10:00', 'brunch-special': '10:00', trail: '09:00' } }))], withSecond);
  assert.equal(result.entries.length, 1); assert.equal(result.totalParticipants, 3);
});

test('removed catalog ID permits historical Brunch fallback and its associated time', () => {
  const result = buildBrunchDailyEntries([doc(raw({ pacoteIds: ['removed-brunch'], atividade: 'Brunch Gastronômico',
    participantes: 4, horariosPorPacote: { 'removed-brunch': '13:00', trail: '09:00' } }))], catalog);
  assert.equal(result.entries[0].time, '13:00'); assert.equal(result.totalParticipants, 4);
  assert.deepEqual(result.entries[0].categories, [{ label: 'Participantes sem tipo informado', quantity: 4 }]);
});

test('historical activity without IDs uses a human Brunch time key and never an unrelated trail key', () => {
  const result = buildBrunchDailyEntries([doc(raw({ pacoteIds: [], atividade: 'Trilha + Brunch (Combo: Completo)', participantes: 2,
    horariosPorPacote: { trail: '09:00', Brunch: '11:00' } }))], catalog);
  assert.equal(result.entries[0].time, '11:00'); assert.equal(result.totalParticipants, 2);
  const unknownTime = buildBrunchDailyEntries([doc(raw({ pacoteIds: [], atividade: 'Brunch', participantes: 2, horario: '',
    horariosPorPacote: { trail: '09:00' } }))], catalog);
  assert.equal(unknownTime.entries[0].time, 'Sem horário informado');
});

test('manual additional non-paying legacy remains additional; online mirror is not added twice', () => {
  const same = { participantesPorTipo: { a: 2, n: 2 }, naoPagante: 1 };
  const result = buildBrunchDailyEntries([doc(raw({ ...same, origem: 'manual', criadaManualmente: true }), 'manual'), doc(raw(same), 'online')], catalog);
  assert.deepEqual(result.entries.map((entry) => [entry.reservationId, quantities(entry)['Não pagante'], entry.total]),
    [['manual', 3, 5], ['online', 2, 4]]);
});

test('groups do not assign global non-paying participants to Brunch when they may belong to trail', () => {
  const result = buildBrunchDailyEntries([doc(raw({ origem: 'manual', naoPagante: 3,
    gruposParticipacao: [group('trail', { a: 5 }), group('brunch', { a: 2 })] }))], catalog);
  assert.equal(result.totalParticipants, 2); assert.deepEqual(quantities(result.entries[0]), { Adulto: 2 });
});

test('legacy online Brunch-only group recovers global non-paying once while modern map mirror stays deduplicated', () => {
  const result = buildBrunchDailyEntries([
    doc(raw({ naoPagante: 1, gruposParticipacao: [group('brunch', { a: 2 })] }), 'legacy'),
    doc(raw({ naoPagante: 1, gruposParticipacao: [group('brunch', { a: 2, n: 1 })] }), 'modern'),
    doc(raw({ naoPagante: 1, gruposParticipacao: [group('brunch', { a: 2 }, { naoPagante: 1 })] }), 'group-field'),
  ], catalog);
  for (const entry of result.entries) {
    assert.equal(entry.total, 3); assert.equal(quantities(entry)['Não pagante'], 1);
  }
});

test('manual additional non-paying remains additional for one Brunch group and is added once across same-slot Brunch groups', () => {
  const result = buildBrunchDailyEntries([
    doc(raw({ origem: 'manual', naoPagante: 1, gruposParticipacao: [group('brunch', { a: 2, n: 1 })] }), 'manual'),
    doc(raw({ naoPagante: 1, gruposParticipacao: [group('brunch', { a: 2 }), group('brunch', { i: 1 })] }), 'two-groups'),
  ], catalog);
  assert.equal(result.entries.find((entry) => entry.reservationId === 'manual').total, 4);
  assert.equal(quantities(result.entries.find((entry) => entry.reservationId === 'manual'))['Não pagante'], 2);
  assert.equal(result.entries.find((entry) => entry.reservationId === 'two-groups').total, 4);
  assert.equal(quantities(result.entries.find((entry) => entry.reservationId === 'two-groups'))['Não pagante'], 1);
});

test('scalar-only group is explicit about missing categories and never borrows reservation adults', () => {
  const result = buildBrunchDailyEntries([doc(raw({ adultos: 7, participantes: 7, gruposParticipacao: [
    group('trail', {}, { participantes: 5 }), group('brunch', {}, { participantes: 2 }),
  ] }))], catalog);
  assert.equal(result.totalParticipants, 2);
  assert.deepEqual(result.entries[0].categories, [{ label: 'Participantes sem tipo informado', quantity: 2 }]);
});

test('unknown totals remain explicit, invalid maps use scalar only, and malformed empty groups do not mask flat composition', () => {
  const result = buildBrunchDailyEntries([
    doc(raw({ participantesPorTipo: { a: -1, c: 'invalid', i: 1.5 }, participantes: 4 }), 'scalar'),
    doc(raw({ nome: '', horario: '', participantes: 'invalid' }), 'unknown'),
    doc(raw({ participantesPorTipo: { i: 2 }, gruposParticipacao: [{}, null, 'invalid'] }), 'flat'),
  ], catalog);
  assert.equal(result.entries.find((entry) => entry.reservationId === 'scalar').total, 4);
  const unknown = result.entries.find((entry) => entry.reservationId === 'unknown');
  assert.deepEqual(unknown.categories, []); assert.equal(unknown.total, 0); assert.equal(unknown.name, 'Nome não informado');
  assert.equal(unknown.time, 'Sem horário informado');
  assert.deepEqual(quantities(result.entries.find((entry) => entry.reservationId === 'flat')), { Idoso: 2 });
});

test('selected Brunch with missing Brunch group shows unknown instead of counting the existing trail group', () => {
  const result = buildBrunchDailyEntries([doc(raw({ pacoteIds: ['brunch', 'trail'], participantes: 7, adultos: 7,
    gruposParticipacao: [group('trail', { a: 5 })] }))], catalog);
  assert.equal(result.entries.length, 1); assert.equal(result.totalParticipants, 0); assert.deepEqual(result.entries[0].categories, []);
});

test('opaque unknown participant type stays untyped, input stays unchanged and caller owns status/date eligibility', () => {
  const source = raw({ status: 'aguardando', confirmada: false, data: '1999-01-01', participantesPorTipo: { 'd65f6a92-03b6-4d11-a649-b74bd0efeb98': 3 } });
  const before = structuredClone(source);
  const result = buildBrunchDailyEntries([doc(source), doc(source)], catalog);
  assert.equal(result.entries.length, 1); assert.equal(result.totalParticipants, 3);
  assert.deepEqual(result.entries[0].categories, [{ label: 'Participantes sem tipo informado', quantity: 3 }]);
  assert.deepEqual(source, before);
});
