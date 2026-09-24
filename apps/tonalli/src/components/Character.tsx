import { useId } from 'react';
import type { CSSProperties } from 'react';

import { isLying, mouthPath, outfitLayers, poseOf } from '@/lib/character';
import type { CharacterState, Outfit, Paint, Piece } from '@/lib/character';
import { colorOf, shadeOf } from '@/lib/emotions';
import type { EmotionKey } from '@/lib/emotions';

/** Le corps : la même goutte que le logo, jamais redessinée. */
const BODY = 'M100,48 C138,46 170,76 166,116 C171,160 136,190 98,188 C60,190 30,156 34,114 C29,76 62,50 100,48 Z';

/* Le trait suit `currentColor` (l'encre, ou le trait clair la nuit) ; le
   papier se pose par `style`, où `var()` est lu partout — dans un attribut de
   présentation SVG, tous les navigateurs ne l'acceptent pas. */
const INK = 'currentColor';
const PAPER: CSSProperties = { fill: 'var(--bg)' };
const BUBBLE: CSSProperties = { fill: 'var(--surface)' };

type Props = {
  /** L'émotion jouée ; `null` avec l'état `scene` revient à attendre. */
  emotion: EmotionKey | null;
  /** La teinte exacte de la journée (le cran choisi) ; la franche par défaut. */
  color?: string | null;
  state?: CharacterState;
  outfit?: Outfit;
  /** Largeur en pixels ; la hauteur suit (200 × 220). */
  size?: number;
  /**
   * Immobile : pour les vignettes, où une vingtaine de personnages animés à la
   * fois coûteraient cher à un téléphone d'entrée de gamme pour rien dire.
   */
  still?: boolean;
  className?: string;
};

/**
 * Le personnage, dessiné à l'encre et teint de la journée. Décoratif : ce
 * qu'il joue est toujours écrit à côté (le nom de l'émotion), donc il reste
 * muet pour les lecteurs d'écran.
 *
 * Il ne se déplace jamais hors de son cadre : les animations bougent le corps
 * sur place, et s'arrêtent sous `prefers-reduced-motion`.
 */
export function Character({ emotion, color, state = 'scene', outfit = {}, size = 120, still = false, className }: Props) {
  // Plusieurs personnages cohabitent sur un écran : les motifs doivent avoir
  // des identifiants propres, et `useId` rend des deux-points qu'une
  // référence `url(#…)` ne tolère pas partout.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const scene = state === 'scene' && emotion !== null;
  const pose = poseOf(state, emotion);
  const lying = isLying(state, emotion);
  const layers = outfitLayers(outfit);

  const plain = scene ? colorOf(emotion) : null;
  const tint = scene ? (color ?? plain ?? 'transparent') : 'transparent';
  // Ce que le personnage tient (cadeau, lettre, coussin) prend le cran léger :
  // de la même famille que lui, sans se confondre avec son corps.
  const held = scene ? shadeOf(emotion, 'light') : null;
  const heldProps = held ? { fill: held } : { style: PAPER };
  const rock = scene ? shadeOf(emotion, 'deep') : null;

  const curl = pose.leg === 'curl';
  const bodyTransform = curl
    ? 'scale(1, 0.88) translateY(8px)'
    : scene && emotion === 'excitement'
      ? 'rotate(-6deg) translate(4px, 0)'
      : 'none';

  const is = (key: EmotionKey) => scene && emotion === key;
  const clip = `tcbody-${uid}`;
  const motif = outfit.motif ? `tc${outfit.motif}-${uid}` : null;

  return (
    <svg
      // Le mouvement porte sur tout le dessin, comme dans le canevas : il se
      // calcule autour du centre de la boîte, pas du coin du repère SVG.
      className={['character', still ? 'character--still' : pose.motion, className].filter(Boolean).join(' ')}
      width={size}
      height={(size * 220) / 200}
      viewBox="0 0 200 220"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={clip}>
          <path d={BODY} />
        </clipPath>
        {outfit.motif === 'stripes' ? (
          <pattern id={motif!} width="14" height="14" patternTransform="rotate(18)" patternUnits="userSpaceOnUse">
            <rect width="6" height="14" fill={INK} opacity="0.28" />
          </pattern>
        ) : null}
        {outfit.motif === 'dots' ? (
          <pattern id={motif!} width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="5" cy="5" r="2.6" fill={INK} opacity="0.3" />
            <circle cx="14" cy="13" r="2.6" fill={INK} opacity="0.3" />
          </pattern>
        ) : null}
        {outfit.motif === 'checks' ? (
          <pattern id={motif!} width="16" height="16" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill={INK} opacity="0.16" />
            <rect x="8" y="8" width="8" height="8" fill={INK} opacity="0.16" />
          </pattern>
        ) : null}
        {outfit.motif === 'stars' ? (
          <pattern id={motif!} width="26" height="26" patternUnits="userSpaceOnUse">
            <path d="M7,2 L8.6,5.6 L12.4,6 L9.5,8.5 L10.4,12.2 L7,10.3 L3.6,12.2 L4.5,8.5 L1.6,6 L5.4,5.6 Z" fill={INK} opacity="0.28" />
            <path d="M20,15 L21.2,17.6 L24,17.9 L21.9,19.8 L22.5,22.5 L20,21.1 L17.5,22.5 L18.1,19.8 L16,17.9 L18.8,17.6 Z" fill={INK} opacity="0.28" />
          </pattern>
        ) : null}
      </defs>

      <ellipse cx="100" cy="204" rx="46" ry="8" fill={plain ?? INK} opacity={plain ? 0.28 : 0.1} />

      {is('pride') ? (
        <path
          d="M46,206 Q42,182 70,178 Q100,172 130,180 Q158,186 154,206 Z"
          fill={rock ?? undefined}
          stroke={INK}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      ) : null}

      {lying ? (
        <g>
          <rect x="14" y="184" width="54" height="24" rx="12" {...heldProps} stroke={INK} strokeWidth="3.5" />
          <path
            d="M40,206 C28,158 56,128 104,130 C154,132 176,162 166,206 C166,214 40,214 40,206 Z"
            fill={tint}
            stroke={INK}
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <g fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round">
            <path d="M68,158 Q76,163 84,158" />
            <path d="M92,158 Q100,163 108,158" />
            <path d="M78,176 Q88,181 98,176" />
          </g>
          <g fill={INK} fontFamily="sans-serif" fontWeight="700">
            <text className="tc-zzz-a" x="118" y="124" fontSize="15">Z</text>
            <text className="tc-zzz-b" x="132" y="108" fontSize="12">z</text>
            <text className="tc-zzz-c" x="144" y="94" fontSize="9">z</text>
          </g>
        </g>
      ) : (
        <g>
          <g style={{ transform: bodyTransform, transformOrigin: '100px 190px' }}>
            {pose.leg === 'stand' ? (
              <g fill={tint} stroke={INK} strokeWidth="4">
                <ellipse cx="70" cy="194" rx="15" ry="9" />
                <ellipse cx="130" cy="194" rx="15" ry="9" />
              </g>
            ) : null}

            <Pieces pieces={layers.behind} tint={tint} held={held} />

            <path d={BODY} fill={tint} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
            {motif ? <rect x="20" y="40" width="160" height="160" fill={`url(#${motif})`} clipPath={`url(#${clip})`} /> : null}

            <Arms arm={pose.arm} tint={tint} heldProps={heldProps} />

            {is('love') ? (
              <g fill={tint} stroke={INK} strokeWidth="1.8">
                <path className="tc-heart-a" d="M52,120 C52,117 56,117 56,120 C56,117 60,117 60,120 C60,124 56,128 56,128 C56,128 52,124 52,120 Z" />
                <path className="tc-heart-b" d="M140,124 C140,121 144,121 144,124 C144,121 148,121 148,124 C148,128 144,132 144,132 C144,132 140,128 140,124 Z" />
              </g>
            ) : null}

            <Pieces pieces={layers.body} tint={tint} held={held} />

            {pose.eye === 'soft' ? (
              <g fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round">
                <path d="M73,112 Q80,117 87,112" />
                <path d="M113,112 Q120,117 127,112" />
              </g>
            ) : (
              <g fill={INK}>
                <ellipse cx="80" cy="112" rx="5.5" ry={pose.eyeHeight} />
                <ellipse cx="120" cy="112" rx="5.5" ry={pose.eyeHeight} />
              </g>
            )}

            <Pieces pieces={layers.face} tint={tint} held={held} />

            {pose.yawn ? (
              <ellipse cx="100" cy="140" rx="7" ry="9" fill={INK} opacity="0.85" />
            ) : (
              <path d={mouthPath(pose.mouth)} fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
            )}

            {pose.arm === 'rubEyes' ? (
              // Elle se frotte l'œil, sans larme : la Tristesse ne pleure jamais.
              <g className="tc-rub" style={{ transformOrigin: '142px 130px' }}>
                <path d="M142,130 Q150,114 128,104" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
                <ellipse cx="126" cy="104" rx="11" ry="9" fill={tint} stroke={INK} strokeWidth="4" />
              </g>
            ) : null}
            {is('anger') ? (
              <g className="tc-vein" style={{ transformOrigin: '84px 86px' }}>
                <path
                  d="M75,84 Q82,84 82,77 M86,77 Q86,84 93,84 M93,88 Q86,88 86,95 M82,95 Q82,88 75,88"
                  fill="none"
                  stroke={INK}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </g>
            ) : null}

            <Pieces pieces={layers.head} tint={tint} held={held} />

            {is('excitement') ? (
              <g fill={tint} stroke={INK} strokeWidth="3.5" strokeLinejoin="round">
                <path d="M76,56 Q66,42 74,30 Q80,44 82,58 Z" />
                <path d="M124,56 Q134,42 126,30 Q120,44 118,58 Z" />
              </g>
            ) : null}
            {is('pride') ? (
              <>
                <path d="M64,58 L68,36 L82,50 L100,22 L118,50 L132,36 L136,58 Z" fill={tint} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
                <circle cx="100" cy="30" r="4" {...heldProps} stroke={INK} strokeWidth="2" />
              </>
            ) : null}
            {is('nostalgia') ? (
              // La bulle de pensée est blanche comme le papier, pas teintée :
              // sinon elle se lirait comme un morceau du personnage.
              <g className="tc-cloud" stroke={INK} style={BUBBLE}>
                <circle cx="79" cy="46" r="2.3" strokeWidth="2.4" />
                <circle cx="71" cy="38.8" r="3.7" strokeWidth="2.4" />
                <path
                  d="M40,10 C48.38,1.76 69.52,4.98 61.14,13.22 C66.88,11.91 75.82,17.79 70.08,19.1 C75.62,19.45 71.74,28.76 66.2,28.41 C74.5,32.47 58.45,37.39 50.15,33.34 C50.76,43.74 31.81,43.91 31.2,33.51 C21.2,38.09 2.2,31.89 12.19,27.3 C8.01,27.56 5.15,20.49 9.34,20.23 C2.7,18.84 12.72,11.66 19.36,13.05 C11.31,4.87 31.95,1.83 40,10 Z"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
              </g>
            ) : null}
            {is('serenity') ? (
              <g fill={tint} stroke={INK} strokeWidth="1.8">
                <circle className="tc-halo-a" cx="0" cy="0" r="3.6" />
                <circle className="tc-halo-b" cx="0" cy="0" r="3.6" />
                <circle className="tc-halo-c" cx="0" cy="0" r="3.6" />
              </g>
            ) : null}
          </g>
        </g>
      )}

      {is('joy') ? (
        <circle
          className="tc-ball"
          cx="158"
          cy="184"
          r="13"
          fill={tint}
          stroke={INK}
          strokeWidth="3.5"
          style={{ transformOrigin: '158px 198px' }}
        />
      ) : null}
    </svg>
  );
}

type HeldProps = { fill: string } | { style: CSSProperties };

function Arms({ arm, tint, heldProps }: { arm: string; tint: string; heldProps: HeldProps }) {
  const limb = { fill: 'none', stroke: INK, strokeWidth: 9, strokeLinecap: 'round' as const };
  switch (arm) {
    case 'hang':
      return (
        <g {...limb}>
          <path d="M55,128 Q45,150 50,168" />
          <path d="M145,128 Q155,150 150,168" />
        </g>
      );
    case 'hug':
      return (
        <>
          <g {...limb}>
            <path d="M58,132 Q75,160 100,161" />
            <path d="M142,132 Q125,160 100,161" />
          </g>
          <rect x="84" y="143" width="32" height="22" rx="4" {...heldProps} stroke={INK} strokeWidth="3.6" />
          <path d="M86.5,146 L100,155 L113.5,146" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
    case 'hugUp':
      return (
        <>
          <g {...limb}>
            <path d="M58,132 Q76,148 100,150" />
            <path d="M142,130 Q152,112 147,96" />
          </g>
          <rect x="118" y="80" width="36" height="28" rx="4" {...heldProps} stroke={INK} strokeWidth="4" transform="rotate(-8 136 94)" />
        </>
      );
    case 'akimbo':
      return (
        <g fill={tint} stroke={INK} strokeWidth="6" strokeLinejoin="round">
          <path d="M56,124 Q30,128 34,150 Q46,154 60,138 Z" />
          <path d="M144,124 Q170,128 166,150 Q154,154 140,138 Z" />
        </g>
      );
    case 'gift':
      return (
        <>
          <g {...limb}>
            <path d="M58,132 Q75,144 90,148" />
            <path d="M142,132 Q125,144 110,148" />
          </g>
          <rect x="86" y="139" width="28" height="24" rx="3" {...heldProps} stroke={INK} strokeWidth="3.5" />
          <path d="M100,139 L100,163 M86,151 L114,151" stroke={INK} strokeWidth="2.5" />
          <g fill="none" stroke={INK} strokeWidth="2">
            <circle cx="95" cy="137" r="4" />
            <circle cx="105" cy="137" r="4" />
          </g>
        </>
      );
    case 'meditate':
      return (
        <>
          <g {...limb}>
            <path d="M58,132 Q52,150 70,158" />
            <path d="M142,132 Q148,150 130,158" />
          </g>
          <g fill="none" stroke={INK} strokeWidth="3">
            <circle cx="70" cy="158" r="6.5" />
            <circle cx="130" cy="158" r="6.5" />
          </g>
        </>
      );
    case 'watch':
      return (
        <>
          <g {...limb}>
            <path d="M55,128 Q45,150 50,168" />
            <path d="M142,128 Q150,108 137,98" />
          </g>
          <circle cx="136" cy="96" r="7" {...heldProps} stroke={INK} strokeWidth="3" />
          <path d="M136,92 L136,96 L139,98" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case 'tuck':
      return (
        <g {...limb}>
          <path d="M55,132 Q51,148 58,159" />
          <path d="M145,132 Q149,148 142,159" />
        </g>
      );
    case 'rubEyes':
      // Le bras qui frotte l'œil est dessiné plus haut, par-dessus le visage.
      return <path d="M58,132 Q52,150 60,166" {...limb} />;
    default:
      return null;
  }
}

/**
 * Des pièces d'accessoire (voir `ACCESSORY_PIECES`), peintes aux couleurs du
 * personnage : la même source que les scènes à deux.
 */
function Pieces({ pieces, tint, held }: { pieces: Piece[]; tint: string; held: string | null }) {
  return (
    <>
      {pieces.map((piece, index) => {
        const paint = (value: Paint | undefined): string | undefined =>
          value === undefined || value === 'none'
            ? 'none'
            : value === 'ink'
              ? INK
              : value === 'tint'
                ? tint
                : value === 'held'
                  ? (held ?? 'var(--bg)')
                  : value === 'paper'
                    ? 'var(--bg)'
                    : value;
        return (
          <path
            key={index}
            d={piece.d}
            transform={piece.tf}
            opacity={piece.op}
            strokeWidth={piece.sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ fill: paint(piece.fill), stroke: piece.stroke === false ? 'none' : INK }}
          />
        );
      })}
    </>
  );
}
