param(
    [Parameter(Mandatory = $true)]
    [string[]] $Ports
)

$parsedPorts = @()
foreach ($value in $Ports) {
    foreach ($part in ($value -split ',')) {
        $trimmed = $part.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed)) {
            continue
        }

        $port = 0
        if (-not [int]::TryParse($trimmed, [ref] $port) -or $port -lt 1 -or $port -gt 65535) {
            Write-Host "ERROR: Invalid port value '$trimmed'." -ForegroundColor Red
            exit 1
        }

        $parsedPorts += $port
    }
}

$busy = @()
foreach ($port in ($parsedPorts | Sort-Object -Unique)) {
    $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($listener in $listeners) {
        $processName = 'unknown'
        try {
            $processName = (Get-Process -Id $listener.OwningProcess -ErrorAction Stop).ProcessName
        } catch {
            $processName = 'unknown'
        }

        $busy += [pscustomobject]@{
            Port = $port
            PID = $listener.OwningProcess
            Process = $processName
        }
    }
}

if ($busy.Count -gt 0) {
    Write-Host 'ERROR: One or more required ports are already occupied.' -ForegroundColor Red
    $busy | Sort-Object Port, PID -Unique | Format-Table -AutoSize
    Write-Host ''
    Write-Host 'Close the old Wuwa Backend/Frontend windows or stop the listed processes, then run start-dev.bat again.' -ForegroundColor Yellow
    Write-Host 'If you intentionally want to reuse existing services, set ALLOW_OCCUPIED_PORTS=1 before running.' -ForegroundColor Yellow
    exit 1
}

exit 0
