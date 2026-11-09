// Servidor local estático para la PWA de Mis Tareas. 100 % sin conexión: sirve
// la carpeta src/ en http://localhost:8088 — nada se descarga de internet.
// Uso: npm run pwa
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PUERTO = Number(process.env.PUERTO || 8088);
const raiz = path.resolve(import.meta.dirname, "..", "src");
const tipos = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

http
  .createServer((req, res) => {
    const ruta = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let archivo = path.join(raiz, ruta === "/" ? "index.html" : ruta.slice(1));
    if (!path.resolve(archivo).startsWith(path.resolve(raiz))) {
      res.writeHead(403).end("Prohibido");
      return;
    }
    fs.readFile(archivo, (err, datos) => {
      if (err) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("No encontrado: " + ruta);
        return;
      }
      const cabeceras = { "content-type": tipos[path.extname(archivo)] || "application/octet-stream" };
      if (path.basename(archivo) === "sw.js") cabeceras["cache-control"] = "no-cache"; // el SW siempre al día
      res.writeHead(200, cabeceras);
      res.end(datos);
    });
  })
  .listen(PUERTO, "127.0.0.1", () =>
    console.log(`Mis Tareas (PWA) en http://localhost:${PUERTO} — ciérralo con Ctrl+C`)
  );
