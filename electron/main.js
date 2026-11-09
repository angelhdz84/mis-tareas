// Mis Tareas — proceso principal de Electron.
// Sustituye al backend Rust de Tauri conservando el mismo contrato de comandos:
//   cargar_tareas, guardar_tareas, crear_backup_manual, obtener_carpeta_datos,
//   listar_backups, restaurar_backup, mostrar_notificacion, backup_diario,
//   abrir_carpeta + extras propios de Electron (diálogos de exportar/importar).
"use strict";

const { app, BrowserWindow, Tray, Menu, ipcMain, Notification, shell, dialog } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

let ventana = null;
let bandeja = null;
let saliendo = false;

const RUTA_ICONO = path.join(__dirname, "..", "src-tauri", "icons", "icon.ico");

/* ================= Carpeta de datos: Documentos/MisTareas ================= */
function carpetaDatos() {
  const carpeta = path.join(app.getPath("documents"), "MisTareas");
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
  const backups = path.join(carpeta, "backups");
  if (!fs.existsSync(backups)) {
    try { fs.mkdirSync(backups, { recursive: true }); } catch {}
  }
  return carpeta;
}

function rutaTareas() {
  return path.join(carpetaDatos(), "mis-tareas.json");
}

function marcaTiempo() {
  const d = new Date();
  const p = (n, l = 2) => String(n).padStart(l, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

/* Limpia backups antiguos dejando los últimos `max` de los que empiecen por prefijo */
function limpiarBackups(prefijos, max) {
  const backupsDir = path.join(carpetaDatos(), "backups");
  let entradas;
  try { entradas = fs.readdirSync(backupsDir); } catch { return; }
  const candidatos = entradas
    .filter((n) => n.endsWith(".json") && prefijos.some((p) => n.startsWith(p)))
    .map((n) => ({ n, t: fs.statSync(path.join(backupsDir, n)).mtimeMs }))
    .sort((a, b) => a.t - b.t);
  for (const c of candidatos.slice(0, Math.max(0, candidatos.length - max))) {
    try { fs.unlinkSync(path.join(backupsDir, c.n)); } catch {}
  }
}

function copiaBackup(nombreArchivo) {
  const backupsDir = path.join(carpetaDatos(), "backups");
  const destino = path.join(backupsDir, nombreArchivo);
  fs.copyFileSync(rutaTareas(), destino);
}

function notificarWindows(titulo, cuerpo) {
  if (!Notification.isSupported()) return false;
  const n = new Notification({ title: titulo, body: cuerpo, icon: RUTA_ICONO });
  n.show();
  return true;
}

/* ================= Comandos (contrato igual que Tauri) ================= */
ipcMain.handle("cargar_tareas", () => {
  const ruta = rutaTareas();
  if (!fs.existsSync(ruta)) return "[]";
  return fs.readFileSync(ruta, "utf8");
});

ipcMain.handle("guardar_tareas", (_ev, { contenido }) => {
  const ruta = rutaTareas();
  if (fs.existsSync(ruta)) {
    try {
      copiaBackup(`mis-tareas_${marcaTiempo()}.json`);
      limpiarBackups(["mis-tareas_"], 20);
    } catch {}
  }
  fs.writeFileSync(ruta, contenido, "utf8");
});

ipcMain.handle("crear_backup_manual", (_ev, { nombre }) => {
  const ruta = rutaTareas();
  if (!fs.existsSync(ruta)) throw new Error("No hay tareas que respaldar todavía.");
  let archivo = `mis-tareas_manual_${marcaTiempo()}.json`;
  if (nombre && String(nombre).trim()) {
    const limpio = String(nombre).trim().replace(/[^\w-]+/g, "_");
    archivo = `mis-tareas_${limpio}_${marcaTiempo()}.json`;
  }
  copiaBackup(archivo);
  return path.join(carpetaDatos(), "backups", archivo);
});

ipcMain.handle("obtener_carpeta_datos", () => carpetaDatos());

ipcMain.handle("listar_backups", () => {
  const backupsDir = path.join(carpetaDatos(), "backups");
  let entradas;
  try { entradas = fs.readdirSync(backupsDir); } catch { return []; }
  const lista = [];
  for (const nombre of entradas.filter((n) => n.endsWith(".json"))) {
    const ruta = path.join(backupsDir, nombre);
    const st = fs.statSync(ruta);
    lista.push({ nombre, ruta, tamano: st.size, modificado: Math.floor(st.mtimeMs / 1000) });
  }
  lista.sort((a, b) => b.modificado - a.modificado);
  return lista;
});

ipcMain.handle("restaurar_backup", (_ev, { rutaBackup }) => {
  if (!fs.existsSync(rutaBackup)) throw new Error("El archivo de backup no existe.");
  const ruta = rutaTareas();
  if (fs.existsSync(ruta)) {
    try { copiaBackup(`mis-tareas_pre-restore_${marcaTiempo()}.json`); } catch {}
  }
  fs.copyFileSync(rutaBackup, ruta);
});

ipcMain.handle("mostrar_notificacion", (_ev, { titulo, cuerpo }) => {
  return notificarWindows(titulo, cuerpo);
});

ipcMain.handle("backup_diario", () => {
  const ruta = rutaTareas();
  if (!fs.existsSync(ruta)) return false;
  const hoy = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const patron = `mis-tareas_diario_${hoy.getFullYear()}-${p(hoy.getMonth() + 1)}-${p(hoy.getDate())}.json`;
  const backupsDir = path.join(carpetaDatos(), "backups");
  try {
    if (fs.readdirSync(backupsDir).includes(patron)) return false;
  } catch {}
  copiaBackup(patron);
  limpiarBackups(["mis-tareas_diario_"], 7);
  return true;
});

ipcMain.handle("abrir_carpeta", (_ev, { ruta }) => shell.openPath(ruta));

/* Extras Electron: exportar/importar con diálogo nativo */
ipcMain.handle("guardar_archivo_dialogo", async (_ev, { titulo, nombrePorDefecto, contenido, filtros }) => {
  ventana.show();
  const { canceled, filePath } = await dialog.showSaveDialog(ventana, {
    title: titulo || "Exportar tareas",
    defaultPath: nombrePorDefecto || `mis-tareas-copia-${new Date().toISOString().slice(0, 10)}.json`,
    filters: Array.isArray(filtros) && filtros.length
      ? filtros
      : [{ name: "JSON", extensions: ["json"] }],
  });
  if (canceled || !filePath) return null;
  fs.writeFileSync(filePath, contenido, "utf8");
  return filePath;
});

ipcMain.handle("abrir_archivo_dialogo", async (_ev, { titulo }) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(ventana, {
    title: titulo || "Importar tareas",
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (canceled || !filePaths.length) return null;
  return { ruta: filePaths[0], contenido: fs.readFileSync(filePaths[0], "utf8") };
});

/* ================= Ventana y bandeja ================= */
function crearVentana() {
  ventana = new BrowserWindow({
    title: "Mis Tareas",
    width: 1280,
    height: 820,
    minWidth: 800,
    minHeight: 600,
    center: true,
    show: false,
    icon: RUTA_ICONO,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  ventana.loadFile(path.join(__dirname, "..", "src", "index.html"));
  ventana.once("ready-to-show", () => ventana.show());

  // La X oculta a la bandeja (igual que en Tauri): salir solo desde el menú de la bandeja
  ventana.on("close", (e) => {
    if (!saliendo) {
      e.preventDefault();
      ventana.hide();
    }
  });
}

function crearBandeja() {
  const menu = Menu.buildFromTemplate([
    { label: "Mostrar ventana", click: () => { ventana.show(); ventana.focus(); } },
    { label: "Crear backup ahora", click: async () => {
        const ruta = rutaTareas();
        if (!fs.existsSync(ruta)) return;
        const archivo = `mis-tareas_manual_${marcaTiempo()}.json`;
        try { copiaBackup(archivo); notificarWindows("Backup creado", "Se ha creado un backup manual correctamente."); } catch {}
      } },
    { type: "separator" },
    { label: "Salir", click: () => { saliendo = true; app.quit(); } },
  ]);
  bandeja = new Tray(RUTA_ICONO);
  bandeja.setToolTip("Mis Tareas");
  bandeja.setContextMenu(menu);
  bandeja.on("click", () => {
    if (ventana.isVisible()) ventana.hide();
    else { ventana.show(); ventana.focus(); }
  });
}

app.whenReady().then(() => {
  crearVentana();
  crearBandeja();
});

app.on("before-quit", () => { saliendo = true; });

// Quitar el icono de la bandeja al cerrar del todo
app.on("will-quit", () => { try { bandeja?.destroy(); } catch {} });

// En Windows no hay que reabrir la ventana al activar la bandeja
app.on("window-all-closed", () => {
  if (saliendo) app.quit();
});
