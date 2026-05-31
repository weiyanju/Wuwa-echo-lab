param(
    [string]$BackendHost = "127.0.0.1",
    [int]$BackendPort = 8000,
    [string]$FrontendHost = "127.0.0.1",
    [int]$FrontendPort = 5173,
    [switch]$SkipInstall,
    [switch]$SkipMigrate
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "Wuwa"
$FrontendDir = Join-Path $Root "WuwaFrontend"
$Python = Join-Path $BackendDir ".venv\Scripts\python.exe"
$Npm = Join-Path $Root ".tools\node\npm.cmd"
$NodeDir = Join-Path $Root ".tools\node"
$NpmCache = Join-Path $Root ".tools\npm-cache"

function Require-File {
    param(
        [string]$Path,
        [string]$Message
    )

    if (-not (Test-Path $Path)) {
        throw $Message
    }
}

Require-File $Python "Backend Python was not found at $Python. Create the virtual environment first."
Require-File (Join-Path $BackendDir "manage.py") "Django manage.py was not found in $BackendDir."
Require-File $Npm "Bundled npm was not found at $Npm."
Require-File (Join-Path $FrontendDir "package.json") "Frontend package.json was not found in $FrontendDir."

$env:PATH = "$NodeDir;$env:PATH"
$env:npm_config_cache = $NpmCache

if (-not $SkipInstall) {
    Write-Host "Installing backend dependencies..."
    Push-Location $BackendDir
    try {
        & $Python -m pip install -r requirements.txt
    }
    finally {
        Pop-Location
    }

    Write-Host "Installing frontend dependencies..."
    Push-Location $FrontendDir
    try {
        & $Npm install
    }
    finally {
        Pop-Location
    }
}

if (-not $SkipMigrate) {
    Write-Host "Applying database migrations..."
    Push-Location $BackendDir
    try {
        & $Python manage.py migrate
    }
    finally {
        Pop-Location
    }
}

$BackendUrl = "http://${BackendHost}:${BackendPort}"
$FrontendUrl = "http://${FrontendHost}:${FrontendPort}"

Write-Host ""
Write-Host "Starting backend at $BackendUrl"
Write-Host "Starting frontend at $FrontendUrl"
Write-Host "Press Ctrl+C in each server window to stop it."
Write-Host ""

$BackendArgs = "-NoExit -ExecutionPolicy Bypass -Command `"Set-Location '$BackendDir'; & '$Python' manage.py runserver ${BackendHost}:${BackendPort}`""
$FrontendArgs = "-NoExit -ExecutionPolicy Bypass -Command `"Set-Location '$FrontendDir'; `$env:PATH='$NodeDir;' + `$env:PATH; `$env:npm_config_cache='$NpmCache'; & '$Npm' run dev -- --host $FrontendHost --port $FrontendPort`""

Start-Process powershell.exe -ArgumentList $BackendArgs -WorkingDirectory $BackendDir
Start-Process powershell.exe -ArgumentList $FrontendArgs -WorkingDirectory $FrontendDir

Write-Host "Backend health: $BackendUrl/api/health/"
Write-Host "Frontend:       $FrontendUrl/"
