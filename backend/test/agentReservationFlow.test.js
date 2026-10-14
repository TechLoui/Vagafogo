const test = require("node:test");
const assert = require("node:assert/strict");

const {
  cpfValidoParaReservaAgente,
  reservaClientePodeConsultar,
  reservationDraftIdentity,
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

test("consulta da reserva exige identidade diferente no site e no WhatsApp", () => {
  const reserva = { cpf: "529.982.247-25", telefone: "+55 (62) 99222-5471" };
  assert.equal(reservaClientePodeConsultar(reserva, { canal: "site", cpf: "52998224725" }), true);
  assert.equal(reservaClientePodeConsultar(reserva, { canal: "site", cpf: "11111111111" }), false);
  assert.equal(reservaClientePodeConsultar(reserva, { canal: "site", telefone: reserva.telefone }), false);
  assert.equal(reservaClientePodeConsultar(reserva, { canal: "whatsapp", telefone: "556292225471" }), true);
  assert.equal(reservaClientePodeConsultar(reserva, { canal: "whatsapp", telefone: "5562999999999" }), false);
});

test("rascunhos do site sao separados por atendimento, sem alterar o do WhatsApp", () => {
  const telefone = "5562992225471";
  const siteA = reservationDraftIdentity({ sessionId: "site_atendimento_um_123", telefone });
  const siteB = reservationDraftIdentity({ sessionId: "site_atendimento_dois_456", telefone });
  const whatsapp = reservationDraftIdentity({ sessionId: `whatsapp_${telefone}`, telefone });
  assert.notEqual(siteA.id, siteB.id);
  assert.notEqual(siteA.id, whatsapp.id);
  assert.equal(whatsapp.sessionId, `whatsapp_${telefone}`);
});
