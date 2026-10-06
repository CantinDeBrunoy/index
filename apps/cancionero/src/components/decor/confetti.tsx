import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { SongPalette } from '@/constants/theme';

const COLORS = Object.values(SongPalette).map((c) => c.base);
const COUNT = 36;

/** Pluie de petits morceaux de papier de couleur qui tombent en tournoyant (deux passages). */
export function Confetti() {
  const reduce = useReducedMotion();
  const { height } = useWindowDimensions();
  const pieces = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        left: `${(i * 37) % 100}%` as const,
        color: COLORS[i % COLORS.length],
        duration: 2400 + ((i * 7) % 10) * 200,
        delay: ((i * 13) % 24) * 100,
        width: 6 + (i % 3) * 3,
        height: 9 + ((i * 5) % 4) * 3,
        sway: i % 2 ? 16 : -16,
      })),
    [],
  );
  if (reduce) return null;
  return (
    <View style={[StyleSheet.absoluteFill, styles.clip]} pointerEvents="none">
      {pieces.map((piece, i) => (
        <Piece key={i} {...piece} fall={height + 60} />
      ))}
    </View>
  );
}

function Piece({
  left,
  color,
  duration,
  delay,
  width,
  height,
  sway,
  fall,
}: {
  left: `${number}%`;
  color: string;
  duration: number;
  delay: number;
  width: number;
  height: number;
  sway: number;
  fall: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.linear }), 2, false));
  }, [t, delay, duration]);

  const style = useAnimatedStyle(() => ({
    opacity: t.value > 0 && t.value < 1 ? 1 : 0,
    transform: [
      { translateY: -30 + t.value * fall },
      { translateX: Math.sin(t.value * Math.PI * 4) * sway },
      { rotate: `${t.value * 480 * Math.sign(sway)}deg` },
      { rotateY: `${t.value * 720}deg` },
    ],
  }));

  return <Animated.View style={[styles.piece, { left, width, height, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  piece: { position: 'absolute', top: 0, borderRadius: 2 },
});
