// Template HTML/JS du globe, partagé entre les variantes mobile (WebView) et web
// (iframe). globe.gl, la texture et le GeoJSON des frontières sont chargés depuis un CDN.
//
// Phase 2 : planète en rotation automatique.
// Phase 3 : couche polygones — les pays visités (liste ISO 3166-1 alpha-3) en vert,
//           les autres en surbrillance discrète.

const GLOBE_JS = 'https://unpkg.com/globe.gl';
const EARTH_TEXTURE = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const COUNTRIES_GEOJSON =
  'https://cdn.jsdelivr.net/gh/vasturiano/globe.gl@master/example/datasets/ne_110m_admin_0_countries.geojson';

const COLOR_VISITED = 'rgba(46, 160, 67, 0.85)'; // vert
const COLOR_OTHER = 'rgba(255, 255, 255, 0.05)';

// Altitude des polygones : volontairement très faible pour rester collé au globe.
// Un pays visité est à peine surélevé par rapport aux autres (le signal est la couleur,
// pas le relief), sinon il semble « flotter » au-dessus de la surface en rotation.
const ALTITUDE_VISITED = 0.003;
const ALTITUDE_OTHER = 0.001;

export type GlobeViewProps = {
  /** Pays visités (codes ISO 3166-1 alpha-3) à colorer en vert. */
  visitedCountries: string[];
};

export function buildGlobeHtml(visitedCountries: string[] = []): string {
  // La liste des pays visités est injectée directement dans le HTML : un changement
  // côté app reconstruit le HTML et recharge le globe (mise à jour incrémentale en Phase 5).
  const visitedJson = JSON.stringify(visitedCountries);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #0b1026; }
    #globe { width: 100vw; height: 100vh; }
  </style>
  <script src="${GLOBE_JS}"></script>
</head>
<body>
  <div id="globe"></div>
  <script>
    const VISITED = new Set(${visitedJson});

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

    // Mise à jour de la liste sans recharger le globe (utilisé en Phase 5).
    window.setVisited = function (list) {
      VISITED.clear();
      (list || []).forEach((c) => VISITED.add(c));
      world.polygonCapColor(world.polygonCapColor()).polygonAltitude(world.polygonAltitude());
    };

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
