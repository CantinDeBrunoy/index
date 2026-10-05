/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#3A1E12', // brun chaud (encre)
    background: '#FFF6E9', // crème « papel »
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#F5E3CC',
    textSecondary: '#9A7457',
  },
  dark: {
    text: '#FDEFE0',
    background: '#1C1015', // prune-brun profond
    backgroundElement: '#2B1922',
    backgroundSelected: '#3C2531',
    textSecondary: '#CBA88E',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Palette « fiesta » — couleurs vives, identiques en clair et sombre.
 * Inspirées du papel picado, de la talavera et du cempasúchil.
 */
export const Fiesta = {
  rosa: '#EC3B83', // rosa mexicano
  naranja: '#FF7A1A', // orange
  amarillo: '#FFC020', // cempasúchil / marigold
  turquesa: '#12B0C4', // turquoise talavera
  verde: '#39A845', // vert cactus
  rojo: '#E23A2E', // rouge terracotta (accent principal)
  morado: '#9B4DCA', // violet
  azul: '#2E6FD6', // bleu
} as const;

/** Couleurs cyclées pour colorer les cartes de chansons. */
export const FiestaCycle = [
  Fiesta.rosa,
  Fiesta.turquesa,
  Fiesta.amarillo,
  Fiesta.verde,
  Fiesta.naranja,
  Fiesta.morado,
  Fiesta.azul,
] as const;

/** Couleurs des fanions du papel picado. */
export const PapelColors = [
  Fiesta.rosa,
  Fiesta.turquesa,
  Fiesta.amarillo,
  Fiesta.verde,
  Fiesta.naranja,
  Fiesta.morado,
] as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
