const { test } = require("node:test");
const assert = require("node:assert/strict");
const { estadoRetomadaSite, reservaSiteElegivelParaLembrete, mensagemRetomadaSite } = require("../dist/services/siteBookingFollowups");

const now = Date.parse("2026-10-17T13:00:00Z"); // 10h in Sao Paulo
const candidate = (override = {}) => ({
  sessionId: "site_test_followup_abc123",
  phone: "5562999999999",
  name: "Cliente Teste",
  mode: "bot",
  lastFrom: "bot",
  bookingFollowup: {
    step: "summary",
    date: "2026-10-17",
    hour: "13:00",
    offerId: "brunch",
    offerName: "Brunch Gastronômico",
    optedIn: true,
    lastClientAt: now - 16 * 60 * 1000,
    sentAt: null,
    lastAttemptAt: null,
    ...override.bookingFollowup,
  },
  ...Object.fromEntries(Object.entries(override).filter(([key]) => key !== "bookingFollowup")),
});

test("permite um único lembrete após 15 minutos sem resposta", () => {
  assert.equal(reservaSiteElegivelParaLembrete(candidate(), now), true);
  assert.equal(estadoRetomadaSite(candidate(), now), "pronta");
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ bookingFollowup: { lastClientAt: now - 14 * 60 * 1000 } }), now), false);
  assert.equal(estadoRetomadaSite(candidate({ bookingFollowup: { lastClientAt: now - 14 * 60 * 1000 } }), now), "aguardando_15_min");
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ bookingFollowup: { sentAt: now - 1000 } }), now), false);
  assert.equal(estadoRetomadaSite(candidate({ bookingFollowup: { sentAt: now - 1000 } }), now), "enviada");
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ lastFrom: "client" }), now), false);
});

test("mostra quando uma tentativa falhou e precisa ser repetida", () => {
  const failed = candidate({ bookingFollowup: { lastAttemptAt: now - 60_000, lastError: "WhatsApp nao conectado" } });
  assert.equal(estadoRetomadaSite(failed, now), "aguardando_nova_tentativa");
  assert.equal(reservaSiteElegivelParaLembrete(failed, now + 5 * 60_000), true);
});

test("retoma também conversa sem reserva e gera link para a mesma sessão", () => {
  const generic = candidate({ bookingFollowup: { step: "", date: "", hour: "", offerId: "" } });
  assert.equal(reservaSiteElegivelParaLembrete(generic, now), true);
  const message = mensagemRetomadaSite(generic);
  assert.match(message, /15|conversa no site ficou em pausa/);
  assert.match(message, /sessao=site_test_followup_abc123/);
  assert.match(message, /telefone=5562999999999/);
  assert.match(message, /tirar dúvidas e ajudar você com sua reserva/);
  assert.doesNotMatch(message, /reserva ainda não foi concluída/);
});

test("não aborda recusa, atendimento humano, reserva passada ou horário próximo", () => {
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ bookingFollowup: { optedIn: false } }), now), false);
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ mode: "human" }), now), false);
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ bookingFollowup: { date: "2026-10-16" } }), now), false);
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ bookingFollowup: { hour: "10:15" } }), now), false);
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ phone: "" }), now), false);
});
