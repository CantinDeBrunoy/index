import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';

type Props = {
  color: string;
  name: string;
  size: number;
  selected: boolean;
  onPress: () => void;
};

/** Pastille de la palette. Sélection marquée par un anneau et un léger ressort. */
export function ColorSwatch({ color, name, size, selected, onPress }: Props) {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(selected ? 1 : 0.92)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? 1 : 0.92,
      useNativeDriver: true,
      speed: 18,
      bounciness: 8,
    }).start();
  }, [selected, scale]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={name}
      hitSlop={4}
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: selected ? theme.text : 'transparent',
            transform: [{ scale }],
          },
        ]}
      >
        <Animated.View
          style={{
            width: size - (selected ? 10 : 4),
            height: size - (selected ? 10 : 4),
            borderRadius: size,
            backgroundColor: color,
          }}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
