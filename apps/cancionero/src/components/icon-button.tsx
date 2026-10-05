import type { StyleProp, ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';

/** Bouton rond à icône seule (retour, fermer…). `label` est lu par le lecteur d'écran. */
export function IconButton({
  icon,
  label,
  onPress,
  color,
  background,
  size = 44,
  iconSize = 24,
  style,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color: string;
  background: string;
  size?: number;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      scaleTo={0.9}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}>
      <Icon name={icon} size={iconSize} color={color} />
    </PressableScale>
  );
}
