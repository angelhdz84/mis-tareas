@echo off
chcp 65001 >nul
title Mis Tareas - Construir instalador
color 0B

echo.
echo ============================================================
echo   MIS TAREAS - Compilar y generar instalador
echo ============================================================
echo.
echo Esto compilara la app en modo release y generara el
echo instalador .exe para Windows. Tarda entre 5 y 15 minutos.
echo.

:: Verificar Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No se encontro Node.js. Ejecuta primero instalar.bat
    pause
    exit /b 1
)

:: Verificar Rust
where cargo >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No se encontro Rust/cargo. Instalalo desde https://www.rust-lang.org/tools/install
    pause
    exit /b 1
)

:: Cambiar al directorio del script
cd /d "%~dp0"

:: Verificar que node_modules existe
if not exist "node_modules" (
    echo [AVISO] node_modules no existe. Ejecutando npm install primero...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Fallo npm install.
        pause
        exit /b 1
    )
)

echo ------------------------------------------------------------
echo Compilando con Tauri (modo release)...
echo ------------------------------------------------------------
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Fallo la compilacion. Revisa los errores arriba.
    echo.
    echo Posibles causas:
    echo   - Falta Visual Studio C++ Build Tools
    echo   - Falta WebView2 Runtime
    echo   - Error de sintaxis en main.rs
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   COMPILACION COMPLETADA
echo ============================================================
echo.
echo El instalador esta en:
echo.
echo   src-tauri\target\release\bundle\nsis\Mis Tareas_1.0.0_x64-setup.exe
echo.
echo Tambien hay un .msi en:
echo   src-tauri\target\release\bundle\msi\
echo.
echo ¿Quieres abrir la carpeta del instalador ahora? (S/N)
set /p abrir=
if /i "%abrir%"=="S" (
    explorer "src-tauri\target\release\bundle\nsis"
)
echo.
pause
