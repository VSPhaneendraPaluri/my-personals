@echo off
setlocal

cd /d "%~dp0"

echo Removing generated dependencies, builds, and caches...
for %%D in (
    "node_modules"
    "build"
    "dist"
    "coverage"
    ".cache"
    ".vite"
    ".parcel-cache"
    ".turbo"
    "tmp"
    "temp"
) do (
    if exist "%%~D" (
        rmdir /s /q "%%~D"
        if exist "%%~D" (
            echo Failed to remove %%~D.
            exit /b 1
        )
    )
)

echo Removing temporary files...
for /r %%F in (*.log *.tmp *.temp *.bak *.old *.orig *.swp *.swo *.pid *.stackdump *.tsbuildinfo npm-debug.log*) do (
    if exist "%%F" del /f /q "%%F"
)
for /r %%F in (.eslintcache .stylelintcache .DS_Store Thumbs.db) do (
    if exist "%%F" del /f /q "%%F"
)

echo Cleanup complete. Source files and Git metadata were not removed.
exit /b 0
