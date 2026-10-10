const test = require("node:test");
const assert = require("node:assert/strict");

const {
  classificarDataConfirmacaoWhatsapp,
} = require("../dist/services/whatsappReservationConfirmations");
const {
  prepararConfirmacaoWhatsapp,
} = require("../dist/services/whatsapp");

test("bloqueia confirmacao de reserva passada", () => {
  assert.equal(
    classificarDataConfirmacaoWhatsapp({ data: "2026-09-07" }, "2026-10-05"),
    "reserva_passada",
  );
});

test("permite confirmacao de reserva para hoje", () => {
  assert.equal(
    classificarDataConfirmacaoWhatsapp({ data: "2026-10-05" }, "2026-10-05"),
    "elegivel",
  );
});

test("permite confirmacao de reserva futura", () => {
  assert.equal(
    classificarDataConfirmacaoWhatsapp({ Data: "2026-10-06T13:00:00-03:00" }, "2026-10-05"),
    "elegivel",
  );
});

test("bloqueia por seguranca quando a data da reserva e invalida", () => {
  assert.equal(
    classificarDataConfirmacaoWhatsapp({ data: "07/09/2026" }, "2026-10-05"),
    "data_reserva_invalida",
  );
});

test("confirmacao inclui a localizacao mesmo quando o texto foi personalizado", async () => {
  const result = await prepararConfirmacaoWhatsapp("reserva-1", {
    nome: "Cliente",
    telefone: "5562999999999",
    data: "2026-10-08",
  }, {
    confirmacaoAutomaticaAtiva: true,
    mensagemConfirmacaoAutomatica: "Reserva confirmada, {nome}!",
  });
  assert.equal(result.enviado, true);
  assert.match(result.mensagem, /Reserva confirmada, Cliente!/);
  assert.match(result.mensagem, /maps\.app\.goo\.gl\/47wbDVWwAHQuKho86/);
});

test("confirmacao nao duplica uma localizacao ja configurada", async () => {
  const location = "https://maps.app.goo.gl/47wbDVWwAHQuKho86";
  const result = await prepararConfirmacaoWhatsapp("reserva-2", {
    telefone: "5562999999999",
    data: "2026-10-08",
  }, {
    confirmacaoAutomaticaAtiva: true,
    mensagemConfirmacaoAutomatica: `Reserva confirmada.\n${location}`,
  });
  assert.equal((result.mensagem.match(/maps\.app\.goo\.gl/g) || []).length, 1);
});

test("confirmacao migra automaticamente a localizacao antiga para a oficial", async () => {
  const result = await prepararConfirmacaoWhatsapp("reserva-3", {
    telefone: "5562999999999",
    data: "2026-10-08",
  }, {
    confirmacaoAutomaticaAtiva: true,
    mensagemConfirmacaoAutomatica: "Reserva confirmada.\nhttps://maps.google.com/?q=-15.824453,-48.995220",
  });
  assert.doesNotMatch(result.mensagem, /maps\.google\.com/);
  assert.match(result.mensagem, /maps\.app\.goo\.gl\/47wbDVWwAHQuKho86/);
});
