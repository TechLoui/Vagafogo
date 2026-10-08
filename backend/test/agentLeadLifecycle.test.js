const test = require("node:test");
const assert = require("node:assert/strict");

const {
  canonicalLeadPhone,
  leadAgenteEstaFinalizado,
  leadPhoneVariants,
  resolverRetornoLeadAgenteAoBot,
  resolverTransicaoLeadAgente,
} = require("../dist/services/agentReservationTools.js");

test("duvida resolvida encerra o lead imediatamente", () => {
  assert.equal(leadAgenteEstaFinalizado("atendimento_concluido", "duvida_resolvida"), true);
});

test("pagamento pendente permanece em acompanhamento", () => {
  assert.equal(leadAgenteEstaFinalizado("pagamento_pendente", "pagamento_pendente"), false);
});

test("reserva confirmada e nao conversao continuam terminais", () => {
  assert.equal(leadAgenteEstaFinalizado("concluida", "reserva_confirmada"), true);
  assert.equal(leadAgenteEstaFinalizado("encerrado_sem_reserva", "nao_convertido"), true);
});

test("fechamento localiza o mesmo celular com ou sem nono digito", () => {
  assert.deepEqual(leadPhoneVariants("+55 (81) 98631-3906"), ["5581986313906", "558186313906"]);
  assert.deepEqual(leadPhoneVariants("+55 (81) 8631-3906"), ["558186313906", "5581986313906"]);
  assert.equal(canonicalLeadPhone("+55 (81) 8631-3906"), "5581986313906");
});

test("webhook confirmado nao regride para pagamento pendente", () => {
  const transition = resolverTransicaoLeadAgente({
    etapa: "concluida",
    resultado: "reserva_confirmada",
    finalizado: true,
    reservaId: "reserva-1",
    pagamentoId: "pagamento-1",
  }, {
    etapa: "pagamento_pendente",
    resultado: "pagamento_pendente",
    reservaId: "reserva-1",
    pagamentoId: "pagamento-1",
  });
  assert.equal(transition.patch.etapa, "concluida");
  assert.equal(transition.patch.resultado, "reserva_confirmada");
  assert.equal(transition.regressaoIgnorada, true);
});

test("novo interesse reabre o mesmo contato em um novo ciclo sem dados velhos", () => {
  const transition = resolverTransicaoLeadAgente({
    etapa: "atendimento_concluido",
    resultado: "duvida_resolvida",
    finalizado: true,
    cicloAtendimento: 2,
    reservaId: "antiga",
    pagamentoId: "antigo",
    valorEstimado: 500,
  }, {
    etapa: "contato_iniciado",
    resultado: "em_andamento",
    resumo: "Novo interesse comercial.",
  });
  assert.equal(transition.reaberto, true);
  assert.equal(transition.patch.cicloAtendimento, 3);
  assert.equal(transition.patch.reservaId, null);
  assert.equal(transition.patch.pagamentoId, null);
  assert.equal(transition.patch.valorEstimado, null);
  assert.equal(transition.patch.finalizado, false);
});

test("cliente que retorna apos inatividade retoma o mesmo ciclo", () => {
  const transition = resolverTransicaoLeadAgente({
    etapa: "dados_em_coleta",
    resultado: "aguardando_cliente",
    finalizado: true,
    cicloAtendimento: 4,
    participantes: 3,
    tentativasRetomada: 2,
    suspensoPorInatividade: true,
  }, {
    etapa: "dados_em_coleta",
    resultado: "em_andamento",
  });
  assert.equal(transition.retomado, true);
  assert.equal(transition.reaberto, false);
  assert.equal(transition.patch.cicloAtendimento, 4);
  assert.equal(transition.patch.finalizado, false);
  assert.equal(transition.patch.tentativasRetomada, 0);
  assert.equal(transition.patch.suspensoPorInatividade, false);
});

test("interpretacao tardia nao regride etapa ativa", () => {
  const transition = resolverTransicaoLeadAgente({
    etapa: "dados_em_coleta",
    resultado: "em_andamento",
  }, {
    etapa: "contato_iniciado",
    resultado: "em_andamento",
  });
  assert.equal(transition.patch.etapa, "dados_em_coleta");
  assert.equal(transition.regressaoIgnorada, true);
});

test("handoff preserva a etapa para o retorno automatico ao bot", () => {
  const handoff = resolverTransicaoLeadAgente({
    etapa: "dados_em_coleta",
    resultado: "em_andamento",
  }, {
    etapa: "atendimento_humano",
    resultado: "atendimento_humano",
  });
  assert.equal(handoff.patch.etapaAntesAtendimentoHumano, "dados_em_coleta");
  assert.equal(handoff.patch.resultadoAntesAtendimentoHumano, "em_andamento");

  const returned = resolverRetornoLeadAgenteAoBot(handoff.patch);
  assert.equal(returned.atualizar, true);
  assert.equal(returned.patch.etapa, "dados_em_coleta");
  assert.equal(returned.patch.resultado, "em_andamento");
  assert.equal(returned.patch.motivo, "retorno_automatico_ao_bot");
});

test("lead fora de atendimento humano nao e alterado pelo retorno automatico", () => {
  const returned = resolverRetornoLeadAgenteAoBot({
    etapa: "pagamento_pendente",
    resultado: "pagamento_pendente",
  });
  assert.equal(returned.atualizar, false);
});
