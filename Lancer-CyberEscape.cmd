@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js est necessaire. Voir docs/GUIDE-ENSEIGNANT.md.
  pause
  exit /b 1
)
echo Ouvrez http://127.0.0.1:8080 dans votre navigateur.
node server.js
pause
