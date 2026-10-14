const test = require("node:test");
const assert = require("node:assert/strict");
const {
  classificarDataDisparo,
  dataAtualWhatsapp,
  normalizarDataDisparo,
} = require("../dist/services/whatsappDispatchDate");

const now = new Date("2026-10-14T15:00:00.000Z");

test("usa a data de Sao Paulo para validar a fila", () => {
  assert.equal(dataAtualWhatsapp(now), "2026-10-14");
});

test("considera expirado apenas o disparo anterior ao dia atual", () => {
  assert.equal(classificarDataDisparo("2026-10-13", "2026-10-14"), "expirado");
  assert.equal(classificarDataDisparo("2026-10-14", "2026-10-14"), "valido");
  assert.equal(classificarDataDisparo("2026-10-15", "2026-10-14"), "valido");
});

test("normaliza data brasileira e rejeita datas impossiveis", () => {
  assert.equal(normalizarDataDisparo("14/10/2026"), "2026-10-14");
  assert.equal(classificarDataDisparo("31/02/2026", "2026-10-14"), "data_invalida");
});
