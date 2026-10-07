# Le voyage : scènes 3D et maquette

Les sources du design « le voyage », la direction retenue pour le portfolio. Rien ici n'est servi par le site :
le site n'utilise que les boucles animées déjà rendues, dans `../public/voyage/`.

| Dossier | Contenu |
|---|---|
| `renders/` | Le moteur des scènes : des modèles three.js procéduraux, rendus image par image dans Edge (sans écran), puis encodés en WebP animé. |
| `renders/assets/` | Les modèles 3D et la carte du monde que les scènes chargent. Leurs licences sont dans `CREDITS.md`. |
| `design-canvas/` | Le générateur des planches de la maquette (canvas Claude Design) et tous les textes du site, en français et en anglais. |

## Rendre une scène

Les scripts prennent `sharp` et `playwright-core` dans le monorepo, et passent par le navigateur Edge déjà installé.

```bash
cd apps/portfolio/design/renders
node build-voyage.cjs
RENDER_DIR="$PWD" REPO_DIR="$(git rev-parse --show-toplevel)" MODE=shot node voyage-render.mjs bagage
```

- `node build-voyage.cjs` assemble `voyage.html` (le moteur de `anim.html` et les scènes de `voyage-scenes.js`).
- `MODE=shot` rend une image fixe dans `check/` et affiche où tombe le point cliquable.
- `MODE=encode` écrit la boucle animée WebP dans `anim/`.
- `MODE=video` écrit la vidéo d'ordinateur dans `anim/`, en 2560 × 1440 à 24 images par seconde. L'encodage passe par WebCodecs dans Edge, et le fichier MP4 est assemblé par mp4-muxer (licence MIT, dans `vendor/`) :
  - `CODEC=av01.0.12M.08 QP=32` donne l'AV1 à qualité constante, `<scène>-av1.mp4` ;
  - `CODEC=avc1.640034 BITRATE=3000000` donne le H.264 de secours, `<scène>.mp4`, pour les navigateurs sans AV1 comme Safari sur la plupart des Mac.
  - Les scènes chargées en mouvement sont encodées en H.264 à un débit plus élevé : `BITRATE=4000000` pour l'espace et le tourne-disque, `3500000` pour la route.
  - La Terre est encodée à débit variable dans les deux formats (`RATE=variable BITRATE=3000000`). Toute la carte bouge, et la qualité constante donnait plus de 6 Mo.
- `MOBILE=1` rend la version téléphone (780 × 760), cadrée par `BOXES` dans `voyage-render.mjs`.
- `SIZE=1400x1260 SUFFIX=-apercu` rend un autre format. C'est ainsi qu'est fait le passeport de l'image de partage.

Les fichiers prêts se copient dans `../public/voyage/` :
- `<scène>-av1.mp4` et `<scène>.mp4` pour l'ordinateur ;
- `<scène>-mobile.webp` pour le téléphone ;
- `<scène>.webp`, la boucle d'ordinateur en 1280 × 720, quand le script est coupé.

## La maquette

```bash
cd apps/portfolio/design/design-canvas
node build-voyage-boards.cjs   # écrit les planches dans project/
node place-voyage.cjs          # range les planches sur le canvas (project/canvas.json)
```

Les planches sont publiées sur le canvas, qui reste la référence visuelle. Les images y sont désignées par leur
identifiant sur le canvas (`ids.json`, `mobile.json`).

Les textes sont dans ces fichiers :
- `i18n.cjs` : l'interface et les escales ;
- `fiches-data(.en).cjs` : les fiches ;
- `apropos-data(.en).cjs` : la page « À propos » ;
- `annexes-data.cjs` : la 404, les mentions légales et les aperçus de partage ;
- `hub-data.cjs` : la page « Les apps » et l'onglet « ← Index ».

Ce sont des brouillons, à réécrire.
