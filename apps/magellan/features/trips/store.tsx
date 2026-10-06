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
  /** Ajoute des photos à plusieurs étapes d'un coup (import groupé), par id d'étape. */
  addPhotos: (byStop: Record<string, PhotoRef[]>) => void;
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
      trips: state.trips,
      cities,
      visitedCountries,
      addTrip,
      removeTrip,
      addStop,
      removeStop,
      addPhotos,
    };
  }, [loading, state, addTrip, removeTrip, addStop, removeStop, addPhotos]);

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips(): TripsContextValue {
  const ctx = useContext(TripsContext);
  if (!ctx) throw new Error('useTrips doit être utilisé dans un <TripsProvider>.');
  return ctx;
}
