import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fiesta, Spacing } from '@/constants/theme';

type Props = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
};

const ACCENT = Fiesta.rojo; // rouge terracotta, esprit « fiesta »

export function PrimaryButton({ title, variant = 'primary', loading, disabled, style, ...rest }: Props) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        (pressed || disabled || loading) && styles.pressed,
        typeof style === 'function' ? undefined : style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : ACCENT} />
      ) : (
        <ThemedText
          type="smallBold"
          style={[styles.label, { color: isPrimary ? '#fff' : ACCENT }]}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: ACCENT,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: ACCENT,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: 16,
  },
});

export { ACCENT };
