import AsyncStorage from '@react-native-async-storage/async-storage';

import { isValidColor } from '@/data/palette';
import type { Entry, EntryMap } from '@/data/types';
import { isValidKey } from '@/lib/dates';

const STORAGE_KEY = 'nuancier.entries.v1';

/** Ne garde que ce qui a la forme d'une entrée valide ; le reste est ignoré. */
export function sanitizeEntry(value: unknown, fallbackDate?: string): Entry | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const date = typeof raw.date === 'string' ? raw.date : fallbackDate;
  if (!isValidKey(date) || !isValidColor(raw.color)) return null;
  const note = typeof raw.note === 'string' ? raw.note.trim() : '';
  const updatedAt = typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt)
    ? raw.updatedAt
    : 0;
  return {
    date,
    color: raw.color.toUpperCase(),
    ...(note ? { note } : {}),
    updatedAt,
  };
}

export function sanitizeEntryMap(value: unknown): EntryMap {
  if (typeof value !== 'object' || value === null) return {};
  const result: EntryMap = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const entry = sanitizeEntry(item, key);
    if (entry) result[entry.date] = entry;
  }
  return result;
}

export async function loadEntries(): Promise<EntryMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return sanitizeEntryMap(JSON.parse(raw));
  } catch {
    // Stockage illisible : on repart d'un nuancier vide plutôt que de planter.
    return {};
  }
}

export async function saveEntries(entries: EntryMap): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}
