import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_AGENCY_LOGO_BYTES, validateAgencyLogo, agencyLogoDimensions } from '../src/features/affiliates/affiliateLogo.ts';

test('logo aceita PNG, JPEG e WebP até o limite binário de 2 MB', () => {
  for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
    assert.doesNotThrow(() => validateAgencyLogo({ type, size: MAX_AGENCY_LOGO_BYTES }));
  }
});

test('otimiza logo proporcionalmente e preserva lado mínimo de logos muito largos', () => {
  assert.deepEqual(agencyLogoDimensions(2000, 1000), { width: 512, height: 256 });
  assert.deepEqual(agencyLogoDimensions(100, 200), { width: 100, height: 200 });
  assert.deepEqual(agencyLogoDimensions(4096, 32), { width: 4096, height: 32 });
  for (const [width, height] of [[31, 100], [100, 5000], [4096, 4096], [NaN, 100]]) {
    assert.throws(() => agencyLogoDimensions(width, height));
  }
});

test('logo rejeita SVG, arquivo vazio e tamanho acima do limite antes do envio', () => {
  assert.throws(() => validateAgencyLogo({ type: 'image/svg+xml', size: 200 }));
  assert.throws(() => validateAgencyLogo({ type: 'image/png', size: 0 }));
  assert.throws(() => validateAgencyLogo({ type: 'image/png', size: MAX_AGENCY_LOGO_BYTES + 1 }));
});
