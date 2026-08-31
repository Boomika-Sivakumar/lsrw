@echo off
title LSRW Communication AI Launcher
echo ===================================================
echo   LSRW Communication AI - One-Click Launcher
echo ===================================================
echo.

set PATH=C:\Program Files\nodejs;%PATH%

if not exist "%~dp0frontend\dist" (
    echo Building frontend static bundle for first time use...
    cd /d "%~dp0frontend"
    call npm run build
    cd /d "%~dp0"
)

echo Starting Integrated LSRW Application (Backend + Frontend on Port 8000)...
start "LSRW Integrated Server" cmd /k "cd /d %~dp0backend && ..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo.
echo Waiting for server to initialize...
ping -n 4 127.0.0.1 >nul

echo Opening application in your browser...

start http://127.0.0.1:8000/login

echo.
echo ===================================================
echo   Integrated Application is now running!
echo   Unified Application URL: http://127.0.0.1:8000/login
echo   API & Health URL: http://127.0.0.1:8000/api/health
echo ===================================================


