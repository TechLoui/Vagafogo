const { test } = require("node:test");
const assert = require("node:assert/strict");
const { reservaSiteElegivelParaLembrete } = require("../dist/services/siteBookingFollowups");

const now = Date.parse("2026-10-17T13:00:00Z"); // 10h in Sao Paulo
const candidate = (override = {}) => ({
  sessionId: "site_test_followup_abc123",
  phone: "5562999999999",
  name: "Cliente Teste",
  mode: "bot",
  bookingFollowup: {
    step: "summary",
    date: "2026-10-17",
    hour: "13:00",
    offerId: "brunch",
    offerName: "Brunch Gastronômico",
    optedIn: true,
    lastClientAt: now - 31 * 60 * 1000,
    sentAt: null,
    lastAttemptAt: null,
    ...override.bookingFollowup,
  },
  ...Object.fromEntries(Object.entries(override).filter(([key]) => key !== "bookingFollowup")),
});

test("permite um único lembrete após 30 minutos para reserva ativa com aceite", () => {
  assert.equal(reservaSiteElegivelParaLembrete(candidate(), now), true);
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ bookingFollowup: { lastClientAt: now - 29 * 60 * 1000 } }), now), false);
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ bookingFollowup: { sentAt: now - 1000 } }), now), false);
});

test("não aborda recusa, atendimento humano, reserva passada ou horário próximo", () => {
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ bookingFollowup: { optedIn: false } }), now), false);
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ mode: "human" }), now), false);
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ bookingFollowup: { date: "2026-10-16" } }), now), false);
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ bookingFollowup: { hour: "10:15" } }), now), false);
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ bookingFollowup: { step: "" } }), now), false);
});
