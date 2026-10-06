---
name: format-coffre
description: Modifier le format du fichier coffre de Mithril sans rendre illisibles les coffres existants - nouvelle magie, lecture rétrocompatible, migration transparente, tests obligatoires. À utiliser dès que l'utilisateur veut changer le chiffrement du coffre, le PRF de PBKDF2, ajouter un champ à l'en-tête, stocker une nouvelle donnée par entrée, migrer vers SHA-256, ou toucher à Coffre.cs d'une façon qui change ce qui est écrit sur disque.
---

# Modifier le format du coffre

## L'enjeu, avant la technique

Un coffre illisible n'est pas un bug : c'est la perte définitive de tous les mots de passe
d'un utilisateur. Il n'y a pas de serveur, pas de sauvegarde distante, pas de récupération.
Le seul filet est le `coffre.bak` local et l'export en clair, que l'utilisateur n'a
probablement pas fait.

Cela impose une règle qui domine toutes les autres : **une version de Mithril doit pouvoir
lire tout ce que les versions précédentes ont écrit.** Un format ne se remplace pas, il
s'ajoute.

## Le format actuel

Documenté en tête de `src/Coffre.cs`, à relire avant toute modification. Structure du bloc
interne, sous la couche DPAPI :

```
[0..7]   magie : "MITHRIL1" (entrées sans icône) ou "MITHRIL2" (avec icône)
[8]      drapeaux : bit 0 = maître actif
         si maître actif :
[9..24]    sel (16 octets)
[25..28]   itérations (int32)
[29..44]   IV (16 octets)
[45..76]   HMAC-SHA256(magie | drapeaux | sel | itérations | IV | chiffré)
[77..]     données chiffrées AES-256-CBC
         sinon :
[9..]      données en clair (mais toujours sous DPAPI)
```

Deux conséquences pratiques :

- **Les décalages sont en dur** (`45`, `77`, `bloc.Length - 77`…) et répartis entre `Ouvrir`,
  `Deverrouiller` et `Sauver`. Ajouter un champ dans l'en-tête décale tout : il faut reprendre
  les trois méthodes de façon cohérente, sinon les tests passeront sur un aller-retour tout en
  cassant la lecture des anciens fichiers.
- **Le HMAC couvre l'en-tête autant que le chiffré.** Modifier l'en-tête change la valeur
  calculée : `CalculerHmac` et la vérification doivent évoluer ensemble, des deux côtés.

Ce qui est stocké par fichier — le sel, le nombre d'itérations — peut changer de valeur par
défaut sans rien casser : chaque coffre porte la sienne. Ce qui n'est **pas** stocké — le PRF
de PBKDF2, le mode de chiffrement, la longueur de clé — est implicite dans le code, donc tout
changement de ces éléments exige une nouvelle magie.

## Procédure

### 1. Nouvelle magie

Ajouter `MITHRIL3` (puis 4, 5…) à côté des constantes existantes. Ne jamais réutiliser une
magie déjà publiée avec une sémantique différente : ce serait l'unique façon de rendre un
coffre existant silencieusement indéchiffrable, ou pire, mal déchiffré.

### 2. Lire toutes les versions, n'écrire que la dernière

`Ouvrir()` reconnaît chaque magie connue et mémorise laquelle a été lue — c'est déjà ce que
fait `avecIcones` pour distinguer `MITHRIL1` de `MITHRIL2`. `Sauver()` écrit toujours au
format le plus récent.

Si le changement porte sur la dérivation (PRF, itérations, longueur de clé), la version lue
détermine **comment dériver** : un coffre `MITHRIL2` continue d'être ouvert avec l'ancien PRF,
sinon le mot de passe maître de l'utilisateur sera rejeté à tort.

### 3. Migration

Elle est naturellement transparente : le coffre est lu à l'ancien format, et le prochain
`Sauver()` le réécrit au nouveau. Ne rien forcer au démarrage.

Attention au cas de la dérivation : re-dériver la clé impose de connaître le mot de passe
maître en clair, ce qui n'est vrai qu'au moment du déverrouillage. Le plus simple et le plus
sûr est de migrer la dérivation **au prochain changement de maître** (`DefinirMaitre`), et de
le dire à l'utilisateur, plutôt que d'inventer un chemin de re-dérivation opportuniste.

### 4. Ne pas toucher au chemin d'écriture

`Sauver()` écrit dans `coffre.mithril.tmp`, puis appelle `File.Replace(temporaire, chemin,
cheminSecours)`. Ce remplacement est atomique et bascule automatiquement l'ancien fichier vers
`coffre.bak` : une coupure de courant en plein enregistrement ne peut pas laisser un coffre à
moitié écrit. C'est une propriété acquise, à préserver telle quelle.

## Tests obligatoires

Ajouter à `tests/Banc.cs`, en suivant les cas existants du coffre :

- aller-retour complet au nouveau format ;
- **lecture d'un coffre écrit à l'ancien format** — c'est le test qui compte, et le seul qui
  attrape une régression de rétrocompatibilité. Construire le fichier ancien format dans le
  test lui-même plutôt que de dépendre d'un fichier d'exemple versionné ;
- mauvais mot de passe maître rejeté, sur les deux formats ;
- fichier altéré détecté à l'ouverture, sur les deux formats ;
- migration : ouvrir un ancien coffre, sauver, rouvrir, vérifier que les entrées sont intactes
  et que la magie a bien changé.

Les tests du coffre travaillent dans un dossier temporaire. Ne jamais les faire pointer vers
`%APPDATA%\Mithril` : ce sont les vrais mots de passe de l'utilisateur.

## Vérification finale

```powershell
powershell -ExecutionPolicy Bypass -File outils/build.ps1
powershell -ExecutionPolicy Bypass -File outils/audit-securite.ps1
```

Les règles R20 à R26 verrouillent précisément les propriétés qu'une refonte de format risque
de casser : comparaison de MAC en temps constant, MAC vérifié avant déchiffrement, effacement
des tampons, portée DPAPI, copie de secours. Si l'une passe au rouge, c'est un vrai problème
et non une règle à assouplir.

Documenter le nouveau format en tête de `Coffre.cs` — c'est cette documentation qui rend la
prochaine modification possible. Mettre à jour la section « Coffre » du README si ce qui est
promis à l'utilisateur change (algorithme, itérations, ce qui est stocké).

## Exemple concret : passer le PRF à SHA-256

Le cas identifié par la règle R16. `new Rfc2898DeriveBytes(maitre, sel, iterations)` utilise
HMAC-SHA1 sur .NET Framework ; la surcharge acceptant `HashAlgorithmName.SHA256` compile et
s'exécute avec le compilateur du dépôt, mais exige 4.7.2+ au lieu de 4.0 — le badge du README
devient alors faux.

Comme le PRF n'est pas stocké dans le fichier, c'est exactement le cas qui impose une magie
`MITHRIL3` : les coffres `MITHRIL1`/`MITHRIL2` se dérivent en SHA-1, les `MITHRIL3` en
SHA-256, et la bascule se fait au prochain changement de maître.

Correction intermédiaire sans changement de format, si l'objectif est seulement la conformité
OWASP : porter `IterationsDefaut` de 600 000 à 1 300 000, valeur recommandée pour
PBKDF2-HMAC-SHA1. Aucune migration n'est nécessaire puisque le nombre d'itérations est stocké
par fichier.
