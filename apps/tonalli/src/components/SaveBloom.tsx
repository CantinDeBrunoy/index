import { useEffect, useRef, useState } from 'react';

import { BLOOM_MS, PLUMES, inkFrame, inkPlan } from '@/lib/ink';
import type { Blob, Point } from '@/lib/ink';

/** Point de départ de l'encre, en coordonnées d'écran. */
export type Origin = Point;

/** Un seul `SaveBloom` existe à la fois : des identifiants fixes suffisent aux filtres. */
const INK_ID = 'save-bloom-ink';
const CLEAR_ID = 'save-bloom-clear';

/**
 * La couleur du jour part du bouton qu'on vient d'appuyer, comme une goutte
 * d'encre qui tombe dans l'eau : elle se déploie en panaches jusqu'à occuper
 * tout l'écran — c'est la couleur du jour, elle a le droit. Puis une goutte
 * d'eau claire tombe au cœur de l'écran et repousse l'encre vers les bords,
 * avec les mêmes volutes, jusqu'à rendre l'app.
 *
 * La géométrie vit dans `src/lib/ink.ts`, vérifiée par `npm run checks`. Ici
 * on ne fait que la dessiner : un SVG plein écran, une poignée de rectangles
 * arrondis, et deux filtres de turbulence qui partagent la même chaîne —
 * `feTurbulence` → `feDisplacementMap` → flou → seuil. Le premier dessine les
 * taches telles quelles : c'est l'encre. Le second les **retourne** : une
 * nappe de couleur (`feFlood`) dont on retire les taches (`feComposite out`),
 * et ce sont les trous de l'eau claire. Les mêmes rectangles servent aux deux
 * temps ; on change seulement de filtre au moment où l'écran est plein, là où
 * le raccord ne peut pas se voir.
 *
 * Pilotée par `requestAnimationFrame` et non par Web Animations : les
 * attributs d'un filtre SVG ne s'animent pas autrement, et la forme comme la
 * turbulence doivent lire **la même horloge**. Les écritures vont droit dans
 * le DOM : un rendu React par frame, sur un téléphone d'entrée de gamme, se
 * verrait.
 *
 * `pointer-events: none` : c'est une confirmation, pas un écran. Un appui
 * pendant le trajet doit atteindre ce qu'il vise.
 */
export function SaveBloom({ color, from, onDone }: { color: string; from: Origin; onDone: () => void }) {
  const group = useRef<SVGGElement>(null);
  const veil = useRef<SVGRectElement>(null);
  const blobs = useRef<(SVGRectElement | null)[]>([]);
  const filters = useRef<SVGFilterElement[]>([]);
  // Le motif du bruit change à chaque validation : deux journées ne font pas
  // la même tache. Tiré une fois, sinon il sauterait au premier rendu venu.
  const [seed] = useState(() => Math.floor(Math.random() * 1000));
  // La zone des filtres déborde largement de l'écran : la dérive décale le
  // bruit, et le bord ainsi découvert, sans bruit, pousserait l'encre d'un
  // bloc. Il doit rester hors champ.
  const [frame] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));

  useEffect(() => {
    // Mouvement réduit : on renonce sans rien casser. La journée est
    // enregistrée, c'est ça qui compte.
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (calm || !group.current) {
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

      const g = group.current;
      g?.setAttribute('opacity', image.opacity.toFixed(3));
      g?.setAttribute('filter', `url(#${image.phase === 'ink' ? INK_ID : CLEAR_ID})`);
      place(veil.current, image.veil);
      veil.current?.setAttribute('fill-opacity', image.veilOpacity.toFixed(3));
      image.blobs.forEach((blob, index) => place(blobs.current[index], blob));
      // Les deux filtres reçoivent les mêmes réglages : seul celui du groupe
      // est calculé, l'autre n'est référencé par personne.
      for (const filter of filters.current) {
        filter.querySelector('feDisplacementMap')?.setAttribute('scale', image.swirl.toFixed(1));
        filter.querySelector('feGaussianBlur')?.setAttribute('stdDeviation', image.blur.toFixed(2));
        const flow = filter.querySelector('feOffset');
        flow?.setAttribute('dx', image.drift.x.toFixed(1));
        flow?.setAttribute('dy', image.drift.y.toFixed(1));
      }

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

  const margin = 0.5 * Math.min(frame.width, frame.height);
  const region = {
    filterUnits: 'userSpaceOnUse',
    x: -margin,
    y: -margin,
    width: frame.width + 2 * margin,
    height: frame.height + 3 * margin,
    colorInterpolationFilters: 'sRGB',
  } as const;

  // La chaîne commune aux deux temps : de simples cercles deviennent une
  // tache d'encre.
  const swirl = (
    <>
      {/* Deux octaves seulement : la troisième ajoute un grain que l'œil ne
          voit pas à cette vitesse, et coûte cher sur un petit téléphone. La
          fréquence est plus basse à la verticale, ce qui étire les volutes
          vers le haut, comme un panache qui monte. */}
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.008" numOctaves={2} seed={seed} result="noise" />
      <feOffset in="noise" dx="0" dy="0" result="flow" />
      <feDisplacementMap in="SourceGraphic" in2="flow" scale="0" xChannelSelector="R" yChannelSelector="G" result="swept" />
      {/* Flou puis seuil sur l'alpha : les taches fondent en une seule, et le
          bord poilu du déplacement devient un contour d'encre. Le seuil est
          centré sur 0,5 — là où tombe le bord d'une forme floutée — pour
          qu'il ne la fasse ni gonfler ni maigrir. */}
      <feGaussianBlur in="swept" stdDeviation="0" result="soft" />
      <feComponentTransfer in="soft" result="stain">
        <feFuncA type="linear" slope="3" intercept="-1" />
      </feComponentTransfer>
    </>
  );

  return (
    <svg className="bloom" aria-hidden focusable="false">
      <defs>
        <filter
          id={INK_ID}
          {...region}
          ref={(element) => {
            if (element) filters.current[0] = element;
          }}
        >
          {swirl}
        </filter>
        <filter
          id={CLEAR_ID}
          {...region}
          ref={(element) => {
            if (element) filters.current[1] = element;
          }}
        >
          {swirl}
          {/* L'eau claire : une nappe de couleur, moins la tache. Le voile, à
              moitié transparent, y devient une encre éclaircie au bord du
              trou — elle se dilue avant de disparaître. */}
          <feFlood floodColor={color} result="sea" />
          <feComposite in="sea" in2="stain" operator="out" />
        </filter>
      </defs>
      {/* Tout part invisible : sans ça, un rectangle vide clignoterait dans le
          coin avant la première frame. */}
      <g ref={group} filter={`url(#${INK_ID})`} fill={color} opacity="0">
        {/* Une ancre transparente, hors champ : quand l'eau claire tombe, ses
            taches ont encore une taille nulle, et un groupe sans rien à
            peindre peut voir son filtre sauté — la nappe de couleur
            disparaîtrait le temps d'une frame, en plein écran. */}
        <rect x={-margin / 2} y={-margin / 2} width="1" height="1" fillOpacity="0" />
        <rect ref={veil} fillOpacity="0" />
        {Array.from({ length: PLUMES + 1 }, (_, index) => (
          <rect
            key={index}
            ref={(element) => {
              blobs.current[index] = element;
            }}
          />
        ))}
      </g>
    </svg>
  );
}

function place(element: SVGRectElement | null, blob: Blob) {
  if (!element) return;
  element.setAttribute('x', blob.x.toFixed(1));
  element.setAttribute('y', blob.y.toFixed(1));
  element.setAttribute('width', blob.width.toFixed(1));
  element.setAttribute('height', blob.height.toFixed(1));
  element.setAttribute('rx', blob.rx.toFixed(1));
}
