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

import type { CountryCode, TripsState, VisitedCity } from './types';

const STORAGE_KEY = 'magellan.trips.v1';

/** État de départ tant que l'utilisateur n'a rien enregistré (jeu de démo). */
const SEED: TripsState = {
  visitedCountries: ['FRA', 'JPN'],
  cities: [
    { id: 'seed-paris', name: 'Paris', country: 'FRA', lat: 48.8566, lng: 2.3522 },
    { id: 'seed-tokyo', name: 'Tokyo', country: 'JPN', lat: 35.6762, lng: 139.6503 },
  ],
};

type TripsContextValue = {
  /** `true` tant que l'état n'a pas été chargé depuis le stockage local. */
  loading: boolean;
  visitedCountries: CountryCode[];
  cities: VisitedCity[];
  isVisited: (code: CountryCode) => boolean;
  toggleCountry: (code: CountryCode) => void;
  addCity: (city: Omit<VisitedCity, 'id'>) => void;
  removeCity: (id: string) => void;
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
        if (active && raw) setState(JSON.parse(raw) as TripsState);
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

  const toggleCountry = useCallback((code: CountryCode) => {
    setState((prev) => {
      const visited = prev.visitedCountries.includes(code);
      return {
        ...prev,
        visitedCountries: visited
          ? prev.visitedCountries.filter((c) => c !== code)
          : [...prev.visitedCountries, code],
      };
    });
  }, []);

  const addCity = useCallback((city: Omit<VisitedCity, 'id'>) => {
    setState((prev) => {
      // Marque aussi le pays comme visité, par cohérence.
      const visitedCountries = prev.visitedCountries.includes(city.country)
        ? prev.visitedCountries
        : [...prev.visitedCountries, city.country];
      return {
        ...prev,
        visitedCountries,
        cities: [...prev.cities, { ...city, id: makeId() }],
      };
    });
  }, []);

  const removeCity = useCallback((id: string) => {
    setState((prev) => ({ ...prev, cities: prev.cities.filter((c) => c.id !== id) }));
  }, []);

  const value = useMemo<TripsContextValue>(
    () => ({
      loading,
      visitedCountries: state.visitedCountries,
      cities: state.cities,
      isVisited: (code) => state.visitedCountries.includes(code),
      toggleCountry,
      addCity,
      removeCity,
    }),
    [loading, state, toggleCountry, addCity, removeCity],
  );

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips(): TripsContextValue {
  const ctx = useContext(TripsContext);
  if (!ctx) throw new Error('useTrips doit être utilisé dans un <TripsProvider>.');
  return ctx;
}
