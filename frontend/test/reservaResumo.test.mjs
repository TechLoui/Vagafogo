import assert from 'node:assert/strict';
import test from 'node:test';
import {
  nomeTipoParticipante, resumirParticipantesReserva, nomesAtividadesReserva, rotuloAtividadeReserva,
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

const packages = [{ id: 'brunch', nome: 'Brunch' }, { id: 'trilha', nome: 'Trilha', iconeUrl: '' }];
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
