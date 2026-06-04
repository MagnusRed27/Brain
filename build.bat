@echo off
setlocal
title NeuroForge - Production Build
cd /d "%~dp0"

echo.
echo  -- Production build - NeuroForge v4.7 --
echo.

if not exist "node_modules\vite\package.json" (
    echo  Installing dependencies...
    call npm.cmd install
    if errorlevel 1 goto FAIL
)

call npm.cmd run build
if errorlevel 1 goto FAIL

echo.
echo  Done. Artifacts are in  dist\
echo.
echo  To preview, run  preview.bat
echo.
pause
exit /b 0

:FAIL
echo.
echo  Build failed. See errors above.
pause
exit /b 1
