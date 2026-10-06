import { ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  onPress?: () => void;
  icon?: IconName;
  /** `primary` : rosa plein · `success` : vert plein · `secondary` : contour. */
  variant?: 'primary' | 'secondary' | 'success';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  title,
  onPress,
  icon,
  variant = 'primary',
  loading,
  disabled,
  style,
  containerStyle,
}: Props) {
  const theme = useTheme();
  const filled = variant !== 'secondary';
  const background = variant === 'success' ? theme.success : variant === 'primary' ? theme.accent : theme.surface;
  const color = filled ? '#FFFFFF' : theme.text;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      containerStyle={containerStyle}
      style={[
        styles.base,
        { backgroundColor: background },
        !filled && { borderWidth: 1.5, borderColor: theme.inputBorder },
        disabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {icon && <Icon name={icon} size={20} color={color} strokeWidth={icon === 'check' ? 2.5 : 2} />}
          <ThemedText type="defaultBold" style={{ color }}>
            {title}
          </ThemedText>
        </>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: 27,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabled: { opacity: 0.4 },
});
