// Copia los módulos ESM de @tauri-apps/* a src/vendor para que el webview
// pueda importarlos sin empaquetador (ver el import map de src/index.html).
// Uso: npm run vendor
import fs from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");
const origen = path.join(raiz, "node_modules", "@tauri-apps");
const destino = path.join(raiz, "src", "vendor");

fs.rmSync(destino, { recursive: true, force: true });

// API core: se copian todos los .js conservando la estructura (external/tslib, menu/, etc.)
const apiDestino = path.join(destino, "tauri-api");
fs.cpSync(path.join(origen, "api"), apiDestino, {
  recursive: true,
  filter: (src) => fs.statSync(src).isDirectory() || src.endsWith(".js"),
});

// Plugins usados por index.html: solo el bundle ESM
for (const plugin of ["plugin-dialog", "plugin-fs", "plugin-notification"]) {
  const destinoPlugin = path.join(destino, plugin);
  fs.mkdirSync(destinoPlugin, { recursive: true });
  fs.copyFileSync(
    path.join(origen, plugin, "dist-js", "index.js"),
    path.join(destinoPlugin, "index.js"),
  );
}

console.log("vendor actualizado en src/vendor");
