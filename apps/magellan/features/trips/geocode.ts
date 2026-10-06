// Géocodage de villes via l'API open-meteo (gratuite, sans clé, CORS *).
// Renvoie des coordonnées précises + le pays, pour créer une étape.

import { alpha2ToAlpha3 } from '@/data/isoCodes';
import type { CountryCode } from './types';

export type GeoResult = {
  name: string;
  lat: number;
  lng: number;
  alpha2: string; // alpha-2 minuscule (drapeau)
  country: CountryCode; // alpha-3 (coloration pays)
  countryName: string; // nom du pays en français
  admin1?: string; // région/état, pour désambiguïser
};

type OpenMeteoResult = {
  name: string;
  latitude: number;
  longitude: number;
  country_code?: string;
  country?: string;
  admin1?: string;
};

/** Recherche jusqu'à 6 villes correspondant à `query`. Tableau vide si rien/erreur. */
export async function searchCity(query: string): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const url =
    'https://geocoding-api.open-meteo.com/v1/search' +
    `?name=${encodeURIComponent(q)}&count=6&language=fr&format=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = (await res.json()) as { results?: OpenMeteoResult[] };
    return (json.results ?? []).map((r) => {
      const a2 = (r.country_code ?? '').toLowerCase();
      return {
        name: r.name,
        lat: r.latitude,
        lng: r.longitude,
        alpha2: a2,
        country: alpha2ToAlpha3(a2),
        countryName: r.country ?? '',
        admin1: r.admin1,
      };
    });
  } catch {
    return [];
  }
}
