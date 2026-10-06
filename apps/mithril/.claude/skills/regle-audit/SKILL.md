---
name: regle-audit
description: Ajouter ou modifier une règle dans outils/audit-securite.ps1 - choix entre interdiction et invariant, choix de la sévérité, et vérification obligatoire par injection d'une fausse violation. À utiliser dès que l'utilisateur veut interdire un motif dans le code, garantir qu'une protection ne disparaisse pas, durcir l'audit, ajouter un contrôle de sécurité, faire échouer la CI sur une nouvelle condition, ou modifier une règle Rnn existante.
---

# Ajouter une règle à l'audit de sécurité

## Ce que l'audit est vraiment

`outils/audit-securite.ps1` n'est pas un antivirus ni un linter générique : c'est le **gardien
des promesses écrites dans le README**. Chaque règle correspond à une phrase que le projet
affirme publiquement — « aucun accès réseau », « jamais `System.Random` », « comparaison en
temps constant ». Une règle qui ne défend aucune promesse est du bruit, et le bruit finit par
faire ignorer l'audit entier.

Avant d'écrire une règle, formuler la promesse qu'elle protège. Si on n'y arrive pas, c'est
sans doute que la règle n'a pas lieu d'être.

## Interdiction ou invariant ?

Le script offre deux fonctions, et le choix compte plus qu'il n'en a l'air :

- **`Interdire`** — un motif dangereux ne doit apparaître nulle part. Utile contre ce qu'on
  pourrait *ajouter* par inadvertance (`new Random(`, `System.Net`, `BinaryFormatter`).
- **`Exiger`** — un motif protecteur doit rester présent. Utile contre ce qu'on pourrait
  *retirer* en refactorisant (`ComparerConstant`, `Array.Clear`, `DataProtectionScope.CurrentUser`).

Le code de Mithril étant déjà correct, la majorité des règles utiles sont des **invariants**.
C'est le mode de défaillance réaliste : personne n'ajoutera `System.Net` par accident, mais
quelqu'un peut très bien « simplifier » une comparaison en temps constant en `==`.

Pour ce qui ne se réduit pas à un motif — une taille minimale, un ordre entre deux
instructions, une valeur numérique — écrire le contrôle à la main et appeler `Constat` puis
`Controle`. Voir R13/R14 (taille de sel et d'IV lue dans le code) et surtout R22
(le MAC doit être vérifié *avant* le déchiffrement, contrôlé par comparaison de numéros de
ligne dans le corps de `Deverrouiller`), qui sont les deux modèles à copier.

## Choisir la sévérité

CRITIQUE et ELEVE font échouer l'audit et bloquent la CI. MOYEN et FAIBLE apparaissent au
bilan sans bloquer. Deux questions tranchent :

1. **Est-ce exploitable aujourd'hui ?** Une faiblesse théorique ou dont le coût d'attaque
   reste hors de portée n'est pas CRITIQUE.
2. **La correction est-elle disponible sans migration ?** Bloquer la CI sur un problème dont
   le correctif exige de migrer le format du coffre revient à immobiliser le dépôt.

R16 (PRF de PBKDF2 implicite, donc HMAC-SHA1) illustre le cas limite : réel, documenté par
OWASP, mais non exploitable en pratique et corrigeable seulement par un changement de format.
D'où MOYEN.

## Écrire la règle

Prendre l'identifiant `Rnn` suivant le dernier utilisé, et placer la règle dans la section
thématique correspondante (Isolement, Aléa, Crypto, Coffre, Secrets, Build, Hygiène) — les
sections structurent le bilan publié en CI.

```powershell
Interdire "R35" "Isolement" "libellé court du contrôle" "ELEVE" `
    'motif|regex' `
    "pourquoi c'est interdit" $sourcesProduction
```

Choisir le bon périmètre : `$sourcesProduction` exclut `tests/`, `$sourcesToutes` l'inclut.
Une règle qui interdit une pratique légitime dans un banc de test (des mots de passe en dur,
par exemple) doit viser `$sourcesProduction`.

## Vérifier la règle — l'étape qu'on est tenté de sauter

Une règle qui passe au vert ne prouve rien : elle peut être verte parce qu'elle ne sait pas
échouer. Une regex mal échappée, un périmètre vide, un chemin de fichier faux donnent
exactement le même résultat qu'une règle qui fonctionne.

**Toujours injecter une fausse violation, constater la détection, puis restaurer.**

```powershell
# 1. l'audit doit être vert avant
powershell -ExecutionPolicy Bypass -File outils/audit-securite.ps1

# 2. injecter (fichier jetable, ou modification d'une source existante)
#    puis relancer : la règle doit apparaître en ECHEC, avec la bonne sévérité,
#    et le script doit sortir en code 1
powershell -ExecutionPolicy Bypass -File outils/audit-securite.ps1
$LASTEXITCODE   # attendu : 1

# 3. restaurer et confirmer le retour au vert
git checkout -- <fichiers modifiés>
Remove-Item <fichiers jetables>
git status --short   # attendu : rien d'inattendu
```

Vérifier les deux directions : la règle détecte la violation, **et** elle reste silencieuse
sur le code actuel. Une règle qui produit un faux positif sera désactivée dans la semaine.

## Pièges du script lui-même

- **`audit-securite.ps1` est encodé en UTF-8 avec BOM.** Sans BOM, Windows PowerShell 5.1 le
  lit en ANSI et tous les accents cassent. Un outil d'édition qui réécrit le fichier entier
  peut faire sauter le BOM : le revérifier après coup.
- **Attention à l'auto-référence.** Les règles qui cherchent des secrets ou des motifs de
  téléchargement doivent exclure le script lui-même, puisqu'il contient ces motifs par
  construction. Les exclusions existantes sont le modèle à suivre.
- **`Select-String` est insensible à la casse par défaut.** Un motif `MD5` attrapera aussi
  `Md5` dans un commentaire — c'est souvent souhaitable, mais il faut le savoir.
- Les chemins sont écrits en slashs (`src/Coffre.cs`) : PowerShell les accepte, et ça évite
  les échappements de barres inverses.

## Finir proprement

Le nombre de contrôles est cité dans `README.md` et dans `CLAUDE.md`. L'augmenter sans mettre
ces deux fichiers à jour laisse une documentation fausse derrière soi.
