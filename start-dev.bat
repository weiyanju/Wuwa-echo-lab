@echo off
setlocal EnableExtensions

rem Wuwa local development launcher.
rem Starts Django backend and Vite frontend against a local PostgreSQL database.
rem
rem Usage:
rem   start-dev.bat
rem   start-dev.bat --check
rem
rem Optional environment overrides before running:
rem   set SKIP_INSTALL=1
rem   set SKIP_MIGRATE=1
rem   set DB_NAME=wuwa_dev
rem   set DB_USER=PostgreSQL
rem   set DB_PASSWORD=root
rem   set DB_HOST=127.0.0.1
rem   set DB_PORT=5432
rem   set BACKEND_PORT=8001
rem   set POSTGRES_BIN=D:\path\to\pgsql\bin
rem   set PGDATA=D:\path\to\pgdata
rem   set POSTGRES_SERVICE_NAME=postgresql-x64-16
rem   set START_POSTGRES_SERVICE=0
rem   set ENSURE_POSTGRES_DB=0
rem   set ALLOW_OCCUPIED_PORTS=1
rem   set NO_PAUSE=1

cd /d "%~dp0"

set "ROOT=%~dp0"
set "ROOT_DIR=%ROOT:~0,-1%"
set "BACKEND_DIR=%ROOT%Wuwa"
set "FRONTEND_DIR=%ROOT%WuwaFrontend"
set "SCRIPTS_DIR=%ROOT%scripts"
set "CHECK_PORTS_SCRIPT=%SCRIPTS_DIR%\check-service-ports.ps1"
set "ENSURE_POSTGRES_SCRIPT=%SCRIPTS_DIR%\ensure-postgres-dev-db.ps1"
set "FIND_POSTGRES_BIN_SCRIPT=%SCRIPTS_DIR%\find-postgres-bin.ps1"
set "PYTHON=%BACKEND_DIR%\.venv\Scripts\python.exe"
set "NODE_DIR=%ROOT%.tools\node"
set "NPM=%NODE_DIR%\npm.cmd"
set "NPM_CACHE=%ROOT%.tools\npm-cache"

if not defined DB_NAME set "DB_NAME=wuwa_dev"
if not defined DB_USER set "DB_USER=PostgreSQL"
if not defined DB_PASSWORD set "DB_PASSWORD=root"
if not defined DB_ADMIN_USER set "DB_ADMIN_USER=postgres"
if not defined DB_HOST set "DB_HOST=127.0.0.1"
if not defined DB_PORT set "DB_PORT=5432"
if not defined DB_CONN_MAX_AGE set "DB_CONN_MAX_AGE=60"
if not defined BACKEND_HOST set "BACKEND_HOST=127.0.0.1"
if not defined BACKEND_PORT set "BACKEND_PORT=8001"
if not defined FRONTEND_HOST set "FRONTEND_HOST=127.0.0.1"
if not defined FRONTEND_PORT set "FRONTEND_PORT=5173"
if not defined SKIP_INSTALL set "SKIP_INSTALL=0"
if not defined SKIP_MIGRATE set "SKIP_MIGRATE=0"
if not defined ALLOW_OCCUPIED_PORTS set "ALLOW_OCCUPIED_PORTS=0"
if not defined START_POSTGRES_SERVICE set "START_POSTGRES_SERVICE=1"
if not defined ENSURE_POSTGRES_DB set "ENSURE_POSTGRES_DB=1"
if not defined PGDATA set "PGDATA=%ROOT%.tools\pgdata"
if not defined PGLOG set "PGLOG=%ROOT%.tools\pg.log"

if /I not "%DB_HOST%"=="127.0.0.1" if /I not "%DB_HOST%"=="localhost" (
    echo ERROR: start-dev.bat only supports PostgreSQL on 127.0.0.1 or localhost.
    echo Use deployment-specific configuration instead of the local launcher for remote hosts.
    goto fail
)

if not defined POSTGRES_BIN (
    for /f "usebackq delims=" %%P in (`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%FIND_POSTGRES_BIN_SCRIPT%" -Root "%ROOT_DIR%"`) do set "POSTGRES_BIN=%%P"
)

if defined POSTGRES_BIN (
    set "PG_CTL=%POSTGRES_BIN%\pg_ctl.exe"
    set "INITDB=%POSTGRES_BIN%\initdb.exe"
    set "PSQL=%POSTGRES_BIN%\psql.exe"
) else (
    set "PG_CTL="
    set "INITDB="
    set "PSQL="
)

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

if not exist "%ENSURE_POSTGRES_SCRIPT%" (
    echo ERROR: PostgreSQL database helper was not found at "%ENSURE_POSTGRES_SCRIPT%".
    goto fail
)

if not exist "%FIND_POSTGRES_BIN_SCRIPT%" (
    echo ERROR: PostgreSQL bin finder was not found at "%FIND_POSTGRES_BIN_SCRIPT%".
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

if defined POSTGRES_BIN (
    if not exist "%PG_CTL%" (
        echo ERROR: pg_ctl.exe was not found at "%PG_CTL%".
        goto fail
    )

    if not exist "%INITDB%" (
        echo ERROR: initdb.exe was not found at "%INITDB%".
        goto fail
    )

    if not exist "%PSQL%" (
        echo ERROR: psql.exe was not found at "%PSQL%".
        goto fail
    )
)

set "CAN_USE_BUNDLED_POSTGRES=0"
if defined PG_CTL if exist "%PG_CTL%" set "CAN_USE_BUNDLED_POSTGRES=1"

if "%CHECK_ONLY%"=="1" (
    echo Node version:
    "%NODE_DIR%\node.exe" --version
    echo npm version:
    call "%NPM%" --version
    if defined POSTGRES_BIN (
        echo PostgreSQL bin:
        echo %POSTGRES_BIN%
    ) else (
        echo PostgreSQL bin: not found. Set POSTGRES_BIN or ENSURE_POSTGRES_DB=0 before full startup.
    )
    echo.
    echo Check complete. No services were started.
    goto end
)

if "%ALLOW_OCCUPIED_PORTS%"=="0" (
    echo Checking service ports...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%CHECK_PORTS_SCRIPT%" -Ports %BACKEND_PORT%,%FRONTEND_PORT%
    if errorlevel 1 goto fail
)

if "%START_POSTGRES_SERVICE%"=="1" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$hostName='%DB_HOST%'; $port=%DB_PORT%; try { $client=[Net.Sockets.TcpClient]::new(); $connect=$client.BeginConnect($hostName,$port,$null,$null); if ($connect.AsyncWaitHandle.WaitOne(750) -and $client.Connected) { $client.Close(); exit 0 }; $client.Close(); exit 1 } catch { exit 1 }"
    if errorlevel 1 (
        if "%CAN_USE_BUNDLED_POSTGRES%"=="1" (
            if not exist "%PGDATA%\PG_VERSION" (
                echo Initializing bundled PostgreSQL...
                call "%INITDB%" -D "%PGDATA%" -U "%DB_ADMIN_USER%" --auth=trust --encoding=UTF8
                if errorlevel 1 goto fail
            )

            echo Starting bundled PostgreSQL...
            call "%PG_CTL%" -D "%PGDATA%" -l "%PGLOG%" -o "-h %DB_HOST% -p %DB_PORT%" start
            if errorlevel 1 goto fail
        ) else (
            echo Checking local PostgreSQL service...
            powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$hostName='%DB_HOST%'; $port=%DB_PORT%; $serviceName='%POSTGRES_SERVICE_NAME%'; $canConnect = { try { $client=[Net.Sockets.TcpClient]::new(); $connect=$client.BeginConnect($hostName,$port,$null,$null); if ($connect.AsyncWaitHandle.WaitOne(750) -and $client.Connected) { $client.Close(); return $true }; $client.Close(); return $false } catch { return $false } }; if (& $canConnect) { exit 0 }; if ([string]::IsNullOrWhiteSpace($serviceName)) { $service = Get-Service | Where-Object { $_.Name -match 'postgres|pgsql' -or $_.DisplayName -match 'Postgre|Postgres|pgsql' } | Select-Object -First 1 } else { $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue }; if (-not $service) { exit 2 }; if ($service.Status -ne 'Running') { Start-Service -Name $service.Name }; $deadline=(Get-Date).AddSeconds(20); do { if (& $canConnect) { exit 0 }; Start-Sleep -Seconds 1 } while ((Get-Date) -lt $deadline); exit 1"
            if errorlevel 2 (
                echo No local PostgreSQL Windows service was found to start automatically.
            ) else (
                if errorlevel 1 echo Local PostgreSQL service was found but did not open %DB_HOST%:%DB_PORT% in time.
            )
        )
    )
)

echo Waiting for PostgreSQL on %DB_HOST%:%DB_PORT%...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$hostName='%DB_HOST%'; $port=%DB_PORT%; $deadline=(Get-Date).AddSeconds(45); do { try { $client=[Net.Sockets.TcpClient]::new(); $connect=$client.BeginConnect($hostName,$port,$null,$null); if ($connect.AsyncWaitHandle.WaitOne(1000) -and $client.Connected) { $client.Close(); exit 0 }; $client.Close() } catch {}; Start-Sleep -Seconds 1 } while ((Get-Date) -lt $deadline); exit 1"
if errorlevel 1 (
    echo ERROR: PostgreSQL did not become ready in 45 seconds.
    echo Check DB_HOST, DB_PORT, and your local PostgreSQL service.
    echo Current database user is "%DB_USER%"; update DB_USER before running if your local role name differs.
    goto fail
)

if "%ENSURE_POSTGRES_DB%"=="1" (
    if not defined PSQL (
        echo ERROR: psql.exe was not found automatically.
        echo Install PostgreSQL client tools, set POSTGRES_BIN, or set ENSURE_POSTGRES_DB=0.
        goto fail
    )

    if not exist "%PSQL%" (
        echo ERROR: psql.exe was not found at "%PSQL%".
        echo Set POSTGRES_BIN to your PostgreSQL bin directory, or set ENSURE_POSTGRES_DB=0.
        goto fail
    )

    echo Ensuring PostgreSQL role and database...
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ENSURE_POSTGRES_SCRIPT%" -PsqlPath "%PSQL%" -HostName "%DB_HOST%" -Port %DB_PORT% -AdminUser "%DB_ADMIN_USER%" -User "%DB_USER%" -Password "%DB_PASSWORD%" -Database "%DB_NAME%"
    if errorlevel 1 goto fail
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
start "Wuwa Frontend" powershell.exe -NoExit -NoProfile -ExecutionPolicy Bypass -Command "Set-Location '%FRONTEND_DIR%'; $env:PATH='%NODE_DIR%;' + $env:PATH; $env:npm_config_cache='%NPM_CACHE%'; $env:VITE_BACKEND_TARGET='http://%BACKEND_HOST%:%BACKEND_PORT%'; & '%NPM%' run dev -- --host %FRONTEND_HOST% --port %FRONTEND_PORT%"

echo.
echo Startup complete.
echo Backend health: http://%BACKEND_HOST%:%BACKEND_PORT%/api/health/
echo Frontend:       http://%FRONTEND_HOST%:%FRONTEND_PORT%/
echo.
echo Close the "Wuwa Backend" and "Wuwa Frontend" windows to stop services.
goto end

:fail
echo.
echo Startup failed.
echo Review the error above, then run:
echo   start-dev.bat --check
echo.
if not "%NO_PAUSE%"=="1" pause
exit /b 1

:end
endlocal
exit /b 0
