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
- `MODE=encode` écrit la boucle animée dans `anim/`.
- `MOBILE=1` rend la version téléphone (780 × 760), cadrée par `BOXES` dans `voyage-render.mjs`.
- `SIZE=1400x1260 SUFFIX=-apercu` rend un autre format. C'est ainsi qu'est fait le passeport de l'image de partage.

Une boucle prête se copie dans `../public/voyage/` : `<scène>.webp` pour l'ordinateur, `<scène>-mobile.webp` pour le téléphone.

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
