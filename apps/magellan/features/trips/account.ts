// Le compte du propriétaire, sur le web seulement : l'app est alors servie par son Worker
// (worker/index.ts), qui garde ses voyages une fois connecté sur le hub INDEX. Ailleurs (app
// mobile, `expo start`), il n'y a pas de compte : les voyages restent dans le stockage local.

import { Platform } from 'react-native';

import type { TripsState } from './types';

/** Le propriétaire connecté, ou null (visiteur, hors ligne, pas de Worker). */
export async function fetchSession(): Promise<{ login: string } | null> {
  if (Platform.OS !== 'web') return null;
  try {
    const response = await fetch('/api/session', { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) return null;
    const body = (await response.json()) as { owner?: unknown; login?: unknown };
    return body.owner === true ? { login: typeof body.login === 'string' ? body.login : '' } : null;
  } catch {
    return null;
  }
}

/** Les voyages du compte et leur version ; `state` vaut null tant que rien n'a été enregistré. */
export async function fetchTrips(): Promise<{ state: TripsState | null; rev: number }> {
  const response = await fetch('/api/trips', { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as { state: TripsState | null; rev: number };
}

/** Un autre appareil a enregistré entre-temps : la version du compte est `rev`. */
export class TripsConflict extends Error {
  constructor(readonly rev: number) {
    super('Voyages modifiés ailleurs');
  }
}

/** Remplace les voyages du compte, si sa version est toujours `baseRev` ; rend la nouvelle version. */
export async function saveTrips(state: TripsState, baseRev: number): Promise<number> {
  const response = await fetch('/api/trips', {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ state, baseRev }),
  });
  if (response.status === 409) throw new TripsConflict(((await response.json()) as { rev: number }).rev);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return ((await response.json()) as { rev: number }).rev;
}
