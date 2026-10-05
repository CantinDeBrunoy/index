import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Motion } from '@/constants/theme';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children?: ReactNode;
  /** Style du contenu (c'est lui qui s'enfonce). */
  style?: StyleProp<ViewStyle>;
  /** Style de la zone touchable (place dans une ligne, `flex`…). */
  containerStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

/** Un bouton qui s'enfonce légèrement sous le doigt, avec un ressort ferme. */
export function PressableScale({
  style,
  containerStyle,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      {...rest}
      style={containerStyle}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, Motion.springUi);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, Motion.springUi);
        onPressOut?.(e);
      }}>
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
}
