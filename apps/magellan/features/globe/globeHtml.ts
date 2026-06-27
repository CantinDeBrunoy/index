// Template HTML/JS du globe, partagé entre les variantes mobile (WebView) et web
// (iframe). globe.gl est chargé depuis le CDN unpkg (build standalone, three inclus).
// Phase 2 : on affiche simplement la planète en rotation automatique.
// Les pays visités (polygones verts) et les villes (marqueurs) arriveront en Phase 3/4.

const GLOBE_JS = 'https://unpkg.com/globe.gl';
const EARTH_TEXTURE = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';

export function buildGlobeHtml(): string {
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
    const world = Globe()(document.getElementById('globe'))
      .globeImageUrl('${EARTH_TEXTURE}')
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#7cc7ff')
      .atmosphereAltitude(0.18);

    // Rotation automatique douce.
    const controls = world.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    controls.enableZoom = true;

    // Garde le rendu à la taille de la fenêtre.
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
