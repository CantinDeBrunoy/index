import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SETTINGS, type Settings } from '@/data/types';

const STORAGE_KEY = 'nuancier.settings.v1';

function sanitizeSettings(value: unknown): Settings {
  if (typeof value !== 'object' || value === null) return DEFAULT_SETTINGS;
  const raw = value as Record<string, unknown>;
  const hour = typeof raw.hour === 'number' && raw.hour >= 0 && raw.hour <= 23
    ? Math.floor(raw.hour)
    : DEFAULT_SETTINGS.hour;
  const minute = typeof raw.minute === 'number' && raw.minute >= 0 && raw.minute <= 59
    ? Math.floor(raw.minute)
    : DEFAULT_SETTINGS.minute;
  return {
    remindersEnabled: raw.remindersEnabled === true,
    hour,
    minute,
  };
}

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
