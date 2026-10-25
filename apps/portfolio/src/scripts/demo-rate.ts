/**
 * La vitesse des démos des projets (public/demos) : elles tournent plus vite qu'elles n'ont été filmées, pour
 * être plus vives, sans refaire les fichiers. Les deux lecteurs s'en servent : la fiche (scripts/demo-video.ts)
 * et « Les projets » (scripts/carnet-scene.ts). Une démo montée à sa vitesse, avec sa musique (les films brag),
 * porte la sienne dans `data-rate` (le champ `rate` de sa fiche).
 */
export const DEMO_RATE = 1.5;

/** La vitesse tient aussi après un nouveau chargement : `load()` et un nouveau `src` repartent de `defaultPlaybackRate`. */
export const speedUp = (video: HTMLVideoElement) => {
  const rate = Number(video.dataset.rate) || DEMO_RATE;
  video.defaultPlaybackRate = rate;
  video.playbackRate = rate;
};
