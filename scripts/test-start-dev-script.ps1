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
Assert-Contains $script 'if not defined POSTGRES_BIN set "POSTGRES_BIN=%ROOT%.tools\postgresql-18.4-1-windows-x64-binaries\pgsql\bin"'
Assert-Contains $script 'if not defined PGDATA set "PGDATA=%ROOT%.tools\pgdata"'
Assert-Contains $script 'set "PG_CTL=%POSTGRES_BIN%\pg_ctl.exe"'
Assert-Contains $script 'set "ENSURE_POSTGRES_SCRIPT=%SCRIPTS_DIR%\ensure-postgres-dev-db.ps1"'
Assert-Contains $script 'echo Starting bundled PostgreSQL...'
Assert-Contains $script 'call "%PG_CTL%" -D "%PGDATA%" -l "%PGLOG%" -o "-h %DB_HOST% -p %DB_PORT%" start'
Assert-Contains $script 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ENSURE_POSTGRES_SCRIPT%"'
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
