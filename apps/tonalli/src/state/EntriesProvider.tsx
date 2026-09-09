import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { readCache, writeCache } from '@/lib/cache';
import { todayInTimeZone } from '@/lib/dates';
import { colorOf } from '@/lib/emotions';
import { blobToDataUrl, dataUrlToBlob, deletePhotos, photoPath, selfiePath, uploadPhoto } from '@/lib/photo';
import type { Shot } from '@/lib/photo';
import { supabase } from '@/lib/supabase';
import type { Entry, EntryMap } from '@/lib/types';
import { useAuth } from '@/state/AuthProvider';

/** Journée validée hors ligne, en attente d'envoi. */
type Pending = {
  date: string;
  emotion: string;
  color: string;
  note: string | null;
  photoDataUrl: string | null;
  /** Caméra frontale du même appui. `null` si l'appareil n'a qu'une caméra. */
  selfieDataUrl: string | null;
};

type EntriesValue = {
  /** Ma date locale du moment (fuseau de mon profil). */
  today: string;
  mine: EntryMap;
  partnerEntries: EntryMap;
  /** Dates auxquelles le binôme a posté, y compris celles que je n'ai pas le droit de lire. */
  partnerDates: Set<string>;
  loading: boolean;
  error: string | null;
  online: boolean;
  pending: Pending | null;
  refresh: () => Promise<void>;
  submitToday: (input: { emotion: string; shot: Shot | null; note: string }) => Promise<void>;
};

const EntriesContext = createContext<EntriesValue | null>(null);

function toMap(entries: Entry[]): EntryMap {
  const map: EntryMap = {};
  for (const entry of entries) map[entry.date] = entry;
  return map;
}

export function EntriesProvider({ children }: { children: ReactNode }) {
  const { profile, partner } = useAuth();
  const userId = profile?.id ?? null;
  const timezone = profile?.timezone ?? 'UTC';

  const [today, setToday] = useState(() => todayInTimeZone(timezone));
  const [mine, setMine] = useState<EntryMap>({});
  const [partnerEntries, setPartnerEntries] = useState<EntryMap>({});
  const [partnerDates, setPartnerDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [pending, setPending] = useState<Pending | null>(null);
  const flushing = useRef(false);

  // Le jour bascule à minuit dans MON fuseau, pas à minuit UTC.
  useEffect(() => {
    const update = () => setToday(todayInTimeZone(timezone));
    update();
    const interval = window.setInterval(update, 30_000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', update);
    };
  }, [timezone]);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Cache d'abord : l'app est consultable immédiatement, même sans réseau.
  useEffect(() => {
    if (!userId) return;
    setMine(readCache<EntryMap>('entries', userId, {}));
    setPartnerEntries(readCache<EntryMap>('partnerEntries', userId, {}));
    setPartnerDates(new Set(readCache<string[]>('partnerDates', userId, [])));
    setPending(readCache<Pending | null>('pending', userId, null));
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const { data: ownRows, error: ownError } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .returns<Entry[]>();
      if (ownError) throw ownError;

      const ownMap = toMap(ownRows ?? []);
      setMine(ownMap);
      writeCache('entries', userId, ownMap);

      if (partner?.id) {
        const { data: partnerRows, error: partnerError } = await supabase
          .from('entries')
          .select('*')
          .eq('user_id', partner.id)
          .returns<Entry[]>();
        if (partnerError) throw partnerError;

        const partnerMap = toMap(partnerRows ?? []);
        setPartnerEntries(partnerMap);
        writeCache('partnerEntries', userId, partnerMap);

        const { data: dates, error: datesError } = await supabase.rpc('partner_entry_dates');
        if (datesError) throw datesError;

        // La RPC ne renvoie que des dates : de quoi hachurer une case sans
        // rien dévoiler de son contenu.
        const list = ((dates ?? []) as unknown[]).map((value) => String(value).slice(0, 10));
        setPartnerDates(new Set(list));
        writeCache('partnerDates', userId, list);
      } else {
        setPartnerEntries({});
        setPartnerDates(new Set());
      }
    } catch (caught) {
      setError((caught as { message?: string }).message ?? 'network');
    } finally {
      setLoading(false);
    }
  }, [userId, partner?.id]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    void refresh();
  }, [userId, refresh]);

  // Le binôme peut poster à tout moment : on revient chercher son entrée
  // quand l'onglet redevient visible, et à intervalle raisonnable.
  useEffect(() => {
    if (!userId) return;
    const tick = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void refresh();
    };
    const interval = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('online', tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('online', tick);
    };
  }, [userId, refresh]);

  const persistPending = useCallback(
    (value: Pending | null) => {
      setPending(value);
      if (userId) writeCache('pending', userId, value);
    },
    [userId],
  );

  const send = useCallback(
    async (entry: Pending) => {
      if (!userId) throw new Error('not_authenticated');

      let path: string | null = null;
      let selfie: string | null = null;
      if (entry.photoDataUrl) {
        path = photoPath(userId, entry.date);
        await uploadPhoto(path, await dataUrlToBlob(entry.photoDataUrl));

        if (entry.selfieDataUrl) {
          selfie = selfiePath(userId, entry.date);
          await uploadPhoto(selfie, await dataUrlToBlob(entry.selfieDataUrl));
        } else {
          // Nouvelle photo sans seconde caméra : l'ancienne frontale ne
          // correspond plus à rien, on ne la laisse pas s'apparier à une scène
          // qu'elle n'a pas vue.
          await deletePhotos([selfiePath(userId, entry.date)]);
        }
      }

      // `upsert` couvre les deux cas d'un seul coup : première validation de la
      // journée, ou correction de celle-ci. Sans nouvelle photo, les colonnes
      // de chemin sont absentes du corps envoyé, donc les anciennes valeurs
      // sont conservées.
      const payload: Record<string, unknown> = {
        user_id: userId,
        date: entry.date,
        emotion: entry.emotion,
        color: entry.color,
        note: entry.note,
      };
      if (path) {
        payload.photo_path = path;
        payload.selfie_path = selfie;
      }

      const { data, error: writeError } = await supabase
        .from('entries')
        .upsert(payload, { onConflict: 'user_id,date' })
        .select('*')
        .single<Entry>();

      if (writeError) throw writeError;

      setMine((current) => {
        const next = { ...current, [data.date]: data };
        writeCache('entries', userId, next);
        return next;
      });
    },
    [userId],
  );

  const submitToday = useCallback(
    async ({ emotion, shot, note }: { emotion: string; shot: Shot | null; note: string }) => {
      const color = colorOf(emotion);
      if (!color) throw new Error('unknown_emotion');

      const entry: Pending = {
        date: today,
        emotion,
        color,
        note: note.trim() ? note.trim() : null,
        photoDataUrl: shot ? await blobToDataUrl(shot.main) : null,
        selfieDataUrl: shot?.selfie ? await blobToDataUrl(shot.selfie) : null,
      };

      if (!navigator.onLine) {
        // Hors ligne : la journée est gardée telle quelle et partira au
        // retour du réseau. Rien n'est perdu, rien n'est envoyé à moitié.
        persistPending(entry);
        return;
      }

      try {
        await send(entry);
        persistPending(null);
        void refresh();
      } catch (caught) {
        const message = (caught as { message?: string }).message ?? '';
        if (/fetch|network|timeout/i.test(message)) {
          persistPending(entry);
          return;
        }
        throw caught;
      }
    },
    [today, send, persistPending, refresh],
  );

  // Reprise de la synchronisation dès que le réseau revient.
  useEffect(() => {
    if (!online || !pending || !userId || flushing.current) return;
    flushing.current = true;
    void (async () => {
      try {
        await send(pending);
        persistPending(null);
        await refresh();
      } catch {
        // On réessaiera au prochain retour de connexion.
      } finally {
        flushing.current = false;
      }
    })();
  }, [online, pending, userId, send, persistPending, refresh]);

  const value = useMemo<EntriesValue>(
    () => ({
      today,
      mine,
      partnerEntries,
      partnerDates,
      loading,
      error,
      online,
      pending,
      refresh,
      submitToday,
    }),
    [today, mine, partnerEntries, partnerDates, loading, error, online, pending, refresh, submitToday],
  );

  return <EntriesContext.Provider value={value}>{children}</EntriesContext.Provider>;
}

export function useEntries(): EntriesValue {
  const context = useContext(EntriesContext);
  if (!context) throw new Error('useEntries hors de EntriesProvider');
  return context;
}
