# Le voyage : scènes 3D et maquette

Les sources du design « le voyage », la direction retenue pour le portfolio. Rien ici n'est servi par le site :
le site n'utilise que les boucles animées déjà rendues, dans `../public/voyage/`.

| Dossier | Contenu |
|---|---|
| `renders/` | Le moteur des scènes : des modèles three.js procéduraux, rendus image par image dans Edge (sans écran), puis encodés en WebP animé. |
| `renders/assets/` | Les modèles 3D et la carte du monde que les scènes chargent. Leurs licences sont dans `CREDITS.md`. |
| `design-canvas/` | Le générateur des planches de la maquette (canvas Claude Design) et tous les textes du site, en français et en anglais. |
| `cv/` | Le CV de Cantin, en français et en anglais : deux pages HTML que `node cv/cv.mjs` imprime en PDF dans `../public/cv/`, pour le bouton « Mon CV » de la page À propos. Sans numéro de téléphone : le script refuse un CV qui en porte un. |

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

Puis `node stills.mjs` en tire les images fixes, dans `../public/voyage/stills/` : la première image de chaque
boucle, en 1280 × 720, en vignette de 640 × 360 et en version téléphone. Elles servent aux vignettes (l'escale
suivante d'une fiche, le carnet) et au mouvement réduit, où rien ne doit bouger.

Les aperçus de partage (l'image d'un lien collé sur LinkedIn ou WhatsApp, 1200 × 630) se photographient depuis le
serveur de développement : `astro dev`, puis `node og.mjs [adresse]`, qui écrit `../public/og/<carte>.jpg`. Les
pages `/apercu/<carte>` n'existent qu'en développement (`src/pages/apercu`, `src/data/apercus.ts`). À refaire quand
les textes des escales changent.

Le copilote du voyage (le bonhomme qui accueille à l'escale 1, puis change de tenue à chaque escale) se rend
à part, sur fond transparent : `MODE=encode SIZE=400x400 SUFFIX=-site FRAMES=72 Q=72 node voyage-render.mjs tenue-espace
tenue-terre …` pour ses dix tenues, et `SIZE=640x640 SUFFIX=-accueil` pour la tenue de l'espace en grand. Puis
`node copilote-site.mjs` les copie dans `../public/voyage/copilote/` et en tire une image fixe chacune.

Le décollage (au premier « Décoller », ou rejoué par le retour de l'escale 1, le copilote au pied de sa fusée
explique le voyage, y grimpe, et la fusée part, fait le tour de la planète et se range entre elle et la Terre) est
fait de quatre plans : les scènes `decollage-pied`, `decollage-echelle`, `decollage-trappe` et
`decollage-envol` de `decollage-scenes.js`, que `build-voyage.cjs` ajoute après celles du voyage. Chaque plan commence
là où finit le précédent, et la dernière image de l'envol précède la première de la boucle de l'espace : la caméra
de l'escale 1 et sa planète ne changent pas sans que l'envol soit refait. La fusée reste ensuite à l'escale 1, en
croisière entre la planète et la Terre : la scène `espace` l'inclut (`CRUISE` dans `decollage-scenes.js`, où l'envol
la laisse), tandis que le départ, avant le décollage, a sa scène sans elle, `depart` (`START.scene` sur le site).
Pour les rendre :
- `MODE=video CODEC=av01.0.12M.08 QP=32` pour les deux boucles, `RATE=variable BITRATE=2500000` pour la montée et
  l'envol (à qualité constante, l'envol pesait 8 Mo) ;
- `MODE=video CODEC=avc1.640034 BITRATE=3500000` pour le H.264 ;
- `MOBILE=1 MODE=video SUFFIX=-mobile CODEC=avc1.640034 BITRATE=1200000` pour le téléphone, cadré comme ses escales ;
- `MODE=shot SIZE=1920x1080 SUFFIX=` et `MODE=shot MOBILE=1` pour les images fixes des deux bulles (le mouvement
  réduit), à convertir en WebP dans `../public/voyage/stills/decollage-<plan>(-mobile).webp`.

Les vidéos se copient dans `../public/voyage/` (`decollage-<plan>-av1.mp4`, `decollage-<plan>.mp4`,
`decollage-<plan>-mobile.mp4`). Si le copilote change de place, ses bulles suivent sa tête : `--ax` / `--ay` dans
`src/components/voyage/Decollage.astro`.

La sortie du voyage (« Faire connaissance » à l'escale 10 : le stylo se couche devant la pile, puis le dossier se
ferme) est la scène `dossiers-ferme`, un clip de 164 images. Ses nombres sont `FERME` dans `voyage-scenes.js` et
`EXIT` dans `../src/data/voyage.ts` : les deux doivent rester d'accord. Les commandes :
- l'ordinateur, comme les escales : `MODE=video CODEC=av01.0.12M.08 QP=32` puis `MODE=video CODEC=avc1.640034 BITRATE=3000000` ;
- le téléphone, la fermeture seule : `MOBILE=1 MODE=video FROM=133 SUFFIX=-mobile CODEC=avc1.64001F BITRATE=1000000`.

Les trois fichiers vont dans `../public/voyage/sortie/`, à part : `stills.mjs` prend tout `-mobile` de `voyage/` pour une escale.

Les passages : au clic vers l'escale suivante, l'objet de l'escale part vers elle (la fusée vers la Terre, l'avion qui
fait le tour de la Terre et s'y pose, la rame jusqu'au terminus, la voiture à la maison…), puis le site plonge vers la
suivante
(`src/scripts/voyage-passage.ts`). Ils sont tous dans `passage-scenes.js` (`PASSAGES` : la boucle, les départs, l'instant
du plongeon ; `off` en retire un du site, comme celui du Hublot), que `build-voyage.cjs` ajoute après le décollage. Deux
sortes :
- « sprites » (espace, terre : derrière l'objet, des étoiles fixes) : la boucle continue, et le site dessine l'objet
  par-dessus, dans un canvas, depuis une planche : l'objet seul, image par image, et une pièce du fond vide qui cache
  celui de la boucle. `passage-render.mjs` les rend dans `../public/voyage/passage/` et prévient si quelque chose
  passe derrière l'objet de la boucle ;
- « clip » (les autres) : une vidéo de la scène `<escale>-passage`, un départ par huitième de la boucle (le monde
  continue à sa phase, l'objet part de sa place à cet instant) ; le site attend le prochain pour y passer sans saut.
  Sur téléphone, le premier départ seul, en fondu.

`passage-render.mjs` écrit aussi `../src/data/passages.json`, ce que le site en lit. À refaire si une scène, sa caméra
ou son cadrage téléphone changent :

```bash
cd apps/portfolio/design/renders
node passage-render.mjs                                    # les planches et passages.json
MODE=sheet SCENE=route START=3 OUT=x.png node passage-render.mjs   # pour régler un passage : une planche, monde compris
node build-voyage.cjs
MODE=video CODEC=av01.0.12M.08 QP=36 node voyage-render.mjs route-passage
MODE=video CODEC=avc1.640034 BITRATE=2500000 node voyage-render.mjs route-passage
MOBILE=1 MODE=video SUFFIX=-mobile TO=53 CODEC=avc1.64001F BITRATE=1000000 node voyage-render.mjs route-passage
```

`TO` : la longueur d'un départ (`length` dans passages.json). Les trois vidéos `anim/<escale>-passage(-av1|-mobile).mp4`
se copient dans `../public/voyage/passage/`.

## La maquette

```bash
cd apps/portfolio/design/design-canvas
node build-voyage-boards.cjs   # écrit les planches dans project/
node place-voyage.cjs          # range les planches sur le canvas (project/canvas.json)
```

Les propositions du guide (le copilote qui explique le voyage à la première escale) partent de l'escale 1 :
`node build-guide-propals.cjs`, puis `node place-guide-propals.cjs <canvas.json>`. Le copilote est un bonhomme
d'argile : en combinaison dans l'espace, puis habillé pour chaque escale. Chaque tenue est la scène
`tenue-<escale>` (`astronaute` est celle de l'espace), rendue sur fond transparent avec
`MODE=encode SIZE=640x640 SUFFIX=-guide`. Leurs identifiants sur le canvas sont dans `guide.json`.

Les planches sont publiées sur le canvas, qui reste la référence visuelle. Les images y sont désignées par leur
identifiant sur le canvas (`ids.json`, `mobile.json`).

Les textes sont dans ces fichiers :
- `i18n.cjs` : l'interface et les escales ;
- `fiches-data(.en).cjs` : les fiches, pour les planches seulement. Le site lit les siens dans
  `../src/content/projets/` (un fichier YAML par langue et par projet) : c'est là qu'ils se réécrivent ;
- `apropos-data(.en).cjs` : la page « À propos » ;
- `annexes-data.cjs` : la 404, les mentions légales et les aperçus de partage ;
- `hub-data.cjs` : la page « Les apps » et l'onglet « ← Index ».

Ce sont des brouillons, à réécrire.
