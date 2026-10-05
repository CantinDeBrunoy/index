import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { PressableScale } from '@/components/pressable-scale';
import { speak, useIsSpeaking } from '@/features/ui/speech';

type Props = {
  /** Identifiant unique : un seul bouton parle à la fois. */
  id: string;
  text: string;
  size?: number;
  rate?: number;
  background: string;
  color: string;
  /** Fond et icône pendant la lecture. */
  activeBackground: string;
  activeColor: string;
  /** Couleur des ondes qui s'élargissent autour du bouton. */
  ringColor: string;
  label?: string;
};

/**
 * Bouton « écouter » : lit le texte en espagnol. Tant que la voix parle, le
 * bouton se remplit, deux ondes s'en échappent et les arcs du haut-parleur
 * clignotent.
 */
export function SpeakerButton({
  id,
  text,
  size = 40,
  rate = 0.9,
  background,
  color,
  activeBackground,
  activeColor,
  ringColor,
  label = 'Écouter en espagnol',
}: Props) {
  const speaking = useIsSpeaking(id);
  const reduce = useReducedMotion();
  const ring = useSharedValue(0);
  const near = useSharedValue(1);
  const far = useSharedValue(1);

  useEffect(() => {
    if (speaking && !reduce) {
      ring.value = 0;
      ring.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }), -1, false);
      const blink = withRepeat(
        withSequence(withTiming(0.15, { duration: 450 }), withTiming(1, { duration: 450 })),
        -1,
        false,
      );
      near.value = blink;
      // L'arc extérieur clignote juste après l'intérieur : le son « part ».
      far.value = withDelay(180, blink);
    } else {
      cancelAnimation(ring);
      cancelAnimation(near);
      cancelAnimation(far);
      ring.value = 0;
      near.value = 1;
      far.value = 1;
    }
  }, [speaking, reduce, ring, near, far]);

  const ringA = useAnimatedStyle(() => ({
    opacity: speaking ? 0.55 * (1 - ring.value) : 0,
    transform: [{ scale: 1 + 0.75 * ring.value }],
  }));
  const ringB = useAnimatedStyle(() => {
    const t = (ring.value + 0.5) % 1;
    return { opacity: speaking ? 0.55 * (1 - t) : 0, transform: [{ scale: 1 + 0.75 * t }] };
  });
  const waveA = useAnimatedStyle(() => ({ opacity: near.value }));
  const waveB = useAnimatedStyle(() => ({ opacity: far.value }));

  const iconColor = speaking ? activeColor : color;
  const icon = size * 0.46;
  const ringStyle = { borderRadius: size / 2, borderColor: ringColor };

  return (
    <PressableScale
      onPress={() => speak(id, text, rate)}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      scaleTo={0.9}
      style={[
        styles.button,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: speaking ? activeBackground : background },
      ]}>
      <Animated.View pointerEvents="none" style={[styles.ring, ringStyle, ringA]} />
      <Animated.View pointerEvents="none" style={[styles.ring, ringStyle, ringB]} />
      <View style={{ width: icon, height: icon }} pointerEvents="none">
        <Svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, waveA]}>
          <Svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2} strokeLinecap="round">
            <Path d="M16 9a5 5 0 0 1 0 6" />
          </Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, waveB]}>
          <Svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2} strokeLinecap="round">
            <Path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
          </Svg>
        </Animated.View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
  ring: { ...StyleSheet.absoluteFillObject, borderWidth: 2 },
});
