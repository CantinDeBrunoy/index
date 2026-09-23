import { useImperativeHandle, useRef, useState } from 'react';
import type { Ref } from 'react';

import { BLOB_SLOTS, RINGS } from '@/lib/ink';
import type { Blob, InkFrame, Size } from '@/lib/ink';

/** Ce que l'animation appelle à chaque frame : dessiner l'image de `inkFrame` ou `revealFrame`. */
export type InkCanvasHandle = { paint: (image: InkFrame) => void };

/**
 * La matière de l'encre : un SVG, une poignée de rectangles arrondis, et deux
 * filtres de turbulence qui partagent la même chaîne — `feTurbulence` →
 * `feDisplacementMap` → flou → seuil. Le premier dessine les taches telles
 * quelles : c'est l'encre. Le second les **retourne** : une nappe de couleur
 * (`feFlood`) dont on retire les taches (`feComposite out`), et ce sont les
 * trous de l'eau claire.
 *
 * Commun à l'encre de validation (tout l'écran) et au dévoilement de la
 * journée du binôme (une carte) : seule la géométrie change, calculée dans
 * `src/lib/ink.ts`. Ce composant ne fait que la dessiner, et il le fait en
 * écrivant droit dans le DOM (`paint`) — un rendu React par frame, sur un
 * téléphone d'entrée de gamme, se verrait.
 */
export function InkCanvas({
  id,
  color,
  frame,
  covered = false,
  className,
  ref,
}: {
  /**
   * Préfixe des identifiants de filtres. Deux encres peuvent exister en même
   * temps — la validation se joue encore quand on glisse vers la journée de
   * l'autre — et des filtres homonymes se voleraient leurs réglages.
   */
  id: string;
  color: string;
  /** Taille du cadre au moment où l'animation part. */
  frame: Size;
  /**
   * Nappe de couleur dès le premier rendu, sans attendre la première frame :
   * c'est le cas du dévoilement, qui prend la suite d'une carte déjà couverte.
   * Sans ça, le contenu apparaîtrait un instant avant d'être recouvert.
   */
  covered?: boolean;
  className?: string;
  ref?: Ref<InkCanvasHandle>;
}) {
  const inkId = `${id}-ink`;
  const clearId = `${id}-clear`;
  const group = useRef<SVGGElement>(null);
  const veil = useRef<SVGRectElement>(null);
  const blobs = useRef<(SVGRectElement | null)[]>([]);
  const rings = useRef<(SVGRectElement | null)[]>([]);
  const filters = useRef<SVGFilterElement[]>([]);
  // Le motif du bruit change à chaque fois : deux journées ne font pas la
  // même tache. Tiré une fois, sinon il sauterait au premier rendu venu.
  const [seed] = useState(() => Math.floor(Math.random() * 1000));

  useImperativeHandle(ref, () => ({
    paint(image) {
      const g = group.current;
      g?.setAttribute('opacity', image.opacity.toFixed(3));
      g?.setAttribute('filter', `url(#${image.phase === 'ink' ? inkId : clearId})`);
      place(veil.current, image.veil);
      veil.current?.setAttribute('fill-opacity', image.veilOpacity.toFixed(3));
      image.blobs.forEach((blob, index) => place(blobs.current[index], blob));
      image.rings.forEach((ring, index) => {
        const element = rings.current[index];
        place(element, ring.blob);
        element?.setAttribute('stroke-width', ring.stroke.toFixed(2));
        element?.setAttribute('stroke-opacity', ring.opacity.toFixed(3));
      });
      // Les deux filtres reçoivent les mêmes réglages : seul celui du groupe
      // est calculé, l'autre n'est référencé par personne.
      for (const filter of filters.current) {
        filter.querySelector('feDisplacementMap')?.setAttribute('scale', image.swirl.toFixed(1));
        filter.querySelector('feGaussianBlur')?.setAttribute('stdDeviation', image.blur.toFixed(2));
        const flow = filter.querySelector('feOffset');
        flow?.setAttribute('dx', image.drift.x.toFixed(1));
        flow?.setAttribute('dy', image.drift.y.toFixed(1));
      }
    },
  }));

  // La zone des filtres déborde largement du cadre : la dérive décale le
  // bruit, et le bord ainsi découvert, sans bruit, pousserait l'encre d'un
  // bloc. Il doit rester hors champ.
  const margin = 0.5 * Math.min(frame.width, frame.height);
  const region = {
    filterUnits: 'userSpaceOnUse',
    x: -margin,
    y: -margin,
    width: frame.width + 2 * margin,
    height: frame.height + 3 * margin,
    colorInterpolationFilters: 'sRGB',
  } as const;

  // La chaîne commune aux deux filtres : de simples cercles deviennent une
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
    <svg className={className} aria-hidden focusable="false">
      <defs>
        <filter
          id={inkId}
          {...region}
          ref={(element) => {
            if (element) filters.current[0] = element;
          }}
        >
          {swirl}
        </filter>
        <filter
          id={clearId}
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
      {/* L'encre part invisible : sans ça, un rectangle vide clignoterait
          dans le coin avant la première frame. */}
      <g ref={group} filter={`url(#${covered ? clearId : inkId})`} fill={color} opacity={covered ? '1' : '0'}>
        {/* Une ancre transparente, hors champ : quand l'eau claire tombe, ses
            taches ont encore une taille nulle, et un groupe sans rien à
            peindre peut voir son filtre sauté — la nappe de couleur
            disparaîtrait le temps d'une frame. */}
        <rect x={-margin / 2} y={-margin / 2} width="1" height="1" fillOpacity="0" />
        <rect ref={veil} fillOpacity="0" />
        {/* Le cœur, les panaches, puis les gouttes du geste. */}
        {Array.from({ length: BLOB_SLOTS }, (_, index) => (
          <rect
            key={index}
            ref={(element) => {
              blobs.current[index] = element;
            }}
          />
        ))}
        {/* Les ronds dans l'eau : tracés, pas remplis. */}
        {RINGS.map((_, index) => (
          <rect
            key={`ring-${index}`}
            fill="none"
            stroke={color}
            strokeOpacity="0"
            ref={(element) => {
              rings.current[index] = element;
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
