/**
 * Couleurs du thème courant (clair / sombre) :
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, type ThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useIsDark() {
  return useColorScheme() === 'dark';
}

export function useTheme(): ThemeColors {
  return Colors[useIsDark() ? 'dark' : 'light'];
}
