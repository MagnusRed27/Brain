@echo off
setlocal
title NeuroForge - Preview built bundle
cd /d "%~dp0"

if not exist "dist\index.html" (
    echo.
    echo  No dist\ folder found. Run build.bat first.
    echo.
    pause
    exit /b 1
)

echo.
echo  Preview production bundle at http://127.0.0.1:4173
echo.
start "" /min cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:4173"
call npm.cmd run preview
pause
endlocal
