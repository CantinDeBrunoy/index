# <center>GALACTIC ESCAPE</center>

## Principe du jeu

<p style='text-align: justify;'>
    Inspiré du jeu du plombier, galactic escape est un jeu de "survie" basé sur la rapidité du joueur. L'objectif est de survivre le plus longtemps possible en gagnant un maximum d'avance sur le monstre qui vous poursuit. Pour se faire, le joueur dispose de cases à 2-4 entrées pour se créer un chemin dans l'espace. Sur le chemin du joueur, se dresseront des météores qu'il devra éviter.
</p>

## L'équipe

Un projet d'école de 2022, à cinq : Cantin Roquier, Clément ([goodfoodtruck](https://github.com/goodfoodtruck)), Pierre Correc ([Trymal](https://github.com/Trymal)), Pierre Hervelin ([PierreHervelin](https://github.com/PierreHervelin)) et Tom Bagiau ([TomBagiau](https://github.com/TomBagiau)). L'historique complet du projet est sur [run4urlife](https://github.com/CantinDeBrunoy/run4urlife).

## En ligne

https://galactic-escape.cantin-roquier.workers.dev (l'ancienne adresse Heroku n'existe plus).

## Lancer en local

Depuis la racine du monorepo :

```bash
pnpm install
```

```bash
pnpm --filter galactic-escape dev
```

- `pnpm --filter galactic-escape test` lance les tests de la logique du jeu (Vitest).
- `pnpm --filter galactic-escape build` construit le jeu dans `dist/`, que Cloudflare Workers sert tel quel (`wrangler.jsonc`).

## Depuis 2026

Le jeu est entré dans le monorepo INDEX en octobre 2026, sans son historique :

- Create React App, abandonné, a laissé la place à Vite ; les fichiers qui contiennent du JSX sont passés en `.jsx`.
- Les tests, écrits au début du projet, décrivaient encore une grille de 5 lignes et des cases sans type : ils suivent maintenant les règles du jeu.
- L'onglet « ← Index » ramène à sa fiche sur le portfolio.
