@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto no_node

where npm >nul 2>nul
if errorlevel 1 goto no_npm

if exist "node_modules\electron\dist\electron.exe" goto run_app

echo Installing project dependencies (this only happens once)...
call npm.cmd install --omit=dev
if errorlevel 1 goto install_failed

:run_app
echo Starting Karyadhara...
call npm.cmd start
goto :eof

:no_node
echo Node.js is required. Install Node.js and try again.
exit /b 1

:no_npm
echo npm is required. Install Node.js with npm and try again.
exit /b 1

:install_failed
echo Dependency installation failed.
exit /b 1
