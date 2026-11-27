const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const admin = require('../dist/services/firebaseAdmin');
const domain = require('../dist/services/affiliates');
const referral = require('../dist/services/affiliatesReferral');
const router = require('../dist/server/affiliates').default;
const { affiliateTraceabilityFixture } = require('./helpers/affiliateTraceabilityFixture');
const OWNER = { uid: 'owner', role: 'admin', agencyId: null, partnerId: null };
const AGENCY = { uid: 'agency', role: 'agency', agencyId: 'a1', partnerId: null };
const OTHER = { uid: 'other-agency', role: 'agency', agencyId: 'a2', partnerId: null };
const TOKEN = 'P'.repeat(43);
const seed = () => ({
  'affiliate_agencies/a1': { name: 'Aquino Turismo', email: 'PRIVATE EMAIL', memberUid: 'agency', status: 'active', commissionRule: { mode: 'percent', value: 10 },
    logoVersion: 'a'.repeat(24), logoMimeType: 'image/png', branding: { primaryColor: '#123456', accentColor: '#abcdef' } },
  'affiliate_agencies/a2': { name: 'Outra agência', status: 'active', commissionRule: null },
  'affiliate_partners/p1': { name: 'Vendedor', status: 'active', agencyId: 'a1' },
  'affiliate_partners/pi': { name: 'Independente', status: 'active', agencyId: null },
  'affiliate_memberships/agency': { role: 'agency', agencyId: 'a1', status: 'active' },
  'affiliate_memberships/other-agency': { role: 'agency', agencyId: 'a2', status: 'active' },
  'affiliate_memberships/partner': { role: 'partner', agencyId: 'a1', partnerId: 'p1', status: 'active' },
  'affiliate_memberships/independent': { role: 'partner', agencyId: null, partnerId: 'pi', status: 'active' },
  'affiliate_links/p1': { agencyId: 'a1', partnerId: 'p1', token: TOKEN, status: 'active' },
  ['_affiliate_link_tokens/' + domain.affiliateHash(TOKEN)]: { agencyId: 'a1', partnerId: 'p1', linkId: 'p1' },
});
async function setup(t) {
  const fixture = affiliateTraceabilityFixture(seed());
  t.mock.method(admin, 'obterFirestoreAdmin', () => fixture.db);
  t.mock.method(admin, 'obterAuthAdmin', () => ({
    verifyIdToken: async (token, revoked) => {
      assert.equal(revoked, true);
      assert.ok(['owner', 'agency', 'other-agency', 'partner', 'independent'].includes(token));
      return { uid: token, exp: Math.floor(Date.now() / 1000) + 3600, ...(token === 'owner' ? { admin: true } : {}) };
    },
    createUser: async () => assert.fail('Official agency links must never create an Auth account'),
  }));
  const previous = process.env.AFFILIATES_ENABLED; process.env.AFFILIATES_ENABLED = 'true';
  t.after(() => { if (previous === undefined) delete process.env.AFFILIATES_ENABLED; else process.env.AFFILIATES_ENABLED = previous; });
  const app = express(); app.use(express.json()); app.use('/api/affiliates', router);
  const server = await new Promise((resolve) => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const request = async (path, actor, method = 'GET', body) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/affiliates${path}`, {
      method, headers: { ...(actor ? { Authorization: 'Bearer ' + actor } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  return { ...fixture, request };
}

test('slug is canonical ASCII with single hyphens and rejects reserved routes and aliases case-insensitively', () => {
  assert.equal(referral.normalizeAffiliateAgencySlug(' AQUINO-Turismo '), 'aquino-turismo');
  assert.equal(referral.normalizeAffiliateAgencySlug('a'.repeat(60)), 'a'.repeat(60));
  for (const slug of [null, {}, '', 'ab', 'a'.repeat(61), 'aquino--turismo', '-aquino', 'aquino-', 'aquino turismo', 'áquino', '../aquino', 'aquino/turismo', 'aquino?ref=x', 'aquino%2fturismo']) {
    assert.throws(() => referral.normalizeAffiliateAgencySlug(slug), { code: 'AFFILIATE_SLUG_INVALID' });
  }
  for (const slug of ['ADMIN', 'cRm', 'Assets', 'Output', 'BACKEND', 'frontend', 'reservar', 'minha-reserva', 'Afiliados', 'agente', 'agencia', 'login', 'api', 'formulario', 'Brunch', 'planeje-sua-visita', '404']) {
    assert.throws(() => referral.normalizeAffiliateAgencySlug(slug), { code: 'AFFILIATE_SLUG_RESERVED' });
  }
});

test('official link CRUD is authenticated and scoped; no fabricated partner, membership or commission mutation', async (t) => {
  const f = await setup(t);
  for (const [actor, status] of [[undefined, 401], ['invalid', 401], ['partner', 403], ['independent', 403], ['other-agency', 403]]) {
    for (const method of ['POST', 'PATCH']) assert.equal((await f.request('/agencies/a1/link', actor, method, { slug: 'aquino-turismo' })).status, status);
  }
  for (const forged of [{ agencyId: 'a2' }, { partnerId: 'p1' }, { commissionRule: { mode: 'percent', value: 100 } }]) {
    assert.equal((await f.request('/agencies/a1/link', 'agency', 'POST', { slug: 'aquino-turismo', ...forged })).status, 400);
  }
  const before = [...f.rows].filter(([key]) => key.startsWith('affiliate_partners/') || key.startsWith('affiliate_memberships/'));
  const first = await f.request('/agencies/a1/link', 'agency', 'POST', { slug: ' AQUINO-TURISMO ' });
  assert.equal(first.status, 200); assert.equal(first.body.item.url, 'https://vagafogo.com.br/aquino-turismo');
  assert.equal(first.body.item.partnerId, null); assert.equal(first.body.item.agencyId, 'a1'); assert.equal(first.body.item.kind, 'agency');
  const privateLink = f.value('affiliate_links/' + first.body.item.id);
  assert.match(privateLink.token, /^[A-Za-z0-9_-]{43}$/); assert.equal(privateLink.updatedBy, 'agency');
  assert.deepEqual((await f.request('/agencies/a1/link', 'agency', 'PATCH', { slug: 'aquino-turismo' })).body, first.body);
  assert.deepEqual(f.value('affiliate_links/' + first.body.item.id), privateLink);
  assert.equal([...f.rows.keys()].filter((key) => key.startsWith('_affiliate_link_tokens/')).length, 2);
  assert.deepEqual([...f.rows].filter(([key]) => key.startsWith('affiliate_partners/') || key.startsWith('affiliate_memberships/')), before);
  assert.deepEqual(f.value('affiliate_agencies/a1').commissionRule, { mode: 'percent', value: 10 });
  const me = await f.request('/me', 'agency');
  assert.equal(me.body.agency.publicSlug, 'aquino-turismo'); assert.ok(me.body.agency.linkUpdatedAt);
  assert.equal('commissionRule' in me.body.agency, false);
  assert.equal((await f.request('/agencies/a2/link', 'owner', 'POST', { slug: 'outra-agencia' })).status, 200);
});

test('public slug resolution returns only public branding and opaque context; agency snapshot has no seller', async (t) => {
  const f = await setup(t);
  await referral.saveAffiliateAgencyLink('a1', { slug: 'aquino-turismo' }, AGENCY);
  const resolved = await f.request('/public/resolve-slug', undefined, 'POST', { slug: 'aquino-turismo', agencyId: 'a2', partnerId: 'pi', commissionRule: { mode: 'fixed', value: 100 } });
  assert.equal(resolved.status, 200); assert.equal(resolved.body.partnerName, null); assert.equal(resolved.body.agencyName, 'Aquino Turismo');
  assert.equal(resolved.body.agencySlug, 'aquino-turismo'); assert.match(resolved.body.referralToken, /^[A-Za-z0-9_-]{43}$/);
  assert.match(resolved.body.contextToken, /^[A-Za-z0-9_-]{43}$/); assert.ok(resolved.body.expiresAt);
  assert.deepEqual(resolved.body.agencyBranding, { primaryColor: '#123456', accentColor: '#ABCDEF' });
  assert.doesNotMatch(JSON.stringify(resolved.body), /commission|agencyId|partnerId|memberUid|PRIVATE|StoragePath/);
  const snapshot = await referral.snapshotAffiliateContext(resolved.body.contextToken);
  assert.equal(snapshot.partnerId, null); assert.equal(snapshot.partnerName, null); assert.equal(snapshot.agencyId, 'a1');
  assert.equal(snapshot.commissionBeneficiary, 'agency'); assert.equal(snapshot.commissionBeneficiaryId, 'a1');
  assert.deepEqual(snapshot.commissionRule, { mode: 'percent', value: 10 });
  const viaToken = await referral.resolveAffiliateLink(resolved.body.referralToken);
  assert.equal(viaToken.partnerName, null); assert.equal(viaToken.agencySlug, 'aquino-turismo');
  assert.equal((await referral.resolveAffiliateLink(TOKEN)).partnerName, 'Vendedor');
  await referral.vincularContextoAfiliadoSessao(resolved.body.contextToken, 'site_agencydirectabcdefghijkl');
  assert.equal(await referral.obterContextoAfiliadoSessao('site_agencydirectabcdefghijkl'), resolved.body.contextToken);
  assert.equal((await f.request('/public/resolve-slug', undefined, 'POST', { slug: 'not-a-real-agency' })).status, 404);
});

test('transaction uniqueness gives one owner; retired slug, token and context cannot switch attribution after rename', async (t) => {
  const f = await setup(t);
  const contenders = await Promise.allSettled([
    referral.saveAffiliateAgencyLink('a1', { slug: 'same-slug' }, AGENCY),
    referral.saveAffiliateAgencyLink('a2', { slug: 'same-slug' }, OTHER),
  ]);
  assert.equal(contenders.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(contenders.find((result) => result.status === 'rejected').reason.code, 'AFFILIATE_SLUG_IN_USE');
  const winner = f.value('_affiliate_agency_slugs/same-slug').agencyId;
  const owner = winner === 'a1' ? AGENCY : OTHER, loser = winner === 'a1' ? OTHER : AGENCY;
  const original = await referral.resolveAffiliateAgencySlug('same-slug');
  const frozen = await referral.snapshotAffiliateContext(original.contextToken);
  await referral.saveAffiliateAgencyLink(winner, { slug: 'new-official-slug' }, owner);
  await assert.rejects(referral.resolveAffiliateAgencySlug('same-slug'), { code: 'AFFILIATE_LINK_INVALID' });
  await assert.rejects(referral.resolveAffiliateLink(original.referralToken), { code: 'AFFILIATE_LINK_UNAVAILABLE' });
  await assert.rejects(referral.snapshotAffiliateContext(original.contextToken), { code: 'AFFILIATE_LINK_UNAVAILABLE' });
  await assert.rejects(referral.saveAffiliateAgencyLink(loser.agencyId, { slug: 'same-slug' }, loser), { code: 'AFFILIATE_SLUG_IN_USE' });
  assert.equal(frozen.agencyId, winner); assert.equal(frozen.partnerId, null);
  assert.equal((await referral.resolveAffiliateAgencySlug('new-official-slug')).agencyName, winner === 'a1' ? 'Aquino Turismo' : 'Outra agência');
  // A stale active slug index is insufficient: the current official link must still match.
  f.rows.get('_affiliate_agency_slugs/same-slug').status = 'active';
  await assert.rejects(referral.resolveAffiliateAgencySlug('same-slug'), { code: 'AFFILIATE_LINK_UNAVAILABLE' });
});

test('agency links default to its official link, while paginated sales and totals include direct and own seller only', async (t) => {
  const f = await setup(t);
  const link = await referral.saveAffiliateAgencyLink('a1', { slug: 'aquino-turismo' }, AGENCY);
  await referral.saveAffiliateAgencyLink('a2', { slug: 'other-agency' }, OTHER);
  const ownLinks = await f.request('/links?agencyId=a2&partnerId=pi', 'agency');
  assert.deepEqual(ownLinks.body.items.map((item) => item.id), [link.id]);
  assert.equal(ownLinks.body.items[0].partnerId, null);
  assert.deepEqual((await f.request('/links', 'partner')).body.items.map((item) => item.id), ['p1']);
  const source = await referral.snapshotAffiliateContext((await referral.resolveAffiliateAgencySlug('aquino-turismo')).contextToken);
  const rows = [['01-direct', source], ['02-other', { ...source, agencyId: 'a2' }], ['03-seller', { ...source, partnerId: 'p1', partnerName: 'Vendedor' }]];
  for (const [id, commercialAttribution] of rows) {
    f.rows.set('reservas/' + id, { commercialAttribution, status: 'pago', valor: 100, asaasPaymentId: 'pay_' + id, atividade: 'Brunch', data: '2099-01-01', nome: 'PRIVATE CUSTOMER', cpf: 'PRIVATE CPF' });
    f.rows.set('_affiliate_payment_evidence/' + id, { state: 'paid', paymentId: 'pay_' + id, value: 100, paidAt: new Date() });
  }
  const collected = []; let cursor = null;
  do {
    const page = await f.request('/sales?limit=1&agencyId=a2&partnerId=pi' + (cursor ? '&cursor=' + cursor : ''), 'agency');
    assert.equal(page.status, 200); collected.push(...page.body.items); cursor = page.body.nextCursor;
  } while (cursor);
  assert.deepEqual(collected.map((item) => item.id), ['01-direct', '03-seller']);
  assert.equal(collected[0].partnerName, null); assert.equal(collected[1].partnerName, 'Vendedor');
  assert.doesNotMatch(JSON.stringify(collected), /PRIVATE|commission|cpf|email|telefone/);
  const summary = await f.request('/summary?agencyId=a2&partnerId=pi', 'agency');
  assert.equal(summary.body.paidCount, 2); assert.equal(summary.body.revenue, 200); assert.equal('commission' in summary.body, false);
  const seller = await f.request('/sales?agencyId=a1', 'partner');
  assert.deepEqual(seller.body.items.map((item) => item.id), ['03-seller']);
  assert.equal((await referral.affiliateSummary(OWNER, { agencyId: 'a1' })).commission, 20);
});

test('disabled agencies and rollout flag prevent link resolution and mutation without weakening admin management', async (t) => {
  const f = await setup(t);
  await referral.saveAffiliateAgencyLink('a1', { slug: 'aquino-turismo' }, AGENCY);
  const resolved = await referral.resolveAffiliateAgencySlug('aquino-turismo');
  f.rows.get('affiliate_agencies/a1').status = 'disabled';
  assert.equal((await f.request('/agencies/a1/link', 'agency', 'PATCH', { slug: 'new-slug' })).status, 403);
  await assert.rejects(referral.snapshotAffiliateContext(resolved.contextToken), { code: 'AFFILIATE_LINK_UNAVAILABLE' });
  assert.equal((await f.request('/public/resolve-slug', undefined, 'POST', { slug: 'aquino-turismo' })).status, 410);
  assert.equal((await f.request('/agencies/a1/link', 'owner', 'PATCH', { slug: 'admin-managed' })).status, 200);
  process.env.AFFILIATES_ENABLED = 'false';
  assert.equal((await f.request('/agencies/a2/link', 'owner', 'POST', { slug: 'not-enabled' })).status, 503);
  assert.equal((await f.request('/public/resolve-slug', undefined, 'POST', { slug: 'admin-managed' })).status, 503);
});

test('failed transaction publishes no partial slug, token, link or profile change and retry can finish', async (t) => {
  const f = await setup(t);
  const before = structuredClone([...f.rows]);
  const originalTransaction = f.db.runTransaction.bind(f.db);
  const fail = t.mock.method(f.db, 'runTransaction', (callback) => originalTransaction(async (tx) => {
    await callback(tx);
    throw new Error('LOCAL_ABORT_BEFORE_COMMIT');
  }));
  await assert.rejects(referral.saveAffiliateAgencyLink('a1', { slug: 'aquino-turismo' }, AGENCY), /LOCAL_ABORT_BEFORE_COMMIT/);
  assert.deepEqual([...f.rows], before);
  fail.mock.restore();
  assert.equal((await referral.saveAffiliateAgencyLink('a1', { slug: 'aquino-turismo' }, AGENCY)).slug, 'aquino-turismo');
});
