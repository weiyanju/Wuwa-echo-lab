param(
    [Parameter(Mandatory = $true)]
    [string] $PsqlPath,

    [Parameter(Mandatory = $true)]
    [string] $HostName,

    [Parameter(Mandatory = $true)]
    [int] $Port,

    [Parameter(Mandatory = $true)]
    [string] $AdminUser,

    [Parameter(Mandatory = $true)]
    [string] $User,

    [Parameter(Mandatory = $true)]
    [string] $Password,

    [Parameter(Mandatory = $true)]
    [string] $Database
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $PsqlPath)) {
    Write-Host "ERROR: psql.exe was not found at '$PsqlPath'." -ForegroundColor Red
    exit 1
}

$binDir = Split-Path -Parent $PsqlPath
$createdbPath = Join-Path $binDir 'createdb.exe'

if (-not (Test-Path -LiteralPath $createdbPath)) {
    Write-Host "ERROR: createdb.exe was not found at '$createdbPath'." -ForegroundColor Red
    exit 1
}

$env:PGPASSWORD = $Password

function Invoke-Psql {
    param([string] $Sql)

    & $PsqlPath `
        -h $HostName `
        -p $Port `
        -U $AdminUser `
        -d postgres `
        -v ON_ERROR_STOP=1 `
        -c $Sql

    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

function Invoke-PsqlScalar {
    param([string] $Sql)

    $output = & $PsqlPath `
        -h $HostName `
        -p $Port `
        -U $AdminUser `
        -d postgres `
        -v ON_ERROR_STOP=1 `
        -Atc $Sql

    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }

    return ($output | Select-Object -First 1)
}

$escapedUser = $User.Replace("'", "''")
$escapedPassword = $Password.Replace("'", "''")
$escapedDatabase = $Database.Replace("'", "''")

$roleSql = @"
DO `$`$
DECLARE
    role_name text := '$escapedUser';
    role_password text := '$escapedPassword';
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('CREATE ROLE %I WITH LOGIN SUPERUSER PASSWORD %L', role_name, role_password);
    ELSE
        EXECUTE format('ALTER ROLE %I WITH LOGIN SUPERUSER PASSWORD %L', role_name, role_password);
    END IF;
END
`$`$;
"@

Invoke-Psql $roleSql

$databaseExists = Invoke-PsqlScalar "SELECT 1 FROM pg_database WHERE datname = '$escapedDatabase';"
if ($databaseExists -ne '1') {
    & $createdbPath `
        -h $HostName `
        -p $Port `
        -U $AdminUser `
        -O $User `
        $Database

    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
