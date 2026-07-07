param(
    [Parameter(Mandatory = $true)]
    [string] $Root
)

$ErrorActionPreference = 'Stop'

$candidates = New-Object System.Collections.Generic.List[string]
$toolsDir = Join-Path $Root '.tools'

if (Test-Path -LiteralPath $toolsDir) {
    Get-ChildItem -LiteralPath $toolsDir -Directory -Filter 'postgresql-*-windows-x64-binaries' -ErrorAction SilentlyContinue |
        ForEach-Object {
            $candidates.Add((Join-Path $_.FullName 'pgsql\bin'))
        }

    $candidates.Add((Join-Path $toolsDir 'pgsql\bin'))
}

@(
    [Environment]::GetEnvironmentVariable('ProgramFiles'),
    [Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
) |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    ForEach-Object {
        $postgresRoot = Join-Path $_ 'PostgreSQL'
        if (Test-Path -LiteralPath $postgresRoot) {
            Get-ChildItem -LiteralPath $postgresRoot -Directory -ErrorAction SilentlyContinue |
                Sort-Object Name -Descending |
                ForEach-Object {
                    $candidates.Add((Join-Path $_.FullName 'bin'))
                }
        }
    }

$pathPsql = Get-Command psql.exe -ErrorAction SilentlyContinue | Select-Object -First 1
if ($pathPsql) {
    $candidates.Add((Split-Path -Parent $pathPsql.Source))
}

$match = $candidates |
    Where-Object { $_ -and (Test-Path -LiteralPath (Join-Path $_ 'psql.exe')) } |
    Select-Object -First 1

if ($match) {
    Write-Output $match
}
