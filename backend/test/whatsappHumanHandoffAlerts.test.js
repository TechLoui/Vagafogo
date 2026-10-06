const test = require("node:test");
const assert = require("node:assert/strict");

const { montarMensagemAlertaAtendimentoHumano } = require("../dist/services/whatsappHumanHandoffAlerts");

test("monta aviso operacional com cliente, motivo e orientacao", () => {
  const message = montarMensagemAlertaAtendimentoHumano({
    nome: "Karen Lima",
    telefone: "5562999999999",
    motivo: "alteracao_reserva",
    resumo: "Cliente precisa mudar a reserva de 10/10 para 11/10.",
  });
  assert.match(message, /Karen Lima/);
  assert.match(message, /Alteracao de reserva/);
  assert.match(message, /bot foi pausado/);
  assert.match(message, /vagafogo\.com\.br\/agente/);
});
