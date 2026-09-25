import type { ApiError, EtaResponse, LatLng } from '../shared/api';

// Filet de sécurité si le réseau ne répond plus : le Worker, lui, abandonne
// TomTom au bout de 4 s.
const TIMEOUT_MS = 8_000;

/** Erreur renvoyée par le Worker, avec un message prêt à afficher. */
export class ApiFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiFailure';
  }
}

export async function fetchEtas({ lat, lng }: LatLng, signal: AbortSignal): Promise<EtaResponse> {
  const response = await fetch('/api/etas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng }),
    signal: AbortSignal.any([signal, AbortSignal.timeout(TIMEOUT_MS)]),
  });
  const body = (await response.json().catch(() => null)) as EtaResponse | ApiError | null;
  if (response.ok && body && 'etas' in body) return body;
  throw new ApiFailure(body && 'error' in body ? body.error : `Erreur du serveur (${response.status}).`);
}
