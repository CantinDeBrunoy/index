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
déjà visités en vert, un drapeau sur chaque ville parcourue. On tape un pays pour le
marquer visité, on ajoute une ville, et l'app récapitule la progression (nombre de pays,
de villes, % du monde couvert).

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

- [ ] **Phase 0** — Reset du template, arborescence, modèle de données
- [ ] **Phase 1** — Données de référence (GeoJSON pays, table ISO, drapeaux)
- [ ] **Phase 2** — Globe MVP (planète, rotation, gestures)
- [ ] **Phase 3** — Pays visités colorés en vert
- [ ] **Phase 4** — Drapeaux sur les villes visitées
- [ ] **Phase 5** — Interaction : tap pour (dé)marquer, ajout de ville, panneau détail
- [ ] **Phase 6** — Persistance locale (AsyncStorage)
- [ ] **Phase 7** — Polish : onboarding, thème, perfs, partage de carte

## Intégration continue

Le workflow GitHub Actions [`ci.yml`](.github/workflows/ci.yml) (sur push / PR vers `main`)
vérifie : **format des messages de commit** (Conventional Commits), **ESLint**,
**expo-doctor**, et un **export Android** (`expo export --platform android`).

## Convention de commits

[Conventional Commits](https://www.conventionalcommits.org) imposés par la CI :

```
feat(globe): afficher la planète en plein écran
fix(trips): corriger le centroïde du Japon
```

Types acceptés : `feat`, `fix`, `style`, `ci`, `docs`, `chore`, `refactor`, `test`.
