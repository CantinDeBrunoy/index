import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { requestPermission, syncReminders } from '@/lib/notifications';
import { useEntries } from '@/state/EntriesProvider';
import { useSettings } from '@/state/SettingsProvider';

const PERMISSION_ASKED_KEY = 'nuancier.permissionAsked.v1';

/**
 * Composant sans rendu : demande la permission au premier lancement et
 * maintient la fenêtre de rappels alignée sur les journées déjà remplies.
 */
export function NotificationSync() {
  const { ready: entriesReady, entries } = useEntries();
  const { ready: settingsReady, settings, update } = useSettings();
  const [tick, setTick] = useState(0);
  const askedOnce = useRef(false);

  // Premier lancement : on demande une fois, et un refus ne bloque rien.
  useEffect(() => {
    if (!settingsReady || askedOnce.current) return;
    askedOnce.current = true;

    (async () => {
      const alreadyAsked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
      if (alreadyAsked) return;
      await AsyncStorage.setItem(PERMISSION_ASKED_KEY, '1');
      const status = await requestPermission();
      if (status === 'granted') await update({ remindersEnabled: true });
    })();
  }, [settingsReady, update]);

  // La fenêtre glisse avec le temps : on la reprogramme aussi au retour au
  // premier plan, pas seulement quand les données changent.
  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      if (status === 'active') setTick((value) => value + 1);
    };
    const subscription = AppState.addEventListener('change', onChange);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!entriesReady || !settingsReady) return;
    void syncReminders({
      enabled: settings.remindersEnabled,
      hour: settings.hour,
      minute: settings.minute,
      filledDates: new Set(Object.keys(entries)),
    });
  }, [entriesReady, settingsReady, entries, settings, tick]);

  return null;
}
