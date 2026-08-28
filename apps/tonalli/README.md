# Nuancier

Chaque jour, une couleur pour la journée. Les couleurs s'accumulent et l'année
devient une mosaïque.

Application mobile React Native (Expo, TypeScript). **Tout est local** : pas de
compte, pas de backend, aucune donnée qui quitte l'appareil.

## Lancer le projet

```bash
npm install
npx expo start
```

Les notifications locales programmées ne fonctionnent pas dans Expo Go sur
Android (limitation de l'app Expo Go depuis le SDK 53) : pour les tester,
utiliser un *development build*.

```bash
npx expo run:android   # ou: npx expo run:ios
npm run typecheck      # tsc --noEmit
```

## Écrans

| Route | Écran |
| --- | --- |
| `app/(tabs)/index.tsx` | **Aujourd'hui** — couleur du jour, palette, note |
| `app/(tabs)/calendar.tsx` | **Calendrier** — vue mensuelle et mosaïque annuelle |
| `app/(tabs)/settings.tsx` | **Réglages** — rappel quotidien, export/import |
| `app/day/[date].tsx` | Détail d'une journée (modale) |

## Choix d'implémentation

**Le jour est une date locale.** Toutes les clés sont au format `YYYY-MM-DD`,
construites à partir de `getFullYear` / `getMonth` / `getDate` — jamais depuis
`toISOString()`, qui renvoie de l'UTC et décale la journée le soir. Le jour
courant est recalculé au passage de minuit et à chaque retour au premier plan,
donc la couleur reste modifiable jusqu'à minuit local, et un changement de
fuseau en voyage est pris en compte.

**Palette fermée.** 18 teintes nommées et figées (`src/data/palette.ts`), pas de
sélecteur RVB : trop de choix tue le rituel, et des teintes stables rendent
l'année comparable d'un mois à l'autre.

**Stockage.** `AsyncStorage`, deux clés JSON (`nuancier.entries.v1`,
`nuancier.settings.v1`). Une entrée vaut
`{ date: 'YYYY-MM-DD', color: '#RRGGBB', note?: string, updatedAt: number }` ;
`updatedAt` ne sert qu'à départager un import. Tout ce qui est relu du stockage
passe par une validation : une donnée corrompue est ignorée, jamais fatale.

**Rappels.** Une notification quotidienne répétitive ne sait pas « sauter » un
jour déjà rempli. L'app programme donc une fenêtre glissante de 14 rappels
datés à l'heure choisie (21 h par défaut), en omettant les journées déjà
colorées, et la resynchronise à chaque sauvegarde, à chaque changement de
réglage et au retour au premier plan. La permission est demandée une seule fois
au premier lancement ; un refus ne bloque rien.

**Export / import.** Export d'un fichier `nuancier-YYYY-MM-DD.json` via le
partage natif. À l'import, le fichier est validé puis *fusionné* — à date égale
la version la plus récente gagne — et un récapitulatif (ajoutées / mises à jour
/ inchangées) est confirmé avant écriture.

**Design.** Le châssis est strictement gris : les seules couleurs à l'écran sont
celles choisies par l'utilisateur. Mode sombre suivant le système, animations
limitées à un ressort sur la pastille sélectionnée et un fondu sur la couleur du
jour (`Animated` natif, pas de dépendance supplémentaire).

## Structure

```
app/                  routes expo-router
src/
  components/         palette, grilles, cellules, primitives d'écran
  data/               palette figée, types
  lib/                dates, notifications, export/import
  state/              contextes entrées et réglages, synchro des rappels
  storage/            AsyncStorage + validation
  theme/              tokens clair / sombre
```
