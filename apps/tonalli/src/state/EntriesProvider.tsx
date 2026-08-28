import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import type { Entry, EntryMap } from '@/data/types';
import { todayKey } from '@/lib/dates';
import { loadEntries, saveEntries } from '@/storage/entries';

type EntriesContextValue = {
  /** Faux tant que le stockage n'a pas été lu. */
  ready: boolean;
  entries: EntryMap;
  /** Jour local courant, réévalué au passage de minuit et au retour au premier plan. */
  today: string;
  setEntry: (date: string, color: string, note?: string) => Promise<void>;
  removeEntry: (date: string) => Promise<void>;
  /** Remplace tout le nuancier (import). */
  replaceEntries: (entries: EntryMap) => Promise<void>;
};

const EntriesContext = createContext<EntriesContextValue | null>(null);

/** Millisecondes jusqu'au prochain minuit local (+1 s de marge). */
function msUntilNextMidnight(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0);
  return next.getTime() - now.getTime();
}

export function EntriesProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<EntryMap>({});
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState(todayKey);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    loadEntries().then((stored) => {
      if (!active) return;
      setEntries(stored);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Le « jour » suit l'horloge locale de l'appareil : on le recalcule au
  // passage de minuit, et à chaque retour au premier plan (l'app a pu rester
  // en veille toute la nuit, ou changer de fuseau horaire en voyage).
  useEffect(() => {
    const refresh = () => setToday(todayKey());

    const arm = () => {
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        refresh();
        arm();
      }, msUntilNextMidnight());
    };
    arm();

    const onAppState = (status: AppStateStatus) => {
      if (status === 'active') {
        refresh();
        arm();
      }
    };
    const subscription = AppState.addEventListener('change', onAppState);

    return () => {
      if (timeout.current) clearTimeout(timeout.current);
      subscription.remove();
    };
  }, []);

  const commit = useCallback(async (next: EntryMap) => {
    setEntries(next);
    await saveEntries(next);
  }, []);

  const setEntry = useCallback(
    async (date: string, color: string, note?: string) => {
      const trimmed = note?.trim();
      const entry: Entry = {
        date,
        color: color.toUpperCase(),
        ...(trimmed ? { note: trimmed } : {}),
        updatedAt: Date.now(),
      };
      await commit({ ...entries, [date]: entry });
    },
    [commit, entries],
  );

  const removeEntry = useCallback(
    async (date: string) => {
      if (!entries[date]) return;
      const next = { ...entries };
      delete next[date];
      await commit(next);
    },
    [commit, entries],
  );

  const replaceEntries = useCallback(
    async (next: EntryMap) => {
      await commit(next);
    },
    [commit],
  );

  const value = useMemo<EntriesContextValue>(
    () => ({ ready, entries, today, setEntry, removeEntry, replaceEntries }),
    [ready, entries, today, setEntry, removeEntry, replaceEntries],
  );

  return <EntriesContext.Provider value={value}>{children}</EntriesContext.Provider>;
}

export function useEntries(): EntriesContextValue {
  const context = useContext(EntriesContext);
  if (!context) throw new Error('useEntries doit être utilisé dans un EntriesProvider');
  return context;
}

export function useEntry(date: string): Entry | undefined {
  return useEntries().entries[date];
}
