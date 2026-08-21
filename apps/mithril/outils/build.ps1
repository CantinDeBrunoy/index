# Compile Mithril et lance le banc de test.
# Usage : powershell -ExecutionPolicy Bypass -File outils\build.ps1

$ErrorActionPreference = "Stop"
$racine = Split-Path $PSScriptRoot -Parent
Set-Location $racine

$csc = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
    $csc = "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe"
}
if (-not (Test-Path $csc)) {
    throw "Compilateur C# introuvable. Le .NET Framework 4 est requis (present par defaut sur Windows 10/11)."
}

# Sources decouvertes par glob : ajouter un fichier a src\ ne demande aucune modification ici.
$sources = @(Get-ChildItem "src" -Filter *.cs -File | ForEach-Object { $_.FullName })
$banc    = @(Get-ChildItem "tests" -Filter *.cs -File | ForEach-Object { $_.FullName })
if ($sources.Count -eq 0) { throw "Aucune source trouvee dans src\." }

Write-Host "Compilation de l'application ($($sources.Count) sources)..." -ForegroundColor Cyan
& $csc -nologo -target:winexe -codepage:65001 -optimize+ -r:System.Security.dll -out:Mithril.exe $sources
if ($LASTEXITCODE -ne 0) { throw "Echec de la compilation." }

Write-Host "Compilation du banc de test..." -ForegroundColor Cyan
& $csc -nologo -target:exe -codepage:65001 -main:Banc.Programme -r:System.Security.dll -out:banc-test.exe $sources $banc
if ($LASTEXITCODE -ne 0) { throw "Echec de la compilation des tests." }

Write-Host "Execution des tests..." -ForegroundColor Cyan
& .\banc-test.exe
if ($LASTEXITCODE -ne 0) { throw "Des tests ont echoue." }

Write-Host "`nOK : Mithril.exe est pret." -ForegroundColor Green
