const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { estadoRetomadaSite, reservaSiteElegivelParaLembrete, mensagemRetomadaSite, processarLembretesReservaSite } = require("../dist/services/siteBookingFollowups");

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

test("retoma a identificacao quando o telefone foi recebido mas o bot nao respondeu", () => {
  const interrupted = candidate({ lastFrom: "client", bookingFollowup: { step: "identity_phone" } });
  assert.equal(estadoRetomadaSite(interrupted, now), "pronta");
  assert.match(mensagemRetomadaSite(interrupted), /interrompida antes de eu responder/);
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ lastFrom: "client" }), now), false);
});

test("retoma também conversa sem reserva e gera link para a mesma sessão", () => {
  const generic = candidate({ bookingFollowup: { step: "", date: "", hour: "", offerId: "" } });
  assert.equal(reservaSiteElegivelParaLembrete(generic, now), true);
  const message = mensagemRetomadaSite(generic);
  assert.match(message, /Jatobá/);
  assert.match(message, /sessao=site_test_followup_abc123/);
  assert.match(message, /telefone=5562999999999/);
  assert.match(message, /dúvida|dificuldade/i);
  assert.doesNotMatch(message, /reserva ainda não foi concluída/);
});

test("conta os quinze minutos desde a resposta do bot e cancela ao cliente voltar", () => {
  const answered = candidate({ lastMessageAt: now - 15 * 60_000 + 1 });
  assert.equal(estadoRetomadaSite(answered, now), "aguardando_15_min");
  assert.equal(estadoRetomadaSite(answered, now + 1), "pronta");
  assert.equal(estadoRetomadaSite(candidate({ lastFrom: "client", lastMessageAt: now }), now), "aguardando_bot");
  assert.equal(estadoRetomadaSite(candidate({ messages: [{ from: "client", text: "Já consegui reservar, obrigado!" }] }), now), "atendimento_encerrado");
});

const claimId = (phone) => createHash("sha256").update(`${phone}:2026-10-17`).digest("hex");
const memoryDb = () => {
  const records = new Map();
  let lock = Promise.resolve();
  const snapshot = (ref) => ({ exists: records.has(ref.id), data: () => records.get(ref.id) });
  return {
    records,
    db: {
      collection: () => ({
        doc: (id) => ({ id }),
        where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
      }),
      runTransaction(callback) {
        const task = lock.then(async () => {
          const writes = [];
          const result = await callback({
            get: async (ref) => snapshot(ref),
            set: (ref, data) => writes.push(() => records.set(ref.id, { ...records.get(ref.id), ...data })),
          });
          writes.forEach((write) => write());
          return result;
        });
        lock = task.catch(() => undefined);
        return task;
      },
    },
  };
};

const worker = (items = [candidate()]) => {
  const memory = memoryDb();
  const conversations = new Map(items.map((item) => [item.sessionId, structuredClone(item)]));
  const calls = [];
  let clock = now;
  const deps = {
    db: memory.db, now: () => clock,
    list: async () => [...conversations.values()].map((item) => structuredClone(item)),
    get: async (id) => structuredClone(conversations.get(id) || null),
    completed: async () => false,
    send: async (phone, text, requestId, name, options) => {
      calls.push({ phone, text, requestId, name, options });
      return { enviado: true };
    },
    recordAttempt: async (id, sent, error) => {
      const progress = conversations.get(id).bookingFollowup;
      progress.lastAttemptAt = clock;
      progress.lastError = sent ? null : error;
      if (sent) progress.sentAt = clock;
    },
  };
  return { ...memory, conversations, deps, calls, advance: (ms) => { clock += ms; },
    run: () => processarLembretesReservaSite(clock, deps) };
};

test("worker envia contexto e link uma única vez, com chave persistente e independente da sessão", async () => {
  const context = worker();
  assert.equal(await context.run(), 1);
  assert.equal(context.calls.length, 1);
  assert.match(context.calls[0].text, /Brunch Gastronômico/);
  assert.match(context.calls[0].text, /sessao=site_test_followup_abc123/);
  assert.equal(context.calls[0].options.tipoDisparo, "retomada_site");
  assert.deepEqual(context.calls[0].options.siteSessionIds, [candidate().sessionId]);
  const persistedId = `site-booking-followup:${claimId(candidate().phone)}`;
  assert.equal(context.calls[0].requestId, persistedId);
  assert.equal(await context.run(), 0);
  // Even a stale chat cache or a new session on the same day cannot duplicate delivery.
  const newSession = candidate({ sessionId: "site_other_followup_abc123" });
  context.conversations.set(newSession.sessionId, newSession);
  assert.equal(await context.run(), 0);
  assert.equal(context.calls.length, 1);
});

test("volta do cliente ou tomada por operador durante checagem impedem disparo", async () => {
  for (const change of [
    (item) => { item.lastMessageAt = now; item.bookingFollowup.lastClientAt = now; item.lastFrom = "client"; },
    (item) => { item.mode = "human"; },
    (item) => { item.bookingFollowup.optedOut = true; },
  ]) {
    const context = worker();
    context.deps.completed = async () => { change(context.conversations.get(candidate().sessionId)); return false; };
    assert.equal(await context.run(), 0);
    assert.equal(context.calls.length, 0);
  }
});

test("compra confirmada ou checagem indisponível não recebem recuperação de venda", async () => {
  const confirmed = worker();
  confirmed.deps.completed = async () => true;
  assert.equal(await confirmed.run(), 0);
  assert.equal(confirmed.calls.length, 0);
  assert.equal(confirmed.records.get(claimId(candidate().phone)).status, "suppressed");
  const unavailable = worker();
  unavailable.deps.completed = async () => { throw new Error("STATUS_UNAVAILABLE"); };
  assert.equal(await unavailable.run(), 0);
  assert.equal(unavailable.calls.length, 0);
});

test("claim interrompido expira e retenta com a mesma chave; pacing não duplica mensagem", async () => {
  const context = worker();
  const id = claimId(candidate().phone);
  context.records.set(id, { status: "sending", leaseUntil: now + 1000, leaseId: "interrupted", requestId: "stable-before-restart" });
  assert.equal(await context.run(), 0);
  context.advance(1001);
  context.deps.send = async (_phone, _text, requestId) => { context.calls.push(requestId); return { enviado: false, motivo: "DISPATCH_PACED" }; };
  assert.equal(await context.run(), 0);
  assert.deepEqual(context.calls, ["stable-before-restart"]);
  assert.equal(await context.run(), 0);
  context.advance(5 * 60_000);
  context.deps.send = async (_phone, _text, requestId) => { context.calls.push(requestId); return { enviado: true }; };
  assert.equal(await context.run(), 1);
  assert.deepEqual(context.calls, ["stable-before-restart", "stable-before-restart"]);
});

test("vinte claims antigos não bloqueiam o próximo cliente elegível", async () => {
  const items = Array.from({ length: 21 }, (_, index) => candidate({
    sessionId: `site_test_followup_${index}_abc123`, phone: `5562${999000000 + index}`,
  }));
  const context = worker(items);
  for (const item of items.slice(0, 20)) context.records.set(claimId(item.phone), { sessionId: item.sessionId, createdAt: new Date(now) });
  assert.equal(await context.run(), 1);
  assert.equal(context.calls[0].phone, items[20].phone);
});

test("uma sessão antiga não dispara se a mesma pessoa voltou em outra sessão", async () => {
  const oldSession = candidate();
  const activeSession = candidate({
    sessionId: "site_new_active_followup_abc123", lastMessageAt: now - 60_000,
    bookingFollowup: { lastClientAt: now - 60_000 },
  });
  const context = worker([oldSession, activeSession]);
  assert.equal(await context.run(), 0);
  assert.equal(context.calls.length, 0);
});

test("não aborda recusa, atendimento humano, reserva passada ou horário próximo", () => {
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ bookingFollowup: { optedIn: false } }), now), false);
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ mode: "human" }), now), false);
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ bookingFollowup: { date: "2026-10-16" } }), now), false);
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ bookingFollowup: { hour: "10:15" } }), now), false);
  assert.equal(reservaSiteElegivelParaLembrete(candidate({ phone: "" }), now), false);
});
