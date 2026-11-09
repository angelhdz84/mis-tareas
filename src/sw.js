/* Service worker de Mis Tareas (PWA, 100 % offline).
   Estrategia: cache-first con actualización en segundo plano (stale-while-revalidate)
   y copia de seguridad del index.html para las navegaciones sin conexión. */
const CACHE = "mis-tareas-v3";
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-32.png",
  "./icon-128.png",
  "./icon-192.png",
  "./icon-512.png",
  "./vendor/tauri-api/core.js",
  "./vendor/tauri-api/event.js",
  "./vendor/tauri-api/path.js",
  "./vendor/tauri-api/external/tslib/tslib.es6.js",
  "./vendor/plugin-dialog/index.js",
  "./vendor/plugin-fs/index.js",
  "./vendor/plugin-notification/index.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).pathname.startsWith("/sw")) return;

  // Navegaciones (HTML): cache primero y red como respaldo; sin nada, index offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copia));
          return res;
        })
        .catch(async () =>
          (await caches.match("./index.html")) ||
          (await caches.match("./")) ||
          new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
        )
    );
    return;
  }

  // Resto de recursos: cache primero, red de respaldo, y lo que llegue por red se cachea.
  e.respondWith(
    caches.match(req).then((enCache) => {
      if (enCache) {
        fetch(req).then((res) => {
          if (res && res.ok) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
        }).catch(() => {});
        return enCache;
      }
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return res;
      });
    })
  );
});
