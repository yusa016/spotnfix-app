# Creates a NEW GitHub repo (spotnfix-system) and pushes main.
# Run after: gh auth login

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$repoName = "spotnfix-system"
$owner = "stevenblakecasio"

Write-Host "Creating github.com/$owner/$repoName (if it doesn't exist)..." -ForegroundColor Cyan
gh repo create "$owner/$repoName" --public --description "Cardinal's SpotN'Fix full-stack (frontend + backend + MariaDB)" --source . --remote origin --push 2>$null

if ($LASTEXITCODE -ne 0) {
  Write-Host "Repo may already exist — setting remote and pushing..." -ForegroundColor Yellow
  git remote remove origin 2>$null
  git remote add origin "https://github.com/$owner/$repoName.git"
  git push -u origin main
}

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "Done! Repo: https://github.com/$owner/$repoName" -ForegroundColor Green
} else {
  Write-Host "Push failed. Run 'gh auth login' first." -ForegroundColor Red
  exit 1
}
