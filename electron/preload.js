// Expone al frontend exactamente la misma interfaz que Tauri:
// window.__TAURI_INTERNALS__.invoke(comando, argumentos)
"use strict";
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("__TAURI_INTERNALS__", {
  invoke: (comando, argumentos) => ipcRenderer.invoke(comando, argumentos),
});
contextBridge.exposeInMainWorld("misTareasElectron", true);
