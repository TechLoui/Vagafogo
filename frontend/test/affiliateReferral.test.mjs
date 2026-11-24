import test from 'node:test';
import assert from 'node:assert/strict';
import { validStoredAffiliateReferral } from '../src/features/affiliateReferral.ts';

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
