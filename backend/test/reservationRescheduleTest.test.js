const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { FieldValue } = require("firebase-admin/firestore");
process.env.FIREBASE_SERVICE_ACCOUNT = "";
const { criarTesteRemarcacaoUira, consultarTesteRemarcacaoUira } = require("../dist/services/reservationRescheduleTest");
const { RESCHEDULE_REQUESTS, RESCHEDULE_TEST_COLLECTIONS, solicitarRemarcacaoReserva, decidirRemarcacaoReserva, processarNotificacaoRemarcacao } = require("../dist/services/reservationRescheduling");

const OWNER = "5562991150376";
const SOURCE = "qa_reschedule_uira_20261030";
const INPUT = { confirmacao: "ENVIAR_TESTE_PARA_UIRA", sourceId: SOURCE };
const NOW = Date.parse("2026-10-31T01:00:00Z"); // Ainda 30/10 em São Paulo.
const DAY = 86_400_000;
const clone = (value) => value === undefined ? undefined : structuredClone(value);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const fixtureId = (source = SOURCE) => `qa-reschedule-${hash(source).slice(0, 20)}`;
const memoryDb = () => {
  const rows = new Map();
  const writes = [];
  let tail = Promise.resolve();
  const snapshot = (ref) => ({ id: ref.id, ref, exists: rows.has(ref.path), data: () => clone(rows.get(ref.path)) });
  const save = (ref, value, merge) => {
    const data = merge ? { ...rows.get(ref.path) } : {};
    for (const [key, item] of Object.entries(value)) data[key] = item?.isEqual?.(FieldValue.increment(1)) ? Number(data[key] || 0) + 1 : clone(item);
    rows.set(ref.path, data);
    writes.push(ref.path);
  };
  const document = (name, id) => ({ kind: "doc", id, path: `${name}/${id}`,
    async get() { return snapshot(this); }, async set(value, options) { save(this, value, options?.merge); } });
  const query = (name, filters = [], maximum = Infinity) => ({ kind: "query", name, filters,
    doc: (id) => document(name, id),
    where: (field, operation, value) => { assert.equal(operation, "=="); return query(name, [...filters, [field, value]], maximum); },
    limit: (limit) => query(name, filters, limit),
    async get() { return querySnapshot(this, maximum); },
    maximum,
  });
  const querySnapshot = (value, limit = value.maximum) => {
    const docs = [...rows.entries()].filter(([path, record]) => path.startsWith(`${value.name}/`)
      && value.filters.every(([field, expected]) => record[field] === expected)).slice(0, limit)
      .map(([path]) => snapshot(document(value.name, path.slice(value.name.length + 1))));
    return { docs, size: docs.length, empty: !docs.length };
  };
  const db = {
    collection: query,
    runTransaction(callback) {
      const task = tail.then(async () => {
        const pending = [];
        const result = await callback({
          get: async (ref) => { assert.equal(pending.length, 0, "todas as leituras precedem escritas"); return ref.kind === "doc" ? snapshot(ref) : querySnapshot(ref); },
          set: (ref, value, options) => pending.push(() => save(ref, value, options?.merge)),
          update: (ref, value) => pending.push(() => { assert.equal(rows.has(ref.path), true); save(ref, value, true); }),
        });
        pending.forEach((write) => write());
        return result;
      });
      tail = task.catch(() => undefined);
      return task;
    },
  };
  return { db, rows, writes, seed: (name, id, value) => rows.set(`${name}/${id}`, clone(value)), value: (name, id) => clone(rows.get(`${name}/${id}`)) };
};
const scenario = () => {
  const memory = memoryDb();
  const sent = [];
  let now = NOW;
  const deps = { db: memory.db, now: () => now, processImmediately: false,
    send: async (phone, text, requestId) => { sent.push({ phone, text, requestId }); return { enviado: true, messageId: `mock-message-${sent.length}` }; },
    siteMessage: async () => { throw new Error("TESTE_NAO_DEVE_NOTIFICAR_CLIENTE_SITE"); },
  };
  const decide = (request, decision = "1", source = "owner-inbound-test-001") => decidirRemarcacaoReserva({
    telefoneOperador: OWNER, mensagem: `${decision} ${request.codigoSolicitacao}`, sourceMessageId: source,
  }, deps);
  return { ...memory, sent, deps, decide, advance: (milliseconds) => { now += milliseconds; } };
};

test("criação exige confirmação exata e sourceId válido antes de qualquer persistência ou envio", async () => {
  const fixture = scenario();
  for (const input of [{}, { ...INPUT, confirmacao: "enviar_teste_para_uira" }, { ...INPUT, confirmacao: `${INPUT.confirmacao} ` }]) {
    await assert.rejects(() => criarTesteRemarcacaoUira(input, fixture.deps), /CONFIRMATION_REQUIRED/);
  }
  for (const sourceId of ["curto", "a".repeat(101), "source_com/barra", " source_valido_123"])
    await assert.rejects(() => criarTesteRemarcacaoUira({ ...INPUT, sourceId }, fixture.deps), /SOURCE_INVALID/);
  assert.equal(fixture.rows.size, 0);
  assert.equal(fixture.sent.length, 0);
});

test("fixture isolada consulta o core real, sem financeiro nem ocupação real, e aguarda decisão verdadeira", async () => {
  const fixture = scenario();
  const real = { nome: "Cliente Real", data: "2026-11-07", horario: "11:00", participantes: 200, status: "pago", valor: 500 };
  fixture.seed("reservas", "real-client", real);
  fixture.seed("disponibilidade", "2026-11-07", { fechado: true, remarcacoesRevision: 40 });
  const result = await criarTesteRemarcacaoUira(INPUT, fixture.deps);
  assert.equal(result.testMode, true);
  assert.equal(result.testNamespace, "v1");
  assert.equal(result.status, "awaiting_owner");
  assert.equal(result.fixture.id, fixtureId());
  assert.equal(result.fixture.telefone, OWNER);
  assert.match(result.fixture.nome, /TESTE/);
  assert.match(result.fixture.atividade, /TESTE/);
  assert.equal(result.fixture.antes.data, "2026-11-06");
  assert.equal(result.fixture.solicitado.data, "2026-11-07");
  assert.equal(result.fixture.antes.horario, "09:00");
  assert.equal(result.fixture.solicitado.horario, "11:00");
  assert.deepEqual(result.fixture.atual, result.fixture.antes);
  const saved = fixture.value(RESCHEDULE_TEST_COLLECTIONS.reservas, fixtureId());
  assert.equal(saved.valor, 0);
  assert.equal(saved.status, "pago");
  assert.equal(saved.confirmada, true);
  assert.equal(saved.naoConsomeDisponibilidade, false);
  assert.deepEqual(saved.participantesPorTipo, { adulto: 2 });
  assert.equal(saved.asaasPaymentId, undefined);
  assert.equal(saved.cpf, undefined);
  assert.equal(fixture.sent.length, 0, "helper não simula resposta do Uirá");
  assert.deepEqual(fixture.value("reservas", "real-client"), real);
  assert.deepEqual(fixture.value("disponibilidade", "2026-11-07"), { fechado: true, remarcacoesRevision: 40 });
  assert.equal(fixture.writes.some((path) => /^(reservas|pacotes|combos|disponibilidade)\//.test(path)), false);
});

test("aviso e aprovação seguem pipeline real com send mockado e retornam recibo correlacionado", async () => {
  const fixture = scenario();
  const request = await criarTesteRemarcacaoUira(INPUT, fixture.deps);
  await processarNotificacaoRemarcacao(request.solicitacaoId, fixture.deps);
  assert.equal(fixture.sent.length, 1);
  assert.equal(fixture.sent[0].phone, OWNER);
  assert.match(fixture.sent[0].text, /TESTE/);
  assert.match(fixture.sent[0].text, /1 — autorizar \| 2 — negar/);
  const beforeDecision = await consultarTesteRemarcacaoUira(request.solicitacaoId, fixture.deps);
  assert.equal(beforeDecision.ownerMessageId, "mock-message-1");
  assert.equal(beforeDecision.ownerNotice.status, "sent");
  assert.equal(beforeDecision.decidedAt, null);
  assert.equal(beforeDecision.receipt, null);

  const decision = await fixture.decide(request);
  assert.equal(decision.resposta, "", "o resultado do teste já confirma ao mesmo número do Uirá");
  const approved = await consultarTesteRemarcacaoUira(request.solicitacaoId, fixture.deps);
  assert.equal(approved.status, "approved");
  assert.deepEqual(approved.fixture.atual, approved.fixture.solicitado);
  assert.equal(approved.decidedBy, OWNER);
  assert.equal(approved.decidedAt, new Date(NOW).toISOString());
  assert.equal(approved.decisionSourceMessageId, "owner-inbound-test-001");
  assert.equal(approved.receipt.correlacionado, true);
  assert.equal(approved.receipt.requestId, request.solicitacaoId);
  const saved = fixture.value(RESCHEDULE_TEST_COLLECTIONS.reservas, fixtureId());
  assert.equal(saved.valor, 0);
  assert.equal(saved.status, "pago");
  assert.equal(saved.participantes, 2);
  await processarNotificacaoRemarcacao(request.solicitacaoId, fixture.deps);
  assert.equal(fixture.sent.length, 2);
  assert.equal(fixture.sent[1].phone, OWNER);
  assert.match(fixture.sent[1].text, /TESTE/);
  assert.equal(fixture.sent[1].text, "🧪 TESTE — ✅ Troca realizada com sucesso.");
  const final = await consultarTesteRemarcacaoUira(request.solicitacaoId, fixture.deps);
  assert.equal(final.clientNotice.status, "sent");
  assert.equal(final.clientNotice.whatsappSentAt, new Date(NOW).toISOString());
  assert.equal(final.clientNotice.messageId, "mock-message-2");
  assert.equal(fixture.writes.some((path) => /^(reservas|pacotes|combos|disponibilidade)\//.test(path)), false);
});

test("sourceId repetido ou concorrente reutiliza ledger antes de semear e não reseta reserva aprovada", async () => {
  const fixture = scenario();
  const [first, concurrent] = await Promise.all([criarTesteRemarcacaoUira(INPUT, fixture.deps), criarTesteRemarcacaoUira(INPUT, fixture.deps)]);
  assert.equal(first.solicitacaoId, concurrent.solicitacaoId);
  const count = fixture.writes.length;
  assert.deepEqual(await criarTesteRemarcacaoUira(INPUT, fixture.deps), first);
  assert.equal(fixture.writes.length, count);
  await fixture.decide(first);
  fixture.advance(10 * DAY);
  const afterApproval = fixture.writes.length;
  const repeated = await criarTesteRemarcacaoUira(INPUT, fixture.deps);
  assert.equal(repeated.solicitacaoId, first.solicitacaoId);
  assert.equal(repeated.status, "approved");
  assert.deepEqual(repeated.fixture.atual, first.fixture.solicitado);
  assert.equal(fixture.writes.length, afterApproval);
  assert.equal([...fixture.rows.keys()].filter((path) => path.startsWith(`${RESCHEDULE_REQUESTS}/`)).length, 1);
});

test("negação real mantém fixture original e todos os avisos no telefone de teste fixo", async () => {
  const fixture = scenario();
  const request = await criarTesteRemarcacaoUira(INPUT, fixture.deps);
  await fixture.decide(request, "2", "owner-real-denial-test-001");
  const rejected = await consultarTesteRemarcacaoUira(request.solicitacaoId, fixture.deps);
  assert.equal(rejected.status, "rejected");
  assert.deepEqual(rejected.fixture.atual, rejected.fixture.antes);
  await processarNotificacaoRemarcacao(request.solicitacaoId, fixture.deps);
  assert.equal(fixture.sent.length, 1);
  assert.equal(fixture.sent[0].phone, OWNER);
  assert.match(fixture.sent[0].text, /TESTE/);
  assert.match(fixture.sent[0].text, /não foi autorizada/);
});

test("consulta rejeita qualquer escopo não teste ou malformado e expõe somente diagnóstico allowlisted", async () => {
  const fixture = scenario();
  await assert.rejects(() => consultarTesteRemarcacaoUira("../outro", fixture.deps), /REQUEST_ID_INVALID/);
  await assert.rejects(() => consultarTesteRemarcacaoUira("missing-test-id", fixture.deps), /NOT_FOUND/);
  const request = await criarTesteRemarcacaoUira(INPUT, fixture.deps);
  const stored = fixture.value(RESCHEDULE_REQUESTS, request.solicitacaoId);
  for (const changed of [{ testMode: false }, { testNamespace: "prod" }, { sandboxSourceId: "bad" }, { reservaId: "real-reservation" },
    { customerPhone: "5561999990000" }, { customerName: "Cliente Real" }, { activity: "Brunch" }, { participants: 3 }]) {
    fixture.seed(RESCHEDULE_REQUESTS, request.solicitacaoId, { ...stored, ...changed });
    await assert.rejects(() => consultarTesteRemarcacaoUira(request.solicitacaoId, fixture.deps), /SCOPE_INVALID/);
  }
  fixture.seed(RESCHEDULE_REQUESTS, request.solicitacaoId, { ...stored, cpf: "52998224725", paymentId: "pay_secret_test", extra: "hidden-extra",
    ownerNotice: { ...stored.ownerNotice, secret: "not-exposed", lastError: "Falha para CPF 52998224725" } });
  const sanitized = await consultarTesteRemarcacaoUira(request.solicitacaoId, fixture.deps);
  assert.doesNotMatch(JSON.stringify(sanitized), /52998224725|pay_secret_test|hidden-extra|not-exposed/);
  assert.equal(sanitized.ownerNotice.lastError, "NOTIFICATION_FAILED");
  const original = fixture.value(RESCHEDULE_TEST_COLLECTIONS.reservas, fixtureId());
  fixture.seed(RESCHEDULE_TEST_COLLECTIONS.reservas, fixtureId(), { ...original, telefone: "5561999990000" });
  await assert.rejects(() => consultarTesteRemarcacaoUira(request.solicitacaoId, fixture.deps), /SCOPE_INVALID/);
  assert.equal(fixture.sent.length, 0);
});

test("ledger suspeito ou duplicado é rejeitado antes de criar fixture", async () => {
  const fixture = scenario();
  fixture.seed(RESCHEDULE_REQUESTS, "real-request-001", { sandboxSourceId: SOURCE, testMode: false });
  await assert.rejects(() => criarTesteRemarcacaoUira(INPUT, fixture.deps), /SCOPE_INVALID/);
  assert.equal(fixture.writes.length, 0);
  fixture.seed(RESCHEDULE_REQUESTS, "real-request-002", { sandboxSourceId: SOURCE, testMode: true });
  await assert.rejects(() => criarTesteRemarcacaoUira(INPUT, fixture.deps), /SOURCE_AMBIGUOUS/);
  assert.equal(fixture.writes.length, 0);
});

test("repetição após seed interrompido mantém datas originais em vez de recriar a fixture", async () => {
  const fixture = scenario();
  await assert.rejects(() => criarTesteRemarcacaoUira(INPUT, { ...fixture.deps, preview: async () => ({ disponivel: false, status: "indisponivel" }) }), /REQUEST_NOT_CREATED/);
  const before = fixture.value(RESCHEDULE_TEST_COLLECTIONS.reservas, fixtureId());
  fixture.advance(DAY);
  const request = await criarTesteRemarcacaoUira(INPUT, fixture.deps);
  assert.deepEqual(request.fixture.antes, before.sandboxOriginalSchedule);
  assert.deepEqual(request.fixture.solicitado, before.sandboxRequestedSchedule);
  assert.deepEqual(fixture.value(RESCHEDULE_TEST_COLLECTIONS.reservas, fixtureId()), before);
  assert.equal(fixture.sent.length, 0);
});

test("flags de teste no payload do cliente não habilitam namespace sem a dependência confiável", async () => {
  const fixture = scenario();
  fixture.seed("reservas", "real-reservation-001", {
    nome: "Pessoa Real Mock", telefone: OWNER, data: "2026-11-06", horario: "09:00", horariosPorPacote: { "real-brunch": "09:00" },
    pacoteIds: ["real-brunch"], atividade: "Brunch Mock", participantes: 2, adultos: 2, participantesPorTipo: { adulto: 2 },
    status: "pago", confirmada: true, valor: 200,
  });
  fixture.seed("pacotes", "real-brunch", { nome: "Brunch Mock", ativo: true, modoHorario: "lista", horarios: ["09:00", "11:00"], limite: 4 });
  const result = await solicitarRemarcacaoReserva({ canal: "whatsapp", telefone: OWNER, sessionId: `whatsapp_${OWNER}`,
    codigo: "real-reservation-001", novaData: "2026-11-07", novoHorario: "11:00",
    testMode: true, testNamespace: "v1", sandboxSourceId: SOURCE, testSourceId: SOURCE,
  }, fixture.deps);
  assert.equal(result.status, "aguardando_autorizacao");
  const saved = fixture.value(RESCHEDULE_REQUESTS, result.solicitacaoId);
  assert.equal(saved.reservaId, "real-reservation-001");
  assert.equal(saved.testMode, undefined);
  assert.equal(saved.testNamespace, undefined);
  assert.equal(saved.sandboxSourceId, undefined);
  assert.equal([...fixture.rows.keys()].some((path) => path.startsWith(`${RESCHEDULE_TEST_COLLECTIONS.reservas}/`)), false);
  assert.equal(fixture.sent.length, 0);
});

test("escopo persistido corrompido impede aplicação e envio mesmo com resposta do operador correto", async () => {
  const fixture = scenario();
  const request = await criarTesteRemarcacaoUira(INPUT, fixture.deps);
  const saved = fixture.value(RESCHEDULE_REQUESTS, request.solicitacaoId);
  const reservation = fixture.value(RESCHEDULE_TEST_COLLECTIONS.reservas, fixtureId());
  for (const changed of [{ testNamespace: "prod" }, { customerPhone: "5561999990000" }, { reservaId: "real-reservation-001" }]) {
    fixture.seed(RESCHEDULE_REQUESTS, request.solicitacaoId, { ...saved, ...changed });
    await assert.rejects(() => fixture.decide(request), /TEST_SCOPE_INVALID/);
    assert.equal(await processarNotificacaoRemarcacao(request.solicitacaoId, fixture.deps), false);
    assert.deepEqual(fixture.value(RESCHEDULE_TEST_COLLECTIONS.reservas, fixtureId()), reservation);
    assert.equal(fixture.value(RESCHEDULE_REQUESTS, request.solicitacaoId).status, "awaiting_owner");
    assert.equal(fixture.sent.length, 0);
  }
});
