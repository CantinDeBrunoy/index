import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import { BLOOM_MS, PLUMES, inkFrame, inkPlan } from '@/lib/ink';
import type { Blob, Point } from '@/lib/ink';

/** Point de départ de l'encre, en coordonnées d'écran. */
export type Origin = Point;

/** Un seul `SaveBloom` existe à la fois : un identifiant fixe suffit au filtre. */
const FILTER_ID = 'save-bloom-ink';

/**
 * La couleur du jour part du bouton qu'on vient d'appuyer, comme une goutte
 * d'encre qui tombe dans l'eau : elle se déploie en panaches jusqu'à occuper
 * tout l'écran — c'est la couleur du jour, elle a le droit — puis les volutes
 * sont aspirées **dans le bandeau de la journée**, où elles se posent avec un
 * bord net et s'effacent sur le vrai bandeau, qui porte déjà la même couleur.
 *
 * La géométrie vit dans `src/lib/ink.ts`, vérifiée par `npm run checks`. Ici
 * on ne fait que la dessiner : un SVG plein écran, une poignée de rectangles
 * arrondis, et un filtre de turbulence (`feTurbulence` → `feDisplacementMap`)
 * qui transforme leur union en encre. La force du filtre et sa dérive
 * changent à chaque frame ; le motif du bruit, lui, est tiré une fois.
 *
 * Pilotée par `requestAnimationFrame` et non par Web Animations : les
 * attributs d'un filtre SVG ne s'animent pas autrement, et la forme comme la
 * turbulence doivent lire **la même horloge** — un bord qui se calmerait
 * avant ou après l'arrivée laisserait voir le raccord avec le bandeau.
 * Les écritures vont droit dans le DOM : un rendu React par frame, sur un
 * téléphone d'entrée de gamme, se verrait.
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
  const group = useRef<SVGGElement>(null);
  const veil = useRef<SVGRectElement>(null);
  const blobs = useRef<(SVGRectElement | null)[]>([]);
  const flow = useRef<SVGFEOffsetElement>(null);
  const displace = useRef<SVGFEDisplacementMapElement>(null);
  const soften = useRef<SVGFEGaussianBlurElement>(null);
  // Le motif du bruit change à chaque validation : deux journées ne font pas
  // la même tache. Tiré une fois, sinon il sauterait au premier rendu venu.
  const [seed] = useState(() => Math.floor(Math.random() * 1000));
  // La zone du filtre déborde largement de l'écran : la dérive décale le
  // bruit, et le bord ainsi découvert, sans bruit, pousserait l'encre d'un
  // bloc. Il doit rester hors champ.
  const [frame] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));

  useEffect(() => {
    const hero = target.current;

    // Mouvement réduit ou bandeau introuvable (une journée sans couleur
    // connue) : on renonce sans rien casser. La journée est enregistrée,
    // c'est ça qui compte.
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!hero || calm || !group.current) {
      onDone();
      return;
    }

    const rect = hero.getBoundingClientRect();
    const radius = parseFloat(getComputedStyle(hero).borderTopLeftRadius) || 22;
    const plan = inkPlan(
      from,
      { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      radius,
      { width: window.innerWidth, height: window.innerHeight },
      Math.random,
    );

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

      group.current?.setAttribute('opacity', image.opacity.toFixed(3));
      place(veil.current, image.veil);
      veil.current?.setAttribute('fill-opacity', image.veilOpacity.toFixed(3));
      image.blobs.forEach((blob, index) => place(blobs.current[index], blob));
      displace.current?.setAttribute('scale', image.swirl.toFixed(1));
      soften.current?.setAttribute('stdDeviation', image.blur.toFixed(2));
      flow.current?.setAttribute('dx', image.drift.x.toFixed(1));
      flow.current?.setAttribute('dy', image.drift.y.toFixed(1));

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
  }, [from, target, onDone]);

  const margin = 0.5 * Math.min(frame.width, frame.height);

  return (
    <svg className="bloom" aria-hidden focusable="false">
      <defs>
        <filter
          id={FILTER_ID}
          filterUnits="userSpaceOnUse"
          x={-margin}
          y={-margin}
          width={frame.width + 2 * margin}
          height={frame.height + 3 * margin}
          colorInterpolationFilters="sRGB"
        >
          {/* Deux octaves seulement : la troisième ajoute un grain que l'œil
              ne voit pas à cette vitesse, et coûte cher sur un petit
              téléphone. La fréquence est plus basse à la verticale, ce qui
              étire les volutes vers le haut, comme un panache qui monte. */}
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.008" numOctaves={2} seed={seed} result="noise" />
          <feOffset ref={flow} in="noise" dx="0" dy="0" result="flow" />
          <feDisplacementMap
            ref={displace}
            in="SourceGraphic"
            in2="flow"
            scale="0"
            xChannelSelector="R"
            yChannelSelector="G"
            result="swept"
          />
          {/* Flou puis seuil sur l'alpha : les taches fondent en une seule,
              et le bord poilu du déplacement devient un contour d'encre. Le
              seuil est centré sur 0,5 — là où tombe le bord d'une forme
              floutée — pour qu'il ne la fasse ni gonfler ni maigrir. */}
          <feGaussianBlur ref={soften} in="swept" stdDeviation="0" result="soft" />
          <feComponentTransfer in="soft">
            <feFuncA type="linear" slope="3" intercept="-1" />
          </feComponentTransfer>
        </filter>
      </defs>
      {/* Tout part invisible : sans ça, un rectangle vide clignoterait dans le
          coin avant la première frame. */}
      <g ref={group} filter={`url(#${FILTER_ID})`} fill={color} opacity="0">
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
