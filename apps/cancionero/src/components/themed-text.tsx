import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'wordmark'
    | 'display'
    | 'title'
    | 'lyric'
    | 'default'
    | 'defaultBold'
    | 'small'
    | 'smallBold'
    | 'caption'
    | 'label';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  /** « Cancionero » en titre d'accueil. */
  wordmark: { fontFamily: Fonts.wordmark, fontSize: 46, lineHeight: 50, letterSpacing: -0.5 },
  display: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 32 },
  title: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 28 },
  /** Une ligne de paroles. */
  lyric: { fontFamily: Fonts.displaySemi, fontSize: 18, lineHeight: 26 },
  default: { fontFamily: Fonts.body, fontSize: 16, lineHeight: 22 },
  defaultBold: { fontFamily: Fonts.heavy, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 20 },
  smallBold: { fontFamily: Fonts.bold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: Fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase' },
});
