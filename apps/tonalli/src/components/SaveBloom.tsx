import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * Durée du trajet, en millisecondes. Une seule valeur pilote l'animation et
 * le minuteur qui démonte l'écran : deux durées séparées finiraient par
 * diverger, et l'encre disparaîtrait avant d'arriver, ou traînerait après.
 */
export const BLOOM_MS = 1100;

/** Point de départ de l'encre, en coordonnées d'écran. */
export type Origin = { x: number; y: number };

/**
 * La couleur du jour part du bouton qu'on vient d'appuyer, envahit l'écran,
 * puis **va se ranger dans le bandeau de la journée**.
 *
 * Un rond qui grandit au milieu de nulle part ne raconte rien. Ici le
 * mouvement dit ce qui vient de se passer : l'encre naît du geste, occupe un
 * instant toute la place — c'est la couleur du jour, elle a le droit — et se
 * replie là où la journée va vivre. Elle s'efface en arrivant sur le bandeau
 * réel, qui porte déjà la même couleur : le raccord ne se voit pas.
 *
 * L'animation est pilotée en JavaScript et non en CSS parce que sa géométrie
 * n'est connue qu'au moment du rendu — la position du bouton dépend de la
 * longueur de la note, celle du bandeau de la taille de l'écran.
 *
 * `pointer-events: none` : c'est une confirmation, pas un écran. Un appui
 * pendant le trajet doit atteindre ce qu'il vise.
 */
export function SaveBloom({
  color,
  from,
  target,
  onDone,
}: {
  color: string;
  from: Origin;
  /** Le bandeau de la journée enregistrée, où l'encre va se poser. */
  target: RefObject<HTMLDivElement | null>;
  onDone: () => void;
}) {
  const ink = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ink.current;
    const hero = target.current;

    // Mouvement réduit, navigateur sans Web Animations, ou bandeau introuvable
    // (une journée sans couleur connue) : on renonce sans rien casser. La
    // journée est enregistrée, c'est ça qui compte.
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!element || !hero || calm || typeof element.animate !== 'function') {
      onDone();
      return;
    }

    const rect = hero.getBoundingClientRect();
    const radius = getComputedStyle(hero).borderRadius || '22px';

    // La goutte de départ est **centrée sur le bouton** : une boîte qui grandit
    // depuis son coin haut-gauche partirait en biais, et l'encre semblerait
    // jaillir d'à côté du geste plutôt que du geste.
    const seed = 56;
    const settled = {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      borderRadius: radius,
    };

    const animation = element.animate(
      [
        // Un point sur le bouton.
        {
          left: `${from.x}px`,
          top: `${from.y}px`,
          width: '0px',
          height: '0px',
          borderRadius: '50%',
          opacity: 0,
          easing: 'ease-out',
        },
        // La goutte perle.
        {
          left: `${from.x - seed / 2}px`,
          top: `${from.y - seed / 2}px`,
          width: `${seed}px`,
          height: `${seed}px`,
          borderRadius: '50%',
          opacity: 1,
          offset: 0.08,
          easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
        },
        // Toute la place, un instant : c'est la couleur du jour, elle a le droit.
        {
          left: '-25vmax',
          top: '-25vmax',
          width: '150vmax',
          height: '150vmax',
          borderRadius: '50%',
          opacity: 1,
          offset: 0.46,
          easing: 'cubic-bezier(0.5, 0, 0.2, 1)',
        },
        // Puis l'encre se replie sur le bandeau de la journée.
        { ...settled, opacity: 1, offset: 0.86, easing: 'linear' },
        // Et s'efface sur le vrai bandeau, qui porte déjà la même couleur.
        { ...settled, opacity: 0 },
      ],
      // Chaque segment porte sa propre courbe : une seule appliquée à
      // l'ensemble écrase les dernières étapes, et l'encre arrivait rangée
      // avant même d'avoir envahi l'écran.
      { duration: BLOOM_MS, easing: 'linear', fill: 'forwards' },
    );

    // On démonte sur la fin réelle de l'animation, pas sur un minuteur parallèle
    // qui pourrait dériver. `onfinish` ne part pas si l'onglet passe en
    // arrière-plan : le minuteur reste en filet.
    const finish = () => onDone();
    animation.addEventListener('finish', finish);
    const timer = window.setTimeout(finish, BLOOM_MS + 200);

    return () => {
      animation.removeEventListener('finish', finish);
      window.clearTimeout(timer);
      animation.cancel();
    };
  }, [from, target, onDone]);

  return (
    <div className="bloom" aria-hidden>
      <span ref={ink} className="bloom__ink" style={{ background: color }} />
    </div>
  );
}
