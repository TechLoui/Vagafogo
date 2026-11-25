const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const express = require('express');
require('ts-node').register({ project: path.join(__dirname, '../tsconfig.json'), transpileOnly: true, preferTsExts: true });
const { affiliateTraceabilityFixture } = require('./helpers/affiliateTraceabilityFixture');
let fixture = affiliateTraceabilityFixture({});
const replace = (id, exports) => {
  const filename = require.resolve(id);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
};
replace('firebase/firestore', new Proxy({}, { get: (_target, key) => fixture.firestore[key] }));
replace('../src/services/firebase', { db: {} });
replace('../src/server/formulariosPublicos', express.Router());
replace('../src/server/formulariosAdmin', express.Router());
const admin = require('../src/services/firebaseAdmin');
const reporting = require('../src/services/affiliatesReferral');
const affiliateRouter = require('../src/server/affiliates').default;
const legacyRouter = require('../src/server/api').default;
const owner = { uid: 'owner', role: 'admin', agencyId: null, partnerId: null };
const independent = { uid: 'independent', role: 'partner', agencyId: null, partnerId: 'independent' };
const source = (partnerId = 'independent', agencyId = null) => ({
  version: 1, partnerId, partnerName: partnerId === 'independent' ? 'Parceiro Piri' : 'Parceiro da agência', agencyId,
  agencyName: agencyId ? 'Agência A' : null, bookedAt: '2026-11-25T12:00:00Z',
  commissionRule: { mode: 'percent', value: 10 }, commissionBeneficiary: agencyId ? 'agency' : 'partner', commissionBeneficiaryId: agencyId ?? partnerId,
});
const reservation = (extra = {}) => ({
  commercialAttribution: source(), criadoEm: new Date('2026-11-25T12:15:00Z'), status: 'pago', valor: 100,
  asaasPaymentId: 'pay_own', data: '2026-12-01', horario: '9:30', atividade: 'Brunch gastronômico', formaPagamento: 'PIX',
  participantes: 4, participantesPorTipo: { adult: 2, child: 1, free: 1 }, adultos: 2, criancas: 1, naoPagante: 1,
  nome: 'PRIVATE CUSTOMER', cpf: 'PRIVATE CPF', email: 'PRIVATE EMAIL', telefone: 'PRIVATE PHONE',
  idadesPorTipo: { child: [8], free: [2] }, perguntasPersonalizadas: [{ resposta: 'PRIVATE ANSWER' }],
  creditCard: { number: 'PRIVATE CARD', ccv: 'PRIVATE CVV' }, ...extra,
});
const paymentEvidence = (extra = {}) => ({ state: 'paid', paymentId: 'pay_own', value: 100, paidAt: new Date('2026-11-25T13:00:00Z'), paymentMethod: 'PIX', ...extra });
const OWN_PAID = '01-own-paid-00000000001', OWN_PENDING = '02-own-pending-00000001', OWN_CANCELLED = '03-own-cancelled-000001';
async function setup(t) {
  fixture = affiliateTraceabilityFixture({
    'affiliate_agencies/agency-a': { name: 'Agência A', status: 'active' },
    'affiliate_partners/partner-a': { name: 'Partner A', status: 'active', agencyId: 'agency-a' },
    'affiliate_partners/independent': { name: 'Parceiro Piri', status: 'active', agencyId: null },
    'affiliate_memberships/agency': { role: 'agency', agencyId: 'agency-a', status: 'active' },
    'affiliate_memberships/partner': { role: 'partner', agencyId: 'agency-a', partnerId: 'partner-a', status: 'active' },
    'affiliate_memberships/independent': { role: 'partner', agencyId: null, partnerId: 'independent', status: 'active' },
    ['reservas/' + OWN_PAID]: reservation(),
    ['reservas/' + OWN_PENDING]: reservation({ status: 'aguardando', atividade: 'Trilha Ecológica', formaPagamento: 'CREDIT_CARD' }),
    ['reservas/' + OWN_CANCELLED]: reservation({ status: 'estornado', formaPagamento: 'MANUAL' }),
    'reservas/99-foreign-000000000001': reservation({ atividade: 'Experiência privada outra agência', commercialAttribution: source('partner-a', 'agency-a') }),
    ['_affiliate_payment_evidence/' + OWN_PAID]: paymentEvidence(),
    '_affiliate_payment_evidence/99-foreign-000000000001': paymentEvidence(),
  });
  const previousFlag = process.env.AFFILIATES_ENABLED, previousAdmins = process.env.CRM_ADMIN_EMAILS;
  process.env.AFFILIATES_ENABLED = 'true'; process.env.CRM_ADMIN_EMAILS = 'owner@example.test';
  t.after(() => {
    if (previousFlag === undefined) delete process.env.AFFILIATES_ENABLED; else process.env.AFFILIATES_ENABLED = previousFlag;
    if (previousAdmins === undefined) delete process.env.CRM_ADMIN_EMAILS; else process.env.CRM_ADMIN_EMAILS = previousAdmins;
  });
  t.mock.method(admin, 'obterFirestoreAdmin', () => fixture.db);
  t.mock.method(admin, 'obterAuthAdmin', () => ({ verifyIdToken: async (token, revoked) => {
    assert.equal(revoked, true);
    if (!['owner', 'agency', 'partner', 'independent'].includes(token)) throw new Error('invalid mock token');
    return { uid: token, exp: Math.floor(Date.now()/1000) + 3600, ...(token === 'owner' ? { admin: true } : {}) };
  } }));
  const app = express(); app.use(express.json());
  app.use('/api/affiliates', affiliateRouter); app.use('/api', legacyRouter);
  const server = await new Promise((resolve) => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const request = async (route, token = 'independent', method = 'GET', body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${route}`, {
      method, headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  return { request, fixture };
}

test('own reservation DTO exposes real code/timestamps/method/visitors without customer or child PII', () => {
  const raw = reservation();
  const dto = reporting.affiliateSaleDto(OWN_PAID, raw, paymentEvidence(), independent);
  assert.equal(dto.reservationCode, OWN_PAID);
  assert.equal(dto.createdAt, '2026-11-25T12:15:00.000Z');
  assert.equal(dto.paidAt, '2026-11-25T13:00:00.000Z');
  assert.equal(dto.paymentMethod, 'PIX'); assert.equal(dto.time, '09:30'); assert.equal(dto.guestCount, 4);
  for (const hidden of ['nome', 'email', 'cpf', 'telefone', 'idadesPorTipo', 'participantesPorTipo', 'perguntasPersonalizadas', 'asaasPaymentId', 'creditCard', 'commission', 'commissionRule']) {
    assert.equal(hidden in dto, false, hidden);
  }
  assert.equal(JSON.stringify(dto).includes('PRIVATE'), false);
  assert.equal(reporting.affiliateSaleDto(OWN_PAID, raw, paymentEvidence(), owner).commission, 10);
});
test('method uses known provider evidence first; missing/unknown online or manual origin never invents manual payment', () => {
  assert.equal(reporting.affiliatePaymentMethod({ formaPagamento: 'CREDIT_CARD' }, { billingType: 'PIX' }), 'PIX');
  assert.equal(reporting.affiliatePaymentMethod({ formaPagamento: 'Cartão de crédito' }), 'CREDIT_CARD');
  assert.equal(reporting.affiliatePaymentMethod({ formaPagamento: 'MANUAL' }), 'MANUAL');
  for (const raw of [{}, { origem: 'manual', criadaManualmente: true }, { origem: 'checkout' }, { formaPagamento: 'BOLETO' }, { formaPagamento: true }]) {
    assert.equal(reporting.affiliatePaymentMethod(raw), null);
  }
});
test('visitor total includes mirrored non-paying people once and recovers grouped/legacy totals; missing data stays unknown', () => {
  assert.equal(reporting.affiliateGuestCount(reservation()), 4);
  assert.equal(reporting.affiliateGuestCount({ participantesPorTipo: { adult: 2, child: 1, free: 1 }, adultos: 2, criancas: 1, naoPagante: 1 }), 4);
  assert.equal(reporting.affiliateGuestCount({ gruposParticipacao: [{ participantesPorTipo: { adult: 2, free: 1 } }, { participantes: 2 }] }), 5);
  assert.equal(reporting.affiliateGuestCount({ adultos: 2, criancas: 1, naoPagante: 1 }), 4);
  assert.equal(reporting.affiliateGuestCount({ participantes: '4' }), 4);
  assert.equal(reporting.affiliateGuestCount({ participantes: 0 }), 0);
  for (const raw of [{}, { participantes: -1 }, { participantes: 2.5 }, { participantes: 'abc' }, { participantesPorTipo: { adult: 'unknown' } }]) {
    assert.equal(reporting.affiliateGuestCount(raw), null);
  }
});
test('creation time falls back only to stored snapshot and invalid visit time remains unknown', () => {
  const dto = reporting.affiliateSaleDto('real-code', reservation({ criadoEm: undefined, horario: 'Sem horario especifico' }), undefined, independent);
  assert.equal(dto.createdAt, '2026-11-25T12:00:00.000Z'); assert.equal(dto.time, null);
});
test('server filters status/payment/q apply equally to sales and exact summary, without widening partner ownership', async (t) => {
  const { request } = await setup(t);
  const query = '?status=paid&paymentMethod=PIX&q=gastronomico&partnerId=partner-a&agencyId=agency-a';
  const sales = await request('/api/affiliates/sales' + query);
  assert.equal(sales.status, 200); assert.deepEqual(sales.body.items.map((item) => item.id), [OWN_PAID]);
  const summary = await request('/api/affiliates/summary' + query);
  assert.equal(summary.body.paidCount, 1); assert.equal(summary.body.pendingCount, 0); assert.equal(summary.body.cancelledCount, 0);
  assert.equal(summary.body.revenue, 100); assert.equal('commission' in summary.body, false);
  const foreign = await request('/api/affiliates/sales?q=99-foreign&partnerId=partner-a&agencyId=agency-a');
  assert.deepEqual(foreign.body.items, []);
  assert.equal((await request('/api/affiliates/summary?q=99-foreign&partnerId=partner-a')).body.paidCount, 0);
});
test('q matches the actual code and public partner/agency names; it never searches private customer data', async (t) => {
  const { request } = await setup(t);
  assert.deepEqual((await request('/api/affiliates/sales?q=' + OWN_PENDING)).body.items.map((item) => item.id), [OWN_PENDING]);
  assert.equal((await request('/api/affiliates/sales?q=Parceiro%20Piri')).body.items.length, 3);
  assert.deepEqual((await request('/api/affiliates/sales?q=PRIVATE')).body.items, []);
});
test('raw cursor advances across an empty filtered page and later matches remain reachable', async (t) => {
  const { request } = await setup(t);
  const first = await request('/api/affiliates/sales?limit=1&q=trilha');
  assert.deepEqual(first.body.items, []); assert.equal(first.body.nextCursor, OWN_PAID);
  const next = await request('/api/affiliates/sales?limit=1&q=trilha&cursor=' + first.body.nextCursor);
  assert.deepEqual(next.body.items.map((item) => item.id), [OWN_PENDING]);
  assert.notEqual(next.body.nextCursor, first.body.nextCursor);
  const summary = await request('/api/affiliates/summary?q=trilha');
  assert.equal(summary.body.pendingCount, 1); assert.equal(summary.body.paidCount, 0);
});
test('summary traverses beyond its first 500 raw records when only a later reservation matches', async (t) => {
  const { request, fixture } = await setup(t);
  for (let index = 0; index < 501; index++) {
    fixture.rows.set('reservas/10-scan-' + String(index).padStart(12, '0'), reservation({ atividade: 'Sem correspondência' }));
  }
  const code = '99-own-final-match-00001';
  fixture.rows.set('reservas/' + code, reservation({ atividade: 'Alvo final', valor: 225 }));
  fixture.rows.set('_affiliate_payment_evidence/' + code, paymentEvidence({ value: 225 }));
  const result = await request('/api/affiliates/summary?q=Alvo%20final&status=paid&paymentMethod=PIX');
  assert.equal(result.status, 200); assert.equal(result.body.paidCount, 1); assert.equal(result.body.revenue, 225);
  assert.equal(result.body.pendingCount, 0); assert.equal(result.body.cancelledCount, 0);
});
test('manual and cancelled filters are real server filters and unknown method does not match MANUAL', async (t) => {
  const { request, fixture } = await setup(t);
  fixture.rows.set('reservas/04-unknown-method-00001', fixture.value('reservas/' + OWN_PENDING));
  const unknown = fixture.rows.get('reservas/04-unknown-method-00001'); delete unknown.formaPagamento; unknown.origem = 'manual';
  const result = await request('/api/affiliates/sales?paymentMethod=MANUAL&status=cancelled');
  assert.deepEqual(result.body.items.map((item) => item.id), [OWN_CANCELLED]);
  const summary = await request('/api/affiliates/summary?paymentMethod=MANUAL');
  assert.equal(summary.body.cancelledCount, 1); assert.equal(summary.body.pendingCount, 0);
});
test('unsupported enums, repeated query values and q above 120 characters fail with a stable code', async (t) => {
  const { request } = await setup(t);
  for (const route of ['/api/affiliates/sales', '/api/affiliates/summary']) {
    for (const query of ['status=approved', 'paymentMethod=BOLETO', 'paymentMethod=pix', 'q=a&q=b', 'q=' + 'a'.repeat(121)]) {
      const result = await request(route + '?' + query);
      assert.equal(result.status, 400); assert.equal(result.body.code, 'AFFILIATE_FILTER_INVALID');
    }
  }
});
test('agency, linked partner and independent partner cannot list raw/create/edit/delete reservations even with their own ID', async (t) => {
  const { request, fixture } = await setup(t);
  const before = fixture.value('reservas/' + OWN_PAID);
  for (const role of ['agency', 'partner', 'independent']) {
    for (const [route, method] of [['/api/reservas', 'GET'], ['/api/reservas', 'POST'],
      ['/api/reservas/' + OWN_PAID, 'PUT'], ['/api/reservas/' + OWN_PAID, 'DELETE'],
      ['/api/reservas/99-foreign-000000000001', 'PUT'], ['/api/reservas/99-foreign-000000000001', 'DELETE']]) {
      const result = await request(route, role, method, method === 'POST' || method === 'PUT' ? { status: 'pago', confirmada: true, role: 'admin', partnerId: role } : undefined);
      assert.equal(result.status, 403, `${role} ${method} ${route}`);
    }
  }
  assert.deepEqual(fixture.value('reservas/' + OWN_PAID), before);
  assert.equal(fixture.writes.length, 0);
  assert.equal((await request('/api/reservas', 'owner')).status, 200);
});
