const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const admin = require('../dist/services/firebaseAdmin');
const router = require('../dist/server/affiliates').default;
const { createAffiliateFirestore } = require('./helpers/affiliateFirestore');

const attribution = (partnerId, agencyId) => ({ version: 1, agencyId, partnerId, partnerName: partnerId,
  commissionRule: { mode: 'percent', value: 10 }, commissionBeneficiary: agencyId ? 'agency' : 'partner',
  commissionBeneficiaryId: agencyId ?? partnerId, bookedAt: '2026-11-24T12:00:00Z' });
async function setup(t) {
  const records = {
    'affiliate_agencies/agency-a': { name: 'Agency A', status: 'active', commissionRule: { mode: 'percent', value: 10 } },
    'affiliate_agencies/agency-b': { name: 'Agency B', status: 'active' },
    'affiliate_memberships/agency': { role: 'agency', agencyId: 'agency-a', status: 'active' },
    'affiliate_memberships/partner': { role: 'partner', agencyId: 'agency-a', partnerId: 'partner-a', status: 'active' },
    'affiliate_memberships/independent': { role: 'partner', agencyId: null, partnerId: 'independent', status: 'active' },
  };
  for (const [id, agencyId] of [['partner-a', 'agency-a'], ['partner-b', 'agency-b'], ['independent', null]]) {
    records['affiliate_partners/' + id] = { name: id, email: id + '@example.test', agencyId, status: 'active' };
    records['affiliate_links/' + id] = { partnerId: id, agencyId, token: id.padEnd(43, 'X'), status: 'active' };
  }
  for (const [id, partnerId, agencyId] of [['01-a', 'partner-a', 'agency-a'], ['02-b', 'partner-b', 'agency-b'], ['03-a', 'partner-a', 'agency-a'], ['04-independent', 'independent', null]]) {
    records['reservas/' + id] = { nome: 'PRIVATE NAME', cpf: 'PRIVATE CPF', telefone: 'PRIVATE PHONE', email: 'PRIVATE EMAIL',
      status: 'pago', valor: 100, asaasPaymentId: 'pay_' + id, data: '2026-11-24', atividade: 'Brunch', commercialAttribution: attribution(partnerId, agencyId) };
    records['_affiliate_payment_evidence/' + id] = { paymentId: 'pay_' + id, state: 'paid', value: 100, paidAt: new Date('2026-11-24T12:00:00Z') };
  }
  const fixture = createAffiliateFirestore(records);
  const previous = process.env.AFFILIATES_ENABLED;
  process.env.AFFILIATES_ENABLED = 'true';
  t.after(() => { if (previous === undefined) delete process.env.AFFILIATES_ENABLED; else process.env.AFFILIATES_ENABLED = previous; });
  t.mock.method(admin, 'obterFirestoreAdmin', () => fixture.db);
  t.mock.method(admin, 'obterAuthAdmin', () => ({ verifyIdToken: async (token, revoked) => {
    assert.equal(revoked, true);
    if (!['owner', 'agency', 'partner', 'independent'].includes(token)) throw new Error('mock invalid token');
    return { uid: token, exp: Math.floor(Date.now() / 1000) + 3600, ...(token === 'owner' ? { admin: true } : {}) };
  } }));
  const app = express();
  app.use(express.json());
  app.use('/api/affiliates', router);
  const server = await new Promise((resolve) => { const value = app.listen(0, '127.0.0.1', () => resolve(value)); });
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const request = async (route, token, method = 'GET', body) => {
    const result = await fetch(`http://127.0.0.1:${server.address().port}/api/affiliates${route}`, {
      method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: result.status, body: await result.json() };
  };
  return { request, records: fixture.records };
}

test('actual /me endpoint returns the canonical envelope and denies missing/invalid authentication', async (t) => {
  const { request } = await setup(t);
  assert.equal((await request('/me')).status, 401);
  assert.equal((await request('/me', 'invalid')).status, 401);
  const result = await request('/me', 'partner');
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.identity, { uid: 'partner', role: 'partner', agencyId: 'agency-a', partnerId: 'partner-a' });
});

test('partner query tampering and another tenant cursor cannot expose links, sales or commission/PII', async (t) => {
  const { request } = await setup(t);
  const forged = '?agencyId=agency-b&partnerId=partner-b';
  const links = await request('/links' + forged, 'partner');
  assert.equal(links.status, 200);
  assert.deepEqual(links.body.items.map((row) => row.partnerId), ['partner-a']);
  const sales = await request('/sales' + forged, 'partner');
  assert.deepEqual(sales.body.items.map((row) => row.id), ['01-a', '03-a']);
  const later = await request('/sales' + forged + '&cursor=02-b&limit=1', 'partner');
  assert.deepEqual(later.body.items.map((row) => row.id), ['03-a']);
  const summary = await request('/summary' + forged, 'partner');
  assert.equal(summary.body.paidCount, 2);
  assert.equal(summary.body.revenue, 200);
  const serialized = JSON.stringify({ sales: sales.body, summary: summary.body });
  assert.equal(serialized.includes('PRIVATE'), false);
  assert.equal(serialized.includes('commission'), false);
});

test('independent partner remains scoped to own conversions and links', async (t) => {
  const { request } = await setup(t);
  const sales = await request('/sales?agencyId=agency-a&partnerId=partner-a', 'independent');
  assert.deepEqual(sales.body.items.map((row) => row.id), ['04-independent']);
  assert.equal(sales.body.items[0].agencyId, null);
  assert.deepEqual((await request('/links', 'independent')).body.items.map((row) => row.partnerId), ['independent']);
});

test('agency cannot inspect or mutate another agency partner, or set its own commission', async (t) => {
  const { request, records } = await setup(t);
  const own = await request('/partners?agencyId=agency-b', 'agency');
  assert.equal(own.status, 200);
  assert.deepEqual(own.body.items.map((row) => row.id), ['partner-a']);
  for (const [route, method, body] of [
    ['/agencies', 'GET'], ['/partners/partner-b', 'GET'], ['/partners/partner-b', 'PATCH', { name: 'Taken' }],
    ['/partners/partner-b/activation', 'POST'], ['/partners/partner-a', 'PATCH', { commissionRule: { mode: 'fixed', value: 9 } }],
    ['/partners/partner-a', 'PATCH', { agencyId: null }],
  ]) assert.ok([403, 404].includes((await request(route, 'agency', method, body)).status));
  assert.equal(records.get('affiliate_partners/partner-b').name, 'partner-b');
  assert.equal(records.get('affiliate_partners/partner-a').agencyId, 'agency-a');
});

test('partner cannot create, edit, delete or activate users, including its own profile', async (t) => {
  const { request, records } = await setup(t);
  for (const [route, method] of [['/agencies', 'POST'], ['/partners', 'POST'], ['/partners/partner-a', 'PATCH'], ['/partners/partner-a', 'DELETE'], ['/partners/partner-a/activation', 'POST']]) {
    assert.equal((await request(route, 'partner', method, { name: 'Escalation', email: 'new@example.test', role: 'admin', agencyId: null })).status, 403);
  }
  assert.equal(records.get('affiliate_partners/partner-a').name, 'partner-a');
  assert.equal(records.has('_crm_admin_access/partner'), false);
});

test('rollout flag off preserves current administrator /me and blocks all external portal operations', async (t) => {
  const { request } = await setup(t);
  process.env.AFFILIATES_ENABLED = 'false';
  assert.equal((await request('/me', 'owner')).status, 200);
  assert.equal((await request('/me', 'partner')).status, 503);
  assert.equal((await request('/partners', 'owner')).status, 503);
  assert.equal((await request('/public/resolve', undefined, 'POST', { referralToken: 'A'.repeat(43) })).status, 503);
});
