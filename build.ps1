# FORGE Desktop Builder
# Run this from the forge-desktop/ directory: .\build.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

Write-Host ""
Write-Host "=== FORGE Desktop Builder ===" -ForegroundColor Red
Write-Host ""

# Step 1: Install web deps in forge/
Write-Host "Step 1/4: Installing Expo web dependencies..." -ForegroundColor Cyan
Push-Location (Join-Path $root "forge")
npx expo install react-native-web react-dom @expo/metro-runtime
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to install web deps"; exit 1 }

# Step 2: Export Expo web build
Write-Host ""
Write-Host "Step 2/4: Building Expo web export..." -ForegroundColor Cyan
$webOut = Join-Path $PSScriptRoot "web"
npx expo export --platform web --output-dir $webOut
if ($LASTEXITCODE -ne 0) { Write-Error "Expo export failed"; exit 1 }
Pop-Location

# Step 3: Install Electron deps
Write-Host ""
Write-Host "Step 3/4: Installing Electron dependencies..." -ForegroundColor Cyan
Push-Location $PSScriptRoot
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed"; exit 1 }

# Step 4: Package the app
Write-Host ""
Write-Host "Step 4/4: Packaging desktop app for Windows..." -ForegroundColor Cyan
npx electron-builder --win
if ($LASTEXITCODE -ne 0) { Write-Error "electron-builder failed"; exit 1 }
Pop-Location

Write-Host ""
Write-Host "Done! Installer is in forge-desktop/release/" -ForegroundColor Green
Write-Host ""
