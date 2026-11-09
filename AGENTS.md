# Mis Tareas — Electron

App de escritorio Windows (Electron) para gestionar tareas, 100 % sin conexión.
La fuente de la interfaz sigue siendo un único `src/index.html` sin compilación;
el backend está en el proceso principal de Electron (`electron/main.js`).
Interfaz, comentarios, nombres de comandos y mensajes de error en español: mantenlo así.

## Comandos
- `npm install` — una sola vez. Las `devDependencies` incluyen Electron y `electron-builder`.
- `npm run inicio` — `electron .`, lanza la app en modo desarrollo (lógico): ventana + bandeja + datos reales.
- `npm run instalador` — genera el instalador NSIS en `dist/Mis Tareas Setup <versión>.exe` (`electron-builder --win nsis`). No requiere admin ni MSVC.
- `npm run vendor` — regenera `src/vendor` (módulos `@tauri-apps/*`) tras actualizarlos; solo hace falta para la variante Tauri.
- `npm run pwa` — servidor local en `http://localhost:8088` para la PWA (carpeta `src/`); instalable desde el navegador (Edge/Chrome → «Instalar aplicación»). Funciona 100 % offline con el service worker.
- No hay pruebas, linter, typecheck ni CI. La verificación real: `npm run inicio` y probar la app.
- El directorio SÍ es repositorio git (`main`, remoto `origin` en GitHub). `git diff`/`git log` sí funcionan.
  Ignorados: `node_modules/`, `dist/`, `src-tauri/target|gen`, `.openchamber/`, `.playwright-mcp/`.

## Arquitectura
- `src/index.html` contiene TODO el frontend (CSS, HTML y JS en línea, ~1.790 líneas). Sin módulos ni empaquetador; sin CDNs ni fuentes externas.
- `electron/main.js` (proceso principal) registra por IPC el mismo contrato de comandos que tenía el backend Rust de Tauri: `cargar_tareas`, `guardar_tareas`, `crear_backup_manual`, `obtener_carpeta_datos`, `listar_backups`, `restaurar_backup`, `mostrar_notificacion`, `backup_diario`, `abrir_carpeta`, más `guardar_archivo_dialogo` y `abrir_archivo_dialogo` (exportar/importar con diálogo nativo).
- `electron/preload.js` expone `window.__TAURI_INTERNALS__.invoke(comando, argumentos)` y `window.misTareasElectron`, para que `index.html` detecte Electron (`esElectron`) y llame por IPC sin cambios de nombre.
- El frontend distingue tres modos: `esElectron` (preload), `esTauri` (`__TAURI_INTERNALS__` + imports desde `src/vendor` vía import map) y navegador (fallback `localStorage`).
- Datos en `Documentos/MisTareas/mis-tareas.json` (array JSON plano) + `backups/` (pre-guardado: últimos 20; diarios: últimos 7). Las rutas se deciden solo en `carpetaDatos()` de `electron/main.js`.
- `normalizar()` en `index.html` es la capa de esquema/migración: todo lo que entra (disco, importación, localStorage) pasa por ahí. `estado`: `pendiente|progreso|pausada|completada`; `prioridad`: `alta|media|baja`; `recur`: `no|diaria|semanal|mensual`; fechas `AAAA-MM-DD`, recordatorio ISO.
- El backend nunca interpreta el contenido de las tareas: solo transporta y copia JSON, todo el dominio del esquema vive en `normalizar()`/`guardar()` del frontend.
- PWA (`npm run pwa`, `scripts/pwa.mjs`): `src/manifest.webmanifest` + `src/sw.js` precachean `index.html`, iconos `src/icon-*.png` y vendor. El SW solo se registra fuera de Electron (modo navegador); si cambias assets, sube la versión del caché (ahora `mis-tareas-v3`) en `sw.js`.
- Tema claro/oscuro: solo variables CSS; override en `:root[data-tema="oscuro"]`, toggle `btnTema` en la barra, persistido en localStorage (`mis-tareas-tema`). No añadir colores fijos `#fff` en CSS nuevo: usar `var(--tarjeta)`/`var(--fondo)`.
- Extras por tarjeta: duplicar (`duplicarTarea`, inserta la copia debajo, reinicia estado/crono/subtareas), cronómetro (`t.cronometro:{segundos,activo}`, creado en `normalizar()`; un solo reloj vivo a la vez; tick con setInterval que actualiza solo `[data-crono]` y persiste cada 15 s). En marcha: la insignia lleva clase `.vivo` (punto que late `.crono-dot` + leyenda «en marcha») y el botón cambia a `.pausa` con clase `vivo`.
- Aire del pie: el hueco bajo los botones se hace con `padding-bottom` de `.contenedor` (90px), NO con `margin-bottom` del pie ni `padding-bottom` del `body` (con `html,body{height:100%}` y `box-sizing:border-box` ese margen no aparece al hacer scroll).
- Selección múltiple: `btnSeleccionar` → casillas `.t-check` (visibles con `body.seleccionando`), barra flotante `#barraSel` para mover estado o borrar en lote; el borrado masivo se deshace desde el toast (`undoLotePendiente`). Esc también sale del modo.
- Exportar CSV (`btnCsv`, `templeCSV()`): separador `;`, BOM `\ufeff`, comillas escapadas; el diálogo nativo de Electron acepta `filtros` opcionales en `guardar_archivo_dialogo`. La importación sigue siendo solo JSON.
- PDF: al imprimir aparece `#impCabecera` (título + fecha vía evento `beforeprint`); el pie de pantalla va oculto en `@media print`.
- Gráfico semanal en Estadísticas: `renderGraficoSemana()` (SVG, completadas por día de los últimos 14 días usando `completadaEl`).
- Tres vistas: `kanban|lista|calendario` (`vistaCalendario` en la barra, Ctrl+3). El calendario permite arrastrar tareas entre días (y a «Sin fecha»); al mover, el recordatorio sigue a la nueva fecha. La vista elegida se guarda en localStorage (`mis-tareas-vista`). Regla del formulario: el recordatorio no puede ser posterior a la fecha límite (error inline, bloquea guardar).
- Iconos de ventana/bandeja: `src-tauri/icons/icon.ico` (compartidos con la variante Tauri; si cambia, regenerar los tamaños).

## Trampas conocidas
- El cierre con la X oculta la ventana a la bandeja (nunca cierra). Salida real: bandeja → Salir. En pruebas automatizadas, cierra con la app mandando `saliendo` vía menú o matando el proceso.
- Los comandos IPC van con argumentos en camelCase (`{ rutaBackup }`) aunque vengan del frontend en camelCase también — no renombrar unilateralmente: el frontend y `main.js` deben quedar sincronizados.
- `package.json` NO tiene `"type": "module"` a propósito: `electron/main.js` y `preload.js` usan `require()`. Si se restaura `"type":"module"`, renombra esos archivos a `.cjs`.
- El sandbox está activo (`sandbox: true`) y `nodeIntegration: false`; el preload solo puede usar `contextBridge`/`ipcRenderer`. No expongas `fs` entero al frontend.
- La versión se sube en `package.json` y aparece en el nombre del instalador NSIS.
- `electron-builder` descarga binarios en el primer `instalador` (tarda la primera vez).
- No editar `mis-tareas-pc.zip` (copia histórica de la variante Tauri).

## Referencias
- `SPEC.md` — especificación del producto: propósito, arquitectura, contrato de comandos IPC, esquema de datos, funcionalidad y reglas.
- `README.md` — requisitos históricos de la variante Tauri, rutas de datos, atajos (siguen válidos) y solución de problemas.
- `AGENTS.md` heredado de la variante Tauri: `src-tauri/`, `npm run dev/build` ya NO son el camino principal; `npm run inicio` es el camino de desarrollo.
