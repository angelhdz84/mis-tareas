# SPEC — Mis Tareas (`mis-tareas-pc`)

## Propósito
App de escritorio para Windows de gestión de tareas personal, 100 % local y sin conexión:
sin internet, sin servidores, sin cuentas, sin CDNs. Un solo usuario, en su propio PC.

## Contexto
- Repo canónico: `F:\REPOSITORIOS GitHUB\Mis_Tareas`
- Motor actual: **Electron** (`electron/main.js` + `electron/preload.js`). La variante **Tauri 2**
  (`src-tauri/`) sigue en el repo como camino alternativo de compilación; el frontend es el mismo.
- Tercer camino: **PWA** servida en local (`npm run pwa`, `http://localhost:8088`), instalable
  desde Edge/Chrome y lanzable con doble clic (`Mis Tareas (PWA).bat` + acceso directo en el Escritorio).
- Datos del usuario: `Documentos/MisTareas/mis-tareas.json` + `backups/`. Nunca se commitean.

## Arquitectura
- `src/index.html` — TODO el frontend (CSS + HTML + JS inline, sin empaquetador ni dependencias
  externas). ~1.800 líneas. Sin frameworks.
- `src/vendor/` + `<script type="importmap">` — copias locales de `@tauri-apps/*` para la variante
  Tauri (`npm run vendor` las regenera).
- `electron/main.js` — proceso principal: ventana + bandeja + IPC. Registra el MISMO contrato de
  comandos que tenía el backend Rust.
- `electron/preload.js` — `contextBridge` con `window.__TAURI_INTERNALS__.invoke()` y
  `window.misTareasElectron`. Sandbox activo, `nodeIntegration: false`.
- Tres modos detectados en el frontend: `esElectron` (preload), `esTauri` (import map + vendor),
  navegador (fallback `localStorage`).
- `normalizar()` es la única capa de esquema: todo lo que entra (disco, importación, localStorage)
  pasa por ahí. El backend nunca interpreta el contenido de las tareas.
- `scripts/pwa.mjs` (servidor local), `scripts/vendor.mjs` (vendor Tauri), `src/sw.js` +
  `src/manifest.webmanifest` + `src/icon-*.png` (PWA offline).

## Contrato de comandos (IPC Electron ≡ comandos Tauri)
`cargar_tareas`, `guardar_tareas`, `crear_backup_manual`, `obtener_carpeta_datos`,
`listar_backups`, `restaurar_backup`, `mostrar_notificacion`, `backup_diario`, `abrir_carpeta`,
`guardar_archivo_dialogo` (acepta `filtros` opcionales para JSON/CSV), `abrir_archivo_dialogo`.
Argumentos en camelCase, sincronizados entre `index.html` y `main.js`: no renombrar unilateralmente.

## Esquema de datos
- `estado`: `pendiente | progreso | pausada | completada`
- `prioridad`: `alta | media | baja`
- `recur`: `no | diaria | semanal | mensual`
- `fecha`: `AAAA-MM-DD`; `recordatorio`: ISO `AAAA-MM-DDTHH:mm`
- `etiquetas`: string[] (color derivado en `coloresTag`, paleta fija)
- `subtareas`: `{ id, texto, hecha }[]`
- `cronometro`: `{ segundos, activo }` (creado por `normalizar()`; nunca se persiste `activo: true`)
- `creadaEl`: number (ms), `completadaEl`: string ISO o `null` (alimenta el gráfico semanal)

## Funcionalidad
- Vistas **Kanban / Lista / Calendario** (Ctrl+1/2/3), con drag & drop entre columnas y entre días;
  al mover en el calendario, el recordatorio sigue al nuevo día. Vista recordada (`mis-tareas-vista`).
- Tema **claro/oscuro** por variables CSS (`:root[data-tema="oscuro"]`), recordado (`mis-tareas-tema`).
- Creación/edición en diálogo modal centrado; entrada rápida con Enter; búsqueda, filtro por etiqueta
  y prioridad, 7 órdenes.
- Validación: el recordatorio **no puede ser posterior** a la fecha límite (error inline, bloquea guardar).
- Subtareas visibles y marcables desde la tarjeta, con barra de progreso.
- **Duplicar** tarea; **selección múltiple** (mover estado / borrar en lote, con deshacer);
  **cronómetro** por tarea con indicador «en marcha».
- **Recurrencias**: al completar se genera la siguiente instancia con fecha avanzada.
- **Estadísticas**: progreso global, tablas por estado/prioridad/etiquetas y **gráfico SVG** de
  completadas por día (últimos 14 días).
- **Backups**: automáticos previos a cada guardado (20) y diarios (7), gestor con restauración,
  apertura de la carpeta de datos.
- **Exportar JSON / CSV** (`;` + BOM, apto para Excel), **importar JSON**, **PDF** con cabecera propia.
- **Notificaciones nativas** de Windows en recordatorios (Electron/Tauri) o Web Notifications (navegador).
- Atajos: `Ctrl+N/F/E/I/P/T/B/1/2/3`, `Ctrl+Enter` guarda, `Esc` cierra diálogos o sale de la selección.

## Reglas clave
- Español en interfaz, comentarios, nombres de comandos y mensajes de error.
- Cero dependencias externas en runtime: nada de CDNs, fuentes remotas ni librerías en el HTML.
- Iconos **SVG inline** (`CAMINOS_ICO` / `ico()` / `punto()`), nunca emojis.
- Toda pantalla nueva de color debe usar variables (`--tarjeta`, `--fondo`, `--borde`…), no `#fff` fijo,
  para no romper el tema oscuro.
- El hueco bajo los botones se da con `padding-bottom` de `.contenedor` (el `margin-bottom` del pie y el
  `padding-bottom` del `body` no funcionan con `html,body{height:100%}` y `box-sizing:border-box`).
- Cambios en `sw.js`/assets ⇒ subir la versión del caché (`mis-tareas-v3` actual).
- `package.json` sin `"type": "module"` a propósito (preload/main usan `require()`).

## Verificación
No hay pruebas automatizadas en el repo. La verificación real es arrancar y usar:
- `npm run inicio` (Electron) o `npm run pwa` + navegador.
- Comprobación de sintaxis del JS inline: extraer el `<script>` y `node --check`.
- Pruebas ad-hoc con Playwright headless sobre la PWA mockeando `localStorage`
  (guiones de sesión en `%TEMP%`, no commiteados). Último lote: 0 errores de consola,
  tema/duplicar/selección+deshacer/cronómetro/gráfico/CSV/pie verificados.
- El instalador se genera con `npm run instalador` (NSIS, sin admin).

## Mantener
- `AGENTS.md` — convenciones y trampas del repo (leer antes de tocar).
- Añadir funciones dentro de `index.html`, sin partirlo en módulos.
- No editar `mis-tareas-pc.zip` (copia histórica de la variante Tauri).
- La versión vive en `package.json` y sale en el nombre del instalador.
- Icono de ventana/bandeja: `src-tauri/icons/icon.ico` (compartido con Tauri).
