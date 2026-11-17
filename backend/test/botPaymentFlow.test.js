const test = require("node:test");
const assert = require("node:assert/strict");
const { Timestamp } = require("firebase-admin/firestore");
const { reservationFlowFixture } = require("./helpers/reservationFlowFixture");

let fixture = reservationFlowFixture({});
const replaceModule = (id, exports) => {
  const filename = require.resolve(id);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
};
replaceModule("firebase/firestore", new Proxy({}, { get: (_target, key) => fixture.firestore[key] }));
replaceModule("../dist/services/firebase", { db: {} });
replaceModule("../dist/services/emailReservas", {
  enviarEmailConfirmacaoReserva: async (...args) => {
    fixture.emails.push(args);
    return { enviado: true };
  },
});
replaceModule("../dist/services/whatsappReservationAlerts", { enfileirarAvisoNovaReservaEquipe: async () => true });
replaceModule("../dist/services/whatsappReservationConfirmations", {
  enfileirarConfirmacaoReservaWhatsapp: async (id) => { fixture.siteConfirmations.push(id); return true; },
  processarConfirmacaoReservaWhatsapp: async () => ({ enviado: true }),
});
replaceModule("../dist/services/crmJourneys", { registrarConclusaoJornadaReserva: async () => true });
replaceModule("../dist/services/whatsappCampaigns", { registrarResultadoCampanhaReserva: async () => true });

const firebaseAdmin = require("../dist/services/firebaseAdmin");
const agent = require("../dist/services/agentReservationTools");
const { exigirIdadesReservaSite } = require("../dist/services/siteBookingAges");
const { criarCobrancaHandler } = require("../dist/services/assas");
const { processarWebhookPagamento, processarConfirmacaoReservaAgente } = require("../dist/server/webhook");
const gateway = require("../dist/services/agentGateway");

const PHONE = "5561999990000";
const DATE = "2099-08-10";
const AGES = { crianca: [6, 10], isento: [0] };
const PEOPLE = { adulto: 1, crianca: 2, isento: 1 };
const SEED = {
  "tipos_clientes/adulto": { nome: "Adulto" },
  "tipos_clientes/crianca": { nome: "Criança", idadeMinima: 6, idadeMaxima: 10 },
  "tipos_clientes/isento": { nome: "Isento", idadeMinima: 0, idadeMaxima: 4 },
  "pacotes/brunch": { nome: "Brunch", ativo: true, limite: 100, horarios: ["10:00"], precosPorTipo: { adulto: 100, crianca: 40, isento: 0 }, aceitaPet: true },
  "pacotes/trilha": { nome: "Trilha ecológica", ativo: true, limite: 100, modoHorario: "intervalo", horarioInicio: "09:00", horarioFim: "16:00", precosPorTipo: { adulto: 30, crianca: 15, isento: 0 } },
  "combos/combo": { nome: "Brunch + Trilha", ativo: true, pacoteIds: ["brunch", "trilha"], precosPorTipo: { adulto: 120, crianca: 50, isento: 0 } },
};

function setup(t, { paymentStatus = "PENDING", failAfterCreate = false } = {}) {
  fixture = Object.assign(reservationFlowFixture(SEED), {
    emails: [], siteConfirmations: [], gatewayMessages: [], providerPosts: [], providerPayments: [],
  });
  t.mock.method(firebaseAdmin, "obterFirestoreAdmin", () => fixture.db);
  t.mock.method(agent, "concluirLeadAgenteComReserva", async () => true);
  t.mock.method(gateway, "requestAgentService", async (service, route, options) => {
    assert.equal(service, "gateway");
    assert.equal(route, "/api/whatsapp/transactional-send");
    fixture.gatewayMessages.push(options.body);
    return { status: 200, contentType: "application/json", body: { ok: true, messageId: "mock-confirmation" } };
  });
  t.mock.method(global, "fetch", async (input, init = {}) => {
    const url = new URL(input);
    assert.equal(url.origin, "https://api.asaas.com", "all external requests are replaced");
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    if (url.pathname === "/v3/payments" && init.method === "POST") {
      const body = JSON.parse(init.body);
      fixture.providerPosts.push(body);
      const payment = { ...body, id: "pay_mock_" + fixture.providerPosts.length, status: paymentStatus, invoiceUrl: "https://sandbox.example/payment" };
      fixture.providerPayments.push(payment);
      if (failAfterCreate && fixture.providerPosts.length === 1) throw new Error("mock lost provider response");
      return json(payment);
    }
    if (url.pathname === "/v3/payments") {
      return json({ data: fixture.providerPayments.filter((payment) => payment.externalReference === url.searchParams.get("externalReference")) });
    }
    if (url.pathname === "/v3/customers") return json({ data: [{ id: "cus_mock" }] });
    if (/\/pixQrCode$/.test(url.pathname)) return json({ payload: "mock-pix-copy-paste", encodedImage: "bW9jay1pbWFnZQ==", expirationDate: "2099-08-09" });
    assert.fail("Unexpected provider route " + url.pathname);
  });
  const previousKey = process.env.ASAAS_API_KEY;
  process.env.ASAAS_API_KEY = "local-test-key";
  t.after(() => {
    if (previousKey === undefined) delete process.env.ASAAS_API_KEY;
    else process.env.ASAAS_API_KEY = previousKey;
  });
  return fixture;
}

const draft = (overrides = {}) => ({
  tipoOferta: "pacote", ofertaId: "brunch", pacoteId: "brunch", data: DATE, horario: "10:00",
  participantesPorTipo: PEOPLE, idadesPorTipo: AGES,
  nome: "Cliente Teste", email: "cliente@example.com", cpf: "52998224725", telefone: PHONE,
  confirmouResumo: true, temPet: false, sessionId: "whatsapp_" + PHONE,
  ...overrides,
});

const checkout = (overrides = {}) => ({
  ...draft(),
  valor: 180, atividade: "Brunch", participantes: 4,
  adultos: 1, criancas: 2, bariatrica: 0, naoPagante: 1,
  pacoteIds: ["brunch"],
  gruposParticipacao: [{ tipo: "pacote", refId: "brunch", nome: "Brunch", pacoteIds: ["brunch"], participantesPorTipo: PEOPLE, participantes: 4, idadesPorTipo: AGES }],
  billingType: "PIX",
  atribuicao: { sourceChannel: "whatsapp", agentSessionId: "whatsapp_" + PHONE, sessionId: "whatsapp_" + PHONE, utmMedium: "agente" },
  ...overrides,
});

async function charge(body, key = "mock-payment-attempt-001") {
  const response = {
    statusCode: 200,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    set(key, value) { this.headers[key] = value; return this; },
    json(body) { this.body = body; return this; },
  };
  await criarCobrancaHandler({
    body, get: () => key, ip: "127.0.0.1", socket: { remoteAddress: "127.0.0.1" },
  }, response);
  return response;
}

test("bot solicita a idade antes do resumo e rejeita faixa, quantidade e valores inválidos", async (t) => {
  setup(t);
  for (const idadesPorTipo of [undefined, { crianca: [6] }, { crianca: [5, 10], isento: [0] }, { crianca: [6.5, 10], isento: [0] }, { crianca: ["6", 10], isento: [0] }]) {
    const corrected = await exigirIdadesReservaSite({ step: "summary", draft: draft({ idadesPorTipo }) });
    assert.equal(corrected.ui.step, "participants");
    assert.match(corrected.resposta, /idade/);
    await assert.rejects(agent.criarLinkCartaoAgente(draft({ idadesPorTipo })), /AGENT_CHECKOUT_INCOMPLETE/);
    const invalid = await charge(checkout({ gruposParticipacao: [{ tipo: "pacote", refId: "brunch", nome: "Brunch", pacoteIds: ["brunch"], participantesPorTipo: PEOPLE, participantes: 4, idadesPorTipo }] }));
    assert.equal(invalid.statusCode, 400);
    assert.equal(invalid.body.code, "PARTICIPANT_AGES_INVALID");
  }
  assert.equal(await exigirIdadesReservaSite({ step: "summary", draft: draft() }), null);
  const legacy = await exigirIdadesReservaSite({ step: "contact", draft: { adultos: 1, criancas: 1 } });
  assert.equal(legacy.ui.step, "participants");
  assert.match(legacy.resposta, /idade/);
  assert.equal(fixture.providerPosts.length, 0);
  assert.equal([...fixture.rows.keys()].filter((key) => key.startsWith("reservas/")).length, 0);
});

test("PIX é criado com idades, QR e link oficial; repetição reutiliza a mesma cobrança", async (t) => {
  const memory = setup(t);
  const first = await charge(checkout());
  assert.equal(first.statusCode, 200);
  assert.equal(first.body.cobranca.pixKey, "mock-pix-copy-paste");
  assert.match(first.body.cobranca.qrCodeImage, /^data:image\/png;base64,/);
  const reservation = memory.value("reservas/" + first.body.reservaId);
  assert.equal(reservation.status, "aguardando");
  assert.equal(reservation.confirmada, false);
  assert.equal(reservation.participantes, 4);
  assert.deepEqual(reservation.gruposParticipacao[0].idadesPorTipo, AGES);
  const replay = await charge(checkout());
  assert.deepEqual(replay.body, first.body);
  assert.equal(replay.headers["Idempotent-Replayed"], "true");
  assert.equal(memory.providerPosts.length, 1);
  const official = await agent.criarLinkPixExistenteAgente({
    reservaId: first.body.reservaId, paymentId: first.body.cobranca.id, telefone: PHONE,
  });
  const link = new URL(official.url);
  assert.equal(link.origin, "https://vagafogo.com.br");
  const handoff = await agent.obterCheckoutAgente(link.searchParams.get("agent_checkout"));
  assert.equal(handoff.tipo, "pix_existente");
  assert.equal(handoff.paymentId, first.body.cobranca.id);
  assert.deepEqual(handoff.idadesPorTipo, AGES);
  assert.equal(memory.providerPosts.length, 1);
});

test("resposta PIX perdida é reconciliada sem duplicar pagamento", async (t) => {
  const memory = setup(t, { failAfterCreate: true });
  const first = await charge(checkout());
  assert.equal(first.statusCode, 500);
  const attemptPath = [...memory.rows.keys()].find((path) => path.startsWith("_payment_idempotency/"));
  const attempt = memory.rows.get(attemptPath);
  memory.rows.set(attemptPath, { ...attempt, leaseExpiresAt: Timestamp.fromMillis(0) });
  const retry = await charge(checkout());
  assert.equal(retry.statusCode, 200);
  assert.equal(memory.providerPosts.length, 1);
  assert.equal(retry.body.reservaId, attempt.reservaId);
  assert.equal(retry.body.cobranca.id, memory.providerPayments[0].id);
});

test("cartão exige idades, gera token oficial e finaliza reserva sem perder participantes", async (t) => {
  const memory = setup(t, { paymentStatus: "CONFIRMED" });
  const link = await agent.criarLinkCartaoAgente(draft());
  const url = new URL(link.url);
  assert.equal(url.origin, "https://vagafogo.com.br");
  const token = url.searchParams.get("agent_checkout");
  assert.match(token, /^[A-Za-z0-9_-]{40,80}$/);
  const payload = await agent.obterCheckoutAgente(token);
  assert.deepEqual(payload.idadesPorTipo, AGES);
  assert.equal(payload.valorValidado, 180);
  await assert.rejects(agent.obterCheckoutAgente("invalid"), /TOKEN_INVALID/);
  const response = await charge(checkout({
    billingType: "CREDIT_CARD",
    creditCard: { holderName: "CLIENTE TESTE", number: "4111111111111111", expiryMonth: "12", expiryYear: "2099", ccv: "123" },
    creditCardHolderInfo: { postalCode: "70000000", address: "Rua de Teste", addressNumber: "1", province: "Centro", city: "Brasília", state: "DF" },
  }));
  assert.equal(response.statusCode, 200);
  const saved = memory.value("reservas/" + response.body.reservaId);
  assert.equal(saved.status, "pago");
  assert.equal(saved.confirmada, true);
  assert.deepEqual(saved.gruposParticipacao[0].idadesPorTipo, AGES);
  assert.equal(saved.whatsappAgenteConfirmacaoPagamentoPendente, true);
  await processarConfirmacaoReservaAgente(response.body.reservaId);
  assert.equal(memory.gatewayMessages.length, 1);
  assert.match(memory.gatewayMessages[0].text, /6, 10 anos/);
  assert.match(memory.gatewayMessages[0].text, /0 anos/);
  assert.match(memory.gatewayMessages[0].text, /concluída com sucesso/);
});

test("webhook confirma PIX e envia confirmação uma vez preservando idades", async (t) => {
  const memory = setup(t);
  const response = await charge(checkout());
  const payload = { event: "PAYMENT_RECEIVED", payment: { id: response.body.cobranca.id, externalReference: response.body.reservaId, billingType: "PIX", status: "RECEIVED" } };
  await processarWebhookPagamento({ ...payload, payment: { ...payload.payment, id: "different-payment" } });
  assert.equal(memory.value("reservas/" + response.body.reservaId).status, "aguardando");
  await processarWebhookPagamento({ event: "PAYMENT_CREATED", payment: { ...payload.payment, status: "PENDING" } });
  assert.equal(memory.value("reservas/" + response.body.reservaId).status, "aguardando");
  assert.equal(memory.gatewayMessages.length, 0);
  await processarWebhookPagamento(payload);
  const saved = memory.value("reservas/" + response.body.reservaId);
  assert.equal(saved.status, "pago");
  assert.equal(saved.confirmada, true);
  assert.deepEqual(saved.gruposParticipacao[0].idadesPorTipo, AGES);
  assert.equal(memory.gatewayMessages.length, 1);
  assert.match(memory.gatewayMessages[0].text, /6, 10 anos/);
  const originalDate = Timestamp.fromMillis(1_700_000_000_000);
  memory.rows.set("reservas/" + response.body.reservaId, { ...saved, dataPagamento: originalDate });
  await processarWebhookPagamento(payload);
  assert.equal(memory.gatewayMessages.length, 1);
  assert.equal(memory.value("reservas/" + response.body.reservaId).dataPagamento.toMillis(), originalDate.toMillis());
});

test("brunch, trilha e combo aplicam a mesma exigência para site e WhatsApp", async (t) => {
  setup(t);
  const offers = [
    { tipoOferta: "pacote", ofertaId: "brunch", pacoteId: "brunch" },
    { tipoOferta: "pacote", ofertaId: "trilha", pacoteId: "trilha", horario: "" },
    { tipoOferta: "combo", ofertaId: "combo", comboId: "combo", horariosPorPacote: { brunch: "10:00" } },
  ];
  for (const sessionId of ["site_mock_flow", "whatsapp_" + PHONE]) {
    for (const offer of offers) {
      const input = draft({ ...offer, sessionId });
      const missing = await agent.simularReservaAgente({ ...input, idadesPorTipo: {} });
      assert.equal(missing.prontoParaPagamento, false);
      assert.equal(missing.requisitosPendentes.length, 2);
      const ready = await agent.simularReservaAgente(input);
      assert.equal(ready.prontoParaPagamento, true);
      const link = await agent.criarLinkCartaoAgente(input);
      const payload = await agent.obterCheckoutAgente(new URL(link.url).searchParams.get("agent_checkout"));
      assert.deepEqual(payload.idadesPorTipo, AGES);
      assert.equal(payload.tipoOferta, offer.tipoOferta);
      assert.equal(fixture.providerPosts.length, 0);
    }
  }
});

test("mudança da faixa etária após handoff impede nova cobrança com idade antiga", async (t) => {
  const memory = setup(t);
  const link = await agent.criarLinkCartaoAgente(draft());
  const payload = await agent.obterCheckoutAgente(new URL(link.url).searchParams.get("agent_checkout"));
  memory.rows.set("tipos_clientes/crianca", { ...SEED["tipos_clientes/crianca"], idadeMinima: 8 });
  const response = await charge(checkout());
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.code, "PARTICIPANT_AGES_INVALID");
  assert.equal(memory.providerPosts.length, 0);
  assert.deepEqual(payload.idadesPorTipo, AGES);
  const handoffPath = [...memory.rows.keys()].find((path) => path.startsWith("crm_agente_checkout_handoffs/"));
  const handoff = memory.rows.get(handoffPath);
  memory.rows.set(handoffPath, { ...handoff, expiraEm: Timestamp.fromMillis(1) });
  await assert.rejects(agent.obterCheckoutAgente(new URL(link.url).searchParams.get("agent_checkout")), /CHECKOUT_EXPIRED/);
});

test("pagamento recusado limpa a reserva provisória e replay não cria cobrança nova", async (t) => {
  const memory = setup(t, { paymentStatus: "DECLINED" });
  const response = await charge(checkout());
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.code, "PAYMENT_DECLINED");
  assert.equal([...memory.rows.keys()].filter((path) => path.startsWith("reservas/")).length, 0);
  assert.equal(memory.gatewayMessages.length, 0);
  const replay = await charge(checkout());
  assert.deepEqual(replay.body, response.body);
  assert.equal(memory.providerPosts.length, 1);
});

test("falha de confirmação mantém reserva paga e permite reenvio sem nova cobrança", async (t) => {
  const memory = setup(t);
  const response = await charge(checkout());
  gateway.requestAgentService.mock.mockImplementationOnce(async () => ({
    status: 502, contentType: "application/json", body: { error: "mock_gateway_unavailable" },
  }));
  const payload = { event: "PAYMENT_CONFIRMED", payment: { id: response.body.cobranca.id, externalReference: response.body.reservaId, billingType: "PIX", status: "CONFIRMED" } };
  await processarWebhookPagamento(payload);
  const path = "reservas/" + response.body.reservaId;
  const afterFailure = memory.value(path);
  assert.equal(afterFailure.status, "pago");
  assert.equal(afterFailure.confirmada, true);
  assert.equal(afterFailure.whatsappAgenteConfirmacaoPagamentoPendente, true);
  assert.equal(afterFailure.whatsappAgenteConfirmacaoPagamentoTentativas, 1);
  memory.rows.set(path, { ...afterFailure, whatsappAgenteConfirmacaoPagamentoProximaTentativaEm: Timestamp.fromMillis(0) });
  const retry = await processarConfirmacaoReservaAgente(response.body.reservaId);
  assert.equal(retry.enviado, true);
  assert.equal(memory.value(path).whatsappAgenteConfirmacaoPagamentoTentativas, 2);
  assert.equal(memory.value(path).whatsappAgenteConfirmacaoPagamentoPendente, false);
  assert.equal(memory.providerPosts.length, 1);
});

test("replay pago continua disponível quando sua própria reserva esgota a lotação", async (t) => {
  const memory = setup(t, { paymentStatus: "CONFIRMED" });
  memory.rows.set("pacotes/brunch", { ...SEED["pacotes/brunch"], limite: 4 });
  const initial = await charge(checkout());
  assert.equal(initial.statusCode, 200);
  const replay = await charge(checkout());
  assert.equal(replay.statusCode, 200);
  assert.deepEqual(replay.body, initial.body);
  assert.equal(memory.providerPosts.length, 1);
});
