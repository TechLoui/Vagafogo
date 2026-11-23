import assert from 'node:assert/strict';
import test from 'node:test';
import {
  nomeTipoParticipante, resumirParticipantesReserva, nomesAtividadesReserva, rotuloAtividadeReserva,
  rotuloParticipanteComIdades, contarParticipantesReserva,
} from '../src/utils/reservaResumo.ts';

const adultId = 'wo7n4CGFJYC6WO9Ez1wh';
const childId = 'gLfK8u6QR4pQum6wdX2y';
const types = [{ id: adultId, nome: 'Adulto' }, { id: childId, nome: 'Criança' }];
const counts = (reserva, catalog = types) => resumirParticipantesReserva(reserva, catalog)
  .map(({ label, inicial, quantidade }) => ({ label, inicial, quantidade }));

test('resolve os IDs do catálogo e mostra inicial com quantidade sem duplicar legado', () => {
  assert.deepEqual(counts({ participantesPorTipo: { [adultId]: 3, [childId]: 1 }, adultos: 3, criancas: 1 }), [
    { label: 'Adulto', inicial: 'A', quantidade: 3 },
    { label: 'Criança', inicial: 'C', quantidade: 1 },
  ]);
  assert.equal(nomeTipoParticipante('crianca', types), 'Criança');
  assert.equal(nomeTipoParticipante('CRIANÇA', types), 'Criança');
});

test('recupera categorias legadas quando catálogo está ausente ou parcialmente carregado', () => {
  const reservation = { participantesPorTipo: { [adultId]: 3, [childId]: 1 }, adultos: 3, criancas: 1 };
  const expected = [{ label: 'Adulto', inicial: 'A', quantidade: 3 }, { label: 'Criança', inicial: 'C', quantidade: 1 }];
  assert.deepEqual(counts(reservation, []), expected);
  assert.deepEqual(counts(reservation, types.slice(0, 1)), expected);
});

test('um ID sem correspondência não revela código nem inventa categoria incompatível', () => {
  assert.deepEqual(counts({ participantesPorTipo: { [adultId]: 3 }, adultos: 2 }, []), [
    { label: 'Participante', inicial: 'P', quantidade: 3 },
  ]);
  assert.equal(nomeTipoParticipante(adultId, []), 'Participante');
  assert.deepEqual(counts({ participantesPorTipo: { [adultId]: 2, [childId]: 1 }, adultos: 1, criancas: 2 }, types.slice(0, 1)), [
    { label: 'Adulto', inicial: 'A', quantidade: 2 }, { label: 'Participante', inicial: 'P', quantidade: 1 },
  ]);
});

test('preserva tipos personalizados legíveis e contagens atuais como fonte principal', () => {
  assert.deepEqual(counts({ participantesPorTipo: { Idoso: 2, adulto: 1 }, adultos: 8 }, []), [
    { label: 'Adulto', inicial: 'A', quantidade: 1 }, { label: 'Idoso', inicial: 'I', quantidade: 2 },
  ]);
  assert.equal(nomeTipoParticipante('criança_isenta', []), 'criança isenta');
});

test('reservas legadas incluem não pagantes e não alteram o objeto salvo', () => {
  const reserva = { adultos: 2, criancas: 1, bariatrica: 1, naoPagante: 1 };
  const original = structuredClone(reserva);
  assert.deepEqual(counts(reserva, []), [
    { label: 'Adulto', inicial: 'A', quantidade: 2 }, { label: 'Bariátrica', inicial: 'B', quantidade: 1 },
    { label: 'Criança', inicial: 'C', quantidade: 1 }, { label: 'Não pagante', inicial: 'N', quantidade: 1 },
  ]);
  assert.deepEqual(reserva, original);
});

test('mantém A, I, C e N na composição da reserva e preserva a idade zero dos não pagantes', () => {
  const catalog = [
    { id: 'adulto', nome: 'Adulto' },
    { id: 'idoso', nome: 'Idoso' },
    { id: 'crianca', nome: 'Criança' },
    { id: 'nao_pagante', nome: 'Não pagante' },
  ];
  const reserva = {
    participantesPorTipo: { adulto: 2, idoso: 1, crianca: 1, nao_pagante: 2 },
    idadesPorTipo: { crianca: [8], nao_pagante: [0, 4] },
  };
  const summary = resumirParticipantesReserva(reserva, catalog);
  assert.deepEqual(summary.map(({ inicial, quantidade }) => [inicial, quantidade]), [
    ['A', 2], ['C', 1], ['I', 1], ['N', 2],
  ]);
  assert.equal(
    rotuloParticipanteComIdades(reserva, summary.find(({ inicial }) => inicial === 'N'), catalog),
    '2 não pagantes · Idades: 0 e 4 anos',
  );
});

test('identifica categorias explicitamente isentas com N sem confundir Idoso nem alterar os nomes cadastrados', () => {
  const catalog = [
    { id: 'idoso', nome: 'Idoso' },
    { id: 'crianca', nome: 'Criança' },
    { id: 'isento', nome: 'Isento' },
    { id: 'crianca_isenta', nome: 'Criança isenta' },
  ];
  assert.deepEqual(counts({ participantesPorTipo: { idoso: 1, crianca: 1, isento: 1, crianca_isenta: 1 } }, catalog), [
    { label: 'Criança', inicial: 'C', quantidade: 1 },
    { label: 'Criança isenta', inicial: 'N', quantidade: 1 },
    { label: 'Idoso', inicial: 'I', quantidade: 1 },
    { label: 'Isento', inicial: 'N', quantidade: 1 },
  ]);
});

test('o não pagante espelhado pelo checkout aparece uma vez no resumo e no total', () => {
  const catalog = [
    { id: 'a', nome: 'Adulto' },
    { id: 'c', nome: 'Criança' },
    { id: 'n', nome: 'Não pagante' },
  ];
  const reserva = { participantesPorTipo: { a: 2, c: 1, n: 1 }, participantes: 4, naoPagante: 1 };
  for (const [adicional, total, naoPagantes] of [[false, 4, 1], [true, 5, 2]]) {
    const opcoes = { naoPaganteLegadoAdicional: adicional };
    const summary = resumirParticipantesReserva(reserva, catalog, opcoes);
    assert.equal(contarParticipantesReserva(reserva, catalog, opcoes), total);
    assert.equal(summary.reduce((sum, item) => sum + item.quantidade, 0), total);
    assert.equal(summary.find(({ inicial }) => inicial === 'N').quantidade, naoPagantes);
    assert.equal(summary.find(({ inicial }) => inicial === 'C').quantidade, 1);
  }
});

test('catálogo completo mantém a categoria inativa no total, no badge N e nas idades históricas', () => {
  const nonPayingId = 'nP8dKs4aX1bQe9rT6vWz';
  const catalog = [
    { id: 'a', nome: 'Adulto', ativo: true },
    { id: nonPayingId, nome: 'Não pagante', ativo: false },
  ];
  const reserva = {
    participantesPorTipo: { a: 2, [nonPayingId]: 1 }, naoPagante: 1,
    idadesPorTipo: { [nonPayingId]: [0] },
  };
  const opcoes = { naoPaganteLegadoAdicional: false };
  const summary = resumirParticipantesReserva(reserva, catalog, opcoes);
  assert.equal(contarParticipantesReserva(reserva, catalog, opcoes), 3);
  const nonPaying = summary.find(({ inicial }) => inicial === 'N');
  assert.equal(nonPaying.quantidade, 1);
  assert.equal(rotuloParticipanteComIdades(reserva, nonPaying, catalog, opcoes), '1 não pagante · Idade: 0 anos');
});

test('não pagantes fora do mapa continuam incluídos tanto no cadastro manual quanto no checkout', () => {
  const reserva = { participantesPorTipo: { adulto: 2 }, naoPagante: 1 };
  for (const adicional of [false, true]) {
    const opcoes = { naoPaganteLegadoAdicional: adicional };
    assert.equal(contarParticipantesReserva(reserva, [], opcoes), 3);
    assert.equal(resumirParticipantesReserva(reserva, [], opcoes).find(({ inicial }) => inicial === 'N').quantidade, 1);
  }
});

test('três não pagantes mantêm todas as idades e não absorvem a categoria Idoso', () => {
  const catalog = [{ id: 'n', nome: 'Não pagante' }, { id: 'i', nome: 'Idoso' }];
  const reserva = {
    participantesPorTipo: { n: 3, i: 1 }, naoPagante: 3,
    idadesPorTipo: { n: [0, 2, 4] },
  };
  const opcoes = { naoPaganteLegadoAdicional: false };
  const summary = resumirParticipantesReserva(reserva, catalog, opcoes);
  const nonPaying = summary.find(({ inicial }) => inicial === 'N');
  assert.equal(contarParticipantesReserva(reserva, catalog, opcoes), 4);
  assert.equal(nonPaying.quantidade, 3);
  assert.equal(rotuloParticipanteComIdades(reserva, nonPaying, catalog), '3 não pagantes · Idades: 0, 2 e 4 anos');
  assert.equal(summary.find(({ inicial }) => inicial === 'I').quantidade, 1);
});

test('o alias Bebê do writer online não duplica o legado e mantém o nome cadastrado', () => {
  const catalog = [{ id: 'a', nome: 'Adulto' }, { id: 'b', nome: 'Bebê' }];
  const reserva = { participantesPorTipo: { a: 2, b: 1 }, naoPagante: 1, idadesPorTipo: { b: [0] } };
  const opcoes = { naoPaganteLegadoAdicional: false };
  const summary = resumirParticipantesReserva(reserva, catalog, opcoes);
  assert.equal(contarParticipantesReserva(reserva, catalog, opcoes), 3);
  assert.equal(summary.find(({ key }) => key === 'b').label, 'Bebê');
  assert.equal(rotuloParticipanteComIdades(reserva, summary.find(({ key }) => key === 'b'), catalog), '1 bebê · Idade: 0 anos');
  assert.equal(summary.some(({ inicial }) => inicial === 'N'), false);
});

test('categoria desconhecida não é classificada como não pagante por quantidade ou total declarado', () => {
  const unknownId = 'xYz9876543210AbCdEfGh';
  const reserva = { participantesPorTipo: { [unknownId]: 3 }, participantes: 4 };
  const opcoes = { naoPaganteLegadoAdicional: false };
  assert.equal(contarParticipantesReserva(reserva, [], opcoes), 3);
  assert.deepEqual(resumirParticipantesReserva(reserva, [], opcoes), [
    { key: unknownId, label: 'Participante', inicial: 'P', quantidade: 3 },
  ]);
});

test('idades adicionais manuais sob nao_pagante acompanham o N mesclado do catálogo sem repetir espelho online', () => {
  const nonPayingId = 'nP8dKs4aX1bQe9rT6vWz';
  const catalog = [{ id: nonPayingId, nome: 'Não pagante' }];
  const reserva = {
    participantesPorTipo: { [nonPayingId]: 1 }, naoPagante: 1,
    idadesPorTipo: { [nonPayingId]: [3], nao_pagante: [0] },
  };
  for (const [adicional, esperado] of [
    [true, '2 não pagantes · Idades: 3 e 0 anos'],
    [false, '1 não pagante · Idade: 3 anos'],
  ]) {
    const opcoes = { naoPaganteLegadoAdicional: adicional };
    const participante = resumirParticipantesReserva(reserva, catalog, opcoes)[0];
    assert.equal(rotuloParticipanteComIdades(reserva, participante, catalog, opcoes), esperado);
  }
});

test('catálogo com chave literal nao_pagante preserva idade zero e extra nao_pagante_legado', () => {
  const catalog = [{ id: 'nao_pagante', nome: 'Não pagante' }];
  const reserva = {
    participantesPorTipo: { nao_pagante: 1 }, naoPagante: 1,
    idadesPorTipo: { nao_pagante: [0], nao_pagante_legado: [2] },
  };
  const opcoes = { naoPaganteLegadoAdicional: true };
  const participante = resumirParticipantesReserva(reserva, catalog, opcoes)[0];
  assert.equal(rotuloParticipanteComIdades(reserva, participante, catalog, opcoes), '2 não pagantes · Idades: 0 e 2 anos');
});

test('idades manuais parciais indicam somente as faltantes e não repetem uma chave legada usada como principal', () => {
  const catalog = [{ id: 'np', nome: 'Não pagante' }];
  const opcoes = { naoPaganteLegadoAdicional: true };
  const reserva = {
    participantesPorTipo: { np: 2 }, naoPagante: 1,
    idadesPorTipo: { np: [2, null], nao_pagante: [0] },
  };
  const participante = resumirParticipantesReserva(reserva, catalog, opcoes)[0];
  assert.equal(rotuloParticipanteComIdades(reserva, participante, catalog, opcoes), '3 não pagantes · Idades: 2 e 0 anos · 1 sem idade informada');
  assert.equal(
    rotuloParticipanteComIdades({ ...reserva, idadesPorTipo: { nao_pagante: [0] } }, participante, catalog, opcoes),
    '3 não pagantes · Idade: 0 anos · 2 sem idade informada',
  );
});

test('idades de Isento e Não pagante permanecem separadas mesmo quando Isento usa chave nao_pagante', () => {
  const catalog = [{ id: 'nao_pagante', nome: 'Isento' }, { id: 'n', nome: 'Não pagante' }];
  const reserva = {
    participantesPorTipo: { nao_pagante: 1, n: 1 }, naoPagante: 1,
    idadesPorTipo: { nao_pagante: [4], n: [2], nao_pagante_legado: [0] },
  };
  const opcoes = { naoPaganteLegadoAdicional: true };
  const summary = resumirParticipantesReserva(reserva, catalog, opcoes);
  assert.equal(rotuloParticipanteComIdades(reserva, summary.find(({ label }) => label === 'Isento'), catalog, opcoes), '1 isento · Idade: 4 anos');
  assert.equal(rotuloParticipanteComIdades(reserva, summary.find(({ label }) => label === 'Não pagante'), catalog, opcoes), '2 não pagantes · Idades: 2 e 0 anos');
});

const packages = [{ id: 'brunch', nome: 'Brunch' }, { id: 'trilha', nome: 'Trilha', iconeUrl: '' }];

test('escreve as idades de crianças no resumo, com preferência pelos dados diretos', () => {
  const reserva = {
    participantesPorTipo: { [adultId]: 1, [childId]: 2 },
    idadesPorTipo: { crianca: [7, 10] },
    gruposParticipacao: [
      { idadesPorTipo: { [childId]: [8] } },
      { idadesPorTipo: { crianca: [11] } },
    ],
  };
  const [adulto, crianca] = resumirParticipantesReserva(reserva, types);
  assert.equal(rotuloParticipanteComIdades(reserva, adulto, types), undefined);
  assert.equal(rotuloParticipanteComIdades(reserva, crianca, types), '2 crianças · Idades: 7 e 10 anos');
  assert.equal(
    rotuloParticipanteComIdades({ ...reserva, idadesPorTipo: undefined }, crianca, types),
    '2 crianças · Idades: 8 e 11 anos',
  );
});

test('identifica idades não informadas e preserva a idade zero do não pagante', () => {
  const reserva = { criancas: 2, naoPagante: 1, idadesPorTipo: { crianca: [7, null], nao_pagante: [0] } };
  const [crianca, naoPagante] = resumirParticipantesReserva(reserva);
  assert.equal(rotuloParticipanteComIdades(reserva, crianca), '2 crianças · Idade: 7 anos · 1 sem idade informada');
  assert.equal(rotuloParticipanteComIdades(reserva, naoPagante), '1 não pagante · Idade: 0 anos');
  assert.equal(rotuloParticipanteComIdades({ criancas: 2 }, crianca), '2 crianças · Idades não informadas');
});
test('atividades não dependem de ícone e as duas ficam em uma linha', () => {
  assert.equal(rotuloAtividadeReserva({ pacoteIds: ['brunch'] }, packages), 'Brunch');
  assert.equal(rotuloAtividadeReserva({ pacoteIds: ['trilha'] }, packages), 'Trilha');
  assert.equal(rotuloAtividadeReserva({ pacoteIds: ['brunch', 'trilha'] }, packages), 'Brunch + Trilha');
});

test('listas vazias e IDs removidos não escondem o nome histórico da atividade', () => {
  for (const reserva of [
    { pacoteIds: [], atividade: 'Trilha' },
    { pacoteNomes: [], pacotes: [], pacoteIds: [adultId], atividade: 'Trilha' },
    { gruposParticipacao: [{ tipo: 'pacote', refId: adultId, nome: 'Observação de aves' }] },
  ]) assert.equal(rotuloAtividadeReserva(reserva, []), reserva.atividade || 'Observação de aves');
  assert.equal(rotuloAtividadeReserva({ pacoteIds: [adultId] }, []), '');
  assert.equal(rotuloAtividadeReserva({ pacoteIds: ['brunch', adultId], atividade: 'Brunch + Trilha' }, packages), 'Brunch + Trilha');
  assert.equal(rotuloAtividadeReserva({ gruposParticipacao: [{ tipo: 'combo', nome: 'Brunch + Trilha', pacoteIds: ['brunch', adultId] }] }, packages), 'Brunch + Trilha');
});

test('retira metadados comerciais de combo e preserva os nomes das atividades', () => {
  assert.deepEqual(nomesAtividadesReserva({ atividade: 'Brunch + Trilha (Combo: Brunch + Trilha - valor especial R$ 210 por pessoa)' }, []), ['Brunch', 'Trilha']);
  assert.equal(rotuloAtividadeReserva({ gruposParticipacao: [{ tipo: 'combo', nome: 'Brunch + Trilha', pacoteIds: ['brunch', 'trilha'] }] }, packages), 'Brunch + Trilha');
  assert.equal(rotuloAtividadeReserva({ comboId: 'duplo' }, packages, [{ id: 'duplo', nome: 'Combo especial', pacoteIds: ['brunch', 'trilha'] }]), 'Brunch + Trilha');
  assert.equal(rotuloAtividadeReserva({ pacoteNomes: ['Observação de aves'] }, packages), 'Observação de aves');
  assert.equal(rotuloAtividadeReserva({ atividade: 'Pacote Brunch + Trilha' }, []), 'Brunch + Trilha');
});

test('encurta somente os nomes oficiais conhecidos e preserva os nomes completos para outros usos', () => {
  const catalog = [{ id: 'brunch', nome: 'Brunch Gastronômico' }, { id: 'trilha', nome: 'Trilha Ecológica' }];
  const reserva = { pacoteIds: ['brunch', 'trilha'] };
  assert.deepEqual(nomesAtividadesReserva(reserva, catalog), ['Brunch Gastronômico', 'Trilha Ecológica']);
  assert.equal(rotuloAtividadeReserva(reserva, catalog), 'Brunch + Trilha');
  assert.equal(rotuloAtividadeReserva({ gruposParticipacao: [{ tipo: 'combo', nome: 'Brunch Gastronômico + Trilha Ecológica' }] }, []), 'Brunch + Trilha');
  assert.equal(rotuloAtividadeReserva({ atividade: 'Brunch ao luar + Trilha das aves' }, []), 'Brunch ao luar + Trilha das aves');
});

test('grupo genérico Combo ou Pacote não esconde uma atividade informada', () => {
  for (const nome of ['Combo', 'Pacote', 'Combo:', 'Pacote:']) {
    assert.equal(rotuloAtividadeReserva({ gruposParticipacao: [{ tipo: 'combo', nome }], atividade: 'Brunch Gastronômico + Trilha Ecológica' }, []), 'Brunch + Trilha');
  }
});
