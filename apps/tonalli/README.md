# Tonalli

*Tonalli* — l'énergie vitale d'une personne en nahuatl, et aussi le jour, la
chaleur du soleil.

Deux personnes liées enregistrent chaque jour l'énergie de leur journée : une
émotion, qui est une couleur, et deux photos prises sur le moment — la scène
devant soi et son propre visage, au même appui. Chacun voit le
calendrier de l'autre — mais seulement après avoir rempli le sien — et peut y
poser un emoji d'une palette fermée, en un appui. C'est un rituel à deux, pas
un réseau social.

Site web (rien à installer), bilingue français / espagnol, mode sombre.

> Pour reprendre ou modifier le projet, lire **[`CLAUDE.md`](CLAUDE.md)** :
> invariants, schéma, pièges déjà rencontrés et reste à faire.

## Stack

React 19 + TypeScript + Vite · React Router · i18n-js · Supabase (auth,
Postgres, Storage) · Web Push via service worker et Edge Functions.

```bash
npm install
cp .env.example .env      # puis renseigner les clés Supabase
npm run dev               # http://localhost:5173
npm run build             # tsc -b && vite build
npm run checks            # vérifications des dates, fuseaux, émotions et réactions
```

> La caméra n'est accessible qu'en **HTTPS** (ou sur `localhost`) : c'est une
> règle des navigateurs, pas un réglage de l'app.

## Mise en place de Supabase

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Exécuter les migrations dans l'ordre, depuis le SQL Editor ou la CLI :
   `supabase/migrations/0001_init.sql` puis `0002_notifications.sql`
   (une base déjà en service joue en plus les rattrapages `0003` à `0007`).
   Elles créent les tables, la RLS, les fonctions de liaison et le bucket privé.
3. Copier `Project URL` et la clé `anon` dans `.env`
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
4. Authentication → Providers : activer **Email**. La confirmation par e-mail
   peut rester active, l'app affiche l'écran d'attente correspondant.

La clé `anon` est publique par nature : c'est la Row Level Security qui protège
les données, jamais le secret de la clé.

## Modèle de données

| Table | Rôle |
| --- | --- |
| `emotions` | les 12 couples (clé, couleur), figés |
| `profiles` | nom, langue, **fuseau**, `partner_id`, code d'invitation, réglages de rappel |
| `entries` | une ligne par personne et par jour : `date`, `emotion`, `color`, `photo_path`, `selfie_path`, `note` |
| `reaction_emojis` | les 6 couples (clé, emoji) de l'action rapide, figés |
| `reactions` | un emoji posé sur la journée du binôme, clé primaire `(entry_id, author_id)` |

`entries` a une contrainte `unique (user_id, date)` — un seul choix par jour —
et une clé étrangère `(emotion, color) → emotions (key, color)` : une couleur
qui ne correspond pas à son émotion ne peut pas exister en base.

### Réciprocité, appliquée par la base

La mécanique « je vois sa journée quand j'ai rempli la mienne » n'est pas un
simple masquage d'interface : la policy de lecture de `entries` n'autorise une
ligne du binôme que s'il existe une ligne à moi à la même date. Un jour que je
n'ai pas rempli reste donc masqué **définitivement** — on ne peut pas remplir le
passé, c'est ce qui donne son poids au rituel.

Pour afficher malgré tout une case hachurée « il/elle a posté ce jour-là », la
fonction `partner_entry_dates()` ne renvoie que des **dates**, sans aucun
contenu. Les photos suivent la même règle : la policy Storage n'autorise un
objet que s'il existe une ligne `entries` visible qui pointe dessus.

### Réactions rapides

Sous la journée du binôme, six emoji : un appui pose la réaction, un autre
emoji la remplace, le même la retire. C'est la seule action possible sur la
journée de quelqu'un d'autre — pas de texte, pas de fil. La policy d'écriture
de `reactions` exige que la ligne visée soit une entrée du binôme **et** qu'elle
soit déjà lisible : réagir ne donne jamais accès à ce que la réciprocité
masque.

### Liaison du binôme

Chaque profil reçoit à l'inscription un code de 6 caractères (alphabet sans
`O`/`0` ni `I`/`1`, pour se dicter au téléphone sans faute). `link_partner(code)`
et `unlink_partner()` sont des fonctions transactionnelles : `partner_id` et
`invite_code` sont protégés en écriture directe par un trigger, la relation
1-1 est garantie par une contrainte `unique` sur `partner_id`.

## Fuseaux horaires

Le point le plus délicat de l'app, traité comme tel.

- Le « jour » d'une entrée est **la date locale de son auteur**, calculée avec
  `Intl` dans son fuseau, jamais avec `toISOString()` (qui renvoie de l'UTC et
  décale la journée d'un cran le soir).
- Cette date est stockée telle quelle et **jamais convertie** à l'affichage : le
  calendrier du binôme se lit à ses dates à lui.
- Le fuseau est enregistré dans le profil et remis à jour à chaque connexion,
  donc un voyage suit la personne.
- Les réglages affichent l'heure locale du binôme en direct, et le décalage.

`npm run checks` teste explicitement le cas France / Mexique : au même instant,
Paris est le 28 et Mexico le 27 ; le décalage vaut 8 h l'été et 7 h l'hiver (le
Mexique n'applique plus l'heure d'été depuis 2022).

## Notifications

Un site web ne peut pas programmer de notification locale récurrente : c'est le
serveur qui pousse. Deux Edge Functions s'en chargent.

1. **Générer une paire de clés VAPID** puis renseigner la clé publique dans
   `.env` (`VITE_VAPID_PUBLIC_KEY`) :

   ```bash
   npx web-push generate-vapid-keys
   ```

2. **Déployer les fonctions** et leurs secrets :

   ```bash
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... \
     VAPID_SUBJECT=mailto:toi@exemple.fr WEBHOOK_SECRET=$(openssl rand -hex 16)
   supabase functions deploy notify-partner
   supabase functions deploy daily-reminders
   ```

3. **`notify-partner`** : Database → Webhooks, un webhook sur `INSERT` dans
   `entries` qui appelle la fonction, avec l'en-tête `x-webhook-secret`. Le
   binôme est notifié dans **sa** langue quand l'autre poste.

4. **`daily-reminders`** : un cron toutes les 15 minutes (Integrations → Cron,
   ou `pg_cron` + `pg_net`) appelant la fonction. Elle demande à la base
   `due_reminders()`, qui sélectionne les personnes dont c'est l'heure choisie
   **chez elles** et dont la journée locale n'est pas déjà remplie. Personne
   n'est notifié pour une journée déjà faite.

Textes : « Quelle est la couleur de ta journée ? » / « ¿De qué color es tu día? »

> **iOS** : Safari n'autorise les notifications que si le site a été ajouté à
> l'écran d'accueil. L'app le signale dans les réglages plutôt que de laisser
> croire à une panne. Sur Android et sur ordinateur, rien à installer.

## Hors ligne

Le service worker met en cache l'application, et les entrées déjà chargées sont
conservées en `localStorage` : le calendrier reste consultable sans réseau. Une
journée validée hors ligne est mise en attente (les deux photos comprises) et part au
retour de la connexion — rien n'est envoyé à moitié.

## Déploiement

N'importe quel hébergeur de fichiers statiques convient (`npm run build` produit
`dist/`). Commande de build `npm run build`, dossier publié `dist`.

L'app utilise l'historique du navigateur : toutes les routes doivent retomber
sur `index.html`. C'est déjà configuré pour Netlify (`public/_redirects` et
`netlify.toml`) et pour Vercel (`vercel.json`) ; sur Cloudflare Pages ou un
nginx, reproduire la même règle.

Variables d'environnement à définir chez l'hébergeur : `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`, et `VITE_VAPID_PUBLIC_KEY` une fois les
notifications configurées. Elles sont lues **au moment du build** : après les
avoir modifiées, il faut relancer un déploiement, pas seulement recharger la
page.

Une fois l'adresse connue, la déclarer dans Supabase → Authentication → URL
Configuration, en **Site URL**. Sans ça, les liens envoyés par courriel
(confirmation, réinitialisation de mot de passe) pointeront vers localhost.

La caméra n'est accessible qu'en HTTPS : c'est le déploiement qui la rend
utilisable depuis un téléphone. Le service worker, lui, ne s'enregistre qu'en
production — en développement il servirait des fichiers périmés.

## Structure

```
src/
  components/   grilles, caméra, cases de calendrier, feuilles de confirmation
  lib/          émotions, dates et fuseaux, i18n, photos, push, cache, supabase
  locales/      fr.ts (fait foi) et es.ts (typé d'après lui)
  routes/       auth, liaison, aujourd'hui, calendriers, réglages
  state/        contextes langue, session/profil, entrées
scripts/        vérifications, génération des icônes
supabase/       migrations SQL et Edge Functions
```
