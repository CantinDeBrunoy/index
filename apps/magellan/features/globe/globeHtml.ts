// Template HTML/JS du globe, partagé entre les variantes mobile (WebView) et web
// (iframe). three.js et globe.gl sont chargés en modules ESM (esm.sh) partageant la
// MÊME instance de three (via ?external=three), condition pour que les objets 3D
// personnalisés (drapeaux) s'affichent. Texture, GeoJSON et drapeaux viennent de CDN.
//
// Phase 2 : planète en rotation automatique.
// Phase 3 : couche polygones — pays visités (ISO 3166-1 alpha-3) en vert.
// Phase 4 : étapes des voyages reliées par des arcs + drapeaux 3D des villes.
// Phase 4b : drapeaux = vrai modèle 3D (mât + tissu texturé ondulant, image flagcdn).

import type { Trip } from '@/features/trips/types';

const THREE_URL = 'https://esm.sh/three@0.180.0';
const GLOBE_URL = 'https://esm.sh/globe.gl@2.33.0?external=three';
const EARTH_TEXTURE = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const NIGHT_SKY = 'https://unpkg.com/three-globe/example/img/night-sky.png';
const COUNTRIES_GEOJSON =
  'https://cdn.jsdelivr.net/gh/vasturiano/globe.gl@master/example/datasets/ne_110m_admin_0_countries.geojson';

const COLOR_VISITED = 'rgba(46, 160, 67, 0.85)'; // vert
const COLOR_OTHER = 'rgba(255, 255, 255, 0.05)';
const COLOR_ARC_FALLBACK = '#ffd166';

// Altitude des polygones : volontairement très faible pour rester collé au globe.
const ALTITUDE_VISITED = 0.003;
const ALTITUDE_OTHER = 0.001;

export type GlobeViewProps = {
  /** Pays visités (codes ISO 3166-1 alpha-3) à colorer en vert. */
  visitedCountries: string[];
  /** Voyages : leurs étapes deviennent des drapeaux 3D, reliés par des arcs. */
  trips: Trip[];
  /** Appelé au tap d'un pays (code alpha-3, nom, et point cliqué lat/lng). */
  onCountryPress?: (iso: string, name: string, lat: number | null, lng: number | null) => void;
  /** Appelé au tap d'un drapeau (id de l'étape). */
  onFlagPress?: (stopId: string) => void;
  /** Centre la caméra sur ce point, avec une altitude (zoom) optionnelle. */
  focus?: { lat: number; lng: number; altitude?: number } | null;
  /** Met en pause la rotation automatique (ex. quand un panneau est ouvert). */
  paused?: boolean;
  /** Rejoue l'itinéraire du voyage `tripId` ; `key` change pour relancer le même. */
  replay?: { tripId: string; key: number } | null;
};

type FlagMarker = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  alpha2: string;
  flagUrl: string;
};
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
    t.stops.map((s) => ({
      id: s.id,
      lat: s.lat,
      lng: s.lng,
      name: s.name,
      alpha2: s.alpha2,
      flagUrl: s.alpha2 ? `https://flagcdn.com/w320/${s.alpha2}.png` : '',
    })),
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
  const visitedJson = JSON.stringify(visitedCountries);
  const flagsJson = JSON.stringify(toFlagMarkers(trips));
  const arcsJson = JSON.stringify(toRouteArcs(trips));
  // Séquence ordonnée des étapes par voyage (pour rejouer l'itinéraire).
  const tripsSeqJson = JSON.stringify(
    trips.map((t) => ({ id: t.id, pts: t.stops.map((s) => [s.lat, s.lng]) })),
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #0b1026; }
    #globe { width: 100vw; height: 100vh; }
  </style>
  <script type="importmap">
    { "imports": { "three": "${THREE_URL}", "three/": "${THREE_URL}/", "globe.gl": "${GLOBE_URL}" } }
  </script>
</head>
<body>
  <div id="globe"></div>
  <script type="module">
    import * as THREE from 'three';
    import Globe from 'globe.gl';

    const VISITED = new Set(${visitedJson});
    const FLAGS = ${flagsJson};
    const ARCS = ${arcsJson};
    const TRIPS_SEQ = ${tripsSeqJson};

    // Code ISO alpha-3 d'un pays : ISO_A3 sauf valeur invalide (-99), sinon ADM0_A3.
    function isoOf(props) {
      const a = props.ISO_A3;
      return a && a !== '-99' ? a : (props.ADM0_A3 || '');
    }
    function isVisited(feat) { return VISITED.has(isoOf(feat.properties)); }

    const world = Globe()(document.getElementById('globe'))
      .globeImageUrl('${EARTH_TEXTURE}')
      .backgroundImageUrl('${NIGHT_SKY}')
      .showAtmosphere(true)
      .atmosphereColor('#7cc7ff')
      .atmosphereAltitude(0.18);

    // Exposé pour le débogage et le pilotage depuis l'app (centrage caméra).
    window.__magellanGlobe = world;

    // Émet un message vers l'app (WebView mobile ou iframe web) au tap d'un pays.
    function sendToApp(obj) {
      const s = JSON.stringify(obj);
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(s);
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(s, '*');
      }
    }
    // Centre approximatif d'un pays : moyenne des sommets de son plus grand anneau
    // (la plus grande masse continentale), pour centrer la caméra sur le pays entier.
    function countryCentroid(geom) {
      let rings = [];
      if (!geom) return null;
      if (geom.type === 'Polygon') rings = [geom.coordinates[0]];
      else if (geom.type === 'MultiPolygon') rings = geom.coordinates.map((p) => p[0]);
      let ring = rings[0] || [];
      for (const r of rings) if (r.length > ring.length) ring = r;
      if (!ring.length) return null;
      let sx = 0, sy = 0;
      for (const c of ring) { sx += c[0]; sy += c[1]; }
      return { lat: sy / ring.length, lng: sx / ring.length };
    }

    // Un clic sur un drapeau touche aussi le pays en dessous. On diffère l'ouverture du
    // pays de quelques ms : si un clic drapeau a eu lieu (même clic), il l'annule — peu
    // importe l'ordre des callbacks globe.gl. Le détail ville prime.
    let lastFlagClick = 0;

    world.onPolygonClick((poly) => {
      if (!poly || !poly.properties) return;
      const c = countryCentroid(poly.geometry);
      const payload = {
        type: 'countryClick',
        iso: isoOf(poly.properties),
        name: poly.properties.ADMIN || poly.properties.NAME || '',
        lat: c ? c.lat : null,
        lng: c ? c.lng : null,
      };
      setTimeout(() => {
        if (Date.now() - lastFlagClick > 150) sendToApp(payload);
      }, 70);
    });

    const controls = world.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    controls.enableZoom = true;

    // Rejoue un itinéraire : la caméra survole chaque étape dans l'ordre.
    let replayTimer = null;
    window.__magellanReplay = function (tripId) {
      const t = TRIPS_SEQ.find((x) => x.id === tripId);
      if (!t || !t.pts.length) return;
      if (replayTimer) clearTimeout(replayTimer);
      controls.autoRotate = false;
      let i = 0;
      (function step() {
        if (i >= t.pts.length) return;
        const p = t.pts[i];
        // Plus serré sur la 1re étape, puis vue d'itinéraire.
        world.pointOfView({ lat: p[0], lng: p[1], altitude: i === 0 ? 0.45 : 0.6 }, 1100);
        i += 1;
        replayTimer = setTimeout(step, 1500);
      })();
    };

    // Lumières pour le mât (MeshLambert) ; le tissu (MeshBasic) reste lisible sans.
    world.scene().add(new THREE.AmbientLight(0xffffff, 0.95));
    const sun = new THREE.DirectionalLight(0xffffff, 0.6);
    sun.position.set(1, 1, 1);
    world.scene().add(sun);

    // ---- Drapeaux 3D (mât + tissu texturé ondulant) ----
    const POLE_HEIGHT = 3.6;
    const FLAG_W = 3;
    const FLAG_H = 1.85;
    const SEG = 20;
    const texLoader = new THREE.TextureLoader();
    texLoader.setCrossOrigin('anonymous');
    const wavingFlags = []; // { geo, base }

    function makeFlag(d) {
      // globe.gl oriente l'objet racine avec son axe local +z vers l'extérieur du
      // globe. On bâtit le drapeau « vers le haut » (+y) puis on redresse ce contenu
      // dans un groupe interne pivoté de 90° pour qu'il pointe le long de +z (planté
      // perpendiculairement à la surface). Le groupe interne évite que globe.gl, qui
      // fixe la rotation de la racine, n'écrase notre orientation.
      const root = new THREE.Group();
      const flag = new THREE.Group();
      // Math.PI/2 redresse le contenu (+y) le long de +z (radial, perpendiculaire au
      // sol). On retire TILT pour l'incliner depuis la verticale : ainsi le drapeau
      // reste visible même vu de dessus (sinon il pointe vers la caméra, de profil).
      const TILT = Math.PI / 5; // ~36°
      flag.rotation.x = Math.PI / 2 - TILT;
      root.add(flag);

      // Mât (légèrement enfoncé dans le sol pour l'effet « planté »).
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, POLE_HEIGHT, 8),
        new THREE.MeshLambertMaterial({ color: 0xdddddd }),
      );
      pole.position.y = POLE_HEIGHT / 2 - 0.4;
      flag.add(pole);

      // Pommeau doré au sommet.
      const knob = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 10),
        new THREE.MeshLambertMaterial({ color: 0xffcc33 }),
      );
      knob.position.y = POLE_HEIGHT - 0.28;
      flag.add(knob);

      // Tissu : plan texturé avec le drapeau réel.
      const geo = new THREE.PlaneGeometry(FLAG_W, FLAG_H, SEG, 1);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xcfd3da,
        side: THREE.DoubleSide,
      });
      // Repli si l'image du drapeau ne charge pas (CDN bloqué, hors-ligne, CORS) :
      // un fond bleu avec le code pays, plutôt qu'un drapeau gris vide.
      function applyFallback() {
        const c = document.createElement('canvas');
        c.width = 160;
        c.height = 100;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#3a4a6b';
        ctx.fillRect(0, 0, 160, 100);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 54px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((d.alpha2 || '?').toUpperCase(), 80, 54);
        mat.map = new THREE.CanvasTexture(c);
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
      }

      // Charge l'image du drapeau avec réessais : on télécharge beaucoup de drapeaux
      // d'un coup et le CDN peut en lâcher quelques-uns. Chaque essai utilise une URL
      // distincte (cache-buster) pour repartir d'une requête fraîche. Repli après 3 essais.
      function loadFlag(attempt) {
        texLoader.load(
          d.flagUrl + '?m=' + attempt,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            mat.map = tex;
            mat.color.set(0xffffff);
            mat.needsUpdate = true;
          },
          undefined,
          () => {
            if (attempt < 3) setTimeout(() => loadFlag(attempt + 1), 500 * attempt);
            else applyFallback();
          },
        );
      }

      if (d.flagUrl) loadFlag(1);
      else applyFallback();
      const cloth = new THREE.Mesh(geo, mat);
      // Hampe ancrée au mât, près du sommet.
      cloth.position.set(FLAG_W / 2 + 0.12, POLE_HEIGHT - 0.4 - FLAG_H / 2, 0);
      flag.add(cloth);

      wavingFlags.push({ geo, base: Float32Array.from(geo.attributes.position.array) });
      return root;
    }

    world
      .objectsData(FLAGS)
      .objectLat((d) => d.lat)
      .objectLng((d) => d.lng)
      .objectAltitude(0)
      .objectThreeObject(makeFlag)
      .onObjectClick((d) => {
        if (!d || !d.id) return;
        lastFlagClick = Date.now();
        sendToApp({ type: 'flagClick', stopId: d.id });
      });

    // ---- Arcs reliant les étapes consécutives de chaque voyage ----
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

    // ---- Animation d'ondulation des tissus ----
    const clock = new THREE.Clock();
    (function animate() {
      const t = clock.getElapsedTime();
      for (const { geo, base } of wavingFlags) {
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = base[i * 3];
          // Amplitude croissante du mât (x = -FLAG_W/2) vers le bord libre (x = +FLAG_W/2).
          const k = (x + FLAG_W / 2) / FLAG_W;
          pos.array[i * 3 + 2] = Math.sin(x * 1.6 + t * 4) * 0.22 * k;
        }
        pos.needsUpdate = true;
      }
      requestAnimationFrame(animate);
    })();

    // ---- Couche frontières : vert pour les pays visités ----
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
