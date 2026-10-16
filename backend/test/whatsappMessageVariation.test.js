const test = require("node:test");
const assert = require("node:assert/strict");
const { variarMensagemAutomatica } = require("../dist/services/whatsappMessageVariation");

test("variacao conserva dados e nome em confirmacao e lembrete", () => {
  const confirmation = "Olá, Jessica! ✅ Reserva confirmada.\nData: 17/10/2026\nValor: R$ 260\nhttps://maps.app.goo.gl/47wbDVWwAHQuKho86";
  const reminder = "Bom dia, Jessica! 🌿\n\nA Fazenda Vagafogo espera você hoje.\n⏰ 09:00";
  const first = variarMensagemAutomatica(confirmation, "confirmacao", "reserva-1");
  assert.match(first, /Jessica!/);
  assert.match(first, /17\/10\/2026/);
  assert.match(first, /R\$ 260/);
  assert.match(first, /maps\.app\.goo\.gl/);
  assert.equal(first, variarMensagemAutomatica(confirmation, "confirmacao", "reserva-1"));
  assert.match(variarMensagemAutomatica(reminder, "lembrete", "reserva-1"), /Jessica!/);
});

test("resumo conserva data e texto configurado conserva conteúdo", () => {
  const summary = variarMensagemAutomatica("🌿 Resumo das reservas de hoje — 17/10/2026\n2 reservas", "resumo", "2026-10-17");
  assert.match(summary, /17\/10\/2026/);
  assert.match(summary, /2 reservas/);
  const custom = variarMensagemAutomatica("Mensagem personalizada.\nHorário: 13:00", "agradecimento", "reserva-2");
  assert.match(custom, /Mensagem personalizada/);
  assert.match(custom, /Horário: 13:00/);
});
