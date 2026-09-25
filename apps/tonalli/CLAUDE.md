# Tonalli — guide de reprise

Ce fichier est fait pour qu'une personne (ou un agent) qui n'a jamais vu le
projet puisse le reprendre sans archéologie. Le `README.md` s'adresse à qui veut
*utiliser* ou *installer* le projet ; celui-ci s'adresse à qui va le *modifier*.

---

## 1. Ce que c'est

*Tonalli* est un mot nahuatl : l'énergie vitale d'une personne, son essence — et
aussi le jour, la chaleur du soleil.

Deux personnes liées entre elles (un binôme, souvent à distance) enregistrent
chaque jour **une émotion, qui est une couleur, et deux photos prises sur le
moment** — la scène et le visage, au même appui. Chacun voit le calendrier de l'autre, mais seulement après avoir
rempli le sien, et peut y poser **un emoji d'une palette fermée** — la seule
chose qu'on puisse faire sur la journée de l'autre. C'est un rituel quotidien
partagé, pas un réseau social : pas de fil, pas de commentaires, pas de
découverte, pas de troisième personne.

Le projet a d'abord été une app mobile Expo (visible dans l'historique git sous
le nom « Nuancier »), puis a basculé en site web quand il est apparu qu'il ne
fallait rien avoir à installer. Le socle conceptuel — schéma, réciprocité,
fuseaux, i18n — a survécu au changement ; le code React Native, non.

**En production :** <https://teinte-du-jour-eight.vercel.app>
**Projet Supabase :** `iyaqtvcwvylabdjlmpxm`

---

## 2. Démarrer

```bash
npm install                 # Node >= 20.19 ou >= 22 (Vite 8 refuse en dessous)
cp .env.example .env        # l'URL Supabase y est déjà, il manque la clé anon
npm run dev                 # http://localhost:5173
```

La clé anon se récupère dans Supabase → Project Settings → API Keys. Format
récent : `sb_publishable_…`. Les clés héritées en `eyJ…` fonctionnent aussi.

| Commande | Effet |
| --- | --- |
| `npm run dev` | serveur de développement |
| `npm run build` | `tsc -b && vite build` — c'est le build de production |
| `npm run typecheck` | typage seul |
| `npm run checks` | vérifie les fonctions pures (dates, fuseaux, séries, émotions et nuances, réactions, vignette, encre et dévoilement, choix de l'objectif, logo) |
| `npm run icons` | régénère le favicon et les icônes PNG depuis `src/lib/logo.ts` |
| `npm run duo` | régénère les feuilles des scènes à deux depuis `scripts/duo/scenes/` |
| `npm run lint` | oxlint |

**La caméra exige HTTPS** — elle fonctionne sur `localhost`, sinon il faut un
déploiement. C'est une règle des navigateurs, pas un réglage de l'app.

---

## 3. Stack, et pourquoi

React 19 + TypeScript + Vite · React Router · i18n-js · Supabase (auth,
Postgres, Storage, Edge Functions) · Web Push.

Le choix de Supabase n'est pas un réflexe : le cœur de sécurité de l'app est que
**la photo du binôme ne doit pas être lisible tant que l'utilisateur n'a pas
rempli sa journée**. Avec Postgres et la RLS, cette règle est écrite en SQL et
s'applique même à quelqu'un qui bricole les requêtes depuis la console du
navigateur. Dans du code de page, elle serait contournable en trente secondes.

Pas de framework CSS : un fichier `src/styles/app.css` avec des variables. Le
châssis est volontairement incolore — du papier (`#FAF7F0`, la nuit
`#241A14`) et de l'encre (`#2A2019`) — pour que les seules couleurs de l'écran
soient les émotions et les photos. Trois règles en découlent :

- **Pas d'accent.** Un état d'interface (bouton principal, onglet actif,
  aujourd'hui dans le calendrier, choix, interrupteur, focus) se dit à
  l'encre. L'ancien accent terracotta tombait entre Gratitude et Fierté : un
  jour cerclé passait pour une journée remplie, et son texte blanc ne tenait
  pas le contraste.
- **Le gris le plus pâle ne descend jamais sous 4,5** de contraste sur le
  papier : c'est lui qui porte les plus petits textes (onglets, mentions).
- **L'erreur est voisine de Colère** : elle reste en texte, jamais en aplat,
  et toujours avec des mots qui la disent.

Polices : Shantell Sans pour les titres, écrite à la main comme le trait du
personnage, et Karla pour le texte courant. Les deux viennent de Google Fonts
et sont variables : un seul fichier par famille, toutes graisses comprises.

---

## 4. Carte du code

```
src/
  App.tsx              routes + gardes (auth, binôme obligatoire)
  main.tsx             montage React, service worker (production seulement)
  lib/
    dates.ts           TOUT le raisonnement calendaire et les fuseaux
    emotions.ts        les 12 émotions, les 3 crans, les 36 nuances + contraste
    reactions.ts       les 6 couples (clé, emoji) de l'action rapide
    streak.ts          les 6 symboles de la série (le calcul est dans dates.ts)
    inset.ts           géométrie de la vignette : bornes et collage aux coins
    ink.ts             l'encre : validation, dévoilement, et le geste de chaque émotion
    logo.ts            le soleil de Tonalli : une géométrie pour le composant, le favicon et les icônes
    character.ts       le personnage : une pose par émotion, les états sans couleur, les accessoires
    duo/               nos deux personnages dans la même scène : le livre (model.js),
                       la traduction depuis l'app (index.ts), les feuilles générées (scenes/)
    supabase.ts        client, et `isSupabaseConfigured`
    types.ts           Profile, Entry, EntryMap
    i18n.ts            i18n-js, détection de langue, langue mémorisée
    camera.ts          ouverture de l'objectif demandé, appareils récalcitrants compris
    photo.ts           capture caméra → JPEG 1200px q0.7, upload, URLs signées
    push.ts            service worker, abonnement Web Push, détection iOS
    cache.ts           cache localStorage par utilisateur
  state/
    I18nProvider       langue courante et `t()`
    AuthProvider       session, profil, binôme, liaison, suppression
    EntriesProvider    entrées, jour local, file d'attente hors ligne
    look.ts            mon personnage tel qu'il se montre aujourd'hui (teinte, tenue)
  routes/
    AuthScreens        accueil (le soleil qui passe par les douze émotions), connexion, inscription
    LinkPartner        code d'invitation, écran bloquant sans binôme
    TodayOverview      la page Aujourd'hui : nos deux personnages, une phrase, les portes vers les journées
    Today              la journée en détail : ma journée en trois temps (/day), la sienne sous sa couleur (/day/theirs)
    CalendarScreens    mois, mosaïque année, répartition — mien et du binôme
    Settings           binôme, langue, rappel, compte, données
    CharacterScreen    « Mon personnage » : la tenue, une rangée par catégorie
  components/          grilles, caméra, cellules, feuilles, réactions, états, bulle du personnage (Tip),
                       encre (InkCanvas, SaveBloom, InkReveal), logo, personnage, scène à deux
  locales/             fr.ts fait foi ; es.ts est typé d'après lui
supabase/
  migrations/          0001 → 0005, à jouer dans l'ordre
  functions/           deux Edge Functions autonomes (Deno)
scripts/
  checks.ts            vérifications des fonctions pures
  make-icons.ts        génère favicon, icônes et badge depuis logo.ts (rasteriseur et PNG sans dépendance)
  duo/                 la chorégraphie des scènes à deux : un livre par émotion (scenes/),
                       leur petit langage (lib.ts), et build.ts qui écrit les feuilles
```

**`src/locales/fr.ts` fait autorité** : son type est dérivé en `Translation`, et
`es.ts` doit le respecter exactement. Une clé oubliée en espagnol ne compile pas.

---

## 5. Les invariants — à ne pas casser

Ces règles sont le projet. Si une demande semble les contredire, il faut la
signaler avant de coder, pas la contourner.

### Le jour est une date locale, jamais convertie

1. Une clé de date se construit **toujours** avec `Intl` dans un fuseau
   explicite (`dateKeyInTimeZone`), **jamais** avec `toISOString()` — qui
   renvoie de l'UTC et décale la journée d'un cran le soir à Paris comme le
   matin à Mexico.
2. La date d'une entrée est celle de **son auteur**, et elle n'est pas
   reconvertie à l'affichage : le calendrier du binôme se lit à ses dates à lui.
   Au même instant, Paris peut être le 28 et Mexico le 27 — c'est correct.
3. Le fuseau vit dans `profiles.timezone` (IANA) et se resynchronise à chaque
   chargement du profil, donc un voyage suit la personne.

`npm run checks` teste explicitement le cas France/Mexique, dont le passage de
minuit. Toute modification de `src/lib/dates.ts` doit le laisser vert.

### La réciprocité est appliquée par la base

La policy de lecture de `entries` n'autorise une ligne du binôme que s'il existe
une ligne à moi **à la même date**. Conséquence assumée : un jour que je n'ai
pas rempli reste masqué **définitivement**, puisqu'on ne peut pas remplir le
passé. Pour afficher quand même une case hachurée, `partner_entry_dates()` ne
renvoie que des dates, sans aucun contenu.

### On corrige aujourd'hui, jamais le passé

Depuis `0005`, `entries` accepte l'UPDATE — mais uniquement à la date locale de
l'auteur, et le `with check` interdit de déplacer une entrée vers une autre
date. Un calendrier qu'on pourrait réécrire ne vaudrait plus rien comme
témoignage.

### La palette est fermée

12 émotions, **3 crans d'intensité**, donc 36 couples (émotion, couleur) —
figés, et vivant **en base** dans `emotion_shades`. `entries` a une clé
étrangère `(emotion, color) → emotion_shades (emotion, color)` : une couleur
qui ne correspond pas à son émotion ne peut littéralement pas être écrite. Les
libellés FR/ES restent dans les fichiers de traduction, pas en base.

La palette a grandi une fois, en ajoutant les crans ; la règle, elle, n'a pas
bougé. C'est la distinction à garder en tête si une demande semble la
contredire : ce qui est fermé, c'est l'ensemble des couples autorisés, pas
leur nombre.

**Le cran « franc » vaut exactement la couleur d'origine de l'émotion.** C'est
ce qui a permis d'ajouter les nuances sans toucher à une seule journée déjà
écrite : elles sont restées valides et sont devenues rétroactivement des
« franches ». Toute retouche future de la palette doit se poser la même
question — une couleur retirée invaliderait les entrées qui la portent, et la
clé étrangère refuserait de se valider.

**L'intensité n'est pas stockée.** Le couple (émotion, couleur) la détermine,
et `intensityOf()` la relit ; une colonne de plus serait une vérité en double.
C'est aussi pourquoi les 36 couleurs doivent rester distinctes — deux crans
qui rendraient le même code rendraient l'intensité impossible à relire.

Les nuances sont **calculées**, pas choisies à l'œil : mélange vers les encres
du châssis (crème à 0,40, brun-encre à 0,55), jamais vers du blanc ou du noir
purs, qui jureraient sur le papier. Les proportions ne sont pas arbitraires —
plus timides, les crans denses tombaient dans le creux de contraste, là où une
couleur ne tranche ni sur le crème ni sur le brun, et faisaient passer le
plancher de la palette sous les 4.3 garantis. À 0,55 il redevient celui de la
tristesse, c'est-à-dire celui d'avant les nuances.

`npm run checks` tient toute cette chaîne : franc = couleur d'origine, 36
couleurs distinctes, aller-retour couleur → cran exact, plancher de contraste,
et surtout **concordance avec les deux migrations** — une nuance retouchée
dans le code et pas en base serait refusée à l'écriture, sans que rien ne le
dise avant la production.

### Réagir ne donne rien de plus que voir

L'action rapide — un emoji posé sur la journée du binôme — n'ouvre aucune porte
nouvelle. La policy d'écriture de `reactions` exige que la ligne visée soit une
entrée **du binôme** et que `entries` me la laisse déjà lire ; la réciprocité
tient donc sans être réécrite, et une journée masquée le reste. Corollaire :
on ne réagit pas à sa propre journée, et la palette est fermée comme celle des
émotions — le couple (clé, emoji) vit en base derrière une clé étrangère.

Une seule réaction par personne et par journée : la clé primaire est
`(entry_id, author_id)`. Changer d'avis écrase, le même emoji deux fois retire.
Rien n'est conservé de l'historique — ce n'est pas un témoignage, c'est un
geste. Les emoji sont volontairement d'avant Emoji 11 (2018) : un caractère
trop récent s'affiche en carré vide sur un Android d'entrée de gamme, et une
réaction illisible n'est pas une réaction.

Côté écran, la réaction reçue tient dans une **pastille ronde**, à cheval sur
le bas de la photo — pas dans une phrase. Une ligne de texte à cet endroit
pèserait plus lourd que la réaction elle-même. L'appui ouvre l'emoji en grand,
avec le nom, et une pluie de bulles qui monte du bas de l'écran : la réaction
prend sa place quand on a décidé de la regarder, pas avant.

La fête **s'efface toute seule** au bout de `BURST_MS`. Ce n'est pas une boîte
de dialogue : rien à fermer, rien à décider, donc pas de `role="dialog"` qui
retiendrait le focus le temps de quatre secondes. Un appui l'écourte, mais
personne n'est obligé de s'en occuper.

Une seule durée pilote les deux côtés — l'animation par la variable `--burst`,
et le minuteur qui démonte l'écran — sinon la fête s'éteindrait avant la fin de
la pluie, ou traînerait après. Les bornes de `bubbles()` sont calées dessus :
la bulle la plus tardive finit pile à la fin, et `npm run checks` échoue si une
modification laisse une bulle coupée en vol ou un battement à vide.

Le champ de bulles est tiré **une seule fois** par ouverture, sinon les emoji
sauteraient d'un endroit à l'autre au premier nouveau rendu venu — et le
sondage des entrées en provoque un toutes les 60 s. Pour la même raison, le
`onClose` passé à la fête est une référence stable : sans ça, chaque rendu du
parent relancerait le compte à rebours, et l'écran ne s'effacerait jamais.

La pluie disparaît sous `prefers-reduced-motion` ; le message, lui, reste
entier, et le minuteur l'enlève au même moment.

### La série se recalcule, elle ne se stocke pas

Le nombre de jours d'affilée est obtenu en remontant les clés de date depuis
aujourd'hui (`streakOf`, dans `dates.ts` — c'est du raisonnement calendaire).
Une colonne « nombre de jours » serait une **vérité en double**, à réconcilier
à chaque correction de journée ; remonter quelques dizaines de clés ne coûte
rien.

**Une journée du jour pas encore remplie ne casse pas la série** : la journée
n'est pas finie, et remettre le compteur à zéro au réveil punirait quelqu'un
qui n'a encore rien fait de mal. On repart d'hier, et c'est le lendemain
seulement qu'un jour manquant compte comme une rupture. Le badge pâlit en
attendant, au lieu de disparaître. La journée validée hors ligne compte
aussi : de son point de vue elle est faite, c'est le réseau qui manque.

Le décalage d'un jour se fait **sur la clé**, à midi UTC (`shiftDay`), jamais
sur un instant réel : les nuits de changement d'heure durent 23 ou 25 heures,
et un pas posé sur une heure locale tomberait à côté. `npm run checks` teste
la nuit du 25 octobre, les passages de mois, d'année, et le 29 février.

Le **symbole** est cosmétique et personnel : la base ne stocke que sa clé,
derrière une simple contrainte `check` là où les réactions ont une clé
étrangère — rien d'autre ne le référence, et il ne traverse jamais le binôme.
`npm run checks` vérifie que la palette de `streak.ts` et la contrainte de
`0009` listent exactement les mêmes clés : un symbole ajouté d'un seul côté
serait refusé à l'écriture.

Rien ne s'affiche tant qu'il n'y a pas de série. Un « 0 » en haut de l'écran
ne serait pas une information, seulement un reproche — et le premier jour de
quelqu'un n'a pas à commencer par un reproche.

### Le personnage joue, il ne parle pas

Une goutte à la silhouette fixe, dessinée à l'encre et teinte de la journée
(`components/Character.tsx`, règles dans `lib/character.ts`). Elle prend la
pose de son émotion ; sans teinte, elle attend, incolore. Quatre règles :

- **La silhouette ne change jamais.** Les poses bougent les bras et le corps
  sur place, les accessoires se posent dessus ; la forme reste la même que
  celle du logo.
- **La Joie et la Colère n'ont pas de bras.** L'une rebondit, l'autre se
  gonfle : tout le corps fait le geste.
- **La Tristesse ne pleure jamais.** Elle se frotte l'œil. Une larme serait
  un symbole, et le personnage ne parle que par gestes.
- **Il est décoratif.** Le nom de l'émotion est toujours écrit à côté ; le
  personnage est muet pour les lecteurs d'écran, et s'immobilise sous
  `prefers-reduced-motion`.

Son trait suit `currentColor` : sur un bandeau teinté, il prend la couleur
lisible calculée pour ce bandeau (`readableTextOn`), l'encre sur les teintes
claires, le trait clair sur les foncées. `npm run checks` vérifie qu'il y a
une pose par émotion, les deux règles des bras, et que chaque mouvement
nommé dans `POSES` existe bien dans `app.css` — une faute de frappe le
laisserait figé sans rien dire.

**La tenue traverse le binôme, le symbole de la série non.** Un accessoire
au plus par catégorie (tête, corps, visage, motif, drapeau), dans une liste
fermée : cinq colonnes de `profiles`, chacune derrière une contrainte
`check`, et `null` pour rien. Le binôme voit la tenue de l'autre — son personnage paraît
dans « Sa journée » — et la policy de lecture de `profiles` le permettait
déjà. `npm run checks` compare la liste de chaque contrainte, dans `0001`,
`0011` et `0012`, à celle de `character.ts`.

**Le drapeau est la seule couleur qui n'est pas une émotion.** Un fanion sur
un mât planté derrière le personnage — France, Mexique, puis Espagne, Italie,
Brésil. À l'encre, la France et l'Italie seraient le même drapeau : il garde
ses vraies couleurs, et reste assez petit pour ne pas disputer la place à la
teinte du jour. Il a sa propre catégorie plutôt qu'une place dans « Tête »
pour se cumuler avec un chapeau, et c'est le seul accessoire qui reste quand
le personnage est couché : planté derrière lui, il ne touche pas son corps.
Un drapeau de plus s'ajoute dans `FLAGS` et `FLAG_PIECES`, et dans une
nouvelle migration pour la contrainte.

**La tenue vit au profil, pas dans la journée.** Changer de chapeau change
aussi l'apparence des jours passés : le personnage, c'est la personne
maintenant, pas un témoignage du jour. Rien n'est recopié dans `entries`.

Elle s'enregistre au toucher, comme le symbole de la série. Chaque vignette
montre la tenue entière avec l'accessoire à l'essai, et reste immobile :
vingt-six personnages animés à la fois coûteraient cher à un petit téléphone.

### Nos deux personnages jouent la même scène

Dans « Sa journée », mon personnage et celui du binôme partagent un décor et
une horloge — c'est ce qui permet à un ballon de passer vraiment de l'un à
l'autre. La scène vit **sous la nappe du dévoilement**, avec les photos,
parce qu'elle montre l'émotion du binôme : la réciprocité la couvre comme le
reste de sa journée.

**La page Aujourd'hui garde la surprise.** Elle montre nos deux personnages
côte à côte ; tant que sa journée n'est pas découverte, le sien porte sa
teinte mais se tient dans la pose neutre, immobile — sa couleur, pas encore
son geste — et sa carte invite à la découvrir. Ce n'est qu'une fois la
journée découverte (le souvenir `revealed` du cache, écrit par `TheirDay`)
que la page montre la scène à deux, avec la phrase qui la raconte
(`duo.scenes.*`, une par paire sans ordre, clé donnée par `sceneNoteKey`).
`npm run checks` vérifie que chaque paire a sa phrase, en français et en
espagnol, et la même dans les deux sens. Avant que j'aie rempli la mienne, la
page peut dire que la sienne est faite : `partner_entry_dates()` rend la date,
jamais le contenu. Moi à gauche, toujours ; chacun porte sa teinte et sa
tenue. Pour un lecteur d'écran, c'est une image dont le nom dit les deux
émotions (`duo.together` / `duo.apart`).

Douze émotions font 144 couples. **121 sont écrits** (11 × 11) : Neutre ne
joue avec personne, les deux se tiennent côte à côte, chacun dans son
émotion. Une scène s'écrit une fois par paire sans ordre — 66 scènes — et se
joue en miroir quand je suis l'autre moitié du couple.

Trois étages, et un seul se retouche à la main :

- `src/lib/duo/model.js` — **le livre** : qui se tient où, quelles pièces
  (bras, yeux, ballon, couronne…), quelle classe anime chacune. Repris tel
  quel du canevas de direction artistique, donc en JavaScript, typé par
  `model.d.ts`, avec les noms d'émotion du canevas ; `index.ts` traduit depuis
  les clés de l'app.
- `scripts/duo/scenes/*.ts` — **la chorégraphie** : les images clés de chaque
  classe. Un fichier par émotion, avec celles qui la suivent : `joie.ts`
  tient Joie + les onze, `serenite.ts` Sérénité + les dix suivantes… jusqu'à
  `colere.ts`, Colère + Colère. Une scène se retrouve par son titre
  (`——— Amour + Nostalgie`) ; son préfixe de deux lettres (`du-an-…`) est
  celui des classes du livre.
- `src/lib/duo/scenes/*.css` — **ce qui est servi**, écrit par `npm run duo` :
  une feuille par scène plus `base.css`, et `DuoScene` ne charge que celles
  du couple affiché. **Ne jamais les retoucher à la main** : `npm run checks`
  refuse une feuille qui ne correspond plus à ses livres.

Retoucher une scène : changer ses images clés dans son livre, `npm run duo`,
regarder le résultat dans le bac à sable (section 9). Une pièce nouvelle se
déclare d'abord dans `model.js` avec sa classe, puis s'anime dans le livre.

Les chiffres ne sont pas choisis à l'œil partout. Le ballon (`Ball`, dans
`lib.ts`) vole en paraboles à gravité constante, calculées pour qu'il
retombe pile sur une tête ou dans des bras à l'instant voulu ;
`npm run duo -- --report` imprime chaque vol. Les objets libres (cœurs,
montre, nuage) sont **échantillonnés** par `path` : on calcule la position à
chaque instant, le navigateur relie les points. Et chaque classe porte une
image fixe, prise au moment où la scène se lit le mieux, que
`prefers-reduced-motion` montre à la place du mouvement.

**La chorégraphie a d'abord été écrite en Python**, pendant la direction
artistique, puis traduite, et la traduction vérifiée **à l'octet près**
contre les feuilles d'origine. `scripts/duo/py.ts` garde les quelques calculs
où les deux langages ne tombent pas pareil : l'arrondi des égalités exactes
(Python arrondit 0,125 au pair, `toFixed` vers le haut), le modulo des
négatifs, le hasard de `random.seed(7)` qui place les confettis. Ne pas les
remplacer par leurs équivalents JavaScript : la moitié des feuilles
bougeraient d'un centième, et plus rien ne distinguerait ce qu'une retouche
déplace de ce que le calcul aurait déplacé.

Les livres ne sont pas typés — comme tout `scripts/`, ils restent hors de
`tsc`, qui ne vérifie que `src/` — mais `oxlint` les lit.

### Ma journée se remplit en trois temps

`MyDayScreen` (`/day`) suit la maquette : **l'émotion** (la grille et le cran),
**la photo** (le viseur, puis l'aperçu avec la note), et **la journée validée**.
La barre d'étapes en tête de la photo peint les étapes faites dans la teinte
choisie et l'étape en cours à l'encre — pas d'accent, même là. Le personnage
prend la pose dès qu'une émotion est touchée. Les conseils (`Tip`) sont une
bulle posée à côté d'un petit personnage : c'est l'interface qui parle, pas
lui — il reste muet pour les lecteurs d'écran, comme partout.

« Reprendre ma journée » ramène à la première étape avec le choix déjà fait
coché, et la photo gardée tant qu'on n'en reprend pas une autre :
c'est l'UPDATE du jour permis par `0005`, rien de plus. Le bouton est plein,
à l'encre : c'est la seule action de l'écran, il doit se voir.

### La photo se prend dans l'app, et elle est double

`getUserMedia` uniquement, jamais de sélection depuis la galerie — c'est ce qui
fait la valeur du geste. Compression à 1200 px / qualité 0.7 **avant** tout
envoi (≈300 Ko par photo).

**On ne demande jamais une taille sur les deux dimensions.** Contraindre
`width` *et* `height` revient à imposer un rapport, et le navigateur y arrive en
rognant le champ du capteur : l'image sort déjà zoomée. Un seul indice de
largeur (`SIZE_HINT`) demande de la définition sans rien dire de la forme. Le
cadrage en portrait 3/4 est fait une seule fois, à la prise, par `coverCrop` —
le même calcul que le `object-fit: cover` de l'aperçu, pour que la photo gardée
soit exactement celle qui était à l'écran, et que l'affichage n'ait plus rien à
rogner.

Un seul appui prend **deux** photos : la caméra cadrée (arrière par défaut, la
bascule reste possible) puis l'autre, dans la foulée. Pas simultanément :
aucun navigateur de téléphone ne garde deux flux vidéo actifs en même temps —
ouvrir le second coupe le premier sur iOS et sur la plupart des Android. La
cascade rapide est la seule façon d'avoir les deux images du même instant, et
c'est aussi ce que fait BeReal.

La seconde photo est **facultative** : un ordinateur portable n'a qu'une
caméra, et le second flux peut être refusé. `openCamera` écarte explicitement
l'objectif déjà utilisé — par `deviceId` et par `facingMode` — et rend une
erreur plutôt que deux fois la même image. Une journée à une seule photo reste
valide, sinon la contrainte punirait l'appareil plutôt que la personne.

**Quand la cascade échoue, la personne prend la relève.** Plutôt que de rendre
une journée à une seule photo sans rien demander, `Camera` garde la scène et
passe la main. En mode manuel, **les deux clichés se prennent avec la même
caméra** : celle qui a fait la scène, la seule dont on sait qu'elle marche. Une
tentative automatique ratée laisse justement l'autre objectif à l'écran — ou
plus rien du tout — donc on rouvre celui de la scène avant de rendre la main,
sinon on planterait la personne devant la caméra qui vient de la lâcher. La
bascule reste offerte, mais c'est elle qui la demande. Le même passage de relais
est accessible d'emblée (« Prendre les deux moi-même »). « Continuer sans le
visage » reste toujours là : l'invariant tient, la journée à une photo est
valide, mais elle devient un choix au lieu d'une fatalité.

Corollaire de code : le côté réellement à l'écran vit aussi dans une *ref*
(`shownRef`). Une fonction asynchrone qui lit l'état du rendu voit la caméra
d'avant la bascule, et déciderait de ne rien rouvrir.

**La vignette se déplace au doigt, et reste où on la laisse.** Le cadre BeReal
a un défaut inévitable : la petite photo cache un coin de la grande, et c'est
parfois là qu'il y a quelque chose à voir. On la fait donc glisser, et elle se
pose exactement là où le doigt s'arrête — **aucun rangement dans un angle**.
C'est la personne qui décide de ce qu'elle veut découvrir et de ce qu'elle
accepte de cacher ; la remettre d'autorité dans un coin reviendrait à défaire
son geste sous ses yeux.

La seule limite gardée est le cadre lui-même : une vignette à moitié sortie
ressemblerait à un bug, et lâchée hors de l'image elle serait perdue. Le calcul
est dans `src/lib/inset.ts`, vérifié par `npm run checks` ; la marge y vaut
`INSET_MARGIN` et doit rester égale au `--inset-margin` de la feuille de style,
sinon la place de départ et la limite du glissement ne parlent plus du même
bord.

La position est mémorisée **en fraction du cadre**, jamais en pixels : une
rotation d'écran change la taille de la photo, et des pixels d'hier n'y
voudraient plus rien dire. Un appui sec continue d'intervertir les deux photos,
sans déplacer la vignette : c'est le mouvement qui distingue les deux gestes,
au-delà de `DRAG_THRESHOLD`. Les flèches du clavier déplacent d'un pas
(`NUDGE`), un axe à la fois.

**Demander la caméra frontale ne suffit pas à l'obtenir.** `facingMode: 'user'`
n'est qu'un souhait : le navigateur note chaque objectif sur l'ensemble des
contraintes et peut très bien rendre l'arrière. C'est ce qui se passait sur un
Galaxy A03, où la bascule ne basculait rien. `src/lib/camera.ts` dégrade donc
les contraintes une à une — `deviceId` exact, puis côté exigé, puis côté
souhaité — et réessaie après une pause quand le pilote répond seulement « pas
encore ». L'aperçu suit ensuite l'objectif *réellement* obtenu, jamais celui
demandé : sans ça le miroir et la vignette mentent sur ce qui sera enregistré.

Budget de stockage : ≈600 Ko par jour et par personne, soit ~440 Mo par an
pour un binôme.

---

## 6. Base de données

### Tables

| Table | Rôle |
| --- | --- |
| `emotions` | les 12 émotions et leur couleur d'origine, figées |
| `emotion_shades` | les 36 couples (émotion, cran, couleur) — c'est **eux** que référence `entries` |
| `profiles` | nom, langue, **fuseau**, `partner_id` (unique), code d'invitation, jeton push, réglages de rappel, symbole de la série, tenue du personnage |
| `entries` | une ligne par personne et par jour : `unique (user_id, date)`, deux chemins de photo (`photo_path`, `selfie_path`) |
| `reaction_emojis` | les 6 couples (clé, emoji) de l'action rapide, figés, référencés par clé étrangère |
| `reactions` | un emoji posé sur la journée du binôme : clé primaire `(entry_id, author_id)` |

Bucket Storage **privé** `entries`, chemins `<user_id>/<YYYY-MM-DD>.jpg` pour la
scène et `<user_id>/<YYYY-MM-DD>-selfie.jpg` pour le visage, lus par URL signée
d'une heure. Les deux vivent dans le même dossier : les policies raisonnent sur
le premier segment du chemin, donc le propriétaire relit les siennes sans règle
supplémentaire, et le binôme reste soumis à la réciprocité.

### Fonctions

Toutes en `security definer`, ce qui est **nécessaire** et pas cosmétique : une
policy qui interroge sa propre table part en récursion infinie.

| Fonction | Rôle |
| --- | --- |
| `partner_of(uid)` | binôme d'une personne, sans repasser par la RLS de `profiles` |
| `has_own_entry(day)` | « ai-je rempli ce jour ? », pour la policy de `entries` |
| `local_today(uid)` | date du jour dans le fuseau de la personne |
| `generate_invite_code()` | 6 caractères, alphabet sans `O`/`0` ni `I`/`1` |
| `handle_new_user()` | trigger sur `auth.users` : crée le profil |
| `guard_profile_columns()` | interdit d'écrire `partner_id` / `invite_code` à la main |
| `link_partner(code)` / `unlink_partner()` | appariement 1-1 transactionnel |
| `partner_entry_dates()` | dates du binôme, sans contenu |
| `due_reminders(window)` | rappels dus, à l'heure locale de chacun — **service_role seulement** |

### Migrations

À jouer dans l'ordre, depuis le SQL Editor ou la CLI. Toutes sont idempotentes,
les rejouer ne casse rien.

| Fichier | Contenu |
| --- | --- |
| `0001_init.sql` | tout le schéma, corrigé au fil de l'eau : un nouveau projet n'a besoin que de lui |
| `0002_notifications.sql` | `due_reminders()` |
| `0003_fix_entries_recursion.sql` | correctif de récursion, pour un projet créé avant la révision de 0001 |
| `0004_storage_owner_access.sql` | droits d'écrasement et de relecture des photos |
| `0005_edit_today.sql` | correction de la journée du jour |
| `0006_dual_photos.sql` | colonne `selfie_path` et lecture de la seconde photo |
| `0007_reactions.sql` | `reaction_emojis`, `reactions` et leurs policies |
| `0008_reaction_webhook.sql` | le trigger qui notifie une réaction, calqué sur celui de la journée |
| `0009_streak_symbol.sql` | colonne `streak_symbol` et sa palette fermée |
| `0010_emotion_intensity.sql` | `emotion_shades` et la clé étrangère de `entries` qui s'y déplace |
| `0011_character_outfit.sql` | les quatre colonnes de la tenue du personnage et leurs listes fermées |
| `0012_character_flag.sql` | la colonne du drapeau et sa liste fermée |

Les migrations 0003 à 0007 et 0009 à 0012 sont des **rattrapages** : leur
contenu est déjà intégré à `0001`. Sur une base neuve, `0001` + `0002` suffisent.

`0008` est à part : elle ne crée pas de schéma mais le **trigger de
notification** des réactions, et elle ne peut pas vivre dans `0001` parce
qu'elle a besoin d'un webhook déjà en place pour s'y calquer. Elle échoue avec
un message clair si `notify_partner_of_entry` n'existe pas.

---

## 7. Notifications

Un site web ne peut pas programmer de rappel local récurrent : **c'est le
serveur qui pousse**. Deux Edge Functions, chacune dans un fichier autonome
(aucun import local) pour pouvoir être collée telle quelle dans l'éditeur du
tableau de bord Supabase — plus besoin de la CLI ni de Docker.

| Fonction | Déclencheur | Rôle |
| --- | --- | --- |
| `daily-reminders` | cron toutes les 15 min | rappel à l'heure locale, en sautant les journées remplies |
| `notify-partner` | **deux** Database Webhooks sur `INSERT` : `entries` et `reactions` | prévient l'autre, dans **sa** langue |

Le webhook des réactions se crée avec la migration `0008`, pas à la main. Elle
**relit l'URL et le secret dans le corps du trigger existant** (celui de
`entries`) et les réinjecte dans le nouveau : rien ne s'affiche, rien n'est
écrit dans le dépôt, et les deux webhooks parlent forcément à la même adresse
avec la même clé. Changer le secret un jour se réglera en rejouant `0008`.

Sur ce projet, le webhook de `entries` n'est pas un Database Webhook du tableau
de bord mais un trigger maison (`notify_partner_of_entry`) qui appelle
`net.http_post`. Le chercher dans l'écran Webhooks ne donne rien ; c'est dans
`pg_trigger` qu'il faut regarder.

`notify-partner` sert les deux événements parce que la mécanique est la même —
trouver le destinataire, son abonnement, sa langue. La dupliquer dans un second
fichier obligerait à corriger chaque piège VAPID deux fois. Elle route sur le
champ `table` du webhook, avec un repli sur la forme de la ligne.

Pour une réaction, le destinataire est **l'auteur de la journée visée**, trouvé
par `entry_id` — pas « le binôme de qui réagit ». C'est la même personne
aujourd'hui, mais passer par l'entrée dit exactement ce qu'on veut, et reste
juste même si la relation change entre la réaction et l'envoi.

**Sur `INSERT` seulement, et c'est un choix.** Changer d'avis sur une réaction
est un UPDATE (la clé primaire est `(entry_id, author_id)`), donc passer de ❤️
à 😂 ne repingue personne. Une réaction est un geste, pas une conversation à
notifier à chaque virage.

**Secrets** (Edge Functions → Secrets) : `VAPID_PUBLIC_KEY`,
`VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:…`), `WEBHOOK_SECRET`.
`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis automatiquement.

**Verify JWT doit être désactivé** sur les deux fonctions : elles sont appelées
par un cron et un webhook, pas par un utilisateur connecté. C'est le
`WEBHOOK_SECRET` qui fait office de serrure. `supabase/config.toml` le déclare
pour un déploiement par la CLI ; par le tableau de bord, c'est une case à
décocher dans les réglages de chaque fonction.

**Tester sans attendre l'heure** — `daily-reminders` accepte
`{"force_user_id":"<uuid>"}`, qui envoie le rappel à une personne précise sans
regarder l'heure ni sa journée :

```powershell
Invoke-RestMethod -Method Post -Uri "https://iyaqtvcwvylabdjlmpxm.supabase.co/functions/v1/daily-reminders" -Headers @{ "x-webhook-secret" = "SECRET" } -ContentType "application/json" -Body '{"force_user_id":"UUID"}'
```

`notify-partner` se teste de la même façon, en lui envoyant le corps qu'un
webhook enverrait — pas besoin d'écrire en base :

```powershell
Invoke-RestMethod -Method Post -Uri "https://iyaqtvcwvylabdjlmpxm.supabase.co/functions/v1/notify-partner" -Headers @{ "x-webhook-secret" = "SECRET" } -ContentType "application/json" -Body '{"type":"INSERT","table":"reactions","record":{"entry_id":"UUID-ENTREE","author_id":"UUID-AUTEUR","emoji":"❤️"}}'
```

La clé publique VAPID doit être **la même** dans les secrets Supabase et dans
`VITE_VAPID_PUBLIC_KEY` côté site : le navigateur s'abonne en la présentant, le
serveur signe avec la privée correspondante. Changer la paire invalide tous les
abonnements existants — il faut alors se réabonner (interrupteur off puis on).

---

## 8. Déploiement

Vercel, branche `main`, build `npm run build`, sortie `dist`. Les règles de
repli vers `index.html` sont dans `vercel.json`, `netlify.toml` et
`public/_redirects` : rien à configurer selon l'hébergeur.

Variables chez l'hébergeur : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
`VITE_VAPID_PUBLIC_KEY`. Elles sont lues **au moment du build** — après les
avoir modifiées il faut redéployer, recharger la page ne suffit pas.

### Le développement ne sort pas tout seul de sa branche

Le travail se fait sur une branche `claude/…`, jamais directement sur `main`.
Et **Vercel ne déploie que `main`** : tant que la branche n'y est pas fusionnée,
la fonctionnalité n'existe pour personne, migration jouée ou non. Le site
continue de servir la version d'avant, sans rien signaler — c'est une confusion
qui a déjà coûté un aller-retour (« j'ai fait la migration, j'ai rien »).

Donc : **à la fin de chaque développement, proposer la fusion**, sans attendre
qu'on la demande. Le merge se fait sans avance rapide (`git merge --no-ff`),
pour que l'historique garde chaque fonctionnalité comme un bloc lisible.

Pousser sur `main`, c'est mettre en production : ça demande un accord explicite
à chaque fois, jamais de sa propre initiative. En proposant, dire ce qui reste à
faire à la main pour que ça marche vraiment :

- les **migrations** à jouer dans le SQL Editor, s'il y en a de nouvelles ;
- les **variables d'hébergeur** à ajouter, s'il y en a — elles sont lues au
  build, donc il faut redéployer après les avoir changées ;
- le **rechargement forcé** si l'écran ne bouge pas (voir le service worker
  dans les pièges).

Pour trancher « est-ce que je regarde la dernière version ? » sans passer par
le tableau de bord de l'hébergeur : **tout en bas des réglages**, le commit et
la date du build. Il est calculé dans `vite.config.ts` (`define`), depuis
`VERCEL_GIT_COMMIT_SHA` / `COMMIT_REF` chez l'hébergeur et depuis `git` en
local, avec `dev` en repli. Comparer ce qui s'affiche à `git log -1 main`
répond en trois secondes à une question qui a déjà coûté deux allers-retours.

---

## 9. Vérifier son travail

Il n'y a pas de suite de tests classique. Trois filets, du moins cher au plus
cher :

**1. `npm run checks`** — fonctions pures, exécutées par Node avec
`--experimental-strip-types`. Conséquence à connaître : les modules testés
(`dates.ts`, `emotions.ts`, `reactions.ts`, `streak.ts`, `inset.ts`, `ink.ts`, `camera.ts`, `logo.ts`, `character.ts`) ne doivent contenir **aucun import**
vers un alias `@/`, que Node ne sait pas résoudre — ni toucher à `window`, qui
n'existe pas là-bas. Les garder sans dépendances. Les checks régénèrent
aussi les scènes à deux à blanc, et échouent si une feuille de
`src/lib/duo/scenes/` ne correspond plus à ses livres. Le choix de l'objectif s'y
vérifie contre un faux `navigator.mediaDevices` qui rejoue les manies d'un
Android d'entrée de gamme : `facingMode` exact refusé, souhait ignoré, caméra
encore occupée.

**2. `npm run build`** — typage et bundle.

Attention à ce qu'il prouve exactement. **Sans `.env`, le bundle ne contient
pas l'app** : `isSupabaseConfigured` se réduit à une constante fausse au build,
et tout ce qui est derrière le garde de `App.tsx` est éliminé comme code mort —
il ne reste que l'écran « variables manquantes ». Le filet reste valable pour ce
qu'on lui demande (le typage passe, le bundle se construit), mais un `dist`
produit sans `.env` ne dit rien de ce qui sera servi. Pour inspecter un vrai
bundle, mettre des valeurs, même bidon, dans `.env` avant de construire.

**3. Le bac à sable rendu** — la méthode qui a servi à valider chaque écran
sans backend :

1. copier le projet dans un dossier temporaire (`cp -r`, en gardant un lien
   symbolique vers `node_modules`) ;
2. y remplacer `src/lib/supabase.ts` par un faux client : un objet dont les
   méthodes chaînées (`from().select().eq()`…) renvoient un « thenable » avec des
   données inventées — un profil, un binôme, une quarantaine d'entrées ;
3. `npx vite build && npx vite preview --port 4175` ;
4. piloter avec `playwright-core` et le Chromium déjà présent
   (`/opt/pw-browsers/chromium`), capturer chaque écran en clair et en sombre,
   et **surveiller `pageerror` / `console.error`**.

C'est ce qui distingue « ça compile » de « ça tourne ». Le faux client n'est pas
versionné, volontairement : un mock qui pourrit est pire que pas de mock.

---

## 10. Pièges déjà rencontrés

Chacun a coûté du temps. Ils sont corrigés, mais la nature du piège reste.

**Récursion RLS.** Une policy qui interroge sa propre table échoue en `42P17`,
que PostgREST renvoie en **500 opaque**. Toute condition portant sur la table
protégée doit passer par une fonction `security definer`.

**Upsert Storage.** Envoyer une photo en mode `upsert` sur un fichier existant
est un `UPDATE` côté stockage : sans policy UPDATE, toute reprise après échec
est refusée par un **400** dont le corps dit `new row violates row-level
security policy`. Le code HTTP seul ne suffit jamais à diagnostiquer : lire le
corps de la réponse (onglet Network → Response).

**Lecture de sa propre photo.** La première version n'autorisait la lecture d'un
objet que si une ligne `entries` le référençait. Or la photo part **avant**
l'insertion de la ligne : on ne pouvait pas relire son propre fichier dans
l'intervalle. Le propriétaire a maintenant accès à son dossier par le préfixe du
chemin ; le binôme reste soumis à la réciprocité.

**Secrets collés avec leur nom.** Un copier-coller trop large met
`VAPID_SUBJECT=mailto:…` dans la *valeur*. Les fonctions nettoient désormais ce
préfixe et les espaces, mais le réflexe reste de vérifier. Et **modifier un
secret ne suffit pas** : une fonction déjà démarrée garde ses anciennes
variables, il faut la redéployer pour forcer un démarrage à froid.

**Initialisation au chargement du module.** `setVapidDetails` au niveau du
module transformait une clé mal formée en fonction qui refuse de démarrer, donc
en 500 sans message. Tout ce qui peut échouer sur une variable d'environnement
doit être appelé *dans* le gestionnaire, avec un message clair.

**Une contrainte de résolution est aussi une contrainte de cadrage.** Demander
`1440 × 1920`, ce n'est pas demander « de la définition » : c'est exiger un
rapport 3/4, que le navigateur obtient en rognant ce que voit le capteur. Sur un
petit module frontal, qui n'offre souvent qu'un mode 16/9, la perte est
spectaculaire — l'aperçu paraît zoomé sans qu'aucun zoom n'ait été demandé.
Contraindre une seule dimension, et cadrer soi-même à la prise.

**« Prête » ne veut pas dire « il y a une image ».** Un flux branché et joué
répond `readyState` avant d'avoir produit la moindre image : `videoWidth` vaut
alors 0 et la capture lève `video_not_ready`. Un appui rapide après une
réouverture de caméra tombait ainsi dans le vide, sans message. Toute capture
attend donc une vraie image quand l'aperçu vient de rouvrir.

**Un objectif qui s'ouvre sans jamais filmer fige l'app.** `await video.play()`
ne se résout **jamais** sur un flux qui ne produit aucune image — et c'est
exactement ce que fait une caméra frontale en panne : `getUserMedia` réussit, le
flux existe, il ne sort rien. L'app restait sur « Prise en cours… » pour
toujours. On ne l'attend donc plus (`void video.play()`) : ce qu'on attend,
c'est une image, et `waitForFrame` a une limite. Et avant de capturer, on exige
`readyState >= HAVE_CURRENT_DATA`, sinon la « photo » ne serait qu'un rectangle
noir — un cliché noir enregistré est pire qu'un cliché manquant, qui lui ouvre
le repli manuel.

**`facingMode` n'est qu'une préférence.** Sans `exact`, le navigateur choisit
la caméra qui satisfait le mieux *toutes* les contraintes : une résolution
demandée qui colle mieux au capteur arrière suffit à ce que « frontale » rende
l'arrière, sans la moindre erreur. Et les petits capteurs frontaux (640×480 sur
un Galaxy A03) perdent ce calcul dès qu'on exprime une taille. Le seul choix
fiable est le `deviceId`, lisible via `enumerateDevices()` — mais les libellés
n'apparaissent qu'après une première autorisation, ce qui va bien : c'est la
*seconde* ouverture qui en a besoin.

**Une caméra n'est pas relâchée à l'instant où on la coupe.** Sur Android
d'entrée de gamme, ouvrir le second objectif dans la foulée du premier échoue
en `NotReadableError` — le matériel dit « pas encore », pas « impossible ».
D'où la pause avant l'ouverture et les reprises espacées. Un `NotReadableError`
traité comme une absence de caméra fait perdre la moitié du rituel.

**Une image est nativement déplaçable.** Un `<img>` dans un élément qu'on veut
faire glisser soi-même est un piège silencieux : au premier mouvement, le
navigateur démarre son propre glisser-déposer et coupe le geste par un
`pointercancel`. La vignette ne bougeait pas d'un pixel, sans la moindre erreur
en console. Il faut `preventDefault()` sur `dragstart` (et `-webkit-user-drag:
none` en renfort) — `touch-action: none` ne traite que le cas du défilement,
pas celui-là.

**Un bundle sans `.env` ne contient pas l'app.** `isSupabaseConfigured` vient
de `import.meta.env`, que Vite remplace en dur au build. Sans les variables, il
devient `false` à la compilation et le bundle ne garde que l'écran « variables
manquantes » — le reste part au tree-shaking. Le build reste vert, le fichier
fait toujours quelques centaines de kilo-octets (React et Supabase y sont), et
chercher une classe CSS dedans ne rend rien. De quoi conclure à tort qu'une
modification n'a pas été prise.

**Une règle `parent > *` écrase le `position: fixed` d'un enfant direct.**
L'ancien écran « Aujourd'hui » posait `position: relative` sur tous ses
enfants pour les faire passer au-dessus d'un lavis de couleur. Un plein écran
ajouté comme enfant direct en héritait — même spécificité, la règle écrite
plus bas gagne — et retombait dans le flux : l'épanouissement de la couleur
s'affichait en croissant sur le bord droit. Le lavis est parti avec le
passage aux étapes, mais le piège reste : une superposition plein écran ne
doit jamais être la cible d'une règle générique de son parent.

**La position d'un bouton ne se relève plus après qu'il a disparu.**
L'encre de validation part du bouton « Valider ma journée » — mais ce bouton
appartient au composeur, qui est démonté à la seconde où la journée est
enregistrée. Le point de départ se relève donc **au moment de l'appui**, dans
le gestionnaire de clic, pas après. Même famille de piège que la *ref* de la
caméra : ce qui est à l'écran maintenant ne l'est plus quand la suite
s'exécute.

Corollaire : cette animation est pilotée en JavaScript et non en CSS, parce
que sa géométrie n'est connue qu'au rendu — la position du bouton dépend de la
longueur de la note. Chaque étape porte sa propre courbe : une seule courbe
appliquée à l'ensemble écrasait les dernières.

**Une encre, ce n'est pas un disque qui grossit.** La première version faisait
grandir un cercle parfait puis le repliait dans le bandeau : propre, mais
géométrique. C'est maintenant un petit récit en quatre temps : une goutte
d'encre tombe du bouton et couvre l'écran ; « Aujourd'hui porte ta teinte. »
s'y lève ; une goutte d'eau tombe du haut de l'écran, s'écrase sur la phrase
— qui se dissout — et fait deux ronds dans l'eau ; l'eau claire repousse
enfin l'encre vers les bords jusqu'à rendre l'app. L'encre et l'eau claire
sont **la même diffusion** (`diffusion()` dans `src/lib/ink.ts`) : un cœur,
quatre panaches accrochés à son front, un voile dilué devant. Seul change ce
qui se diffuse — l'encre elle-même, puis un trou dans l'encre. La goutte
d'eau et les ronds sont des trous eux aussi : on voit l'app à travers.

Le rendu est un SVG plein écran et deux filtres qui partagent la même chaîne,
`feTurbulence` → `feDisplacementMap` → flou → seuil sur l'alpha. Le
déplacement fait onduler le bord ; le flou et le seuil fondent les taches en
une seule et lissent le contour poilu que le déplacement laisse seul. Le
second filtre retourne le résultat : une nappe de couleur (`feFlood`) moins
les taches (`feComposite out`). Les mêmes rectangles servent aux deux temps ;
on change de filtre quand l'écran est plein, seul moment où le raccord ne
peut pas se voir.

Trois choses à savoir avant d'y toucher :

- **L'écran doit être couvert à la bascule.** Entre `PHASES.full` et
  `PHASES.fall`, l'encre couvre tout, turbulence comprise, et à `fall` rien
  n'est encore ouvert : l'eau claire n'a pas commencé et la goutte est
  au-dessus de l'écran. À la fin, le trou couvre tout à son
  tour : il ne reste pas un coin d'encre quand le composant se démonte.
  `npm run checks` vérifie les trois.
- **Le message ne se lit que sur la couleur.** « Aujourd'hui porte ta
  teinte. » (`today.sealed`) se lève quand l'écran est couvert, se dissout
  quand la goutte d'eau le touche, et a disparu quand la goutte écrasée s'est
  arrondie — avant que le trou ne grandisse sous lui. Posé sur le papier, il serait illisible
  dans sa propre teinte. Sa courbe (opacité, flou, montée) est calculée dans
  `inkFrame`, sur la même horloge que l'encre, et `npm run checks` vérifie
  qu'il ne paraît jamais sur un écran découvert et qu'il tient assez
  longtemps pour être lu.
- **Les ronds dans l'eau ne descendent pas sous un tiers d'opacité.** Le
  seuil du filtre (`3a − 1`) efface tout ce qui passe en dessous : un rond
  qui s'éteindrait jusqu'à zéro disparaîtrait d'un coup à mi-course.
- **Un groupe sans rien à peindre peut voir son filtre sauté.** Quand l'eau
  claire tombe, ses taches ont une taille nulle ; sans l'ancre transparente
  hors champ, la nappe de couleur disparaîtrait le temps d'une frame.
- **`requestAnimationFrame`, pas Web Animations.** Les attributs d'un filtre
  SVG ne s'animent pas autrement, et la forme comme la turbulence doivent lire
  la même horloge. Les écritures vont droit dans le DOM, sans rendu React par
  frame. Pour capturer l'animation image par image dans le bac à sable, figer
  l'horloge (`page.clock.install()` puis `pauseAt`) : sans ça, le temps
  continue de courir pendant les captures.

**La journée de l'autre se découvre, elle ne s'affiche pas.** La première
fois qu'on passe sur la journée du binôme, elle arrive sous sa couleur :
« Découvre la journée de Léa en couleur ». Au toucher, la même goutte d'eau
que celle de la validation tombe là où le doigt s'est posé, et l'eau claire
découvre ses photos ; sa couleur reste dans le bandeau de sa journée, qui
était sous la nappe. C'est le miroir de la validation — sa journée, on la
pose ; celle de l'autre, on la découvre — et c'est **au toucher**, jamais
d'office, pour la même raison que la réaction en grand : elle prend sa place
quand on a décidé de la regarder. Plus courte que la validation (`REVEAL_MS`)
et limitée à la carte : le plein écran reste réservé à son propre geste.

Trois choses à savoir :

- **Ce n'est pas une serrure.** La réciprocité est tenue par la RLS : quand
  la carte couverte s'affiche, la base a déjà accepté de rendre la journée.
  La couverture est une mise en scène, pas une protection — ne jamais y
  cacher quelque chose que la base ne devrait pas rendre.
- **Une fois par journée, retenue sur l'appareil.** L'identifiant de la
  journée découverte va dans le cache local (`revealed`, quatorze au plus),
  au toucher et non à la fin : quitter le panneau pendant le trajet ne
  rejoue pas la cérémonie. Une correction de sa journée garde le même
  identifiant, donc ne la rejoue pas non plus. La base n'a rien à en savoir.
- **Couverte, la carte est `inert`.** Tant qu'elle est sous la nappe, ses
  réactions ne répondent ni au doigt ni au clavier, et un lecteur d'écran
  n'y lit que l'invitation, qui est le nom du bouton. Au clavier, la goutte
  tombe au centre. Sous `prefers-reduced-motion`, la couleur s'efface en
  fondu.

La matière est commune : `InkCanvas` dessine l'encre et l'eau claire pour les
deux, et `waterDrop()` dans `ink.ts` calcule la goutte, les ronds et l'eau
claire pour les deux. Les identifiants de filtres sont préfixés par
composant : la validation peut encore se jouer quand on glisse vers la
journée de l'autre, et deux filtres homonymes se voleraient leurs réglages.

**Une émotion, un geste — jamais un dessin.** Certaines émotions touchent
l'eau à leur façon, à la validation comme au dévoilement (`gestureOf` dans
`ink.ts`) :

- **Amour** (`pair`) : deux gouttes perlent de part et d'autre du bouton,
  s'attirent et se fondent en une seule ; côté eau, deux gouttes tombent
  ensemble et leurs ronds se croisent. Deux personnes, un rituel.
- **Joie** (`bounce`) : une gouttelette rebondit, remonte et retombe, et la
  couleur n'éclot qu'à la seconde touche ; un rond à chaque touche.
- les autres : la goutte simple.

La règle qui a tranché, et qui doit trancher les suivants : **tout ce que
fait l'encre doit pouvoir arriver à de la vraie encre dans l'eau.** Une Joie
en soleil a été essayée et écartée : figée, elle se lisait comme un dessin,
et un dessin fait tomber la matière. Pas de cœur, pas de larme, pas de
soleil — les symboles, l'app les a déjà, ce sont les emoji des réactions.
Un premier essai en ne modulant que la vitesse et l'agitation de l'encre par
émotion a aussi été écarté : trop peu lisible. C'est un **geste** propre qui
se remarque.

Un geste change le début — ce qui précède la diffusion — mais jamais la
durée ni le récit : l'écran est couvert quand le message se lève, rien n'est
ouvert à la bascule, tout est découvert à la fin. `npm run checks` le vérifie
pour chaque geste. Le nombre de taches est fixe (`BLOB_SLOTS`) : les gouttes
du geste ont deux places réservées après les panaches, vides quand le geste
n'en a pas besoin.

**Service worker en développement.** Il servait des fichiers périmés sous Vite
et cassait le rechargement à chaud. Il n'est enregistré qu'en production, et
celui d'une session précédente est désinscrit au démarrage.

**Service worker après un déploiement.** En production il fait son travail :
il sert l'app depuis le cache. Un simple retour sur l'onglet peut donc montrer
la version d'avant alors que le déploiement est passé. Fermer complètement
l'onglet (ou l'icône de l'écran d'accueil) et rouvrir, ou forcer le
rechargement. Avant de conclure qu'un déploiement a échoué, vérifier ça.

**Une icône qui change reste en cache.** Le service worker sert en cache
d'abord tout ce qui n'est pas une navigation — y compris le favicon et les
icônes, dont le nom ne change pas d'une version à l'autre (seuls le JS et le
CSS de Vite sont versionnés). Sans rien faire, un appareil qui a déjà ouvert
le site garde l'ancienne icône pour toujours. Quand une ressource non
versionnée change, changer le nom du cache (`CACHE` dans `public/sw.js`) :
l'activation efface les anciens. Et ça ne suffit pas pour l'écran d'accueil :
iOS fige l'icône au moment de l'ajout (il faut retirer le site et l'ajouter
de nouveau), Android la met à jour de lui-même, avec un jour ou plus de
retard.

**Le logo n'a qu'une source.** `src/lib/logo.ts` donne la géométrie du
soleil ; le composant `Logo` la dessine, `npm run icons` en tire le favicon et
les PNG. Retoucher un fichier de `public/` à la main le désynchronise, et
`npm run checks` le refuse pour le favicon. Les rayons suivent l'ordre de
`EMOTIONS` : une émotion ajoutée ou déplacée là change le logo, et c'est voulu.
Le grand soleil de l'écran d'accueil (`WelcomeSun`) tire ses rayons du même
`sunRays()` : il allume celui de l'émotion que joue le personnage, et laisse
les onze autres pâles plutôt qu'absents. Il revient en petit au-dessus des
deux formulaires, et **tous les soleils lisent la même horloge**, partie au
chargement de la page : de l'accueil au formulaire, le personnage poursuit
son tour au lieu de repartir de Joie. Deux personnages au plus y sont
montés, celui qui entre et celui qui sort ; sous `prefers-reduced-motion`,
Joie reste seule, rayon allumé.

**Confirmation d'e-mail.** Laisser « Confirm email » activé avec le serveur
d'envoi intégré de Supabase donne un `email rate limit exceeded` au bout de
deux ou trois inscriptions. Le désactiver pour les tests ; pour la production,
brancher un vrai SMTP.

**iOS.** Safari n'autorise le push que si le site a été **ajouté à l'écran
d'accueil et ouvert depuis l'icône**. Dans un onglet, l'interrupteur reste
grisé, et c'est normal.

**Navigateurs intégrés.** Un lien ouvert depuis Instagram ou WhatsApp arrive
dans leur navigateur maison, qui ne gère pas les notifications. La notice
d'installation le dit explicitement.

---

## 11. Ce qui reste à faire

Par ordre d'importance :

- **Suppression réelle du compte.** Les entrées, photos et caches sont
  supprimés, mais pas la ligne `auth.users` : cela demande l'API admin, donc une
  Edge Function dédiée.
- **Push multi-appareils.** `profiles.push_token` ne stocke **qu'un**
  abonnement : se connecter sur un second appareil écrase le premier. Il faudrait
  une table `push_subscriptions` liée au profil.
- **Fenêtre de rappel.** `due_reminders` compare `minute between reminder_minute
  and reminder_minute + 15`, ce qui ne déborde pas d'une heure : une valeur comme
  21:50 ne déclencherait jamais. Les pas de 30 min de l'interface l'évitent, mais
  le calcul devrait se faire en minutes depuis minuit.
- **Modifier son prénom** après l'inscription : aucun écran ne le permet.
- **Réaction hors ligne.** La file d'attente ne porte que la journée du jour :
  sans réseau, les boutons de réaction sont désactivés plutôt que de promettre
  un envoi différé.
- **Dévoilement en direct.** L'entrée du binôme arrive par sondage toutes les
  60 s ; le Realtime de Supabase le rendrait instantané.
- **File d'attente hors ligne.** Une seule journée en attente, les deux photos
  stockées en data URL dans `localStorage` (quota ~5 Mo, et une paire pèse
  ~800 Ko en base64). Passer à IndexedDB si ça coince.
- **Limitation d'essais sur le code d'invitation** : rien n'empêche d'en tester
  en boucle. Le risque est faible (~10⁹ combinaisons) mais un compteur serait
  plus propre.
- **Tests d'intégration de la RLS** : un jeu de requêtes SQL vérifiant qu'un
  tiers ne lit rien serait le test le plus utile du projet.

---

## 12. Conventions

- **Le code et les commentaires sont en français.** Les commentaires expliquent
  *pourquoi*, pas *quoi* — en particulier sur les fuseaux et la RLS, où le code
  seul ne dit pas ce qu'il évite.
- Messages de commit en français, impératif, avec un corps qui explique la
  raison quand elle n'est pas évidente.
- Pas de dépendance ajoutée sans nécessité : le projet en a cinq.
- `verbatimModuleSyntax` est actif : les imports de types s'écrivent
  `import type`.
- Toute modification touchant aux dates, à la RLS ou aux policies Storage se
  vérifie avec les trois filets de la section 9 avant d'être poussée.
- Un développement se termine par une **proposition de fusion dans `main`**
  (section 8) : sans elle, le travail reste invisible dans l'app.
