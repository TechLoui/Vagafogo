const test = require('node:test');
const assert = require('node:assert/strict');
const { deflateSync } = require('node:zlib');
const express = require('express');
const admin = require('../dist/services/firebaseAdmin');
const domain = require('../dist/services/affiliates');
const referral = require('../dist/services/affiliatesReferral');
const logos = require('../dist/services/affiliatesLogo');
const { default: router, exigirGestaoLogoAgencia } = require('../dist/server/affiliates');
const { createAffiliateFirestore } = require('./helpers/affiliateFirestore');
const OWNER = { uid: 'owner', role: 'admin', agencyId: null, partnerId: null };
const AGENCY = { uid: 'agency', role: 'agency', agencyId: 'a1', partnerId: null };
const PARTNER = { uid: 'partner', role: 'partner', agencyId: 'a1', partnerId: 'p1' };
const JPEG = Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCABAAEADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5Hooor8nPw8KKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//2Q==', 'base64');
const WEBP = Buffer.from('UklGRkwAAABXRUJQVlA4IEAAAADQAwCdASpAAEAAPm02mEkkIyKhIggAgA2JaQB2AAAgbqagCvELcgAA/vRRH//wG6+LaZf//IMeSnoazXAAAAAA', 'base64');
const crc = (buffer) => {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return (value ^ 0xffffffff) >>> 0;
};
const png = (width = 64, height = 64, padding = 0) => {
  const chunk = (type, bytes) => {
    const result = Buffer.alloc(12 + bytes.length);
    result.writeUInt32BE(bytes.length); result.write(type, 4); bytes.copy(result, 8);
    result.writeUInt32BE(crc(result.subarray(4, -4)), result.length - 4); return result;
  };
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const chunks = [Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.alloc((width * 4 + 1) * height)))];
  if (padding) chunks.push(chunk('tEXt', Buffer.alloc(padding, 65)));
  chunks.push(chunk('IEND', Buffer.alloc(0))); return Buffer.concat(chunks);
};
const dataUrl = (buffer = png(), mime = 'image/png') => ({ dataUrl: `data:${mime};base64,${buffer.toString('base64')}` });
async function setup(t) {
  const fixture = createAffiliateFirestore({
    'affiliate_agencies/a1': { name: 'Agência A', email: 'agency@example.test', status: 'active', commissionRule: { mode: 'percent', value: 10 } },
    'affiliate_agencies/a2': { name: 'Agência B', email: 'other@example.test', status: 'active', commissionRule: { mode: 'fixed', value: 15 } },
    'affiliate_partners/p1': { name: 'Partner', email: 'partner@example.test', status: 'active', agencyId: 'a1' },
    'affiliate_memberships/agency': { role: 'agency', agencyId: 'a1', status: 'active' },
    'affiliate_memberships/partner': { role: 'partner', agencyId: 'a1', partnerId: 'p1', status: 'active' },
  });
  const objects = new Map();
  const bucket = { file: (path) => ({
    save: async (buffer, options) => objects.set(path, { buffer: Buffer.from(buffer), options }),
    getMetadata: async () => { if (!objects.has(path)) throw { code: 404 }; return [{ size: objects.get(path).buffer.length }]; },
    download: async () => [Buffer.from(objects.get(path).buffer)],
    delete: async () => objects.delete(path),
  }) };
  t.mock.method(admin, 'obterFirestoreAdmin', () => fixture.db);
  t.mock.method(admin, 'obterStorageBucketAdmin', () => bucket);
  t.mock.method(admin, 'obterAuthAdmin', () => ({ verifyIdToken: async (token) => {
    if (!['owner', 'agency', 'partner'].includes(token)) throw new Error('invalid mock token');
    return { uid: token, exp: Math.floor(Date.now()/1000) + 3600, ...(token === 'owner' ? { admin: true } : {}) };
  } }));
  const previous = process.env.AFFILIATES_ENABLED; process.env.AFFILIATES_ENABLED = 'true';
  t.after(() => { if (previous === undefined) delete process.env.AFFILIATES_ENABLED; else process.env.AFFILIATES_ENABLED = previous; });
  const app = express();
  app.post('/api/affiliates/agencies/:id/logo', exigirGestaoLogoAgencia, express.json({ limit: '3mb' }), (_req, _res, next) => next());
  app.use(express.json({ limit: '1mb' })); app.use('/api/affiliates', router);
  const server = await new Promise((resolve) => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const request = async (path, token, method = 'GET', body, headers = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/affiliates${path}`, {
      method, headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = response.status === 304 ? null : response.headers.get('content-type')?.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer());
    return { status: response.status, headers: response.headers, body: result };
  };
  return { ...fixture, objects, request };
}

test('validates genuine PNG/JPEG/WebP signatures and dimensions without runtime decoder dependencies', () => {
  for (const [buffer, mimeType] of [[png(), 'image/png'], [JPEG, 'image/jpeg'], [WEBP, 'image/webp']]) {
    const image = logos.parseAffiliateLogo(dataUrl(buffer, mimeType));
    assert.equal(image.width, 64); assert.equal(image.height, 64); assert.equal(image.mimeType, mimeType);
  }
});
test('rejects URL/SVG, MIME mismatch, corrupt/truncated images, invalid base64, unsafe dimensions and oversized bytes', () => {
  const corrupt = png(); corrupt[29] ^= 1;
  for (const input of [{ dataUrl: 'https://evil.example/logo.png' }, { dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+' },
    dataUrl(png(), 'image/jpeg'), dataUrl(corrupt), dataUrl(png().subarray(0, -8)), { dataUrl: 'data:image/png;base64,AAAAA=' },
    dataUrl(png(31, 64)), dataUrl(png(4097, 32)), dataUrl(Buffer.alloc(logos.AFFILIATE_LOGO_MAX_BYTES + 1))]) {
    assert.throws(() => logos.parseAffiliateLogo(input), domain.AffiliateError);
  }
});
test('anonymous and partner cannot mutate logos; agencies cannot cross their authenticated scope or edit profile fields', async (t) => {
  const fixture = await setup(t);
  for (const token of [undefined, 'partner']) {
    for (const id of ['a1', 'a2']) {
      assert.equal((await fixture.request(`/agencies/${id}/logo`, token, 'POST', dataUrl())).status, token ? 403 : 401);
      assert.equal((await fixture.request(`/agencies/${id}/logo`, token, 'DELETE')).status, token ? 403 : 401);
    }
  }
  assert.equal((await fixture.request('/agencies/a2/logo', 'agency', 'POST', dataUrl())).status, 403);
  assert.equal((await fixture.request('/agencies/a2/logo', 'agency', 'DELETE')).status, 403);
  assert.equal(fixture.objects.size, 0);
  assert.equal((await fixture.request('/agencies/a1', 'owner', 'PATCH', { logoUrl: 'https://evil.example/logo.png' })).status, 400);
  assert.equal((await fixture.request('/agencies/a1', 'agency', 'PATCH', { name: 'Forged name' })).status, 403);
  for (const forged of [{ agencyId: 'a2' }, { commissionRule: { mode: 'percent', value: 100 } }, { status: 'active' }]) {
    assert.equal((await fixture.request('/agencies/a1/logo', 'agency', 'POST', { ...dataUrl(), ...forged })).status, 400);
  }
  assert.equal(fixture.objects.size, 0);
});

test('agency manages its own logo and validated branding; linked sellers receive branding without private fields', async (t) => {
  const fixture = await setup(t);
  fixture.records.get('affiliate_agencies/a1').memberUid = 'agency';
  const upload = await fixture.request('/agencies/a1/logo', 'agency', 'POST', { ...dataUrl(), branding: { primaryColor: '#a1b2c3', accentColor: '#0a9f5c' } });
  assert.equal(upload.status, 200);
  assert.deepEqual(upload.body.item.branding, { primaryColor: '#A1B2C3', accentColor: '#0A9F5C' });
  const stored = fixture.records.get('affiliate_agencies/a1');
  assert.equal(stored.logoUploadedBy, 'agency'); assert.equal(stored.updatedBy, 'agency');
  assert.equal(stored.name, 'Agência A'); assert.equal(stored.email, 'agency@example.test'); assert.equal(stored.memberUid, 'agency');
  assert.deepEqual(stored.commissionRule, { mode: 'percent', value: 10 });
  for (const token of ['agency', 'partner']) {
    const me = await fixture.request('/me', token);
    assert.deepEqual(me.body.agency.branding, upload.body.item.branding);
    assert.equal(me.body.agency.logoUrl, upload.body.item.logoUrl);
    for (const field of ['commissionRule', 'memberUid', 'logoStoragePath', 'logoUploadedBy', 'updatedBy']) assert.equal(field in me.body.agency, false);
  }
  const replacement = await fixture.request('/agencies/a1/logo', 'agency', 'POST', dataUrl(JPEG, 'image/jpeg'));
  assert.equal(replacement.status, 200); assert.equal('branding' in replacement.body.item, false);
  assert.equal(fixture.records.get('affiliate_agencies/a1').branding, null);
  await fixture.request('/agencies/a1/logo', 'agency', 'POST', { ...dataUrl(), branding: { primaryColor: '#112233', accentColor: '#445566' } });
  const removed = await fixture.request('/agencies/a1/logo', 'agency', 'DELETE');
  assert.equal(removed.status, 200); assert.equal('branding' in removed.body.item, false);
  assert.equal('logoUrl' in removed.body.item, false); assert.equal(fixture.records.get('affiliate_agencies/a1').branding, null);
  assert.equal(fixture.records.get('affiliate_agencies/a1').updatedBy, 'agency'); assert.equal(fixture.objects.size, 0);
  assert.equal('branding' in (await fixture.request('/me', 'partner')).body.agency, false);
});

test('branding accepts only two full hexadecimal colors and invalid requests leave storage and metadata untouched', async (t) => {
  const fixture = await setup(t);
  const before = structuredClone(fixture.records.get('affiliate_agencies/a1'));
  const invalid = [null, [], '#112233', {}, { primaryColor: '#123456' },
    { primaryColor: '#123', accentColor: '#456789' }, { primaryColor: '#12345678', accentColor: '#456789' },
    { primaryColor: ' #123456', accentColor: '#456789' }, { primaryColor: '#12345G', accentColor: '#456789' },
    { primaryColor: 'url(https://example.test/x)', accentColor: '#456789' }, { primaryColor: 123456, accentColor: '#456789' },
    { primaryColor: '#123456', accentColor: '#456789', background: '#FFFFFF' }];
  for (const branding of invalid) {
    const result = await fixture.request('/agencies/a1/logo', 'agency', 'POST', { ...dataUrl(), branding });
    assert.equal(result.status, 400); assert.equal(result.body.code, 'AFFILIATE_BRANDING_INVALID');
  }
  assert.equal(fixture.objects.size, 0); assert.deepEqual(fixture.records.get('affiliate_agencies/a1'), before);
  const valid = await logos.uploadAffiliateAgencyLogo('a1', dataUrl(), OWNER);
  fixture.records.get('affiliate_agencies/a1').branding = { primaryColor: 'red', accentColor: '#123456' };
  const profile = await domain.getAffiliateProfile('agency', 'a1', OWNER);
  assert.equal(profile.logoUrl, valid.logoUrl); assert.equal('branding' in profile, false);
});

test('disabled agencies cannot manage logos, including suspension during upload; admin retains access', async (t) => {
  const fixture = await setup(t);
  fixture.records.get('affiliate_agencies/a1').status = 'disabled';
  for (const method of ['POST', 'DELETE']) {
    const result = await fixture.request('/agencies/a1/logo', 'agency', method, method === 'POST' ? dataUrl() : undefined);
    assert.equal(result.status, 403); assert.equal(result.body.code, 'AFFILIATE_ACCESS_DISABLED');
  }
  assert.equal((await fixture.request('/agencies/a1/logo', 'owner', 'POST', dataUrl())).status, 200);
  assert.equal((await fixture.request('/agencies/a1/logo', 'owner', 'DELETE')).status, 200);
  fixture.records.get('affiliate_agencies/a1').status = 'active';
  const runTransaction = fixture.db.runTransaction.bind(fixture.db);
  t.mock.method(fixture.db, 'runTransaction', async (callback) => {
    fixture.records.get('affiliate_agencies/a1').status = 'disabled';
    return runTransaction(callback);
  });
  await assert.rejects(logos.uploadAffiliateAgencyLogo('a1', dataUrl(), AGENCY), { code: 'AFFILIATE_ACCESS_DISABLED', status: 403 });
  assert.equal(fixture.objects.size, 0); assert.equal(fixture.records.get('affiliate_agencies/a1').logoVersion, null);
});

test('upload authorization and rollout flag run before the larger JSON parser', async (t) => {
  const fixture = await setup(t);
  const oversized = { dataUrl: 'x'.repeat(3 * 1024 * 1024 + 1) };
  assert.equal((await fixture.request('/agencies/a1/logo', 'partner', 'POST', oversized)).status, 403);
  assert.equal((await fixture.request('/agencies/a2/logo', 'agency', 'POST', oversized)).status, 403);
  process.env.AFFILIATES_ENABLED = 'false';
  const disabled = await fixture.request('/agencies/a1/logo', 'agency', 'POST', oversized);
  assert.equal(disabled.status, 503); assert.equal(disabled.body.code, 'AFFILIATES_NOT_ENABLED');
  assert.equal(fixture.objects.size, 0);
});
test('admin upload persists safe metadata, /me exposes branding and public logo needs no login or bucket permission', async (t) => {
  const fixture = await setup(t);
  const upload = await fixture.request('/agencies/a1/logo', 'owner', 'POST', dataUrl());
  assert.equal(upload.status, 200);
  assert.match(upload.body.item.logoUrl, /^https:\/\/vagafogo-production\.up\.railway\.app\/api\/affiliates\/public\/agencies\/a1\/logo\?v=[a-f0-9]{24}$/);
  assert.equal('logoStoragePath' in upload.body.item, false);
  assert.equal(fixture.objects.size, 1);
  assert.equal((await fixture.request('/me', 'partner')).body.agency.logoUrl, upload.body.item.logoUrl);
  const logo = await fixture.request('/public/agencies/a1/logo');
  assert.equal(logo.status, 200); assert.deepEqual(logo.body, png());
  assert.match(logo.headers.get('content-type'), /^image\/png/);
  assert.equal(logo.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(logo.headers.get('cache-control'), 'public, no-cache, must-revalidate');
  const versioned = await fixture.request('/public/agencies/a1/logo?v=' + upload.body.item.logoVersion);
  assert.match(versioned.headers.get('cache-control'), /immutable/);
  assert.equal((await fixture.request('/public/agencies/a1/logo', undefined, 'GET', undefined, { 'If-None-Match': logo.headers.get('etag') })).status, 304);
});
test('authorized agency upload above global 1MB passes the local 3MB JSON parser', async (t) => {
  const fixture = await setup(t);
  const large = dataUrl(png(64, 64, 1_100_000));
  assert.ok(JSON.stringify(large).length > 1024 * 1024);
  assert.equal((await fixture.request('/agencies/a1/logo', 'agency', 'POST', large)).status, 200);
});
test('replacement rotates API cache version, deletes old private object and refuses stale versions', async (t) => {
  const fixture = await setup(t);
  const first = await fixture.request('/agencies/a1/logo', 'owner', 'POST', dataUrl());
  const second = await fixture.request('/agencies/a1/logo', 'owner', 'POST', dataUrl(JPEG, 'image/jpeg'));
  assert.equal(second.status, 200); assert.notEqual(second.body.item.logoVersion, first.body.item.logoVersion);
  assert.equal(fixture.objects.size, 1);
  assert.equal((await fixture.request('/public/agencies/a1/logo?v=' + first.body.item.logoVersion)).status, 404);
  assert.deepEqual((await fixture.request('/public/agencies/a1/logo')).body, JPEG);
  const removed = await fixture.request('/agencies/a1/logo', 'owner', 'DELETE');
  assert.equal(removed.status, 200); assert.equal('logoUrl' in removed.body.item, false);
  assert.equal((await fixture.request('/public/agencies/a1/logo')).status, 404); assert.equal(fixture.objects.size, 0);
});
test('current logo is resolved into referral/sales while reservation origin and historical commission remain unchanged', async (t) => {
  const fixture = await setup(t);
  const token = 'A'.repeat(43);
  fixture.records.set('affiliate_links/p1', { partnerId: 'p1', agencyId: 'a1', token, status: 'active' });
  fixture.records.set('_affiliate_link_tokens/' + domain.affiliateHash(token), { partnerId: 'p1', agencyId: 'a1', linkId: 'p1' });
  const source = { version: 1, agencyId: 'a1', agencyName: 'Nome histórico', partnerId: 'p1', partnerName: 'Partner',
    commissionRule: { mode: 'fixed', value: 9 }, commissionBeneficiary: 'agency', commissionBeneficiaryId: 'a1', bookedAt: new Date().toISOString() };
  fixture.records.set('reservas/r1', { commercialAttribution: source, status: 'pago', valor: 100, asaasPaymentId: 'pay_r1', data: '2099-01-01' });
  fixture.records.set('_affiliate_payment_evidence/r1', { state: 'paid', value: 100, paymentId: 'pay_r1', paidAt: new Date() });
  const initial = structuredClone(fixture.records.get('reservas/r1'));
  const upload = await logos.uploadAffiliateAgencyLogo('a1', dataUrl(), OWNER);
  assert.equal((await referral.resolveAffiliateLink(token)).agencyLogoUrl, upload.logoUrl);
  const report = await referral.listAffiliateSales(OWNER, {});
  assert.equal(report.items[0].agencyLogoUrl, upload.logoUrl); assert.equal(report.items[0].agencyName, 'Nome histórico');
  assert.equal(report.items[0].commission, 9);
  const external = await referral.listAffiliateSales(PARTNER, {});
  assert.equal(external.items[0].agencyLogoUrl, upload.logoUrl); assert.equal('commissionRule' in external.items[0], false);
  assert.deepEqual(fixture.records.get('reservas/r1'), initial);
  await logos.uploadAffiliateAgencyLogo('a1', dataUrl(WEBP, 'image/webp'), OWNER);
  assert.notEqual((await referral.listAffiliateSales(OWNER, {})).items[0].agencyLogoUrl, upload.logoUrl);
  assert.deepEqual(fixture.records.get('reservas/r1'), initial);
});
test('storage failure or failed profile transaction never exposes an uncommitted logo', async (t) => {
  const fixture = await setup(t);
  const first = await logos.uploadAffiliateAgencyLogo('a1', dataUrl(), OWNER);
  t.mock.method(fixture.db, 'runTransaction', async () => { throw new Error('mock database unavailable'); });
  await assert.rejects(logos.uploadAffiliateAgencyLogo('a1', dataUrl(JPEG, 'image/jpeg'), OWNER), /mock database unavailable/);
  assert.equal(fixture.objects.size, 1);
  assert.equal((await domain.getAffiliateProfile('agency', 'a1', OWNER)).logoUrl, first.logoUrl);
  t.mock.method(admin, 'obterStorageBucketAdmin', () => null);
  await assert.rejects(logos.uploadAffiliateAgencyLogo('a1', dataUrl(), OWNER), { code: 'AFFILIATE_LOGO_STORAGE_UNAVAILABLE' });
});
test('public route does not permit path traversal, arbitrary file reads or tampered storage content', async (t) => {
  const fixture = await setup(t);
  await logos.uploadAffiliateAgencyLogo('a1', dataUrl(), OWNER);
  const record = fixture.records.get('affiliate_agencies/a1');
  const path = record.logoStoragePath;
  record.logoStoragePath = 'crm-campanhas/secret/private.jpg';
  assert.equal((await fixture.request('/public/agencies/a1/logo')).status, 404);
  record.logoStoragePath = path;
  fixture.objects.get(path).buffer = JPEG;
  assert.equal((await fixture.request('/public/agencies/a1/logo')).status, 400);
});
