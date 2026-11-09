@echo off
chcp 65001 >nul
title Mis Tareas - Modo desarrollo
color 0E

echo.
echo ============================================================
echo   MIS TAREAS - Modo desarrollo
echo ============================================================
echo.
echo Se abrira la ventana de Mis Tareas en modo desarrollo.
echo Pulsa Ctrl+C en esta terminal para cerrarla.
echo.

:: Cambiar al directorio del script
cd /d "%~dp0"

:: Verificar que node_modules existe
if not exist "node_modules" (
    echo [AVISO] node_modules no existe. Ejecutando npm install primero...
    call npm install
)

call npm run dev
pause
