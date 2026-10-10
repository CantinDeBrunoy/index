# INDEX

Le monorepo de mes projets, et leur catalogue : le portfolio présente chaque projet comme l'escale d'un voyage, avec sa fiche, sa démo, son code et son statut en direct. Les adresses des fiches gardent le numéro du projet (`/005-magellan`).

## Architecture

```
index/
  apps/
    portfolio/    le site INDEX (Astro) + Worker Cloudflare : /api/status, connexion (/api/auth/*) et cron du keep-alive
    galactic-escape/ 001 · Vite + React + Three.js (jeu d'école de 2022)
    magellan/     005 · Expo (export web) + Worker Cloudflare : les voyages du propriétaire (D1)
    cancionero/   006 · Expo (PWA statique)
    mithril/      007 · C# WinForms (hors pnpm/Turborepo, CI Windows dédiée)
    tonalli/      008 · Vite + React (PWA) + Supabase
    gym-picker/   009 · Vite + React + Worker Cloudflare (API TomTom)
    hublot/       010 · CLI Node (cron GitHub Actions) + page de gestion et son Worker (clé GitHub côté serveur)
  packages/
    projects/     @index/projects : la liste des entrées (source de vérité unique) et les sondes de statut
    auth/         @index/auth : la connexion du propriétaire (GitHub sur le hub, vérifiée par Magellan et Hublot)
    ui/           @index/ui : palettes du voyage et polices
    config/       @index/config : tsconfig partagé
  scripts/        keep-alive.ts, screenshots.ts
  .github/workflows/
```

Les entrées 002 à 004 sont des archives (projets antérieurs, sans démo en ligne) : elles n'existent que dans `packages/projects/src/projects.ts` et dans le portfolio. Galactic Escape (001), un projet d'école de 2022, a été remis en ligne : son code est dans `apps/galactic-escape`, sans son historique, qui reste sur [run4urlife](https://github.com/CantinDeBrunoy/run4urlife).

- **pnpm workspaces + Turborepo.** Chaque app garde ses propres dépendances et versions, et reste buildable seule : `pnpm turbo run build --filter=<app>`.
- **Historique conservé.** Chaque projet a été importé avec `git filter-repo --to-subdirectory-filter apps/<app>` : `git log` et `git blame` remontent à ses premiers commits.
- **Une seule source de vérité.** `packages/projects/src/projects.ts` alimente le portfolio (liste, fiches, statut live), le keep-alive et le cron de Hublot.

## Lancer en local

Prérequis : Node 24 (`.nvmrc`) et pnpm (`corepack enable pnpm`).

```bash
pnpm install
```

```bash
pnpm dev
```

`pnpm dev` lance tous les serveurs de dev. Pour une seule app :

```bash
pnpm dev --filter=portfolio
```

| App | Commande | Adresse |
|---|---|---|
| portfolio | `pnpm dev --filter=portfolio` | http://localhost:4321 |
| portfolio avec `/api/status` | `pnpm --filter portfolio preview` | http://localhost:8787 |
| magellan | `pnpm dev --filter=magellan` | http://localhost:8081 |
| cancionero | `pnpm dev --filter=cancionero` | http://localhost:8082 |
| tonalli, gym-picker | `pnpm dev --filter=<app>` | port affiché par Vite |
| mithril | `apps/mithril/outils/build.ps1` (PowerShell) | Mithril.exe |

Vérifications, comme en CI :

```bash
pnpm turbo run lint typecheck test build
```

Les variables d'environnement de chaque app sont décrites dans son `.env.example` (ou `.dev.vars.example` pour les Workers). Aucun secret n'est commité.

## Ajouter une entrée à INDEX

1. **Importer le projet avec son historique** (prérequis : `pip install git-filter-repo`) :
   ```bash
   git clone --single-branch -b main https://github.com/CantinDeBrunoy/<repo>.git ../import-<app>
   cd ../import-<app> && git filter-repo --to-subdirectory-filter apps/<app> && cd ../index
   git fetch ../import-<app> main:refs/import/<app>
   git merge --allow-unrelated-histories refs/import/<app>
   ```
2. **Le brancher sur le workspace** : `name` du `package.json` = `<app>`, scripts `dev`, `build`, `lint`, `typecheck`, `test` (ceux qui existent), suppression des autres lockfiles, `pnpm install`.
3. **Écrire son `.env.example`**, sans valeur secrète.
4. **Ajouter l'entrée en fin de liste** dans `packages/projects/src/projects.ts` : nom, slug, `started` (AAAA-MM), pitch, stack, liens, sondes (`monitors`). Le numéro suivant est attribué tout seul ; les tests vérifient l'ordre chronologique et l'unicité.
5. **Rédiger la fiche** `apps/portfolio/src/content/projets/fr/<slug>.mdx` : `lede`, puis Contexte, Problème résolu, Choix techniques.
6. **Faire les captures** : ajouter la cible dans `scripts/screenshots.ts`, puis :
   ```bash
   pnpm build
   ```
   ```bash
   pnpm screenshots <slug>
   ```
7. **Déployer** :
   - sur Cloudflare : un `wrangler.jsonc` dans l'app et une copie de `.github/workflows/deploy-magellan.yml` en `deploy-<app>.yml` ;
   - sur Vercel : relier le projet au dépôt `index` avec *Root Directory* = `apps/<app>`.
8. **Vérifier** : `pnpm turbo run lint typecheck test build --filter=<app>`.

## Déploiements

| N° | App | Hébergement | URL | Déclenchement |
|---|---|---|---|---|
| — | portfolio | Cloudflare Workers `index` | https://index.cantin-roquier.workers.dev | `deploy-portfolio.yml` |
| 001 | galactic-escape | Cloudflare Workers `galactic-escape` | https://galactic-escape.cantin-roquier.workers.dev | `deploy-galactic-escape.yml` |
| 005 | magellan | Cloudflare Workers `magellan` | https://magellan.cantin-roquier.workers.dev | `deploy-magellan.yml` |
| 006 | cancionero | Cloudflare Workers `cancionero` | https://cancionero.cantin-roquier.workers.dev | `deploy-cancionero.yml` |
| 007 | mithril | GitHub Releases (tags `mithril-v*`) | — | à la main (skill `publier-release`), CI `mithril.yml` |
| 008 | tonalli | Vercel `teinte-du-jour` + Supabase | https://teinte-du-jour-eight.vercel.app | intégration Git Vercel, *Root Directory* `apps/tonalli` |
| 009 | gym-picker | Cloudflare Workers `gym-picker` | https://gym-picker.cantin-roquier.workers.dev | `deploy-gym-picker.yml` |
| 010 | hublot | GitHub Actions (cron, ancien dépôt jusqu'à la bascule) + Cloudflare Workers `hublot` (page) | https://hublot.cantin-roquier.workers.dev | `deploy-hublot-page.yml` ; `hublot-check.yml` à la bascule |

Le sous-domaine workers.dev (`cantin-roquier`) est renseigné une seule fois, dans `WORKERS_SUBDOMAIN` (`packages/projects/src/projects.ts`). Toutes les URLs et le statut live en découlent.

Les déploiements Cloudflare passent par le workflow réutilisable `_deploy-cloudflare.yml` : build Turborepo de l'app et de ses packages, puis `wrangler deploy`. Chaque `deploy-<app>.yml` ne se déclenche que quand `apps/<app>/`, `packages/` ou le lockfile changent sur `main`.

## Anti-shutdown

Tout est servi en statique ou en edge, rien ne s'endort, sauf la base Supabase gratuite de Tonalli (pause après 7 jours sans activité).

- **`keep-alive.yml`** tourne toutes les 6 heures. Il sonde chaque URL de démo et fait une vraie requête PostgREST sur Supabase. Un service en panne ouvre une issue `keep-alive`, qui se ferme d'elle-même à son retour. Une sonde en échec est relancée après 30 s avant de conclure.
- **Le Worker du portfolio** refait les mêmes sondes toutes les heures, via un cron Cloudflare.
  - GitHub désactive les crons d'un dépôt public après 60 jours sans activité ; ce cron-là n'en dépend pas, donc Supabase reste éveillé quoi qu'il arrive.
  - Le Worker vérifie aussi l'état des workflows planifiés et ouvre une issue si GitHub en a désactivé un : il suffit de cliquer sur *Enable workflow*.
  - Il n'y a volontairement ni commit factice ni réactivation automatique : GitHub a bloqué l'action « keepalive-workflow » pour violation de ses conditions d'utilisation.
- **Hublot** est surveillé par la fraîcheur de ses données : `generatedAt` doit dater de moins de 13 h.

```bash
node scripts/keep-alive.ts --dry-run
```

## CI

- **`ci.yml`** (PR et `main`) : lint, typecheck, tests et build des seules apps touchées et de celles qui en dépendent (`turbo --affected`), avec le cache Turborepo. Quand Magellan est touché, `expo-doctor` et un bundle Android sont aussi vérifiés.
- **`mithril.yml`** : compilation stricte, banc de tests, couverture, audit de sécurité et CodeQL, sur Windows, seulement quand `apps/mithril/` change.

## Configuration à faire dans les dashboards

**Secrets du dépôt GitHub** (*Settings → Secrets and variables → Actions*) :

| Secret | Pour |
|---|---|
| `CLOUDFLARE_API_TOKEN` | les déploiements Cloudflare (modèle « Edit Cloudflare Workers ») |
| `CLOUDFLARE_ACCOUNT_ID` | idem |
| `TONALLI_SUPABASE_ANON_KEY` | la requête Supabase du keep-alive (clé anon, publique par nature) |
| `TRAVELPAYOUTS_TOKEN` | Hublot |
| `NTFY_TOPIC` | Hublot |

**Variable du dépôt GitHub :** `HUBLOT_ENABLED` = `true` le jour de la bascule de Hublot.

**Secrets du Worker `index`** :

```bash
pnpm --filter portfolio exec wrangler secret put TONALLI_SUPABASE_ANON_KEY
```

```bash
pnpm --filter portfolio exec wrangler secret put GITHUB_ALERTS_TOKEN
```

`GITHUB_ALERTS_TOKEN` est un jeton GitHub à grain fin limité au dépôt `index`, avec *Issues* en lecture/écriture et *Actions* en lecture.

**La connexion du propriétaire** (le lien « Connexion » en bas des pages du hub) :

- une application OAuth GitHub (*Settings → Developer settings → OAuth Apps*), *Authorization callback URL* `https://index.cantin-roquier.workers.dev/api/auth/callback` ; son *Client ID* va dans `GITHUB_CLIENT_ID` (`apps/portfolio/wrangler.jsonc`, public) ;
- deux secrets sur le Worker `index` : `GITHUB_CLIENT_SECRET` (celui de l'application) et `SESSION_SECRET` (une longue valeur aléatoire ; la changer déconnecte partout) ;
- un secret sur le Worker `hublot` : `HUBLOT_GITHUB_TOKEN`, jeton à grain fin limité au dépôt `Hublot`, *Contents* et *Actions* en écriture.

```bash
pnpm --filter portfolio exec wrangler secret put GITHUB_CLIENT_SECRET
```

```bash
pnpm --filter portfolio exec wrangler secret put SESSION_SECRET
```

```bash
pnpm --filter hublot exec wrangler secret put HUBLOT_GITHUB_TOKEN
```

Seul le compte GitHub du propriétaire (`OWNER` dans `packages/auth/src/session.ts`) obtient une session : un cookie signé, posé sur tout `cantin-roquier.workers.dev`. Magellan et Hublot ne connaissent pas le secret : ils demandent au hub, par une liaison de service, si le cookie reçu est le bon. Les voyages de Magellan sont dans la base D1 `magellan` (une ligne, versionnée ; retour en arrière possible sur 30 jours avec `wrangler d1 time-travel`), jamais dans le dépôt.

**Vercel :** le projet `teinte-du-jour` (Tonalli) est relié au dépôt `index`, avec *Root Directory* `apps/tonalli`, Node 24, l'option qui ignore les déploiements quand le dossier n'a pas changé, et la variable `ENABLE_EXPERIMENTAL_COREPACK` = `1`, sans laquelle Vercel n'utilise pas la version de pnpm fixée dans `packageManager`.

**Cloudflare :** déconnecter Workers Builds de l'ancien dépôt `gym-picker`. Les déploiements passent désormais par `deploy-gym-picker.yml`. Le secret `TOMTOM_API_KEY` reste sur le Worker.

**Supabase :** vérifier que le cron `daily-reminders` de Tonalli est actif (*Integrations → Cron*).

## Bascule de Hublot

La page de Hublot est déjà servie par le Worker `hublot` : on s'y connecte par le hub, et sa clé GitHub reste côté serveur. Mais jusqu'à la bascule, le cron et les données restent dans l'ancien dépôt Hublot, et la page y lit et écrit. Le monorepo est prêt :

- code dans `apps/hublot` ;
- état sur la branche `hublot-data` ;
- cron `hublot-check.yml` inactif.

Étapes :

1. Rafraîchir `hublot-data` avec le dernier état de l'ancien dépôt (`config.json`, `data/*.json`).
2. Viser le monorepo dans `apps/hublot` : `DATA_REPOSITORY` (`worker/github.ts`) et `REPOSITORY`, `DATA_BRANCH`, `WORKFLOW` (`docs/app.js`) deviennent `index`, `hublot-data`, `hublot-check.yml`.
3. Créer la variable `HUBLOT_ENABLED` = `true`, puis lancer `hublot-check.yml` (*Run workflow*).
4. Désactiver le workflow de l'ancien dépôt Hublot, pour éviter les notifications en double.
5. Passer `HUBLOT_MIGRATED` à `true` dans `packages/projects/src/projects.ts`, ce qui bascule la sonde de fraîcheur.
6. Remplacer `HUBLOT_GITHUB_TOKEN` par un jeton sur le dépôt `index`. ⚠️ Même côté serveur, il a accès en écriture à tout le monorepo.

## Charte

« Le voyage » : chaque projet est une escale, une scène 3D d'argile et de laiton, précalculée (`apps/portfolio/design/`). Instrument Serif, Geist et Geist Mono, auto-hébergées ; quatre palettes (nuit, jour, soir, kraft) dans `packages/ui/src/voyage.css`. Les apps gardent leur propre design, sans lien vers le portfolio : on y va depuis le hub.
