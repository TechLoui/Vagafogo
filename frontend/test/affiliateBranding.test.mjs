import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAgencyBranding,
  extractAgencyBranding,
  brandThemeStyle,
} from '../src/features/affiliates/affiliateBranding.ts';

const fallback = { primaryColor: '#225F48', accentColor: '#D8C398' };
const rgba = (...samples) => new Uint8ClampedArray(samples.flatMap(([color, count]) =>
  Array.from({ length: count }, () => color).flat()));
const rgb = (hex) => hex.slice(1).match(/../g).map((channel) => parseInt(channel, 16));

// Independent relative-luminance calculation checks visible color pairs,
// rather than duplicating the palette's darkening/blending implementation.
const luminance = (hex) => rgb(hex).map((channel) => channel / 255)
  .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
const contrast = (foreground, background) => {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
};
const assertReadableTheme = (branding) => {
  const style = brandThemeStyle(branding);
  for (const token of ['--seller-primary', '--seller-ink', '--seller-accent', '--seller-accent-ink', '--aff-accent', '--aff-accent-text', '--aff-accent-soft', '--aff-surface', '--aff-border']) {
    assert.match(style[token], /^#[0-9a-f]{6}$/i, `${token} must contain a complete hex color`);
  }
  for (const [foreground, background] of [
    [style['--seller-ink'], style['--seller-primary']],
    [style['--seller-accent-ink'], style['--seller-accent']],
    ['#FFFFFF', style['--aff-accent']],
    [style['--aff-accent-text'], '#FFFFFF'],
    [style['--aff-accent-text'], style['--aff-accent-soft']],
  ]) {
    assert.ok(contrast(foreground, background) >= 4.5, `${foreground} on ${background} must remain readable`);
  }
  return style;
};

test('branding normaliza somente o par completo de cores hex e não altera o DTO recebido', () => {
  const input = { primaryColor: '#12abef', accentColor: '#fedc09' };
  assert.deepEqual(normalizeAgencyBranding(input), { primaryColor: '#12ABEF', accentColor: '#FEDC09' });
  assert.deepEqual(input, { primaryColor: '#12abef', accentColor: '#fedc09' });
});

test('branding rejeita cores parciais e strings que poderiam injetar CSS', () => {
  for (const value of [null, undefined, [], {}, '#123456',
    { primaryColor: '#123456' }, { accentColor: '#123456' },
    { primaryColor: '#123456', accentColor: '#ABCDEF', backgroundImage: 'url(https://synthetic.invalid)' },
    ...['#fff', '#12345678', '#GG0000', 'red', 'transparent', 'var(--unsafe)', 'url(https://synthetic.invalid)', '#123456;display:none', 123456]
      .flatMap((color) => [{ primaryColor: color, accentColor: '#123456' }, { primaryColor: '#123456', accentColor: color }]),
  ]) {
    assert.equal(normalizeAgencyBranding(value), null);
    assert.deepEqual(brandThemeStyle(value), brandThemeStyle(null), 'Invalid DTOs cannot inject arbitrary CSS theme values');
  }
});

test('extração usa as cores visíveis predominantes sem deixar pixels transparentes dominar a marca', () => {
  const pixels = rgba([[210, 45, 55, 255], 48], [[35, 75, 210, 255], 16], [[20, 220, 40, 0], 400]);
  const before = pixels.slice();
  const branding = extractAgencyBranding(pixels);
  assert.deepEqual(normalizeAgencyBranding(branding), branding);
  const [red, green, blue] = rgb(branding.primaryColor);
  assert.ok(red > green * 2 && red > blue * 2, 'The dominant opaque red should remain the primary hue');
  const [accentRed, accentGreen, accentBlue] = rgb(branding.accentColor);
  assert.ok(accentBlue > accentRed && accentBlue > accentGreen, 'The secondary visible blue should remain the accent hue');
  assert.deepEqual(pixels, before);
  assert.deepEqual(extractAgencyBranding(pixels), branding, 'The same logo must produce a stable palette');
});

test('extração respeita o limiar de transparência de 160 e ignora branco, preto e cinzas', () => {
  const branding = extractAgencyBranding(rgba(
    [[210, 45, 55, 160], 20], [[35, 75, 210, 159], 200],
    [[255, 255, 255, 255], 200], [[0, 0, 0, 255], 200], [[128, 128, 128, 255], 200],
  ));
  const [red, green, blue] = rgb(branding.primaryColor);
  assert.ok(red > green * 2 && red > blue * 2);
});

test('logo sem cores úteis mantém uma paleta Vagafogo completa e legível', () => {
  for (const pixels of [new Uint8ClampedArray(), rgba([[255, 255, 255, 255], 12], [[0, 0, 0, 255], 12], [[128, 128, 128, 255], 12]), rgba([[180, 30, 50, 0], 12])]) {
    assert.deepEqual(extractAgencyBranding(pixels), fallback);
  }
  assert.deepEqual(brandThemeStyle(null), brandThemeStyle(fallback));
  assert.deepEqual(brandThemeStyle(undefined), brandThemeStyle(fallback));
  assertReadableTheme(fallback);
});

test('tema mantém contraste nos botões e na identidade inclusive em marcas claras, escuras e saturadas', () => {
  const colors = ['#FFFFFF', '#000000', '#FFFF00', '#00FF00', '#00FFFF', '#FF0000', '#0000FF', '#FF00FF', '#777777', '#F8F5EF', '#102D28'];
  for (const primaryColor of colors) for (const accentColor of colors) {
    const input = { primaryColor, accentColor };
    const copy = { ...input };
    const style = assertReadableTheme(input);
    assert.equal(style['--seller-primary'].toUpperCase(), primaryColor, 'The original brand color is preserved in identity surfaces');
    assert.equal(style['--seller-accent'].toUpperCase(), accentColor);
    assert.deepEqual(input, copy);
  }
});

test('tema mantém contraste em uma amostra determinística do espaço RGB', () => {
  let seed = 20261127;
  const color = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return '#' + (seed & 0xffffff).toString(16).padStart(6, '0').toUpperCase();
  };
  for (let index = 0; index < 80; index++) assertReadableTheme({ primaryColor: color(), accentColor: color() });
});
