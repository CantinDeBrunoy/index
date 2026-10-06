# Magellan 🌍

Application mobile de voyage : un **globe 3D interactif** qui met en valeur les pays
visités (colorés en vert) et les villes visitées (drapeaux posés sur leurs coordonnées).

> Projet [Expo](https://expo.dev) / React Native, écrit en TypeScript, routing par
> fichiers via [expo-router](https://docs.expo.dev/router/introduction).
>
> **Une seule base de code, trois plateformes** : iOS, Android et **Web** (via
> `react-native-web`). Pas de backend — l'app est _local-first_.

---

## La vision

Ouvrir l'app, c'est voir **sa propre carte du monde** : une planète qui tourne, les pays
déjà visités en vert, un drapeau sur chaque ville parcourue.

L'objet central est le **voyage (road trip)** : une suite ordonnée d'**étapes** (villes).
Sur le globe, les étapes d'un même voyage sont reliées par un **arc** ; un pays devient
vert dès qu'une étape s'y trouve. L'app récapitule la progression (voyages, villes, pays).

L'onglet **Voyages** est une **boîte à fiches** sur la même table en noyer : une fiche bristol
par voyage (bande à la couleur de son tracé, itinéraire manuscrit, tampons des pays, chiffres),
classées par année, du plus récent au plus ancien, avec les voyages sans date à la fin ;
filtres « Tous · Road trips · Une ville ». Toucher une fiche ouvre celle du voyage ; le crayon
l'ouvre en édition (ajouter une étape par recherche de ville, en retirer, supprimer le voyage
après confirmation). Un nouveau voyage apparaît en tête, « à compléter ».

Taper un voyage ouvre sa **fiche détail**, posée sur une **table en noyer** : étiquette kraft
pour le titre, pays en tampons encreurs, chiffres clés sur des post-it, un **post-it punaisé
par étape** (sa couleur dit le pays) relié aux autres par un fil rouge, et le budget sur une
feuille de bloc-notes. Une ville — étape d'un road trip ou voyage à une seule ville — a sa
propre fiche sur la même table : une **carte postale** à la couleur du tracé du voyage sur le
globe, ses chiffres, son budget, ses participants et sa position. Un voyage à une seule ville
n'a qu'une fiche : son drapeau mène directement à celle du voyage. La mise en page suit la
largeur d'écran : zigzag d'une étape par rangée sur téléphone, serpentin sur 2–3 colonnes sur
écran large (web, tablette).

Les **photos** s'importent en masse depuis la version web (Edge / Chrome), à partir du dossier
où iCloud pour Windows synchronise la photothèque : l'app lit la date et le lieu (EXIF) de
chaque photo et la range dans la bonne étape — d'office quand lieu et date concordent, « à
vérifier » quand l'étape n'a pas de date ou que la photo n'a pas de lieu (photos WhatsApp :
date lue dans le nom du fichier). On valide par paquets, puis les photos s'affichent sur une
**corde à linge** de polaroids dans les fiches. Rien n'est copié : l'app garde une référence
vers chaque fichier et une miniature dans le navigateur ; les photos restent propres à ce
navigateur.

## La stack

- **Expo ~54** / **React Native 0.81** / **React 19** — TypeScript
- **expo-router 6** — navigation par onglets et écrans modaux
- **react-native-webview** — héberge le globe
- **[globe.gl](https://globe.gl)** (basé sur three-globe) — rendu du globe 3D, coloration
  des pays au GeoJSON, marqueurs en lat/lng
- **AsyncStorage** — persistance locale des voyages

> Choix de rendu : **globe.gl**, monté dans une **WebView** sur mobile et **directement
> dans la page** sur web (`GlobeView.web.tsx`). La logique de données est partagée ; seul
> l'hôte du rendu diffère. Un passage en rendu natif (react-three-fiber ou Mapbox globe)
> reste possible plus tard si la performance l'exige.

## Architecture

```
app/
  _layout.tsx              # layout racine
  (tabs)/index.tsx         # écran Globe (WebView plein écran)
  (tabs)/explore.tsx       # liste & stats des voyages
features/
  globe/
    GlobeView.tsx          # mobile : globe.gl dans une WebView + bridge
    GlobeView.web.tsx      # web : globe.gl monté directement dans la page
    globe.html.ts          # template HTML/JS (globe.gl), partagé
    bridge.ts              # types des messages échangés
  trips/
    store.ts               # état des voyages + persistance
    types.ts               # VisitedCountry (ISO3), VisitedCity {name,country,lat,lng}
    dates.ts               # dates d'étape en texte libre → période, année, libellé court
  voyages/
    TripCard.tsx           # fiche bristol d'un voyage (onglet Voyages) : consultation / édition
  detail/
    WoodKit.tsx            # kit « bois & post-it » (étiquette, post-it, fil rouge, carte postale)
    CitySheet.tsx          # fiche d'une ville : étape d'un road trip ou voyage à une ville
  photos/
    match-photos.ts        # rangement automatique (lieu + date → étape), 3 niveaux de confiance
    web-folder.ts          # web : dossier du PC (File System Access), EXIF, miniatures (IndexedDB)
    ImportScreen.web.tsx   # web : import groupé et vérification par paquets (.tsx : repli mobile)
    PhotoThumb.web.tsx     # web : miniature d'une photo (.tsx : repli mobile)
data/
  countries.geo.json       # frontières des pays (Natural Earth, simplifié)
  countries.ts             # ISO3 → { nom, drapeau, centroïde }
components/ hooks/ constants/   # primitives UI & thème
```

### Le bridge WebView (point central)

- **RN → globe** : `injectJavaScript` pousse `{ visitedISO3[], cities[] }` ; le JS rappelle
  `.polygonsData(...)` / `.pointsData(...)` pour redessiner.
- **globe → RN** : `window.ReactNativeWebView.postMessage(...)` au tap d'un pays ou d'un
  marqueur ; `onMessage` côté RN met à jour le store.

## Démarrage

```bash
npm install
npx expo start
```

Puis ouvre l'app dans un [build de dev](https://docs.expo.dev/develop/development-builds/introduction/),
un simulateur iOS / émulateur Android, ou [Expo Go](https://expo.dev/go).

```bash
npm run android   # émulateur Android
npm run ios       # simulateur iOS
npm run web       # navigateur
npm run lint      # ESLint (eslint-config-expo)
```

## Feuille de route

- [x] **Phase 0** — Nettoyage du template, arborescence, modèle de données
- [~] **Phase 1** — Données de référence (GeoJSON pays via CDN ✔, table ISO de départ ✔, drapeaux emoji ✔ ; table complète + GeoJSON local à venir)
- [x] **Phase 2** — Globe MVP (planète, rotation, gestures)
- [x] **Phase 3** — Pays visités colorés en vert
- [x] **Phase 4** — Voyages (road trips) : drapeaux 3D des villes (mât + tissu texturé ondulant) + arcs reliant les étapes
- [x] **Phase 5** — Recherche de ville (coordonnées précises) + tap sur un pays → voyages du pays → étapes, avec centrage caméra
- [x] **Phase 6** — Persistance locale (AsyncStorage) _(socle posé dès la Phase 0)_
- [ ] **Phase 7** — Polish : onboarding, thème, perfs, partage de carte

## Intégration continue

Magellan vit dans le monorepo [INDEX](../../README.md). Le workflow `ci.yml` à la racine
(sur push / PR vers `main`, quand Magellan est touché) vérifie **ESLint**, le **typecheck**,
le **build web**, **expo-doctor** et un **export Android** (`expo export --platform android`).

## Convention de commits

[Conventional Commits](https://www.conventionalcommits.org) (convention du projet) :

```
feat(globe): afficher la planète en plein écran
fix(trips): corriger le centroïde du Japon
```

Types acceptés : `feat`, `fix`, `style`, `ci`, `docs`, `chore`, `refactor`, `test`.
