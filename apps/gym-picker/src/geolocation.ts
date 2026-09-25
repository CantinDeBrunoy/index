import type { LatLng } from '../shared/api';

export type GeoFailure = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export class GeoError extends Error {
  readonly reason: GeoFailure;

  constructor(reason: GeoFailure) {
    super(`Géolocalisation impossible : ${reason}`);
    this.name = 'GeoError';
    this.reason = reason;
  }
}

/**
 * Position rapide pour le calcul : la précision Wi-Fi/antenne suffit pour un
 * temps de trajet, et une position de moins de 2 min est reprise telle quelle.
 * Le délai ne court qu'une fois l'autorisation accordée.
 */
export const FAST_FIX: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 2 * 60_000,
  timeout: 4_000,
};

/** Position précise, pour enregistrer le domicile une fois pour toutes. */
export const PRECISE_FIX: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 20_000,
};

// Codes de GeolocationPositionError.
const REASONS: Record<number, GeoFailure> = { 1: 'denied', 2: 'unavailable', 3: 'timeout' };

export function getPosition(options: PositionOptions): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new GeoError('unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      (error) => reject(new GeoError(REASONS[error.code] ?? 'unavailable')),
      options,
    );
  });
}
