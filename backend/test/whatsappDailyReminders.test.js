const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildInstructions,
  reservaCriadaOuConfirmadaNoDia,
} = require("../dist/services/whatsappDailyReminders");

test("lembrete de brunch orienta a ligar por este WhatsApp, sem discar o número", () => {
  const instructions = buildInstructions({ atividade: "Brunch Gastronômico" });
  assert.match(instructions, /botão de chamada aqui neste WhatsApp/);
  assert.doesNotMatch(instructions, /ligue para \(62\)/);
});

test("exclui do bom dia a reserva criada no dia da visita", () => {
  assert.equal(
    reservaCriadaOuConfirmadaNoDia(
      { criadoEm: "2026-10-04T07:30:00-03:00" },
      "2026-10-04",
    ),
    true,
  );
});

test("exclui do bom dia a reserva paga no dia mesmo quando criada antes", () => {
  assert.equal(
    reservaCriadaOuConfirmadaNoDia(
      {
        criadoEm: "2026-10-03T18:00:00-03:00",
        dataPagamento: "2026-10-04T07:45:00-03:00",
      },
      "2026-10-04",
    ),
    true,
  );
});

test("mantem o bom dia para reserva criada e paga antes do dia da visita", () => {
  assert.equal(
    reservaCriadaOuConfirmadaNoDia(
      {
        criadoEm: "2026-10-02T10:00:00-03:00",
        dataPagamento: "2026-10-02T10:05:00-03:00",
      },
      "2026-10-04",
    ),
    false,
  );
});

test("usa a data de criacao do documento quando o campo legado nao existe", () => {
  assert.equal(
    reservaCriadaOuConfirmadaNoDia(
      {},
      "2026-10-04",
      "2026-10-04T08:00:00-03:00",
    ),
    true,
  );
});
