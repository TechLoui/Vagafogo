require("ts-node/register/transpile-only");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const history = require("../src/services/siteWhatsappDispatchHistory");
const gateway = require("../src/services/agentGateway");
const firebase = require("../src/services/firebaseAdmin");
const { enviarMensagemTransacionalPeloAgente } = require("../src/services/agentTransactionalWhatsapp");

const COLLECTION = history.SITE_WHATSAPP_DISPATCH_COLLECTION;
const NOW = Date.parse("2026-10-30T12:00:00Z");
const SESSION = "site_dispatch_origin_12345";
const OTHER = "site_dispatch_second_12345";
const intent = (extra = {}) => ({ siteSessionIds: [SESSION], requestId: "rescheduling-owner:request-123", phone: "5562991150376",
  text: "🔁 Pedido completo\nAtual: 01/11/2026 às 09:00\nSolicitado: 02/11/2026 às 11:00\n1 — autorizar | 2 — negar",
  dispatchKind: "remarcacao_autorizacao", ...extra });
const clone = (value) => structuredClone(value);
const memoryDb = () => {
  const rows = new Map();
  const writes = [];
  let failCommit = 0;
  let commits = 0;
  let serial = Promise.resolve();
  const snapshot = (ref) => ({ id: ref.id, ref, exists: rows.has(ref.path), data: () => clone(rows.get(ref.path)) });
  const collection = (name, filters = [], maximum = Infinity) => ({
    kind: "query", name, filters,
    doc: (id) => ({ kind: "doc", id, path: `${name}/${id}`, get: async function () { return snapshot(this); } }),
    where: (key, op, expected) => collection(name, [...filters, [key, op, expected]], maximum),
    limit: (value) => collection(name, filters, value),
    async get() {
      const docs = [...rows.entries()].filter(([path, row]) => path.startsWith(`${name}/`) && filters.every(([key, op, expected]) =>
        op === "==" ? row[key] === expected : op === ">" ? row[key] > expected : row[key] <= expected))
        .slice(0, maximum).map(([path]) => snapshot({ id: path.slice(name.length + 1), path }));
      return { docs, size: docs.length, empty: !docs.length };
    },
  });
  const db = { collection, batch() {
    const deleted = [];
    return { delete: (ref) => deleted.push(ref.path), commit: async () => deleted.forEach((path) => rows.delete(path)) };
  }, runTransaction(callback) {
    const run = serial.then(async () => {
      const pending = [];
      const tx = { get: async (ref) => {
        assert.equal(pending.length, 0, "all transaction reads precede writes");
        return ref.kind === "query" ? ref.get() : snapshot(ref);
      }, set: (ref, value, options) => pending.push({ ref, value, merge: options?.merge }) };
      const result = await callback(tx);
      if (++commits === failCommit) throw new Error("COMMIT_FAILED");
      pending.forEach(({ ref, value, merge }) => {
        rows.set(ref.path, clone(merge ? { ...rows.get(ref.path), ...value } : value));
        writes.push(ref.path);
      });
      return result;
    });
    serial = run.catch(() => {});
    return run;
  } };
  return { db, rows, writes, deps: { db, now: () => NOW }, failNextCommit: () => { failCommit = commits + 1; },
    failCommitNumber: (number) => { failCommit = number; },
    get: (id) => clone(rows.get(`${COLLECTION}/${id}`)),
    seed: (id, value) => rows.set(`${COLLECTION}/${id}`, clone(value)) };
};
const withServices = (t, memory, send) => {
  const originalDb = firebase.obterFirestoreAdmin;
  const originalGateway = gateway.requestAgentService;
  firebase.obterFirestoreAdmin = () => memory.db;
  gateway.requestAgentService = send;
  t.after(() => { firebase.obterFirestoreAdmin = originalDb; gateway.requestAgentService = originalGateway; });
};

test("ledger administrativo registra intenção antes do envio e confirmação real em cada sessão de origem", async (t) => {
  const memory = memoryDb();
  let calls = 0;
  withServices(t, memory, async (service, path, options) => {
    calls++;
    assert.equal(service, "gateway");
    assert.equal(path, "/api/whatsapp/transactional-send");
    assert.equal([...memory.rows.values()].length, 2);
    assert.ok([...memory.rows.values()].every((row) => row.status === "pending"));
    assert.equal(options.body.text, intent().text);
    return { status: 200, body: { ok: true, messageId: "WA_OWNER_ID", jid: "5562991150376@s.whatsapp.net" } };
  });
  const result = await enviarMensagemTransacionalPeloAgente(intent().phone, intent().text, intent().requestId, "Uirá", {
    siteSessionIds: [SESSION, OTHER, SESSION], tipoDisparo: intent().dispatchKind,
  });
  assert.equal(result.enviado, true);
  assert.equal(calls, 1);
  assert.equal(memory.rows.size, 2);
  assert.ok(memory.writes.every((path) => path.startsWith(`${COLLECTION}/`)), "no visitor/model/control collection is touched");
  for (const value of memory.rows.values()) {
    assert.equal(value.status, "sent");
    assert.equal(value.messageId, "WA_OWNER_ID");
    assert.equal(value.recipientLabel, "Uirá");
    assert.equal(value.expiresAt - value.createdAt, 7 * 24 * 60 * 60_000);
  }
});

test("sem siteSessionIds o envio mantém comportamento anterior e não acessa Firestore", async (t) => {
  const memory = memoryDb();
  withServices(t, memory, async (_service, _path, options) => {
    assert.deepEqual(options.body, { phone: "5562991150376", text: "Mensagem", requestId: "request-no-site", contactName: "Uirá" });
    return { status: 200, body: { ok: true, messageId: "WA_NO_SITE" } };
  });
  firebase.obterFirestoreAdmin = () => { throw new Error("MUST_NOT_READ_DATABASE"); };
  assert.equal((await enviarMensagemTransacionalPeloAgente("62991150376", "Mensagem", "request-no-site", "Uirá")).enviado, true);
  assert.equal(memory.rows.size, 0);
});

test("falha pré-envio impede disparo sem intenção; falha real registra não confirmado", async (t) => {
  const memory = memoryDb();
  let calls = 0;
  withServices(t, memory, async () => { calls++; return { status: 409, body: { ok: false, error: "CONTACT_BLOCKED" } }; });
  memory.failNextCommit();
  const options = { siteSessionIds: [SESSION], tipoDisparo: intent().dispatchKind };
  const preflight = await enviarMensagemTransacionalPeloAgente(intent().phone, intent().text, intent().requestId, "Uirá", options);
  assert.equal(preflight.enviado, false);
  assert.equal(preflight.motivo, "SITE_DISPATCH_HISTORY_UNAVAILABLE");
  assert.equal(calls, 0);
  const failed = await enviarMensagemTransacionalPeloAgente(intent().phone, intent().text, intent().requestId, "Uirá", options);
  assert.equal(failed.enviado, false);
  assert.equal(failed.motivo, "CONTACT_BLOCKED");
  assert.equal(calls, 1);
  const record = [...memory.rows.values()][0];
  assert.equal(record.status, "failed");
  assert.equal(record.sentAt, null);
  const messages = await history.consultarDisparosSite(SESSION, 0, { db: memory.db });
  assert.match(messages[0].text, /Envio não confirmado \(CONTACT_BLOCKED\)/);
});

test("envio confirmado com falha no comprovante continua verdadeiro e reconciler só consulta receipt", async (t) => {
  const memory = memoryDb();
  memory.failCommitNumber(2);
  const calls = [];
  withServices(t, memory, async (_service, path, options) => {
    calls.push({ path, method: options.method });
    if (options.method === "POST") return { status: 200, body: { ok: true, messageId: "WA_SENT_ONCE" } };
    assert.equal(path, `/api/whatsapp/transactional-send/status?requestId=${encodeURIComponent(intent().requestId)}`);
    return { status: 200, body: { status: "sent", messageId: "WA_SENT_ONCE", sentAt: new Date(NOW).toISOString() } };
  });
  const result = await enviarMensagemTransacionalPeloAgente(intent().phone, intent().text, intent().requestId, "Uirá", {
    siteSessionIds: [SESSION], tipoDisparo: intent().dispatchKind,
  });
  assert.equal(result.enviado, true);
  const id = [...memory.rows.keys()][0].split("/")[1];
  assert.equal(memory.get(id).status, "pending");
  const later = memory.get(id).createdAt.getTime() + 60_000;
  assert.equal(await history.processarDisparosSitePendentes({ db: memory.db, now: () => later }), 1);
  assert.equal(memory.get(id).status, "sent");
  assert.equal(memory.get(id).messageId, "WA_SENT_ONCE");
  assert.equal(memory.get(id).sentAt.toISOString(), new Date(NOW).toISOString());
  assert.deepEqual(calls.map((call) => call.method), ["POST", "GET"]);
});

test("repetição usa IDs estáveis e nunca regride comprovante sent nem troca payload", async () => {
  const memory = memoryDb();
  const first = await history.registrarIntencaoDisparoSite(intent(), memory.deps);
  assert.deepEqual(await history.registrarIntencaoDisparoSite(intent(), memory.deps), first);
  await history.concluirDisparoSite(first, { enviado: true, messageId: "WA_STABLE" }, memory.deps);
  await history.registrarIntencaoDisparoSite(intent(), memory.deps);
  await history.concluirDisparoSite(first, { enviado: false, motivo: "LATE_FAILURE" }, memory.deps);
  assert.equal(memory.rows.size, 1);
  assert.equal(memory.get(first[0]).status, "sent");
  assert.equal(memory.get(first[0]).messageId, "WA_STABLE");
  await assert.rejects(() => history.registrarIntencaoDisparoSite(intent({ text: "Outro texto" }), memory.deps), /IDEMPOTENCY_CONFLICT/);
});

test("consultas admin retornam texto completo e allowlist, isolam sessão e respeitam TTL/cursor", async () => {
  const memory = memoryDb();
  const [first] = await history.registrarIntencaoDisparoSite(intent(), memory.deps);
  const [second] = await history.registrarIntencaoDisparoSite(intent({ requestId: "rescheduling-customer:123", dispatchKind: "remarcacao_resultado" }), {
    ...memory.deps, now: () => NOW + 1000,
  });
  await history.registrarIntencaoDisparoSite(intent({ siteSessionIds: [OTHER], requestId: "other-session" }), memory.deps);
  memory.seed(first, { ...memory.get(first), secret: "HIDDEN", cpf: "PRIVATE_CPF", internal: { private_key: "PRIVATE_KEY" } });
  memory.seed("expired", { ...memory.get(first), expiresAt: new Date(NOW - 1) });
  const messages = await history.consultarDisparosSite(SESSION, NOW, memory.deps);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].id, `site-whatsapp-dispatch:${second}`);
  assert.equal(messages[0].recipientLabel, "Cliente");
  assert.ok(messages[0].text.endsWith(intent().text));
  assert.doesNotMatch(JSON.stringify(await history.consultarDisparosSite(SESSION, 0, memory.deps)), /HIDDEN|PRIVATE_CPF|PRIVATE_KEY/);
  const summaries = await history.listarResumosDisparosSite(memory.deps);
  assert.equal(summaries.length, 2);
  const main = summaries.find((value) => value.sessionId === SESSION);
  assert.equal(main.dispatchCount, 2);
  assert.equal(main.lastMessageAt, NOW + 1000);
  assert.match(main.lastMessage, /WhatsApp → Cliente/);
});

test("receipt not_found/sending/indisponível permanece pending e não inicia envio abandonado", async () => {
  for (const status of ["notfound", "not_found", "sending", "unavailable"]) {
    const memory = memoryDb();
    const [id] = await history.registrarIntencaoDisparoSite(intent(), memory.deps);
    let receipts = 0;
    const deps = { db: memory.db, now: () => NOW + 60_000, receipt: async () => {
      receipts++;
      if (status === "unavailable") throw new Error("OFFLINE");
      return { status };
    } };
    assert.equal(await history.processarDisparosSitePendentes(deps), 0);
    assert.equal(memory.get(id).status, "pending");
    assert.equal(memory.get(id).sentAt, null);
    assert.equal(receipts, 1);
    assert.equal(await history.processarDisparosSitePendentes(deps), 0);
    assert.equal(receipts, 1, "honors retry backoff");
  }
});

test("receipt sent sem messageId comprova envio; lease impede consulta concorrente e expirado não é enviado", async () => {
  const memory = memoryDb();
  const [id] = await history.registrarIntencaoDisparoSite(intent(), memory.deps);
  let calls = 0;
  const deps = { db: memory.db, now: () => NOW + 60_000, receipt: async () => { calls++; return { status: "sent" }; } };
  await Promise.all([history.processarDisparosSitePendentes(deps), history.processarDisparosSitePendentes(deps)]);
  assert.equal(calls, 1);
  assert.equal(memory.get(id).status, "sent");
  assert.equal(memory.get(id).messageId, null);
  assert.equal(memory.get(id).requestId, intent().requestId);
  const [expired] = await history.registrarIntencaoDisparoSite(intent({ requestId: "expired-intent" }), memory.deps);
  assert.equal(await history.processarDisparosSitePendentes({ ...deps, now: () => NOW + 8 * 24 * 60 * 60_000 }), 0);
  assert.equal(memory.get(expired), undefined, "seven day retention deletes expired history");
  assert.equal(calls, 1);
});

test("receipt failed só registra falha conhecida; não inicia nova tentativa de envio", async () => {
  const memory = memoryDb();
  const [id] = await history.registrarIntencaoDisparoSite(intent(), memory.deps);
  assert.equal(await history.processarDisparosSitePendentes({ db: memory.db, now: () => NOW + 60_000,
    receipt: async () => ({ status: "failed" }) }), 0);
  assert.equal(memory.get(id).status, "failed");
  assert.equal(memory.get(id).lastError, "GATEWAY_FAILED");
  assert.equal(memory.get(id).sentAt, null);
});

test("backfill confiável preserva horário do recibo legado sem envio e sem duplicar", async (t) => {
  const memory = memoryDb();
  withServices(t, memory, async () => { throw new Error("BACKFILL_MUST_NEVER_CALL_GATEWAY"); });
  const historical = NOW - 2 * 24 * 60 * 60_000;
  const input = { ...intent(), sentAt: new Date(historical), messageId: "WA_LEGACY_ID", jid: "owner@s.whatsapp.net" };
  const first = await history.registrarDisparoConfirmadoSite(input, memory.deps);
  const writes = memory.writes.length;
  assert.deepEqual(await history.registrarDisparoConfirmadoSite(input, memory.deps), first);
  assert.equal(memory.writes.length, writes);
  const stored = memory.get(first[0]);
  assert.equal(stored.status, "sent");
  assert.equal(stored.sentAt.getTime(), historical);
  assert.equal(stored.updatedAt.getTime(), historical);
  assert.equal(stored.expiresAt.getTime(), historical + 7 * 24 * 60 * 60_000);
  const messages = await history.consultarDisparosSite(SESSION, 0, memory.deps);
  assert.equal(messages[0].ts, historical);
  assert.equal(messages[0].messageId, "WA_LEGACY_ID");
  assert.deepEqual(await history.registrarDisparoConfirmadoSite({ ...input, requestId: "too-old", sentAt: NOW - 8 * 24 * 60 * 60_000 }, memory.deps), []);
  await assert.rejects(() => history.registrarDisparoConfirmadoSite({ ...input, sentAt: NOW + 120_000 }, memory.deps), /RECEIPT_INVALID/);
});

test("alerta de atendimento humano identifica Uirá no ledger administrativo", async () => {
  const memory = memoryDb();
  await history.registrarIntencaoDisparoSite(intent({ dispatchKind: "alerta_atendimento_humano" }), memory.deps);
  const [message] = await history.consultarDisparosSite(SESSION, 0, memory.deps);
  assert.equal(message.recipientLabel, "Uirá");
  assert.match(message.text, /WhatsApp → Uirá/);
});

test("sessões inválidas ou payload sem ID são rejeitados antes de qualquer escrita", async () => {
  const memory = memoryDb();
  for (const siteSessionIds of [["whatsapp_5562991150376"], ["site_../other"], "not-an-array", Array(21).fill(SESSION)]) {
    await assert.rejects(() => history.registrarIntencaoDisparoSite(intent({ siteSessionIds }), memory.deps), /SESSION_INVALID/);
  }
  await assert.rejects(() => history.registrarIntencaoDisparoSite(intent({ requestId: "" }), memory.deps), /INPUT_INVALID/);
  assert.equal(memory.rows.size, 0);
  assert.deepEqual(await history.registrarIntencaoDisparoSite(intent({ siteSessionIds: [] }), { db: null }), []);
});
