import { useId } from 'react';
import type { CSSProperties } from 'react';

import { isLying, mouthPath, poseOf } from '@/lib/character';
import type { CharacterState, Outfit } from '@/lib/character';
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

            {outfit.body === 'cape' ? (
              <g {...heldProps} stroke={INK} strokeWidth="3.5">
                <path d="M58,92 Q20,140 26,196 Q48,204 70,190 Q46,160 60,100 Z" />
                <path d="M142,92 Q180,140 174,196 Q152,204 130,190 Q154,160 140,100 Z" />
              </g>
            ) : null}

            <path d={BODY} fill={tint} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
            {motif ? <rect x="20" y="40" width="160" height="160" fill={`url(#${motif})`} clipPath={`url(#${clip})`} /> : null}

            <Arms arm={pose.arm} tint={tint} heldProps={heldProps} />

            {is('love') ? (
              <g fill={tint} stroke={INK} strokeWidth="1.8">
                <path className="tc-heart-a" d="M52,120 C52,117 56,117 56,120 C56,117 60,117 60,120 C60,124 56,128 56,128 C56,128 52,124 52,120 Z" />
                <path className="tc-heart-b" d="M140,124 C140,121 144,121 144,124 C144,121 148,121 148,124 C148,128 144,132 144,132 C144,132 140,128 140,124 Z" />
              </g>
            ) : null}

            <BodyAccessory body={outfit.body} heldProps={heldProps} />

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

            <FaceAccessory face={outfit.face} tint={tint} />

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

            <HeadAccessory head={outfit.head} tint={tint} heldProps={heldProps} />

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

function BodyAccessory({ body, heldProps }: { body: Outfit['body']; heldProps: HeldProps }) {
  switch (body) {
    case 'scarf':
      // Sous la bouche, là où serait le cou : un tour d'écharpe et un pan qui pend.
      return (
        <g {...heldProps} stroke={INK} strokeLinejoin="round">
          <path d="M46,145 Q100,166 154,145 L150,160 Q100,182 50,160 Z" strokeWidth="4" />
          <path d="M118,163 Q126,180 120,200 L134,196 Q138,180 132,159 Z" strokeWidth="3.5" />
        </g>
      );
    case 'bowtie':
      return (
        <g {...heldProps} stroke={INK} strokeLinejoin="round">
          <path d="M100,154 L82,145 L82,163 Z M100,154 L118,145 L118,163 Z" strokeWidth="3.2" />
          <circle cx="100" cy="154" r="4.5" strokeWidth="3" />
        </g>
      );
    case 'necklace':
      return (
        <>
          <path d="M56,146 Q100,172 144,146" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M100,159 L107,168 L100,177 L93,168 Z" {...heldProps} stroke={INK} strokeWidth="2.8" strokeLinejoin="round" />
        </>
      );
    case 'satchel':
      // La bandoulière passe sous le menton, jamais sur le visage.
      return (
        <>
          <path d="M40,138 Q76,166 120,168" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <rect x="112" y="156" width="36" height="28" rx="6" {...heldProps} stroke={INK} strokeWidth="4" />
          <path d="M112,166 L148,166" stroke={INK} strokeWidth="2.5" opacity="0.6" />
        </>
      );
    default:
      // La cape se dessine derrière le corps, avant lui.
      return null;
  }
}

function FaceAccessory({ face, tint }: { face: Outfit['face']; tint: string }) {
  switch (face) {
    case 'glasses':
      return (
        <g fill="none" stroke={INK} strokeWidth="3.5">
          <circle cx="80" cy="112" r="13" />
          <circle cx="120" cy="112" r="13" />
          <path d="M93,112 L107,112" />
        </g>
      );
    case 'freckles':
      return (
        <g fill={INK} opacity="0.6">
          <circle cx="70" cy="124" r="2" />
          <circle cx="77" cy="128" r="2" />
          <circle cx="123" cy="128" r="2" />
          <circle cx="130" cy="124" r="2" />
        </g>
      );
    case 'lashes':
      return (
        <path
          d="M71,104 L67,99 M77,101 L76,95 M83,102 L86,97 M117,102 L114,97 M123,101 L124,95 M129,104 L133,99"
          fill="none"
          stroke={INK}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      );
    case 'mole':
      return <circle cx="116" cy="131" r="2.6" fill={INK} />;
    case 'bandage':
      return (
        <g transform="rotate(-24 134 124)">
          <rect x="121" y="119" width="26" height="10" rx="5" fill="#F3E3C8" stroke={INK} strokeWidth="2.4" />
          <rect x="130" y="119" width="8" height="10" fill={INK} opacity="0.12" />
        </g>
      );
    case 'blush':
      return (
        <g fill={tint} opacity="0.65">
          <ellipse cx="68" cy="126" rx="9" ry="6" />
          <ellipse cx="132" cy="126" rx="9" ry="6" />
        </g>
      );
    default:
      return null;
  }
}

function HeadAccessory({ head, tint, heldProps }: { head: Outfit['head']; tint: string; heldProps: HeldProps }) {
  switch (head) {
    case 'beanie':
      return (
        <g fill={tint} stroke={INK}>
          <path d="M58,62 Q100,18 142,62 L138,74 Q100,50 62,74 Z" strokeWidth="4" />
          <circle cx="100" cy="18" r="7" strokeWidth="3.5" />
        </g>
      );
    case 'flower':
      return (
        <>
          <path d="M62,66 Q58,50 66,40" fill="none" stroke={INK} strokeWidth="3" />
          <g transform="translate(66,36)">
            <g fill={tint} stroke={INK} strokeWidth="2.5">
              <circle cx="0" cy="-8" r="6" />
              <circle cx="7" cy="-3" r="6" />
              <circle cx="4" cy="6" r="6" />
              <circle cx="-7" cy="-3" r="6" />
              <circle cx="-4" cy="6" r="6" />
            </g>
            <circle cx="0" cy="0" r="4" fill={INK} opacity="0.7" />
          </g>
        </>
      );
    case 'ears':
      return (
        <g fill={tint} stroke={INK} strokeWidth="4">
          <ellipse cx="72" cy="46" rx="10" ry="16" transform="rotate(-18 72 46)" />
          <ellipse cx="128" cy="46" rx="10" ry="16" transform="rotate(18 128 46)" />
        </g>
      );
    case 'cap':
      return (
        <>
          <path d="M62,68 Q60,32 100,30 Q140,32 138,68 Q100,58 62,68 Z" fill={tint} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M134,64 Q160,58 176,68 Q156,76 136,72 Z" {...heldProps} stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
          <circle cx="100" cy="30" r="3.5" fill={INK} />
        </>
      );
    case 'bow':
      return (
        <g {...heldProps} stroke={INK} strokeLinejoin="round">
          <path d="M122,52 L104,40 L106,62 Z M122,52 L140,40 L138,62 Z" strokeWidth="3.2" />
          <circle cx="122" cy="51" r="5" strokeWidth="3" />
        </g>
      );
    case 'antennae':
      return (
        <>
          <path d="M84,52 Q76,34 66,26 M116,52 Q124,34 134,26" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <g {...heldProps} stroke={INK} strokeWidth="3">
            <circle cx="65" cy="24" r="6" />
            <circle cx="135" cy="24" r="6" />
          </g>
        </>
      );
    case 'lock':
      return <path d="M96,50 Q92,28 106,22 Q98,32 100,50" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />;
    default:
      return null;
  }
}
