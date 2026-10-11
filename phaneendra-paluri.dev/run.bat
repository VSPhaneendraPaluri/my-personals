@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js is required. Install Node.js and try again.
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo npm is required. Install Node.js with npm and try again.
    exit /b 1
)

where curl.exe >nul 2>nul
if errorlevel 1 (
    echo curl.exe is required to check when the server is ready.
    exit /b 1
)

if not exist "node_modules\vite\bin\vite.js" (
    echo Installing project dependencies...
    call npm.cmd install
    if errorlevel 1 (
        echo Dependency installation failed.
        exit /b 1
    )
)

echo Building the production app...
call npm.cmd run build
if errorlevel 1 (
    echo Build failed. The development server was not started.
    exit /b 1
)

echo Starting the Vite server...
start "Lumina dev server" /B /D "%~dp0" cmd /c "npm.cmd run dev"

echo Waiting for the server to become ready...
set /a attempts=0
:wait_for_server
curl.exe --noproxy "*" --silent --fail --max-time 2 http://127.0.0.1:3000/ >nul 2>nul
if not errorlevel 1 goto server_ready
set /a attempts+=1
if %attempts% GEQ 45 (
    echo The server did not become ready. Check the Lumina dev server window for errors.
    exit /b 1
)
timeout /t 1 /nobreak >nul
goto wait_for_server

:server_ready
start "" "http://localhost:3000"
echo Opened http://localhost:3000 in your default browser.
