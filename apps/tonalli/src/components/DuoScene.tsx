import { useEffect, useId, useState } from 'react';

import { MotifPattern } from '@/components/MotifPattern';
import { MOTIFS } from '@/lib/character';
import { sceneFor, sheetsOf } from '@/lib/duo';
import type { DuoPart, DuoSide } from '@/lib/duo';
import '@/lib/duo/scenes/base.css';

/*
 * Une feuille d'animation par scène, chargée au moment où la scène s'affiche :
 * les 66 scènes pèsent près d'un mégaoctet ensemble, une seule quelques
 * kilo-octets. Le socle (mouvements communs, mouvement réduit) est importé
 * d'office, ci-dessus.
 */
const SHEETS = import.meta.glob<string>(['../lib/duo/scenes/*.css', '!../lib/duo/scenes/base.css'], {
  query: '?inline',
  import: 'default',
});
const loading = new Map<string, Promise<void>>();

function loadSheet(name: string): Promise<void> {
  let pending = loading.get(name);
  if (!pending) {
    const load = SHEETS[`../lib/duo/scenes/${name}.css`];
    pending = load
      ? load().then((css) => {
          const style = document.createElement('style');
          style.dataset.duo = name;
          style.textContent = css;
          document.head.append(style);
        })
      : Promise.reject(new Error(`scène sans feuille : ${name}`));
    loading.set(name, pending);
  }
  return pending;
}

type Props = {
  me: DuoSide;
  partner: DuoSide;
  /** Ce que la scène montre, dit en mots : c'est ce que lit un lecteur d'écran. */
  label: string;
};

/**
 * Les deux personnages dans une même scène, sur une même horloge : moi à
 * gauche, le binôme à droite, chacun dans sa teinte du jour et sa tenue.
 */
export function DuoScene({ me, partner, label }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  // Recalculée à chaque rendu : c'est une fonction pure et peu coûteuse, et le
  // DOM n'est touché que si quelque chose a vraiment changé.
  const scene = sceneFor(me, partner);
  // La clé des feuilles pilote le chargement : une nouvelle tenue ou une
  // nouvelle teinte ne recharge rien, seule une autre scène le fait.
  const key = sheetsOf(scene).join(',');
  const [ready, setReady] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all(key ? key.split(',').map(loadSheet) : [])
      .then(() => {
        if (alive) setReady(key);
      })
      // Sans sa feuille, la scène afficherait ses pièces cachées toutes à la
      // fois : mieux vaut ne rien montrer que montrer faux.
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [key]);

  const paint = (part: DuoPart) => (part.fill.startsWith('motif:') ? `url(#${uid}-${part.fill.slice(6)})` : part.fill);

  return (
    <div className="duo" role="img" aria-label={label}>
      {ready === key ? (
        <svg className="du-stage" viewBox="0 0 360 225" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
          <defs>
            {MOTIFS.map((motif) => (
              <MotifPattern key={motif} id={`${uid}-${motif}`} motif={motif} />
            ))}
          </defs>
          <g transform={scene.stageTf}>
            {scene.actors.map((actor, index) => (
              <g key={index} className={actor.c1 || undefined} style={{ transformOrigin: actor.o1, animationDelay: actor.d1 }}>
                <g className={actor.c2 || undefined} style={{ transformOrigin: actor.o2, animationDelay: actor.d2 }}>
                  <g transform={actor.tf}>
                    <g
                      className={actor.c3 || undefined}
                      style={{ transformOrigin: actor.o3, animationDelay: actor.d3 }}
                      opacity={actor.op}
                    >
                      {actor.parts.map((part, n) => (
                        <path
                          key={n}
                          d={part.d}
                          className={part.c || undefined}
                          transform={part.tf}
                          opacity={part.op}
                          strokeWidth={part.sw}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{
                            fill: paint(part),
                            stroke: part.stroke,
                            transformOrigin: part.o,
                            animationDelay: part.dl,
                          }}
                        />
                      ))}
                    </g>
                  </g>
                </g>
              </g>
            ))}
          </g>
        </svg>
      ) : null}
    </div>
  );
}
