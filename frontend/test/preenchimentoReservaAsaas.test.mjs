import test from 'node:test';
import assert from 'node:assert/strict';
import { preencherReservaAsaas } from '../src/utils/preenchimentoReservaAsaas.ts';

const question = (id, overrides = {}) => ({ id, pergunta: `Pergunta ${id}`, tipo: 'sim_nao', obrigatoria: true, emojiSim: '✅', emojiNao: '❌', ...overrides });
const pack = (id, perguntasPersonalizadas, overrides = {}) => ({ id, nome: `Pacote ${id}`, perguntasPersonalizadas, ...overrides });
const answer = (pacoteId, perguntaId, resposta, extra = {}) => ({ pacoteId, pacoteNome: `Pacote ${pacoteId}`, perguntaId, pergunta: `Pergunta ${perguntaId}`, tipo: 'sim_nao', obrigatoria: true, resposta, ...extra });
const sequence = (...values) => {
  let calls = 0;
  const random = () => { assert.ok(calls < values.length, 'No unexpected random draw is allowed'); return values[calls++]; };
  return { random, calls: () => calls };
};
const noRandom = () => { throw new Error('Already completed values must not be drawn again'); };
const honestTexts = new Set(['Não informado no cadastro original.', 'A confirmar com o visitante.', 'Resposta não coletada no cadastro manual.']);

test('sorteia Pix ou cartão uma única vez e mantém o resultado e sua proveniência na reexecução', () => {
  for (const [draw, method] of [[0, 'PIX'], [0.999, 'CREDIT_CARD']]) {
    const rng = sequence(draw);
    const filled = preencherReservaAsaas({}, [], rng.random);
    assert.equal(filled.formaPagamento, method);
    assert.equal(filled.formaPagamentoAutomatica, true);
    assert.equal(rng.calls(), 1);
    assert.deepEqual(preencherReservaAsaas(filled, [], noRandom), filled);
  }
});

test('normaliza aliases conhecidos sem sortear e mantém a distinção de método confirmado ou automático', () => {
  for (const method of ['PIX', ' pix ', 'Pix']) {
    assert.deepEqual(preencherReservaAsaas({ formaPagamento: method }, [], noRandom), { formaPagamento: 'PIX', perguntasPersonalizadas: [] });
  }
  for (const method of ['CREDIT_CARD', 'credit card', 'Cartão', 'cartao de credito', 'Cartão crédito', 'CRÉDITO', 'DEBIT_CARD', 'debit card', 'Cartão de débito', 'cartao debito', 'DÉBITO']) {
    assert.equal(preencherReservaAsaas({ formaPagamento: method }, [], noRandom).formaPagamento, 'CREDIT_CARD');
  }
  assert.equal(preencherReservaAsaas({ formaPagamento: 'cartão', formaPagamentoAutomatica: true }, [], noRandom).formaPagamentoAutomatica, true);
  assert.equal(preencherReservaAsaas({ formaPagamento: 'PIX', formaPagamentoAutomatica: false }, [], noRandom).formaPagamentoAutomatica, undefined);
});

test('texto novo usa somente marcadores honestos e respostas novas copiam o catálogo com proveniência', () => {
  const catalog = [pack('brunch', [question('a'), question('b', { tipo: 'texto', obrigatoria: false }), question('c', { tipo: 'texto' }), question('d', { tipo: 'texto' })])];
  const rng = sequence(0, 0.01, 0.4, 0.99);
  const filled = preencherReservaAsaas({ formaPagamento: 'PIX' }, catalog, rng.random);
  assert.equal(rng.calls(), 4);
  assert.equal(filled.perguntasPersonalizadas[0].resposta, 'sim');
  for (const row of filled.perguntasPersonalizadas) {
    assert.equal(row.respostaAutomatica, true);
    assert.equal(row.pacoteId, 'brunch');
    assert.equal(row.pacoteNome, 'Pacote brunch');
    assert.equal(row.emojiSim, '✅'); assert.equal(row.emojiNao, '❌');
    if (row.tipo === 'texto') assert.ok(honestTexts.has(row.resposta));
  }
  assert.equal(filled.perguntasPersonalizadas[1].obrigatoria, false);
  assert.equal(new Set(filled.perguntasPersonalizadas.slice(1).map((row) => row.resposta)).size, 3);
  assert.deepEqual(preencherReservaAsaas(filled, catalog, noRandom), filled);
});

test('preserva respostas humanas, metadados antigos e registros de pacotes fora do catálogo sem mutar entrada', () => {
  const human = answer('brunch', 'q', '  Não  ', { pergunta: 'Texto antigo preservado', emojiSim: '💚', observacao: { origem: 'visitante' } });
  const legacy = answer('retired', 'old', 'Valor antigo', { tipo: 'texto', respostaAutomatica: false, campoLegado: 'preservado' });
  const input = { formaPagamento: 'PIX', status: 'cancelado', idadesPorTipo: { crianca: [7] }, valor: 123, pagamentoRegistradoNoAsaas: true, perguntasPersonalizadas: [human, legacy] };
  const before = structuredClone(input);
  Object.freeze(input.perguntasPersonalizadas); Object.freeze(human); Object.freeze(legacy); Object.freeze(input);
  const filled = preencherReservaAsaas(input, [pack('brunch', [question('q', { pergunta: 'Novo rótulo' })])], noRandom);
  assert.deepEqual(filled.perguntasPersonalizadas, [human, legacy]);
  assert.deepEqual(input, before);
  assert.deepEqual(Object.keys(filled).sort(), ['formaPagamento', 'perguntasPersonalizadas']);
  assert.notEqual(filled.perguntasPersonalizadas[0], human);
});

test('deduplica por pacote e pergunta, mantém a primeira resposta não vazia e completa a condicional existente', () => {
  const conditional = { pergunta: 'Complemento antigo', tipo: 'texto', obrigatoria: true, resposta: 'Resposta humana', extra: 'preservado' };
  const input = { formaPagamento: 'PIX', perguntasPersonalizadas: [
    answer('a', 'q', ' ', { campoAntigo: 'preservado' }),
    answer('a', 'q', 'sim'), answer('a', 'q', 'nao', { perguntaCondicional: conditional }),
    answer('b', 'q', 'nao'),
    answer('a-b', 'c', 'sim'), answer('a', 'b-c', 'nao'),
  ] };
  const filled = preencherReservaAsaas(input, [], noRandom);
  assert.equal(filled.perguntasPersonalizadas.length, 4);
  assert.equal(filled.perguntasPersonalizadas[0].resposta, 'sim');
  assert.equal(filled.perguntasPersonalizadas[0].campoAntigo, 'preservado');
  assert.deepEqual(filled.perguntasPersonalizadas[0].perguntaCondicional, conditional);
  assert.equal(filled.perguntasPersonalizadas[1].resposta, 'nao');
});

test('preenche condicional apenas no ramo sorteado ativo e marca sua proveniência separadamente', () => {
  const catalog = [pack('p', [question('yes', { perguntaCondicional: { condicao: 'sim', pergunta: 'Complemento', tipo: 'texto', obrigatoria: false, emojiSim: '🌿' } }), question('no', { perguntaCondicional: { condicao: 'sim', pergunta: 'Não preencher', tipo: 'texto', obrigatoria: true } })])];
  const rng = sequence(0.1, 0.5, 0.9);
  const filled = preencherReservaAsaas({ formaPagamento: 'PIX' }, catalog, rng.random);
  const [active, inactive] = filled.perguntasPersonalizadas;
  assert.equal(rng.calls(), 3);
  assert.equal(active.resposta, 'sim');
  assert.equal(active.perguntaCondicional.respostaAutomatica, true);
  assert.equal(active.perguntaCondicional.obrigatoria, false);
  assert.equal(active.perguntaCondicional.emojiSim, '🌿');
  assert.ok(honestTexts.has(active.perguntaCondicional.resposta));
  assert.equal(inactive.resposta, 'nao');
  assert.equal(inactive.perguntaCondicional, undefined);
  assert.deepEqual(preencherReservaAsaas(filled, catalog, noRandom), filled);
});

test('condicional faltante pode ser preenchida sem alterar resposta principal humana ou apagar ramo inativo antigo', () => {
  const catalog = [pack('p', [question('q', { perguntaCondicional: { condicao: 'nao', pergunta: 'Complemento novo', tipo: 'sim_nao', obrigatoria: true, emojiNao: '➖' } })])];
  const human = answer('p', 'q', ' Não ', { campoAntigo: 'ok' });
  const filled = preencherReservaAsaas({ formaPagamento: 'PIX', perguntasPersonalizadas: [human] }, catalog, () => 0.9);
  assert.equal(filled.perguntasPersonalizadas[0].resposta, ' Não ');
  assert.equal(filled.perguntasPersonalizadas[0].respostaAutomatica, undefined);
  assert.equal(filled.perguntasPersonalizadas[0].campoAntigo, 'ok');
  assert.equal(filled.perguntasPersonalizadas[0].perguntaCondicional.resposta, 'nao');
  const inactive = { ...human, resposta: 'sim', perguntaCondicional: { pergunta: 'Antiga', tipo: 'texto', obrigatoria: false, resposta: 'Não apagar' } };
  assert.deepEqual(preencherReservaAsaas({ formaPagamento: 'PIX', perguntasPersonalizadas: [inactive] }, catalog, noRandom).perguntasPersonalizadas, [inactive]);
});

test('blank antigo é preenchido sem perder campos extras e catálogo duplicado não cria respostas nem sorteios adicionais', () => {
  const blank = answer('p', 'q', '   ', { extra: 'mantido', tipo: 'texto' });
  const catalog = [pack('p', [question('q'), question('q')]), pack(undefined, [question('ignored')])];
  const rng = sequence(0.9);
  const filled = preencherReservaAsaas({ formaPagamento: 'PIX', perguntasPersonalizadas: [blank] }, catalog, rng.random);
  assert.equal(filled.perguntasPersonalizadas.length, 1);
  assert.equal(filled.perguntasPersonalizadas[0].resposta, 'nao');
  assert.equal(filled.perguntasPersonalizadas[0].tipo, 'sim_nao');
  assert.equal(filled.perguntasPersonalizadas[0].extra, 'mantido');
  assert.equal(filled.perguntasPersonalizadas[0].respostaAutomatica, true);
  assert.equal(rng.calls(), 1);
});
