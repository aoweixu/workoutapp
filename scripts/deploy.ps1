# Build with the GitHub Pages base path and force-push dist/ to gh-pages.
$ErrorActionPreference = "Stop"
$env:BASE_PATH = "/workoutapp/"
npm run build
if ($LASTEXITCODE -ne 0) { throw "build failed" }
New-Item -ItemType File -Path dist/.nojekyll -Force | Out-Null
Push-Location dist
try {
  git init -b gh-pages | Out-Null
  git config user.name "aoweixu"
  git config user.email "aoweixu@users.noreply.github.com"
  git add -A
  git commit -m "deploy" | Out-Null
  git push -f https://github.com/aoweixu/workoutapp.git gh-pages
} finally {
  Pop-Location
  Remove-Item -Recurse -Force dist/.git -ErrorAction SilentlyContinue
}
Write-Host "Deployed: https://aoweixu.github.io/workoutapp/"
