import { BODY_PATH, EYES_PATH, LOGO_SIZE, SMALL_BELOW, logoGeometry } from '@/lib/logo';

/**
 * Le soleil de Tonalli : le personnage, incolore, dans un anneau de douze
 * rayons — les seules couleurs du logo sont celles des émotions.
 *
 * Le trait suit `currentColor` et l'intérieur le fond de la page : le même
 * logo tient en clair et en sombre sans variante à maintenir. Il est
 * décoratif — le nom de l'app est toujours écrit à côté, dans le titre.
 */
export function Logo({ size = 88 }: { size?: number }) {
  const g = logoGeometry(size < SMALL_BELOW ? 'small' : 'full');
  const { scale, tx, ty, strokeWidth } = g.body;
  return (
    <svg
      className="logo"
      width={size}
      height={size}
      viewBox={`0 0 ${LOGO_SIZE} ${LOGO_SIZE}`}
      aria-hidden="true"
      focusable="false"
    >
      <g strokeLinecap="round" strokeWidth={g.rayWidth}>
        {g.rays.map((ray) => (
          <path key={ray.color} d={`M${ray.x1},${ray.y1} L${ray.x2},${ray.y2}`} stroke={ray.color} />
        ))}
      </g>
      {/* Les épaisseurs sont en unités du logo : on les ramène dans le repère du corps. */}
      <g
        transform={`translate(${tx},${ty}) scale(${scale})`}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={BODY_PATH} fill="var(--bg)" strokeWidth={strokeWidth / scale} />
        {g.eyesWidth !== null ? <path d={EYES_PATH} fill="none" strokeWidth={g.eyesWidth / scale} /> : null}
      </g>
    </svg>
  );
}
