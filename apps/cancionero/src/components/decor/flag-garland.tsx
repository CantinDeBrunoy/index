import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { ALL_FLAGS, Flag, FLAGS, FLAG_H, FLAG_W, type FlagCode } from '@/components/decor/flags';
import { haptics } from '@/features/ui/haptics';
import { useTheme } from '@/hooks/use-theme';

const STEP = FLAG_W + 6;
/** Affaissement de la corde au milieu, en points. */
const SAG = 24;
const HEIGHT = 62;
/** Un coup de vent toutes les… */
const GUST_EVERY = 12000;

/**
 * Tirage des drapeaux, une fois par lancement de l'app : chaque ouverture
 * montre un autre ensemble de pays, et tous finissent par passer.
 */
let drawn: FlagCode[] | null = null;
function drawFlags(): FlagCode[] {
  if (!drawn) {
    const flags = [...ALL_FLAGS];
    for (let i = flags.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [flags[i], flags[j]] = [flags[j], flags[i]];
    }
    drawn = flags;
  }
  return drawn;
}

/**
 * Guirlande de drapeaux latino-américains. Les drapeaux tombent sur la corde
 * à l'ouverture, se balancent chacun à son rythme, et un coup de vent les
 * traverse de gauche à droite de temps en temps — ou quand on la touche.
 */
export function FlagGarland({ width }: { width: number }) {
  const theme = useTheme();
  const reduce = useReducedMotion();
  const [gust, setGust] = useState(0);

  const count = Math.max(5, Math.min(10, Math.floor((width - 16) / STEP)));
  const flags = drawFlags().slice(0, count);
  const start = (width - (count * STEP - 6)) / 2;

  const label = useMemo(
    () => `Drapeaux : ${flags.map((code) => FLAGS[code].name).join(', ')}. Touche pour faire souffler le vent.`,
    [flags],
  );

  useEffect(() => {
    if (reduce) return;
    const first = setTimeout(() => setGust((n) => n + 1), 2600);
    const loop = setInterval(() => setGust((n) => n + 1), GUST_EVERY);
    return () => {
      clearTimeout(first);
      clearInterval(loop);
    };
  }, [reduce]);

  return (
    <Pressable
      onPress={() => {
        haptics.light();
        setGust((n) => n + 1);
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width, height: HEIGHT }}>
      {flags.map((code, index) => {
        // Le haut du drapeau suit la corde (une parabole) et penche avec elle.
        const center = start + index * STEP + FLAG_W / 2;
        const t = (center - 2) / (width - 4);
        const top = 4 + 2 * SAG * t * (1 - t) - 1;
        const tilt = (Math.atan((2 * SAG * (1 - 2 * t)) / (width - 4)) * 180) / Math.PI;
        return (
          <HangingFlag
            key={code}
            code={code}
            index={index}
            left={center - FLAG_W / 2}
            top={top}
            tilt={tilt}
            gust={gust}
            reduce={reduce}
          />
        );
      })}
      <Svg width={width} height={32} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Path d={`M2 4Q${width / 2} ${4 + 2 * SAG} ${width - 2} 4`} stroke={theme.string} strokeWidth={1.6} fill="none" />
      </Svg>
    </Pressable>
  );
}

function HangingFlag({
  code,
  index,
  left,
  top,
  tilt,
  gust,
  reduce,
}: {
  code: FlagCode;
  index: number;
  left: number;
  top: number;
  tilt: number;
  gust: number;
  reduce: boolean;
}) {
  const drop = useSharedValue(reduce ? 1 : 0);
  const sway = useSharedValue(0);
  const wind = useSharedValue(0);

  // Chute sur la corde puis balancement, chacun avec sa période.
  useEffect(() => {
    if (reduce) {
      drop.value = 1;
      return;
    }
    drop.value = withDelay(100 + index * 70, withSpring(1, { damping: 8, stiffness: 90, mass: 0.7 }));
    const period = 2600 + ((index * 233) % 700);
    const half = { duration: period / 2, easing: Easing.inOut(Easing.sin) };
    sway.value = withDelay(
      (index * 170) % 900,
      withRepeat(withSequence(withTiming(1, half), withTiming(-1, half)), -1, false),
    );
    return () => {
      cancelAnimation(drop);
      cancelAnimation(sway);
      cancelAnimation(wind);
    };
  }, [reduce, index, drop, sway, wind]);

  // Coup de vent : il arrive par la gauche, chaque drapeau un peu après son voisin.
  useEffect(() => {
    if (!gust || reduce) return;
    const to = (value: number, duration: number) =>
      withTiming(value, { duration, easing: Easing.inOut(Easing.quad) });
    wind.value = withDelay(
      index * 70,
      withSequence(to(-13, 280), to(7, 300), to(-4, 300), to(1.5, 300), to(0, 300)),
    );
  }, [gust, reduce, index, wind]);

  const animated = useAnimatedStyle(() => ({
    opacity: Math.min(1, drop.value * 1.6),
    transform: [
      { translateY: (1 - drop.value) * -70 },
      { rotate: `${tilt + (1 - drop.value) * -12 + sway.value * 3 + wind.value}deg` },
      { skewX: `${wind.value * -0.35}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.flag, { left, top }, animated]}>
      <Flag code={code} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flag: {
    position: 'absolute',
    width: FLAG_W,
    height: FLAG_H,
    transformOrigin: 'top',
    boxShadow: '0px 2px 4px rgba(42, 24, 16, 0.18)',
  },
});
