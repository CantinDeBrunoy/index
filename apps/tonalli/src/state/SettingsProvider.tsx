import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { DEFAULT_SETTINGS, type Settings } from '@/data/types';
import { loadSettings, saveSettings } from '@/storage/settings';

type SettingsContextValue = {
  ready: boolean;
  settings: Settings;
  update: (patch: Partial<Settings>) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    loadSettings().then((stored) => {
      if (!active) return;
      setSettings(stored);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settings, ...patch };
      setSettings(next);
      await saveSettings(next);
    },
    [settings],
  );

  const value = useMemo<SettingsContextValue>(
    () => ({ ready, settings, update }),
    [ready, settings, update],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings doit être utilisé dans un SettingsProvider');
  return context;
}
