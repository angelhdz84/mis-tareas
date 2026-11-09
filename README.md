# 📋 Mis Tareas — App de escritorio para Windows (100% local)

Aplicación de escritorio para gestionar tus tareas, 100 % sin conexión.
Todo se guarda en tu PC, sin internet, sin servidores, sin cuentas.

> **Estado actual del motor**: la app corre sobre **Electron** (`npm run inicio`, instalador con
> `npm run instalador`). Existen además la variante **Tauri 2** (`src-tauri/`, secciones abajo) y la
> **PWA local** (`npm run pwa`). El frontend es el mismo `src/index.html` en los tres casos.
> Convenciones y trampas del repo: `AGENTS.md`. Especificación del producto: `SPEC.md`.

---

## ✨ Características

- **Vistas Kanban y Lista** con arrastrar y soltar entre columnas.
- **Tareas** con título, descripción, prioridad, fecha límite, recordatorio, etiquetas libres y subtareas.
- **Recurrencias** (diaria, semanal, mensual): al completar una tarea se crea automáticamente la siguiente.
- **Bandeja del sistema** con icono propio: clic izquierdo muestra/oculta la ventana; menú contextual con backup y salir.
- **Cierre inteligente**: al pulsar la X la ventana se minimiza a la bandeja (no se cierra).
- **Notificaciones nativas de Windows** para recordatorios.
- **Almacenamiento en archivo JSON** en `Documentos/MisTareas/mis-tareas.json`.
- **Backup automático diario** en `Documentos/MisTareas/backups/` (conserva los últimos 7 días).
- **Backup automático antes de cada guardado** (conserva los últimos 20).
- **Gestor de backups** desde la interfaz para restaurar copias con un clic.
- **Exportar/Importar** JSON manualmente para llevar tus tareas a otro PC.
- **Exportar a PDF** imprimiendo la lista actual.
- **Atajos de teclado** completos (ver abajo).
- **Diseño sobrio** estilo app moderna de PC, sin gradientes vibrantes.
- **Icono propio** (reloj + check) en la ventana, la barra de tareas y la bandeja.

---

## 📁 Estructura del proyecto

```
mis-tareas-pc/
├── package.json              ← Dependencias npm (Tauri)
├── README.md                 ← Este archivo
├── instalar.bat              ← Script: instala dependencias
├── construir.bat             ← Script: compila y genera instalador
├── ejecutar.bat              ← Script: lanza en modo desarrollo
├── src/
│   └── index.html            ← App completa (HTML+CSS+JS, sin dependencias externas)
└── src-tauri/
    ├── Cargo.toml            ← Dependencias Rust
    ├── build.rs              ← Script de build de Tauri
    ├── tauri.conf.json       ← Configuración de la app (ventana, bandeja, icono, instalador)
    ├── capabilities/
    │   └── default.json      ← Permisos de la app
    ├── icons/
    │   ├── icon.ico          ← Icono Windows (multi-resolución)
    │   ├── icon.png          ← Icono 512×512
    │   ├── 128x128.png
    │   ├── 128x128@2x.png
    │   └── 32x32.png
    └── src/
        └── main.rs           ← Backend Rust (cargar/guardar, backups, notificaciones, bandeja)
```

---

## 🚀 Requisitos previos (instalar una sola vez en tu PC)

Antes de compilar necesitas tener instalado lo siguiente en tu Windows:

### 1. **Microsoft Visual Studio C++ Build Tools** (para compilar Rust)
- Descarga: <https://visualstudio.microsoft.com/visual-cpp-build-tools/>
- En el instalador marca **"Desarrollo para el escritorio con C++"**.
- Tamaño aproximado: ~6 GB.

### 2. **Rust** (compilador del lenguaje Rust)
- Descarga: <https://www.rust-lang.org/tools/install>
- Ejecuta `rustup-init.exe` y deja todas las opciones por defecto.
- Verifica con: `rustc --version` (debe ser ≥ 1.70).

### 3. **Node.js** (para npm y Tauri CLI)
- Descarga: <https://nodejs.org/> (versión LTS, ≥ 18).
- Verifica con: `node --version` y `npm --version`.

### 4. **WebView2 Runtime** (ya viene preinstalado en Windows 10/11)
- Si tienes Windows 10/11 actualizado, ya lo tienes.
- Si no: <https://developer.microsoft.com/microsoft-edge/webview2/>

> **Importante**: tras instalar Rust y Node, **cierra y vuelve a abrir** la terminal para que los cambios surtan efecto.

---

## 🛠️ Compilar la aplicación (paso a paso)

### Opción A — Con los scripts `.bat` (recomendado)

1. Descomprime este proyecto en una carpeta, por ejemplo `C:\Users\TU_USUARIO\mis-tareas-pc`.
2. Abre una terminal (PowerShell o CMD) en esa carpeta.
3. Ejecuta:
   ```bat
   instalar.bat
   ```
   Esto descargará todas las dependencias de npm y las dependencias de Rust (la primera vez tarda 10-20 minutos; las siguientes serán mucho más rápidas).

4. Cuando termine, ejecuta:
   ```bat
   construir.bat
   ```
   Esto compilará la app en modo release y generará el instalador.

5. El instalador aparecerá en:
   ```
   src-tauri\target\release\bundle\
   ```
   - Subcarpeta `nsis\` → `Mis Tareas_1.0.0_x64-setup.exe` (instalador recomendado).
   - Subcarpeta `msi\` → `Mis Tareas_1.0.0_x64_en-US.msi` (alternativa MSI).

### Opción B — Con comandos manuales

```bat
:: 1. Instalar dependencias
npm install

:: 2. Compilar en modo desarrollo (lanza la app para probar)
npm run dev

:: 3. Compilar instalador release
npm run build
```

---

## 🧪 Modo desarrollo

Para probar la app mientras modificas el HTML:

```bat
npm run dev
```

Se abre la ventana inmediatamente con la app. Los cambios en `src/index.html` se reflejan recargando (F5 o cerrando y abriendo).

---

## 🎹 Atajos de teclado

| Atajo | Acción |
|---|---|
| `Ctrl + N` | Nueva tarea |
| `Ctrl + F` | Enfocar el buscador |
| `Ctrl + E` | Exportar tareas a JSON |
| `Ctrl + I` | Importar tareas desde JSON |
| `Ctrl + P` | Exportar a PDF (imprimir) |
| `Ctrl + T` | Abrir estadísticas |
| `Ctrl + B` | Abrir gestor de backups |
| `Ctrl + 1` | Vista Kanban |
| `Ctrl + 2` | Vista Lista |
| `Ctrl + Enter` | Guardar formulario (cuando está abierto) |
| `Esc` | Cerrar diálogo / enfocar entrada rápida |

---

## 💾 Dónde se guardan tus datos

```
C:\Users\TU_USUARIO\Documents\MisTareas\
├── mis-tareas.json           ← Archivo principal de tareas
└── backups\
    ├── mis-tareas_diario_2026-11-09.json     ← Backups diarios automáticos (últimos 7)
    ├── mis-tareas_2026-11-09_15-30-00.json   ← Backup antes de cada guardado (últimos 20)
    └── mis-tareas_manual_2026-11-09_16-00-00.json  ← Backups manuales
```

> Si tu carpeta `Documents` está en OneDrive, la app se ajustará automáticamente. Para abrir la carpeta desde la app, pulsa **«📁 Abrir carpeta»** en el pie.

---

## 🔔 Activar las notificaciones

La primera vez, pulsa el botón **«🔔 Avisos»** en la barra de controles. Windows te pedirá permiso; acepta. A partir de ahí, las notificaciones de recordatorios aparecerán nativamente.

Si no las activas, los recordatorios seguirán funcionando internamente pero solo verás el toast dentro de la app.

---

## 🪟 Bandeja del sistema

- **Cierre con X** → la ventana se oculta a la bandeja (la app sigue corriendo).
- **Clic izquierdo en el icono de la bandeja** → muestra/oculta la ventana.
- **Clic derecho en el icono** → menú con:
  - **Mostrar ventana**
  - **Crear backup ahora**
  - **Salir** (cierra de verdad la app)

---

## 📦 Tamaño de la app compilada

- Instalador NSIS: ~5-7 MB
- App instalada: ~10-15 MB (mucho más ligera que Electron)
- Memoria RAM en uso: ~80-120 MB

---

## 🔄 Migración desde la versión web anterior

La app detecta automáticamente tus tareas anteriores guardadas en `localStorage` del navegador **solo si abres `src/index.html` con un navegador en el mismo equipo**. Para migrarlas a la versión de escritorio:

1. Abre tu versión web anterior en el navegador.
2. Pulsa **«⬇ Exportar»** y guarda el JSON.
3. Abre Mis Tareas (versión escritorio).
4. Pulsa **«⬆ Importar»** y selecciona el JSON.

---

## 🆘 Solución de problemas

### "rustc: command not found" o "cargo: command not found"
- Cierra y vuelve a abrir la terminal tras instalar Rust.
- Verifica con `rustc --version`.

### Error de build de MSVC o "link.exe not found"
- Falta instalar **Visual Studio C++ Build Tools** con la opción "Desarrollo para el escritorio con C++".

### "Error: failed to run custom build command for `webview2-com`"
- Verifica que tienes WebView2 Runtime instalado (Windows 10/11 ya lo trae).
- Descarga: <https://developer.microsoft.com/microsoft-edge/webview2/>

### La ventana se abre en blanco
- Revisa la consola de desarrollo con F12.
- Asegúrate de que `src/index.html` existe y tiene contenido.

### Las notificaciones no aparecen
- Pulsa el botón «🔔 Avisos» y acepta el permiso.
- En Windows: Ajustes → Sistema → Notificaciones → asegúrate de que las notificaciones de apps están activadas.

### Quiero cambiar la carpeta donde se guardan los datos
- Edita `src-tauri/src/main.rs`, función `carpeta_datos`, y cambia `dirs::document_dir()` por otra ruta.

---

## 📝 Licencia

MIT — usa, modifica y distribuye libremente.

---

## 🙌 Créditos

- **Tauri** — Framework de apps de escritorio ligeras: <https://tauri.app>
- **Icono** — Reloj + check, diseñado específicamente para esta app.
- Idea original: app web "Mis Tareas v2".

