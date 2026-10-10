import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import { INITIAL_TRIPS } from '@/data/initialTrips';
import { alpha3ToAlpha2 } from '@/data/isoCodes';
import { TripsConflict, fetchSession, fetchTrips, saveTrips } from './account';
import type { CountryCode, PhotoRef, Trip, TripStop, TripsState } from './types';

const STORAGE_KEY = 'magellan.trips.v9';

/**
 * Complète les champs manquants des données chargées (compat données plus anciennes) :
 * `alpha2` est re-déduit du code pays alpha-3, sans perdre les voyages enregistrés.
 * Les photos ne gardent que des références valides (l'ancien champ `string[]` n'a
 * jamais été rempli).
 */
function migrate(state: TripsState): TripsState {
  return {
    trips: (state.trips ?? []).map((t) => ({
      ...t,
      stops: (t.stops ?? []).map((s) => ({
        ...s,
        alpha2: s.alpha2 || alpha3ToAlpha2(s.country),
        countryName: s.countryName ?? '',
        photos: s.photos?.filter((p) => typeof p === 'object' && p !== null && !!p.path),
      })),
    })),
  };
}

/** Ajoute des photos à une étape, sans doublon (même chemin), triées par date de prise de vue. */
function mergePhotos(current: PhotoRef[] = [], added: PhotoRef[]): PhotoRef[] {
  const byPath = new Map(current.map((p) => [p.path, p]));
  for (const p of added) byPath.set(p.path, p);
  return [...byPath.values()].sort((a, b) => (a.takenAt ?? '').localeCompare(b.takenAt ?? ''));
}

/** Palette de couleurs attribuées aux tracés des voyages. */
const PALETTE = ['#ffd166', '#06d6a0', '#ef476f', '#118ab2', '#f78c6b', '#b388eb'];

/** État de départ d'un visiteur : les voyages de démonstration. */
const SEED: TripsState = { trips: INITIAL_TRIPS };
const EMPTY: TripsState = { trips: [] };

/** Délai entre la dernière modification et l'envoi au compte, et avant un nouvel essai après un échec. */
const SAVE_DELAY_MS = 800;
const RETRY_DELAY_MS = 10_000;

/**
 * Où vivent les voyages : dans ce navigateur ou cet appareil (visiteur, app mobile), ou sur le compte
 * du propriétaire connecté sur le hub (web). `unavailable` : connecté mais voyages illisibles, rien ne
 * s'enregistre pour ne jamais écraser le compte ; `conflict` : modifiés sur un autre appareil, la
 * version du compte vient d'être rechargée. `checking` : sur le web, le temps de savoir qui regarde.
 */
export type TripsSync =
  | { mode: 'checking' }
  | { mode: 'local' }
  | { mode: 'account'; login: string; status: 'saved' | 'saving' | 'error' | 'conflict' | 'unavailable' };

/** Pour le propriétaire connecté : où en sont ses voyages sur son compte. */
const SYNC_LABEL: Record<Extract<TripsSync, { mode: 'account' }>['status'], string> = {
  saved: 'Enregistrés sur mon compte',
  saving: 'Enregistrement sur mon compte…',
  error: 'Pas encore enregistrés : nouvel essai dans un instant',
  conflict: 'Modifiés sur un autre appareil : voici leur dernière version',
  unavailable: 'Illisibles pour le moment : recharge la page',
};

/** Où sont les voyages, pour le propriétaire connecté comme pour un visiteur du web (rien sur l'app mobile). */
export function syncLabel(sync: TripsSync): string | undefined {
  if (sync.mode === 'account') return SYNC_LABEL[sync.status];
  // Un visiteur : ses changements ne touchent pas les voyages du propriétaire, il doit le savoir.
  if (sync.mode === 'local' && Platform.OS === 'web') return 'Gardés dans ce navigateur';
  return undefined;
}

type TripsContextValue = {
  /** `true` tant que l'état n'a pas été chargé (compte ou stockage local). */
  loading: boolean;
  sync: TripsSync;
  trips: Trip[];
  /** Toutes les étapes, à plat (pour les drapeaux et les stats). */
  cities: TripStop[];
  /** Pays visités (ISO3), dérivés des étapes — pour colorer le globe en vert. */
  visitedCountries: CountryCode[];
  addTrip: (name: string) => string;
  removeTrip: (tripId: string) => void;
  addStop: (tripId: string, stop: Omit<TripStop, 'id'>) => void;
  removeStop: (tripId: string, stopId: string) => void;
  /** Ajoute des photos à plusieurs étapes d'un coup (import groupé), par id d'étape. */
  addPhotos: (byStop: Record<string, PhotoRef[]>) => void;
};

const TripsContext = createContext<TripsContextValue | null>(null);

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function TripsProvider({ children }: { children: ReactNode }) {
  // Sur le web, rien tant qu'on ne sait pas qui regarde : ni la démo au propriétaire, ni l'inverse.
  const [state, setState] = useState<TripsState>(Platform.OS === 'web' ? EMPTY : SEED);
  const [loading, setLoading] = useState(true);
  const [sync, setSync] = useState<TripsSync>(Platform.OS === 'web' ? { mode: 'checking' } : { mode: 'local' });

  // Compte : la version connue du compte et ce qui y est enregistré (JSON), l'état à envoyer, un envoi en cours.
  const account = useRef<{ rev: number; saved: string } | null>(null);
  const latest = useRef(state);
  latest.current = state;
  const sending = useRef(false);
  const retry = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setStatus = useCallback((status: Extract<TripsSync, { mode: 'account' }>['status']) => {
    setSync((s) => (s.mode === 'account' ? { ...s, status } : s));
  }, []);

  /** Prend la version du compte (au chargement, après un conflit, au retour sur l'onglet). */
  const adopt = useCallback((remote: { state: TripsState | null; rev: number }) => {
    const next = remote.state ? migrate(remote.state) : EMPTY;
    account.current = { rev: remote.rev, saved: JSON.stringify(next) };
    setState(next);
  }, []);

  // Chargement initial : les voyages du compte si le propriétaire est connecté, sinon le stockage local.
  useEffect(() => {
    let active = true;
    (async () => {
      const session = await fetchSession();
      if (session) {
        try {
          const remote = await fetchTrips();
          if (!active) return;
          adopt(remote);
          setSync({ mode: 'account', login: session.login, status: 'saved' });
        } catch {
          if (active) setSync({ mode: 'account', login: session.login, status: 'unavailable' });
        }
        return;
      }
      const raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
      if (!active) return;
      setSync({ mode: 'local' });
      try {
        setState(raw ? migrate(JSON.parse(raw) as TripsState) : SEED);
      } catch {
        // Stockage illisible : on repart du SEED, sans bloquer l'app.
        setState(SEED);
      }
    })().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [adopt]);

  /** Envoie l'état au compte, un envoi à la fois ; relance tant qu'il reste des modifications. */
  const send = useCallback(async () => {
    const known = account.current;
    if (!known || sending.current) return;
    const payload = latest.current;
    const json = JSON.stringify(payload);
    if (json === known.saved) return;
    sending.current = true;
    clearTimeout(retry.current);
    setStatus('saving');
    let again = false;
    try {
      const rev = await saveTrips(payload, known.rev);
      account.current = { rev, saved: json };
      setStatus('saved');
      again = JSON.stringify(latest.current) !== json;
    } catch (error) {
      if (error instanceof TripsConflict) {
        // Un autre appareil a enregistré entre-temps : sa version l'emporte, et on le dit.
        const remote = await fetchTrips().catch(() => null);
        if (remote) adopt(remote);
        setStatus(remote ? 'conflict' : 'error');
      } else {
        setStatus('error');
        retry.current = setTimeout(() => void sendRef.current(), RETRY_DELAY_MS);
      }
    } finally {
      sending.current = false;
    }
    if (again) void sendRef.current();
  }, [adopt, setStatus]);
  const sendRef = useRef(send);
  sendRef.current = send;

  // Persistance à chaque changement, une fois l'état initial chargé : au compte, ou dans le stockage local.
  useEffect(() => {
    if (loading) return;
    if (sync.mode === 'local') {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {
        // Échec d'écriture non bloquant ; l'état reste en mémoire.
      });
      return;
    }
    if (sync.mode !== 'account' || sync.status === 'unavailable' || JSON.stringify(state) === account.current?.saved) return;
    const timer = setTimeout(() => void sendRef.current(), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, loading, sync]);

  // Retour sur l'onglet : reprendre la version du compte si un autre appareil l'a changée (et rien n'attend ici).
  const isAccount = sync.mode === 'account' && sync.status !== 'unavailable';
  useEffect(() => {
    if (!isAccount || typeof document === 'undefined') return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || sending.current) return;
      const known = account.current;
      if (!known || JSON.stringify(latest.current) !== known.saved) return;
      fetchTrips()
        .then((remote) => {
          if (remote.rev !== account.current?.rev && JSON.stringify(latest.current) === account.current?.saved) adopt(remote);
        })
        .catch(() => {
          // Hors ligne : on garde ce qu'on a.
        });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isAccount, adopt]);

  useEffect(() => () => clearTimeout(retry.current), []);

  const addTrip = useCallback((name: string) => {
    const id = makeId();
    setState((prev) => ({
      trips: [
        ...prev.trips,
        { id, name: name.trim() || 'Nouveau voyage', color: PALETTE[prev.trips.length % PALETTE.length], stops: [] },
      ],
    }));
    return id;
  }, []);

  const removeTrip = useCallback((tripId: string) => {
    setState((prev) => ({ trips: prev.trips.filter((t) => t.id !== tripId) }));
  }, []);

  const addStop = useCallback((tripId: string, stop: Omit<TripStop, 'id'>) => {
    setState((prev) => ({
      trips: prev.trips.map((t) =>
        t.id === tripId ? { ...t, stops: [...t.stops, { ...stop, id: makeId() }] } : t,
      ),
    }));
  }, []);

  const removeStop = useCallback((tripId: string, stopId: string) => {
    setState((prev) => ({
      trips: prev.trips.map((t) =>
        t.id === tripId ? { ...t, stops: t.stops.filter((s) => s.id !== stopId) } : t,
      ),
    }));
  }, []);

  const addPhotos = useCallback((byStop: Record<string, PhotoRef[]>) => {
    setState((prev) => ({
      trips: prev.trips.map((t) => ({
        ...t,
        stops: t.stops.map((s) => (byStop[s.id] ? { ...s, photos: mergePhotos(s.photos, byStop[s.id]) } : s)),
      })),
    }));
  }, []);

  const value = useMemo<TripsContextValue>(() => {
    const cities = state.trips.flatMap((t) => t.stops);
    const visitedCountries = Array.from(new Set(cities.map((s) => s.country)));
    return {
      loading,
      sync,
      trips: state.trips,
      cities,
      visitedCountries,
      addTrip,
      removeTrip,
      addStop,
      removeStop,
      addPhotos,
    };
  }, [loading, sync, state, addTrip, removeTrip, addStop, removeStop, addPhotos]);

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips(): TripsContextValue {
  const ctx = useContext(TripsContext);
  if (!ctx) throw new Error('useTrips doit être utilisé dans un <TripsProvider>.');
  return ctx;
}
