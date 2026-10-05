const test = require("node:test");
const assert = require("node:assert/strict");

const {
  classificarDataConfirmacaoWhatsapp,
} = require("../dist/services/whatsappReservationConfirmations");

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
