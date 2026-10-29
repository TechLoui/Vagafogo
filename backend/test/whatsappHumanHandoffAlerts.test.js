const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");

const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const {
  montarMensagemAlertaAtendimentoHumano,
  normalizarTelefoneAlertaAtendimentoHumano,
  enfileirarAlertaAtendimentoHumano,
  processarAlertaAtendimentoHumano,
  processarAlertasAtendimentoHumano,
} = require("../dist/services/whatsappHumanHandoffAlerts");

const DESTINATION = "5562991150376";
const COLLECTION = "whatsapp_alertas_atendimento_humano";
const payload = (override = {}) => ({
  nome: "Karen Lima", telefone: "5562999999999", motivo: "alteracao_reserva",
  resumo: "Cliente precisa mudar a reserva de 31/10 para 01/11 às 11h.",
  sourceMessageId: "site-whatsapp-continuation:request1", canal: "site", ...override,
});

const memoryDb = () => {
  const records = new Map();
  const createdTimes = new Map();
  const collections = [];
  let now = Date.parse("2026-10-29T15:00:00Z");
  let lock = Promise.resolve();
  const snapshot = (ref) => ({
    id: ref.id, ref, exists: records.has(ref.path), createTime: createdTimes.get(ref.path),
    data: () => records.has(ref.path) ? { ...records.get(ref.path) } : undefined,
  });
  const apply = (ref, data, merge) => {
    const current = merge ? { ...records.get(ref.path) } : {};
    for (const [key, value] of Object.entries(data)) {
      if (value?.isEqual?.(FieldValue.delete())) delete current[key];
      else current[key] = value?.isEqual?.(FieldValue.serverTimestamp()) ? Timestamp.fromMillis(now) : value;
    }
    if (!records.has(ref.path)) createdTimes.set(ref.path, Timestamp.fromMillis(now));
    records.set(ref.path, current);
  };
  const db = {
    collection(name) {
      collections.push(name);
      let filter = () => true;
      let maximum = Infinity;
      return {
        doc: (id) => ({ id, path: `${name}/${id}` }),
        where(field, operator, values) { filter = (data) => operator === "in" ? values.includes(data[field]) : data[field] === values; return this; },
        limit(value) { maximum = value; return this; },
        async get() {
          return { docs: [...records.entries()].filter(([path, data]) => path.startsWith(`${name}/`) && filter(data)).slice(0, maximum)
            .map(([path]) => snapshot({ id: path.slice(name.length + 1), path })) };
        },
      };
    },
    runTransaction(callback) {
      const task = lock.then(async () => {
        const writes = [];
        const result = await callback({
          get: async (ref) => snapshot(ref),
          create: (ref, data) => {
            if (records.has(ref.path)) throw new Error("ALREADY_EXISTS");
            writes.push(() => apply(ref, data, false));
          },
          set: (ref, data, options) => writes.push(() => apply(ref, data, options?.merge)),
        });
        writes.forEach((write) => write());
        return result;
      });
      lock = task.catch(() => undefined);
      return task;
    },
  };
  const dependencies = (send) => ({ db, send, now: () => now, processImmediately: false });
  return {
    db, dependencies, collections, records,
    data: (id) => records.get(`${COLLECTION}/${id}`),
    advance: (ms) => { now += ms; },
    time: () => now,
    seed: (id, data, createdAt = now) => {
      const path = `${COLLECTION}/${id}`;
      records.set(path, data);
      if (createdAt) createdTimes.set(path, Timestamp.fromMillis(createdAt));
    },
  };
};

test("tentativa final abandonada sai da fila sem fechar envio ainda em andamento", async () => {
  const memory = memoryDb();
  const timestamp = Timestamp.fromMillis(memory.time());
  memory.seed("final-claim", {
    ...payload(), status: "enviando", tentativas: 5, criadoEm: timestamp,
    ultimaTentativaEm: timestamp, leaseId: "final-attempt", proximaTentativaEm: timestamp,
  });
  let sent = 0;
  const deps = memory.dependencies(async () => { sent++; return { enviado: true }; });
  await processarAlertaAtendimentoHumano("final-claim", deps);
  assert.equal(memory.data("final-claim").status, "enviando");
  memory.advance(2 * 60_000);
  await processarAlertaAtendimentoHumano("final-claim", deps);
  assert.equal(memory.data("final-claim").status, "erro_final");
  assert.equal(memory.data("final-claim").leaseId, undefined);
  assert.equal(memory.data("final-claim").proximaTentativaEm, undefined);
  assert.equal(sent, 0);
});

test("monta aviso operacional com cliente, motivo e orientacao", () => {
  const message = montarMensagemAlertaAtendimentoHumano({
    nome: "Karen Lima",
    telefone: "5562999999999",
    motivo: "alteracao_reserva",
    resumo: "Cliente precisa mudar a reserva de 10/10 para 11/10.",
  });
  assert.match(message, /Karen Lima/);
  assert.match(message, /Alteração de reserva/);
  assert.match(message, /bot foi pausado/);
  assert.match(message, /https:\/\/wa\.me\/5562999999999/);
  assert.match(message, /vagafogo\.com\.br\/agente/);
});

test("normaliza telefone estritamente, sem truncar números longos nem confundir DDD55", () => {
  assert.equal(normalizarTelefoneAlertaAtendimentoHumano("(62) 99999-9999"), "5562999999999");
  assert.equal(normalizarTelefoneAlertaAtendimentoHumano("+55 (62) 99999-9999"), "5562999999999");
  assert.equal(normalizarTelefoneAlertaAtendimentoHumano("(55) 99999-9999"), "5555999999999");
  for (const value of ["", "629999", "55629999999999999", "123456789012345", "5500999999999", "5562123456789"]) {
    assert.equal(normalizarTelefoneAlertaAtendimentoHumano(value), "", value);
  }
  const message = montarMensagemAlertaAtendimentoHumano(payload({ telefone: "número inválido" }));
  assert.match(message, /Telefone: Não identificado/);
  assert.doesNotMatch(message, /wa\.me\//);
});

test("preserva solicitação concreta e horário no resumo longo", () => {
  const message = montarMensagemAlertaAtendimentoHumano(payload({
    resumo: `${"Contexto anterior. ".repeat(220)}Cliente pediu mudança para 01/11/2026 às 11h.`,
    ultimaMensagem: "Pode confirmar também o desconto de aniversariante?",
  }));
  assert.match(message, /01\/11\/2026 às 11h/);
  assert.match(message, /Última mensagem: Pode confirmar também o desconto de aniversariante/);
  assert.ok(message.length < 4096);
});

test("enfileira uma vez por telefone/evento e fixa destinatário sem consultar config de reservas", async () => {
  const memory = memoryDb();
  const deps = memory.dependencies(async () => { throw new Error("UNEXPECTED_SEND"); });
  const first = await enfileirarAlertaAtendimentoHumano(payload({ destino: "5511999999999" }), deps);
  const repeated = await enfileirarAlertaAtendimentoHumano(payload({ telefone: "(62) 99999-9999", motivo: "excecao_operacional" }), deps);
  assert.equal(first.enfileirado, true);
  assert.equal(first.destino, DESTINATION);
  assert.equal(repeated.duplicado, true);
  assert.equal(first.id, repeated.id);
  assert.equal(memory.records.size, 1);
  assert.equal(memory.data(first.id).destino, DESTINATION);
  assert.equal(memory.collections.includes("configuracoes"), false);
  const next = await enfileirarAlertaAtendimentoHumano(payload({ sourceMessageId: "second-event" }), deps);
  assert.notEqual(next.id, first.id);
  await assert.rejects(() => enfileirarAlertaAtendimentoHumano(payload({ telefone: "55629999999999999" }), deps), /HANDOFF_PHONE_INVALID/);
  await assert.rejects(() => enfileirarAlertaAtendimentoHumano(payload({ sourceMessageId: "" }), deps), /HANDOFF_SOURCE_MESSAGE_REQUIRED/);
});

test("claim concorrente e status enviado impedem duplicação; destino antigo também é corrigido", async () => {
  const memory = memoryDb();
  const calls = [];
  const deps = memory.dependencies(async (...args) => { calls.push(args); return { enviado: true, messageId: "sent1" }; });
  const queued = await enfileirarAlertaAtendimentoHumano(payload(), deps);
  memory.data(queued.id).destino = "5511999999999";
  await Promise.all([processarAlertaAtendimentoHumano(queued.id, deps), processarAlertaAtendimentoHumano(queued.id, deps)]);
  await processarAlertaAtendimentoHumano(queued.id, deps);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], DESTINATION);
  assert.match(calls[0][1], /https:\/\/wa\.me\/5562999999999/);
  assert.equal(calls[0][4].tipoDisparo, "alerta_atendimento_humano");
  assert.equal(memory.data(queued.id).status, "enviado");
  assert.equal(memory.data(queued.id).messageId, "sent1");
});

test("falha temporária retenta no mesmo requestId e respeita próxima tentativa", async () => {
  const memory = memoryDb();
  const ids = [];
  const deps = memory.dependencies(async (phone, text, requestId) => {
    ids.push(requestId);
    return ids.length === 1 ? { enviado: false, motivo: "WhatsApp nao conectado" } : { enviado: true };
  });
  const queued = await enfileirarAlertaAtendimentoHumano(payload(), deps);
  await processarAlertaAtendimentoHumano(queued.id, deps);
  assert.equal(memory.data(queued.id).status, "aguardando");
  assert.equal(memory.data(queued.id).tentativas, 1);
  await processarAlertaAtendimentoHumano(queued.id, deps);
  assert.equal(ids.length, 1);
  memory.advance(30_000);
  await processarAlertaAtendimentoHumano(queued.id, deps);
  assert.deepEqual(ids, [ids[0], ids[0]]);
  assert.equal(memory.data(queued.id).status, "enviado");
});

test("DISPATCH_PACED respeita retryAfterMs sem consumir tentativa", async () => {
  const memory = memoryDb();
  let calls = 0;
  const deps = memory.dependencies(async () => ++calls === 1
    ? { enviado: false, motivo: "DISPATCH_PACED", retryAfterMs: 45_000 } : { enviado: true });
  const queued = await enfileirarAlertaAtendimentoHumano(payload(), deps);
  await processarAlertaAtendimentoHumano(queued.id, deps);
  assert.equal(memory.data(queued.id).tentativas, 0);
  assert.equal(memory.data(queued.id).proximaTentativaEm.toMillis(), memory.time() + 45_000);
  memory.advance(44_999);
  await processarAlertaAtendimentoHumano(queued.id, deps);
  assert.equal(calls, 1);
  memory.advance(1);
  await processarAlertaAtendimentoHumano(queued.id, deps);
  assert.equal(calls, 2);
  assert.equal(memory.data(queued.id).tentativas, 1);
});

test("fila antiga restaurada expira por criadoEm/createdAt em vez de disparar backlog", async () => {
  const memory = memoryDb();
  let calls = 0;
  const deps = memory.dependencies(async () => { calls++; return { enviado: true }; });
  const old = Timestamp.fromMillis(memory.time() - 25 * 60 * 60_000);
  memory.seed("old-portuguese", { ...payload(), status: "aguardando", tentativas: 0, criadoEm: old });
  memory.seed("restored-english", { ...payload(), status: "enviando", tentativas: 1, criadoEm: Timestamp.fromMillis(memory.time()), createdAt: old });
  memory.seed("unknown-age", { ...payload(), status: "aguardando", tentativas: 0 }, 0);
  await processarAlertasAtendimentoHumano(deps);
  assert.equal(calls, 0);
  for (const id of ["old-portuguese", "restored-english", "unknown-age"]) assert.equal(memory.data(id).status, "expirado", id);
});

test("callback legado repetido reutiliza ID antigo sem renovar data e disparar backlog", async () => {
  const memory = memoryDb();
  const event = payload();
  const oldId = createHash("sha256").update(`handoff:v1\0${event.telefone}\0${event.sourceMessageId}\0${event.motivo}`).digest("hex");
  memory.seed(oldId, { ...event, status: "aguardando", tentativas: 0, criadoEm: Timestamp.fromMillis(memory.time() - 25 * 60 * 60_000) });
  let sent = 0;
  const deps = memory.dependencies(async () => { sent++; return { enviado: true }; });
  const queued = await enfileirarAlertaAtendimentoHumano(event, deps);
  assert.equal(queued.duplicado, true);
  assert.equal(queued.id, oldId);
  assert.equal(memory.records.size, 1);
  await processarAlertaAtendimentoHumano(queued.id, deps);
  assert.equal(sent, 0);
  assert.equal(memory.data(oldId).status, "expirado");
});

test("enfileirar persiste e resolve sem aguardar envio remoto", async () => {
  const memory = memoryDb();
  let release;
  const pendingSend = new Promise((resolve) => { release = resolve; });
  let sending = false;
  const deps = { ...memory.dependencies(async () => { sending = true; await pendingSend; return { enviado: true }; }), processImmediately: true };
  const queued = await enfileirarAlertaAtendimentoHumano(payload(), deps);
  assert.equal(queued.enfileirado, true);
  assert.equal(memory.records.size, 1);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(sending, true);
  assert.equal(memory.data(queued.id).status, "enviando");
  release();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(memory.data(queued.id).status, "enviado");
});

test("claim abandonado pode retomar e falhas definitivas param após cinco tentativas", async () => {
  const memory = memoryDb();
  let calls = 0;
  const deps = memory.dependencies(async () => { calls++; return { enviado: false, motivo: "CONTACT_BLOCKED" }; });
  memory.seed("stale", {
    ...payload(), status: "enviando", tentativas: 0, criadoEm: Timestamp.fromMillis(memory.time() - 10 * 60_000),
    ultimaTentativaEm: Timestamp.fromMillis(memory.time() - 3 * 60_000), leaseId: "old-worker",
  });
  for (let attempt = 0; attempt < 5; attempt++) {
    await processarAlertaAtendimentoHumano("stale", deps);
    memory.advance(10 * 60_000);
  }
  await processarAlertaAtendimentoHumano("stale", deps);
  assert.equal(calls, 5);
  assert.equal(memory.data("stale").status, "erro_final");
  assert.equal(memory.data("stale").tentativas, 5);
});

test("resultado tardio de um worker não sobrescreve claim mais novo", async () => {
  const memory = memoryDb();
  let queued;
  const deps = memory.dependencies(async () => {
    Object.assign(memory.data(queued.id), { leaseId: "new-worker", status: "enviado", messageId: "new-message" });
    return { enviado: false, motivo: "OLD_WORKER_TIMEOUT" };
  });
  queued = await enfileirarAlertaAtendimentoHumano(payload(), deps);
  await processarAlertaAtendimentoHumano(queued.id, deps);
  assert.equal(memory.data(queued.id).status, "enviado");
  assert.equal(memory.data(queued.id).messageId, "new-message");
});
