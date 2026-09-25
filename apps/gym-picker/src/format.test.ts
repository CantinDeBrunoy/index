import { describe, expect, it } from 'vitest';
import { formatDistance, formatDuration, formatElapsed } from './format';

// Les formats séparent le nombre de l'unité par une espace insécable (U+00A0).
const nbsp = (text: string) => text.replaceAll(' ', String.fromCharCode(0xa0));

it('sépare le nombre et l’unité par une vraie espace insécable', () => {
  expect(formatDuration(420)).toHaveLength(5);
  expect(formatDuration(420).charCodeAt(1)).toBe(0xa0);
});

describe('formatDuration', () => {
  it.each([
    [0, '1 min'],
    [29, '1 min'],
    [420, '7 min'],
    [449, '7 min'],
    [3540, '59 min'],
    [3600, '1 h 00'],
    [3900, '1 h 05'],
    [7260, '2 h 01'],
  ])('%i s → %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(nbsp(expected));
  });
});

describe('formatDistance', () => {
  it.each([
    [44, '40 m'],
    [850, '850 m'],
    [1000, '1 km'],
    [4230, '4,2 km'],
    [12_040, '12 km'],
  ])('%i m → %s', (meters, expected) => {
    expect(formatDistance(meters)).toBe(nbsp(expected));
  });
});

describe('formatElapsed', () => {
  it.each([
    [1300, '1,3 s'],
    [4000, '4 s'],
  ])('%i ms → %s', (ms, expected) => {
    expect(formatElapsed(ms)).toBe(nbsp(expected));
  });
});
