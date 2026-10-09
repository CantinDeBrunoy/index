# fare-radar ✈️

Vérifie toutes les 6 h le prix des allers-retours depuis Paris (CDG / ORY) pour les voyages que tu surveilles, et envoie une notification push sur le téléphone quand un prix passe sous ton seuil. Une page web liste les bons plans et permet d'ajouter, modifier ou supprimer les surveillances. Tout tourne gratuitement sur GitHub (Actions + Pages), sans serveur.

## Dans le monorepo INDEX

Hublot est l'entrée 010 d'[INDEX](../../README.md). Par rapport au dépôt d'origine :

- **Le cron** est `.github/workflows/hublot-check.yml` à la racine du monorepo. Il ne tourne que si la variable de dépôt `HUBLOT_ENABLED` vaut `true`.
- **L'état** (`config.json`, `data/*.json`) vit sur la branche **`hublot-data`**, pas sur `main` : les ~4 relevés par jour ne remplissent pas l'historique du monorepo. `config.example.json` montre le format.
- **La page** n'est plus sur GitHub Pages : `pnpm --filter hublot build` la prépare dans `dist/page/` (avec l'onglet « ← INDEX ») et le Worker Cloudflare `hublot` la sert (`wrangler.jsonc`).
- **La clé GitHub de la page** doit viser le dépôt `CantinDeBrunoy/index` (Contents et Actions en écriture). ⚠️ Elle donne donc accès en écriture à tout le monorepo, pas seulement à Hublot : à garder sur tes appareils uniquement.

## Fonctionnement

- **Surveillances** : chacune a une destination, une période de départ, une durée de séjour et un prix maximum aller-retour. Elles sont stockées dans `config.json`, que la page modifie pour toi.
- **Données** : [Aviasales Data API](https://support.travelpayouts.com/hc/en-us/articles/203956163-Aviasales-Data-API) (Travelpayouts), endpoint `aviasales/v3/prices_for_dates`. Ce sont les prix trouvés par les utilisateurs d'Aviasales ces derniers jours, pas du temps réel : le prix peut avoir bougé au moment du clic.
- **Requêtes** : pour chaque mois de la période de départ, une requête par mois de retour possible (environ 2 par mois), limite de l'API 600/min. L'API refuse les requêtes où le premier jour de retour tombe plus de 30 jours après le dernier jour de départ (contrainte absente de la doc) : les séjours sont donc limités à 60 jours.
- **Filtres** : aéroport de départ réel dans `origins` (le code ville `PAR` ramène aussi Beauvais ou Le Bourget), départ dans la période, séjour dans la durée voulue, bornes incluses.
- **Alertes** : prix ≤ seuil et offre jamais notifiée (clé = route + dates + prix, oubliée au bout de 30 jours). Au plus **une notification par surveillance × mois de départ et par passage** (la moins chère), pour éviter une rafale pendant une promo.
- **Fichiers de données**, commités par le workflow après chaque passage :
  - `data/latest.json` : résultat du dernier passage, lu par la page ;
  - `data/history.json` : les 3 offres les moins chères par surveillance × mois à chaque passage, une observation par ligne (prévu pour une détection par médiane en V2) ;
  - `data/notified.json` : offres déjà notifiées.

## La page web

Adresse : celle du Worker Cloudflare `hublot` (voir le tableau des déploiements du README d'INDEX).

- **Bons plans** : toutes les offres sous ton seuil, avec un bouton vers Aviasales.
- **Mes surveillances** : ajouter (avec recherche de la ville), modifier, supprimer ; meilleur prix actuel et par mois de départ.
- Après un ajout ou une modification, la page lance tout de suite une vérification des prix : résultats en 2 minutes environ.
- **Démo** : avec `?demo` à la fin de l'adresse, la page montre des surveillances et des prix fictifs (`docs/demo/latest.json`, ramené au mois en cours) au lieu des vrais, pour la montrer ou la filmer. Rien ne part vers GitHub ni vers l'API des villes : ajouts, modifications et suppressions restent dans la page, et la recherche des prix est simulée en quelques secondes.
- Pour modifier, la page a besoin d'une **clé GitHub** (⚙️ en haut à droite) : un formulaire GitHub pré-rempli est proposé, il faut y choisir *Only select repositories* puis ce dépôt. La clé n'a accès qu'à ce dépôt, expire au bout d'un an et reste enregistrée uniquement sur ton appareil.

## Configuration (`config.json`)

| Champ | Rôle |
|---|---|
| `origins` | Aéroports de départ acceptés |
| `currency` | Devise des prix et des seuils |
| `watches[]` | Surveillances : `id`, `label` (nom affiché), `to` (code IATA de la ville), `maxPrice` (seuil A/R), `departFrom` / `departTo` (période de départ, AAAA-MM-JJ), `minDays` / `maxDays` (durée du séjour, 60 jours max) |

## Mise en place

### 1. Token Travelpayouts

1. Créer un compte gratuit sur [travelpayouts.com](https://www.travelpayouts.com/).
2. Copier le token dans *Profile → API token* ([lien direct](https://app.travelpayouts.com/profile/api-token)).

### 2. Notifications ntfy

1. Installer l'appli **ntfy** sur le téléphone (Google Play, F-Droid ou App Store).
2. Choisir un nom de topic long et impossible à deviner : c'est le seul « mot de passe » du canal, n'importe qui le connaissant peut lire tes notifications. Par exemple :
   ```bash
   node -e "console.log('fare-radar-' + crypto.randomUUID())"
   ```
3. Dans l'appli : **+** → saisir ce topic (serveur par défaut `ntfy.sh`) → S'abonner.

### 3. Secrets GitHub

Dans le dépôt : *Settings → Secrets and variables → Actions → New repository secret* :

- `TRAVELPAYOUTS_TOKEN` : le token Travelpayouts
- `NTFY_TOPIC` : le topic ntfy

### 4. Page web

Déployée par le workflow `deploy-hublot-page.yml` du monorepo à chaque modification de `apps/hublot/`.

Pour un premier relevé tout de suite : onglet *Actions* → **hublot-check** → *Run workflow*.

## En local

```bash
pnpm install                                  # à la racine du monorepo
pnpm --filter hublot test
git worktree add ../hublot-data hublot-data   # l'état réel, à côté du monorepo
cp apps/hublot/.env.example ../hublot-data/.env   # puis renseigner TRAVELPAYOUTS_TOKEN
pnpm --filter hublot exec tsc -p tsconfig.build.json
cd ../hublot-data && node ../index/apps/hublot/dist/main.js --dry-run
```

Le CLI lit `config.json` et `data/` dans le dossier courant. Un vrai passage local (sans `--dry-run`) notifie et écrit dans `data/` : comme le workflow commite sur `hublot-data` toutes les 6 h, fais un `git pull` dans le worktree avant de pousser, et préfère `--dry-run`.

## Bon à savoir

- Les prix viennent du cache d'Aviasales (recherches des derniers jours sur le marché français). Beaucoup de mois peuvent être vides, et le prix au clic peut différer : lors du premier test, une offre à 578 € en cache était à 653 € en direct.
- Le dépôt étant public, `config.json`, `data/*.json` et la page le sont aussi (destinations et prix, rien de sensible). Le token Travelpayouts et le topic ntfy restent dans les secrets et n'apparaissent jamais dans les logs.
- La clé GitHub de la page est enregistrée dans le navigateur, pour le domaine `<ton-utilisateur>.github.io`. Si tu publies d'autres pages GitHub avec des scripts de tiers, ou si tu perds ton téléphone, révoque-la dans *GitHub → Settings → Developer settings → Personal access tokens*.
- GitHub peut retarder les crons de plusieurs minutes, voire les sauter quand la plateforme est chargée.
- GitHub désactive les crons d'un dépôt public après 60 jours sans activité. Les commits de données du workflow suffisent normalement ; sinon, il faut le réactiver depuis l'onglet *Actions*.
- En cas d'échec (token refusé, API en panne…), le job passe en rouge et GitHub envoie un e-mail. Les autres surveillances sont quand même traitées et sauvegardées.
