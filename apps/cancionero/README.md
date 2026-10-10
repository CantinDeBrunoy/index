# 🎶 Cancionero — apprendre l'espagnol en chanson

App mobile (iOS / Android / Web) pour **travailler une chanson** afin d'apprendre
l'espagnol. On choisit une chanson dans la liste, puis on l'étudie sous 3 angles :

- **📖 Paroles + traduction** — paroles espagnoles avec la traduction française
  alignée ligne par ligne. Touche 🔊 pour **écouter** chaque ligne (synthèse vocale),
  et touche un mot pour le surligner : il part dans le vocabulaire à réviser.
- **🎤 Karaoké** — plein écran : la ligne chantée grossit et se remplit au rythme
  de la chanson, avec sa traduction. Pour l'instant visuel, sans le son. Un mot
  touché part aussi dans le vocabulaire.
- **🃏 Vocabulaire** — les mots touchés deviennent des cartes ES → FR, à retourner
  puis à glisser : « Je le connais » retire le mot, « À revoir » le remet sous la pile.

L'app est livrée avec **3 chansons originales** (salutations, famille, marché) écrites
pour l'apprentissage. Tu peux **ajouter tes propres chansons** : cherche-les dans
LRCLIB ou colle les paroles espagnoles (+ la traduction si tu veux). Les paroles, le
karaoké et le vocabulaire marchent aussitôt dessus, et les traductions qui manquent
arrivent à la demande.

> Stack : Expo SDK 54 · React Native 0.81 · React 19 · TypeScript · expo-router.
> Local-first : tes chansons et ton vocabulaire sont stockés sur l'appareil (AsyncStorage).
> Seules la recherche de paroles (LRCLIB) et la traduction à la demande (MyMemory)
> passent par Internet.

---

## 📲 L'installer sur ton téléphone (version web, rien à installer)

La version web est hébergée sur Cloudflare Workers (https://cancionero.cantin-roquier.workers.dev) et s'installe comme une app (PWA) :

- **iPhone** : ouvre le site dans **Safari** → bouton **Partager** → **Sur l'écran
  d'accueil**. L'app s'ouvre ensuite en plein écran, avec son icône.
- **Android** : ouvre le site dans **Chrome** → menu ⋮ → **Installer l'application**.

Une fois ouverte une première fois, elle marche **hors ligne** (sauf la recherche
de paroles et la traduction automatique, qui passent par Internet).

> ⚠️ Sur iPhone, l'app de l'écran d'accueil et Safari ne partagent pas leur stockage :
> les chansons ajoutées dans l'un n'apparaissent pas dans l'autre. Installe l'app
> d'abord, puis ajoute tes chansons depuis l'icône.

## 🚀 Déploiement (Cloudflare Workers)

`deploy-cancionero.yml` déploie à chaque push sur **`main`** qui touche l'app : build
`expo export -p web`, puis `wrangler deploy` du dossier `dist` (voir `wrangler.jsonc`).

Une chanson (`/song/<id>`) reçoit sa page pré-rendue, `song/[id].html`, grâce au petit
Worker de `worker/index.js`, le seul code qui tourne côté serveur ; toute autre adresse
qui n'est pas un fichier renvoie vers l'accueil, et expo-router affiche la bonne page.
Le HTML servi doit être celui de la page affichée : sinon React ne peut pas l'hydrater
(erreur #418) et refait tout l'écran.

Tester le build de production en local, avec le vrai routage :
```bash
pnpm --filter cancionero build
```
```bash
pnpm --filter cancionero exec wrangler dev
```

**Pièges du service worker** (`public/sw.js`, enregistré en production seulement) :

- **Après un déploiement**, l'écran peut montrer l'ancienne version : le service
  worker sert l'app depuis le cache. Fermer complètement l'app (ou l'onglet) et la
  rouvrir. Vérifier ça avant de conclure qu'un déploiement a échoué.
- **Une icône qui change reste en cache.** Toutes les icônes (web, iOS, Android,
  splash, favicon) sortent d'un seul dessin, dans `scripts/make-icons.mjs` :
  le modifier, lancer `npm run icons`, puis incrémenter **en même temps** le `?v=`
  des icônes (`src/app/+html.tsx` et `public/manifest.webmanifest`) et le nom
  `CACHE` de `public/sw.js`. Sur iPhone, l'icône est figée à l'ajout : il faut
  retirer l'app de l'écran d'accueil et l'ajouter de nouveau.

---

## ▶️ Lancer l'app sur ton iPhone en développement (via Expo Go)

1. Sur ton iPhone, installe **Expo Go** depuis l'App Store.
2. Sur l'ordinateur, dans ce dossier, lance le serveur de développement :
   ```bash
   npx expo start
   ```
3. Un **QR code** s'affiche dans le terminal. Assure-toi que l'iPhone et l'ordinateur
   sont sur le **même réseau Wi-Fi**.
4. Ouvre l'app **Appareil photo** de l'iPhone, vise le QR code, puis touche la
   notification qui apparaît → l'app s'ouvre dans Expo Go. 🎉

**Si le QR ne se connecte pas** (Wi-Fi d'entreprise, pare-feu, réseaux différents),
utilise le mode tunnel :
```bash
npx expo start --tunnel
```

> ℹ️ Avec Expo Go, l'app tourne dans le conteneur Expo Go (pas d'icône dédiée sur
> l'écran d'accueil). Pour une vraie app installée (icône + App Store), il faut un
> compte développeur Apple et un build EAS — voir la doc Expo « EAS Build ».

### Autres cibles

```bash
npx expo start --web        # ouvrir dans le navigateur
npx expo start --android    # émulateur / appareil Android
```

---

## 🎨 Design « Papel »

- **Couleurs, polices, durées** : tout est dans `src/constants/theme.ts`. Fond crème,
  encre brune, un seul accent rosa mexicano, et **une couleur par chanson**
  (`SongPalette` ; `features/songs/palette.ts` la choisit) : claire pour la vignette,
  foncée pour l'en-tête, le karaoké et les cartes de révision.
- **Polices** : Fraunces (titres, paroles) et Figtree (interface), chargées dans
  `src/app/_layout.tsx`. Avec une police chargée, la graisse est dans le nom de
  famille (`Fonts.bold`…) : ne pas ajouter `fontWeight`.
- **Icônes** : `components/icon.tsx` (tracés Lucide). Les emojis ne servent qu'à
  illustrer les chansons.
- **Animations** : Reanimated. La guirlande de drapeaux (`components/decor/`) tire
  au hasard, à chaque lancement, des pays hispanophones d'Amérique latine. Tout
  respecte le réglage « Réduire les animations » du téléphone.

## 🗂️ Structure

```
src/
  app/                      # écrans (expo-router, file-based routing)
    index.tsx               #   accueil : guirlande, chansons, vocabulaire à réviser
    song/[id].tsx           #   une chanson : paroles touchables + traduction
    karaoke.tsx             #   karaoké plein écran
    practice.tsx            #   révision du vocabulaire en cartes
    add.tsx                 #   ajouter une chanson (recherche LRCLIB ou collage)
    _layout.tsx             #   polices, providers, Stack
  components/
    decor/                  #   drapeaux, guirlande, confettis, bord festonné
    song/                   #   ligne touchable, bouton « écouter », niveau
    icon.tsx, primary-button.tsx, pressable-scale.tsx, switch.tsx…
  data/songs.ts             # chansons fournies (contenu original)
  features/
    songs/                  # modèle, store, stockage, LRCLIB, couleurs
    vocab/troublesome.tsx   # vocabulaire à réviser
    ui/                     # messages (toast), vibrations, lecture à voix haute
```

## 🧭 Idées pour la suite

- Vocabulaire / quiz **auto-générés** pour les chansons ajoutées par l'utilisateur.
- Suivi de progression (chansons travaillées, scores).
- Mode « écoute en boucle » d'une ligne pour la prononciation.
