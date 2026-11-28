const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const useSource = process.env.VAGAFOGO_TEST_SOURCE === "1";
if (useSource) require("ts-node").register({ project: path.join(__dirname, "../tsconfig.json"), transpileOnly: true });
const service = (name) => require(`../${useSource ? "src" : "dist"}/services/${name}`);

const {
  montarResumoDiarioReservas,
  montarResumoDiarioReservasComDados,
  montarAvisoNovaReservaEquipe,
  reservaElegivelParaAvisoEquipe,
  processarAvisosNovaReservaEquipe,
} = service("whatsappReservationAlerts");
const firebaseAdmin = service("firebaseAdmin");
const sender = service("agentTransactionalWhatsapp");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const { createAffiliateFirestore } = require("./helpers/affiliateFirestore");

const document = (data, id = "synthetic-reservation") => ({ id, data: () => data });
const catalog = {
  pacotes: [{ id: "brunch", nome: "Brunch Gastronômico" }, { id: "trilha", nome: "Trilha Ecológica" }],
  combos: [{ id: "combo", nome: "Brunch + Trilha", pacoteIds: ["brunch", "trilha"] }],
  tiposClientes: [{ id: "adult", nome: "Adulto" }, { id: "child", nome: "Criança" }, { id: "senior", nome: "Idoso" },
    { id: "bariatric", nome: "Bariátrica" }, { id: "free", nome: "Não pagante" }, { id: "student", nome: "Estudante" }],
};

test("agrupa brunch e combos por horário, com total antes do nome, composição e totais do dia", () => {
  const summary = montarResumoDiarioReservas("2026-10-09", [
    document({
      nome: "Maria Souza",
      horario: "11:00",
      participantes: 4,
      participantesPorTipo: { adult: 3, child: 1 }, pacoteIds: ["brunch"],
      atividade: "Brunch Gastronômico",
    }, "maria"),
    document({
      nome: "João Lima",
      horario: "09:00",
      participantes: 3,
      participantesPorTipo: { adult: 2, child: 1 }, pacoteIds: ["brunch"],
      atividade: "Brunch Gastronômico",
    }, "joao"),
    document({
      nome: "Ana Costa",
      horario: "13:00",
      participantes: 4,
      participantesPorTipo: { adult: 2, senior: 1, free: 1 }, pacoteIds: ["brunch", "trilha"],
      atividade: "Brunch Gastronômico + Trilha Ecológica (Combo: Pacote Brunch + Trilha - Adulto R$ 160)",
    }, "ana"),
  ], catalog);

  assert.match(summary, /^🌿 \*BRUNCH · VAGAFOGO\*/);
  assert.match(summary, /09\/10\/2026/);
  assert.match(summary, /\*09h\*/);
  assert.match(summary, /👥 3 pessoas — João Lima\n\s*↳ 2 adultos \+ 1 criança/);
  assert.match(summary, /👥 4 pessoas — Maria Souza\n\s*↳ 3 adultos \+ 1 criança/);
  assert.match(summary, /👥 4 pessoas — Ana Costa/);
  assert.match(summary, /Total do horário: 3 pessoas/);
  assert.match(summary, /TOTAL DO DIA: 11 PESSOAS/);
  assert.ok(summary.indexOf("*09h*") < summary.indexOf("*11h*"));
  assert.ok(summary.indexOf("*11h*") < summary.indexOf("*13h*"));
});

test("aviso individual exige reserva criada e paga hoje para visita hoje", () => {
  const today = "2026-10-16";
  const base = { origem: "checkout", canalOrigem: "site", data: today, confirmada: true, status: "pago", telefone: "5562999999999" };
  assert.equal(reservaElegivelParaAvisoEquipe(base, today, new Date("2026-10-16T12:00:00Z")), true);
  assert.equal(reservaElegivelParaAvisoEquipe({ ...base, status: "aguardando", confirmada: false }, today, new Date("2026-10-16T12:00:00Z")), false);
  assert.equal(reservaElegivelParaAvisoEquipe(base, today, new Date("2026-10-15T12:00:00Z")), false);
  assert.equal(reservaElegivelParaAvisoEquipe({ ...base, data: "2026-10-17" }, today, new Date("2026-10-16T12:00:00Z")), false);
});

test("aviso remove codigo de modelo antigo e usa status atualizado", () => {
  const template = "🌿 Reserva para hoje\nCódigo: {id}\nCliente: {nome}\nStatus: {status}";
  const message = montarAvisoNovaReservaEquipe(template, { reservaId: "segredo", nome: "Panajiota", statusReserva: "pago" });
  assert.doesNotMatch(message, /Código|segredo|\{id\}/);
  assert.match(message, /Cliente: Panajiota/);
  assert.match(message, /Status: pago/);
});

test("resumo usa todos os tipos por extenso e somente as pessoas do brunch em grupos mistos", () => {
  const summary = montarResumoDiarioReservasComDados("2026-11-28", [
    document({ nome: "Synthetic Guest", origem: "site", horario: "09:00", pacoteIds: ["brunch"],
      participantes: 14, participantesPorTipo: { adult: 2, senior: 1, bariatric: 2, child: 3, free: 4, student: 2 }, naoPagante: 4,
      idadesPorTipo: { child: [5, 7, 10], free: [0, 1, 2, 4] },
      telefone: "5562000000000", email: "PRIVATE_CONTACT@example.test", cpf: "PRIVATE_CPF", formaPagamento: "PRIVATE_PAYMENT", valor: 9876.54,
    }, "PRIVATE_ID_TYPED"),
    document({ nome: "Synthetic Mixed", horario: "14:00", participantes: 7, gruposParticipacao: [
      { tipo: "pacote", refId: "brunch", pacoteIds: ["brunch"], horario: "09:00", participantesPorTipo: { adult: 1, child: 1 }, participantes: 2 },
      { tipo: "pacote", refId: "trilha", pacoteIds: ["trilha"], horario: "14:00", participantesPorTipo: { adult: 5 }, participantes: 5 },
    ] }, "PRIVATE_ID_MIXED"),
    document({ nome: "Synthetic Trail Only", horario: "10:00", pacoteIds: ["trilha"], participantes: 20 }, "PRIVATE_ID_TRAIL"),
  ], catalog);
  assert.equal(summary.totalParticipantes, 16);
  assert.equal(summary.totalReservas, 2);
  assert.deepEqual(new Set(summary.reservaIds), new Set(["PRIVATE_ID_TYPED", "PRIVATE_ID_MIXED"]));
  assert.match(summary.mensagem, /👥 14 pessoas — Synthetic Guest/);
  for (const composition of [/2 adultos/, /1 idoso/, /2 pessoas bariátricas/, /3 crianças/, /4 não pagantes/, /2 × Estudante/]) assert.match(summary.mensagem, composition);
  assert.match(summary.mensagem, /👥 2 pessoas — Synthetic Mixed/);
  assert.match(summary.mensagem, /Total do horário: 16 pessoas/);
  assert.match(summary.mensagem, /TOTAL DO DIA: 16 PESSOAS/);
  assert.doesNotMatch(summary.mensagem, /PRIVATE_|5562000000000|9876|idades|\banos\b|Synthetic Trail Only|\*14h\*/i);
});

test("resumo longo respeita 3850 caracteres, avisa omissões e conserva totais e IDs completos", () => {
  const documents = Array.from({ length: 60 }, (_, index) => document({
    nome: `Synthetic Visitor ${String(index).padStart(2, "0")} ${"LongName".repeat(15)}`, horario: "09:00", pacoteIds: ["brunch"],
    participantes: 4, participantesPorTipo: { adult: 3, child: 1 },
  }, `PRIVATE_LONG_${index}`));
  const result = montarResumoDiarioReservasComDados("2026-11-28", documents, catalog);
  const shown = (result.mensagem.match(/^👥 /gm) || []).length;
  assert.ok(shown > 0 && shown < documents.length);
  assert.ok(result.mensagem.length <= 3850, `Message has ${result.mensagem.length} characters`);
  assert.match(result.mensagem, new RegExp(`📋 ${documents.length - shown} registro\\(s\\) não exibido\\(s\\)`));
  assert.match(result.mensagem, /Consulte a agenda completa no Admin/);
  assert.match(result.mensagem, /Total do horário: 240 pessoas/);
  assert.match(result.mensagem, /TOTAL DO DIA: 240 PESSOAS/);
  assert.equal(result.totalReservas, 60);
  assert.equal(result.totalParticipantes, 240);
  assert.deepEqual(new Set(result.reservaIds), new Set(documents.map((item) => item.id)), "Omitted rows remain covered by the summary deduplication metadata");
  assert.doesNotMatch(result.mensagem, /PRIVATE_LONG_/);
});

test("resumo sem brunch deixa a ausência explícita sem incluir trilha ou IDs", () => {
  const result = montarResumoDiarioReservasComDados("2026-11-28", [
    document({ nome: "Synthetic Trail", pacoteIds: ["trilha"], horario: "09:00", participantes: 9 }, "PRIVATE_TRAIL"),
  ], catalog);
  assert.deepEqual({ ids: result.reservaIds, reservas: result.totalReservas, participantes: result.totalParticipantes }, { ids: [], reservas: 0, participantes: 0 });
  assert.match(result.mensagem, /Nenhuma reserva de brunch confirmada para hoje/);
  assert.doesNotMatch(result.mensagem, /Synthetic Trail|PRIVATE_TRAIL/);
});

const today = "2026-11-28";
const clock = Date.parse("2026-11-28T12:00:00Z"); // 09:00 in Sao Paulo
const config = { avisoNovaReservaEquipeAtivo: true, resumoReservasEquipeAtivo: true, horarioResumoReservasEquipe: "07:30", avisoNovaReservaEquipeNumero: "5562000000000" };
const confirmed = (extra = {}) => ({ data: today, confirmada: true, status: "pago", origem: "site", horario: "09:00", pacoteIds: ["brunch"],
  nome: "Synthetic Brunch", participantes: 2, participantesPorTipo: { adult: 2 }, ...extra });
function morningFixture(t, reservations, extra = {}, at = clock, result = () => ({ enviado: true, messageId: "synthetic-message" })) {
  t.mock.timers.enable({ apis: ["Date"], now: at });
  const initial = { "configuracoes/whatsapp": config, ...extra };
  for (const [collection, items] of [["pacotes", catalog.pacotes], ["combos", catalog.combos], ["tipos_clientes", catalog.tiposClientes]]) {
    for (const { id, ...data } of items) initial[`${collection}/${id}`] = data;
  }
  for (const [id, data] of Object.entries(reservations)) initial[`reservas/${id}`] = data;
  const fixture = createAffiliateFirestore(initial);
  t.mock.method(firebaseAdmin, "obterFirestoreAdmin", () => fixture.db);
  t.mock.method(FieldValue, "serverTimestamp", () => new Date());
  t.mock.method(FieldValue, "delete", () => ({ operation: "delete" }));
  t.mock.method(Timestamp, "fromMillis", (milliseconds) => new Date(milliseconds));
  const calls = [];
  t.mock.method(sender, "enviarMensagemTransacionalPeloAgente", async (...args) => {
    calls.push(args);
    return result(calls.length);
  });
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Remote I/O is forbidden in morning-summary tests"); });
  return { ...fixture, calls, summary: () => fixture.records.get(`whatsapp_resumos_reservas_dia/${today}`) };
}

test("worker real usa catálogo, filtra data/status/brunch, envia o novo corpo sem variação e não repete", async (t) => {
  const reservations = {
    brunch: confirmed(),
    manual: confirmed({ nome: "Synthetic Manual", origem: "manual", criadaManualmente: true, participantesPorTipo: { adult: 1, child: 1 } }),
    combo: confirmed({ nome: "Synthetic Combo", atividade: "Brunch + Trilha", pacoteIds: ["brunch", "trilha"], comboId: "combo",
      horario: "14:00", horariosPorPacote: { brunch: "09:00", trilha: "14:00" }, participantesPorTipo: { adult: 1, senior: 1 } }),
    trail: confirmed({ nome: "Synthetic Trail", pacoteIds: ["trilha"] }),
    pending: confirmed({ nome: "Synthetic Pending", confirmada: false, status: "aguardando" }),
    cancelled: confirmed({ nome: "Synthetic Cancelled", status: "cancelado" }),
    unconfirmed: confirmed({ nome: "Synthetic Unconfirmed", confirmada: false }),
    tomorrow: confirmed({ nome: "Synthetic Tomorrow", data: "2026-11-29" }),
  };
  const fixture = morningFixture(t, reservations);
  await processarAvisosNovaReservaEquipe();
  assert.equal(fixture.calls.length, 1);
  const [destination, body, key, contactName, options] = fixture.calls[0];
  assert.equal(destination, "5562000000000");
  assert.equal(key, `resumo-reservas-dia:${today}:5562000000000`);
  assert.equal(contactName, undefined);
  assert.deepEqual(options, { dataLimite: today, tipoDisparo: "resumo_reservas_dia" });
  assert.equal(body, montarResumoDiarioReservas(today, ["brunch", "manual", "combo"].map((id) => document(reservations[id], id)), catalog));
  assert.match(body, /^🌿 \*BRUNCH · VAGAFOGO\*/);
  assert.doesNotMatch(body, /Agenda de reservas|Programação de reservas|Synthetic (?:Trail|Pending|Cancelled|Unconfirmed|Tomorrow)|\*14h\*/);
  assert.equal(fixture.summary().status, "enviado");
  assert.equal(fixture.summary().totalReservas, 3);
  assert.equal(fixture.summary().totalParticipantes, 6);
  assert.deepEqual(new Set(fixture.summary().reservaIds), new Set(["brunch", "manual", "combo"]));
  await processarAvisosNovaReservaEquipe();
  assert.equal(fixture.calls.length, 1);
});

test("deploy não reenvia nem reescreve o resumo que já foi enviado hoje no formato antigo", async (t) => {
  const previous = { status: "enviado", mensagem: "PREVIOUS_SENT_FORMAT", reservaIds: ["already-summarized"], tentativas: 1 };
  const fixture = morningFixture(t, { new: confirmed() }, { [`whatsapp_resumos_reservas_dia/${today}`]: previous });
  await processarAvisosNovaReservaEquipe();
  assert.equal(fixture.calls.length, 0);
  assert.deepEqual(fixture.summary(), previous);
});

test("falha simulada respeita backoff e reutiliza a chave e o corpo antes de marcar enviado", async (t) => {
  const fixture = morningFixture(t, { brunch: confirmed() }, {}, clock,
    (attempt) => attempt === 1 ? { enviado: false, motivo: "synthetic-provider-failure" } : { enviado: true, messageId: "synthetic-retry" });
  await processarAvisosNovaReservaEquipe();
  assert.equal(fixture.summary().status, "aguardando");
  assert.equal(fixture.summary().tentativas, 1);
  await processarAvisosNovaReservaEquipe();
  assert.equal(fixture.calls.length, 1);
  t.mock.timers.setTime(clock + 4 * 60_000);
  await processarAvisosNovaReservaEquipe();
  assert.equal(fixture.calls.length, 2);
  assert.equal(fixture.calls[1][2], fixture.calls[0][2]);
  assert.equal(fixture.calls[1][1], fixture.calls[0][1]);
  assert.equal(fixture.summary().status, "enviado");
  assert.equal(fixture.summary().tentativas, 2);
  await processarAvisosNovaReservaEquipe();
  assert.equal(fixture.calls.length, 2);
});

test("próximo horário agendado envia uma vez, sem antecipar o resumo", async (t) => {
  const fixture = morningFixture(t, { brunch: confirmed() }, {}, Date.parse("2026-11-28T10:29:00Z"));
  await processarAvisosNovaReservaEquipe();
  assert.equal(fixture.calls.length, 0);
  assert.equal(fixture.summary(), undefined);
  t.mock.timers.setTime(Date.parse("2026-11-28T10:30:00Z"));
  await processarAvisosNovaReservaEquipe();
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.summary().status, "enviado");
});
