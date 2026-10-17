const { test } = require("node:test");
const assert = require("node:assert/strict");
const { availableSiteBookingSlots, availableSiteBookingTimes } = require("../dist/services/siteBookingAvailability");

const brunch = {
  id: "brunch", nome: "Brunch Gastronômico", modoHorario: "lista",
  horarios: ["09:00", "11:00", "13:00"], limite: 2,
};
const trail = {
  id: "trilha", nome: "Trilha Ecológica", modoHorario: "intervalo",
  horarioInicio: "09:00", horarioFim: "16:00", limite: 10,
};

test("não oferece o dia de hoje quando todos os horários do brunch passaram", () => {
  const now = new Date("2026-10-17T17:00:00Z"); // 14h em São Paulo
  assert.deepEqual(availableSiteBookingTimes("2026-10-17", brunch, {}, [], now), []);
  assert.deepEqual(availableSiteBookingTimes("2026-10-17", trail, {}, [], now), [""]);
  assert.deepEqual(availableSiteBookingTimes("2026-10-17", trail, {}, [], new Date("2026-10-17T18:00:00Z")), []);
});

test("não oferece horários bloqueados ou sem vagas", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  const reservation = {
    status: "pago", data: "2026-10-18", pacoteIds: ["brunch"],
    horario: "11:00", participantes: 2,
  };
  const day = { horarios: { "2026-10-18-brunch-09:00": false } };
  assert.deepEqual(availableSiteBookingTimes("2026-10-18", brunch, day, [reservation], now), ["13:00"]);
  assert.deepEqual(availableSiteBookingTimes("2026-10-18", brunch, { ...day, fechado: true }, [], now), []);
});

test("respeita reservas sem pagamento, vagas extras e dias bloqueados", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  const waiting = { status: "aguardando", pacoteIds: ["brunch"], horario: "09:00", participantes: 2 };
  assert.deepEqual(availableSiteBookingTimes("2026-10-18", brunch, {}, [waiting], now), brunch.horarios);
  const paid = { ...waiting, status: "pago" };
  assert.deepEqual(availableSiteBookingTimes("2026-10-18", brunch,
    { vagasExtras: { "2026-10-18-brunch-09:00": 1 } }, [paid], now), brunch.horarios);
  assert.deepEqual(availableSiteBookingTimes("2026-10-18", { ...brunch, datasBloqueadas: ["2026-10-18"] }, {}, [], now), []);
});

test("informa vagas restantes por horário sem inventar limite", () => {
  const now = new Date("2026-10-17T12:00:00Z");
  const paid = { status: "pago", pacoteIds: ["brunch"], horario: "11:00", participantes: 1 };
  const slots = availableSiteBookingSlots("2026-10-18", brunch, {}, [paid], now);
  assert.deepEqual(slots, [
    { horario: "09:00", vagasRestantes: 2 },
    { horario: "11:00", vagasRestantes: 1 },
    { horario: "13:00", vagasRestantes: 2 },
  ]);
  assert.deepEqual(availableSiteBookingSlots("2026-10-18", { ...trail, limite: 0 }, {}, [], now),
    [{ horario: "", vagasRestantes: null }]);
});
