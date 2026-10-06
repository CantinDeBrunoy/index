# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Déploiement

La version web est hébergée sur Vercel, qui ne déploie que `main` (voir
`vercel.json` et la section « Déploiement » du README).

- Travailler sur une branche `claude/…`, jamais directement sur `main`. Tant
  qu'elle n'est pas fusionnée, la fonctionnalité n'existe pour personne : à la
  fin de chaque développement, **proposer la fusion** (`git merge --no-ff`).
- Pousser sur `main`, c'est mettre en production : accord explicite à chaque fois.
- Le service worker (`public/sw.js`) sert l'app en cache : si une nouvelle
  version « ne s'affiche pas », fermer et rouvrir l'app avant de soupçonner le
  déploiement. Les icônes sortent toutes de `scripts/make-icons.mjs` (`npm run icons`) :
  une icône modifiée demande un nouveau `?v=` et un nouveau `CACHE`.
