const { test } = require("node:test");
const assert = require("node:assert/strict");
const { FieldValue } = require("firebase-admin/firestore");
const {
  consultarRemarcacaoDisponivel,
  aplicarRemarcacaoAutorizada,
} = require("../dist/services/reservationRescheduleAvailability");

const clone = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const NOW = Date.parse("2026-10-30T12:00:00Z"); // 09h em São Paulo
const original = (override = {}) => ({
  nome: "Cliente Teste", telefone: "5561999990000", cpf: "52998224725",
  atividade: "Brunch", data: "2026-11-01", horario: "09:00", horariosPorPacote: { brunch: "09:00" },
  pacoteIds: ["brunch"], participantes: 2, adultos: 2, participantesPorTipo: { adulto: 2 },
  status: "pago", confirmada: true, valor: 220, asaasPaymentId: "pay_original", formaPagamento: "PIX",
  ...override,
});
const pack = (override = {}) => ({ nome: "Brunch", modoHorario: "lista", horarios: ["09:00", "11:00", "13:00"], limite: 8, ativo: true, ...override });
const target = { data: "2026-11-02", horario: "11:00" };

// Optimistic transactions track document reads, deliberately not query phantoms.
// This lets the concurrency regression prove the shared day fence is necessary.
const memoryDb = (seed, barrier = false) => {
  const rows = new Map(Object.entries(seed).map(([path, data]) => [path, { data: clone(data), version: 1 }]));
  const writes = [];
  let retries = 0;
  let waiting = 0;
  let release;
  const firstWave = new Promise((resolve) => { release = resolve; });
  const snapshot = (ref, register) => {
    const row = rows.get(ref.path);
    register?.(ref.path, row?.version || 0);
    return { id: ref.id, ref, exists: Boolean(row), data: () => clone(row?.data) };
  };
  const collection = (name, filters = []) => ({
    kind: "query", name, filters,
    doc: (id) => ({ kind: "doc", id, path: `${name}/${id}`, get: async function () { return snapshot(this); } }),
    where(field, operation, value) { assert.equal(operation, "=="); return collection(name, [...filters, [field, value]]); },
    async get() { return querySnapshot(this); },
  });
  const querySnapshot = (query, register) => ({
    docs: [...rows.entries()].filter(([path, row]) => path.startsWith(`${query.name}/`)
      && query.filters.every(([field, value]) => row.data[field] === value))
      .map(([path]) => snapshot({ kind: "doc", id: path.slice(query.name.length + 1), path }, register)),
  });
  const apply = (operation) => {
    const previous = rows.get(operation.ref.path);
    if (operation.type === "update" && !previous) throw new Error("NOT_FOUND");
    const data = operation.merge || operation.type === "update" ? { ...previous?.data } : {};
    for (const [key, value] of Object.entries(operation.data)) {
      data[key] = value?.isEqual?.(FieldValue.increment(1)) ? Number(data[key] || 0) + 1 : clone(value);
    }
    rows.set(operation.ref.path, { data, version: (previous?.version || 0) + 1 });
    writes.push({ path: operation.ref.path, data: clone(data) });
  };
  const db = {
    collection,
    async runTransaction(callback) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const reads = new Map();
        const pending = [];
        const tx = {
          async get(reference) {
            if (pending.length) throw new Error("READ_AFTER_WRITE");
            const register = (path, version) => reads.set(path, version);
            return reference.kind === "doc" ? snapshot(reference, register) : querySnapshot(reference, register);
          },
          set: (ref, data, options) => pending.push({ type: "set", ref, data, merge: options?.merge }),
          update: (ref, data) => pending.push({ type: "update", ref, data }),
        };
        const result = await callback(tx);
        if (barrier && attempt === 0 && pending.length) {
          if (++waiting === 2) release();
          await firstWave;
        }
        if ([...reads.entries()].some(([path, version]) => (rows.get(path)?.version || 0) !== version)) { retries++; continue; }
        pending.forEach(apply);
        return result;
      }
      throw new Error("TRANSACTION_RETRY_LIMIT");
    },
  };
  return { db, writes, rows, data: (path) => clone(rows.get(path)?.data), retries: () => retries,
    seed: (path, data) => rows.set(path, { data: clone(data), version: (rows.get(path)?.version || 0) + 1 }),
    deps: { db, now: () => NOW } };
};
const setup = (source = original(), extra = {}, packageOverride = {}) => memoryDb({
  "reservas/original": source, "pacotes/brunch": pack(packageOverride), ...extra,
});

test("consulta é somente leitura e snapshot não expõe CPF nem dados de cobrança", async () => {
  const memory = setup();
  const result = await consultarRemarcacaoDisponivel("original", target, memory.deps);
  assert.equal(result.disponivel, true);
  assert.equal(result.status, "disponivel");
  assert.deepEqual(result.antes, { data: "2026-11-01", horario: "09:00", horariosPorPacote: { brunch: "09:00" } });
  assert.deepEqual(result.depois, { data: "2026-11-02", horario: "11:00", horariosPorPacote: { brunch: "11:00" } });
  assert.equal(result.nome, "Cliente Teste");
  assert.equal(result.telefone, "5561999990000");
  assert.equal(result.pacotes[0].solicitadas, 2);
  assert.equal(result.pacotes[0].vagasAposRemarcacao, 6);
  assert.equal("cpf" in result, false);
  assert.doesNotMatch(JSON.stringify(result), /52998224725|pay_original/);
  assert.equal(memory.writes.length, 0);
  assert.equal(memory.data("disponibilidade/2026-11-02"), undefined);
});

test("exclui a própria reserva, considera confirmadas e ignora temporária aguardando ou exceção de capacidade", async () => {
  const memory = setup(original({ data: target.data, horario: "11:00", horariosPorPacote: { brunch: "11:00" } }), {
    "reservas/temporary": original({ data: target.data, horario: "11:00", status: "aguardando", confirmada: false, participantes: 100 }),
    "reservas/cancelled": original({ data: target.data, horario: "11:00", status: "cancelado", confirmada: true, participantes: 100 }),
    "reservas/educational": original({ data: target.data, horario: "11:00", naoConsomeDisponibilidade: true, participantes: 100 }),
  }, { limite: 2 });
  const result = await consultarRemarcacaoDisponivel("original", target, memory.deps);
  assert.equal(result.disponivel, true);
  assert.equal(result.pacotes[0].ocupadas, 0);
  assert.equal(result.pacotes[0].vagasRestantes, 2);
});

test("pendente financeiro, cancelada, usada e reserva de exceção exigem atendimento sem mutação", async () => {
  for (const changed of [
    { status: "aguardando", confirmada: false }, { status: "cancelado", confirmada: true },
    { chegou: true }, { naoConsomeDisponibilidade: true },
  ]) {
    const memory = setup(original(changed));
    const preview = await consultarRemarcacaoDisponivel("original", target, memory.deps);
    assert.equal(preview.status, "exige_atendimento");
    const result = await aplicarRemarcacaoAutorizada("original", target, { ...memory.deps, expectedFingerprint: preview.fingerprint });
    assert.equal(result.aplicada, false);
    assert.equal(memory.writes.length, 0);
  }
});

test("revalida fechamento, dia da semana, data bloqueada, grade e vagas reais", async () => {
  const scenarios = [
    [{ "disponibilidade/2026-11-02": { fechado: true } }, {}, "DIA_FECHADO"],
    [{}, { dias: [0] }, "DIA_DA_SEMANA_INDISPONIVEL"],
    [{}, { datasBloqueadas: [target.data] }, "DATA_BLOQUEADA"],
    [{}, { horarios: ["09:00"] }, "HORARIO_FORA_DA_GRADE"],
    [{ "disponibilidade/2026-11-02": { horarios: { "2026-11-02-brunch-11:00": false } } }, {}, "HORARIO_BLOQUEADO"],
    [{ "reservas/full": original({ data: target.data, horario: "11:00", horariosPorPacote: { brunch: "11:00" }, participantes: 8 }) }, {}, "VAGAS_INSUFICIENTES"],
  ];
  for (const [extra, packageOverride, reason] of scenarios) {
    const memory = setup(original(), extra, packageOverride);
    const result = await consultarRemarcacaoDisponivel("original", target, memory.deps);
    assert.equal(result.disponivel, false, reason);
    assert.equal(result.status, "indisponivel", reason);
    assert.ok(result.motivos.some((item) => item.includes(reason)), reason);
    assert.equal(memory.writes.length, 0);
  }
});

test("capacidade usa todos os extras e limite zero permanece sem limite", async () => {
  const memory = setup(original({ participantes: 3, adultos: 3, participantesPorTipo: { adulto: 3 } }), {
    "disponibilidade/2026-11-02": { vagasExtras: { "geral::2026-11-02": 1, "2026-11-02-brunch": 2, "geral::2026-11-02::11:00": 1, "2026-11-02-brunch-11:00": 2 } },
    "reservas/occupied": original({ data: target.data, horario: "11:00", horariosPorPacote: { brunch: "11:00" } }),
  }, { limite: 2 });
  const result = await consultarRemarcacaoDisponivel("original", target, memory.deps);
  assert.equal(result.disponivel, true);
  assert.equal(result.pacotes[0].capacidade, 8);
  assert.equal(result.pacotes[0].ocupadas, 2);
  assert.equal(result.pacotes[0].vagasRestantes, 6);
  const unlimited = setup(original(), {}, { limite: 0 });
  assert.equal((await consultarRemarcacaoDisponivel("original", target, unlimited.deps)).pacotes[0].capacidade, null);
  const invalid = setup(original(), {}, { limite: "desconhecido" });
  assert.equal((await consultarRemarcacaoDisponivel("original", target, invalid.deps)).status, "exige_atendimento");
});

test("grupo misto e combo conservam participantes reais por pacote e faixa conta o dia inteiro", async () => {
  const source = original({
    atividade: "Brunch + Trilha", pacoteIds: ["brunch", "trilha"], comboId: "combo", participantes: 5,
    gruposParticipacao: [
      { tipo: "pacote", refId: "brunch", pacoteIds: ["brunch"], participantes: 2, participantesPorTipo: { adulto: 2 } },
      { tipo: "pacote", refId: "trilha", pacoteIds: ["trilha"], participantes: 3, participantesPorTipo: { adulto: 2, crianca: 1 } },
    ],
  });
  const memory = setup(source, {
    "combos/combo": { pacoteIds: ["brunch", "trilha"] },
    "pacotes/trilha": pack({ nome: "Trilha", modoHorario: "intervalo", horarios: [], horarioInicio: "09:00", horarioFim: "16:00", limite: 4 }),
    "reservas/trail-existing": original({ data: target.data, horario: "14:00", horariosPorPacote: { trilha: "14:00" }, pacoteIds: ["trilha"], participantes: 1, adultos: 1, participantesPorTipo: { adulto: 1 } }),
  }, { limite: 2 });
  const result = await consultarRemarcacaoDisponivel("original", target, memory.deps);
  assert.equal(result.disponivel, true);
  assert.equal(result.pacotes.find((item) => item.id === "brunch").solicitadas, 2);
  assert.equal(result.pacotes.find((item) => item.id === "trilha").solicitadas, 3);
  assert.equal(result.pacotes.find((item) => item.id === "trilha").ocupadas, 1);
});

test("datas e horários inválidos não passam e horários de hoje usam São Paulo", async () => {
  const memory = setup();
  await assert.rejects(() => consultarRemarcacaoDisponivel("original", { data: "2026-02-31" }, memory.deps), /DATE_INVALID/);
  await assert.rejects(() => consultarRemarcacaoDisponivel("original", { data: target.data, horario: "25:00" }, memory.deps), /TIME_INVALID/);
  const past = await consultarRemarcacaoDisponivel("original", { data: "2026-10-29", horario: "11:00" }, memory.deps);
  assert.ok(past.motivos.includes("DATA_PASSADA"));
  const today = await consultarRemarcacaoDisponivel("original", { data: "2026-10-30", horario: "09:00" }, memory.deps);
  assert.ok(today.motivos.includes("brunch:HORARIO_PASSADO"));
  assert.equal(memory.writes.length, 0);
});

test("alteração de horário por pacote atualiza horário principal e rejeita pacote estranho", async () => {
  const memory = setup();
  const result = await consultarRemarcacaoDisponivel("original", { data: target.data, horariosPorPacote: { brunch: "13:00" } }, memory.deps);
  assert.equal(result.depois.horario, "13:00");
  assert.equal(result.depois.horariosPorPacote.brunch, "13:00");
  const invalid = await consultarRemarcacaoDisponivel("original", { data: target.data, horariosPorPacote: { unknown: "11:00" } }, memory.deps);
  assert.equal(invalid.status, "exige_atendimento");
  const conflicting = await consultarRemarcacaoDisponivel("original", { ...target, horariosPorPacote: { brunch: "13:00" } }, memory.deps);
  assert.equal(conflicting.status, "exige_atendimento");
  assert.ok(conflicting.motivos.includes("HORARIO_PRINCIPAL_INCONSISTENTE"));
  assert.equal(memory.writes.length, 0);
});

test("aplicação só muda data/horas e espelhos da cotação; financeiro e participantes são preservados", async () => {
  const source = original({
    Data: "2026-11-01", Horario: "09:00", pagamentoId: "payment-identity",
    cotacao: { data: "2026-11-01", horario: "09:00", horariosPorPacote: { brunch: "09:00" }, valor: 220, moeda: "BRL", cotacao: [{ quantidade: 2, subtotal: 220 }], pacotes: [{ id: "brunch", horario: "09:00" }] },
  });
  const memory = setup(source);
  const preview = await consultarRemarcacaoDisponivel("original", target, memory.deps);
  const result = await aplicarRemarcacaoAutorizada("original", target, { ...memory.deps, expectedFingerprint: preview.fingerprint });
  assert.equal(result.aplicada, true);
  const saved = memory.data("reservas/original");
  assert.equal(saved.data, target.data);
  assert.equal(saved.Data, target.data);
  assert.equal(saved.horario, "11:00");
  assert.equal(saved.Horario, "11:00");
  assert.equal(saved.cotacao.data, target.data);
  assert.equal(saved.cotacao.pacotes[0].horario, "11:00");
  assert.equal(saved.cotacao.valor, 220);
  assert.deepEqual(saved.cotacao.cotacao, source.cotacao.cotacao);
  for (const key of Object.keys(source).filter((key) => !["data", "Data", "horario", "Horario", "horariosPorPacote", "cotacao"].includes(key))) assert.deepEqual(saved[key], source[key], key);
  assert.equal(memory.data("disponibilidade/2026-11-02").remarcacoesRevision, 1);
});

test("mudança da reserva ou lotação posterior ao pedido impede aplicação sem consumir vaga", async () => {
  const memory = setup();
  const preview = await consultarRemarcacaoDisponivel("original", target, memory.deps);
  memory.seed("reservas/other", original({ data: target.data, horario: "11:00", horariosPorPacote: { brunch: "11:00" }, participantes: 8 }));
  const full = await aplicarRemarcacaoAutorizada("original", target, { ...memory.deps, expectedFingerprint: preview.fingerprint });
  assert.equal(full.aplicada, false);
  assert.ok(full.motivos.includes("brunch:VAGAS_INSUFICIENTES"));
  assert.equal(memory.writes.length, 0);
  memory.seed("reservas/original", original({ valor: 230 }));
  const changed = await aplicarRemarcacaoAutorizada("original", target, { ...memory.deps, expectedFingerprint: preview.fingerprint });
  assert.equal(changed.aplicada, false);
  assert.deepEqual(changed.motivos, ["RESERVA_ALTERADA_DESDE_A_SOLICITACAO"]);
  assert.equal(memory.data("reservas/original").data, "2026-11-01");
});

test("troca de titular com mesmo telefone invalida a autorização sem expor CPF", async () => {
  for (const changed of [{ cpf: "11144477735" }, { nome: "Outra Pessoa" }, { cpf: "111.444.777-35", nome: "Outra Pessoa" }]) {
    const memory = setup();
    const preview = await consultarRemarcacaoDisponivel("original", target, memory.deps);
    memory.seed("reservas/original", original(changed));
    const result = await aplicarRemarcacaoAutorizada("original", target, { ...memory.deps, expectedFingerprint: preview.fingerprint });
    assert.equal(result.aplicada, false);
    assert.deepEqual(result.motivos, ["RESERVA_ALTERADA_DESDE_A_SOLICITACAO"]);
    assert.equal(memory.writes.length, 0);
    assert.doesNotMatch(JSON.stringify(result), /11144477735|111\.444\.777-35|52998224725/);
  }
  const normalized = setup();
  const preview = await consultarRemarcacaoDisponivel("original", target, normalized.deps);
  normalized.seed("reservas/original", original({ cpf: "529.982.247-25", nome: "  CLIENTE   TESTE  " }));
  const result = await aplicarRemarcacaoAutorizada("original", target, { ...normalized.deps, expectedFingerprint: preview.fingerprint });
  assert.equal(result.aplicada, true);
});

test("duas aprovações concorrentes rechecadas pelo fence não ultrapassam o limite", async () => {
  const memory = memoryDb({
    "reservas/first": original(), "reservas/second": original({ data: "2026-11-03" }),
    "pacotes/brunch": pack({ limite: 3 }),
  }, true);
  const first = await consultarRemarcacaoDisponivel("first", target, memory.deps);
  const second = await consultarRemarcacaoDisponivel("second", target, memory.deps);
  const results = await Promise.all([
    aplicarRemarcacaoAutorizada("first", target, { ...memory.deps, expectedFingerprint: first.fingerprint }),
    aplicarRemarcacaoAutorizada("second", target, { ...memory.deps, expectedFingerprint: second.fingerprint }),
  ]);
  assert.equal(results.filter((item) => item.aplicada).length, 1);
  assert.equal(results.filter((item) => !item.aplicada && item.motivos.includes("brunch:VAGAS_INSUFICIENTES")).length, 1);
  assert.ok(memory.retries() >= 1);
  assert.equal(memory.data("disponibilidade/2026-11-02").remarcacoesRevision, 1);
  const moved = [memory.data("reservas/first"), memory.data("reservas/second")].filter((item) => item.data === target.data);
  assert.equal(moved.length, 1);
});

test("transação externa atualiza pedido e reserva juntos, sem leitura após primeira escrita", async () => {
  const memory = setup(original(), { "requests/approval": { status: "pending" } });
  const preview = await consultarRemarcacaoDisponivel("original", target, memory.deps);
  const result = await memory.db.runTransaction(async (transaction) => {
    const request = await transaction.get(memory.db.collection("requests").doc("approval"));
    assert.equal(request.data().status, "pending");
    const applied = await aplicarRemarcacaoAutorizada("original", target, { ...memory.deps, transaction, expectedFingerprint: preview.fingerprint });
    transaction.set(memory.db.collection("requests").doc("approval"), { status: applied.aplicada ? "applied" : "unavailable" }, { merge: true });
    return applied;
  });
  assert.equal(result.aplicada, true);
  assert.equal(memory.data("requests/approval").status, "applied");
  assert.equal(memory.data("reservas/original").data, target.data);
});
