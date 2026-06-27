// Template HTML/JS du globe, partagé entre les variantes mobile (WebView) et web
// (iframe). globe.gl, la texture et le GeoJSON des frontières sont chargés depuis un CDN.
//
// Phase 2 : planète en rotation automatique.
// Phase 3 : couche polygones — pays visités (ISO 3166-1 alpha-3) en vert.
// Phase 4 : drapeaux des villes (étapes) + arcs reliant les étapes de chaque voyage.

import { countryFlag } from '@/data/countries';
import type { Trip } from '@/features/trips/types';

const GLOBE_JS = 'https://unpkg.com/globe.gl';
const EARTH_TEXTURE = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const COUNTRIES_GEOJSON =
  'https://cdn.jsdelivr.net/gh/vasturiano/globe.gl@master/example/datasets/ne_110m_admin_0_countries.geojson';

const COLOR_VISITED = 'rgba(46, 160, 67, 0.85)'; // vert
const COLOR_OTHER = 'rgba(255, 255, 255, 0.05)';
const COLOR_ARC_FALLBACK = '#ffd166';

// Altitude des polygones : volontairement très faible pour rester collé au globe.
// Un pays visité est à peine surélevé par rapport aux autres (le signal est la couleur,
// pas le relief), sinon il semble « flotter » au-dessus de la surface en rotation.
const ALTITUDE_VISITED = 0.003;
const ALTITUDE_OTHER = 0.001;

export type GlobeViewProps = {
  /** Pays visités (codes ISO 3166-1 alpha-3) à colorer en vert. */
  visitedCountries: string[];
  /** Voyages : leurs étapes deviennent des drapeaux, reliés par des arcs. */
  trips: Trip[];
};

type FlagMarker = { lat: number; lng: number; flag: string; name: string };
type RouteArc = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
};

/** Aplatit les voyages en drapeaux (une étape = un drapeau). */
function toFlagMarkers(trips: Trip[]): FlagMarker[] {
  return trips.flatMap((t) =>
    t.stops.map((s) => ({ lat: s.lat, lng: s.lng, flag: countryFlag(s.country), name: s.name })),
  );
}

/** Construit les arcs entre étapes consécutives de chaque voyage. */
function toRouteArcs(trips: Trip[]): RouteArc[] {
  return trips.flatMap((t) => {
    const color = t.color || COLOR_ARC_FALLBACK;
    const arcs: RouteArc[] = [];
    for (let i = 0; i < t.stops.length - 1; i++) {
      const a = t.stops[i];
      const b = t.stops[i + 1];
      arcs.push({ startLat: a.lat, startLng: a.lng, endLat: b.lat, endLng: b.lng, color });
    }
    return arcs;
  });
}

export function buildGlobeHtml(visitedCountries: string[] = [], trips: Trip[] = []): string {
  // Données injectées directement dans le HTML : un changement côté app reconstruit le
  // HTML et recharge le globe (mise à jour incrémentale en Phase 5).
  const visitedJson = JSON.stringify(visitedCountries);
  const flagsJson = JSON.stringify(toFlagMarkers(trips));
  const arcsJson = JSON.stringify(toRouteArcs(trips));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #0b1026; }
    #globe { width: 100vw; height: 100vh; }
    .flag-marker {
      font-size: 20px;
      transform: translate(-50%, -50%);
      pointer-events: none;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
      user-select: none;
    }
  </style>
  <script src="${GLOBE_JS}"></script>
</head>
<body>
  <div id="globe"></div>
  <script>
    const VISITED = new Set(${visitedJson});
    const FLAGS = ${flagsJson};
    const ARCS = ${arcsJson};

    // Code ISO alpha-3 d'un pays : ISO_A3 sauf valeur invalide (-99), sinon ADM0_A3.
    function isoOf(props) {
      const a = props.ISO_A3;
      return a && a !== '-99' ? a : (props.ADM0_A3 || '');
    }
    function isVisited(feat) { return VISITED.has(isoOf(feat.properties)); }

    const world = Globe()(document.getElementById('globe'))
      .globeImageUrl('${EARTH_TEXTURE}')
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#7cc7ff')
      .atmosphereAltitude(0.18);

    const controls = world.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    controls.enableZoom = true;

    // Drapeaux des villes (étapes des voyages).
    world
      .htmlElementsData(FLAGS)
      .htmlLat((d) => d.lat)
      .htmlLng((d) => d.lng)
      .htmlAltitude(0.012)
      .htmlElement((d) => {
        const el = document.createElement('div');
        el.className = 'flag-marker';
        el.textContent = d.flag;
        el.title = d.name;
        return el;
      });

    // Arcs reliant les étapes consécutives de chaque voyage.
    world
      .arcsData(ARCS)
      .arcStartLat((d) => d.startLat)
      .arcStartLng((d) => d.startLng)
      .arcEndLat((d) => d.endLat)
      .arcEndLng((d) => d.endLng)
      .arcColor((d) => d.color)
      .arcStroke(0.5)
      .arcAltitudeAutoScale(0.4)
      .arcDashLength(0.5)
      .arcDashGap(0.25)
      .arcDashAnimateTime(2500);

    // Couche frontières : vert pour les pays visités, discret pour les autres.
    fetch('${COUNTRIES_GEOJSON}')
      .then((r) => r.json())
      .then(({ features }) => {
        const countries = features.filter((f) => f.properties.ISO_A2 !== 'AQ'); // hors Antarctique
        world
          .polygonsData(countries)
          .polygonAltitude((f) => (isVisited(f) ? ${ALTITUDE_VISITED} : ${ALTITUDE_OTHER}))
          .polygonCapColor((f) => (isVisited(f) ? '${COLOR_VISITED}' : '${COLOR_OTHER}'))
          .polygonSideColor(() => 'rgba(0,0,0,0.15)')
          .polygonStrokeColor(() => 'rgba(255,255,255,0.25)')
          .polygonLabel((f) => f.properties.ADMIN || f.properties.NAME || '');
      })
      .catch((e) => console.error('Chargement GeoJSON échoué', e));

    function resize() {
      world.width(window.innerWidth);
      world.height(window.innerHeight);
    }
    window.addEventListener('resize', resize);
    resize();
  </script>
</body>
</html>`;
}
