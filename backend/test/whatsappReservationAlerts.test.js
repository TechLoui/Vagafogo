const test = require("node:test");
const assert = require("node:assert/strict");

const {
  montarResumoDiarioReservas,
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
