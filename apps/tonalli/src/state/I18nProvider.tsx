import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { detectLocale, i18n, readStoredLocale, storeLocale } from '@/lib/i18n';
import type { Locale } from '@/lib/types';

type Translate = (key: string, options?: Record<string, unknown>) => string;

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Au premier rendu : le choix explicite s'il existe, sinon la langue du
  // système, sinon le français.
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale() ?? detectLocale());

  i18n.locale = locale;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    i18n.locale = next;
    storeLocale(next);
    setLocaleState(next);
  }, []);

  const t = useCallback<Translate>(
    (key, options) => i18n.t(key, options),
    // `locale` est bien une dépendance : c'est lui qui change la sortie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale],
  );

  const value = useMemo<I18nValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n hors de I18nProvider');
  return context;
}
