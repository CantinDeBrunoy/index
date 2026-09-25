import { useEffect, useState } from 'react';

import { Character } from '@/components/Character';
import { EMOTIONS } from '@/lib/emotions';
import { sunRays } from '@/lib/logo';
import { useI18n } from '@/state/I18nProvider';

/** Chaque émotion tient la scène 2,5 s : le tour des douze prend 30 s. */
export const WELCOME_STEP_MS = 2500;

const RAYS = sunRays(150, 108, 128);

/**
 * Le soleil de l'écran d'accueil : le logo en grand, et le personnage qui
 * passe par les douze émotions. Le rayon de celle qui est à l'écran
 * s'allume, les onze autres pâlissent sans disparaître — c'est l'app en une
 * image, avant même de s'inscrire.
 *
 * Deux personnages au plus sont montés, celui qui entre et celui qui sort :
 * douze figures animées en même temps coûteraient cher à un petit téléphone
 * pour n'en montrer qu'une.
 *
 * Décoratif : le nom de l'app et sa promesse sont écrits dessous, et un
 * lecteur d'écran n'a rien à gagner à entendre défiler douze émotions. Sous
 * `prefers-reduced-motion`, rien ne défile : Joie reste, rayon allumé.
 */
export function WelcomeSun() {
  const { t } = useI18n();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setStep((current) => current + 1), WELCOME_STEP_MS);
    return () => window.clearInterval(timer);
  }, []);

  const index = step % EMOTIONS.length;
  const shown = EMOTIONS[index];
  const leaving = step > 0 ? EMOTIONS[(step - 1) % EMOTIONS.length] : null;

  return (
    <div className="welcome-sun" aria-hidden="true">
      <div className="welcome-sun__disc">
        <svg className="welcome-sun__rays" viewBox="0 0 300 300" focusable="false">
          {RAYS.map((ray) => (
            <path
              key={ray.key}
              className={ray.key === shown.key ? 'welcome-sun__ray is-lit' : 'welcome-sun__ray'}
              d={`M${ray.x1},${ray.y1} L${ray.x2},${ray.y2}`}
              stroke={ray.color}
            />
          ))}
        </svg>
        <div className="welcome-sun__stage">
          {/* La clé est le pas, pas l'émotion : au tour suivant, Joie revient comme une entrée neuve. */}
          {leaving ? (
            <div key={`out-${step - 1}`} className="welcome-sun__slot welcome-sun__slot--out">
              <Character emotion={leaving.key} size={168} still />
            </div>
          ) : null}
          <div key={`in-${step}`} className="welcome-sun__slot welcome-sun__slot--in">
            <Character emotion={shown.key} size={168} />
          </div>
        </div>
      </div>
      <div key={step} className="welcome-sun__name">
        {t(`emotions.${shown.key}`)}
      </div>
    </div>
  );
}
