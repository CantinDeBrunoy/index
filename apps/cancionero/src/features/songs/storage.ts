import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Song } from './types';

const USER_SONGS_KEY = '@cancionero/user-songs';

/** Charge les chansons ajoutées par l'utilisateur depuis le stockage local. */
export async function loadUserSongs(): Promise<Song[]> {
  try {
    const raw = await AsyncStorage.getItem(USER_SONGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Song[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Impossible de lire les chansons enregistrées', e);
    return [];
  }
}

/** Enregistre la liste complète des chansons utilisateur. */
export async function saveUserSongs(songs: Song[]): Promise<void> {
  await AsyncStorage.setItem(USER_SONGS_KEY, JSON.stringify(songs));
}
