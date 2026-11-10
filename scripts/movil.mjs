// Servidor local estático para la rama MÓVIL (Mis Tareas Mini). Sirve la carpeta
// Movil/ en http://localhost:8089 — la PWA del escritorio (src/, puerto 8088) no se toca.
// Uso:
//   npm run movil              → solo este equipo (127.0.0.1:8089)
//   npm run movil -- --lan     → también el móvil por Wi-Fi (0.0.0.0:8089 + IP local)
//   set PUERTO=...             → otro puerto si hace falta
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PUERTO = Number(process.env.PUERTO || 8089);
const POR_LAN = process.argv.includes("--lan");
const raiz = path.resolve(import.meta.dirname, "..", "Movil");
const tipos = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
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
  .listen(PUERTO, POR_LAN ? "0.0.0.0" : "127.0.0.1", () => {
    console.log(`Mis Tareas Mini en http://localhost:${PUERTO} — ciérralo con Ctrl+C`);
    if (POR_LAN) {
      const ips = Object.values(os.networkInterfaces())
        .flat()
        .filter((i) => i && i.family === "IPv4" && !i.internal)
        .map((i) => i.address);
      console.log("Desde el móvil (misma red Wi-Fi):");
      ips.forEach((ip) => console.log(`  http://${ip}:${PUERTO}`));
      console.log("Aviso: Chrome solo instala la PWA en localhost o HTTPS; por IP local podrás usarla");
      console.log("en el navegador y añadirla a la pantalla de inicio, pero sin caché offline.");
    }
  });
