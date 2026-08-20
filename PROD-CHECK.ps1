$ErrorActionPreference = "Stop"
Write-Host "Spraoi production preflight" -ForegroundColor Cyan
Write-Host "Folder: $(Get-Location)"
if (-not (Test-Path "package.json")) { throw "package.json not found. Run this from the Spraoi-Platform-PROD root." }
npm install
npm run build:admin
if ($LASTEXITCODE -ne 0) { throw "Admin build failed. Do not push to production." }
Write-Host "Admin build passed. apps/admin/dist is ready." -ForegroundColor Green
