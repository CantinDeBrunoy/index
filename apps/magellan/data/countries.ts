import type { CountryCode } from '@/features/trips/types';

/**
 * Table de référence des pays — départ minimal (Phase 0/1).
 * `lat`/`lng` = centroïde approximatif (sert à centrer/poser un marqueur).
 * `alpha2` = code ISO 3166-1 alpha-2 (minuscule), utilisé pour les images flagcdn.
 * La table complète (~250 pays) + les frontières GeoJSON arriveront en Phase 1.
 */
export type CountryInfo = {
  name: string; // nom en français
  flag: string; // emoji drapeau
  alpha2: string; // code ISO alpha-2 (minuscule), ex. "fr"
  lat: number;
  lng: number;
};

export const COUNTRIES: Record<CountryCode, CountryInfo> = {
  FRA: { name: 'France', flag: '🇫🇷', alpha2: 'fr', lat: 46.6, lng: 2.2 },
  ESP: { name: 'Espagne', flag: '🇪🇸', alpha2: 'es', lat: 40.4, lng: -3.7 },
  ITA: { name: 'Italie', flag: '🇮🇹', alpha2: 'it', lat: 41.9, lng: 12.5 },
  PRT: { name: 'Portugal', flag: '🇵🇹', alpha2: 'pt', lat: 39.5, lng: -8.0 },
  DEU: { name: 'Allemagne', flag: '🇩🇪', alpha2: 'de', lat: 51.2, lng: 10.4 },
  GBR: { name: 'Royaume-Uni', flag: '🇬🇧', alpha2: 'gb', lat: 54.0, lng: -2.0 },
  USA: { name: 'États-Unis', flag: '🇺🇸', alpha2: 'us', lat: 39.8, lng: -98.6 },
  CAN: { name: 'Canada', flag: '🇨🇦', alpha2: 'ca', lat: 56.1, lng: -106.3 },
  MEX: { name: 'Mexique', flag: '🇲🇽', alpha2: 'mx', lat: 23.6, lng: -102.6 },
  BRA: { name: 'Brésil', flag: '🇧🇷', alpha2: 'br', lat: -14.2, lng: -51.9 },
  MAR: { name: 'Maroc', flag: '🇲🇦', alpha2: 'ma', lat: 31.8, lng: -7.1 },
  JPN: { name: 'Japon', flag: '🇯🇵', alpha2: 'jp', lat: 36.2, lng: 138.3 },
  THA: { name: 'Thaïlande', flag: '🇹🇭', alpha2: 'th', lat: 15.9, lng: 100.9 },
  AUS: { name: 'Australie', flag: '🇦🇺', alpha2: 'au', lat: -25.3, lng: 133.8 },
};

/** Nom affichable d'un pays, avec repli sur le code si inconnu. */
export function countryName(code: CountryCode): string {
  return COUNTRIES[code]?.name ?? code;
}

/** Drapeau emoji d'un pays, avec repli neutre si inconnu. */
export function countryFlag(code: CountryCode): string {
  return COUNTRIES[code]?.flag ?? '🏳️';
}

/** Code ISO alpha-2 (minuscule) d'un pays, ou chaîne vide si inconnu. */
export function countryAlpha2(code: CountryCode): string {
  return COUNTRIES[code]?.alpha2 ?? '';
}
