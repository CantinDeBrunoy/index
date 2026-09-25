import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { Character } from '@/components/Character';
import { EMOTIONS } from '@/lib/emotions';
import type { EmotionKey } from '@/lib/emotions';
import { sunRays } from '@/lib/logo';
import { useI18n } from '@/state/I18nProvider';

/** Chaque émotion tient la scène 2,5 s : le tour des douze prend 30 s. */
export const WELCOME_STEP_MS = 2500;

const RAYS = sunRays(150, 108, 128);

/**
 * Une seule horloge pour tous les soleils de la page, partie au chargement :
 * de l'accueil au formulaire, le personnage poursuit son tour au lieu de
 * repartir de Joie à chaque écran.
 */
const CLOCK_START = Date.now();
const stepNow = () => Math.floor((Date.now() - CLOCK_START) / WELCOME_STEP_MS);

type SunProps = {
  /** Côté du soleil, en pixels. */
  size: number;
  /** Épaisseur des rayons, en unités du dessin (300 de côté) : plus épais quand le soleil est petit. */
  rayWidth?: number;
  /** L'émotion dont le rayon est allumé ; `null` : tous pâles. */
  lit: EmotionKey | null;
  children: ReactNode;
};

/**
 * Le soleil de Tonalli en grand : douze rayons et, au centre, ce qu'on y
 * pose. Les rayons éteints pâlissent sans disparaître : le soleil reste
 * entier. Décoratif — le texte à côté dit toujours l'essentiel.
 */
export function Sun({ size, rayWidth = 9, lit, children }: SunProps) {
  return (
    <div className="sun" style={{ width: size }} aria-hidden="true">
      <svg className="sun__rays" viewBox="0 0 300 300" focusable="false">
        {RAYS.map((ray) => (
          <path
            key={ray.key}
            className={ray.key === lit ? 'sun__ray is-lit' : 'sun__ray'}
            d={`M${ray.x1},${ray.y1} L${ray.x2},${ray.y2}`}
            stroke={ray.color}
            strokeWidth={rayWidth}
          />
        ))}
      </svg>
      <div className="sun__stage">{children}</div>
    </div>
  );
}

type WelcomeSunProps = {
  size?: number;
  rayWidth?: number;
  /** Le nom de l'émotion sous le soleil : sur l'accueil, pas au-dessus d'un titre. */
  named?: boolean;
};

/**
 * Le soleil de l'accueil et des formulaires : le personnage passe par les
 * douze émotions, et le rayon de celle qui joue s'allume — c'est l'app en
 * une image, avant même de s'inscrire.
 *
 * Deux personnages au plus sont montés, celui qui entre et celui qui sort :
 * douze figures animées en même temps coûteraient cher à un petit téléphone
 * pour n'en montrer qu'une. Sous `prefers-reduced-motion`, rien ne défile :
 * Joie reste, rayon allumé.
 */
export function WelcomeSun({ size = 300, rayWidth, named = false }: WelcomeSunProps) {
  const { t } = useI18n();
  const [calm] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Le pas d'arrivée : pas de personnage sortant au premier rendu d'un écran.
  const [firstStep] = useState(() => (calm ? 0 : stepNow()));
  const [step, setStep] = useState(firstStep);

  useEffect(() => {
    if (calm) return;
    // Un coup d'œil fréquent plutôt qu'un intervalle de 2,5 s : on reste calé
    // sur l'horloge commune, et React ignore les pas qui ne changent rien.
    const timer = window.setInterval(() => setStep(stepNow()), 200);
    return () => window.clearInterval(timer);
  }, [calm]);

  const shown = EMOTIONS[step % EMOTIONS.length];
  const leaving = step > firstStep ? EMOTIONS[(step - 1) % EMOTIONS.length] : null;

  return (
    <div className="welcome-sun">
      <Sun size={size} rayWidth={rayWidth} lit={shown.key}>
        {/* La clé est le pas, pas l'émotion : au tour suivant, Joie revient comme une entrée neuve. */}
        {leaving ? (
          <div key={`out-${step - 1}`} className="sun__slot sun__slot--out">
            <Character emotion={leaving.key} size={168} still />
          </div>
        ) : null}
        <div key={`in-${step}`} className={step > firstStep ? 'sun__slot sun__slot--in' : 'sun__slot'}>
          <Character emotion={shown.key} size={168} />
        </div>
      </Sun>
      {named ? (
        <div key={step} className="welcome-sun__name" aria-hidden="true">
          {t(`emotions.${shown.key}`)}
        </div>
      ) : null}
    </div>
  );
}
