<#
    Audit de sécurité du code source de Mithril.
    Aucune dépendance, aucun accès réseau : uniquement de l'analyse de texte et git.

    Usage :
        powershell -ExecutionPolicy Bypass -File outils/audit-securite.ps1
        powershell -ExecutionPolicy Bypass -File outils/audit-securite.ps1 -Rapport bilan.md

    Deux familles de contrôles :
      - interdictions : un motif dangereux ne doit apparaître nulle part ;
      - invariants    : une protection déjà en place ne doit pas disparaître
                        (c'est le rôle principal ici, le code étant déjà correct).

    Sévérités : CRITIQUE et ELEVE font échouer l'audit ; MOYEN et FAIBLE sont
    reportés au bilan sans bloquer.
#>

[CmdletBinding()]
param(
    [string]$Rapport = ""
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$SeveritesBloquantes = @("CRITIQUE", "ELEVE")

$controles = New-Object System.Collections.Generic.List[object]
$constats  = New-Object System.Collections.Generic.List[object]

$sourcesProduction = @(Get-ChildItem -Path "src" -Filter *.cs -File)
$sourcesToutes     = @($sourcesProduction) + @(Get-ChildItem -Path "tests" -Filter *.cs -File)
$coffre            = Get-Content "src/Coffre.cs"

function Constat([string]$id, [string]$severite, [string]$emplacement, [string]$detail) {
    $script:constats.Add([pscustomobject]@{
        Id = $id; Severite = $severite; Emplacement = $emplacement; Detail = $detail
    })
}

function Controle([string]$id, [string]$categorie, [string]$nom, [string]$severite, [bool]$ok, [string]$note) {
    $script:controles.Add([pscustomobject]@{
        Id = $id; Categorie = $categorie; Nom = $nom; Severite = $severite
        Statut = $(if ($ok) { "OK" } else { "ECHEC" }); Note = $note
    })
    $couleur = if ($ok) { "DarkGray" } else { "Red" }
    $marque  = if ($ok) { "OK   " } else { "ECHEC" }
    $suffixe = if ($note) { "  ($note)" } else { "" }
    Write-Host ("  {0} {1}  {2}{3}" -f $marque, $id, $nom, $suffixe) -ForegroundColor $couleur
}

# Interdit un motif dans un ensemble de fichiers.
function Interdire([string]$id, [string]$categorie, [string]$nom, [string]$severite,
                   [string]$motif, [string]$raison, $fichiers) {
    $trouves = @($fichiers | Select-String -Pattern $motif -AllMatches)
    foreach ($t in $trouves) {
        Constat $id $severite "$($t.Filename):$($t.LineNumber)" "$raison - trouve : $($t.Matches[0].Value)"
    }
    $note = if ($trouves.Count) { "$($trouves.Count) occurrence(s)" } else { "" }
    Controle $id $categorie $nom $severite ($trouves.Count -eq 0) $note
}

# Exige la présence d'un motif : protection existante qui ne doit pas disparaître.
function Exiger([string]$id, [string]$categorie, [string]$nom, [string]$severite,
                [string]$motif, [string]$raison, $fichiers) {
    $trouves = @($fichiers | Select-String -Pattern $motif -AllMatches)
    if ($trouves.Count -eq 0) { Constat $id $severite "(absent)" $raison }
    Controle $id $categorie $nom $severite ($trouves.Count -gt 0) ""
}

# Renvoie les lignes du corps d'une méthode de Coffre.cs.
function CorpsMethode([string]$signature) {
    $debut = ($coffre | Select-String -Pattern ([regex]::Escape($signature)) | Select-Object -First 1)
    if (-not $debut) { return $null }
    $i = $debut.LineNumber
    $fin = $coffre.Count - 1
    for ($j = $i + 2; $j -lt $coffre.Count; $j++) {
        if ($coffre[$j] -match '^\s{8}(public|static|internal|private)\s') { $fin = $j; break }
    }
    return @{ Debut = $i; Fin = $fin; Lignes = $coffre[$i..$fin] }
}

Write-Host "AUDIT DE SECURITE - Mithril" -ForegroundColor Cyan
Write-Host ""

# ---------------------------------------------------------------------------
Write-Host "1. Isolement et surface d'attaque" -ForegroundColor Cyan

# Le réseau n'existe que dans src/Synchro.cs (protocole MSYN1, docs/SYNCHRO.md) : partout
# ailleurs dans l'application, la promesse « aucun réseau » reste entière. Le banc de test,
# non livré, a besoin de sockets en boucle locale pour éprouver le module ; il reste soumis
# à R36 (jamais HTTP ni DNS, même dans un test).
$sourcesSansSynchro = @($sourcesProduction | Where-Object { $_.Name -ne "Synchro.cs" })
Interdire "R01" "Isolement" "aucun acces reseau hors du module de synchronisation" "CRITIQUE" `
    'System\.Net|WebClient|HttpClient|HttpWebRequest|WebRequest|TcpClient|UdpClient|SmtpClient|NetworkStream|new\s+Socket|Dns\.Get' `
    "seul src/Synchro.cs a le droit de toucher au reseau" $sourcesSansSynchro

# Même dans Synchro.cs : des sockets bruts et rien d'autre. Aucun protocole applicatif,
# aucune résolution de nom — une adresse publique ne peut pas s'écrire sans DNS ni HTTP.
Interdire "R36" "Isolement" "aucun protocole applicatif ni resolution de nom" "CRITIQUE" `
    'WebClient|HttpClient|HttpWebRequest|WebRequest|SmtpClient|WebSocket|FtpWebRequest|Dns\.|ServicePointManager|WebProxy' `
    "le module de synchronisation ne parle qu'en trames MSYN1 sous TLS, sur IP privee" $sourcesToutes

# Invariants du module de synchronisation, s'il existe : filtre d'adresses privées et
# comparaison en temps constant pour les MAC et les codes d'appairage.
$synchro = $sourcesProduction | Where-Object { $_.Name -eq "Synchro.cs" }
if ($synchro) {
    $manques = @()
    foreach ($motif in @('EstAdressePrivee\(', 'ComparerConstant\(')) {
        if (-not ($synchro | Select-String -Pattern $motif -Quiet)) { $manques += $motif }
    }
    foreach ($m in $manques) { Constat "R37" "ELEVE" "src/Synchro.cs" "protection absente : $m" }
    Controle "R37" "Isolement" "synchro : adresses privees et comparaison en temps constant" "ELEVE" ($manques.Count -eq 0) ""
} else {
    Controle "R37" "Isolement" "synchro : adresses privees et comparaison en temps constant" "ELEVE" $true "pas de module de synchronisation"
}

# Liste blanche de DLL natives : wininet, winhttp, ws2_32 ou urlmon ouvriraient une
# voie reseau sans jamais passer par System.Net.
$dllAutorisees = @("user32.dll", "kernel32.dll", "crypt32.dll", "dwmapi.dll")
$horsListe = 0
foreach ($t in ($sourcesToutes | Select-String -Pattern 'DllImport\("([^"]+)"' -AllMatches)) {
    foreach ($m in $t.Matches) {
        $dll = $m.Groups[1].Value.ToLowerInvariant()
        if ($dllAutorisees -notcontains $dll) {
            Constat "R02" "CRITIQUE" "$($t.Filename):$($t.LineNumber)" "DLL native hors liste blanche : $dll"
            $horsListe++
        }
    }
}
Controle "R02" "Isolement" "DLL natives en liste blanche" "CRITIQUE" ($horsListe -eq 0) "$($dllAutorisees.Count) DLL autorisees"

Interdire "R03" "Isolement" "aucune execution de programme externe" "ELEVE" `
    'Process\.Start|ShellExecute|WinExec|CreateProcessW?\(' `
    "un gestionnaire de secrets ne doit pas lancer de processus" $sourcesProduction

Interdire "R04" "Isolement" "aucun chargement d'assembly dynamique" "ELEVE" `
    'Assembly\.Load|Assembly\.LoadFrom|Assembly\.LoadFile|Activator\.CreateInstance' `
    "chargement de code a l'execution" $sourcesToutes

Interdire "R05" "Isolement" "aucune deserialisation dangereuse" "CRITIQUE" `
    'BinaryFormatter|SoapFormatter|NetDataContractSerializer|LosFormatter|ObjectStateFormatter|JavaScriptSerializer' `
    "deserialisation menant a l'execution de code" $sourcesToutes

Interdire "R06" "Isolement" "aucun code non verifiable" "ELEVE" `
    '\bunsafe\b|AllowPartiallyTrustedCallers|SuppressUnmanagedCodeSecurity' `
    "affaiblit les garanties du CLR" $sourcesToutes

# ---------------------------------------------------------------------------
Write-Host "2. Qualite de l'alea" -ForegroundColor Cyan

Interdire "R07" "Alea" "aucun generateur non cryptographique" "CRITIQUE" `
    'new\s+Random\s*\(|System\.Random' `
    "seul un CSPRNG convient pour produire des secrets" $sourcesToutes

Exiger "R08" "Alea" "CSPRNG present dans le generateur" "CRITIQUE" `
    'RNGCryptoServiceProvider|RandomNumberGenerator' `
    "le generateur n'utilise plus de source cryptographique" (Get-Item "src/Generateur.cs")

Exiger "R09" "Alea" "sel tire aleatoirement" "ELEVE" `
    'rng\.GetBytes\(sel\)' "le sel PBKDF2 n'est plus tire au hasard" (Get-Item "src/Coffre.cs")

Exiger "R10" "Alea" "IV tire aleatoirement a chaque ecriture" "CRITIQUE" `
    'rng\.GetBytes\(iv\)' "risque de reutilisation d'IV en CBC" (Get-Item "src/Coffre.cs")

# ---------------------------------------------------------------------------
Write-Host "3. Primitives cryptographiques" -ForegroundColor Cyan

Interdire "R11" "Crypto" "aucune primitive obsolete" "CRITIQUE" `
    'MD5|SHA1Managed|SHA1CryptoServiceProvider|HMACSHA1|new\s+SHA1|TripleDES|DESCryptoServiceProvider|\bRC2\b|\bRC4\b' `
    "primitive cassee ou obsolete" $sourcesToutes

Interdire "R12" "Crypto" "aucun mode de chiffrement faible" "CRITIQUE" `
    'CipherMode\.(ECB|OFB|CFB)|PaddingMode\.None' `
    "mode inadapte au chiffrement d'un coffre" $sourcesToutes

# Taille du sel et de l'IV : 16 octets minimum.
foreach ($cible in @(@{Id = "R13"; Var = "sel"; Min = 16}, @{Id = "R14"; Var = "iv"; Min = 16})) {
    $ligne = $coffre | Select-String -Pattern "$($cible.Var)\s*=\s*new byte\[(\d+)\]" | Select-Object -First 1
    if (-not $ligne) {
        Constat $cible.Id "ELEVE" "src/Coffre.cs" "allocation de $($cible.Var) introuvable"
        Controle $cible.Id "Crypto" "taille de $($cible.Var) >= $($cible.Min) octets" "ELEVE" $false ""
    } else {
        $taille = [int]$ligne.Matches[0].Groups[1].Value
        $ok = $taille -ge $cible.Min
        if (-not $ok) {
            Constat $cible.Id "ELEVE" "src/Coffre.cs:$($ligne.LineNumber)" "$($cible.Var) de $taille octets, minimum $($cible.Min)"
        }
        Controle $cible.Id "Crypto" "taille de $($cible.Var) >= $($cible.Min) octets" "ELEVE" $ok "$taille octets"
    }
}

# Cout de derivation : ne doit jamais regresser (recommandation OWASP pour PBKDF2).
$IterationsMinimales = 600000
$ligneIterations = $coffre | Select-String -Pattern 'IterationsDefaut\s*=\s*(\d+)' | Select-Object -First 1
if (-not $ligneIterations) {
    Constat "R15" "ELEVE" "src/Coffre.cs" "constante IterationsDefaut introuvable"
    Controle "R15" "Crypto" "cout de derivation PBKDF2" "ELEVE" $false ""
} else {
    $iterations = [int]$ligneIterations.Matches[0].Groups[1].Value
    $ok = $iterations -ge $IterationsMinimales
    if (-not $ok) {
        Constat "R15" "ELEVE" "src/Coffre.cs:$($ligneIterations.LineNumber)" "$iterations iterations, minimum attendu $IterationsMinimales"
    }
    Controle "R15" "Crypto" "cout de derivation PBKDF2" "ELEVE" $ok "$iterations iterations"
}

# PRF de PBKDF2 : sans HashAlgorithmName, .NET Framework retombe sur HMAC-SHA1.
# Signale sans bloquer - le corriger impose de migrer le format du coffre.
$prfExplicite = @($coffre | Select-String -Pattern 'Rfc2898DeriveBytes\([^)]*HashAlgorithmName')
$prfImplicite = @($coffre | Select-String -Pattern 'new Rfc2898DeriveBytes\(')
$okPrf = ($prfImplicite.Count -eq 0) -or ($prfExplicite.Count -gt 0)
if (-not $okPrf) {
    Constat "R16" "MOYEN" "src/Coffre.cs:$($prfImplicite[0].LineNumber)" `
        "PBKDF2 sans PRF explicite : .NET Framework utilise HMAC-SHA1, pour lequel OWASP recommande 1 300 000 iterations"
}
Controle "R16" "Crypto" "PRF de PBKDF2 explicite" "MOYEN" $okPrf ""

Interdire "R17" "Crypto" "portee DPAPI limitee a l'utilisateur" "ELEVE" `
    'DataProtectionScope\.LocalMachine' `
    "le coffre serait lisible par tout compte de la machine" $sourcesToutes

Exiger "R18" "Crypto" "DPAPI lie a l'utilisateur courant" "ELEVE" `
    'DataProtectionScope\.CurrentUser' "la protection DPAPI a disparu" (Get-Item "src/Coffre.cs")

Exiger "R19" "Crypto" "entropie secondaire DPAPI" "MOYEN" `
    'ProtectedData\.(Protect|Unprotect)\([^)]*Entropie' `
    "DPAPI appele sans entropie secondaire" (Get-Item "src/Coffre.cs")

# ---------------------------------------------------------------------------
Write-Host "4. Invariants du coffre" -ForegroundColor Cyan

Exiger "R20" "Coffre" "comparaison HMAC en temps constant" "CRITIQUE" `
    'static bool ComparerConstant' "la comparaison en temps constant a disparu" (Get-Item "src/Coffre.cs")

Interdire "R21" "Coffre" "aucune comparaison de MAC naive" "CRITIQUE" `
    'SequenceEqual|hmac\w*\s*==|==\s*hmac\w*' `
    "comparaison de MAC vulnerable au timing" $sourcesProduction

# Encrypt-then-MAC : dans Deverrouiller, le MAC doit etre verifie AVANT tout dechiffrement.
$corps = CorpsMethode "public void Deverrouiller(string maitre)"
if (-not $corps) {
    Constat "R22" "CRITIQUE" "src/Coffre.cs" "methode Deverrouiller introuvable"
    Controle "R22" "Coffre" "MAC verifie avant dechiffrement" "CRITIQUE" $false ""
} else {
    $ligneMac = ($corps.Lignes | Select-String -Pattern 'ComparerConstant\(' | Select-Object -First 1)
    $ligneDechiffre = ($corps.Lignes | Select-String -Pattern 'Aes\([^)]*false\)' | Select-Object -First 1)
    $ok = [bool]($ligneMac -and $ligneDechiffre -and ($ligneMac.LineNumber -lt $ligneDechiffre.LineNumber))
    if (-not $ok) {
        Constat "R22" "CRITIQUE" "src/Coffre.cs:$($corps.Debut)" "le dechiffrement n'est plus precede de la verification du MAC"
    }
    Controle "R22" "Coffre" "MAC verifie avant dechiffrement" "CRITIQUE" $ok ""
}

# Verrouiller doit reellement liberer la cle derivee.
$corpsVerrou = CorpsMethode "public void Verrouiller()"
$okVerrou = [bool]($corpsVerrou -and (@($corpsVerrou.Lignes | Select-String -Pattern 'cle\.Dispose\(\)|Array\.Clear').Count -gt 0))
if (-not $okVerrou) { Constat "R23" "ELEVE" "src/Coffre.cs" "Verrouiller() ne libere plus la cle derivee" }
Controle "R23" "Coffre" "cle effacee au verrouillage" "ELEVE" $okVerrou ""

Exiger "R24" "Coffre" "effacement memoire des tampons" "ELEVE" `
    'Array\.Clear' "plus aucun effacement de tampon sensible" (Get-Item "src/Coffre.cs")

Exiger "R25" "Coffre" "copie de secours avant ecriture" "MOYEN" `
    'cheminSecours' "l'ecriture du coffre ne conserve plus de copie de secours" (Get-Item "src/Coffre.cs")

Exiger "R26" "Coffre" "vidage du presse-papiers" "MOYEN" `
    'Clipboard\.Clear' "le presse-papiers n'est plus vide" $sourcesProduction

# Promesse du README : un coffre portable (MITHRIL3, sans DPAPI) est TOUJOURS chiffre par
# un maitre - c'est sa seule protection. Le garde-fou de Sauver() ne doit pas disparaitre.
Exiger "R35" "Coffre" "coffre portable jamais ecrit sans maitre" "ELEVE" `
    'portable\s*&&\s*!maitreActif' `
    "le garde-fou refusant d'ecrire un coffre portable sans maitre a disparu" (Get-Item "src/Coffre.cs")

# ---------------------------------------------------------------------------
Write-Host "5. Hygiene des secrets" -ForegroundColor Cyan

# Motifs a tres forte signature uniquement : dans un gestionnaire de mots de passe,
# une heuristique du type "variable nommee motDePasse" ne produirait que du bruit.
$motifsSecrets = @(
    '-----BEGIN [A-Z ]*PRIVATE KEY',
    'AKIA[0-9A-Z]{16}',
    'ghp_[A-Za-z0-9]{36}',
    'github_pat_[A-Za-z0-9_]{20,}',
    'xox[baprs]-[A-Za-z0-9-]{10,}',
    'AIza[0-9A-Za-z_\-]{35}'
)
$suivis = @((git ls-files) | Where-Object { $_ -ne "outils/audit-securite.ps1" -and (Test-Path $_) })
$nbSecrets = 0
foreach ($motif in $motifsSecrets) {
    foreach ($t in (Select-String -Path $suivis -Pattern $motif -AllMatches -ErrorAction SilentlyContinue)) {
        Constat "R27" "CRITIQUE" "$($t.Filename):$($t.LineNumber)" "secret potentiel dans un fichier versionne"
        $nbSecrets++
    }
}
Controle "R27" "Secrets" "aucun secret dans l'arbre de travail" "CRITIQUE" ($nbSecrets -eq 0) "$($motifsSecrets.Count) motifs testes"

# Un secret retire par un commit ulterieur reste lisible dans l'historique.
# La valeur trouvee n'est jamais recopiee : ce bilan peut etre publie en artefact.
$historique = @(git log -p --all --no-color 2>$null)
$nbHistorique = 0
foreach ($motif in $motifsSecrets) {
    $nbHistorique += @($historique | Select-String -Pattern $motif).Count
}
if ($nbHistorique -gt 0) {
    Constat "R28" "CRITIQUE" "(historique git)" `
        "$nbHistorique correspondance(s) : localiser avec 'git log -p --all', reecrire l'historique et revoquer le secret"
}
Controle "R28" "Secrets" "aucun secret dans l'historique git" "CRITIQUE" ($nbHistorique -eq 0) "$($historique.Count) lignes analysees"

$extensionsSensibles = '\.(exe|dll|pdb|pfx|p12|pem|key|kdbx|mithril|bak)$'
$fichiersSensibles = @($suivis | Where-Object { $_ -match $extensionsSensibles })
foreach ($f in $fichiersSensibles) { Constat "R29" "ELEVE" $f "fichier binaire ou sensible versionne" }
Controle "R29" "Secrets" "aucun binaire ni coffre versionne" "ELEVE" ($fichiersSensibles.Count -eq 0) ""

# ---------------------------------------------------------------------------
Write-Host "6. Chaine de construction" -ForegroundColor Cyan

$scripts = @(Get-ChildItem -Path "outils" -Filter *.ps1 -File | Where-Object { $_.Name -ne "audit-securite.ps1" })
Interdire "R30" "Build" "build sans telechargement ni eval" "ELEVE" `
    'Invoke-WebRequest|Invoke-RestMethod|DownloadString|DownloadFile|Invoke-Expression|\biex\b|Start-BitsTransfer' `
    "le build ne doit rien recuperer sur le reseau ni evaluer de code" $scripts

# Les actions GitHub sont du code tiers execute avec le jeton du depot.
$actionsAutorisees = @("actions/checkout", "actions/upload-artifact", "github/codeql-action")
$workflows = @(Get-ChildItem -Path ".github/workflows" -Filter *.yml -File -ErrorAction SilentlyContinue)
$actionsHorsListe = 0
foreach ($t in ($workflows | Select-String -Pattern 'uses:\s*([^@\s]+)' -AllMatches)) {
    $action = $t.Matches[0].Groups[1].Value
    $autorisee = $false
    foreach ($a in $actionsAutorisees) { if ($action.StartsWith($a)) { $autorisee = $true } }
    if (-not $autorisee) {
        Constat "R31" "ELEVE" "$($t.Filename):$($t.LineNumber)" "action GitHub hors liste blanche : $action"
        $actionsHorsListe++
    }
}
Controle "R31" "Build" "actions GitHub en liste blanche" "ELEVE" ($actionsHorsListe -eq 0) "$($workflows.Count) workflow(s)"

$sansPermissions = @($workflows | Where-Object { -not (Select-String -Path $_.FullName -Pattern '^\s*permissions:' -Quiet) })
foreach ($w in $sansPermissions) { Constat "R32" "MOYEN" $w.Name "workflow sans bloc permissions explicite" }
Controle "R32" "Build" "permissions des workflows declarees" "MOYEN" ($sansPermissions.Count -eq 0) ""

# ---------------------------------------------------------------------------
Write-Host "7. Hygiene du code" -ForegroundColor Cyan

Interdire "R33" "Hygiene" "aucune trace console en production" "FAIBLE" `
    'Console\.Write|Debug\.Write|Trace\.Write' `
    "risque de fuite de secret dans une trace" $sourcesProduction

$marqueurs = @($sourcesToutes | Select-String -Pattern '\b(TODO|FIXME|HACK|XXX)\b')
foreach ($m in $marqueurs) { Constat "R34" "FAIBLE" "$($m.Filename):$($m.LineNumber)" "marqueur de travail inacheve" }
Controle "R34" "Hygiene" "aucun marqueur TODO/FIXME" "FAIBLE" ($marqueurs.Count -eq 0) "$($marqueurs.Count) marqueur(s)"

# ---------------------------------------------------------------------------
# Bilan
# ---------------------------------------------------------------------------
$parSeverite = @{}
foreach ($s in @("CRITIQUE", "ELEVE", "MOYEN", "FAIBLE")) {
    $parSeverite[$s] = @($constats | Where-Object { $_.Severite -eq $s }).Count
}
$bloquants = 0
foreach ($s in $SeveritesBloquantes) { $bloquants += $parSeverite[$s] }
$verdict = if ($bloquants -gt 0) { "ECHEC" } else { "SUCCES" }

$commit  = (git rev-parse --short HEAD 2>$null)
$branche = (git rev-parse --abbrev-ref HEAD 2>$null)
$horodatage = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Write-Host ""
Write-Host ("BILAN : {0} - {1} controles, {2} constat(s) dont {3} bloquant(s)" -f `
    $verdict, $controles.Count, $constats.Count, $bloquants) -ForegroundColor $(if ($bloquants) { "Red" } else { "Green" })
foreach ($c in $constats) {
    $couleur = if ($SeveritesBloquantes -contains $c.Severite) { "Red" } else { "Yellow" }
    Write-Host ("  [{0}] {1} {2} : {3}" -f $c.Severite, $c.Id, $c.Emplacement, $c.Detail) -ForegroundColor $couleur
}

if ($Rapport) {
    $md = New-Object System.Text.StringBuilder
    [void]$md.AppendLine("# Bilan d'audit de sécurité — Mithril")
    [void]$md.AppendLine()
    [void]$md.AppendLine("| | |")
    [void]$md.AppendLine("|---|---|")
    $etat = if ($bloquants -gt 0) { ":x: **ECHEC**" } else { ":white_check_mark: **SUCCES**" }
    [void]$md.AppendLine("| **Verdict** | $etat |")
    [void]$md.AppendLine("| Commit | ``$commit`` (branche ``$branche``) |")
    [void]$md.AppendLine("| Date | $horodatage |")
    [void]$md.AppendLine("| Contrôles exécutés | $($controles.Count) |")
    [void]$md.AppendLine("| Constats bloquants | $bloquants |")
    [void]$md.AppendLine()
    [void]$md.AppendLine("## Constats par sévérité")
    [void]$md.AppendLine()
    [void]$md.AppendLine("| Sévérité | Nombre | Bloquant |")
    [void]$md.AppendLine("|---|---|---|")
    foreach ($s in @("CRITIQUE", "ELEVE", "MOYEN", "FAIBLE")) {
        $bloque = if ($SeveritesBloquantes -contains $s) { "oui" } else { "non" }
        [void]$md.AppendLine("| $s | $($parSeverite[$s]) | $bloque |")
    }
    [void]$md.AppendLine()

    if ($constats.Count -gt 0) {
        [void]$md.AppendLine("## Constats")
        [void]$md.AppendLine()
        [void]$md.AppendLine("| Sévérité | Règle | Emplacement | Détail |")
        [void]$md.AppendLine("|---|---|---|---|")
        $ordonnes = $constats | Sort-Object @{Expression = {$SeveritesBloquantes -contains $_.Severite}; Descending = $true}, Severite
        foreach ($c in $ordonnes) {
            [void]$md.AppendLine("| $($c.Severite) | $($c.Id) | ``$($c.Emplacement)`` | $($c.Detail) |")
        }
        [void]$md.AppendLine()
    } else {
        [void]$md.AppendLine("Aucun constat : les $($controles.Count) contrôles passent.")
        [void]$md.AppendLine()
    }

    [void]$md.AppendLine("## Détail des contrôles")
    [void]$md.AppendLine()
    foreach ($cat in ($controles | Select-Object -ExpandProperty Categorie -Unique)) {
        [void]$md.AppendLine("### $cat")
        [void]$md.AppendLine()
        [void]$md.AppendLine("| | Règle | Contrôle | Sévérité | Note |")
        [void]$md.AppendLine("|---|---|---|---|---|")
        foreach ($c in ($controles | Where-Object { $_.Categorie -eq $cat })) {
            $icone = if ($c.Statut -eq "OK") { ":white_check_mark:" } else { ":x:" }
            [void]$md.AppendLine("| $icone | $($c.Id) | $($c.Nom) | $($c.Severite) | $($c.Note) |")
        }
        [void]$md.AppendLine()
    }
    [void]$md.AppendLine("---")
    [void]$md.AppendLine("*Produit par ``audit-securite.ps1`` : analyse statique locale, sans dépendance ni accès réseau.*")

    $md.ToString() | Out-File -FilePath $Rapport -Encoding utf8
    Write-Host ""
    Write-Host "Bilan ecrit : $Rapport" -ForegroundColor Cyan
}

if ($bloquants -gt 0) { exit 1 }
