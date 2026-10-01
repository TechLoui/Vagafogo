const test = require("node:test");
const assert = require("node:assert/strict");

const {
  reservaAgenteTemConfirmacaoResumo,
} = require("../dist/services/agentReservationTools.js");

test("pagamento exige confirmacao explicita do resumo", () => {
  assert.equal(reservaAgenteTemConfirmacaoResumo({}), false);
  assert.equal(reservaAgenteTemConfirmacaoResumo({ confirmouResumo: false }), false);
  assert.equal(reservaAgenteTemConfirmacaoResumo({ confirmouResumo: "true" }), false);
  assert.equal(reservaAgenteTemConfirmacaoResumo({ confirmouResumo: true }), true);
});
