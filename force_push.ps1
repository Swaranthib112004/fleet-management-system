$ErrorActionPreference = "SilentlyContinue"
Write-Host "Forcing Git cleanup..."
Get-Process -Name git | Stop-Process -Force
Get-Process -Name ssh | Stop-Process -Force
if (Test-Path ".git\index.lock") {
    Remove-Item ".git\index.lock" -Force
    Write-Host "Removed index lock."
}

# Ensure package.json is correct (sanity check)
$content = Get-Content "package.json" -Raw
if ($content -match "Frontend Module Breakdown") {
    Write-Host "Fixing package.json again..."
    $content = $content -replace "Frontend Module Breakdown", "frontend"
    Set-Content "package.json" $content -Encoding utf8
}

Write-Host "Committing and pushing..."
git add .
git commit -m "fix: resolve folder name inconsistencies and update API calls for production"
git push origin main
git log -n 1 --oneline
Write-Host "Done."
