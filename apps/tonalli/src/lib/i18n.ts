import { I18n } from 'i18n-js';

import { es } from '@/locales/es';
import { fr } from '@/locales/fr';
import type { Locale } from '@/lib/types';

export const LOCALES: Locale[] = ['fr', 'es'];

export const i18n = new I18n(
  { fr, es },
  { defaultLocale: 'fr', enableFallback: true, locale: 'fr' },
);

export function isLocale(value: unknown): value is Locale {
  return value === 'fr' || value === 'es';
}

/** Langue du système, repli sur le français. */
export function detectLocale(): Locale {
  const candidates = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]);
  for (const candidate of candidates) {
    const base = candidate?.slice(0, 2).toLowerCase();
    if (isLocale(base)) return base;
  }
  return 'fr';
}

const STORAGE_KEY = 'tonalli.locale';

/** Langue choisie avant même d'avoir un profil (écrans d'authentification). */
export function readStoredLocale(): Locale | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function storeLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Stockage indisponible (navigation privée stricte) : sans importance.
  }
}
