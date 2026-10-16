const test = require("node:test");
const assert = require("node:assert/strict");

const {
  montarResumoDiarioReservas,
  montarAvisoNovaReservaEquipe,
  reservaElegivelParaAvisoEquipe,
} = require("../dist/services/whatsappReservationAlerts");

const document = (data) => ({ data: () => data });

test("agrupa o resumo do dia por pacote e lista horario, pessoas e nome", () => {
  const summary = montarResumoDiarioReservas("2026-10-09", [
    document({
      nome: "Maria Souza",
      horario: "11:00",
      participantes: 2,
      atividade: "Brunch Gastronômico",
    }),
    document({
      nome: "João Lima",
      horario: "09:00",
      participantes: 3,
      atividade: "Brunch Gastronômico",
    }),
    document({
      nome: "Ana Costa",
      horario: "13:00",
      participantes: 4,
      atividade: "Brunch Gastronômico + Trilha Ecológica (Combo: Pacote Brunch + Trilha - Adulto R$ 160)",
    }),
  ]);

  assert.match(summary, /\*Brunch Gastronômico\* — 2 reservas, 5 pessoas/);
  assert.match(summary, /• 09:00 • 3 pessoas • João Lima/);
  assert.match(summary, /• 11:00 • 2 pessoas • Maria Souza/);
  assert.match(summary, /\*Pacote Brunch \+ Trilha\* — 1 reserva, 4 pessoas/);
  assert.match(summary, /• 13:00 • 4 pessoas • Ana Costa/);
});

test("aviso individual exige reserva criada e paga hoje para visita hoje", () => {
  const today = "2026-10-16";
  const base = { origem: "checkout", canalOrigem: "site", data: today, confirmada: true, status: "pago", telefone: "5562999999999" };
  assert.equal(reservaElegivelParaAvisoEquipe(base, today, new Date("2026-10-16T12:00:00Z")), true);
  assert.equal(reservaElegivelParaAvisoEquipe({ ...base, status: "aguardando", confirmada: false }, today, new Date("2026-10-16T12:00:00Z")), false);
  assert.equal(reservaElegivelParaAvisoEquipe(base, today, new Date("2026-10-15T12:00:00Z")), false);
  assert.equal(reservaElegivelParaAvisoEquipe({ ...base, data: "2026-10-17" }, today, new Date("2026-10-16T12:00:00Z")), false);
});

test("aviso remove codigo de modelo antigo e usa status atualizado", () => {
  const template = "🌿 Reserva para hoje\nCódigo: {id}\nCliente: {nome}\nStatus: {status}";
  const message = montarAvisoNovaReservaEquipe(template, { reservaId: "segredo", nome: "Panajiota", statusReserva: "pago" });
  assert.doesNotMatch(message, /Código|segredo|\{id\}/);
  assert.match(message, /Cliente: Panajiota/);
  assert.match(message, /Status: pago/);
});
