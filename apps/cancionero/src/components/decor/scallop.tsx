import Svg, { Path } from 'react-native-svg';

// Bord festonné du bas d'une carte (comme une feuille de papel picado),
// avec un petit œillet découpé dans chaque feston.
const SCALLOPS = 25;
const W = 350;
const R = W / SCALLOPS / 2;

const EDGE = (() => {
  let d = `M0 0H${W}`;
  for (let i = SCALLOPS - 1; i >= 0; i--) d += `A${R} ${R} 0 0 1 ${(i * 2 * R).toFixed(1)} 0`;
  d += 'Z';
  for (let i = 0; i < SCALLOPS; i++) {
    const cx = (i * 2 + 1) * R;
    d += `M${(cx - 1.5).toFixed(1)} 2.2a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0Z`;
  }
  return d;
})();

const DIAMONDS = Array.from({ length: 13 }, (_, i) => `M${25 + i * 25} 1l3 3-3 3-3-3Z`).join('');

export function ScallopEdge({ color }: { color: string }) {
  return (
    <Svg width="100%" height={8} viewBox={`0 0 ${W} 8`} preserveAspectRatio="none" style={{ marginTop: -1 }}>
      <Path d={EDGE} fill={color} fillRule="evenodd" />
    </Svg>
  );
}

/** Rangée de petits losanges « découpés » près du bas de la carte. */
export function DiamondRow({ color }: { color: string }) {
  return (
    <Svg width="100%" height={8} viewBox={`0 0 ${W} 8`} preserveAspectRatio="xMidYMid meet">
      <Path d={DIAMONDS} fill={color} />
    </Svg>
  );
}
