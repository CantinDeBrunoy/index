import type { CountryCode } from '@/features/trips/types';

/**
 * Table de référence des pays — départ minimal (Phase 0/1).
 * `lat`/`lng` = centroïde approximatif (sert à centrer/poser un marqueur).
 * La table complète (~250 pays) + les frontières GeoJSON arriveront en Phase 1.
 */
export type CountryInfo = {
  name: string; // nom en français
  flag: string; // emoji drapeau
  lat: number;
  lng: number;
};

export const COUNTRIES: Record<CountryCode, CountryInfo> = {
  FRA: { name: 'France', flag: '🇫🇷', lat: 46.6, lng: 2.2 },
  ESP: { name: 'Espagne', flag: '🇪🇸', lat: 40.4, lng: -3.7 },
  ITA: { name: 'Italie', flag: '🇮🇹', lat: 41.9, lng: 12.5 },
  PRT: { name: 'Portugal', flag: '🇵🇹', lat: 39.5, lng: -8.0 },
  DEU: { name: 'Allemagne', flag: '🇩🇪', lat: 51.2, lng: 10.4 },
  GBR: { name: 'Royaume-Uni', flag: '🇬🇧', lat: 54.0, lng: -2.0 },
  USA: { name: 'États-Unis', flag: '🇺🇸', lat: 39.8, lng: -98.6 },
  CAN: { name: 'Canada', flag: '🇨🇦', lat: 56.1, lng: -106.3 },
  MEX: { name: 'Mexique', flag: '🇲🇽', lat: 23.6, lng: -102.6 },
  BRA: { name: 'Brésil', flag: '🇧🇷', lat: -14.2, lng: -51.9 },
  MAR: { name: 'Maroc', flag: '🇲🇦', lat: 31.8, lng: -7.1 },
  JPN: { name: 'Japon', flag: '🇯🇵', lat: 36.2, lng: 138.3 },
  THA: { name: 'Thaïlande', flag: '🇹🇭', lat: 15.9, lng: 100.9 },
  AUS: { name: 'Australie', flag: '🇦🇺', lat: -25.3, lng: 133.8 },
};

/** Nom affichable d'un pays, avec repli sur le code si inconnu. */
export function countryName(code: CountryCode): string {
  return COUNTRIES[code]?.name ?? code;
}

/** Drapeau emoji d'un pays, avec repli neutre si inconnu. */
export function countryFlag(code: CountryCode): string {
  return COUNTRIES[code]?.flag ?? '🏳️';
}
