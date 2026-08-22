# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Le projet

Mithril : générateur de mots de passe et coffre local pour Windows. Application WinForms
autonome, .NET Framework 4, **aucune dépendance externe**, **aucun accès réseau**. Tout le
code est en français — noms de classes, de variables, commentaires, messages de commit.

## Commandes

```powershell
powershell -ExecutionPolicy Bypass -File outils/build.ps1           # compile + lance le banc
powershell -ExecutionPolicy Bypass -File outils/audit-securite.ps1  # 37 contrôles de sécurité
powershell -ExecutionPolicy Bypass -File outils/couverture.ps1      # couverture (voir Pièges)
```

`build.ps1` produit `Mithril.exe` et `banc-test.exe` à la racine. Il découvre les sources
par glob : ajouter un fichier dans `src/` ne demande aucune modification du build ni de la CI.

**Il n'existe aucun moyen de lancer un test isolé.** Le banc est un `Main` unique
(`tests/Banc.cs`) qui enchaîne 60 appels à `Verifier(condition, libellé)`, affiche une ligne
`OK`/`ECHEC` par vérification et renvoie un code de sortie non nul si l'une échoue. Pour
cibler une vérification pendant une mise au point, il faut commenter les autres : il n'y a
ni framework de test, ni filtre.

Ces trois commandes doivent rester vertes ; la CI les rejoue.

## Architecture

### Le coffre est le cœur du sujet

`src/Coffre.cs` — chiffrement emboîté `DPAPI( AES-256-CBC( données ) )`. Le format du bloc
interne est documenté en tête de fichier : magie (`MITHRIL1` sans icônes, `MITHRIL2` avec,
`MITHRIL3` pour le coffre portable écrit nu, sans DPAPI, maître obligatoire), drapeaux,
sel, itérations, IV, HMAC-SHA256, puis les données chiffrées.

Invariants à ne jamais casser — l'audit les vérifie explicitement (règles R20 à R26) :

- **encrypt-then-MAC** : `Deverrouiller()` vérifie le HMAC *avant* tout déchiffrement ;
- la comparaison de MAC passe par `ComparerConstant` (temps constant), jamais par `==`
  ni `SequenceEqual` ;
- tout tampon sensible est effacé par `Array.Clear` ; la clé dérivée vit dans
  `SecretMemoire`, chiffrée en mémoire par `CryptProtectMemory` entre deux usages ;
- DPAPI en `CurrentUser` avec entropie secondaire ;
- le nombre d'itérations PBKDF2 est stocké **par fichier** : relever la valeur par défaut
  n'invalide donc aucun coffre existant.

Chaque mot de passe n'est déchiffré qu'à l'instant précis où il est copié, affiché ou tapé.

### Le reste

- `src/Generateur.cs` — `Alea` (CSPRNG avec rejet des tirages biaisés) et `Generateur`.
  Aucune dépendance à l'interface : c'est le fichier à lire en premier.
- `src/Fenetre.cs` — fenêtre principale et `Main` : barre d'état système, raccourci global
  (`RegisterHotKey`), détection d'inactivité, verrouillage sur session Windows.
- `src/Widgets.cs` — contrôles WinForms dessinés à la main (aucun concepteur visuel).
  Toute interface nouvelle se construit avec eux, pas avec les contrôles standard.
- `src/CoffreUi.cs` — fenêtres et dialogues du coffre.
- `src/AutoType.cs` — frappe `SendInput` Unicode dans une fenêtre tierce ; détecte les
  fenêtres élevées, qui refusent l'injection.
- `src/Embleme.cs` — l'emblème (la Porte de Durin) est **dessiné par le code**, aucune
  image n'est versionnée. Il sert l'icône des fenêtres et de la barre d'état ; recompilé
  avec `-define:OUTIL_ICONE`, le même fichier devient le générateur qui produit le `.ico`
  embarqué dans `Mithril.exe` (deux passes de `csc`, voir `outils/build.ps1`).
- `src/Syncthing.cs` — lit `cert.pem` et `config.xml` du Syncthing local pour en dériver
  l'identifiant d'appareil (SHA-256 → base32 → Luhn mod 32), sans jamais appeler Syncthing.
- `src/Qr.cs` — encodeur QR autonome (mode octets, versions 1-10, niveau M) ; affiche
  l'identifiant du PC pour que Syncthing-Fork le scanne.
- `src/Reglages.cs` — persistance **en clair** dans `%APPDATA%\Mithril\reglages.mithril`.
  Aucun secret n'y transite, et ça doit le rester.

## Contraintes non négociables

Mécaniquement vérifiées par `outils/audit-securite.ps1` : un constat CRITIQUE ou ELEVE fait
échouer la CI.

- Aucun accès réseau **hors de `src/Synchro.cs`** (règle R01), y compris via une DLL
  native : seules `user32`, `kernel32`, `crypt32` et `dwmapi` sont en liste blanche. Et
  même dans `Synchro.cs` : sockets bruts uniquement, jamais HTTP, DNS ni proxy (R36), filtre
  d'adresses privées et comparaison en temps constant obligatoires (R37). Le protocole
  est fixé par `docs/SYNCHRO.md` (MSYN1), commun à Mithril Android : le modifier, c'est
  modifier les deux implémentations.
- `System.Random` interdit : uniquement le CSPRNG.
- Aucune primitive obsolète (MD5, SHA-1 employé directement, 3DES, RC2/RC4), aucun mode
  ECB/OFB/CFB, aucun `PaddingMode.None`.
- Aucune désérialisation (`BinaryFormatter` et apparentés), aucun `Process.Start`, aucun
  `unsafe`.
- PBKDF2 à 600 000 itérations minimum.

Ajouter une dépendance externe, même limitée au build, se discute avant d'être fait.

## Pièges

- **Le compilateur est limité à C# 5.** Le `csc.exe` de `v4.0.30319` refuse l'interpolation
  de chaînes, `?.`, `nameof` et les membres à corps d'expression ; utiliser `string.Format`.
  (`-langversion` n'accepte que ISO-1, ISO-2, 3, 4, 5, Default.)
- **Pas de `.csproj` ni de MSBuild** : appel direct à `csc.exe`. Ne pas « moderniser » vers
  un projet SDK sans en discuter — c'est ce qui garantit qu'on compile uniquement avec ce
  que Windows fournit déjà.
- **Les scripts PowerShell contenant des accents doivent être encodés en UTF-8 avec BOM.**
  Sans BOM, Windows PowerShell 5.1 les lit en ANSI et les accents deviennent illisibles.
- **Aucun SDK .NET sur la machine de développement**, seulement le runtime :
  `outils/couverture.ps1` ne peut pas s'y exécuter sans
  `dotnet tool install --global dotnet-coverage`. Aujourd'hui, seule la CI le fait.
- Les exécutables produits ne sont pas versionnés, y compris celui qui est distribué.

## Travail avec git

### On ne code pas sur `main`

Tout développement part d'une branche, nommée `type/sujet-court` avec le même vocabulaire
que les commits : `feat/`, `fix/`, `chore/`, `docs/`. Elle rejoint `main` par une pull
request.

Ce n'est pas une préférence de style, c'est ce qui fait fonctionner la CI de ce dépôt :
**l'audit de sécurité ne tourne que sur les pull requests vers `main` et sur `main`
lui-même**. Une pull request peut donc être bloquée avant la fusion, alors qu'un commit
poussé directement sur `main` n'est audité qu'une fois arrivé — l'audit constate au lieu
d'empêcher. Court-circuiter la branche revient à désactiver le garde-fou qu'on a construit.

La seule exception défendable est de réparer un `main` déjà cassé, quand le détour retarde
la réparation. Tout le reste — « c'est juste une ligne », « c'est juste de la doc » — n'en
est pas une : le coût d'une branche est de vingt secondes.

### Supprimer la branche dès la fusion

En local et sur le distant :

```powershell
git branch -d <branche>
git push origin --delete <branche>
```

Une branche fusionnée qui reste ouverte diverge peu à peu de `main` et finit par être
reprise par erreur, avec un état obsolète. Et quand plusieurs branches sont empilées, les
laisser traîner rend illisible ce qui reste réellement à fusionner.

### Commits

Conventionnels (`feat:`, `fix:`, `chore:`, `docs:`), en français, **sans accents** — c'est
la convention de l'historique existant.

## Skills du dépôt

`.claude/skills/` contient trois procédures à consulter quand la tâche correspond — elles
encodent des séquences où l'erreur coûte cher :

| Skill | Quand |
| --- | --- |
| `publier-release` | publier une version : build propre, empreinte SHA-256, tag, release GitHub |
| `regle-audit` | ajouter ou modifier une règle de `outils/audit-securite.ps1` |
| `format-coffre` | toute modification de ce que le coffre écrit sur disque |

## Intégration continue

`.github/workflows/ci.yml`, trois jobs sur `windows-latest` :

| Job | Déclenchement |
| --- | --- |
| Tests unitaires | tout push, sur toute branche |
| Couverture des tests | tout push, sur toute branche (seuil non encore appliqué) |
| Audit de sécurité | pull requests vers `main`, et `main` lui-même |

L'audit publie un bilan dans le résumé du run et en artefact téléchargeable. CodeQL n'y
tourne que si le dépôt est public.
