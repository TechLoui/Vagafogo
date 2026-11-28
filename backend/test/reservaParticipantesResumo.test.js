const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
require('ts-node').register({ project: path.join(__dirname, '../tsconfig.json'), transpileOnly: true, preferTsExts: true });
const backend = require('../src/services/reservaParticipantesResumo');
const { nomeTipoParticipante, resumirParticipantesReserva, contarParticipantesReserva } = backend;

const adultoId = 'wo7n4CGFJYC6WO9Ez1wh';
const criancaId = 'gLfK8u6QR4pQum6wdX2y';
const naoPaganteId = 'nP8dKs4aX1bQe9rT6vWz';
const desconhecidoId = 'xYz9876543210AbCdEfGh';
const catalogo = [
  { id: adultoId, nome: 'Adulto' }, { id: criancaId, nome: 'Criança' },
  { id: naoPaganteId, nome: 'Não pagante' }, { id: 'idoso', nome: 'Idoso' },
  { id: 'bariatrica', nome: 'Bariátrica' }, { id: 'tipo_novo', nome: 'Pesquisador convidado' },
];
const pares = (reserva, tipos = catalogo, opcoes = {}) => resumirParticipantesReserva(reserva, tipos, opcoes).map(({ label, quantidade }) => [label, quantidade]);

test('catálogo completo inclui adulto, criança, bariátrica, idoso, não pagante e tipo novo', () => {
  const reserva = { participantesPorTipo: { [adultoId]: 2, [criancaId]: 1, [naoPaganteId]: 1, idoso: 1, bariatrica: 1, tipo_novo: 2 }, naoPagante: 1 };
  assert.deepEqual(pares(reserva, catalogo, { naoPaganteLegadoAdicional: false }), [
    ['Adulto', 2], ['Bariátrica', 1], ['Criança', 1], ['Idoso', 1], ['Não pagante', 1], ['Pesquisador convidado', 2],
  ]);
  assert.equal(contarParticipantesReserva(reserva, catalogo, { naoPaganteLegadoAdicional: false }), 8);
});

test('N espelhado online conta uma vez; N adicional manual soma ao mesmo resumo', () => {
  const reserva = { participantesPorTipo: { [adultoId]: 2, [criancaId]: 1, [naoPaganteId]: 1 }, participantes: 4, naoPagante: 1 };
  for (const [adicional, total, naoPagantes] of [[false, 4, 1], [true, 5, 2]]) {
    const opcoes = { naoPaganteLegadoAdicional: adicional };
    const resumo = resumirParticipantesReserva(reserva, catalogo, opcoes);
    assert.equal(contarParticipantesReserva(reserva, catalogo, opcoes), total);
    assert.equal(resumo.reduce((soma, item) => soma + item.quantidade, 0), total);
    assert.equal(resumo.find((item) => item.inicial === 'N').quantidade, naoPagantes);
  }
});

test('mapa sem N mantém não pagante legado em qualquer origem', () => {
  for (const adicional of [false, true]) {
    const reserva = { participantesPorTipo: { adulto: 2 }, naoPagante: 1 };
    assert.equal(contarParticipantesReserva(reserva, [], { naoPaganteLegadoAdicional: adicional }), 3);
  }
});

test('Isento, Isenta e Bebê preservam rótulo e não duplicam espelho online', () => {
  const tipos = [{ id: 'isento', nome: 'Isento' }, { id: 'isenta', nome: 'Isenta' }, { id: 'bebe', nome: 'Bebê' }, { id: 'idoso', nome: 'Idoso' }];
  const reserva = { participantesPorTipo: { isento: 1, isenta: 1, bebe: 1, idoso: 1 }, naoPagante: 3, idadesPorTipo: { bebe: [0] } };
  const resumo = resumirParticipantesReserva(reserva, tipos, { naoPaganteLegadoAdicional: false });
  assert.equal(contarParticipantesReserva(reserva, tipos, { naoPaganteLegadoAdicional: false }), 4);
  assert.equal(resumo.find((item) => item.label === 'Idoso').inicial, 'I');
  assert.equal(resumo.find((item) => item.label === 'Isento').inicial, 'N');
  assert.equal(resumo.find((item) => item.label === 'Isenta').inicial, 'N');
  assert.equal(resumo.find((item) => item.label === 'Bebê').inicial, 'B');
});

test('aliases legíveis são recuperados e campos legados não duplicam mapa conhecido', () => {
  assert.equal(nomeTipoParticipante('children'), 'Criança');
  assert.equal(nomeTipoParticipante('adults'), 'Adulto');
  assert.equal(nomeTipoParticipante('nao_pagante_legado'), 'Não pagante');
  assert.deepEqual(pares({ participantesPorTipo: { [adultoId]: 2, [criancaId]: 1 }, adultos: 9, criancas: 8 }), [['Adulto', 2], ['Criança', 1]]);
});

test('catálogo parcial recupera legados somente quando as quantidades fecham exatamente', () => {
  const reserva = { participantesPorTipo: { [adultoId]: 3, [criancaId]: 1 }, adultos: 3, criancas: 1 };
  assert.deepEqual(pares(reserva, []), [['Adulto', 3], ['Criança', 1]]);
  assert.deepEqual(pares(reserva, catalogo.slice(0, 1)), [['Adulto', 3], ['Criança', 1]]);
  assert.deepEqual(pares({ participantesPorTipo: { [desconhecidoId]: 3 }, adultos: 2 }, []), [['Participante', 3]]);
});

test('IDs opacos desconhecidos nunca viram categorias ou nomes inventados', () => {
  for (const key of [desconhecidoId, '10d572ec-bd3a-4f82-a57e-615a7ec24065', '1234', 'https://example.invalid/tipo']) assert.equal(nomeTipoParticipante(key), 'Participante');
  assert.deepEqual(resumirParticipantesReserva({ participantesPorTipo: { [desconhecidoId]: 2 } }, [], { naoPaganteLegadoAdicional: false }), [{ key: desconhecidoId, label: 'Participante', inicial: 'P', quantidade: 2 }]);
  assert.equal(nomeTipoParticipante('Convidado especial'), 'Convidado especial');
});

test('legados e quantidades inválidas são tratados sem mutar reserva nem catálogo', () => {
  const reserva = { adultos: '2', criancas: 1, bariatrica: 1, naoPagante: 1, participantesPorTipo: { vazio: 0, negativo: -1, invalido: 'x', infinito: Infinity } };
  const original = structuredClone(reserva), tiposOriginais = structuredClone(catalogo);
  assert.deepEqual(pares(reserva), [['Adulto', 2], ['Bariátrica', 1], ['Criança', 1], ['Não pagante', 1]]);
  assert.equal(contarParticipantesReserva(reserva), 5);
  assert.deepEqual(reserva, original); assert.deepEqual(catalogo, tiposOriginais);
});

test('preço, total escalar e idades não inventam não pagante ou composição de grupo', () => {
  assert.deepEqual(resumirParticipantesReserva({ participantes: 9, gruposParticipacao: [{ participantesPorTipo: { adulto: 9 } }] }), []);
  assert.deepEqual(pares({ participantesPorTipo: { tipo_novo: 1 }, valor: 0, naoPagante: 0, idadesPorTipo: { tipo_novo: [0] } }), [['Pesquisador convidado', 1]]);
});

test('backend mantém paridade com o helper do Admin para os casos de contagem', () => {
  const frontend = require('../../frontend/src/utils/reservaResumo.ts');
  const casos = [
    { participantesPorTipo: { [adultoId]: 2, [criancaId]: 1, [naoPaganteId]: 1 }, participantes: 4, naoPagante: 1 },
    { participantesPorTipo: { [desconhecidoId]: 3 }, adultos: 2, naoPagante: 1 },
    { adultos: 2, criancas: 1, bariatrica: 1, naoPagante: 1 },
    { participantesPorTipo: { idoso: 1, tipo_novo: 2, nao_pagante: 1 }, naoPagante: 1 },
  ];
  for (const reserva of casos) for (const tipos of [[], catalogo.slice(0, 1), catalogo]) for (const adicional of [undefined, false, true]) {
    const opcoes = adicional === undefined ? {} : { naoPaganteLegadoAdicional: adicional };
    assert.deepEqual(resumirParticipantesReserva(reserva, tipos, opcoes), frontend.resumirParticipantesReserva(reserva, tipos, opcoes));
    assert.equal(contarParticipantesReserva(reserva, tipos, opcoes), frontend.contarParticipantesReserva(reserva, tipos, opcoes));
  }
});
