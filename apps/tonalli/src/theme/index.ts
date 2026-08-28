import { useColorScheme } from 'react-native';

/**
 * Le châssis de l'app est volontairement incolore : gris, blancs et noirs
 * uniquement. Les seules couleurs de l'écran sont celles choisies par
 * l'utilisateur.
 */
export type Theme = {
  dark: boolean;
  background: string;
  surface: string;
  surfaceStrong: string;
  border: string;
  emptyCell: string;
  text: string;
  textMuted: string;
  textFaint: string;
  overlay: string;
};

const light: Theme = {
  dark: false,
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceStrong: '#F0F0F0',
  border: '#E4E4E4',
  emptyCell: '#EDEDED',
  text: '#1A1A1C',
  textMuted: '#6B6B70',
  textFaint: '#A0A0A6',
  overlay: 'rgba(0,0,0,0.35)',
};

const dark: Theme = {
  dark: true,
  background: '#0E0E10',
  surface: '#161619',
  surfaceStrong: '#1F1F23',
  border: '#2A2A2F',
  emptyCell: '#1C1C20',
  text: '#F2F2F3',
  textMuted: '#9A9AA0',
  textFaint: '#5E5E66',
  overlay: 'rgba(0,0,0,0.6)',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const type = {
  title: { fontSize: 28, fontWeight: '600' as const, letterSpacing: -0.4 },
  section: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.8 },
  body: { fontSize: 16, fontWeight: '400' as const },
  label: { fontSize: 14, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
} as const;
