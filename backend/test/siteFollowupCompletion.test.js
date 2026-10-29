const { test } = require("node:test");
const assert = require("node:assert/strict");
const { verificarConclusaoRetomadaSite } = require("../dist/services/siteFollowupCompletion");

const now = Date.now();
const startedAt = now - 30 * 60_000;
const candidate = (overrides = {}) => ({
  sessionId: "site_completion_current_123", phone: "5562999990000", createdAt: startedAt,
  bookingFollowup: { date: "" }, ...overrides,
});
const during = new Date(startedAt + 10 * 60_000);
const before = new Date(startedAt - 24 * 60 * 60_000);

const database = (collections = {}, failure = false) => {
  const queries = [];
  return {
    queries,
    collection(name) {
      let field;
      let operator;
      let expected;
      let maximum = Infinity;
      return {
        where(key, operation, value) { field = key; operator = operation; expected = value; return this; },
        limit(value) { maximum = value; return this; },
        async get() {
          if (failure) throw new Error("DATABASE_OFFLINE");
          queries.push({ name, field, operator, expected, maximum });
          const rows = (collections[name] || []).filter((data) => operator === "in"
            ? expected.includes(data[field]) : data[field] === expected);
          return { docs: rows.slice(0, maximum).map((data, index) => ({
            id: `${index}`, data: () => data,
          })) };
        },
      };
    },
  };
};

test("compra confirmada no formulário sem data no chat impede retomada", async () => {
  const db = database({ reservas: [{ telefone: "(62) 99999-0000", status: "pago", criadoEm: during, data: "2026-12-01" }] });
  assert.equal(await verificarConclusaoRetomadaSite(candidate(), { db }), true);
  assert.equal(db.queries.length, 5);
  assert.equal(db.queries.filter((query) => query.name === "reservas").length, 1);
  assert.ok(db.queries.every((query) => query.operator !== "in" || query.expected.length <= 10));
});

test("pagamento durante conversa conta mesmo quando reserva foi criada antes", async () => {
  const db = database({ reservas: [{ telefone: "5562999990000", confirmada: true, criadoEm: before, dataPagamento: { toMillis: () => during.getTime() } }] });
  assert.equal(await verificarConclusaoRetomadaSite(candidate(), { db }), true);
});

test("sem data contextual não bloqueia por reserva antiga ou ainda pendente", async () => {
  const db = database({ reservas: [
    { telefone: "5562999990000", status: "pago", criadoEm: before, dataPagamento: before },
    { telefone: "5562999990000", status: "aguardando", criadoEm: during },
    { telefone: "5562999990000", status: "cancelado", confirmada: true, criadoEm: during },
  ] });
  assert.equal(await verificarConclusaoRetomadaSite(candidate(), { db }), false);
});

test("data conhecida exige visita correspondente e aceita telefone legado sem nono dígito", async () => {
  const db = database({ reservas: [{ telefone: "+55 (62) 9999-0000", Status: "confirmado", criadoEm: before, Data: "2026-12-01" }] });
  assert.equal(await verificarConclusaoRetomadaSite(candidate({ bookingFollowup: { date: "2026-12-01" } }), { db }), true);
  assert.equal(await verificarConclusaoRetomadaSite(candidate({ bookingFollowup: { date: "2026-12-02" } }), { db }), false);
});

test("lead terminal desta sessão suprime; pendente e outra sessão não", async () => {
  for (const completion of [
    { etapa: "concluida", resultado: "reserva_confirmada" },
    { etapa: "atendimento_concluido", resultado: "duvida_resolvida" },
    { etapa: "encerrado_sem_reserva", resultado: "nao_convertido" },
    { etapa: "atendimento_humano", resultado: "atendimento_humano" },
  ]) {
    const db = database({ crm_leads_agente: [{ sessionId: candidate().sessionId, telefone: "5562999990000", ...completion, finalizadoEm: during }] });
    assert.equal(await verificarConclusaoRetomadaSite(candidate(), { db }), true, completion.resultado);
    assert.equal(db.queries.some((query) => query.name === "reservas"), false);
  }
  const db = database({ crm_leads_agente: [
    { sessionId: "site_other_123", telefone: "5562999990000", resultado: "reserva_confirmada", finalizadoEm: during },
    { sessionId: candidate().sessionId, telefone: "5562999990000", etapa: "pagamento_pendente", resultado: "pagamento_pendente", atualizadoEm: during },
  ] });
  assert.equal(await verificarConclusaoRetomadaSite(candidate(), { db }), false);
});

test("lead unificado precisa canal site e conclusão após início desta conversa", async () => {
  const shared = { sessionId: "whatsapp_5562999990000", telefone: "5562999990000", resultado: "duvida_resolvida" };
  const current = database({ crm_leads_agente_rascunhos: [{ ...shared, canaisAtendimento: ["site", "whatsapp"], finalizadoEm: during }] });
  assert.equal(await verificarConclusaoRetomadaSite(candidate(), { db: current }), true);
  for (const data of [
    { ...shared, canal: "site", finalizadoEm: before, atualizadoEm: during },
    { ...shared, canal: "whatsapp", finalizadoEm: during },
    { ...shared, canal: "site", finalizadoEm: during, teste: true },
  ]) assert.equal(await verificarConclusaoRetomadaSite(candidate(), { db: database({ crm_leads_agente: [data] }) }), false);
});

test("finalização anterior não passa só porque metadados foram atualizados agora", async () => {
  const db = database({ crm_leads_agente: [{
    sessionId: candidate().sessionId, telefone: "5562999990000", resultado: "reserva_confirmada",
    finalizadoEm: before, atualizadoEm: during,
  }] });
  assert.equal(await verificarConclusaoRetomadaSite(candidate(), { db }), false);
});

test("indisponibilidade, identidade inválida e verificação incompleta falham fechado", async () => {
  await assert.rejects(() => verificarConclusaoRetomadaSite(candidate(), { db: null }), /FIRESTORE_UNAVAILABLE/);
  await assert.rejects(() => verificarConclusaoRetomadaSite(candidate(), { db: database({}, true) }), /DATABASE_OFFLINE/);
  await assert.rejects(() => verificarConclusaoRetomadaSite(candidate({ phone: "55629999900009999" }), { db: database() }), /IDENTITY_INVALID/);
  await assert.rejects(() => verificarConclusaoRetomadaSite(candidate({ createdAt: undefined }), { db: database() }), /START_REQUIRED/);
  const crowded = Array.from({ length: 101 }, (_, index) => ({ telefone: "5562999990000", sessionId: `site_other_${index}`, resultado: "em_andamento" }));
  await assert.rejects(() => verificarConclusaoRetomadaSite(candidate(), { db: database({ crm_leads_agente: crowded }) }), /QUERY_LIMIT/);
});
