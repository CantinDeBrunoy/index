import { describe, expect, it } from 'vitest';
import { isLatLng } from './api';

describe('isLatLng', () => {
  it('accepte un point valide', () => {
    expect(isLatLng({ lat: 48.8566, lng: 2.3522 })).toBe(true);
  });

  it.each([
    ['null', null],
    ['une chaîne', '48.85,2.35'],
    ['des nombres en texte', { lat: '48.85', lng: '2.35' }],
    ['une latitude hors limites', { lat: 91, lng: 0 }],
    ['une longitude hors limites', { lat: 0, lng: -181 }],
    ['NaN', { lat: Number.NaN, lng: 0 }],
    ['un champ manquant', { lat: 48.85 }],
  ])('refuse %s', (_, value) => {
    expect(isLatLng(value)).toBe(false);
  });
});
