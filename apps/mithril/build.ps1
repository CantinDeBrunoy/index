# Compile le générateur et lance le banc de test.
# Usage : powershell -ExecutionPolicy Bypass -File build.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$csc = "$env:WINDIR\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
    $csc = "$env:WINDIR\Microsoft.NET\Framework\v4.0.30319\csc.exe"
}
if (-not (Test-Path $csc)) {
    throw "Compilateur C# introuvable. Le .NET Framework 4 est requis (present par defaut sur Windows 10/11)."
}

Write-Host "Compilation de l'application..." -ForegroundColor Cyan
& $csc -nologo -target:winexe -codepage:65001 -optimize+ -r:System.Security.dll -out:GenerateurMdp.exe MdpGen.cs Coffre.cs CoffreUi.cs
if ($LASTEXITCODE -ne 0) { throw "Echec de la compilation." }

Write-Host "Compilation du banc de test..." -ForegroundColor Cyan
& $csc -nologo -target:exe -codepage:65001 -main:Banc.Programme -r:System.Security.dll -out:banc-test.exe MdpGen.cs Coffre.cs CoffreUi.cs Test.cs
if ($LASTEXITCODE -ne 0) { throw "Echec de la compilation des tests." }

Write-Host "Execution des tests..." -ForegroundColor Cyan
& .\banc-test.exe
if ($LASTEXITCODE -ne 0) { throw "Des tests ont echoue." }

Write-Host "`nOK : GenerateurMdp.exe est pret." -ForegroundColor Green
