# 🎶 Cancionero — apprendre l'espagnol en chanson

App mobile (iOS / Android / Web) pour **travailler une chanson** afin d'apprendre
l'espagnol. On choisit une chanson dans la liste, puis on l'étudie sous 4 angles :

- **📖 Paroles + traduction** — paroles espagnoles avec la traduction française
  alignée ligne par ligne. Touche 🔊 pour **écouter** chaque ligne (synthèse vocale),
  ou une ligne pour révéler/masquer sa traduction.
- **✏️ Texte à trous** — mode karaoké : un mot est masqué par ligne, à compléter.
- **🃏 Vocabulaire** — flashcards ES → FR des mots-clés, retournables.
- **❓ Quiz** — questions de compréhension avec correction immédiate.

L'app est livrée avec **3 chansons originales** (salutations, famille, marché) écrites
pour l'apprentissage. Tu peux **ajouter tes propres chansons** : colle les paroles
espagnoles (+ la traduction si tu veux), et les modes Paroles / Audio / Trous marchent
aussitôt dessus.

> Stack : Expo SDK 54 · React Native 0.81 · React 19 · TypeScript · expo-router.
> Local-first : tes chansons sont stockées sur l'appareil (AsyncStorage), pas de serveur.

---

## ▶️ Lancer l'app sur ton iPhone (gratuit, via Expo Go)

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

## 🗂️ Structure

```
src/
  app/                      # écrans (expo-router, file-based routing)
    index.tsx               #   liste des chansons (accueil)
    song/[id].tsx           #   détail d'une chanson + sélecteur de mode
    add.tsx                 #   ajouter sa propre chanson
    _layout.tsx             #   Stack + SongsProvider
  components/
    song/                   #   lyrics / fill-blanks / vocab / quiz / mode-switcher
    primary-button.tsx
    themed-text.tsx, themed-view.tsx
  data/songs.ts             # chansons fournies (contenu original)
  features/songs/
    types.ts                # modèle de données (Song, SongLine, VocabItem, QuizQuestion)
    store.tsx               # contexte : combine chansons fournies + utilisateur
    storage.ts              # persistance AsyncStorage
```

## 🧭 Idées pour la suite

- Vocabulaire / quiz **auto-générés** pour les chansons ajoutées par l'utilisateur.
- **Traduction automatique** au collage (via une API) pour ne coller que l'espagnol.
- Suivi de progression (chansons travaillées, scores).
- Mode « écoute en boucle » d'une ligne pour la prononciation.
