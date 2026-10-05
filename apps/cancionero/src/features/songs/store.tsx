import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { BUILTIN_SONGS } from '@/data/songs';
import { loadUserSongs, saveUserSongs } from './storage';
import type { Song } from './types';

type SongsContextValue = {
  /** Chansons fournies + ajoutées par l'utilisateur. */
  songs: Song[];
  userSongs: Song[];
  loading: boolean;
  getSong: (id: string) => Song | undefined;
  addSong: (song: Song) => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
};

const SongsContext = createContext<SongsContextValue | null>(null);

export function SongsProvider({ children }: { children: React.ReactNode }) {
  const [userSongs, setUserSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserSongs()
      .then(setUserSongs)
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async (next: Song[]) => {
    setUserSongs(next);
    await saveUserSongs(next);
  }, []);

  const addSong = useCallback(
    (song: Song) => persist([song, ...userSongs]),
    [persist, userSongs],
  );

  const deleteSong = useCallback(
    (id: string) => persist(userSongs.filter((s) => s.id !== id)),
    [persist, userSongs],
  );

  // Les chansons de l'utilisateur d'abord (les plus récentes en haut).
  const songs = useMemo(() => [...userSongs, ...BUILTIN_SONGS], [userSongs]);

  const getSong = useCallback(
    (id: string) => songs.find((s) => s.id === id),
    [songs],
  );

  const value = useMemo(
    () => ({ songs, userSongs, loading, getSong, addSong, deleteSong }),
    [songs, userSongs, loading, getSong, addSong, deleteSong],
  );

  return <SongsContext.Provider value={value}>{children}</SongsContext.Provider>;
}

export function useSongs(): SongsContextValue {
  const ctx = useContext(SongsContext);
  if (!ctx) throw new Error('useSongs doit être utilisé dans un <SongsProvider>');
  return ctx;
}
