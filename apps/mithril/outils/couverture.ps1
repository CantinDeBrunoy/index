<#
    Couverture de code du banc de test.

    Usage :
        powershell -ExecutionPolicy Bypass -File outils/couverture.ps1
        powershell -ExecutionPolicy Bypass -File outils/couverture.ps1 -Seuil 70 -Rapport bilan.md
        powershell -ExecutionPolicy Bypass -File outils/couverture.ps1 -Cobertura couverture.xml

    Necessite dotnet-coverage (instrumentation dynamique, compatible .NET Framework) :
        dotnet tool install --global dotnet-coverage

    Le seuil ne porte que sur le COEUR (generation, coffre, auto-type, reglages).
    L'interface WinForms represente les deux tiers du code et n'est pas exercable
    par un banc console : l'inclure dans le seuil produirait un chiffre fige et
    sans valeur. Elle est mesuree et affichee, mais ne bloque pas.
#>

[CmdletBinding()]
param(
    [int]$Seuil = 0,
    [string]$Rapport = "",
    [string]$Cobertura = ""
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

# Fichiers reellement exerces par le banc : ce sont eux qui portent le seuil.
$Coeur = @("Generateur.cs", "Coffre.cs", "AutoType.cs", "Reglages.cs")

$fichierCobertura = $Cobertura

if (-not $fichierCobertura) {
    # 1. Compilation AVEC symboles : sans PDB, aucune instrumentation n'est possible.
    $csc = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
    if (-not (Test-Path $csc)) { $csc = "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe" }
    if (-not (Test-Path $csc)) { throw "Compilateur C# introuvable." }

    $sources = @(Get-ChildItem "src" -Filter *.cs -File | ForEach-Object { $_.FullName })
    $banc    = @(Get-ChildItem "tests" -Filter *.cs -File | ForEach-Object { $_.FullName })

    Write-Host "Compilation du banc avec symboles..." -ForegroundColor Cyan
    & $csc -nologo -target:exe -codepage:65001 -debug+ -debug:full -main:Banc.Programme `
        -r:System.Security.dll -out:banc-couverture.exe $sources $banc
    if ($LASTEXITCODE -ne 0) { throw "Echec de la compilation du banc instrumente." }

    # 2. Collecte
    if (-not (Get-Command dotnet-coverage -ErrorAction SilentlyContinue)) {
        throw "dotnet-coverage introuvable. Installer avec : dotnet tool install --global dotnet-coverage"
    }

    Write-Host "Collecte de la couverture..." -ForegroundColor Cyan
    & dotnet-coverage collect --output-format cobertura --output couverture.xml -- .\banc-couverture.exe
    if ($LASTEXITCODE -ne 0) { throw "Echec de la collecte (le banc a-t-il echoue ?)." }
    $fichierCobertura = "couverture.xml"
}

if (-not (Test-Path $fichierCobertura)) { throw "Rapport Cobertura introuvable : $fichierCobertura" }

# 3. Analyse : agregation par fichier (Cobertura emet une <class> par type).
[xml]$cob = Get-Content $fichierCobertura -Raw

$parFichier = @{}
foreach ($classe in $cob.SelectNodes("//class")) {
    $nom = Split-Path $classe.filename -Leaf
    if (-not $parFichier.ContainsKey($nom)) {
        $parFichier[$nom] = @{ Total = 0; Couvertes = 0 }
    }
    foreach ($ligne in $classe.SelectNodes("lines/line")) {
        $parFichier[$nom].Total++
        if ([int]$ligne.hits -gt 0) { $parFichier[$nom].Couvertes++ }
    }
}

if ($parFichier.Count -eq 0) { throw "Aucune donnee de couverture dans $fichierCobertura." }

function Taux($couvertes, $total) {
    if ($total -eq 0) { return 0.0 }
    return [math]::Round(100.0 * $couvertes / $total, 1)
}

$lignes = foreach ($nom in ($parFichier.Keys | Sort-Object)) {
    $d = $parFichier[$nom]
    [pscustomobject]@{
        Fichier   = $nom
        Coeur     = ($Coeur -contains $nom)
        Total     = $d.Total
        Couvertes = $d.Couvertes
        Taux      = Taux $d.Couvertes $d.Total
    }
}

$totalCoeur     = ($lignes | Where-Object { $_.Coeur } | Measure-Object Total -Sum).Sum
$couvertesCoeur = ($lignes | Where-Object { $_.Coeur } | Measure-Object Couvertes -Sum).Sum
$totalTout      = ($lignes | Measure-Object Total -Sum).Sum
$couvertesTout  = ($lignes | Measure-Object Couvertes -Sum).Sum
$tauxCoeur      = Taux $couvertesCoeur $totalCoeur
$tauxTout       = Taux $couvertesTout $totalTout

Write-Host ""
Write-Host "COUVERTURE" -ForegroundColor Cyan
foreach ($l in ($lignes | Sort-Object -Property @{Expression = "Coeur"; Descending = $true}, Fichier)) {
    $marque = if ($l.Coeur) { "coeur" } else { "     " }
    Write-Host ("  {0}  {1,-20} {2,5:N1} %  ({3}/{4})" -f $marque, $l.Fichier, $l.Taux, $l.Couvertes, $l.Total) `
        -ForegroundColor $(if ($l.Coeur) { "Gray" } else { "DarkGray" })
}
Write-Host ""
Write-Host ("  Coeur   : {0} % ({1}/{2} lignes)" -f $tauxCoeur, $couvertesCoeur, $totalCoeur) -ForegroundColor Cyan
Write-Host ("  Projet  : {0} % ({1}/{2} lignes)" -f $tauxTout, $couvertesTout, $totalTout) -ForegroundColor DarkGray

if ($Rapport) {
    $md = New-Object System.Text.StringBuilder
    [void]$md.AppendLine("# Couverture des tests — Mithril")
    [void]$md.AppendLine()
    [void]$md.AppendLine("| Périmètre | Couverture | Lignes | Seuil |")
    [void]$md.AppendLine("|---|---|---|---|")
    $verdictCoeur = if ($Seuil -gt 0 -and $tauxCoeur -lt $Seuil) { ":x:" } else { ":white_check_mark:" }
    $texteSeuil = if ($Seuil -gt 0) { "$Seuil %" } else { "non applique" }
    [void]$md.AppendLine("| **Coeur** (génération, coffre, auto-type, reglages) | $verdictCoeur **$tauxCoeur %** | $couvertesCoeur / $totalCoeur | $texteSeuil |")
    [void]$md.AppendLine("| Projet entier (interface WinForms incluse) | $tauxTout % | $couvertesTout / $totalTout | aucun |")
    [void]$md.AppendLine()
    [void]$md.AppendLine("## Par fichier")
    [void]$md.AppendLine()
    [void]$md.AppendLine("| | Fichier | Couverture | Lignes couvertes |")
    [void]$md.AppendLine("|---|---|---|---|")
    foreach ($l in ($lignes | Sort-Object -Property @{Expression = "Coeur"; Descending = $true}, Fichier)) {
        $icone = if ($l.Coeur) { ":dart:" } else { ":art:" }
        [void]$md.AppendLine("| $icone | ``$($l.Fichier)`` | $($l.Taux) % | $($l.Couvertes) / $($l.Total) |")
    }
    [void]$md.AppendLine()
    [void]$md.AppendLine(":dart: coeur, soumis au seuil — :art: interface, mesuree sans seuil")
    [void]$md.AppendLine()
    [void]$md.AppendLine("---")
    [void]$md.AppendLine("*Produit par ``outils/couverture.ps1`` (dotnet-coverage, format Cobertura).*")

    $md.ToString() | Out-File -FilePath $Rapport -Encoding utf8
    Write-Host ""
    Write-Host "Bilan ecrit : $Rapport" -ForegroundColor Cyan
}

if ($Seuil -gt 0 -and $tauxCoeur -lt $Seuil) {
    Write-Host ""
    Write-Host ("ECHEC : couverture du coeur a {0} %, seuil exige {1} %" -f $tauxCoeur, $Seuil) -ForegroundColor Red
    exit 1
}
