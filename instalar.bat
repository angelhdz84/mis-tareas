@echo off
chcp 65001 >nul
title Mis Tareas - Instalacion de dependencias
color 0A

echo.
echo ============================================================
echo   MIS TAREAS - Instalacion de dependencias
echo ============================================================
echo.
echo Este script descargara todas las dependencias necesarias
echo para compilar la aplicacion. La PRIMERA vez tarda entre
echo 10 y 20 minutos (descarga Rust crates y paquetes npm).
echo.

:: Verificar Node.js
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No se encontro Node.js. Instalalo desde https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo [OK] Node.js: %NODE_VER%

:: Verificar Rust
where cargo >nul 2>nul
if errorlevel 1 (
    echo [ERROR] No se encontro Rust/cargo. Instalalo desde https://www.rust-lang.org/tools/install
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('rustc --version') do set RUST_VER=%%v
echo [OK] Rust: %RUST_VER%
echo.

:: Cambiar al directorio del script
cd /d "%~dp0"

:: Instalar dependencias npm
echo ------------------------------------------------------------
echo [1/2] Instalando dependencias npm...
echo ------------------------------------------------------------
call npm install
if errorlevel 1 (
    echo.
    echo [ERROR] Fallo npm install. Revisa el mensaje de arriba.
    pause
    exit /b 1
)

echo.
echo ------------------------------------------------------------
echo [2/2] Las dependencias de Rust se descargaran automaticamente
echo       la primera vez que ejecutes construir.bat
echo ------------------------------------------------------------
echo.
echo ============================================================
echo   INSTALACION COMPLETADA
echo ============================================================
echo.
echo Siguiente paso: ejecuta construir.bat para generar el
echo instalador .exe de Mis Tareas.
echo.
pause
