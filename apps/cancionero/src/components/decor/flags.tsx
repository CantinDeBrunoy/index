import type { ReactNode } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/**
 * Les drapeaux des pays hispanophones d'Amérique latine, dessinés à 46 × 31
 * (proportion 3:2). Les blasons sont simplifiés pour rester lisibles à cette
 * taille ; les couleurs suivent les drapeaux officiels.
 */
export type FlagCode =
  | 'ar'
  | 'bo'
  | 'cl'
  | 'co'
  | 'cr'
  | 'cu'
  | 'do'
  | 'ec'
  | 'gt'
  | 'hn'
  | 'mx'
  | 'ni'
  | 'pa'
  | 'pe'
  | 'pr'
  | 'py'
  | 'sv'
  | 'uy'
  | 've';

export const FLAG_W = 46;
export const FLAG_H = 31;

const W = FLAG_W;
const H = FLAG_H;
const THIRD_W = W / 3;
const THIRD_H = H / 3;

/** Étoile à cinq branches, pointe en haut, centrée sur (cx, cy). */
const STAR = [
  [0, -1],
  [0.2245, -0.309],
  [0.951, -0.309],
  [0.3633, 0.118],
  [0.5878, 0.809],
  [0, 0.382],
  [-0.5878, 0.809],
  [-0.3633, 0.118],
  [-0.951, -0.309],
  [-0.2245, -0.309],
];
function star(cx: number, cy: number, r: number) {
  return (
    STAR.map(([x, y], i) => `${i ? 'L' : 'M'}${(cx + x * r).toFixed(2)} ${(cy + y * r).toFixed(2)}`).join('') +
    'Z'
  );
}

const verticalThirds = (left: string, middle: string, right: string) => (
  <>
    <Rect width={THIRD_W + 0.1} height={H} fill={left} />
    <Rect x={THIRD_W} width={THIRD_W + 0.1} height={H} fill={middle} />
    <Rect x={THIRD_W * 2} width={THIRD_W} height={H} fill={right} />
  </>
);

const horizontalThirds = (top: string, middle: string, bottom: string) => (
  <>
    <Rect width={W} height={THIRD_H + 0.1} fill={top} />
    <Rect y={THIRD_H} width={W} height={THIRD_H + 0.1} fill={middle} />
    <Rect y={THIRD_H * 2} width={W} height={THIRD_H} fill={bottom} />
  </>
);

/** Cinq bandes, la couleur `outer` en haut et en bas, et un triangle au guindant (Cuba, Porto Rico). */
const stripesWithTriangle = (outer: string, triangle: string) => (
  <>
    <Rect width={W} height={H} fill={outer} />
    <Rect y={H / 5} width={W} height={H / 5} fill="#FFFFFF" />
    <Rect y={(H / 5) * 3} width={W} height={H / 5} fill="#FFFFFF" />
    <Path d={`M0 0L${(H * 0.866).toFixed(2)} ${H / 2}L0 ${H}Z`} fill={triangle} />
    <Path d={star(9, H / 2, 4.2)} fill="#FFFFFF" />
  </>
);

const GOLD = '#C8A13B';

export const FLAGS: Record<FlagCode, { name: string; draw: () => ReactNode }> = {
  ar: {
    name: 'Argentine',
    draw: () => (
      <>
        {horizontalThirds('#74ACDF', '#FFFFFF', '#74ACDF')}
        <Circle cx={W / 2} cy={H / 2} r={3.7} fill="none" stroke="#F6B40E" strokeWidth={1.5} strokeDasharray="1.1 1.15" />
        <Circle cx={W / 2} cy={H / 2} r={2.2} fill="#F6B40E" />
      </>
    ),
  },
  bo: { name: 'Bolivie', draw: () => horizontalThirds('#D52B1E', '#F9E300', '#007934') },
  cl: {
    name: 'Chili',
    draw: () => (
      <>
        <Rect width={W} height={H / 2} fill="#FFFFFF" />
        <Rect y={H / 2} width={W} height={H / 2} fill="#D52B1E" />
        <Rect width={H / 2} height={H / 2} fill="#0039A6" />
        <Path d={star(H / 4, H / 4 + 0.3, 4.2)} fill="#FFFFFF" />
      </>
    ),
  },
  co: {
    name: 'Colombie',
    draw: () => (
      <>
        <Rect width={W} height={H / 2} fill="#FCD116" />
        <Rect y={H / 2} width={W} height={H / 4 + 0.1} fill="#003893" />
        <Rect y={(H * 3) / 4} width={W} height={H / 4} fill="#CE1126" />
      </>
    ),
  },
  cr: {
    name: 'Costa Rica',
    draw: () => (
      <>
        <Rect width={W} height={H} fill="#FFFFFF" />
        <Rect width={W} height={H / 6} fill="#002B7F" />
        <Rect y={H / 3} width={W} height={H / 3} fill="#CE1126" />
        <Rect y={(H * 5) / 6} width={W} height={H / 6} fill="#002B7F" />
      </>
    ),
  },
  cu: { name: 'Cuba', draw: () => stripesWithTriangle('#002A8F', '#CF142B') },
  do: {
    name: 'République dominicaine',
    draw: () => (
      <>
        <Rect width={W} height={H} fill="#FFFFFF" />
        <Rect width={20.5} height={13} fill="#002D62" />
        <Rect x={25.5} width={20.5} height={13} fill="#CE1126" />
        <Rect y={18} width={20.5} height={13} fill="#CE1126" />
        <Rect x={25.5} y={18} width={20.5} height={13} fill="#002D62" />
      </>
    ),
  },
  ec: {
    name: 'Équateur',
    draw: () => (
      <>
        <Rect width={W} height={H / 2} fill="#FFD100" />
        <Rect y={H / 2} width={W} height={H / 4 + 0.1} fill="#034EA2" />
        <Rect y={(H * 3) / 4} width={W} height={H / 4} fill="#ED1C24" />
        <Ellipse cx={W / 2} cy={H / 2 + 0.5} rx={3.8} ry={4.6} fill="#3E7CB1" stroke={GOLD} strokeWidth={1.1} />
        <Path d="M19.4 10.6Q23 8.4 26.6 10.6L23 11.8Z" fill="#5B4636" />
      </>
    ),
  },
  gt: {
    name: 'Guatemala',
    draw: () => (
      <>
        {verticalThirds('#4997D0', '#FFFFFF', '#4997D0')}
        <Path d="M20.4 19Q17.6 15.5 20.6 11.4M25.6 19Q28.4 15.5 25.4 11.4" fill="none" stroke="#3C7D3F" strokeWidth={1.2} strokeLinecap="round" />
        <Circle cx={W / 2} cy={14.8} r={1.6} fill="#2E8B57" />
      </>
    ),
  },
  hn: {
    name: 'Honduras',
    draw: () => (
      <>
        {horizontalThirds('#00BCE4', '#FFFFFF', '#00BCE4')}
        <G fill="#00BCE4">
          <Circle cx={W / 2} cy={H / 2} r={1.15} />
          <Circle cx={18.6} cy={13.4} r={1.15} />
          <Circle cx={27.4} cy={13.4} r={1.15} />
          <Circle cx={18.6} cy={17.6} r={1.15} />
          <Circle cx={27.4} cy={17.6} r={1.15} />
        </G>
      </>
    ),
  },
  mx: {
    name: 'Mexique',
    draw: () => (
      <>
        {verticalThirds('#006847', '#FFFFFF', '#CE1126')}
        <Circle cx={W / 2} cy={14.6} r={3.2} fill="#8C5B2E" />
        <Path d="M18.6 16.4Q23 21.4 27.4 16.4" fill="none" stroke="#2F6B33" strokeWidth={1.2} strokeLinecap="round" />
      </>
    ),
  },
  ni: {
    name: 'Nicaragua',
    draw: () => (
      <>
        {horizontalThirds('#0067C6', '#FFFFFF', '#0067C6')}
        <Circle cx={W / 2} cy={H / 2} r={4.4} fill="none" stroke={GOLD} strokeWidth={0.9} />
        <Path d="M23 12.6L25.9 17.8H20.1Z" fill="#4FA3DF" stroke={GOLD} strokeWidth={0.6} />
      </>
    ),
  },
  pa: {
    name: 'Panama',
    draw: () => (
      <>
        <Rect width={W} height={H} fill="#FFFFFF" />
        <Rect x={W / 2} width={W / 2} height={H / 2} fill="#D21034" />
        <Rect y={H / 2} width={W / 2} height={H / 2} fill="#005293" />
        <Path d={star(W / 4, H / 4 + 0.3, 4)} fill="#005293" />
        <Path d={star((W * 3) / 4, (H * 3) / 4 + 0.3, 4)} fill="#D21034" />
      </>
    ),
  },
  pe: { name: 'Pérou', draw: () => verticalThirds('#D91023', '#FFFFFF', '#D91023') },
  pr: { name: 'Porto Rico', draw: () => stripesWithTriangle('#ED0000', '#0050F0') },
  py: {
    name: 'Paraguay',
    draw: () => (
      <>
        {horizontalThirds('#D52B1E', '#FFFFFF', '#0038A8')}
        <Circle cx={W / 2} cy={H / 2} r={3.6} fill="#FFFFFF" stroke="#3A7D44" strokeWidth={1} />
        <Circle cx={W / 2} cy={H / 2} r={1.2} fill="#FCD116" />
      </>
    ),
  },
  sv: {
    name: 'Salvador',
    draw: () => (
      <>
        {horizontalThirds('#0F47AF', '#FFFFFF', '#0F47AF')}
        <Circle cx={W / 2} cy={H / 2} r={4.6} fill="none" stroke={GOLD} strokeWidth={0.9} />
        <Path d="M23 12.4L26.2 18H19.8Z" fill="#3A7D44" stroke={GOLD} strokeWidth={0.6} />
      </>
    ),
  },
  uy: {
    name: 'Uruguay',
    draw: () => (
      <>
        <Rect width={W} height={H} fill="#FFFFFF" />
        {[1, 3, 5, 7].map((i) => (
          <Rect key={i} y={(H / 9) * i} width={W} height={H / 9} fill="#0038A8" />
        ))}
        <Rect width={(H / 9) * 5} height={(H / 9) * 5} fill="#FFFFFF" />
        <Circle cx={(H / 18) * 5} cy={(H / 18) * 5} r={5.2} fill="none" stroke="#FCD116" strokeWidth={1.6} strokeDasharray="1.2 1.2" />
        <Circle cx={(H / 18) * 5} cy={(H / 18) * 5} r={3.2} fill="#FCD116" />
      </>
    ),
  },
  ve: {
    name: 'Venezuela',
    draw: () => (
      <>
        {horizontalThirds('#FFCC00', '#00247D', '#CF142B')}
        <G fill="#FFFFFF">
          {[
            [16.89, 16.28],
            [18.02, 14.32],
            [19.75, 12.87],
            [21.87, 12.1],
            [24.13, 12.1],
            [26.25, 12.87],
            [27.98, 14.32],
            [29.11, 16.28],
          ].map(([cx, cy]) => (
            <Circle key={cx} cx={cx} cy={cy} r={0.85} />
          ))}
        </G>
      </>
    ),
  },
};

export const ALL_FLAGS = Object.keys(FLAGS) as FlagCode[];

/** Un drapeau en tissu : plis suggérés par un dégradé, ourlet en haut où passe la corde. */
export function Flag({ code }: { code: FlagCode }) {
  const cloth = `cloth-${code}`;
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <LinearGradient id={cloth} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.22} />
          <Stop offset="0.25" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="0.5" stopColor="#000000" stopOpacity={0.1} />
          <Stop offset="0.72" stopColor="#FFFFFF" stopOpacity={0.12} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.08} />
        </LinearGradient>
      </Defs>
      {FLAGS[code].draw()}
      <Rect width={W} height={H} fill={`url(#${cloth})`} />
      <Rect x={0.3} y={0.3} width={W - 0.6} height={H - 0.6} fill="none" stroke="rgba(42,24,16,0.2)" strokeWidth={0.6} />
      <Rect width={W} height={2.4} fill="#000000" opacity={0.18} />
    </Svg>
  );
}
