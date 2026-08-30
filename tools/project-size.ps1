param(
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'SilentlyContinue'

function Get-FolderSizeMB([string]$Path) {
  if (-not (Test-Path $Path)) { return $null }
  $sum = (Get-ChildItem -LiteralPath $Path -File -Recurse -Force | Measure-Object -Property Length -Sum).Sum
  if ($null -eq $sum) { $sum = 0 }
  return [math]::Round($sum / 1MB, 2)
}

$targets = @(
  @{Name='Whole project'; Path=$ProjectRoot},
  @{Name='frontend/node_modules'; Path=(Join-Path $ProjectRoot 'frontend\node_modules')},
  @{Name='frontend/.next'; Path=(Join-Path $ProjectRoot 'frontend\.next')},
  @{Name='frontend/public'; Path=(Join-Path $ProjectRoot 'frontend\public')},
  @{Name='backend/.venv'; Path=(Join-Path $ProjectRoot 'backend\.venv')},
  @{Name='backend/uploads'; Path=(Join-Path $ProjectRoot 'backend\uploads')},
  @{Name='backend/private_uploads'; Path=(Join-Path $ProjectRoot 'backend\private_uploads')},
  @{Name='backend/backups'; Path=(Join-Path $ProjectRoot 'backend\backups')}
)

$rows = foreach($t in $targets){
  $size = Get-FolderSizeMB $t.Path
  if ($null -ne $size) {
    [pscustomobject]@{ Item=$t.Name; SizeMB=$size; Path=$t.Path }
  }
}

$rows | Sort-Object SizeMB -Descending | Format-Table -AutoSize
Write-Host "`nTip: frontend/.next is disposable. node_modules and backend/.venv are also reproducible, but deleting them requires npm install / pip install -r requirements.txt before development continues." -ForegroundColor Yellow
