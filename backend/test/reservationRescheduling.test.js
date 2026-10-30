const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
process.env.FIREBASE_SERVICE_ACCOUNT = "";
const {
  RESCHEDULE_REQUESTS, solicitarRemarcacaoReserva, obterContextoRemarcacao, decidirRemarcacaoReserva,
  processarNotificacaoRemarcacao, processarNotificacoesRemarcacao, mensagemAutorizacaoRemarcacao,
} = require("../dist/services/reservationRescheduling");
const { registrarResultadoRemarcacaoSite } = require("../dist/services/siteChatConversations");
const { alvoRemarcacaoLegadaSite } = require("../dist/services/siteHumanHandoffPolicy");

const clone = (value) => value === undefined ? undefined : structuredClone(value);
const memoryDb = () => {
  const records = new Map();
  let lock = Promise.resolve();
  let failReceipt = false;
  const snapshot = (ref) => ({ id: ref.id, ref, exists: records.has(ref.path), data: () => clone(records.get(ref.path)) });
  const apply = (ref, value, merge) => records.set(ref.path, merge ? { ...records.get(ref.path), ...clone(value) } : clone(value));
  const doc = (collection, id) => ({ id, path: `${collection}/${id}`, get: async function () { return snapshot(this); },
    set: async function (value, options) { apply(this, value, options?.merge); } });
  const query = (collection, filters = [], maximum = Infinity) => ({
    where: (field, op, value) => query(collection, [...filters, [field, op, value]], maximum),
    limit: (count) => query(collection, filters, count),
    async get() {
      const docs = [...records.entries()].filter(([path, value]) => path.startsWith(`${collection}/`)
        && filters.every(([field, op, expected]) => op === "in" ? expected.includes(value[field]) : value[field] === expected))
        .slice(0, maximum).map(([path]) => snapshot(doc(collection, path.slice(collection.length + 1))));
      return { docs, size: docs.length, empty: !docs.length };
    },
    doc: (id) => doc(collection, id),
  });
  const db = {
    collection: (name) => query(name),
    runTransaction(callback) {
      const task = lock.then(async () => {
        const writes = [];
        const result = await callback({
          get: async (ref) => { assert.equal(writes.length, 0, "Firestore exige leituras antes das escritas"); return snapshot(ref); },
          set: (ref, data, options) => {
            if (failReceipt && ref.path.startsWith("crm_agent_reschedule_decisions/")) { failReceipt = false; throw new Error("COMMIT_FAILED"); }
            writes.push(() => apply(ref, data, options?.merge));
          },
          update: (ref, data) => writes.push(() => apply(ref, data, true)),
        });
        writes.forEach((write) => write());
        return result;
      });
      lock = task.catch(() => undefined);
      return task;
    },
  };
  return { db, records, failNextReceipt: () => { failReceipt = true; }, seed: (collection, id, value) => records.set(`${collection}/${id}`, clone(value)),
    value: (collection, id) => clone(records.get(`${collection}/${id}`)) };
};

const PHONE = "5562999000000";
const RESERVATION = "reservation-0001";
const OWNER = "5562991150376";
const base = { data: "2026-11-01", horario: "09:00", horariosPorPacote: { brunch: "09:00" },
  telefone: PHONE, nome: "Mara Teste", atividade: "Brunch + Trilha", participantes: 2,
  status: "pago", confirmada: true, valor: 280, paymentId: "paid-unchanged", cpf: "52998224725" };
const fingerprint = (record) => createHash("sha256").update(JSON.stringify([record.data, record.horario])).digest("hex");
const scenario = () => {
  const memory = memoryDb();
  memory.seed("reservas", RESERVATION, base);
  let now = Date.parse("2026-10-30T14:00:00Z");
  let applications = 0;
  const sent = [];
  const site = [];
  const preview = (id, target) => {
    const record = memory.value("reservas", id);
    return { disponivel: true, status: "disponivel", motivos: [], reservaId: id,
      antes: { data: record.data, horario: record.horario, horariosPorPacote: record.horariosPorPacote },
      depois: { data: target.data, horario: target.horario || record.horario, horariosPorPacote: { brunch: target.horario || record.horario } },
      fingerprint: fingerprint(record), nome: record.nome, telefone: record.telefone, atividade: record.atividade, participantes: record.participantes, pacotes: [] };
  };
  const deps = {
    db: memory.db, now: () => now, processImmediately: false,
    preview: async (id, target) => preview(id, target),
    apply: async (id, target, { transaction, expectedFingerprint }) => {
      const ref = memory.db.collection("reservas").doc(id);
      const current = (await transaction.get(ref)).data();
      const result = preview(id, target);
      if (fingerprint(current) !== expectedFingerprint) return { ...result, aplicada: false };
      applications++;
      transaction.update(ref, { data: result.depois.data, horario: result.depois.horario, horariosPorPacote: result.depois.horariosPorPacote });
      return { ...result, aplicada: true };
    },
    send: async (phone, text, requestId, name, options) => { sent.push({ phone, text, requestId, name, options }); return { enviado: true, messageId: `message-${sent.length}` }; },
    siteMessage: async (sessionId, message) => { site.push({ sessionId, ...message }); },
  };
  const input = (overrides = {}) => ({ sessionId: `whatsapp_${PHONE}`, telefone: PHONE, canal: "whatsapp", codigo: RESERVATION, novaData: "2026-11-02", novoHorario: "11:00", ...overrides });
  const decide = (text, source = `owner:${text}`, extra = {}) => decidirRemarcacaoReserva({ telefoneOperador: OWNER, mensagem: text, sourceMessageId: source, ...extra }, deps);
  return { ...memory, deps, sent, site, input, decide, applications: () => applications, advance: (ms) => { now += ms; } };
};

test("consulta disponibilidade e pede aprovação mínima, sem alterar a reserva antes do 1", async () => {
  const fixture = scenario();
  const result = await solicitarRemarcacaoReserva(fixture.input(), fixture.deps);
  assert.equal(result.status, "aguardando_autorizacao");
  assert.match(result.resposta, /ainda não foi confirmada/);
  assert.deepEqual(fixture.value("reservas", RESERVATION), base);
  await processarNotificacaoRemarcacao(result.solicitacaoId, fixture.deps);
  const owner = fixture.sent[0];
  assert.equal(owner.phone, OWNER);
  assert.match(owner.text, /Atual: 01\/11\/2026 às 09:00/);
  assert.match(owner.text, /Solicitado: 02\/11\/2026 às 11:00/);
  assert.match(owner.text, /1 — autorizar \| 2 — negar/);
  assert.match(owner.text, new RegExp(`wa.me/${PHONE}`));
  assert.doesNotMatch(owner.text, /52998224725|280|paid-unchanged|CPF|paymentId/);
  assert.equal(fixture.sent.length, 1);
});

test("aprovação grava a remarcação e só então notifica; replay não aplica a próxima solicitação", async () => {
  const fixture = scenario();
  const request = await solicitarRemarcacaoReserva(fixture.input(), fixture.deps);
  const approved = await fixture.decide("1", "same-inbound");
  assert.equal(approved.resposta, "✅ Troca realizada com sucesso.");
  const reservation = fixture.value("reservas", RESERVATION);
  assert.equal(reservation.data, "2026-11-02");
  assert.equal(reservation.horario, "11:00");
  for (const key of ["valor", "status", "confirmada", "paymentId", "participantes", "atividade", "cpf"]) assert.deepEqual(reservation[key], base[key]);
  assert.equal(fixture.sent.length, 0);
  await processarNotificacaoRemarcacao(request.solicitacaoId, fixture.deps);
  assert.equal(fixture.sent[0].text, "✅ Troca realizada com sucesso.");
  const next = await solicitarRemarcacaoReserva(fixture.input({ novaData: "2026-11-03" }), fixture.deps);
  assert.notEqual(next.solicitacaoId, request.solicitacaoId);
  assert.deepEqual(await fixture.decide("1", "same-inbound"), approved);
  assert.equal(fixture.applications(), 1);
  assert.equal(fixture.value(RESCHEDULE_REQUESTS, next.solicitacaoId).status, "awaiting_owner");
});

test("negação orienta ligação e não modifica dados; outro número não pode autorizar", async () => {
  const fixture = scenario();
  const request = await solicitarRemarcacaoReserva(fixture.input(), fixture.deps);
  assert.deepEqual(await decidirRemarcacaoReserva({ telefoneOperador: PHONE, mensagem: "1", sourceMessageId: "forged" }, fixture.deps), { handled: false });
  await fixture.decide("2");
  assert.deepEqual(fixture.value("reservas", RESERVATION), base);
  await processarNotificacaoRemarcacao(request.solicitacaoId, fixture.deps);
  assert.match(fixture.sent[0].text, /não foi autorizada/);
  assert.match(fixture.sent[0].text, /ligue pelo WhatsApp/);
  assert.match(fixture.sent[0].text, /08h às 17h/);
  assert.doesNotMatch(fixture.sent[0].text, /Troca realizada com sucesso/);
});

test("pedido repetido deduplica e novo alvo invalida o código anterior", async () => {
  const fixture = scenario();
  const first = await solicitarRemarcacaoReserva(fixture.input(), fixture.deps);
  const same = await solicitarRemarcacaoReserva(fixture.input(), fixture.deps);
  assert.equal(first.solicitacaoId, same.solicitacaoId);
  const newer = await solicitarRemarcacaoReserva(fixture.input({ novaData: "2026-11-04" }), fixture.deps);
  assert.equal(fixture.value(RESCHEDULE_REQUESTS, first.solicitacaoId).status, "superseded");
  const obsolete = await fixture.decide(`1 ${first.codigoSolicitacao}`);
  assert.match(obsolete.resposta, /não pode ser aplicado/);
  assert.deepEqual(fixture.value("reservas", RESERVATION), base);
  assert.equal(fixture.value(RESCHEDULE_REQUESTS, newer.solicitacaoId).status, "awaiting_owner");
});

test("duas reservas exigem código ou resposta citada; 1 solto não escolhe cliente", async () => {
  const fixture = scenario();
  fixture.seed("reservas", "reservation-0002", { ...base, nome: "Segundo Cliente" });
  const first = await solicitarRemarcacaoReserva(fixture.input(), fixture.deps);
  const second = await solicitarRemarcacaoReserva(fixture.input({ codigo: "reservation-0002" }), fixture.deps);
  assert.match((await fixture.decide("1", "ambiguous")).resposta, /mais de um pedido/);
  assert.equal(fixture.applications(), 0);
  await processarNotificacaoRemarcacao(first.solicitacaoId, fixture.deps);
  await fixture.decide("1", "quoted", { quotedMessageId: "message-1" });
  assert.equal(fixture.value(RESCHEDULE_REQUESTS, first.solicitacaoId).status, "approved");
  assert.equal(fixture.value(RESCHEDULE_REQUESTS, second.solicitacaoId).status, "awaiting_owner");
  await fixture.decide(`2 ${second.codigoSolicitacao}`);
  assert.equal(fixture.value(RESCHEDULE_REQUESTS, second.solicitacaoId).status, "rejected");
});

test("código da mensagem citada identifica o pedido quando o id de envio se perdeu", async () => {
  const fixture = scenario();
  fixture.seed("reservas", "reservation-0002", { ...base, nome: "Segundo Cliente" });
  const first = await solicitarRemarcacaoReserva(fixture.input(), fixture.deps);
  const second = await solicitarRemarcacaoReserva(fixture.input({ codigo: "reservation-0002" }), fixture.deps);
  await fixture.decide("1", "quote-code", { quotedMessageId: "unknown-after-timeout", quotedRequestCode: first.codigoSolicitacao });
  assert.equal(fixture.value(RESCHEDULE_REQUESTS, first.solicitacaoId).status, "approved");
  assert.equal(fixture.value(RESCHEDULE_REQUESTS, second.solicitacaoId).status, "awaiting_owner");
});

test("vagas indisponíveis antes da solicitação não geram aviso; rechecagem pode impedir aprovação", async () => {
  const fixture = scenario();
  const preview = fixture.deps.preview;
  fixture.deps.preview = async (...args) => ({ ...await preview(...args), disponivel: false });
  assert.equal((await solicitarRemarcacaoReserva(fixture.input(), fixture.deps)).status, "dados_pendentes");
  assert.equal([...fixture.records.keys()].filter((path) => path.startsWith(`${RESCHEDULE_REQUESTS}/`)).length, 0);
  fixture.deps.preview = preview;
  const request = await solicitarRemarcacaoReserva(fixture.input(), fixture.deps);
  fixture.deps.apply = async () => ({ aplicada: false });
  const result = await fixture.decide("1");
  assert.doesNotMatch(result.resposta, /Troca realizada com sucesso/);
  assert.deepEqual(fixture.value("reservas", RESERVATION), base);
  assert.equal(fixture.value(RESCHEDULE_REQUESTS, request.solicitacaoId).status, "unavailable");
});

test("Uirá como titular recebe somente o resultado de sucesso, sem confirmação extra de fila", async () => {
  for (const phone of [OWNER, "556291150376"]) {
    const fixture = scenario();
    fixture.seed("reservas", RESERVATION, { ...base, telefone: phone });
    const request = await solicitarRemarcacaoReserva(fixture.input({ telefone: phone, sessionId: `whatsapp_${phone}` }), fixture.deps);
    await processarNotificacaoRemarcacao(request.solicitacaoId, fixture.deps);
    const decision = await fixture.decide(`1 ${request.codigoSolicitacao}`, `owner-customer:${phone}`);
    assert.equal(decision.handled, true);
    assert.equal(decision.resposta, "");
    assert.equal(fixture.value("reservas", RESERVATION).data, "2026-11-02");
    await processarNotificacaoRemarcacao(request.solicitacaoId, fixture.deps);
    await fixture.decide(`1 ${request.codigoSolicitacao}`, `owner-customer:${phone}`);
    await processarNotificacaoRemarcacao(request.solicitacaoId, fixture.deps);
    const success = fixture.sent.filter((message) => message.text.includes("Troca realizada com sucesso"));
    assert.equal(success.length, 1);
    assert.equal(success[0].text, "✅ Troca realizada com sucesso.");
    assert.doesNotMatch(success[0].text, /fila|participantes|experiência|salva no sistema/);
  }
});

test("retentativa de resultado antigo conserva o payload já tentado sem criar outro disparo", async () => {
  const fixture = scenario();
  const request = await solicitarRemarcacaoReserva(fixture.input(), fixture.deps);
  await fixture.decide(`1 ${request.codigoSolicitacao}`, "legacy-result-decision");
  const saved = fixture.value(RESCHEDULE_REQUESTS, request.solicitacaoId);
  fixture.seed(RESCHEDULE_REQUESTS, request.solicitacaoId, { ...saved,
    clientNotice: { ...saved.clientNotice, attempts: 1, lastError: "AGENT_GATEWAY_UNAVAILABLE", nextAttemptAt: 0 },
  });
  await processarNotificacaoRemarcacao(request.solicitacaoId, fixture.deps);
  const expected = "Sua reserva foi remarcada no sistema para 02/11/2026 às 11:00. A experiência e os participantes foram mantidos. 🌿";
  assert.equal(fixture.sent.length, 1);
  assert.equal(fixture.sent[0].text, expected);
  assert.equal(fixture.sent[0].requestId, `rescheduling-customer:${request.solicitacaoId}`);
  assert.equal(fixture.value(RESCHEDULE_REQUESTS, request.solicitacaoId).clientNotice.text, expected);
  await processarNotificacaoRemarcacao(request.solicitacaoId, fixture.deps);
  assert.equal(fixture.sent.length, 1);
});

test("falha de commit não confirma aprovação nem grava parte da remarcação", async () => {
  const fixture = scenario();
  const request = await solicitarRemarcacaoReserva(fixture.input(), fixture.deps);
  fixture.failNextReceipt();
  await assert.rejects(() => fixture.decide("1"), /COMMIT_FAILED/);
  assert.deepEqual(fixture.value("reservas", RESERVATION), base);
  assert.equal(fixture.value(RESCHEDULE_REQUESTS, request.solicitacaoId).status, "awaiting_owner");
  assert.equal(fixture.sent.length, 0);
});

test("coleta e contexto sobrevivem sem estado local e conferem titularidade", async () => {
  const fixture = scenario();
  const noId = fixture.input({ codigo: undefined, reservaId: RESERVATION, novaData: undefined, novoHorario: undefined });
  assert.equal((await solicitarRemarcacaoReserva(noId, fixture.deps)).proximoCampo, "codigo");
  const found = await solicitarRemarcacaoReserva({ ...noId, codigo: RESERVATION, mensagemCliente: "Quero alterar o horário" }, fixture.deps);
  assert.equal(found.proximoCampo, "novoHorario");
  const context = await obterContextoRemarcacao({ sessionId: noId.sessionId, telefone: PHONE }, { ...fixture.deps });
  assert.equal(context.pendente, true);
  assert.equal(context.contexto.proximoCampo, "novoHorario");
  assert.match(context.contexto.resposta, /novo horário/);
  const statusDuringCollection = await solicitarRemarcacaoReserva({ ...noId, consultarPendente: true }, fixture.deps);
  assert.equal(statusDuringCollection.status, "dados_pendentes");
  assert.match(statusDuringCollection.resposta, /novo horário/);
  const hourOnly = await solicitarRemarcacaoReserva({ ...noId, novoHorario: "13:00" }, { ...fixture.deps });
  assert.equal(hourOnly.status, "aguardando_autorizacao");
  assert.equal(fixture.value(RESCHEDULE_REQUESTS, hourOnly.solicitacaoId).depois.data, base.data);
  const foreign = await solicitarRemarcacaoReserva(fixture.input({ telefone: "5561999000000", sessionId: "whatsapp_5561999000000" }), fixture.deps);
  assert.equal(foreign.proximoCampo, "codigo");
});

test("outra reserva no mesmo atendimento não reutiliza alvo nem status anterior", async () => {
  const fixture = scenario();
  fixture.seed("reservas", "reservation-0002", { ...base, data: "2026-11-10" });
  await solicitarRemarcacaoReserva(fixture.input(), fixture.deps);
  await fixture.decide("1");
  const other = await solicitarRemarcacaoReserva(fixture.input({ codigo: "reservation-0002", novaData: undefined, novoHorario: undefined }), fixture.deps);
  assert.equal(other.status, "dados_pendentes");
  assert.equal(other.proximoCampo, "novaData");
  assert.doesNotMatch(other.resposta, /foi remarcada|aguarda autorização/);
});

test("data atual e código recebidos antes do CPF são preservados na coleta do site", async () => {
  const fixture = scenario();
  fixture.seed("reservas", "reservation-0002", { ...base, data: "2026-11-10" });
  const input = fixture.input({ canal: "site", sessionId: "site_rescheduling_selection_123", codigo: "reservation-0002", dataAtual: "2026-11-10", cpf: undefined });
  assert.equal((await solicitarRemarcacaoReserva(input, fixture.deps)).proximoCampo, "cpf");
  const result = await solicitarRemarcacaoReserva({ ...input, codigo: undefined, dataAtual: undefined, cpf: base.cpf, novaData: undefined, novoHorario: undefined }, fixture.deps);
  assert.equal(result.status, "aguardando_autorizacao");
  assert.equal(fixture.value(RESCHEDULE_REQUESTS, result.solicitacaoId).reservaId, "reservation-0002");
});

test("site localiza por CPF e recebe resultado assíncrono sem expor CPF ao Uirá", async () => {
  const fixture = scenario();
  const request = await solicitarRemarcacaoReserva(fixture.input({ canal: "site", sessionId: "site_rescheduling_test_12345", codigo: undefined, cpf: base.cpf }), fixture.deps);
  assert.equal(request.status, "aguardando_autorizacao");
  assert.doesNotMatch(mensagemAutorizacaoRemarcacao(fixture.value(RESCHEDULE_REQUESTS, request.solicitacaoId)), /52998224725/);
  await processarNotificacaoRemarcacao(request.solicitacaoId, fixture.deps);
  assert.equal(fixture.sent[0].phone, OWNER);
  assert.deepEqual(fixture.sent[0].options.siteSessionIds, ["site_rescheduling_test_12345"]);
  fixture.sent.length = 0;
  await fixture.decide("1");
  let siteAttempts = 0;
  fixture.deps.siteMessage = async (sessionId, message) => { siteAttempts++; if (siteAttempts === 1) throw new Error("SITE_DOWN"); fixture.site.push({ sessionId, ...message }); };
  await processarNotificacaoRemarcacao(request.solicitacaoId, fixture.deps);
  assert.equal(fixture.sent.length, 1, "falha do chat não impede WhatsApp");
  assert.equal(fixture.sent[0].phone, PHONE, "resultado sempre usa o WhatsApp do titular da reserva");
  assert.deepEqual(fixture.sent[0].options.siteSessionIds, ["site_rescheduling_test_12345"]);
  fixture.advance(3 * 60_000);
  await processarNotificacaoRemarcacao(request.solicitacaoId, fixture.deps);
  assert.equal(fixture.sent.length, 1, "retry do site não repete mensagem WhatsApp já confirmada");
  assert.equal(fixture.site[0].from, "bot");
  assert.match(fixture.site[0].sourceId, /^rescheduling-result:/);
  assert.equal(fixture.value(RESCHEDULE_REQUESTS, request.solicitacaoId).clientNotice.status, "sent");
});

test("pedido expirado não altera reserva nem é aprovado por resposta tardia", async () => {
  const fixture = scenario();
  const request = await solicitarRemarcacaoReserva(fixture.input(), fixture.deps);
  fixture.advance(25 * 60 * 60_000);
  await processarNotificacoesRemarcacao(fixture.deps);
  assert.equal(fixture.value(RESCHEDULE_REQUESTS, request.solicitacaoId).status, "expired");
  assert.match((await fixture.decide(`1 ${request.codigoSolicitacao}`)).resposta, /não pode ser aplicado/);
  assert.equal(fixture.applications(), 0);
});

test("negação de remarcação iniciada no site comunica WhatsApp do titular e mantém reserva", async () => {
  const fixture = scenario();
  const sessionId = "site_rescheduling_rejected_12345";
  const request = await solicitarRemarcacaoReserva(fixture.input({ canal: "site", sessionId, codigo: undefined, cpf: base.cpf }), fixture.deps);
  await processarNotificacaoRemarcacao(request.solicitacaoId, fixture.deps);
  assert.equal(fixture.sent[0].phone, OWNER);
  assert.deepEqual(fixture.sent[0].options.siteSessionIds, [sessionId]);
  await fixture.decide(`2 ${request.codigoSolicitacao}`, "site-owner-denied");
  await processarNotificacaoRemarcacao(request.solicitacaoId, fixture.deps);
  assert.deepEqual(fixture.value("reservas", RESERVATION), base);
  const result = fixture.sent[1];
  assert.equal(result.phone, PHONE);
  assert.match(result.text, /não foi autorizada/);
  assert.match(result.text, /ligue pelo WhatsApp/);
  assert.deepEqual(result.options.siteSessionIds, [sessionId]);
  assert.equal(fixture.site[0].sessionId, sessionId);
  assert.match(fixture.site[0].text, /não foi autorizada/);
});

test("retomada legada pelo site preserva data e horário já pedidos antes de coletar CPF", async () => {
  const fixture = scenario();
  const input = { canal: "site", sessionId: "site_legacy_reschedule_intake_123", telefone: PHONE,
    ...alvoRemarcacaoLegadaSite("Quero alterar a data da minha reserva para 03/11/2026 às 11h") };
  const collecting = await solicitarRemarcacaoReserva(input, fixture.deps);
  assert.equal(collecting.proximoCampo, "cpf");
  const context = await obterContextoRemarcacao(input, fixture.deps);
  assert.equal(context.pendente, true);
  assert.equal(context.contexto.proximoCampo, "cpf");
  const request = await solicitarRemarcacaoReserva({ canal: "site", sessionId: input.sessionId, telefone: PHONE, cpf: base.cpf }, fixture.deps);
  assert.equal(request.status, "aguardando_autorizacao");
  const saved = fixture.value(RESCHEDULE_REQUESTS, request.solicitacaoId);
  assert.equal(saved.depois.data, "2026-11-03");
  assert.equal(saved.depois.horario, "11:00");
  assert.deepEqual(saved.siteSessions, [input.sessionId]);
  assert.deepEqual(fixture.value("reservas", RESERVATION), base);
});

test("resultado assíncrono usa controle compartilhado atual e não sobrepõe operador ou bloqueio", async () => {
  for (const mode of ["human", "blocked"]) {
    const fixture = scenario();
    const sessionId = `site_async_rescheduling_${mode}_test`;
    const now = Date.now();
    fixture.seed("crm_agent_site_conversations", sessionId, {
      sessionId, mode, updatedBy: "operador@fazenda", controlUpdatedAt: now,
      phone: PHONE, name: "Cliente", messages: [{ id: "before", from: "client", text: "Pode remarcar", ts: now - 1000 }],
      lastFrom: "client", lastMessageAt: now - 1000, createdAt: now - 1000, expiresAt: new Date(now + 86_400_000),
    });
    const result = { from: "bot", text: "Sua reserva foi remarcada no sistema.", sourceId: "rescheduling-result:test-id" };
    await registrarResultadoRemarcacaoSite(sessionId, result, { db: fixture.db });
    await registrarResultadoRemarcacaoSite(sessionId, result, { db: fixture.db });
    const stored = fixture.value("crm_agent_site_conversations", sessionId);
    assert.equal(stored.mode, mode);
    assert.equal(stored.updatedBy, "operador@fazenda");
    assert.equal(stored.phone, PHONE);
    assert.equal(stored.messages.filter((message) => message.sourceId === result.sourceId).length, mode === "blocked" ? 0 : 1);
  }
});
