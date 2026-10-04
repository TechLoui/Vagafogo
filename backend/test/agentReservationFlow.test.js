const test = require("node:test");
const assert = require("node:assert/strict");

const {
  cpfValidoParaReservaAgente,
  reservaAgenteTemConfirmacaoResumo,
} = require("../dist/services/agentReservationTools.js");

test("pagamento exige confirmacao explicita do resumo", () => {
  assert.equal(reservaAgenteTemConfirmacaoResumo({}), false);
  assert.equal(reservaAgenteTemConfirmacaoResumo({ confirmouResumo: false }), false);
  assert.equal(reservaAgenteTemConfirmacaoResumo({ confirmouResumo: "true" }), false);
  assert.equal(reservaAgenteTemConfirmacaoResumo({ confirmouResumo: true }), true);
});

test("CPF precisa passar pelos dois digitos verificadores antes do pagamento", () => {
  assert.equal(cpfValidoParaReservaAgente("529.982.247-25"), true);
  assert.equal(cpfValidoParaReservaAgente("970.560.661-15"), false);
  assert.equal(cpfValidoParaReservaAgente("979.560.661-16"), false);
  assert.equal(cpfValidoParaReservaAgente("111.111.111-11"), false);
  assert.equal(cpfValidoParaReservaAgente("123"), false);
  assert.equal(cpfValidoParaReservaAgente("529982247250"), false);
});
