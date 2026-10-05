import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * Icônes de l'interface, dessinées au trait (tracés repris de Lucide, licence
 * ISC). Les emojis restent réservés au contenu (l'illustration des chansons).
 */
export type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'check'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'clipboard'
  | 'languages'
  | 'layers'
  | 'loader'
  | 'music'
  | 'pause'
  | 'play'
  | 'plus'
  | 'pointer'
  | 'restart'
  | 'search'
  | 'volume'
  | 'flip'
  | 'x';

const FILLED: IconName[] = ['pause', 'play'];

function Shapes({ name }: { name: IconName }) {
  switch (name) {
    case 'arrow-left':
      return (
        <>
          <Path d="m12 19-7-7 7-7" />
          <Path d="M19 12H5" />
        </>
      );
    case 'arrow-right':
      return (
        <>
          <Path d="M5 12h14" />
          <Path d="m12 5 7 7-7 7" />
        </>
      );
    case 'check':
      return <Path d="M20 6 9 17l-5-5" />;
    case 'chevron-down':
      return <Path d="m6 9 6 6 6-6" />;
    case 'chevron-left':
      return <Path d="m15 18-6-6 6-6" />;
    case 'chevron-right':
      return <Path d="m9 18 6-6-6-6" />;
    case 'clipboard':
      return (
        <>
          <Rect width={8} height={4} x={8} y={2} rx={1} />
          <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        </>
      );
    case 'languages':
      return (
        <>
          <Path d="m5 8 6 6" />
          <Path d="m4 14 6-6 2-3" />
          <Path d="M2 5h12" />
          <Path d="M7 2h1" />
          <Path d="m22 22-5-10-5 10" />
          <Path d="M14 18h6" />
        </>
      );
    case 'layers':
      return (
        <>
          <Path d="M12 2 2 7l10 5 10-5-10-5Z" />
          <Path d="m2 17 10 5 10-5" />
          <Path d="m2 12 10 5 10-5" />
        </>
      );
    case 'loader':
      return <Path d="M21 12a9 9 0 1 1-6.22-8.56" />;
    case 'music':
      return (
        <>
          <Path d="M9 18V5l12-2v13" />
          <Circle cx={6} cy={18} r={3} />
          <Circle cx={18} cy={16} r={3} />
        </>
      );
    case 'pause':
      return (
        <>
          <Rect x={6} y={4} width={4} height={16} rx={1.5} />
          <Rect x={14} y={4} width={4} height={16} rx={1.5} />
        </>
      );
    case 'play':
      return <Path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />;
    case 'plus':
      return (
        <>
          <Path d="M5 12h14" />
          <Path d="M12 5v14" />
        </>
      );
    case 'pointer':
      return (
        <>
          <Path d="M22 14a8 8 0 0 1-8 8" />
          <Path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
          <Path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" />
          <Path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" />
          <Path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
        </>
      );
    case 'restart':
      return (
        <>
          <Path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <Path d="M3 3v5h5" />
        </>
      );
    case 'flip':
      return (
        <>
          <Path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <Path d="M21 3v5h-5" />
        </>
      );
    case 'search':
      return (
        <>
          <Circle cx={11} cy={11} r={8} />
          <Path d="m21 21-4.3-4.3" />
        </>
      );
    case 'volume':
      return (
        <>
          <Path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
          <Path d="M16 9a5 5 0 0 1 0 6" />
          <Path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
        </>
      );
    case 'x':
      return (
        <>
          <Path d="M18 6 6 18" />
          <Path d="m6 6 12 12" />
        </>
      );
  }
}

export function Icon({
  name,
  size = 24,
  color,
  strokeWidth = 2,
  style,
}: {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const filled = FILLED.includes(name);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={style}
      fill={filled ? color : 'none'}
      stroke={filled ? 'none' : color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      pointerEvents="none">
      <Shapes name={name} />
    </Svg>
  );
}
