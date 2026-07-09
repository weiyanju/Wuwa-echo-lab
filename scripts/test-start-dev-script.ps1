$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $root 'start-dev.bat'
$script = Get-Content -LiteralPath $scriptPath -Raw

function Assert-Contains {
    param(
        [string] $Text,
        [string] $Expected
    )

    if (-not $Text.Contains($Expected)) {
        throw "Expected start-dev.bat to contain: $Expected"
    }
}

Assert-Contains $script 'if not defined DB_USER set "DB_USER=PostgreSQL"'
Assert-Contains $script 'if not defined DB_PASSWORD set "DB_PASSWORD=root"'
Assert-Contains $script 'if not defined START_POSTGRES_SERVICE set "START_POSTGRES_SERVICE=1"'
Assert-Contains $script 'if not defined BACKEND_PORT set "BACKEND_PORT=8001"'
Assert-Contains $script 'set "ROOT_DIR=%ROOT:~0,-1%"'
Assert-Contains $script 'set "FIND_POSTGRES_BIN_SCRIPT=%SCRIPTS_DIR%\find-postgres-bin.ps1"'
Assert-Contains $script 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%FIND_POSTGRES_BIN_SCRIPT%" -Root "%ROOT_DIR%"'
Assert-Contains $script 'if not defined PGDATA set "PGDATA=%ROOT%.tools\pgdata"'
Assert-Contains $script 'set "PG_CTL=%POSTGRES_BIN%\pg_ctl.exe"'
Assert-Contains $script 'set "ENSURE_POSTGRES_SCRIPT=%SCRIPTS_DIR%\ensure-postgres-dev-db.ps1"'
Assert-Contains $script 'echo Starting bundled PostgreSQL...'
Assert-Contains $script 'call "%PG_CTL%" -D "%PGDATA%" -l "%PGLOG%" -o "-h %DB_HOST% -p %DB_PORT%" start'
Assert-Contains $script 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ENSURE_POSTGRES_SCRIPT%"'
Assert-Contains $script '$env:VITE_BACKEND_TARGET=''http://%BACKEND_HOST%:%BACKEND_PORT%'''
Assert-Contains $script 'echo Checking local PostgreSQL service...'
Assert-Contains $script 'Start-Service -Name $service.Name'
Assert-Contains $script 'if not "%NO_PAUSE%"=="1" pause'

if ($script -match 'sqlite') {
    throw 'start-dev.bat must not contain SQLite fallback logic.'
}

$ensureScript = Join-Path $root 'scripts\ensure-postgres-dev-db.ps1'
if (-not (Test-Path -LiteralPath $ensureScript)) {
    throw 'Expected scripts\ensure-postgres-dev-db.ps1 to exist.'
}

$findPostgresScript = Join-Path $root 'scripts\find-postgres-bin.ps1'
if (-not (Test-Path -LiteralPath $findPostgresScript)) {
    throw 'Expected scripts\find-postgres-bin.ps1 to exist.'
}

$findPostgresContent = Get-Content -LiteralPath $findPostgresScript -Raw
Assert-Contains $findPostgresContent "GetEnvironmentVariable('ProgramFiles'"
Assert-Contains $findPostgresContent 'Get-Command psql.exe'

if ($script -match 'postgresql-18\.4-1-windows-x64-binaries') {
    throw 'start-dev.bat must not default to a hard-coded PostgreSQL 18.4 directory.'
}
