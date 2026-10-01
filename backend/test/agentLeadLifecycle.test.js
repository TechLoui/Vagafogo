const test = require("node:test");
const assert = require("node:assert/strict");

const { leadAgenteEstaFinalizado } = require("../dist/services/agentReservationTools.js");

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
