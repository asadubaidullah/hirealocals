param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
  [switch]$Deep
)

$ErrorActionPreference = 'Stop'

function Remove-Safe([string]$Path) {
  if (Test-Path $Path) {
    Write-Host "Removing $Path" -ForegroundColor Cyan
    Remove-Item -LiteralPath $Path -Recurse -Force
  }
}

# Safe generated caches. Stop dev servers before running this script.
Remove-Safe (Join-Path $ProjectRoot 'frontend\.next')
Remove-Safe (Join-Path $ProjectRoot 'frontend\.turbo')

Get-ChildItem -Path (Join-Path $ProjectRoot 'backend') -Directory -Filter '__pycache__' -Recurse -Force -ErrorAction SilentlyContinue |
  ForEach-Object { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
Get-ChildItem -Path (Join-Path $ProjectRoot 'backend') -File -Include '*.pyc','*.pyo' -Recurse -Force -ErrorAction SilentlyContinue |
  Remove-Item -Force -ErrorAction SilentlyContinue

if ($Deep) {
  Write-Host "Deep cleanup enabled: removing reproducible dependency folders." -ForegroundColor Yellow
  Remove-Safe (Join-Path $ProjectRoot 'frontend\node_modules')
  Remove-Safe (Join-Path $ProjectRoot 'backend\.venv')
  Write-Host "To restore frontend: cd frontend; npm install" -ForegroundColor Yellow
  Write-Host "To restore backend: python -m venv .venv; .venv\Scripts\activate; pip install -r requirements.txt" -ForegroundColor Yellow
}

Write-Host "Cleanup complete. User uploads, private uploads, database, .env and source code were not touched." -ForegroundColor Green
