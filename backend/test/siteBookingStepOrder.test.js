const { test } = require("node:test");
const assert = require("node:assert/strict");
const { requireTimeBeforeParticipants } = require("../dist/services/siteBookingStepOrder");

const packages = [
  { id: "brunch", modoHorario: "lista", horarios: ["09:00", "11:00", "13:00"] },
  { id: "trilha", modoHorario: "intervalo", horarios: [] },
];
const combos = [{ id: "combo", pacoteIds: ["brunch", "trilha"] }];

test("pede horário antes de participantes no brunch e no combo", () => {
  for (const [tipoOferta, ofertaId] of [["pacote", "brunch"], ["combo", "combo"]]) {
    const ui = { step: "participants", draft: { tipoOferta, ofertaId, data: "2026-10-18" } };
    assert.equal(requireTimeBeforeParticipants(ui, packages, combos)?.step, "time");
  }
});

test("não repete horário já escolhido nem cria horário para trilha", () => {
  assert.equal(requireTimeBeforeParticipants({ step: "participants", draft: {
    tipoOferta: "combo", ofertaId: "combo", data: "2026-10-18", horariosPorPacote: { brunch: "11:00" },
  } }, packages, combos), null);
  assert.equal(requireTimeBeforeParticipants({ step: "participants", draft: {
    tipoOferta: "pacote", ofertaId: "trilha", data: "2026-10-18",
  } }, packages, combos), null);
});
