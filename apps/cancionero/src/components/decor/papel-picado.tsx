import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { PapelColors } from '@/constants/theme';

const USE_NATIVE = Platform.OS !== 'web';

/** Génère le tracé d'un fanion : rectangle à frange dentelée + trous (evenodd). */
function flagPath(x: number, w: number, h: number, dy: number) {
  const fringe = 9; // profondeur des dents du bas
  const teeth = 4;
  const tw = w / teeth;
  const top = dy;
  const bottom = dy + h;
  let p = `M ${x} ${top} L ${x + w} ${top} L ${x + w} ${bottom - fringe}`;
  for (let i = 0; i < teeth; i++) {
    const tipX = x + w - (i + 0.5) * tw;
    const baseX = x + w - (i + 1) * tw;
    p += ` L ${tipX} ${bottom} L ${baseX} ${bottom - fringe}`;
  }
  p += ` L ${x} ${top} Z`;
  // trous décoratifs (rendus transparents par fillRule evenodd)
  const cx = x + w / 2;
  const cyc = top + h * 0.4;
  const r = 5.5;
  p += ` M ${cx - r} ${cyc} A ${r} ${r} 0 1 0 ${cx + r} ${cyc} A ${r} ${r} 0 1 0 ${cx - r} ${cyc} Z`;
  const dd = 4.5;
  const cyd = top + h * 0.66;
  p += ` M ${cx} ${cyd - dd} L ${cx + dd} ${cyd} L ${cx} ${cyd + dd} L ${cx - dd} ${cyd} Z`;
  return p;
}

export function PapelPicado({ width, height = 80 }: { width: number; height?: number }) {
  const flagW = 46;
  const gap = 7;
  const step = flagW + gap;
  const count = Math.max(3, Math.floor(width / step));
  const totalW = count * step;
  const flagH = height - 26;
  const amp = 14; // affaissement de la guirlande au milieu

  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE,
        }),
        Animated.timing(sway, {
          toValue: -1,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [sway]);

  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ['-1.6deg', '1.6deg'] });
  const mid = totalW / 2;
  const droopAt = (cx: number) => amp * (1 - Math.pow((cx - mid) / mid, 2));

  return (
    <Animated.View style={[styles.wrap, { transform: [{ rotate }], transformOrigin: 'top center' }]}>
      <Svg width={totalW} height={height}>
        <Path
          d={`M 0 4 Q ${mid} ${4 + amp * 1.4} ${totalW} 4`}
          stroke="#7A5334"
          strokeWidth={2.5}
          fill="none"
        />
        {Array.from({ length: count }).map((_, i) => {
          const x = i * step + gap / 2;
          const cx = x + flagW / 2;
          return (
            <Path
              key={i}
              d={flagPath(x, flagW, flagH, 4 + droopAt(cx))}
              fill={PapelColors[i % PapelColors.length]}
              fillRule="evenodd"
              opacity={0.95}
            />
          );
        })}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
  },
});
