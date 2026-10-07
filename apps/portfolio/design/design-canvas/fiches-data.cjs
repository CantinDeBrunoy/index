// Les textes des fiches projet : des BROUILLONS écrits d'après la doc de chaque projet (README, CLAUDE.md,
// projects.ts), à réécrire. Les archives n'ont pas de doc dans le monorepo : leurs textes restent au plus près
// de leur accroche.
// why : « Pourquoi je l'ai fabriqué » ; features : [titre, phrase] × 3 ; choices : [choix, raison] ;
// stack et host : d'après packages/projects/src/projects.ts ; capture : une vraie capture, sans donnée perso
// (celles de gym-picker et de Hublot montrent des lieux et des voyages réels : écartées) ;
// h : hauteur de l'artboard, mesurée sur le rendu (measure-fiches.mjs).
module.exports = {
  "Galaxy Escape": {
    h: 2230,
    why: "Je voulais comprendre ce qu'il faut pour faire tourner un jeu en 3D dans un simple onglet. Galaxy Escape, un runner inspiré de Temple Run, a été mon terrain d'essai : une course sans fin, un monde qui s'invente devant le vaisseau.",
    features: [
      ["Une course sans fin", "On avance toujours plus vite, et il faut esquiver ce qui arrive en face."],
      ["Des niveaux générés", "Le parcours se construit au fil de la partie : jamais deux fois le même."],
      ["Dans le navigateur", "On joue tout de suite, sans rien installer."],
    ],
    choices: [
      ["Three.js plutôt qu'un moteur de jeu", "Apprendre la 3D par ses bases, et rester sur le web."],
      ["La génération procédurale", "Des niveaux infinis, sans les dessiner un par un."],
    ],
    stack: ["Three.js", "WebGL", "JavaScript"],
    host: null,
    capture: null,
  },
  Magellan: {
    h: 3170,
    why: "Je voulais ouvrir une app et voir ma propre carte du monde : un globe qui se colore au fil des pays traversés. Et que ces souvenirs restent sur mon téléphone, sans compte ni serveur.",
    features: [
      ["Le globe se colore", "Les pays visités s'allument, chaque ville porte son drapeau, un arc relie les étapes."],
      ["Les voyages en fiches", "Rangés par année : un post-it par étape, une carte postale par ville, le budget."],
      ["Les photos se rangent seules", "L'app lit la date et le lieu de chaque photo et la classe dans la bonne étape."],
    ],
    choices: [
      ["Une seule base de code", "Expo et React Native : iOS, Android et le web à partir du même code."],
      ["globe.gl pour la Terre", "Un globe 3D éprouvé, dans une WebView sur téléphone et directement dans la page sur le web : seules les données sont partagées."],
      ["Une version par plateforme quand il le faut", "Des fichiers .web et .native plutôt qu'un bricolage qui casserait l'une des deux."],
    ],
    stack: ["Expo", "React Native", "TypeScript", "Three.js", "IndexedDB"],
    host: "Cloudflare Workers",
    capture: { id: "39b037e75843fe281240be5b0d6e37ee", w: 1040, alt: "Capture de Magellan : le globe et ses pays colorés, avec le compteur « 14 voyages, 22 villes, 13 pays » des données de démonstration.", caption: "Le globe, avec les voyages de démonstration." },
  },
  Hublot: {
    h: 2350,
    why: "Le prix d'un billet bouge tout le temps, et je n'avais pas envie de le guetter moi-même. Hublot le relève à ma place et ne me dérange que quand ça vaut le coup.",
    features: [
      ["Des surveillances", "Une destination, une période de départ, une durée de séjour, un prix à ne pas dépasser."],
      ["Toutes les six heures", "Un robot relève le prix des allers-retours pour chaque surveillance."],
      ["Une alerte, pas une rafale", "Une notification quand un prix passe sous le seuil, une seule par mois de départ, même pendant les promos."],
    ],
    choices: [
      ["GitHub Actions comme serveur", "Le robot tourne dans une tâche planifiée gratuite : aucune machine à entretenir."],
      ["Les relevés sur leur propre branche", "Quatre relevés par jour, rangés à part : l'historique du code reste lisible."],
      ["ntfy pour les alertes", "Une notification sur le téléphone, sans application à écrire."],
    ],
    stack: ["TypeScript", "Node.js", "GitHub Actions", "ntfy"],
    host: "GitHub Actions + GitHub Pages",
    capture: null,
  },
  "Métro Pathfinder": {
    h: 2240,
    why: "Dans le métro parisien, le trajet le plus court n'est pas toujours celui qu'on croit. Je voulais le calculer moi-même : ce fut mon premier algorithme sur un graphe.",
    features: [
      ["Deux stations, un trajet", "On choisit le départ et l'arrivée : le plus court chemin s'affiche."],
      ["Le réseau en graphe", "Les stations sont des nœuds, les tronçons qui les relient sont des arêtes."],
      ["Une application de bureau", "Une fenêtre Swing pour choisir les stations et lire l'itinéraire."],
    ],
    choices: [
      ["Dijkstra", "Le plus court chemin dans un graphe aux distances positives : exact, et simple à vérifier à la main."],
      ["Java et Swing", "Un langage et une interface que je connaissais : tout l'effort allait à l'algorithme."],
    ],
    stack: ["Java", "Swing", "Dijkstra"],
    host: null,
    capture: null,
  },
  "Visit Match": {
    h: 2170,
    why: "Un projet d'école d'ingénieur, mené jusqu'au business plan. Voyager seul, c'est libre, mais on a parfois envie de partager une visite : Visit Match met en relation les voyageurs solo qui partagent les mêmes destinations et les mêmes envies.",
    features: [
      ["Ses envies en commun", "On indique ses destinations et ses centres d'intérêt."],
      ["Les bonnes rencontres", "L'app rapproche les voyageurs qui ont le plus en commun."],
      ["Se retrouver sur place", "Une fois d'accord, il ne reste qu'à se donner rendez-vous."],
    ],
    choices: [
      ["Flutter", "Une seule base de code pour iOS et Android."],
      ["Firebase", "Les comptes et les données sans serveur à maintenir."],
      ["Figma d'abord", "Les écrans dessinés et discutés avant la première ligne de code."],
    ],
    stack: ["Flutter", "Dart", "Firebase", "Figma"],
    host: null,
    capture: null,
  },
  "gym-picker": {
    h: 2330,
    why: "Mes salles de sport sont à distance comparable : c'est le trafic qui décide laquelle est la plus proche. Plutôt que de les vérifier une par une dans Waze, l'app les compare toutes d'un coup.",
    features: [
      ["Le trafic en temps réel", "Toutes les salles classées par temps de trajet en voiture, bouchons compris."],
      ["Un appui, et c'est parti", "Toucher une salle ouvre Waze ou Google Maps sur le bon trajet."],
      ["Un domicile de secours", "Si le GPS tarde, le calcul part d'une adresse gardée sur le téléphone."],
    ],
    choices: [
      ["TomTom plutôt que Google", "Pas de carte bancaire : au-delà du quota gratuit, l'API refuse au lieu de facturer."],
      ["Un Worker Cloudflare devant l'API", "La clé ne quitte jamais le serveur, et chaque adresse IP est limitée à 20 appels par minute."],
      ["Le domicile reste sur le téléphone", "La position part dans le corps de la requête, jamais dans l'adresse : les URL finissent dans les journaux."],
    ],
    stack: ["React", "Vite", "Cloudflare Workers", "TomTom"],
    host: "Cloudflare Workers",
    capture: null,
  },
  Mithril: {
    h: 2540,
    why: "Je voulais un coffre à mots de passe que je puisse relire en entier : sans cloud, sans dépendance, compilé avec ce que Windows fournit déjà. Et chacun peut le recompiler pour vérifier.",
    features: [
      ["Des mots de passe solides", "De 8 à 128 caractères, sans caractères ambigus si on veut, avec leur force affichée."],
      ["Un coffre chiffré deux fois", "Par Windows, puis par le mot de passe maître, en AES-256."],
      ["La frappe automatique", "Un raccourci remplit la fenêtre active, sans passer par le presse-papiers."],
    ],
    choices: [
      ["Aucune dépendance", "Compilé par csc.exe, le compilateur livré avec Windows : pas d'installeur, un seul .exe."],
      ["Le téléphone, sans cloud", "Appairé par un code à six chiffres, il se synchronise sur le réseau local, chaque côté vérifiant l'autre."],
      ["Un tirage sans biais", "Le générateur cryptographique de Windows, en rejetant les tirages biaisés : chaque caractère a exactement la même chance."],
      ["Un audit de sécurité dans la CI", "37 règles vérifient à chaque modification que les garanties annoncées restent vraies ; tout le réseau tient dans un seul fichier."],
    ],
    stack: ["C#", "WinForms", ".NET Framework", "AES-256"],
    host: "GitHub Releases",
    capture: null,
    shelf: {
      name: "002 · API REST .NET",
      text: "Une API REST en microservices C# .NET : un microservice asynchrone avec persistance, des tests unitaires et une démarche TDD, conteneurisé avec Docker (2023).",
      stack: ["C#", ".NET", "SQL Server", "Docker", "xUnit"],
    },
  },
  Cancionero: {
    h: 3190,
    why: "Une chanson qu'on aime, on la retient sans effort. Cancionero en fait une leçon d'espagnol : on la lit, on la comprend, on la chante, et les mots restent.",
    features: [
      ["Les paroles traduites", "Chaque ligne avec sa traduction en français, et sa voix à écouter."],
      ["Le karaoké à trous", "On complète les mots manquants en suivant la chanson."],
      ["Cartes et quiz", "Le vocabulaire en cartes, et un quiz corrigé sur-le-champ, même hors ligne."],
    ],
    choices: [
      ["Une application installable", "Elle s'installe depuis le navigateur et marche hors ligne ; une app iOS aurait demandé un compte développeur Apple."],
      ["Expo et React Native Web", "Le même code pour le web aujourd'hui, et pour le téléphone demain."],
      ["Pas de serveur", "Les paroles se cherchent dans LRCLIB, une base publique, et tout le reste vit sur l'appareil."],
    ],
    stack: ["Expo", "React Native Web", "TypeScript", "PWA"],
    host: "Vercel",
    capture: { id: "6600e6804d64ff7a3ca3d34521f0fa5d", w: 1040, alt: "Capture de Cancionero : le vocabulaire à réviser et la liste des chansons, de « Hola, ¿cómo estás? » à « En el mercado ».", caption: "Les chansons et le vocabulaire à réviser." },
  },
  Tonalli: {
    h: 3040,
    why: "Une émotion, une couleur, deux photos : un rituel à deux, chaque jour, même à distance. Je voulais un fil entre deux personnes, pas un réseau social : pas de fil d'actualité, pas de commentaires, juste nos journées.",
    features: [
      ["Une couleur par jour", "Une émotion parmi douze, en trois intensités : c'est elle qui donne la couleur."],
      ["Deux photos sur le moment", "La scène puis le visage, pris dans l'app, jamais depuis la galerie."],
      ["Le calendrier de l'autre", "Il ne se dévoile qu'une fois sa propre journée remplie ; on y répond d'un seul emoji."],
    ],
    choices: [
      ["La réciprocité écrite dans la base", "Les règles d'accès de Supabase la font respecter en SQL : impossible de la contourner depuis le navigateur."],
      ["Le jour de l'auteur", "La date d'une entrée se calcule dans le fuseau de celui qui l'écrit, jamais en UTC : sinon, le soir, la journée se décale."],
      ["Un site plutôt qu'une app", "Tonalli a commencé en app mobile, puis est devenu un site installable : il ne fallait rien avoir à installer."],
    ],
    stack: ["React", "Vite", "TypeScript", "Supabase", "PWA", "Web Push"],
    host: "Vercel + Supabase",
    capture: { id: "74dd8a932852191fba2519d31865d24e", w: 1040, alt: "Capture de Tonalli : l'écran d'accueil, le personnage-goutte et les boutons de connexion.", caption: "L'écran d'accueil." },
  },
  // 011 : le dépôt qui réunit tous les autres, et ce site. D'après le plan du monorepo (étapes 2 à 5).
  INDEX: {
    h: 2400,
    why: "Mes projets vivaient chacun dans son coin, et certains s'endormaient sur les offres gratuites. INDEX les réunit dans un seul dépôt, les garde éveillés, et les présente ici, numérotés, comme les escales d'un voyage.",
    features: [
      ["Un seul dépôt", "Les dix projets importés avec tout leur historique, chacun dans son dossier."],
      ["Rien ne s'endort", "Un robot garde la base de Tonalli éveillée, vérifie chaque site toutes les heures et ouvre un ticket si l'un tombe."],
      ["Chaque projet à sa place", "Un numéro, une fiche et une escale : ce site."],
    ],
    choices: [
      ["pnpm et Turborepo", "Chaque projet garde ses propres versions ; seuls ceux qui changent sont reconstruits et testés."],
      ["Un hébergement en deux", "Les apps déjà sur Vercel y restent, avec leurs adresses ; les autres partent sur Cloudflare Workers."],
      ["Le réveil dans GitHub Actions", "Une vraie requête garde Supabase éveillé, et le dépôt se réactive lui-même pour que ses tâches planifiées ne s'arrêtent jamais."],
    ],
    stack: ["pnpm", "Turborepo", "Astro", "TypeScript", "GitHub Actions", "Cloudflare Workers"],
    host: "Cloudflare Workers + Vercel",
    capture: null,
  },
};
