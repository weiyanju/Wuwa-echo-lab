@echo off
setlocal EnableExtensions

rem Wuwa local development launcher.
rem Starts Django backend and Vite frontend against a local PostgreSQL database by default.
rem
rem Usage:
rem   start-dev.bat
rem   start-dev.bat --check
rem
rem Optional environment overrides before running:
rem   set SKIP_INSTALL=1
rem   set SKIP_MIGRATE=1
rem   set DB_NAME=wuwa_dev
rem   set DB_USER=postgres
rem   set DB_PASSWORD=your-password
rem   set DB_HOST=127.0.0.1
rem   set DB_PORT=5432
rem   set DB_USE_SSH_TUNNEL=1
rem   set ALLOW_OCCUPIED_PORTS=1

cd /d "%~dp0"

set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%Wuwa"
set "FRONTEND_DIR=%ROOT%WuwaFrontend"
set "SCRIPTS_DIR=%ROOT%scripts"
set "CHECK_PORTS_SCRIPT=%SCRIPTS_DIR%\check-service-ports.ps1"
set "PYTHON=%BACKEND_DIR%\.venv\Scripts\python.exe"
set "NODE_DIR=%ROOT%.tools\node"
set "NPM=%NODE_DIR%\npm.cmd"
set "NPM_CACHE=%ROOT%.tools\npm-cache"

if not defined KEY_PATH set "KEY_PATH=C:\Users\qifan\Downloads\ssh.pem"
if not defined SSH_USER set "SSH_USER=admin"
if not defined SSH_HOST set "SSH_HOST=47.98.96.128"
if not defined DB_USE_SSH_TUNNEL set "DB_USE_SSH_TUNNEL=0"
if not defined DB_NAME set "DB_NAME=wuwa_dev"
if not defined DB_USER set "DB_USER=postgres"
if not defined DB_PASSWORD set "DB_PASSWORD=root"
if not defined DB_HOST set "DB_HOST=127.0.0.1"
if not defined DB_PORT (
    if "%DB_USE_SSH_TUNNEL%"=="1" (
        set "DB_PORT=15432"
    ) else (
        set "DB_PORT=5432"
    )
)
if not defined DB_CONN_MAX_AGE set "DB_CONN_MAX_AGE=60"
if not defined DB_REMOTE_HOST set "DB_REMOTE_HOST=127.0.0.1"
if not defined DB_REMOTE_PORT set "DB_REMOTE_PORT=5432"
if not defined BACKEND_HOST set "BACKEND_HOST=127.0.0.1"
if not defined BACKEND_PORT set "BACKEND_PORT=8000"
if not defined FRONTEND_HOST set "FRONTEND_HOST=127.0.0.1"
if not defined FRONTEND_PORT set "FRONTEND_PORT=5173"
if not defined SKIP_INSTALL set "SKIP_INSTALL=0"
if not defined SKIP_MIGRATE set "SKIP_MIGRATE=0"
if not defined ALLOW_OCCUPIED_PORTS set "ALLOW_OCCUPIED_PORTS=0"

set "CHECK_ONLY=0"
if /I "%~1"=="--check" set "CHECK_ONLY=1"

set "PATH=%NODE_DIR%;%PATH%"
set "npm_config_cache=%NPM_CACHE%"

echo.
echo === Wuwa local dev launcher ===
echo Root:        %ROOT%
echo Backend:     %BACKEND_DIR%
echo Frontend:    %FRONTEND_DIR%
echo Python:      %PYTHON%
echo Node:        %NODE_DIR%\node.exe
echo npm:         %NPM%
echo Database:    %DB_USER%@%DB_HOST%:%DB_PORT%/%DB_NAME%
echo DB pool:     CONN_MAX_AGE=%DB_CONN_MAX_AGE%
if "%DB_USE_SSH_TUNNEL%"=="1" echo SSH tunnel:  %DB_HOST%:%DB_PORT% -^> %DB_REMOTE_HOST%:%DB_REMOTE_PORT% via %SSH_USER%@%SSH_HOST%
echo Backend URL: http://%BACKEND_HOST%:%BACKEND_PORT%
echo Frontend:    http://%FRONTEND_HOST%:%FRONTEND_PORT%
echo.

if not exist "%BACKEND_DIR%\manage.py" (
    echo ERROR: Django manage.py was not found at "%BACKEND_DIR%\manage.py".
    goto fail
)

if not exist "%PYTHON%" (
    echo ERROR: Backend Python was not found at "%PYTHON%".
    goto fail
)

if not exist "%FRONTEND_DIR%\package.json" (
    echo ERROR: Frontend package.json was not found at "%FRONTEND_DIR%\package.json".
    goto fail
)

if not exist "%CHECK_PORTS_SCRIPT%" (
    echo ERROR: Port checker script was not found at "%CHECK_PORTS_SCRIPT%".
    goto fail
)

if not exist "%NODE_DIR%\node.exe" (
    echo ERROR: Bundled node.exe was not found at "%NODE_DIR%\node.exe".
    goto fail
)

if not exist "%NPM%" (
    echo ERROR: Bundled npm.cmd was not found at "%NPM%".
    goto fail
)

if not exist "%NPM_CACHE%" mkdir "%NPM_CACHE%"

if "%DB_USE_SSH_TUNNEL%"=="1" (
    if not exist "%KEY_PATH%" (
        echo ERROR: SSH private key was not found at "%KEY_PATH%".
        echo Set KEY_PATH before running this script if your key is elsewhere.
        goto fail
    )

    where ssh >nul 2>nul
    if errorlevel 1 (
        echo ERROR: ssh was not found in PATH.
        goto fail
    )
)

if "%CHECK_ONLY%"=="1" (
    echo Node version:
    "%NODE_DIR%\node.exe" --version
    echo npm version:
    call "%NPM%" --version
    echo.
    echo Check complete. No services were started.
    goto end
)

if "%ALLOW_OCCUPIED_PORTS%"=="0" (
    echo Checking service ports...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%CHECK_PORTS_SCRIPT%" -Ports %BACKEND_PORT%,%FRONTEND_PORT%
    if errorlevel 1 goto fail
)

if "%DB_USE_SSH_TUNNEL%"=="1" (
    echo Starting PostgreSQL SSH tunnel window...
    start "Wuwa DB Tunnel" powershell.exe -NoExit -NoProfile -ExecutionPolicy Bypass -Command "$KeyPath='%KEY_PATH%'; $LocalPort=%DB_PORT%; $RemoteHost='%DB_REMOTE_HOST%'; $RemotePort=%DB_REMOTE_PORT%; $SshUser='%SSH_USER%'; $SshHost='%SSH_HOST%'; $RetryDelaySeconds=5; Write-Host ('PostgreSQL tunnel: 127.0.0.1:' + $LocalPort + ' -> ' + $RemoteHost + ':' + $RemotePort + ' via ' + $SshUser + '@' + $SshHost) -ForegroundColor Cyan; Write-Host 'Keep this window open. Press Ctrl+C to stop.' -ForegroundColor Yellow; while ($true) { ssh -i $KeyPath -L ($LocalPort.ToString() + ':' + $RemoteHost + ':' + $RemotePort) -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes ($SshUser + '@' + $SshHost); Write-Host ''; Write-Host ('Tunnel disconnected. Reconnecting in ' + $RetryDelaySeconds + ' seconds...') -ForegroundColor Yellow; Start-Sleep -Seconds $RetryDelaySeconds }"
)

echo Waiting for PostgreSQL on %DB_HOST%:%DB_PORT%...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$hostName='%DB_HOST%'; $port=%DB_PORT%; $deadline=(Get-Date).AddSeconds(45); do { try { $client=[Net.Sockets.TcpClient]::new(); $connect=$client.BeginConnect($hostName,$port,$null,$null); if ($connect.AsyncWaitHandle.WaitOne(1000) -and $client.Connected) { $client.Close(); exit 0 }; $client.Close() } catch {}; Start-Sleep -Seconds 1 } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 (
    echo ERROR: PostgreSQL did not become ready in 45 seconds.
    echo Check DB_HOST, DB_PORT, and your local PostgreSQL service.
    goto fail
)

if "%SKIP_INSTALL%"=="1" (
    echo Skipping dependency install because SKIP_INSTALL=1.
) else (
    echo Installing backend dependencies...
    pushd "%BACKEND_DIR%"
    "%PYTHON%" -m pip install -r requirements.txt
    if errorlevel 1 (
        popd
        goto fail
    )
    popd

    echo Installing frontend dependencies...
    pushd "%FRONTEND_DIR%"
    call "%NPM%" install
    if errorlevel 1 (
        popd
        goto fail
    )
    popd
)

if "%SKIP_MIGRATE%"=="1" (
    echo Skipping Django migrations because SKIP_MIGRATE=1.
) else (
    echo Applying Django migrations...
    pushd "%BACKEND_DIR%"
    "%PYTHON%" manage.py migrate
    if errorlevel 1 (
        popd
        goto fail
    )
    popd
)

echo Starting backend window...
start "Wuwa Backend" powershell.exe -NoExit -NoProfile -ExecutionPolicy Bypass -Command "Set-Location '%BACKEND_DIR%'; $env:DB_NAME='%DB_NAME%'; $env:DB_USER='%DB_USER%'; $env:DB_PASSWORD='%DB_PASSWORD%'; $env:DB_HOST='%DB_HOST%'; $env:DB_PORT='%DB_PORT%'; $env:DB_CONN_MAX_AGE='%DB_CONN_MAX_AGE%'; & '%PYTHON%' manage.py runserver %BACKEND_HOST%:%BACKEND_PORT% --noreload"

echo Starting frontend window...
start "Wuwa Frontend" powershell.exe -NoExit -NoProfile -ExecutionPolicy Bypass -Command "Set-Location '%FRONTEND_DIR%'; $env:PATH='%NODE_DIR%;' + $env:PATH; $env:npm_config_cache='%NPM_CACHE%'; & '%NPM%' run dev -- --host %FRONTEND_HOST% --port %FRONTEND_PORT%"

echo.
echo Startup complete.
echo Backend health: http://%BACKEND_HOST%:%BACKEND_PORT%/api/health/
echo Frontend:       http://%FRONTEND_HOST%:%FRONTEND_PORT%/
echo.
if "%DB_USE_SSH_TUNNEL%"=="1" (
    echo Close the "Wuwa Backend", "Wuwa Frontend", and "Wuwa DB Tunnel" windows to stop services.
) else (
    echo Close the "Wuwa Backend" and "Wuwa Frontend" windows to stop services.
)
goto end

:fail
echo.
echo Startup failed.
echo Review the error above, then run:
echo   start-dev.bat --check
echo.
pause
exit /b 1

:end
endlocal
exit /b 0
