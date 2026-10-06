import { useCallback, useEffect, useRef, useState } from 'react';
import type { GymEta, LatLng } from '../shared/api';
import { ApiFailure, fetchEtas } from './api';
import { FAST_FIX, GeoError, getPosition, type GeoFailure } from './geolocation';
import { loadHome } from './home';

/** D'où part le calcul : la position du moment, ou le domicile quand le GPS fait défaut. */
export type Departure = { kind: 'gps' } | { kind: 'home'; because: GeoFailure };

export type Result = {
  etas: GymEta[];
  departure: Departure;
  computedAt: Date;
  /** De l'appui à l'affichage. Le critère de réussite du projet : moins de 5 s. */
  elapsedMs: number;
};

export type EtasState = {
  phase: 'locating' | 'computing' | 'done' | 'failed';
  /** Dernier résultat obtenu, gardé à l'écran pendant une actualisation. */
  result: Result | null;
  error: string | null;
};

// iOS garde la web app en mémoire : quand on y revient, on recalcule si la
// dernière recherche date de plus d'une minute.
const STALE_AFTER_MS = 60_000;

const GEO_ERRORS: Record<GeoFailure, string> = {
  denied: 'Localisation refusée. Autorise-la dans les réglages de l’iPhone (Service de localisation), puis réessaie.',
  unavailable: 'Position introuvable pour le moment. Réessaie, ou enregistre un domicile de secours.',
  timeout: 'La position met trop de temps à arriver. Réessaie, ou enregistre un domicile de secours.',
  unsupported: 'Ce navigateur ne donne pas accès à la position.',
};

export function useEtas() {
  const [state, setState] = useState<EtasState>({ phase: 'locating', result: null, error: null });
  const inFlight = useRef<AbortController | null>(null);
  const lastAttemptAt = useRef(0);

  const refresh = useCallback(async () => {
    // Une nouvelle recherche annule la précédente (double appui, retour dans l'app…).
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const { signal } = controller;
    const startedAt = performance.now();
    lastAttemptAt.current = Date.now();

    setState((s) => ({ ...s, phase: 'locating', error: null }));
    const start = await findDeparture();
    if (signal.aborted) return;
    if ('error' in start) {
      setState((s) => ({ ...s, phase: 'failed', error: start.error }));
      return;
    }

    setState((s) => ({ ...s, phase: 'computing' }));
    try {
      const { etas, computedAt } = await fetchEtas(start.point, signal);
      if (signal.aborted) return;
      setState({
        phase: 'done',
        error: null,
        result: {
          etas,
          departure: start.departure,
          computedAt: new Date(computedAt),
          elapsedMs: performance.now() - startedAt,
        },
      });
    } catch (error) {
      if (signal.aborted) return;
      const message =
        error instanceof ApiFailure ? error.message : 'Impossible de joindre le serveur. Vérifie ta connexion.';
      setState((s) => ({ ...s, phase: 'failed', error: message }));
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => inFlight.current?.abort();
  }, [refresh]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastAttemptAt.current > STALE_AFTER_MS) {
        void refresh();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [refresh]);

  return { state, refresh };
}

async function findDeparture(): Promise<{ point: LatLng; departure: Departure } | { error: string }> {
  try {
    return { point: await getPosition(FAST_FIX), departure: { kind: 'gps' } };
  } catch (error) {
    const because = error instanceof GeoError ? error.reason : 'unavailable';
    const home = loadHome();
    if (home) return { point: home, departure: { kind: 'home', because } };
    return { error: GEO_ERRORS[because] };
  }
}
