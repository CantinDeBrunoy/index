/**
 * Système de design « Papel » : crème, encre brune, un seul accent rosa
 * mexicano, et une couleur par chanson. Fraunces pour les titres et les
 * paroles, Figtree pour l'interface.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#2A1810', // encre
    textSecondary: '#7A5A45',
    textMuted: '#A88A72',
    background: '#FFF7EC', // crème « papel »
    surface: '#FFFFFF',
    border: 'transparent',
    line: '#F3E6D3',
    chip: '#F1E2CD',
    accent: '#D11F6B', // rosa mexicano, en fond (texte blanc)
    accentText: '#B8185C', // rosa mexicano, en texte sur la crème
    accentTint: '#FDE3EE',
    highlight: '#FFE3A3', // surligneur des mots à réviser
    highlightText: '#2A1810',
    hint: '#FFF0CC',
    hintText: '#2A1810',
    hintIcon: '#8A5100',
    success: '#276B31',
    successText: '#276B31',
    successTint: '#E4F2E1',
    warningText: '#8A5100',
    warningTint: '#FCEBC8',
    dangerText: '#B3261E',
    dangerTint: '#FBE1DE',
    toast: '#2A1810',
    toastText: '#FFF7EC',
    toastAction: '#FF8FB8',
    toastIcon: '#8FD49A',
    dashed: '#D9BFA0',
    input: '#FFFFFF',
    inputBorder: '#E2CFB6',
    track: '#D9C7B0',
    string: '#8A6A52',
    skeleton: '#F3E6D3',
    shadow: '#2A1810',
  },
  dark: {
    text: '#FBEFE3',
    textSecondary: '#C9AE98',
    textMuted: '#8F7766',
    background: '#1C1216', // prune-brun profond
    surface: '#2A1D23',
    border: '#34252C',
    line: '#3A2A31',
    chip: '#33242B',
    accent: '#D11F6B',
    accentText: '#F0508F',
    accentTint: '#4A2134',
    highlight: '#5A4318',
    highlightText: '#FFD27A',
    hint: '#3A2F1A',
    hintText: '#F6E3C0',
    hintIcon: '#F2C063',
    success: '#276B31',
    successText: '#8FD49A',
    successTint: '#21362A',
    warningText: '#F2C063',
    warningTint: '#3F3220',
    dangerText: '#FF8A80',
    dangerTint: '#4A2222',
    toast: '#FBEFE3',
    toastText: '#2A1810',
    toastAction: '#B8185C',
    toastIcon: '#276B31',
    dashed: '#5A4450',
    input: '#2A1D23',
    inputBorder: '#4A3640',
    track: '#4A3640',
    string: '#9C8270',
    skeleton: '#33242B',
    shadow: '#000000',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ThemeColors = { [K in ThemeColor]: string };

/**
 * Une couleur par chanson : `tint` pour la vignette de l'accueil, `deep` pour
 * l'en-tête, le karaoké et les cartes de révision (texte blanc lisible
 * dessus), `light` pour les icônes sur fond sombre.
 */
export const SongPalette = {
  rosa: { base: '#D11F6B', deep: '#8E1550', tint: '#FDE3EE', tintDark: '#4A2134', light: '#F7A1C4' },
  turquesa: { base: '#14A3B8', deep: '#0B5E6B', tint: '#DDF3F5', tintDark: '#173E44', light: '#7FD3DE' },
  amarillo: { base: '#FFB627', deep: '#8A5100', tint: '#FFF0CC', tintDark: '#4A3A1C', light: '#FFD27A' },
  verde: { base: '#3FA34D', deep: '#1F5E2C', tint: '#E3F3E0', tintDark: '#20391F', light: '#8FD49A' },
  naranja: { base: '#F26B1D', deep: '#9A3A0C', tint: '#FFE6D5', tintDark: '#4A2A1A', light: '#FFB48A' },
  morado: { base: '#7B4BC4', deep: '#4E2A84', tint: '#EDE3F8', tintDark: '#31244A', light: '#C3A6F0' },
} as const;

export type SongColorKey = keyof typeof SongPalette;
export type SongColor = (typeof SongPalette)[SongColorKey];

/** Jaune souci des mots marqués sur fond coloré (karaoké). */
export const Marigold = '#FFC94A';

/**
 * Familles chargées dans src/app/_layout.tsx. Avec une police chargée, la
 * graisse est dans le nom de famille : ne pas ajouter `fontWeight`.
 */
export const Fonts = {
  displaySemi: 'Fraunces_600SemiBold',
  display: 'Fraunces_700Bold',
  displayItalic: 'Fraunces_700Bold_Italic',
  wordmark: 'Fraunces_800ExtraBold_Italic',
  regular: 'Figtree_400Regular',
  body: 'Figtree_500Medium',
  bodyItalic: 'Figtree_500Medium_Italic',
  semi: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  heavy: 'Figtree_800ExtraBold',
  mono: Platform.select({ ios: 'ui-monospace', web: 'var(--font-mono)', default: 'monospace' }),
} as const;

/** Durées et ressorts communs : « papier » souple pour le décor, « ui » ferme pour le toucher. */
export const Motion = {
  fast: 120,
  base: 220,
  slow: 350,
  springPaper: { damping: 9, stiffness: 110, mass: 0.8 },
  springUi: { damping: 18, stiffness: 320, mass: 0.6 },
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 560;
