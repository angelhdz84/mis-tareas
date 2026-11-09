@echo off
title Mis Tareas (PWA)

rem Lanzador de doble clic: abre Mis Tareas como app (sin barras del navegador).
rem Arranca el servidor local solo si no esta ya corriendo; usa Chrome o Edge.

cd /d "%~dp0"

rem Servidor ya activo en el puerto 8088?
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 8088 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>nul
if errorlevel 1 (
    start "Mis Tareas PWA" /MIN cmd /c "npm run pwa"
    timeout /t 2 /nobreak >nul
)

rem Elegir navegador disponible (Chrome primero, si no Edge)
set "NAVEGADOR="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "NAVEGADOR=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined NAVEGADOR if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "NAVEGADOR=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined NAVEGADOR if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "NAVEGADOR=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

if not defined NAVEGADOR (
    echo [ERROR] No se encontro Chrome ni Edge. Instala uno de los dos.
    pause
    exit /b 1
)

start "" "%NAVEGADOR%" --app=http://127.0.0.1:8088/
exit /b 0
