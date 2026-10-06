# Gym Picker

Mes salles de sport classées par temps de trajet en voiture, trafic compris,
en un geste depuis l'écran d'accueil de l'iPhone.

Le problème : quatre salles à peu près à la même distance, et c'est le trafic
qui décide laquelle est la plus rapide. Au lieu de vérifier les quatre une par
une dans Maps ou Waze, l'app les classe d'un coup, et un appui lance Waze vers
la gagnante.

## Comment ça marche

1. La page prend ta position GPS, ou ton domicile enregistré si le GPS ne
   répond pas.
2. Elle l'envoie à un Worker Cloudflare, qui interroge
   [TomTom Matrix Routing](https://docs.tomtom.com/matrix-routing-v2-api/documentation/synchronous-matrix) :
   un départ vers toutes les salles en un seul appel, trafic en temps réel. La
   clé TomTom ne quitte jamais le serveur.
3. La page affiche les salles de la plus rapide à la plus lente. Un appui sur
   une salle ouvre Waze, le bouton « Maps » ouvre Google Maps.

Stack : React 19 + TypeScript + Vite, Cloudflare Workers (page et API sur le
même Worker), PWA installable.

## Démarrer

Node 22.12 ou plus. Avec nvm-windows : `nvm use 24.13.0`.

```bash
npm install                      # génère aussi les types du Worker
cp .dev.vars.example .dev.vars   # puis mets ta clé TomTom dedans
npm run dev                      # http://localhost:5173, page + API
```

La clé TomTom se crée gratuitement sur
[developer.tomtom.com](https://developer.tomtom.com), sans carte bancaire. Le
forfait gratuit (2 500 requêtes par jour) couvre très largement quelques
recherches par jour.

| Commande | Effet |
| --- | --- |
| `npm run dev` | serveur de dev : Vite, et le Worker dans le vrai runtime (workerd) |
| `npm run build` | typage, puis build de production |
| `npm run preview` | build, puis sert la version de production en local |
| `npm test` | tests (Vitest) |
| `npm run lint` | oxlint |
| `npm run deploy` | build, puis mise en ligne sur Cloudflare |
| `npm run cf-typegen` | régénère les types du Worker après un changement de `wrangler.jsonc` |

## Mettre en ligne

```bash
npx wrangler login                       # une fois
npx wrangler secret put TOMTOM_API_KEY   # une fois
npm run deploy
```

L'app est alors servie en HTTPS sur `https://gym-picker.<ton-sous-domaine>.workers.dev`.
Le HTTPS est obligatoire : sans lui, le navigateur refuse la géolocalisation.

## Installer sur l'iPhone

1. Ouvrir l'URL dans Safari, puis Partager › « Sur l'écran d'accueil ».
2. Au premier lancement, autoriser la localisation.
3. Une fois chez toi, dans « Domicile de secours », appuyer sur « Utiliser ma
   position actuelle ». Ce point de secours reste sur le téléphone.

## Changer les salles

Tout est dans [`shared/gyms.ts`](shared/gyms.ts) : nom, adresse (pour
l'affichage) et coordonnées GPS. Mieux vaut poser les coordonnées sur l'entrée
ou le parking. Dans Google Maps, un appui long sur un lieu affiche ses
coordonnées.
