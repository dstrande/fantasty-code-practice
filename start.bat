@echo off
rem Start Fantasy Code: installs dependencies on first run, then opens the app in your browser.
rem Close this window (or press Ctrl+C) to stop the server.

cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or not on PATH. Get it from https://nodejs.org
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies, first run only...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

call npm run dev -- --open
pause
