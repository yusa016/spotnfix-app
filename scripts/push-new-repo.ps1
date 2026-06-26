# Creates GitHub repo "spotnfix-app" and pushes main (full-stack, separate from old frontend repo).
# Run after: gh auth login

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

# Public repo name — shows as spotnfix-app on GitHub / Railway (not stevenblakecasio/spotnfix-system).
# If you deleted the old frontend-only "spotnfix" repo, you can change this to "spotnfix".
$repoName = "spotnfix-app"

$owner = gh api user -q .login 2>$null
if (-not $owner) {
  Write-Host "Not logged in. Run: gh auth login" -ForegroundColor Red
  exit 1
}

Write-Host "GitHub user: $owner" -ForegroundColor Cyan
Write-Host "Creating github.com/$owner/$repoName ..." -ForegroundColor Cyan

git remote remove origin 2>$null

gh repo create "$owner/$repoName" --public `
  --description "Cardinal's SpotN'Fix — full-stack (frontend + API + database)" `
  --source . `
  --remote origin `
  --push

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "Done! https://github.com/$owner/$repoName" -ForegroundColor Green
  Write-Host "Next: open GO_LIVE.md step B (Railway)." -ForegroundColor Green
} else {
  Write-Host "Failed. If the repo already exists, try:" -ForegroundColor Yellow
  Write-Host "  git remote add origin https://github.com/$owner/$repoName.git"
  Write-Host "  git push -u origin main"
  exit 1
}
