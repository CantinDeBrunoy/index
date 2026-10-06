import type { LatLng, Leg } from '../shared/api';

const MATRIX_URL = 'https://api.tomtom.com/routing/matrix/2';

// Le critère de réussite est un résultat en moins de 5 s, géolocalisation
// comprise : au-delà de 4 s, mieux vaut une erreur claire qu'une attente.
const TIMEOUT_MS = 4_000;

/** Une case de la matrice : `routeSummary` en cas de succès, `detailedError` sinon. */
export type MatrixCell = {
  originIndex: number;
  destinationIndex: number;
  routeSummary?: {
    lengthInMeters: number;
    travelTimeInSeconds: number;
    trafficDelayInSeconds: number;
  };
  detailedError?: { code: string; message?: string };
};

export class TomTomError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`TomTom a répondu HTTP ${status}`);
    this.name = 'TomTomError';
    this.status = status;
  }
}

/**
 * Temps de trajet en voiture avec le trafic en temps réel, d'un départ vers
 * toutes les destinations en un seul appel (Matrix Routing v2, synchrone).
 * Renvoie un trajet par destination, dans le même ordre, ou `null` quand
 * TomTom n'a pas trouvé d'itinéraire (hors zone, point loin d'une route…).
 */
export async function fetchMatrix(
  apiKey: string,
  origin: LatLng,
  destinations: readonly LatLng[],
): Promise<(Leg | null)[]> {
  const response = await fetch(`${MATRIX_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origins: [{ point: toPoint(origin) }],
      destinations: destinations.map((destination) => ({ point: toPoint(destination) })),
      // `traffic: 'live'` n'est accepté qu'avec un départ daté.
      options: { departAt: 'now', traffic: 'live', travelMode: 'car', routeType: 'fastest' },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new TomTomError(response.status);

  const { data } = (await response.json()) as { data: MatrixCell[] };
  return toLegs(data, destinations.length);
}

export function toLegs(cells: readonly MatrixCell[], count: number): (Leg | null)[] {
  const legs: (Leg | null)[] = Array.from({ length: count }, () => null);
  for (const { destinationIndex, routeSummary } of cells) {
    if (!routeSummary || destinationIndex < 0 || destinationIndex >= count) continue;
    legs[destinationIndex] = {
      durationSec: routeSummary.travelTimeInSeconds,
      trafficDelaySec: routeSummary.trafficDelayInSeconds,
      distanceM: routeSummary.lengthInMeters,
    };
  }
  return legs;
}

function toPoint({ lat, lng }: LatLng) {
  return { latitude: lat, longitude: lng };
}
