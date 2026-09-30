import type { Outfit } from '@/lib/character';

/**
 * Le motif d'une tenue, à l'encre et très léger : il se voit sur la teinte
 * sans la couvrir. Pavé dans le repère du personnage, il se pose sur le corps
 * — découpé par sa forme — dans le personnage seul comme dans les scènes à deux.
 */
export function MotifPattern({ id, motif }: { id: string; motif: NonNullable<Outfit['motif']> }) {
  switch (motif) {
    case 'stripes':
      return (
        <pattern id={id} width="14" height="14" patternTransform="rotate(18)" patternUnits="userSpaceOnUse">
          <rect width="6" height="14" fill="currentColor" opacity="0.28" />
        </pattern>
      );
    case 'dots':
      return (
        <pattern id={id} width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="5" r="2.6" fill="currentColor" opacity="0.3" />
          <circle cx="14" cy="13" r="2.6" fill="currentColor" opacity="0.3" />
        </pattern>
      );
    case 'checks':
      return (
        <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="currentColor" opacity="0.16" />
          <rect x="8" y="8" width="8" height="8" fill="currentColor" opacity="0.16" />
        </pattern>
      );
    case 'stars':
      return (
        <pattern id={id} width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M7,2 L8.6,5.6 L12.4,6 L9.5,8.5 L10.4,12.2 L7,10.3 L3.6,12.2 L4.5,8.5 L1.6,6 L5.4,5.6 Z" fill="currentColor" opacity="0.28" />
          <path d="M20,15 L21.2,17.6 L24,17.9 L21.9,19.8 L22.5,22.5 L20,21.1 L17.5,22.5 L18.1,19.8 L16,17.9 L18.8,17.6 Z" fill="currentColor" opacity="0.28" />
        </pattern>
      );
  }
}
