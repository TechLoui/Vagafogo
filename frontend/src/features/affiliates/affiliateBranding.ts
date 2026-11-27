import type { CSSProperties } from 'react';
import type { AgencyBranding } from './types';

const fallback: AgencyBranding = { primaryColor: '#225F48', accentColor: '#D8C398' };
const hex = /^#[0-9a-f]{6}$/i;
type RGB = [number, number, number];
const rgb = (color: string): RGB => [1, 3, 5].map((start) => Number.parseInt(color.slice(start, start + 2), 16)) as RGB;
const colorHex = (color: RGB) => `#${color.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
const mixWhite = (color: string, white: number) => colorHex(rgb(color).map((value) => value * (1 - white) + 255 * white) as RGB);
const luminance = (color: string) => rgb(color).map((value) => {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}).reduce((total, value, index) => total + value * [0.2126, 0.7152, 0.0722][index], 0);
const whiteContrast = (color: string) => 1.05 / (luminance(color) + 0.05);
const foreground = (color: string) => whiteContrast(color) >= 4.5 ? '#FFFFFF' : '#000000';
const onBackground = (color: string, background = '#FFFFFF') => {
  let channels = rgb(color);
  while ((luminance(background) + 0.05) / (luminance(colorHex(channels)) + 0.05) < 4.5) channels = channels.map((value) => Math.floor(value * 0.9)) as RGB;
  return colorHex(channels);
};

export function normalizeAgencyBranding(value: unknown): AgencyBranding | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).some((key) => !['primaryColor', 'accentColor'].includes(key))
    || typeof raw.primaryColor !== 'string' || !hex.test(raw.primaryColor)
    || typeof raw.accentColor !== 'string' || !hex.test(raw.accentColor)) return null;
  return { primaryColor: raw.primaryColor.toUpperCase(), accentColor: raw.accentColor.toUpperCase() };
}

/** Select dominant logo colors, ignoring transparent margins and neutral backgrounds. */
export function extractAgencyBranding(pixels: ArrayLike<number>): AgencyBranding {
  const buckets = new Map<string, { count: number; sums: RGB; saturation: number }>();
  const stride = Math.max(1, Math.floor(pixels.length / 4 / 20_000)) * 4;
  for (let index = 0; index + 3 < pixels.length; index += stride) {
    const channels: RGB = [pixels[index], pixels[index + 1], pixels[index + 2]];
    const alpha = pixels[index + 3];
    if (!channels.every((value) => Number.isFinite(value) && value >= 0 && value <= 255) || !Number.isFinite(alpha) || alpha < 160 || alpha > 255) continue;
    const maximum = Math.max(...channels), minimum = Math.min(...channels);
    if (minimum > 235 || maximum < 28) continue;
    const saturation = maximum ? (maximum - minimum) / maximum : 0;
    if (saturation < 0.12) continue;
    const key = channels.map((value) => Math.floor(value / 32)).join(':');
    const item = buckets.get(key) ?? { count: 0, sums: [0, 0, 0], saturation: 0 };
    item.count++; item.saturation += saturation;
    channels.forEach((value, channel) => { item.sums[channel] += value; });
    buckets.set(key, item);
  }
  const ranked = Array.from(buckets.entries()).map(([key, item]) => ({
    key, color: item.sums.map((value) => value / item.count) as RGB,
    score: item.count * (0.4 + item.saturation / item.count),
  })).sort((first, second) => second.score - first.score || first.key.localeCompare(second.key));
  if (!ranked.length) return { ...fallback };
  const primary = ranked[0].color;
  const secondary = ranked.slice(1).find((item) => Math.hypot(...item.color.map((value, index) => value - primary[index])) >= 70);
  const primaryColor = colorHex(primary);
  return { primaryColor, accentColor: secondary ? colorHex(secondary.color) : mixWhite(primaryColor, 0.38) };
}

export function brandThemeStyle(branding?: AgencyBranding | null): CSSProperties {
  const palette = normalizeAgencyBranding(branding) ?? fallback;
  const accent = onBackground(palette.primaryColor);
  const soft = mixWhite(palette.primaryColor, 0.92);
  return {
    '--seller-primary': palette.primaryColor,
    '--seller-ink': foreground(palette.primaryColor),
    '--seller-accent': palette.accentColor,
    '--seller-accent-ink': foreground(palette.accentColor),
    '--aff-accent': accent,
    '--aff-accent-text': onBackground(palette.primaryColor, soft),
    '--aff-accent-soft': soft,
    '--aff-surface': mixWhite(palette.primaryColor, 0.96),
    '--aff-bg': mixWhite(palette.primaryColor, 0.96),
    '--aff-border': mixWhite(palette.primaryColor, 0.82),
    '--aff-text': '#16291F',
    '--aff-muted': '#53665B',
  } as CSSProperties;
}
