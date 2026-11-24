const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const express = require('express');

// Execute current TypeScript services in memory. No build/dist refresh is needed.
require('ts-node').register({ project: path.join(__dirname, '../tsconfig.json'), transpileOnly: true, preferTsExts: true });
const { affiliateTraceabilityFixture } = require('./helpers/affiliateTraceabilityFixture');
let fixture = affiliateTraceabilityFixture({});
const replace = (id, exports) => {
  const filename = require.resolve(id);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
};
replace('firebase/firestore', new Proxy({}, { get: (_target, key) => fixture.firestore[key] }));
replace('../src/services/firebase', { db: {} });
replace('../src/services/emailReservas', { enviarEmailConfirmacaoReserva: async () => ({ enviado: false, motivo: 'LOCAL_TEST_NO_SEND' }) });
replace('../src/services/whatsappReservationAlerts', { enfileirarAvisoNovaReservaEquipe: async () => true });
replace('../src/services/whatsappReservationConfirmations', {
  enfileirarConfirmacaoReservaWhatsapp: async () => true,
  processarConfirmacaoReservaWhatsapp: async () => ({ enviado: false, motivo: 'LOCAL_TEST_NO_SEND' }),
});
replace('../src/services/whatsappCampaigns', { registrarResultadoCampanhaReserva: async () => true });
const firebaseAdmin = require('../src/services/firebaseAdmin');
const affiliates = require('../src/services/affiliates');
const affiliateRouter = require('../src/server/affiliates').default;
const { criarCobrancaHandler } = require('../src/services/assas');
const webhookRouter = require('../src/server/webhook').default;
const { registrarEventoJornada } = require('../src/services/crmJourneys');

const people = { adulto: 1, crianca: 2, isento: 1 };
const ages = { crianca: [6, 10], isento: [0] };
const date = '2099-08-10';
const tokenAgency = 'A'.repeat(43);
const tokenIndependent = 'I'.repeat(43);
const seed = () => ({
  'tipos_clientes/adulto': { nome: 'Adulto' },
  'tipos_clientes/crianca': { nome: 'Criança', idadeMinima: 6, idadeMaxima: 10 },
  'tipos_clientes/isento': { nome: 'Isento', idadeMinima: 0, idadeMaxima: 4 },
  'pacotes/brunch': { nome: 'Brunch', ativo: true, limite: 100, horarios: ['10:00'], precosPorTipo: { adulto: 100, crianca: 40, isento: 0 } },
  'affiliate_agencies/agency-a': { name: 'Agency Synthetic', status: 'active', commissionRule: { mode: 'percent', value: 10 } },
  'affiliate_agencies/agency-b': { name: 'Other Synthetic', status: 'active', commissionRule: null },
  'affiliate_partners/partner-a': { name: 'Partner Synthetic', agencyId: 'agency-a', status: 'active' },
  'affiliate_partners/independent': { name: 'Independent Synthetic', agencyId: null, status: 'active', commissionRule: { mode: 'fixed', value: 8.55 } },
  'affiliate_memberships/agency': { role: 'agency', agencyId: 'agency-a', status: 'active' },
  'affiliate_memberships/other-agency': { role: 'agency', agencyId: 'agency-b', status: 'active' },
  'affiliate_memberships/partner': { role: 'partner', agencyId: 'agency-a', partnerId: 'partner-a', status: 'active' },
  'affiliate_memberships/independent': { role: 'partner', agencyId: null, partnerId: 'independent', status: 'active' },
  'affiliate_links/partner-a': { partnerId: 'partner-a', agencyId: 'agency-a', token: tokenAgency, status: 'active' },
  'affiliate_links/independent': { partnerId: 'independent', agencyId: null, token: tokenIndependent, status: 'active' },
  ['_affiliate_link_tokens/' + affiliates.affiliateHash(tokenAgency)]: { linkId: 'partner-a', partnerId: 'partner-a', agencyId: 'agency-a' },
  ['_affiliate_link_tokens/' + affiliates.affiliateHash(tokenIndependent)]: { linkId: 'independent', partnerId: 'independent', agencyId: null },
});
const checkout = (context, method, sessionId) => ({
  nome: 'LOCAL SYNTHETIC CUSTOMER', email: 'synthetic@example.test', cpf: '52998224725', telefone: '5561999990000',
  atividade: 'Brunch', data: date, horario: '10:00', valor: 180, participantes: 4,
  adultos: 1, criancas: 2, naoPagante: 1, bariatrica: 0, participantesPorTipo: people, idadesPorTipo: ages,
  pacoteIds: ['brunch'], gruposParticipacao: [{ tipo: 'pacote', refId: 'brunch', nome: 'Brunch', pacoteIds: ['brunch'], participantesPorTipo: people, idadesPorTipo: ages, participantes: 4 }],
  billingType: method, affiliateContextToken: context,
  atribuicao: { sourceChannel: 'site', sourceDomain: 'vagafogo.com.br', sessionId },
  ...(method === 'CREDIT_CARD' ? {
    creditCard: { holderName: 'LOCAL SYNTHETIC', number: '4111111111111111', expiryMonth: '12', expiryYear: '2099', ccv: '123' },
    creditCardHolderInfo: { postalCode: '70000000', address: 'Synthetic', addressNumber: '1', province: 'Synthetic', city: 'Brasília', state: 'DF' },
  } : {}),
});
const fingerprint = (id) => createHash('sha256').update(id).digest('hex').slice(0, 16);
const waitFor = async (predicate) => {
  const until = Date.now() + 3000;
  while (!predicate()) {
    assert.ok(Date.now() < until, 'Local webhook queue must settle');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

test('traceability: link resolution → real checkout → verified webhook → scoped metrics → replay → refund', async (t) => {
  fixture = affiliateTraceabilityFixture(seed());
  const settings = ['AFFILIATES_ENABLED', 'ASAAS_API_KEY', 'ASAAS_WEBHOOK_AUTH_TOKEN'];
  const previous = Object.fromEntries(settings.map((key) => [key, process.env[key]]));
  Object.assign(process.env, { AFFILIATES_ENABLED: 'true', ASAAS_API_KEY: 'local-mock-only', ASAAS_WEBHOOK_AUTH_TOKEN: 'local-mock-webhook' });
  t.after(() => { for (const key of settings) { if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key]; } });
  // The product logs checkout contact data. This isolated evidence run never prints it.
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'warn', () => {});
  t.mock.method(firebaseAdmin, 'obterFirestoreAdmin', () => fixture.db);
  t.mock.method(firebaseAdmin, 'obterAuthAdmin', () => ({ verifyIdToken: async (token, revoked) => {
    assert.equal(revoked, true);
    assert.ok(['owner', 'agency', 'partner', 'independent', 'other-agency'].includes(token));
    return { uid: token, exp: Math.floor(Date.now() / 1000) + 3600, ...(token === 'owner' ? { admin: true } : {}) };
  } }));
  const provider = new Map();
  let chargePosts = 0, providerVerifications = 0;
  const originalFetch = global.fetch;
  let origin;
  t.mock.method(global, 'fetch', async (input, init = {}) => {
    const url = new URL(input);
    if (url.origin === origin) return originalFetch(input, init);
    assert.equal(url.origin, 'https://api.asaas.com', 'Unexpected external requests are rejected, never forwarded');
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    if (url.pathname === '/v3/customers') return json({ data: [{ id: 'cus_local_mock' }] });
    if (url.pathname === '/v3/payments' && init.method === 'POST') {
      const body = JSON.parse(init.body);
      const payment = { ...body, id: 'pay_trace_' + (++chargePosts), status: 'PENDING', invoiceUrl: 'https://example.test/mock-payment' };
      provider.set(payment.id, payment);
      return json(payment);
    }
    if (url.pathname === '/v3/payments') return json({ data: [...provider.values()].filter((item) => item.externalReference === url.searchParams.get('externalReference')) });
    if (url.pathname.endsWith('/pixQrCode')) return json({ payload: 'LOCAL_MOCK_PIX', encodedImage: 'bG9jYWw=', expirationDate: '2099-08-09' });
    if (/^\/v3\/payments\/pay_trace_\d+$/.test(url.pathname)) {
      providerVerifications++;
      return json(provider.get(url.pathname.split('/').at(-1)));
    }
    assert.fail('Unexpected mocked provider route: ' + url.pathname);
  });
  const app = express();
  app.use(express.json());
  app.use('/api/affiliates', affiliateRouter);
  app.post('/criar-cobranca', criarCobrancaHandler);
  app.use('/webhook', webhookRouter);
  // server/index.ts owns the outer limiter/parser; execute the same current domain
  // function here without starting the application or any background processors.
  app.post('/crm/jornadas/evento', async (req, res) => {
    try { res.json(await registrarEventoJornada(req.body)); }
    catch { res.status(503).json({ code: 'LOCAL_JOURNEY_REJECTED' }); }
  });
  const server = await new Promise((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  origin = 'http://127.0.0.1:' + server.address().port;
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const request = async (route, { method = 'GET', actor, body, key, webhookToken = 'local-mock-webhook' } = {}) => {
    const response = await fetch(origin + route, { method, headers: {
      ...(actor ? { Authorization: 'Bearer ' + actor } : {}), ...(body ? { 'content-type': 'application/json' } : {}),
      ...(key ? { 'Idempotency-Key': key } : {}), ...(route === '/webhook' ? { 'asaas-access-token': webhookToken } : {}),
    }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, replayed: response.headers.get('Idempotent-Replayed'),
      body: response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text() };
  };
  const summary = async (actor, query = '') => {
    const result = await request('/api/affiliates/summary' + query, { actor });
    assert.equal(result.status, 200);
    return result.body;
  };
  const metrics = async () => Object.fromEntries(await Promise.all(['owner', 'agency', 'partner', 'independent', 'other-agency'].map(async (actor) => [actor, await summary(actor)])));
  const journeyPath = (session) => 'crm_jornadas/' + createHash('sha256').update('crm-journey:v1\0' + session).digest('hex');
  const journeyEvent = async (sessionId, evento, etapa, affiliateContextToken, extra = {}) => request('/crm/jornadas/evento', {
    method: 'POST', body: { sessionId, evento, etapa, affiliateContextToken, ...extra },
  });
  const evidence = { version: 1, generatedAt: new Date().toISOString(), runtime: 'TypeScript source via ts-node; real Express/domain handlers',
    execution: { firestore: 'in-memory shared Admin/Web SDK fixture', auth: 'mocked verified identities', provider: 'mocked Asaas, no forwarded request',
      ui: 'skipped', models: 'not called', outboundMessages: 'stubbed, not sent', realCharges: 0 }, scenarios: [], states: {}, checks: {} };
  const cases = [];
  for (const [label, referralToken, method, actor, partnerId, agencyId] of [
    ['agency-partner', tokenAgency, 'PIX', 'partner', 'partner-a', 'agency-a'],
    ['independent-partner', tokenIndependent, 'CREDIT_CARD', 'independent', 'independent', null],
  ]) {
    const panelLinks = await request('/api/affiliates/links?agencyId=agency-b&partnerId=forged', { actor });
    assert.equal(panelLinks.status, 200);
    assert.equal(panelLinks.body.items.length, 1);
    const linkToken = new URL(panelLinks.body.items[0].url).searchParams.get('ref');
    assert.equal(linkToken, referralToken);
    const resolved = await request('/api/affiliates/public/resolve', { method: 'POST', body: { referralToken: linkToken } });
    assert.equal(resolved.status, 200);
    const body = checkout(resolved.body.contextToken, method, 'traceability-' + label);
    if (label === 'agency-partner') {
      const journeySession = body.atribuicao.sessionId;
      assert.equal((await journeyEvent(journeySession, 'iniciou', 0, resolved.body.contextToken, {
        consentimentoRecuperacao: false,
        contato: { nome: 'LOCAL SYNTHETIC CUSTOMER', telefone: '5561999990000', email: 'synthetic@example.test' },
        affiliateAttribution: { agencyId: 'agency-b', partnerId: 'forged' },
      })).status, 200);
      assert.equal((await journeyEvent(journeySession, 'progresso', 2, resolved.body.contextToken)).status, 200);
      assert.equal((await journeyEvent(journeySession, 'saida', 2, resolved.body.contextToken)).status, 200);
      const recorded = fixture.value(journeyPath(journeySession));
      assert.equal(recorded.affiliateAttribution.partnerId, partnerId);
      assert.equal(recorded.affiliateAttribution.agencyId, agencyId);
      assert.equal(recorded.status, 'em_andamento');
      assert.equal(recorded.eventosContagem, 3);
      assert.equal([...fixture.rows.keys()].filter((key) => key.startsWith('crm_jornadas/')).length, 1);
      assert.equal([...fixture.rows.keys()].filter((key) => key.startsWith('reservas/')).length, 0);
      assert.equal((await summary('owner')).paidCount, 0);
      assert.doesNotMatch(JSON.stringify(recorded), /commission|LOCAL SYNTHETIC|5561999990000|synthetic@example/);
      evidence.checks.journeyEntryProgressExitWithoutReservationOrPaidInflation = true;
    }
    const key = 'local-traceability-' + label;
    const charge = await request('/criar-cobranca', { method: 'POST', body, key });
    assert.equal(charge.status, 200);
    const reservationId = charge.body.reservaId;
    const paymentId = charge.body.cobranca.id;
    const raw = fixture.value('reservas/' + reservationId);
    assert.equal(raw.commercialAttribution.partnerId, partnerId);
    assert.equal(raw.commercialAttribution.agencyId, agencyId);
    assert.equal(raw.status, 'aguardando');
    assert.deepEqual(raw.gruposParticipacao[0].idadesPorTipo, ages);
    await waitFor(() => fixture.value(journeyPath(body.atribuicao.sessionId))?.status === 'convertida');
    const completedJourney = fixture.value(journeyPath(body.atribuicao.sessionId));
    assert.equal(completedJourney.reservaId, reservationId);
    assert.equal(completedJourney.affiliateAttribution.partnerId, partnerId);
    assert.equal(completedJourney.affiliateAttribution.contextId, raw.commercialAttribution.contextId);
    assert.doesNotMatch(JSON.stringify(completedJourney.affiliateAttribution), /commission|cpf|telefone|email/);
    if (label === 'agency-partner') {
      // A later admin configuration must not reprice an already attributed sale.
      fixture.rows.get('affiliate_agencies/agency-a').commissionRule = { mode: 'percent', value: 99 };
    }
    const replay = await request('/criar-cobranca', { method: 'POST', body, key });
    assert.equal(replay.replayed, 'true');
    assert.deepEqual(replay.body, charge.body);
    cases.push({ label, actor, body, key, charge, reservationId, paymentId });
    evidence.scenarios.push({ label, paymentMethod: method, resolved: true, reservationFingerprint: fingerprint(reservationId),
      attribution: { partnerId, agencyId, beneficiary: raw.commercialAttribution.commissionBeneficiary, commissionRule: raw.commercialAttribution.commissionRule },
      checkoutRetryReused: true });
  }
  assert.equal(chargePosts, 2);
  evidence.states.pending = await metrics();
  assert.equal(evidence.states.pending.owner.paidCount, 0);
  assert.equal(evidence.states.pending.owner.pendingCount, 2);
  assert.equal(evidence.states.pending.owner.commission, 0);
  evidence.checks.createdJourneyConversionDistinctFromPaidConversion = true;
  const webhook = async (item, event = 'PAYMENT_CONFIRMED') => request('/webhook', { method: 'POST', body: {
    event, payment: { id: item.paymentId, externalReference: item.reservationId, billingType: item.body.billingType, status: 'CONFIRMED' },
  } });
  // A forged paid notification cannot replace the independent provider GET.
  assert.equal((await webhook(cases[0])).status, 200);
  await waitFor(() => providerVerifications >= 1);
  assert.equal((await summary('owner')).paidCount, 0);
  assert.equal(fixture.value('_affiliate_payment_evidence/' + cases[0].reservationId), undefined);
  for (const item of cases) {
    Object.assign(provider.get(item.paymentId), { status: 'CONFIRMED', confirmedDate: '2026-11-24' });
    await webhook(item);
    await waitFor(() => fixture.value('reservas/' + item.reservationId)?.status === 'pago');
  }
  evidence.states.paid = await metrics();
  assert.equal(evidence.states.paid.owner.paidCount, 2);
  assert.equal(evidence.states.paid.owner.revenue, 360);
  assert.equal(evidence.states.paid.owner.commission, 26.55);
  assert.deepEqual(await summary('owner', '?from=2026-11-24&to=2026-11-24'), evidence.states.paid.owner);
  assert.equal((await summary('owner', '?from=2026-11-23&to=2026-11-23')).paidCount, 0);
  assert.equal((await summary('owner', '?agencyId=agency-a')).commission, 18);
  assert.equal((await summary('owner', '?agencyId=null')).commission, 8.55);
  for (const actor of ['agency', 'partner', 'independent']) {
    assert.equal(evidence.states.paid[actor].paidCount, 1);
    assert.equal(evidence.states.paid[actor].revenue, 180);
    assert.equal('commission' in evidence.states.paid[actor], false);
    const report = await request('/api/affiliates/sales?agencyId=agency-b&partnerId=wrong-partner', { actor });
    assert.equal(report.status, 200);
    assert.equal(report.body.items.length, 1);
    const own = actor === 'independent' ? cases[1] : cases[0];
    assert.equal(report.body.items[0].id, own.reservationId);
    assert.doesNotMatch(JSON.stringify(report.body), /commission|LOCAL SYNTHETIC|cpf|telefone|email/);
  }
  assert.equal(evidence.states.paid['other-agency'].paidCount, 0);
  assert.equal((await request('/api/affiliates/sales')).status, 401);
  for (const item of cases) await webhook(item);
  await waitFor(() => providerVerifications >= 5);
  assert.deepEqual(await metrics(), evidence.states.paid);
  assert.equal(chargePosts, 2);
  assert.equal([...fixture.rows.keys()].filter((key) => key.startsWith('reservas/')).length, 2);
  evidence.checks = { ...evidence.checks, providerVerifiedBeforePaid: true, retriesCreateNoExtraChargeOrReservation: true,
    duplicateWebhooksDoNotDuplicateMetrics: true, crossTenantFiltersIgnored: true, commissionsAdminOnly: true, customerDataNotExposed: true,
    reportDateFiltersMatchProviderPaymentDay: true, adminCanSeparateAgencyAndIndependent: true, laterRuleChangeDoesNotRepriceSale: true };
  provider.get(cases[0].paymentId).status = 'REFUNDED';
  await webhook(cases[0], 'PAYMENT_REFUNDED');
  await waitFor(() => fixture.value('_affiliate_payment_evidence/' + cases[0].reservationId)?.state === 'cancelled');
  evidence.states.afterRefund = await metrics();
  assert.equal(evidence.states.afterRefund.owner.paidCount, 1);
  assert.equal(evidence.states.afterRefund.owner.cancelledCount, 1);
  assert.equal(evidence.states.afterRefund.owner.commission, 8.55);
  assert.equal(evidence.states.afterRefund.owner.revenue, 180);
  Object.assign(provider.get(cases[1].paymentId), { status: 'DELETED', deleted: true });
  await webhook(cases[1], 'PAYMENT_DELETED');
  await waitFor(() => fixture.value('_affiliate_payment_evidence/' + cases[1].reservationId)?.state === 'cancelled');
  evidence.states.afterCancellation = await metrics();
  assert.equal(evidence.states.afterCancellation.owner.paidCount, 0);
  assert.equal(evidence.states.afterCancellation.owner.cancelledCount, 2);
  assert.equal(evidence.states.afterCancellation.owner.commission, 0);
  assert.equal(evidence.states.afterCancellation.owner.revenue, 0);
  Object.assign(provider.get(cases[0].paymentId), { status: 'CONFIRMED' });
  await webhook(cases[0]);
  await waitFor(() => providerVerifications >= 8);
  assert.deepEqual(await metrics(), evidence.states.afterCancellation);
  evidence.checks.refundRemovesCommission = true;
  evidence.checks.cancellationRemovesCommission = true;
  evidence.checks.latePaidDoesNotReactivateRefund = true;
  const independentContext = cases[1].body.affiliateContextToken;
  const firstJourneySession = cases[0].body.atribuicao.sessionId;
  await journeyEvent(firstJourneySession, 'progresso', 1, independentContext);
  assert.equal(fixture.value(journeyPath(firstJourneySession)).affiliateAttribution.partnerId, 'partner-a');
  const abandonedSession = 'traceability-abandoned-no-checkout';
  await journeyEvent(abandonedSession, 'iniciou', 0, cases[0].body.affiliateContextToken);
  await journeyEvent(abandonedSession, 'saida', 1, cases[0].body.affiliateContextToken);
  const abandoned = fixture.value(journeyPath(abandonedSession));
  assert.equal(abandoned.status, 'em_andamento');
  assert.equal(abandoned.affiliateAttribution.partnerId, 'partner-a');
  assert.equal(abandoned.reservaId, undefined);
  assert.deepEqual(await metrics(), evidence.states.afterCancellation);
  const invalidSession = 'traceability-invalid-context';
  assert.equal((await journeyEvent(invalidSession, 'iniciou', 0, 'Z'.repeat(43))).status, 503);
  assert.equal(fixture.value(journeyPath(invalidSession)), undefined);
  const forgedSession = 'traceability-forged-client-fields';
  assert.equal((await journeyEvent(forgedSession, 'iniciou', 0, undefined, {
    affiliateAttribution: { agencyId: 'agency-b', partnerId: 'forged', commissionRule: { mode: 'percent', value: 100 } },
    atribuicao: { agencyId: 'agency-b', partnerId: 'forged' },
  })).status, 200);
  assert.equal(fixture.value(journeyPath(forgedSession)).affiliateAttribution, undefined);
  evidence.checks.firstJourneyAttributionPreserved = true;
  evidence.checks.abandonmentHasAttributionButNoReservationOrPaidMetric = true;
  evidence.checks.invalidJourneyContextRejectedBeforeWrite = true;
  evidence.checks.forgedJourneyOwnershipIgnored = true;
  const contexts = [...fixture.rows.keys()].filter((key) => key.startsWith('_affiliate_contexts/')).length;
  const journeys = [...fixture.rows.entries()].filter(([key]) => key.startsWith('crm_jornadas/')).map(([, value]) => value);
  evidence.funnelObservation = { resolvedContexts: contexts, generatedReservations: cases.length,
    genericJourneysMarkedConvertedAtAcceptedCharge: journeys.filter((row) => row.status === 'convertida').length,
    attributedAbandonedJourneysWithoutReservation: 1,
    paidConversionsUseProviderEvidence: true, journeyEventsInjectedLocallyWithoutUI: true,
    gaps: ['Affiliate summary has no visit or checkout-start counters/denominators.',
      'Resolved contexts are not unique visitor metrics.',
      'Generic CRM journey conversion is registered when a charge is accepted, including pending payments; it is not a paid-conversion metric.'],
    implemented: ['Journey entry/progress/exit retains a server-validated affiliate pointer without commission or non-consented contact data.',
      'Checkout completion joins the journey to its reservation even when the UI events were skipped.'] };
  evidence.provider = { mockedChargePosts: chargePosts, mockedVerificationGets: providerVerifications, forwardedExternalRequests: 0 };
  evidence.result = 'passed';
  const serialized = JSON.stringify(evidence, null, 2);
  assert.doesNotMatch(serialized, /52998224725|5561999990000|4111111111111111|synthetic@example|contextToken|referralToken|LOCAL SYNTHETIC/);
  const directory = path.resolve(__dirname, '../../output/testes-afiliados');
  fs.mkdirSync(directory, { recursive: true });
  const filename = 'rastreabilidade-backend-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
  fs.writeFileSync(path.join(directory, filename), serialized + '\n', { flag: 'wx' });
  t.diagnostic('Evidence: output/testes-afiliados/' + filename);
});
