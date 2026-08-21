# GenerateurMdp

Petit générateur de mots de passe pour Windows, destiné à alimenter un gestionnaire de
mots de passe. Application de bureau autonome (WinForms), sans installation, sans réseau.
N'écrit rien sur disque, sauf si tu utilises le coffre optionnel (chiffré, voir plus bas).

![aucune dépendance](https://img.shields.io/badge/d%C3%A9pendances-aucune-brightgreen)
![.NET Framework 4](https://img.shields.io/badge/.NET%20Framework-4.0-blue)

## Installation

Télécharge `GenerateurMdp.exe` depuis la page
[Releases](https://github.com/CantinDeBrunoy/Mithril/releases) et double-clique dessus.
Il n'y a rien à installer et rien à configurer.

**Windows va afficher un avertissement au premier lancement.** L'exécutable n'est pas signé
(un certificat coûte plusieurs centaines d'euros par an, ce qui n'a pas de sens pour un
outil gratuit), donc SmartScreen affiche un bandeau bleu « Windows a protégé votre
ordinateur ». Clique sur **Informations complémentaires**, puis sur **Exécuter quand
même**. Le bouton n'apparaît qu'après le premier clic.

Tu as évidemment raison d'être méfiant devant un `.exe` reçu par message, surtout pour
générer des mots de passe. Trois façons de vérifier plutôt que de me croire sur parole :

1. **Lis le code.** Trois fichiers commentés : [`MdpGen.cs`](MdpGen.cs) (génération et
   interface), [`Coffre.cs`](Coffre.cs) (chiffrement du coffre) et
   [`CoffreUi.cs`](CoffreUi.cs) (fenêtres du coffre). Aucun accès réseau : cherche
   `System.Net`, il n'est importé nulle part. Le disque n'est touché que par le coffre.
2. **Vérifie l'empreinte** du fichier téléchargé, indiquée sur la page de la release :
   ```powershell
   Get-FileHash .\GenerateurMdp.exe -Algorithm SHA256
   ```
3. **Recompile toi-même** (voir plus bas) : le compilateur est déjà sur ta machine, et tu
   obtiens un binaire construit à partir du code que tu viens de lire.

## Utilisation

Double-clic sur `GenerateurMdp.exe`.

- Longueur réglable de 8 à 128 caractères (défaut : 32)
- Familles activables : minuscules, majuscules, chiffres, symboles `!#$%&()*+,-./:;<=>?@[]^_{|}~`
- Option **symboles faciles à taper au téléphone** : restreint le jeu à
  `! $ & ( ) , - . / : ; ? @`, c'est-à-dire les symboles atteignables en une seule bascule
  de clavier. Les autres (`# % * + < > [ ] ^ _ { | } ~`) exigent une deuxième page de
  symboles sur iOS, sur Gboard, ou sur les deux.
- Option d'exclusion des caractères ambigus (`I l 1 O 0 B 8 S 5 Z 2`), utile quand le mot
  de passe doit parfois être relu ou retapé à la main
- Entropie affichée en bits, avec une jauge et un verdict indicatif (faible / correct /
  fort / très fort)
- Mot de passe coloré par famille (lettres, chiffres en bleu, symboles en ambre) pour
  faciliter la relecture
- Copie dans le presse-papiers via le bouton ou **Ctrl+C**, avec vidage optionnel au bout
  de 60 secondes (compte à rebours affiché). Les copies sont exclues de l'historique
  Windows (Win+V) et du presse-papiers cloud.
- **Coffre optionnel** pour garder les mots de passe générés sur la machine (voir plus bas)
- Interface sombre ; tout est pilotable au clavier (Entrée génère, Alt+G / Alt+C,
  flèches sur le curseur de longueur)

Les réglages par défaut (32 caractères, alphabet de 94) donnent **~210 bits d'entropie**.
Avec la restriction mobile, l'alphabet tombe à 75 et l'entropie à **~199 bits** : la perte
est négligeable à cette longueur, un mot de passe reste hors de portée de toute attaque.

## Qualité de l'aléa

C'est le seul point qui compte vraiment pour ce genre d'outil.

- Tirage via `RNGCryptoServiceProvider` (le CSPRNG de Windows), jamais `System.Random`.
- **Rejet des tirages biaisés** plutôt qu'un simple `% n` : les valeurs de la dernière
  plage incomplète de `uint` sont retirées, ce qui rend chaque caractère de l'alphabet
  strictement équiprobable. Un modulo naïf favorise légèrement les premiers caractères.
- Un caractère imposé par famille cochée (pour satisfaire les règles de complexité des
  sites), puis mélange de Fisher-Yates : aucune position n'est prévisible.

## Coffre (optionnel)

Le bouton « Enregistrer » garde un mot de passe généré sur la machine, avec un libellé et
un identifiant. Le bouton **« ＋ Ajouter »** de la fenêtre du coffre permet aussi de saisir
un mot de passe **existant** (qui n'a pas été généré ici). Tant que tu n'enregistres rien,
l'application n'écrit rien sur disque.

Le fichier (`%APPDATA%\Mithril\coffre.mithril`) est chiffré en deux couches :

1. **DPAPI, toujours** : le chiffrement natif de Windows, lié à ta session. Le fichier est
   illisible depuis un autre compte, une autre machine, ou une copie du disque. C'est le
   même mécanisme que Chrome utilise pour ses mots de passe enregistrés.
2. **Mot de passe maître, en option** : une couche AES-256 + HMAC-SHA256 par-dessus, clé
   dérivée par PBKDF2 (600 000 itérations). Elle protège aussi contre un programme
   malveillant qui tournerait sous ton compte — tant que le coffre est verrouillé.
   **Il est irrécupérable : oublié = coffre perdu.**

### Frappe automatique (auto-type)

Plutôt que de copier-coller, l'icône ⌨ d'une entrée tape le mot de passe **directement
dans une autre fenêtre**, comme un clavier — sans jamais passer par le presse-papiers.
Utile pour le navigateur, une session RDP, ou les champs qui interdisent le collage.

Déroulé : clic sur ⌨ → le coffre se réduit → un compte à rebours de 3 s te laisse cliquer
dans le champ cible → Mithril affiche le **titre de la fenêtre visée** puis y tape le mot
de passe. **Échap** annule à tout moment.

- Si l'entrée a un identifiant, Mithril tape **identifiant → Tab → mot de passe** ; sinon
  le mot de passe seul.
- Par défaut, **aucune touche Entrée n'est envoyée** (rien n'est validé sans toi). Un
  interrupteur du coffre permet d'ajouter Entrée pour soumettre le formulaire, à activer
  seulement si tu es sûr de la cible.
- Frappe en Unicode : indépendante de la disposition clavier (AZERTY, accents, symboles).
- Une fenêtre lancée en administrateur refuse la frappe (protection Windows) : Mithril le
  détecte et te renvoie vers la copie au lieu d'échouer en silence.
- Limite honnête : une frappe injectée est visible d'un keylogger, comme si tu tapais
  toi-même — ni plus ni moins qu'une saisie normale, mais mieux que le presse-papiers.

Chaque entrée porte une **vignette** : pour une appli de bureau, son icône est apprise
automatiquement au premier auto-type ; sinon (et pour les sites web, dont le favicon n'est
pas récupérable sans réseau), un monogramme coloré tiré du libellé. Les icônes sont
stockées dans le fichier chiffré, comme le reste.

### Barre d'état et raccourci global

Fermer la fenêtre principale ne quitte pas l'appli : Mithril se réduit dans la **barre
d'état système** et reste actif. Depuis là :

- **Ctrl+Alt+M** remplit la **fenêtre actuellement active** sans rouvrir le coffre :
  Mithril lit le titre de la fenêtre, retrouve l'entrée correspondante (un sélecteur
  s'affiche s'il y en a plusieurs) et la tape. Tu ne saisis le mot de passe maître **qu'une
  fois par session**.
- Le menu de l'icône donne accès au générateur, au coffre, au remplissage et à
  « Verrouiller le coffre ».

Le coffre reste déverrouillé en mémoire pendant la session, puis se **reverrouille
automatiquement** après 5 minutes d'inactivité, au verrouillage de la session Windows, ou
via « Verrouiller ». « Quitter » (menu de l'icône) ferme réellement l'appli et efface les
secrets.

Réductions de la fenêtre d'exposition quand le coffre est ouvert :

- Chaque mot de passe n'est déchiffré qu'à l'instant où tu le copies ou l'affiches ; le
  reste du temps il est chiffré, même en mémoire (`CryptProtectMemory`).
- L'affichage est masqué par défaut (`●●●`), la révélation dure 8 secondes.
- Verrouillage automatique : après 5 minutes d'inactivité, à la fermeture de la fenêtre,
  et dès que la session Windows se verrouille.
- L'enregistrement rapide depuis la fenêtre principale reverrouille aussitôt.

Limites honnêtes : DPAPI meurt avec ton profil Windows (réinstallation, réinitialisation
forcée du mot de passe d'un compte local). Le bouton **Exporter** produit une sauvegarde
de secours *en clair*, à ranger en lieu sûr. Et aucun coffre, le nôtre comme les autres,
ne protège une machine déjà compromise par un malware actif.

## Réglages

L'icône ⚙ (ou « Réglages… » dans le menu de la barre d'état) ouvre une fenêtre de
configuration : délai de verrouillage automatique, verrouillage à la session Windows / à la
réduction, robustesse du maître (itérations PBKDF2), délai de vidage du presse-papiers,
raccourci global **modifiable**, séquence identifiant + Tab, validation par Entrée, vitesse
de frappe, apprentissage des icônes, lancement au démarrage de Windows, et fermeture réduite
dans la barre d'état.

Les réglages sont stockés dans `%APPDATA%\Mithril\reglages.mithril` — un fichier texte
**en clair** (aucun secret), lisible et modifiable à la main.

## Compilation

Aucun SDK à installer : le compilateur C# du .NET Framework 4, livré avec Windows, suffit.

```powershell
powershell -ExecutionPolicy Bypass -File build.ps1
```

Le script compile l'application, compile le banc de test et l'exécute.

## Tests

`Test.cs` exerce le vrai code de génération, pas une copie :

| Vérification | Volume |
| --- | --- |
| Uniformité de la distribution (khi²) | 260 000 tirages |
| Longueur exacte et présence de chaque famille | 20 000 mots de passe |
| Dispersion des caractères imposés par le mélange | 40 000 mots de passe |
| Absence de collision sur 32 caractères | 50 000 mots de passe |
| Aucun symbole pénible sous contrainte mobile | 20 000 mots de passe |
| Filtrage des ambigus, jeu mobile, calcul d'entropie | assertions directes |
| Coffre : aller-retour DPAPI et maître, mauvais maître rejeté, altération détectée, protection mémoire, export | 13 assertions |
| Auto-type : introspection des fenêtres, détection de cible élevée | 2 assertions |

## Structure

| Fichier | Rôle |
| --- | --- |
| `MdpGen.cs` | Tirage aléatoire, génération et fenêtre principale |
| `Coffre.cs` | Chiffrement et stockage du coffre (DPAPI, AES, PBKDF2) |
| `CoffreUi.cs` | Fenêtres du coffre, dialogues du maître, compte à rebours de frappe |
| `AutoType.cs` | Frappe automatique dans une autre fenêtre (SendInput Unicode) |
| `Reglages.cs` | Réglages et persistance dans `reglages.mithril` |
| `ReglagesUi.cs` | Fenêtre de réglages (sélecteurs, capture de raccourci) |
| `Test.cs` | Banc de test (hors exécutable final) |
| `build.ps1` | Compilation + tests |

Les exécutables produits ne sont pas versionnés : ils se reconstruisent en une seconde.
Le binaire distribué est publié en pièce jointe des [Releases](https://github.com/CantinDeBrunoy/Mithril/releases).

## Licence

MIT — fais-en ce que tu veux, sans garantie.
