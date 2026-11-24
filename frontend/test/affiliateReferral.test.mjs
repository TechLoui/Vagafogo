import test from 'node:test';
import assert from 'node:assert/strict';
import { validStoredAffiliateReferral, prepareAffiliateReferral, currentAffiliateContextToken, clearAffiliateReferral } from '../src/features/affiliateReferral.ts';

test('indicação exige referências opacas válidas e não restaura contexto expirado', () => {
  const now = Date.parse('2026-11-24T12:00:00Z');
  const referral = { referralToken: 'a'.repeat(43), contextToken: 'b'.repeat(43), expiresAt: '2026-11-25T12:00:00Z', partnerName: 'Parceiro', agencyName: null };
  assert.deepEqual(validStoredAffiliateReferral(referral, now), referral);
  assert.equal(validStoredAffiliateReferral({ ...referral, expiresAt: '2026-11-23T12:00:00Z' }, now), null);
  assert.equal(validStoredAffiliateReferral({ ...referral, contextToken: 'agency-id' }, now), null);
});

test('metadados do navegador não são transportados como vínculo comercial ou comissão', () => {
  const referral = validStoredAffiliateReferral({ referralToken: 'a'.repeat(43), contextToken: 'b'.repeat(43), expiresAt: '2099-01-01T00:00:00Z', partnerName: 'Parceiro', agencyName: 'Agência', agencyId: 'forged', commissionRule: { value: 99 } });
  assert.equal('agencyId' in referral, false);
  assert.equal('commissionRule' in referral, false);
});

test('storage bloqueado preserva o contexto para eventos, sem reemitir referências ou reutilizar outro link', async () => {
  const previousWindow = globalThis.window;
  const previousFetch = globalThis.fetch;
  const reference = 'c'.repeat(43);
  const context = 'd'.repeat(43);
  let requests = 0;
  globalThis.window = {
    location: { search: `?ref=${reference}`, href: `https://vagafogo.com.br/reservar?ref=${reference}` },
    sessionStorage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); }, removeItem() {} },
    setTimeout, clearTimeout, history: { replaceState() {} },
  };
  globalThis.fetch = async () => {
    requests++;
    return { ok: true, json: async () => ({ contextToken: context, expiresAt: '2099-01-01T00:00:00Z', partnerName: 'Parceiro', agencyName: 'Agência' }) };
  };
  try {
    await Promise.all([prepareAffiliateReferral(), prepareAffiliateReferral()]);
    assert.equal(currentAffiliateContextToken(), context);
    await prepareAffiliateReferral();
    assert.equal(requests, 1);
    window.location.search = `?ref=${'e'.repeat(43)}`;
    assert.equal(currentAffiliateContextToken(), undefined);
    clearAffiliateReferral();
    assert.equal(currentAffiliateContextToken(), undefined);
  } finally {
    clearAffiliateReferral();
    globalThis.window = previousWindow;
    globalThis.fetch = previousFetch;
  }
});
