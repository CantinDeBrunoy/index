# GenerateurMdp

Petit générateur de mots de passe pour Windows, destiné à alimenter un gestionnaire de
mots de passe. Application de bureau autonome (WinForms), sans installation, sans réseau,
sans écriture sur disque.

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

1. **Lis le code.** Tout tient dans [`MdpGen.cs`](MdpGen.cs), environ 300 lignes
   commentées. Aucun accès réseau, aucune écriture sur disque : cherche `System.Net` ou
   `System.IO`, tu ne les trouveras pas, ils ne sont même pas importés.
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
- Entropie affichée en bits, avec un verdict indicatif (faible / correct / fort / très fort)
- Copie dans le presse-papiers, avec vidage optionnel au bout de 60 secondes

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

## Structure

| Fichier | Rôle |
| --- | --- |
| `MdpGen.cs` | Tirage aléatoire, génération et interface |
| `Test.cs` | Banc de test (hors exécutable final) |
| `build.ps1` | Compilation + tests |

Les exécutables produits ne sont pas versionnés : ils se reconstruisent en une seconde.
Le binaire distribué est publié en pièce jointe des [Releases](https://github.com/CantinDeBrunoy/Mithril/releases).

## Licence

MIT — fais-en ce que tu veux, sans garantie.
