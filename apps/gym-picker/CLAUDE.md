# Gym Picker — guide de reprise

Ce fichier s'adresse à qui va *modifier* le projet. Le `README.md` explique
comment l'installer et l'utiliser.

---

## 1. Le besoin

Quatre salles de sport à distance comparable, et le trafic change laquelle est
la plus rapide. Objectif : voir les quatre classées par temps de trajet réel
(voiture, trafic du moment) en 1 ou 2 appuis. **Critère de réussite : moins de
5 s.** Pour le vérifier, la page affiche la durée de chaque recherche.

Hors V1 : affluence dans la salle, horaires d'ouverture, autres modes de
transport, historique.

## 2. Architecture

Un seul Worker Cloudflare sert tout :

- les fichiers statiques (le build Vite de `src/`), sans exécuter le code du
  Worker ;
- `POST /api/etas` ([worker/index.ts](worker/index.ts)), le calcul, et la
  connexion du propriétaire (`GET /api/session`, `/api/auth/*`), vérifiée
  auprès du hub (`run_worker_first` dans `wrangler.jsonc`).

Parcours d'une recherche : position (GPS rapide, sinon domicile) →
`POST /api/etas {lat, lng}` → Worker → TomTom Matrix Routing v2 (1 départ ×
N salles, trafic live, un seul appel) → tri → affichage.

| Dossier | Contenu |
| --- | --- |
| `shared/` | Contrat page ↔ Worker (types, `isLatLng`) et liste des salles. Compilé avec les types du navigateur *et* ceux du Worker : rien de propre à l'un ou à l'autre. |
| `worker/` | L'API : routage, limite de débit, appel TomTom, tri. |
| `src/` | La page React : géolocalisation, domicile, liens Waze/Maps, formats. |
| `public/` | Manifest, service worker, icônes. `icon.svg` est la source des PNG. |

## 3. Décisions, et pourquoi

**TomTom plutôt que Google Routes.** Pas de carte bancaire, et au-delà du quota
gratuit l'API refuse au lieu de facturer, ce qui compte puisque l'URL de l'API
est publique. Google (`computeRouteMatrix` avec `TRAFFIC_AWARE`, SKU Pro, 5 000
éléments gratuits par mois) reste possible si les temps TomTom s'avèrent moins
justes que ceux de Waze. Seul [worker/tomtom.ts](worker/tomtom.ts) serait à
remplacer.

**Le domicile reste sur le téléphone** (`localStorage`, [src/home.ts](src/home.ts)).
Le repo est public, donc les coordonnées des salles aussi. Si le domicile était
stocké côté serveur, n'importe qui pourrait appeler l'API « depuis le domicile »
et le situer à partir des quatre temps de trajet. Le Worker ignore donc tout du
domicile : la page lui envoie toujours un point.

**La position voyage dans le corps de la requête**, pas dans l'URL : les URL
finissent dans les logs.

**`waze://` et `comgooglemaps://` sur iOS.** Depuis une web app installée sur
l'écran d'accueil, les liens https universels s'ouvrent dans un navigateur
intégré au lieu de l'app. Contrepartie : un appui ne fait rien si l'app n'est
pas installée. Ailleurs, les liens restent en https.

**Limite de 20 appels par minute et par IP** (binding Rate Limiting, gratuit).
Elle protège le quota TomTom d'une boucle ou d'un abus modeste. Ce n'est pas un
compteur exact : protéger le quota *journalier* demanderait un KV ou un Durable
Object.

**Service worker maison, en stale-while-revalidate** ([public/sw.js](public/sw.js)).
L'app s'ouvre instantanément depuis le cache et se met à jour en arrière-plan ;
la nouvelle version apparaît au lancement suivant. `/api` n'est jamais mis en
cache. Il est désactivé en dev. Si sa stratégie change, incrémenter `CACHE`.

**GPS en basse précision** (`FAST_FIX`, [src/geolocation.ts](src/geolocation.ts)).
La précision Wi-Fi ou antenne suffit pour un temps de trajet et répond bien plus
vite. La haute précision ne sert qu'à enregistrer le domicile.

**Mode démo** ([src/demo.ts](src/demo.ts)) : quatre salles fictives au centre
de Paris, une position inventée, des temps calculés dans la page, qui changent
à chaque actualisation. Ni GPS ni appel au Worker : un `dist/client` servi seul
suffit. `/?demo` le force, pour filmer l'app ; il tient alors le temps de
l'onglet (sessionStorage), et `?demo=domicile` simule un GPS en panne. Les
branchements sont en bas de pile (`getPosition`, `fetchEtas`, `home.ts`) : en
démo, rien n'atteint le vrai GPS, l'API ni le domicile enregistré.

**Un visiteur voit la démo** ([src/owner.ts](src/owner.ts)), décidé avant le
premier affichage. Le propriétaire, c'est l'app installée sur l'écran
d'accueil (son iPhone), ou un navigateur où sa session du hub INDEX est
ouverte (`GET /api/session`, que le Worker vérifie auprès du hub par la
liaison de service `HUB`, avec `@index/auth/app`). L'app installée ne peut pas
compter sur cette session : iOS lui donne ses propres cookies, et le détour
par GitHub s'y ferait dans un navigateur à part. Contrepartie : un visiteur
qui installerait l'app verrait les vraies salles, déjà publiques dans le repo.
Sans réponse claire du Worker, la page reste en démo. Un visiteur garde le
lien « Connexion », par lequel le propriétaire retrouve ses salles dans un
navigateur.

**`POST /api/etas` reste ouvert**, sans session : l'app installée du
propriétaire n'a pas le cookie du hub. La page d'un visiteur ne l'appelle
jamais (démo), et la limite de débit protège le quota.

## 4. Pièges

- **Node 22.12 minimum** : wrangler 4 et Vitest 5 refusent Node 20. Avec
  nvm-windows : `nvm use 24.13.0`.
- **`worker-configuration.d.ts`** est généré (`postinstall`) et ignoré par git.
  Après une modification de `wrangler.jsonc` : `npm run cf-typegen`.
- **Déploiement : `.github/workflows/deploy-gym-picker.yml`**, à chaque push
  sur `main` qui touche ce dossier, un package partagé ou le lockfile. Un push
  sur `main` part donc en production.
- **`DEMO` est fixé au démarrage** (`main.tsx`, après la réponse de
  `/api/session`). Ne pas le lire au chargement d'un module : une constante
  calculée hors d'une fonction garderait la valeur d'avant la décision, et
  montrerait les vraies salles à un visiteur.
- **En local, on est visiteur** : la liaison `HUB` vise le Worker `index`, qui
  ne tourne pas. `/api/session` répond donc `owner: false`.
- **Secret `TOMTOM_API_KEY`** : `.dev.vars` en local, secret du Worker en
  production (`wrangler secret put`, ou Settings › Variables and Secrets du
  Worker — pas le « Secrets Store » du compte, que le Worker ne lit pas). Il
  est déclaré dans `secrets.required`, ce qui le type, affiche un avertissement
  au build (normal sans `.dev.vars`) et **fait échouer `wrangler deploy` tant
  qu'il n'existe pas sur le Worker** : le créer avant le premier déploiement.
- **Clé TomTom** : le produit « Matrix Routing v2 API » doit être coché sur la
  clé, et met environ deux minutes à s'activer. Sinon TomTom répond 403,
  affiché « Clé TomTom non autorisée pour Matrix Routing v2 ». Un 401 (« Clé
  TomTom invalide ») signale plutôt une valeur mal collée.
- **Trois configurations TypeScript** (`tsconfig.app/worker/test.json`), plus
  `tsconfig.node.json` pour les fichiers de config. Les tests sont exclus des
  deux premières : types Node et types Workers ne cohabitent pas.
- **iOS** peut redemander l'autorisation de localisation au lancement de la web
  app. Le délai de `FAST_FIX` (4 s) ne démarre qu'après l'autorisation.
- **Quota TomTom** : 2 500 requêtes par jour sur le forfait gratuit, partagées
  entre toutes les API du compte. Un 429 de TomTom devient un 503 « Quota
  TomTom du jour épuisé ».
- **Zone** : TomTom exige que départ et arrivées tiennent dans un carré de
  400 km de côté. Au-delà, les salles s'affichent « Pas d'itinéraire trouvé ».

## 5. Tester

`npm test` couvre les fonctions pures : lecture de la matrice TomTom, tri,
validation, formats, liens, temps de démo. Pour l'API de bout en bout, avec
une clé dans `.dev.vars` :

```bash
npm run dev
curl -X POST localhost:5173/api/etas -d '{"lat":48.85,"lng":2.35}'
```
