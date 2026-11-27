const test = require("node:test");
const assert = require("node:assert/strict");
const { Timestamp } = require("firebase-admin/firestore");
const { affiliateHash } = require("../dist/services/affiliates");
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

function setup(t, { paymentStatus = "PENDING", failAfterCreate = false, qrFailures = 0 } = {}) {
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
    if (/^\/v3\/payments\/pay_[A-Za-z0-9_]+$/.test(url.pathname)) {
      const payment = fixture.providerPayments.find((item) => item.id === url.pathname.split('/').at(-1));
      return payment ? json(payment) : json({ error: 'not_found' }, 404);
    }
    if (url.pathname === "/v3/customers") return json({ data: [{ id: "cus_mock" }] });
    if (/\/pixQrCode$/.test(url.pathname)) {
      if (qrFailures-- > 0) return json({ error: "mock_qr_unavailable" }, 503);
      return json({ payload: "mock-pix-copy-paste", encodedImage: "bW9jay1pbWFnZQ==", expirationDate: "2099-08-09" });
    }
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

function affiliateSeed(t, memory) {
  const previous = process.env.AFFILIATES_ENABLED;
  process.env.AFFILIATES_ENABLED = 'true';
  t.after(() => { if (previous === undefined) delete process.env.AFFILIATES_ENABLED; else process.env.AFFILIATES_ENABLED = previous; });
  const context = 'A'.repeat(43);
  memory.rows.set('affiliate_agencies/agency-one', { name: 'Agency One', status: 'active', commissionRule: { mode: 'percent', value: 10 } });
  memory.rows.set('affiliate_partners/partner-one', { name: 'Partner One', status: 'active', agencyId: 'agency-one' });
  memory.rows.set('affiliate_links/partner-one', { status: 'active', partnerId: 'partner-one', agencyId: 'agency-one' });
  memory.rows.set('_affiliate_contexts/' + affiliateHash(context), { linkId: 'partner-one', partnerId: 'partner-one', agencyId: 'agency-one',
    capturedAt: Timestamp.now(), expiresAt: Timestamp.fromMillis(Date.now() + 86400000) });
  return context;
}

test('indicação Pix congela regra e proprietário; body adulterado e retry não mudam origem', async (t) => {
  const memory = setup(t);
  const affiliateContextToken = affiliateSeed(t, memory);
  const body = checkout({ affiliateContextToken, commercialAttribution: { agencyId: 'ATTACKER', commissionRule: { mode: 'percent', value: 100 } } });
  const response = await charge(body);
  assert.equal(response.statusCode, 200);
  const raw = memory.value('reservas/' + response.body.reservaId);
  assert.equal(raw.commercialAttribution.agencyId, 'agency-one');
  assert.deepEqual(raw.commercialAttribution.commissionRule, { mode: 'percent', value: 10 });
  memory.rows.get('affiliate_agencies/agency-one').commissionRule = { mode: 'fixed', value: 99 };
  const retry = await charge(body);
  assert.deepEqual(retry.body, response.body);
  assert.equal(memory.providerPosts.length, 1);
  assert.deepEqual(memory.value('reservas/' + response.body.reservaId).commercialAttribution, raw.commercialAttribution);
});

test('cartão conserva indicação server-side no handoff e rejeita troca pelo navegador', async (t) => {
  const memory = setup(t, { paymentStatus: 'CONFIRMED' });
  const affiliateContextToken = affiliateSeed(t, memory);
  const link = await agent.criarLinkCartaoAgente(draft({ affiliateContextToken }));
  const token = new URL(link.url).searchParams.get('agent_checkout');
  assert.equal((await agent.obterCheckoutAgente(token)).affiliateContextToken, affiliateContextToken);
  const publicPayload = await agent.obterCheckoutAgentePublico(token);
  assert.ok(!('affiliateContextToken' in publicPayload));
  assert.ok(!('commercialAttribution' in publicPayload));
  assert.ok(!JSON.stringify(publicPayload).includes('commissionRule'));
  const body = checkout({ agentCheckoutToken: token, billingType: 'CREDIT_CARD',
    creditCard: { holderName: 'CLIENTE TESTE', number: '4111111111111111', expiryMonth: '12', expiryYear: '2099', ccv: '123' },
    creditCardHolderInfo: { postalCode: '70000000', address: 'Rua de Teste', addressNumber: '1', province: 'Centro', city: 'Brasília', state: 'DF' } });
  const rejected = await charge({ ...body, affiliateContextToken: 'B'.repeat(43) });
  assert.equal(rejected.statusCode, 400); assert.equal(memory.providerPosts.length, 0);
  const accepted = await charge(body);
  assert.equal(accepted.statusCode, 200);
  assert.equal(memory.value('reservas/' + accepted.body.reservaId).commercialAttribution.partnerId, 'partner-one');
  assert.equal(memory.value('_affiliate_payment_evidence/' + accepted.body.reservaId).state, 'paid');
});

test('reconciliação de Pix mantém snapshot original mesmo com contexto expirado e nova regra', async (t) => {
  const memory = setup(t, { failAfterCreate: true });
  const affiliateContextToken = affiliateSeed(t, memory);
  const body = checkout({ affiliateContextToken });
  const first = await charge(body);
  assert.equal(first.statusCode, 500);
  const attemptPath = [...memory.rows.keys()].find((path) => path.startsWith('_payment_idempotency/'));
  const attempt = memory.rows.get(attemptPath);
  memory.rows.set(attemptPath, { ...attempt, leaseExpiresAt: Timestamp.fromMillis(0) });
  const original = memory.value('reservas/' + attempt.reservaId).commercialAttribution;
  memory.rows.get('_affiliate_contexts/' + affiliateHash(affiliateContextToken)).expiresAt = Timestamp.fromMillis(0);
  memory.rows.get('affiliate_agencies/agency-one').commissionRule = { mode: 'fixed', value: 99 };
  const retry = await charge(body);
  assert.equal(retry.statusCode, 200); assert.equal(memory.providerPosts.length, 1);
  assert.deepEqual(memory.value('reservas/' + attempt.reservaId).commercialAttribution, original);
});

test('webhook afiliado não confia em pago forjado; confirma e estorna consultando provedor', async (t) => {
  const memory = setup(t);
  const affiliateContextToken = affiliateSeed(t, memory);
  const response = await charge(checkout({ affiliateContextToken }));
  const id = response.body.reservaId;
  const payload = { event: 'PAYMENT_RECEIVED', payment: { id: response.body.cobranca.id, externalReference: id, billingType: 'PIX', status: 'RECEIVED' } };
  await processarWebhookPagamento(payload);
  assert.equal(memory.value('reservas/' + id).status, 'aguardando');
  assert.equal(memory.value('_affiliate_payment_evidence/' + id), undefined);
  memory.providerPayments[0].status = 'RECEIVED';
  await processarWebhookPagamento(payload);
  assert.equal(memory.value('reservas/' + id).status, 'pago');
  assert.equal(memory.value('_affiliate_payment_evidence/' + id).state, 'paid');
  memory.providerPayments[0].status = 'REFUNDED';
  await processarWebhookPagamento({ ...payload, event: 'PAYMENT_REFUNDED' });
  assert.equal(memory.value('reservas/' + id).status, 'estornado');
  assert.equal(memory.value('_affiliate_payment_evidence/' + id).state, 'cancelled');
  await processarWebhookPagamento(payload);
  assert.equal(memory.value('reservas/' + id).status, 'estornado');
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

const staleOfferChanges = [
  ["pacote desativado", (memory) => memory.rows.set("pacotes/brunch", { ...SEED["pacotes/brunch"], ativo: false })],
  ["pacote removido", (memory) => memory.rows.delete("pacotes/brunch")],
  ["data bloqueada no pacote", (memory) => memory.rows.set("pacotes/brunch", { ...SEED["pacotes/brunch"], datasBloqueadas: [DATE] })],
  ["dia da semana desabilitado", (memory) => memory.rows.set("pacotes/brunch", { ...SEED["pacotes/brunch"], dias: [(new Date(DATE + "T12:00:00Z").getUTCDay() + 1) % 7] })],
  ["horário bloqueado com limite ilimitado", (memory) => {
    memory.rows.set("pacotes/brunch", { ...SEED["pacotes/brunch"], limite: 0 });
    memory.rows.set("disponibilidade/" + DATE, { horarios: { [DATE + "-brunch-10:00"]: false } });
  }],
];
for (const [name, change] of staleOfferChanges) {
  test("checkout revalida " + name + " depois da cotação", async (t) => {
    const memory = setup(t);
    assert.equal((await agent.simularReservaAgente(draft())).prontoParaPagamento, true);
    change(memory);
    const response = await charge(checkout());
    assert.equal(response.statusCode, 400);
    assert.equal(memory.providerPosts.length, 0);
  });
}

test("novo cartão reutiliza token legível mas expiração e adulteração não liberam dados", async (t) => {
  const memory = setup(t);
  const link = await agent.criarLinkCartaoAgente(draft());
  const token = new URL(link.url).searchParams.get("agent_checkout");
  const first = await agent.obterCheckoutAgente(token);
  assert.deepEqual(await agent.obterCheckoutAgente(token), first);
  assert.equal(memory.providerPosts.length, 0);
  const tampered = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
  await assert.rejects(agent.obterCheckoutAgente(tampered), /CHECKOUT_NOT_FOUND/);
});

for (const status of ["cancelado", "cancelada", "refunded", "estornado", "chargeback"]) {
  test("webhook atrasado não reativa reserva " + status, async (t) => {
    const memory = setup(t);
    const response = await charge(checkout());
    const path = "reservas/" + response.body.reservaId;
    memory.rows.set(path, { ...memory.value(path), status, confirmada: false });
    await processarWebhookPagamento({ event: "PAYMENT_RECEIVED", payment: {
      id: response.body.cobranca.id, externalReference: response.body.reservaId, billingType: "PIX", status: "RECEIVED",
    } });
    assert.equal(memory.value(path).status, status);
    assert.equal(memory.gatewayMessages.length, 0);
  });
}

test("a mesma tentativa PIX simultânea não duplica reserva nem cobrança", async (t) => {
  const memory = setup(t);
  const responses = await Promise.all(Array.from({ length: 4 }, () => charge(checkout())));
  assert.ok(responses.every((response) => response.statusCode === 200));
  assert.ok(responses.every((response) => response.body.reservaId === responses[0].body.reservaId));
  assert.equal(memory.providerPosts.length, 1);
});

test("mudança de participantes e oferta invalida o resumo e o PIX do rascunho anterior", async (t) => {
  setup(t);
  const input = draft({ reservaId: "old-reservation", pagamentoId: "old-payment", pixLinkVagafogo: "https://vagafogo.com.br/reservar?old", pixCopiaCola: "old-pix" });
  await agent.salvarRascunhoReservaAgente(input);
  const changed = await agent.salvarRascunhoReservaAgente({
    sessionId: input.sessionId, telefone: PHONE,
    ofertaId: "trilha", participantesPorTipo: { ...PEOPLE, crianca: 1 }, idadesPorTipo: { crianca: [6], isento: [0] },
  });
  assert.equal(changed.dados.confirmouResumo, false);
  assert.equal(changed.dados.pagamentoId, undefined);
  assert.equal(changed.dados.pixCopiaCola, undefined);
  assert.equal(changed.dados.reservaId, undefined);
});

test("checkout novo não cobra uma data de visita passada ou impossível", async (t) => {
  const memory = setup(t);
  for (const data of ["2020-01-01", "2099-02-31", "2099-99-01", "10/08/2099"]) {
    const response = await charge(checkout({ data }), "date-check-" + data.replace(/\//g, "-"));
    assert.equal(response.statusCode, 400);
  }
  assert.equal(memory.providerPosts.length, 0);
});

test("idade malformada nova não reaproveita silenciosamente idade antiga do rascunho", async (t) => {
  setup(t);
  await agent.salvarRascunhoReservaAgente(draft());
  await assert.rejects(agent.salvarRascunhoReservaAgente({
    sessionId: "whatsapp_" + PHONE, telefone: PHONE, idadesPorTipo: { crianca: [6.5, 10] },
  }), /PARTICIPANT_AGES_INVALID/);
});

test("link PIX recupera QR temporariamente indisponível sem criar outra cobrança", async (t) => {
  const memory = setup(t, { qrFailures: 1 });
  const response = await charge(checkout());
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.cobranca.pixKey, undefined);
  const link = await agent.criarLinkPixExistenteAgente({
    reservaId: response.body.reservaId, paymentId: response.body.cobranca.id, telefone: PHONE,
  });
  assert.equal(link.pixKey, "mock-pix-copy-paste");
  assert.match(link.qrCodeImage, /^data:image\/png;base64,/);
  assert.equal(memory.providerPosts.length, 1);
});

const cardCheckout = (agentCheckoutToken) => checkout({
  billingType: "CREDIT_CARD",
  agentCheckoutToken,
  creditCard: { holderName: "CLIENTE TESTE", number: "4111111111111111", expiryMonth: "12", expiryYear: "2099", ccv: "123" },
  creditCardHolderInfo: { postalCode: "70000000", address: "Rua de Teste", addressNumber: "1", province: "Centro", city: "Brasília", state: "DF" },
});

test("mesmo link de cartão recarregado deduplica no servidor mesmo com header novo", async (t) => {
  const memory = setup(t);
  const link = await agent.criarLinkCartaoAgente(draft());
  const token = new URL(link.url).searchParams.get("agent_checkout");
  const bootstrap = await agent.obterCheckoutAgente(token);
  assert.equal(bootstrap.checkoutToken, token);
  const first = await charge(cardCheckout(token), "browser-before-reload");
  const refreshed = await agent.obterCheckoutAgente(token);
  assert.equal(refreshed.paymentIdempotencyKey, bootstrap.paymentIdempotencyKey);
  const repeated = await charge(cardCheckout(token), "browser-after-reload");
  assert.equal(first.statusCode, 200);
  assert.deepEqual(repeated.body, first.body);
  assert.equal(repeated.headers["Idempotent-Replayed"], "true");
  assert.equal(memory.providerPosts.length, 1);
});

test("link expirado ou adulterado não cria pagamento e trocar o método não recobra tentativa anterior", async (t) => {
  const memory = setup(t);
  const link = await agent.criarLinkCartaoAgente(draft());
  const token = new URL(link.url).searchParams.get("agent_checkout");
  const pix = await charge(checkout({ agentCheckoutToken: token }));
  assert.equal(pix.statusCode, 200);
  const card = await charge(cardCheckout(token), "new-browser-payment");
  assert.equal(card.statusCode, 409);
  assert.equal(card.body.code, "IDEMPOTENCY_KEY_REUSED");
  assert.match(card.body.error, /novo link/);
  const changed = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
  assert.equal((await charge(cardCheckout(changed))).statusCode, 400);
  const path = [...memory.rows.keys()].find((key) => key.startsWith("crm_agente_checkout_handoffs/"));
  memory.rows.set(path, { ...memory.rows.get(path), expiraEm: Timestamp.fromMillis(1) });
  assert.equal((await charge(cardCheckout(token))).statusCode, 410);
  assert.equal(memory.providerPosts.length, 1);
});

test("recusa definitiva no link de cartão orienta nova tentativa sem cobrança duplicada", async (t) => {
  const memory = setup(t, { paymentStatus: "DECLINED" });
  const link = await agent.criarLinkCartaoAgente(draft());
  const token = new URL(link.url).searchParams.get("agent_checkout");
  const first = await charge(cardCheckout(token));
  assert.equal(first.statusCode, 400);
  assert.match(first.body.error, /novo link ao atendimento/);
  const repeat = await charge(cardCheckout(token), "browser-after-decline");
  assert.deepEqual(repeat.body, first.body);
  assert.equal(memory.providerPosts.length, 1);
});

test("correção do rascunho não perde a associação de uma reserva já paga", async (t) => {
  const memory = setup(t);
  const input = draft({ reservaId: "paid-reservation", pagamentoId: "paid-payment" });
  memory.rows.set("reservas/paid-reservation", { status: "pago", confirmada: true });
  await agent.salvarRascunhoReservaAgente(input);
  const changed = await agent.salvarRascunhoReservaAgente({
    sessionId: input.sessionId, telefone: PHONE, participantesPorTipo: { ...PEOPLE, crianca: 1 },
  });
  assert.equal(changed.dados.reservaId, "paid-reservation");
  assert.equal(changed.dados.pagamentoId, "paid-payment");
});

test("resposta automática não satisfaz pergunta obrigatória; resposta coletada continua válida", async (t) => {
  const memory = setup(t);
  memory.rows.set("pacotes/brunch", { ...SEED["pacotes/brunch"], perguntasPersonalizadas: [
    { id: "restricao", pergunta: "Há alguma restrição alimentar?", tipo: "sim_nao", obrigatoria: true },
  ] });
  const answer = { pacoteId: "brunch", perguntaId: "restricao", resposta: "nao" };
  const automatic = await agent.simularReservaAgente(draft({ perguntasPersonalizadas: [{ ...answer, respostaAutomatica: true }] }));
  assert.equal(automatic.prontoParaPagamento, false);
  assert.match(JSON.stringify(automatic.requisitosPendentes), /Responda a pergunta obrigatoria/);
  const collected = await agent.simularReservaAgente(draft({ perguntasPersonalizadas: [{ ...answer, respostaAutomatica: false }] }));
  assert.equal(collected.prontoParaPagamento, true);
  assert.equal(memory.providerPosts.length, 0);
});

test("resposta condicional automática é considerada não coletada sem descartar a resposta principal real", async (t) => {
  const memory = setup(t);
  memory.rows.set("pacotes/brunch", { ...SEED["pacotes/brunch"], perguntasPersonalizadas: [
    { id: "restricao", pergunta: "Há alguma restrição alimentar?", tipo: "sim_nao", obrigatoria: true,
      perguntaCondicional: { pergunta: "Informe a restrição", tipo: "texto", obrigatoria: true, condicao: "sim" } },
  ] });
  const answer = { pacoteId: "brunch", perguntaId: "restricao", resposta: "sim",
    perguntaCondicional: { resposta: "Não coletado", respostaAutomatica: true } };
  const automatic = await agent.simularReservaAgente(draft({ perguntasPersonalizadas: [answer] }));
  assert.equal(automatic.prontoParaPagamento, false);
  assert.equal(automatic.requisitosPendentes.length, 1);
  assert.match(automatic.requisitosPendentes[0], /pergunta complementar/);
  const collected = await agent.simularReservaAgente(draft({ perguntasPersonalizadas: [{ ...answer,
    perguntaCondicional: { resposta: "Sem lactose", respostaAutomatica: false } }] }));
  assert.equal(collected.prontoParaPagamento, true);
});

test("rascunho e handoff não transportam respostas automáticas como declarações reais", async (t) => {
  const memory = setup(t);
  const input = draft({ perguntasPersonalizadas: [
    { pacoteId: "brunch", perguntaId: "automatica", resposta: "sim", respostaAutomatica: true },
    { pacoteId: "brunch", perguntaId: "principal-real", resposta: "sim", perguntaCondicional: { resposta: "Não coletado", respostaAutomatica: true } },
    { pacoteId: "brunch", perguntaId: "coletada", resposta: "nao", perguntaCondicional: { resposta: "Texto real", respostaAutomatica: false } },
  ] });
  const original = structuredClone(input);
  const saved = await agent.salvarRascunhoReservaAgente(input);
  const link = await agent.criarLinkCartaoAgente(input);
  const handoff = await agent.obterCheckoutAgente(new URL(link.url).searchParams.get("agent_checkout"));
  const expected = [
    { pacoteId: "brunch", perguntaId: "principal-real", resposta: "sim" },
    { pacoteId: "brunch", perguntaId: "coletada", resposta: "nao", perguntaCondicional: { resposta: "Texto real" } },
  ];
  assert.deepEqual(saved.dados.perguntasPersonalizadas, expected);
  assert.deepEqual(handoff.perguntasPersonalizadas, expected);
  assert.deepEqual(handoff.participantesPorTipo, PEOPLE); assert.deepEqual(handoff.idadesPorTipo, AGES);
  assert.deepEqual(input, original); assert.equal(memory.providerPosts.length, 0);
});

const confirmedReservationWithAnswers = (answers) => ({
  ...checkout(), status: "pago", confirmada: true, origem: "checkout", perguntasPersonalizadas: answers,
});
test("confirmação ignora sim e não automáticos de mesa e ainda pergunta a preferência ao visitante", async (t) => {
  const memory = setup(t);
  for (const response of ["sim", "nao"]) {
    const id = "automatic-table-" + response;
    const answers = [{ pacoteId: "brunch", perguntaId: "mesa", pergunta: "Deseja juntar mesa com outra reserva?", resposta: response,
      respostaAutomatica: true, perguntaCondicional: { resposta: "TITULAR AUTOMATICO" } }];
    memory.rows.set("reservas/" + id, confirmedReservationWithAnswers(answers));
    const result = await processarConfirmacaoReservaAgente(id);
    assert.equal(result.enviado, true);
    const text = memory.gatewayMessages.at(-1).text;
    assert.match(text, /Você quer sentar junto com alguém/);
    assert.doesNotMatch(text, /solicitada acomodação|TITULAR AUTOMATICO/);
    assert.deepEqual(memory.value("reservas/" + id).perguntasPersonalizadas, answers);
    assert.equal(memory.value("reservas/" + id).origem, "checkout");
  }
});

test("confirmação preserva pedido real de mesa mas não anuncia titular automático separado ou condicional", async (t) => {
  const memory = setup(t);
  const answers = [
    { pergunta: "Deseja juntar mesa com outra reserva?", resposta: "sim",
      perguntaCondicional: { resposta: "TITULAR CONDICIONAL AUTOMATICO", respostaAutomatica: true } },
    { pergunta: "Nome do titular da outra reserva", resposta: "TITULAR SEPARADO AUTOMATICO", respostaAutomatica: true },
  ];
  memory.rows.set("reservas/real-table-auto-owner", confirmedReservationWithAnswers(answers));
  assert.equal((await processarConfirmacaoReservaAgente("real-table-auto-owner")).enviado, true);
  const text = memory.gatewayMessages[0].text;
  assert.match(text, /Mesa: foi solicitada acomodação com outra reserva/);
  assert.doesNotMatch(text, /TITULAR|Você quer sentar junto com alguém/);
  assert.deepEqual(memory.value("reservas/real-table-auto-owner").perguntasPersonalizadas, answers);
});

test("confirmação continua anunciando titular e preferência de mesa realmente coletados", async (t) => {
  const memory = setup(t);
  memory.rows.set("reservas/real-table-owner", confirmedReservationWithAnswers([
    { pergunta: "Deseja juntar mesa com outra reserva?", resposta: "sim", respostaAutomatica: false,
      perguntaCondicional: { resposta: "Titular Real", respostaAutomatica: false } },
  ]));
  assert.equal((await processarConfirmacaoReservaAgente("real-table-owner")).enviado, true);
  assert.match(memory.gatewayMessages[0].text, /solicitada acomodação com a reserva de Titular Real/);
  assert.doesNotMatch(memory.gatewayMessages[0].text, /Você quer sentar junto com alguém/);
});
