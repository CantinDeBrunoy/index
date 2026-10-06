# CLAUDE.md — Magellan

Guide de travail pour Claude sur ce dépôt. Ces règles sont **prioritaires** sur le
comportement par défaut.

> Magellan est un projet personnel hébergé sur **GitHub**, sans Jira.

---

## Le projet en bref

**Magellan** — app mobile de voyage. Un **globe 3D** met en valeur les **pays visités**
(colorés en vert) et les **villes visitées** (drapeaux sur leurs coordonnées).

- **Expo ~54** / **React Native 0.81** / **React 19**, TypeScript, **expo-router 6**.
- **Une seule base de code → iOS, Android et Web** (`react-native-web`). App _local-first_,
  pas de backend.
- Globe rendu via **`globe.gl`** : dans une `react-native-webview` sur mobile, monté
  directement dans la page sur web (`GlobeView.web.tsx`). Cf. README › Architecture.
- Persistance locale via **AsyncStorage**.

Voir [README.md](README.md) pour la vision, l'architecture détaillée et la feuille de route.

---

## Principes de travail

- **Changements ciblés et minimaux.** Pas de refacto opportuniste hors du sujet en cours.
- **Une phase à la fois.** On suit la feuille de route du README (Phase 0 → 7). Je ne pars
  pas en avant sur une phase ultérieure sans validation.
- **Mode prototype assumé au début.** L'objectif des premières phases est de **valider la
  direction** (le globe tourne, les pays se colorent). Le code se durcit ensuite. Si un
  raccourci est risqué pour la suite, je le signale en une ligne.
- **Honnêteté sur l'état réel.** Si quelque chose n'est pas testé, ne marche pas sur device,
  ou est laissé en TODO, je le dis explicitement — pas de « c'est fait » approximatif.
- **Je demande avant d'élargir le périmètre** ou d'ajouter une dépendance lourde non prévue.
- **Multi-plateforme par défaut.** Le code doit rester compatible **iOS, Android et Web**.
  Quand un comportement diffère par plateforme, j'utilise les fichiers `.web.tsx` /
  `.native.tsx` ou `Platform.select`, jamais un hack qui casse une cible. Idéalement je
  vérifie sur **web _et_ mobile** avant de conclure qu'une feature marche.

---

## Conventions

### Git & branches

- **Branches** : une branche `feat/...` pour chaque feature un peu conséquente (ex.
  `feat/globe-3d`). Pour un petit ajustement, je **demande en début de session** sur quelle
  branche travailler plutôt que d'en créer une nouvelle.
- **Pas de merge sur `main` avec une CI rouge.**

### Commits — Conventional Commits (imposé par la CI)

Le linter de commit ([`.github/workflows/verify-project.yml`](.github/workflows/verify-project.yml))
**rejette** tout message hors format. Modèle :

```
<type>(<scope>): description courte à l'impératif
```

- **Types** acceptés : `feat`, `fix`, `style`, `ci`, `docs`, `chore`, `refactor`, `test`.
- **Scope** optionnel mais encouragé : `globe`, `trips`, `data`, `ui`…
- Exemples : `feat(globe): colorer les pays visités en vert`,
  `fix(trips): éviter le doublon de ville`.

### Langue

Français — code, commentaires (alignés sur l'existant), commits et documentation.

### Style de code

- **TypeScript strict**, types explicites pour les modèles (`VisitedCountry`,
  `VisitedCity`) et les messages du bridge WebView.
- **ESLint** (`eslint-config-expo`) doit passer : `npm run lint`. Je ne contourne pas une
  règle pour faire passer le lint — je corrige.
- Conventions de nommage de l'existant : composants en `PascalCase.tsx`, hooks/utils en
  `kebab-case.ts`.

---

## Intégration continue

CI GitHub Actions ([`ci.yml`](.github/workflows/ci.yml) → `verify-project.yml`), sur push /
PR vers `main`. Étapes :

1. **commit-lint** — format Conventional Commits sur tous les commits.
2. **ESLint** — `npm run lint`.
3. **expo-doctor** — cohérence de la config Expo.
4. **export Android** — `npx expo export --platform android`.

**Après un push, je surveille la CI.** Si elle est rouge : je diagnostique, corrige et
re-pousse. Je ne « répare » **jamais** la CI en désactivant une vérification, en affaiblissant
une règle de lint ou en contournant un contrôle. Si je bloque, je remonte les logs + mon analyse.

---

## Modèle de données (référence)

```ts
// features/trips/types.ts
type VisitedCountry = string;          // code ISO 3166-1 alpha-3, ex. "FRA", "JPN"

type VisitedCity = {
  name: string;
  country: VisitedCountry;             // ISO3 du pays
  lat: number;
  lng: number;
  date?: string;                       // ISO 8601, optionnel
};
```

Le globe consomme : la liste des `VisitedCountry` (→ polygones verts) et la liste des
`VisitedCity` (→ marqueurs drapeaux). Toute évolution du modèle se répercute sur le bridge
WebView et le store.

---

## Ce que je ne fais pas

- Merger sans CI verte.
- Ajouter une dépendance lourde non prévue sans demander.
- Contourner le lint ou le commit-lint au lieu de corriger.
- Partir sur une phase ultérieure de la feuille de route sans validation.
- Prétendre qu'une étape est testée/fonctionnelle si elle n'a pas été vérifiée sur device.
