import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Pas de vibreur sur le web : on n'appelle rien plutôt que de laisser l'API échouer.
const enabled = Platform.OS !== 'web';

/** Petites vibrations de confirmation, toutes sans effet si l'appareil n'en a pas. */
export const haptics = {
  /** Un mot marqué, un onglet changé. */
  tap() {
    if (enabled) Haptics.selectionAsync().catch(() => {});
  },
  /** La guirlande qu'on fait souffler, une carte retournée. */
  light() {
    if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** Un mot connu, une chanson importée. */
  success() {
    if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};
