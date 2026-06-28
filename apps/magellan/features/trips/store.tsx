import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { INITIAL_TRIPS } from '@/data/initialTrips';
import { alpha3ToAlpha2 } from '@/data/isoCodes';
import type { CountryCode, Trip, TripStop, TripsState } from './types';

const STORAGE_KEY = 'magellan.trips.v8';

/**
 * Complète les champs manquants des données chargées (compat données plus anciennes) :
 * `alpha2` est re-déduit du code pays alpha-3, sans perdre les voyages enregistrés.
 */
function migrate(state: TripsState): TripsState {
  return {
    trips: (state.trips ?? []).map((t) => ({
      ...t,
      stops: (t.stops ?? []).map((s) => ({
        ...s,
        alpha2: s.alpha2 || alpha3ToAlpha2(s.country),
        countryName: s.countryName ?? '',
      })),
    })),
  };
}

/** Palette de couleurs attribuées aux tracés des voyages. */
const PALETTE = ['#ffd166', '#06d6a0', '#ef476f', '#118ab2', '#f78c6b', '#b388eb'];

/** État de départ : les voyages réels de l'utilisateur. */
const SEED: TripsState = { trips: INITIAL_TRIPS };

type TripsContextValue = {
  /** `true` tant que l'état n'a pas été chargé depuis le stockage local. */
  loading: boolean;
  trips: Trip[];
  /** Toutes les étapes, à plat (pour les drapeaux et les stats). */
  cities: TripStop[];
  /** Pays visités (ISO3), dérivés des étapes — pour colorer le globe en vert. */
  visitedCountries: CountryCode[];
  addTrip: (name: string) => string;
  removeTrip: (tripId: string) => void;
  addStop: (tripId: string, stop: Omit<TripStop, 'id'>) => void;
  removeStop: (tripId: string, stopId: string) => void;
};

const TripsContext = createContext<TripsContextValue | null>(null);

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function TripsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TripsState>(SEED);
  const [loading, setLoading] = useState(true);

  // Chargement initial depuis le stockage local.
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (active && raw) setState(migrate(JSON.parse(raw) as TripsState));
      })
      .catch(() => {
        // Stockage illisible : on garde le SEED, sans bloquer l'app.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Persistance à chaque changement, une fois l'état initial chargé.
  useEffect(() => {
    if (loading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {
      // Échec d'écriture non bloquant ; l'état reste en mémoire.
    });
  }, [state, loading]);

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

  const value = useMemo<TripsContextValue>(() => {
    const cities = state.trips.flatMap((t) => t.stops);
    const visitedCountries = Array.from(new Set(cities.map((s) => s.country)));
    return {
      loading,
      trips: state.trips,
      cities,
      visitedCountries,
      addTrip,
      removeTrip,
      addStop,
      removeStop,
    };
  }, [loading, state, addTrip, removeTrip, addStop, removeStop]);

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips(): TripsContextValue {
  const ctx = useContext(TripsContext);
  if (!ctx) throw new Error('useTrips doit être utilisé dans un <TripsProvider>.');
  return ctx;
}
