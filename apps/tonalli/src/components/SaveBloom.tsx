import { useEffect, useRef, useState } from 'react';

import { InkCanvas } from '@/components/InkCanvas';
import type { InkCanvasHandle } from '@/components/InkCanvas';
import { paintWords } from '@/components/inkWords';
import { readableTextOn } from '@/lib/emotions';
import { BLOOM_MS, inkFrame, inkPlan } from '@/lib/ink';
import type { Point } from '@/lib/ink';

/** Point de départ de l'encre, en coordonnées d'écran. */
export type Origin = Point;

/**
 * La couleur du jour part du bouton qu'on vient d'appuyer, comme une goutte
 * d'encre qui tombe dans l'eau : elle se déploie en panaches jusqu'à occuper
 * tout l'écran — c'est la couleur du jour, elle a le droit. Une phrase s'y
 * lève au centre. Une goutte d'eau tombe du haut de l'écran et s'écrase sur
 * elle ; la phrase se dissout, des ronds partent dans l'eau, et l'eau claire
 * repousse l'encre vers les bords, avec les mêmes volutes, jusqu'à rendre
 * l'app.
 *
 * La géométrie vit dans `src/lib/ink.ts`, vérifiée par `npm run checks`, et
 * la matière dans `InkCanvas`. Ici, il n'y a que l'horloge et le message.
 *
 * Pilotée par `requestAnimationFrame` et non par Web Animations : les
 * attributs d'un filtre SVG ne s'animent pas autrement, et la forme, la
 * turbulence et le message doivent lire **la même horloge**.
 *
 * `pointer-events: none` : c'est une confirmation, pas un écran. Un appui
 * pendant le trajet doit atteindre ce qu'il vise.
 */
export function SaveBloom({
  color,
  from,
  message,
  onDone,
}: {
  color: string;
  from: Origin;
  /** La phrase qui se lève au centre quand la couleur occupe tout l'écran. */
  message: string;
  onDone: () => void;
}) {
  const canvas = useRef<InkCanvasHandle>(null);
  const words = useRef<HTMLParagraphElement>(null);
  const [frame] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));

  useEffect(() => {
    // Mouvement réduit : on renonce sans rien casser. La journée est
    // enregistrée, c'est ça qui compte.
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (calm) {
      onDone();
      return;
    }

    const plan = inkPlan(from, { width: window.innerWidth, height: window.innerHeight }, Math.random);

    let raf = 0;
    let start: number | null = null;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onDone();
    };

    const paint = (now: number) => {
      start ??= now;
      const t = (now - start) / BLOOM_MS;
      const image = inkFrame(plan, t);
      canvas.current?.paint(image);
      // Le message lit la même horloge que l'encre : réglé à part, en CSS, il
      // finirait par paraître sur du papier ou survivre à l'eau claire.
      paintWords(words.current, image.message);

      if (t >= 1) finish();
      else raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);

    // `requestAnimationFrame` s'arrête quand l'onglet passe en arrière-plan :
    // le minuteur reste en filet, sur la même durée.
    const timer = window.setTimeout(finish, BLOOM_MS + 200);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [from, onDone]);

  return (
    <div className="bloom">
      <InkCanvas ref={canvas} id="save-bloom" color={color} frame={frame} className="bloom__ink" />
      {/* `role="status"` : la phrase dit que la journée est enregistrée, et
          c'est aussi vrai pour qui ne voit pas l'encre. */}
      <p ref={words} className="bloom__message" role="status" style={{ color: readableTextOn(color) }}>
        {message}
      </p>
    </div>
  );
}
