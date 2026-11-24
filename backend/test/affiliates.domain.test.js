const test = require('node:test');
process.env.AFFILIATES_ENABLED = 'true';
const assert = require('node:assert/strict');
const firebase = require('../dist/services/firebaseAdmin');
const domain = require('../dist/services/affiliates');
const referral = require('../dist/services/affiliatesReferral');
const { createAffiliateFirestore } = require('./helpers/affiliateFirestore');
const admin = { uid: 'admin', role: 'admin', agencyId: null, partnerId: null };
const agency = { uid: 'agency', role: 'agency', agencyId: 'a1', partnerId: null };
const partner = { uid: 'partner', role: 'partner', agencyId: 'a1', partnerId: 'p1' };
const token = 'A'.repeat(43);
const now = new Date();
const future = new Date(Date.now() + 86400000);
const source = { version: 1, agencyId: 'a1', agencyName: 'Agencia', partnerId: 'p1', partnerName: 'Parceiro',
  linkId: 'p1', capturedAt: now.toISOString(), bookedAt: now.toISOString(), commissionRule: { mode: 'percent', value: 10 },
  commissionBeneficiary: 'agency', commissionBeneficiaryId: 'a1' };
const base = () => ({
  'affiliate_agencies/a1': { name: 'Agencia', email: 'agencia@example.test', status: 'active', commissionRule: { mode: 'percent', value: 10 } },
  'affiliate_agencies/a2': { name: 'Outra', email: 'outra@example.test', status: 'active', commissionRule: null },
  'affiliate_partners/p1': { name: 'Parceiro', email: 'p1@example.test', status: 'active', agencyId: 'a1', commissionRule: null },
  'affiliate_partners/p2': { name: 'Outro', email: 'p2@example.test', status: 'active', agencyId: 'a2', commissionRule: null },
  'affiliate_partners/pi': { name: 'Independente', email: 'ind@example.test', status: 'active', agencyId: null, commissionRule: { mode: 'fixed', value: 8.55 } },
  'affiliate_links/p1': { partnerId: 'p1', agencyId: 'a1', token, status: 'active', createdAt: now },
  [`_affiliate_link_tokens/${domain.affiliateHash(token)}`]: { linkId: 'p1', partnerId: 'p1', agencyId: 'a1' },
});
const withDb = async (initial, callback, authOverrides = {}) => {
  const fixture = createAffiliateFirestore(initial);
  const oldDb = firebase.obterFirestoreAdmin, oldAuth = firebase.obterAuthAdmin;
  firebase.obterFirestoreAdmin = () => fixture.db;
  firebase.obterAuthAdmin = () => ({ getUserByEmail: async () => { throw { code: 'auth/user-not-found' }; },
    getUser: async () => ({ metadata: { creationTime: new Date(Date.now() + 1000).toISOString() } }), ...authOverrides });
  try { return await callback(fixture); } finally { firebase.obterFirestoreAdmin = oldDb; firebase.obterAuthAdmin = oldAuth; }
};

test('regras de comissão aceitam null e centavos; nunca strings/percentual fora da faixa', () => {
  for (const value of [undefined, null]) assert.equal(domain.normalizeCommissionRule(value), null);
  assert.deepEqual(domain.normalizeCommissionRule({ mode: 'percent', value: 10.25 }), { mode: 'percent', value: 10.25 });
  assert.equal(domain.commissionAmount({ mode: 'percent', value: 10 }, 99.95), 10);
  assert.equal(domain.commissionAmount({ mode: 'fixed', value: 8.55 }, 100), 8.55);
  for (const value of [{ mode: 'percent', value: 101 }, { mode: 'fixed', value: -1 }, { mode: 'fixed', value: '5' }, { mode: 'percent', value: 1.001 }, {}]) assert.throws(() => domain.normalizeCommissionRule(value));
});
test('link opaco resolve ownership no servidor e snapshot regra não muda com configuração futura', () => withDb(base(), async ({ records }) => {
  const result = await referral.resolveAffiliateLink(token);
  assert.match(result.contextToken, /^[A-Za-z0-9_-]{43}$/);
  const snapshot = await referral.snapshotAffiliateContext(result.contextToken);
  assert.deepEqual(snapshot.commissionRule, { mode: 'percent', value: 10 });
  assert.equal(snapshot.agencyId, 'a1');
  records.get('affiliate_agencies/a1').commissionRule = { mode: 'fixed', value: 30 };
  assert.deepEqual(snapshot.commissionRule, { mode: 'percent', value: 10 });
  assert.deepEqual((await referral.snapshotAffiliateContext(result.contextToken)).commissionRule, { mode: 'fixed', value: 30 });
}));
test('token adulterado, contexto expirado e agência desativada bloqueiam vínculo', () => withDb(base(), async ({ records }) => {
  await assert.rejects(referral.resolveAffiliateLink('B'.repeat(43)), { code: 'AFFILIATE_LINK_INVALID' });
  const { contextToken } = await referral.resolveAffiliateLink(token);
  const ctx = records.get(`_affiliate_contexts/${domain.affiliateHash(contextToken)}`);
  ctx.expiresAt = new Date(0);
  await assert.rejects(referral.snapshotAffiliateContext(contextToken), { code: 'AFFILIATE_CONTEXT_EXPIRED' });
  ctx.expiresAt = future;
  records.get('affiliate_agencies/a1').status = 'disabled';
  await assert.rejects(referral.snapshotAffiliateContext(contextToken), { code: 'AFFILIATE_LINK_UNAVAILABLE' });
}));
test('sessão não troca indicação ativa e permite retry com o mesmo contexto', () => withDb(base(), async () => {
  const first = await referral.resolveAffiliateLink(token), other = await referral.resolveAffiliateLink(token);
  await referral.vincularContextoAfiliadoSessao(first.contextToken, 'site_abcdefghijklmnop');
  await referral.vincularContextoAfiliadoSessao(first.contextToken, 'site_abcdefghijklmnop');
  await assert.rejects(referral.vincularContextoAfiliadoSessao(other.contextToken, 'site_abcdefghijklmnop'), { code: 'AFFILIATE_SESSION_ALREADY_BOUND' });
  assert.equal(await referral.obterContextoAfiliadoSessao('site_abcdefghijklmnop'), first.contextToken);
}));
test('criação de parceiro força agência da identidade; agência não muda comissão ou tenant', () => withDb(base(), async () => {
  await assert.rejects(domain.saveAffiliate('partner', null, { name: 'Novo', email: 'novo@example.test', agencyId: 'a2' }, agency), { code: 'AFFILIATE_PERMISSION_REQUIRED' });
  await assert.rejects(domain.saveAffiliate('partner', 'p1', { commissionRule: { mode: 'fixed', value: 1 } }, agency), { code: 'AFFILIATE_PERMISSION_REQUIRED' });
  await assert.rejects(domain.saveAffiliate('partner', 'p2', { name: 'Invadido' }, agency), { code: 'AFFILIATE_NOT_FOUND' });
  const result = await domain.saveAffiliate('partner', null, { name: 'Novo', email: 'novo@example.test' }, agency);
  assert.equal(result.agencyId, 'a1');
  assert.ok(!('commissionRule' in result));
}));
test('parceiro não administra entidade, agencyId é imutável e vínculo agência não recebe regra própria', () => withDb(base(), async () => {
  await assert.rejects(domain.saveAffiliate('partner', 'p1', { name: 'X' }, partner), { code: 'AFFILIATE_PERMISSION_REQUIRED' });
  await assert.rejects(domain.saveAffiliate('partner', 'p1', { agencyId: 'a2' }, admin), { code: 'AFFILIATE_AGENCY_IMMUTABLE' });
  await assert.rejects(domain.saveAffiliate('partner', 'p1', { commissionRule: { mode: 'percent', value: 10 } }, admin), { code: 'AFFILIATE_COMMISSION_INHERITED' });
}));
test('UID/email de conta existente nunca recebe promoção pelo cadastro administrativo', () => withDb(base(), async () => {
  await assert.rejects(domain.saveAffiliate('agency', null, { name: 'Existente', email: 'old@example.test' }, admin), { code: 'AFFILIATE_ACCOUNT_ALREADY_EXISTS' });
}, { getUserByEmail: async () => ({ uid: 'old' }) }));
test('convite vinculado ao email, uso único e replay seguro após resposta perdida', () => withDb(base(), async ({ records }) => {
  const invite = await domain.createAffiliateActivation('partner', 'p1', agency);
  const activationToken = invite.url.split('/').at(-1);
  const preview = await domain.previewAffiliateActivation(activationToken);
  assert.equal(preview.email, 'p1@example.test');
  await assert.rejects(domain.redeemAffiliateActivation(activationToken, { uid: 'wrong', email: 'outra@example.test', claims: {} }), { code: 'AFFILIATE_ACTIVATION_ACCOUNT_MISMATCH' });
  const identity = { uid: 'new-user', email: 'p1@example.test', claims: {} };
  const result = await domain.redeemAffiliateActivation(activationToken, identity);
  assert.equal(result.membership.agencyId, 'a1');
  assert.equal(result.membership.partnerId, 'p1');
  assert.equal((await domain.redeemAffiliateActivation(activationToken, identity)).duplicate, true);
  assert.equal(records.get('affiliate_memberships/new-user').role, 'partner');
  await assert.rejects(domain.redeemAffiliateActivation(activationToken, { ...identity, uid: 'another' }), { code: 'AFFILIATE_ACTIVATION_EXPIRED' });
}));
test('convite novo invalida anterior; conta anterior ao convite não é reutilizada', () => withDb(base(), async () => {
  const invite = await domain.createAffiliateActivation('partner', 'p1', agency);
  const second = await domain.createAffiliateActivation('partner', 'p1', agency);
  await assert.rejects(domain.previewAffiliateActivation(invite.url.split('/').at(-1)), { code: 'AFFILIATE_ACTIVATION_EXPIRED' });
  await assert.rejects(domain.redeemAffiliateActivation(second.url.split('/').at(-1), { uid: 'old', email: 'p1@example.test', claims: {} }), { code: 'AFFILIATE_ACCOUNT_ALREADY_EXISTS' });
}, { getUser: async () => ({ metadata: { creationTime: new Date(0).toISOString() } }) }));

const reservation = (extra = {}) => ({ commercialAttribution: source, valor: 100, status: 'pago', asaasPaymentId: 'pay_test',
  data: '2099-01-01', atividade: 'Brunch', criadoEm: now, cpf: 'SECRET', telefone: 'SECRET', nome: 'SECRET', creditCard: { number: 'SECRET' }, ...extra });
test('somente evidência do provedor correspondente gera comissão; status público pago sozinho não basta', () => withDb({ ...base(), 'reservas/r1': reservation() }, async () => {
  assert.equal(referral.affiliateSaleDto('r1', reservation(), undefined, admin).status, 'pending');
  await assert.rejects(referral.recordAffiliatePaymentEvidence('r1', { id: 'pay_other', externalReference: 'r1', value: 100, status: 'RECEIVED' }), { code: 'AFFILIATE_PAYMENT_MISMATCH' });
  await assert.rejects(referral.recordAffiliatePaymentEvidence('r1', { id: 'pay_test', externalReference: 'r1', value: 99, status: 'RECEIVED' }), { code: 'AFFILIATE_PAYMENT_MISMATCH' });
  await referral.recordAffiliatePaymentEvidence('r1', { id: 'pay_test', externalReference: 'r1', value: 100, status: 'RECEIVED' });
  const result = await referral.affiliateSummary(admin, {});
  assert.equal(result.paidCount, 1); assert.equal(result.commission, 10);
}));
test('estorno exclui comissão, é idempotente e confirmação atrasada não ressuscita evidência', () => withDb({ ...base(), 'reservas/r1': reservation() }, async ({ records }) => {
  const payment = { id: 'pay_test', externalReference: 'r1', value: 100, status: 'RECEIVED' };
  await referral.recordAffiliatePaymentEvidence('r1', payment);
  const originalPaidAt = records.get('_affiliate_payment_evidence/r1').paidAt;
  await referral.recordAffiliatePaymentEvidence('r1', payment);
  assert.equal(records.get('_affiliate_payment_evidence/r1').paidAt.getTime(), originalPaidAt.getTime());
  await referral.recordAffiliatePaymentEvidence('r1', { ...payment, status: 'REFUNDED' });
  await referral.recordAffiliatePaymentEvidence('r1', payment);
  const result = await referral.affiliateSummary(admin, {});
  assert.equal(result.commission, 0); assert.equal(result.paidCount, 0); assert.equal(result.cancelledCount, 1);
}));
test('relatório tenant ignora filtro forjado; DTO parceiro não contém PII nem comissão', () => withDb({ ...base(),
  'reservas/r1': reservation(), 'reservas/r2': reservation({ commercialAttribution: { ...source, agencyId: 'a2', partnerId: 'p2' } }),
  '_affiliate_payment_evidence/r1': { state: 'paid', value: 100, paymentId: 'pay_test', paidAt: now },
}, async () => {
  const rows = await referral.listAffiliateSales(partner, { partnerId: 'p2', agencyId: 'a2', limit: 1 });
  assert.equal(rows.items.length, 1); assert.equal(rows.items[0].id, 'r1');
  const dto = JSON.stringify(rows);
  for (const secret of ['SECRET', 'commission', 'cpf', 'telefone', 'creditCard']) assert.ok(!dto.includes(secret));
  assert.ok(!('commission' in await referral.affiliateSummary(agency, {})));
}));
test('paginações não duplicam registros e total admin usa regra histórica', () => withDb({ ...base(), 'reservas/r1': reservation(),
  'reservas/r2': reservation({ commercialAttribution: { ...source, commissionRule: { mode: 'fixed', value: 15 } } }),
  '_affiliate_payment_evidence/r1': { state: 'paid', value: 100, paymentId: 'pay_test', paidAt: now },
  '_affiliate_payment_evidence/r2': { state: 'paid', value: 100, paymentId: 'pay_test', paidAt: now },
}, async () => {
  const first = await referral.listAffiliateSales(admin, { limit: 1 });
  const second = await referral.listAffiliateSales(admin, { limit: 1, cursor: first.nextCursor });
  assert.equal(first.items[0].id, 'r1'); assert.equal(second.items[0].id, 'r2'); assert.equal(second.nextCursor, null);
  assert.equal((await referral.affiliateSummary(admin, {})).commission, 25);
}));
test('independente tem regra própria e comissão existe apenas no relatório admin', () => withDb(base(), async ({ records }) => {
  records.set('affiliate_links/pi', { partnerId: 'pi', agencyId: null, token, status: 'active' });
  records.set(`_affiliate_link_tokens/${domain.affiliateHash(token)}`, { linkId: 'pi', partnerId: 'pi', agencyId: null });
  const { contextToken } = await referral.resolveAffiliateLink(token);
  const snapshot = await referral.snapshotAffiliateContext(contextToken);
  assert.equal(snapshot.commissionBeneficiary, 'partner'); assert.equal(snapshot.commissionBeneficiaryId, 'pi');
  const row = reservation({ commercialAttribution: snapshot });
  const evidence = { state: 'paid', paymentId: 'pay_test', value: 100, paidAt: now };
  assert.equal(referral.affiliateSaleDto('ri', row, evidence, admin).commission, 8.55);
  assert.ok(!('commissionRule' in referral.affiliateSaleDto('ri', row, evidence, { ...partner, partnerId: 'pi', agencyId: null })));
}));
test('datas e cursores inválidos não ampliam consulta', async () => {
  await assert.rejects(referral.listAffiliateSales(admin, { cursor: '../x' }), { code: 'AFFILIATE_ID_INVALID' });
  await withDb(base(), async () => {
    await assert.rejects(referral.listAffiliateSales(admin, { from: '2099-02-31' }), { code: 'AFFILIATE_DATE_INVALID' });
    await assert.rejects(referral.listAffiliateSales(admin, { from: '2099-02-01', to: '2099-01-01' }), { code: 'AFFILIATE_DATE_INVALID' });
  });
});
