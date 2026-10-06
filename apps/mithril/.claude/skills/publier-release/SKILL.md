---
name: publier-release
description: Publier une release de Mithril - build propre, empreinte SHA-256, tag annoté, publication de Mithril.exe sur GitHub. À utiliser dès que l'utilisateur parle de publier, sortir, livrer, distribuer, tagger une version, préparer une nouvelle version ou mettre à jour la page des releases, même s'il n'emploie pas le mot « release ».
---

# Publier une release de Mithril

## Pourquoi cette procédure est exigeante

Le README promet au lecteur méfiant trois façons de vérifier le binaire, dont
**l'empreinte SHA-256 publiée sur la page de la release**. Mithril est un outil de mots de
passe, distribué sous forme d'un `.exe` non signé que Windows signale au premier lancement.
Une empreinte absente, périmée ou calculée sur un autre fichier détruit exactement la
confiance que le README passe trois paragraphes à construire.

Tout le reste de cette procédure découle de ce point.

## Préalables, dans cet ordre

```powershell
git status --short                                                   # arbre propre attendu
git log --oneline -1                                                 # sur main, à jour
powershell -ExecutionPolicy Bypass -File outils/build.ps1            # banc vert
powershell -ExecutionPolicy Bypass -File outils/audit-securite.ps1   # aucun constat bloquant
```

Ne jamais publier si l'audit remonte un constat CRITIQUE ou ELEVE. Distribuer un binaire
issu d'un code dont l'audit est rouge annule tout l'intérêt d'avoir un audit — et personne
ne saura, puisque le binaire, lui, ne dit rien.

Un constat MOYEN ou FAIBLE ne bloque pas, mais mérite d'être mentionné à l'utilisateur avant
de continuer : il décidera si ça part comme ça.

## 1. Reconstruire à partir de l'arbre propre

Supprimer les binaires existants d'abord. Le fichier publié doit provenir d'une compilation
de l'arbre courant, jamais d'un reliquat d'une session de mise au point.

```powershell
Remove-Item Mithril.exe, banc-test.exe -ErrorAction SilentlyContinue
powershell -ExecutionPolicy Bypass -File outils/build.ps1
```

## 2. Calculer l'empreinte

```powershell
Get-FileHash .\Mithril.exe -Algorithm SHA256
```

Calculer sur le fichier **exact** qui sera téléversé. Si le binaire est recompilé après ce
calcul, l'empreinte est morte : les assemblages .NET embarquent un horodatage et un MVID,
donc deux compilations du même code source produisent deux fichiers différents. Il n'y a pas
de build reproductible bit à bit ici — ce qui signifie aussi qu'un utilisateur qui recompile
lui-même n'obtiendra pas la même empreinte que la release, et c'est normal.

## 3. Choisir le numéro de version

Versionnage sémantique, préfixé `v`. Vérifier ce qui existe déjà :

```powershell
git tag -l "mithril-v*"
```

S'il n'y a aucun tag `mithril-v*`, la première release est `mithril-v1.0.0` : dans le monorepo INDEX, les tags de Mithril portent le préfixe `mithril-`. Ensuite : correctif → patch,
fonctionnalité → mineure, changement de format de coffre ou rupture d'usage → majeure.

## 4. Poser le tag

```powershell
git tag -a mithril-v1.0.0 -m "Mithril v1.0.0"
git push origin mithril-v1.0.0
```

Un tag annoté (`-a`), pas un tag léger : il porte l'auteur et la date, et c'est lui qui fera
foi si l'on doit un jour reconstruire cette version précise.

## 5. Publier — demander confirmation d'abord

Une release est publique et difficile à défaire proprement (les gens téléchargent vite).
Récapituler à l'utilisateur la version, l'empreinte et le contenu prévu, et attendre son
accord avant de publier.

`gh` n'est pas installé sur cette machine. Deux chemins :

- **Sans `gh`** : ouvrir `https://github.com/CantinDeBrunoy/Mithril/releases/new`, choisir le
  tag poussé, coller le corps ci-dessous, joindre `Mithril.exe`.
- **Avec `gh`**, s'il a été installé depuis :
  ```powershell
  gh release create v1.0.0 Mithril.exe --title "Mithril v1.0.0" --notes-file notes.md
  ```

### Modèle de corps de release

```markdown
## Nouveautés

- …

## Vérification

Empreinte SHA-256 de `Mithril.exe` :

    <empreinte>

    Get-FileHash .\Mithril.exe -Algorithm SHA256

L'exécutable n'est pas signé : Windows affichera « Windows a protégé votre ordinateur » au
premier lancement. Informations complémentaires, puis Exécuter quand même.
```

## 6. Après publication

Vérifier que le README annonce toujours le bon nom de fichier (`Mithril.exe`) — il a déjà
changé une fois, et une instruction d'installation fausse est un bug de confiance, pas un
détail de documentation.
