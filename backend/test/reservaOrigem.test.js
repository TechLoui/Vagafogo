const test = require("node:test");
const assert = require("node:assert/strict");

const {
  classificarOrigemReserva,
  reservaEhManual,
  reservaPodeReceberDisparoAutomatico,
} = require("../dist/services/reservaOrigem");

test("bloqueia reserva manual mesmo com variacoes de caixa e campos legados", () => {
  assert.equal(reservaEhManual({ origem: "Manual" }), true);
  assert.equal(reservaEhManual({ Origem: "RESERVA MANUAL" }), true);
  assert.equal(reservaEhManual({ origem: "checkout", criadaManualmente: true }), true);
  assert.equal(reservaPodeReceberDisparoAutomatico({ origem: "manual" }), false);
});

test("trata como manual legada o checkout sem procedencia automatizada", () => {
  const reserva = { origem: "checkout", status: "pago" };
  assert.equal(classificarOrigemReserva(reserva), "manual_legada");
  assert.equal(reservaPodeReceberDisparoAutomatico(reserva), false);
});

test("mantem checkout do site e do whatsapp elegiveis", () => {
  assert.equal(
    reservaPodeReceberDisparoAutomatico({ origem: "checkout", canalOrigem: "site" }),
    true,
  );
  assert.equal(
    reservaPodeReceberDisparoAutomatico({
      origem: "checkout",
      atribuicao: { sourceChannel: "whatsapp" },
    }),
    true,
  );
  assert.equal(
    reservaPodeReceberDisparoAutomatico({ origem: "agente_whatsapp" }),
    true,
  );
});

test("origem ausente nao entra por engano em fila automatica", () => {
  assert.equal(classificarOrigemReserva({ status: "pago" }), "desconhecida");
  assert.equal(reservaPodeReceberDisparoAutomatico({ status: "pago" }), false);
});
