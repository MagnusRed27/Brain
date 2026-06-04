@echo off
setlocal
title NeuroForge Cortex v4.7
cd /d "%~dp0"

echo.
echo  ==============================================
echo    NeuroForge Lumen / Cortex v4.7
echo    premium neuro-lab cognitive trainer
echo  ==============================================
echo.

REM Check dependencies
if not exist "node_modules\vite\package.json" goto INSTALL
goto RUN

:INSTALL
echo  [1/2] node_modules missing - installing dependencies...
echo.
call npm.cmd install
if errorlevel 1 goto NPM_FAIL
echo.
echo  Dependencies installed.
echo.
goto RUN

:RUN
echo  [2/2] Starting dev server at http://127.0.0.1:5173
echo.
echo  -----------------------------------------------
echo    Open:  http://127.0.0.1:5173
echo    Stop:  Ctrl+C in this window
echo  -----------------------------------------------
echo.
start "" /min cmd /c "timeout /t 2 /nobreak >nul && start http://127.0.0.1:5173"
call npm.cmd run dev
goto END

:NPM_FAIL
echo.
echo  ERROR: npm install failed.
echo  Check that Node.js is installed:  node -v
echo.
pause
exit /b 1

:END
echo.
echo  Server stopped.
pause
endlocal
