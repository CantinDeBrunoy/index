import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { nextDays, reminderDate } from '@/lib/dates';

export const REMINDER_TITLE = 'Nuancier';
export const REMINDER_BODY = 'Quelle couleur avait ta journée ?';

const CHANNEL_ID = 'rappel-quotidien';
/**
 * On ne peut pas faire « sauter » un jour à une notification quotidienne
 * répétitive. On programme donc une fenêtre glissante de rappels datés, en
 * omettant les jours déjà remplis, et on la resynchronise à chaque
 * sauvegarde, à chaque changement de réglage et au retour au premier plan.
 */
export const WINDOW_DAYS = 14;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Rappel quotidien',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
    vibrationPattern: [0, 200],
    enableVibrate: true,
  });
}

export async function getPermissionStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Demande la permission. Un refus n'est jamais bloquant : l'app fonctionne
 * entièrement sans notifications.
 */
export async function requestPermission(): Promise<Notifications.PermissionStatus> {
  if (!Device.isDevice) return Notifications.PermissionStatus.DENIED;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return current.status;
  if (!current.canAskAgain) return current.status;
  const { status } = await Notifications.requestPermissionsAsync();
  return status;
}

export async function cancelReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export type SyncOptions = {
  enabled: boolean;
  hour: number;
  minute: number;
  /** Jours déjà renseignés : on ne rappelle pas ce qui est fait. */
  filledDates: ReadonlySet<string>;
};

/**
 * Remplace la fenêtre de rappels par celle qui correspond à l'état courant.
 * Renvoie le nombre de rappels réellement programmés.
 */
export async function syncReminders({
  enabled,
  hour,
  minute,
  filledDates,
}: SyncOptions): Promise<number> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled) return 0;

    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return 0;

    await ensureAndroidChannel();

    const now = Date.now();
    let scheduled = 0;
    for (const key of nextDays(WINDOW_DAYS)) {
      if (filledDates.has(key)) continue;
      const date = reminderDate(key, hour, minute);
      if (date.getTime() <= now) continue; // l'heure du jour est déjà passée
      await Notifications.scheduleNotificationAsync({
        content: {
          title: REMINDER_TITLE,
          body: REMINDER_BODY,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
          channelId: CHANNEL_ID,
        },
      });
      scheduled += 1;
    }
    return scheduled;
  } catch {
    // Notifications indisponibles (Expo Go, simulateur, OS restrictif) :
    // l'app continue de fonctionner normalement.
    return 0;
  }
}
