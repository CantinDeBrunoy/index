import { useEffect } from 'react';

/**
 * Durée de l'épanouissement, en millisecondes. Une seule valeur pilote
 * l'animation (par la variable `--bloom`) et le minuteur qui démonte
 * l'écran : deux durées séparées finiraient par diverger, et la couleur
 * disparaîtrait avant la fin de sa course, ou traînerait après.
 */
export const BLOOM_MS = 1300;

/**
 * La couleur du jour qu'on vient de choisir s'épanouit sur tout l'écran, puis
 * se retire — une goutte d'encre sur du papier mouillé.
 *
 * C'est la seule célébration de l'app pour sa propre journée, et elle est
 * muette : le panneau qui apparaît derrière dit déjà « ta journée est
 * enregistrée ». Répéter la phrase par-dessus la couleur ferait deux fois le
 * même travail.
 *
 * `pointer-events: none` : ce n'est pas un écran, c'est une confirmation. Un
 * appui pendant l'épanouissement doit atteindre ce qu'il vise.
 */
export function SaveBloom({ color, onDone }: { color: string; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, BLOOM_MS);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className="bloom"
      aria-hidden
      style={{ '--bloom': `${BLOOM_MS}ms`, '--bloom-color': color } as React.CSSProperties}
    >
      <span className="bloom__disc" />
    </div>
  );
}
