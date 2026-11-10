/* Service worker de Mis Tareas Mini (rama móvil, 100 % offline).
   Cache-first con stale-while-revalidate y copia de respaldo del index.html.
   IMPORTANTE: es independiente del SW del escritorio (src/sw.js). Si cambias
   estos assets, sube la versión de CACHE. */
const CACHE = "mis-tareas-mini-v1";
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-32.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", (ev)=>{
  ev.waitUntil((async ()=>{
    const c = await caches.open(CACHE);
    await c.addAll(PRECACHE);
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (ev)=>{
  ev.waitUntil((async ()=>{
    const claves = await caches.keys();
    await Promise.all(claves.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (ev)=>{
  const req = ev.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;

  // Navegaciones: cache-first con red de respaldo, y última copia del HTML si falla todo
  if(req.mode === "navigate"){
    ev.respondWith((async ()=>{
      const c = await caches.open(CACHE);
      const enCaché = await c.match(req, {ignoreSearch:true}) || await c.match("./index.html");
      const red = fetch(req).then(res=>{
        if(res && res.ok) c.put(req, res.clone());
        if(req.mode === "navigate") c.put("./index.html", res.clone());
        return res;
      }).catch(()=> enCaché || c.match("./index.html"));
      return enCaché || red;
    })());
    return;
  }

  ev.respondWith((async ()=>{
    const c = await caches.open(CACHE);
    const enCaché = await c.match(req);
    if(enCaché){
      fetch(req).then(res=>{ if(res && res.ok) c.put(req, res.clone()); }).catch(()=>{});
      return enCaché;
    }
    try{
      const res = await fetch(req);
      if(res && res.ok) c.put(req, res.clone());
      return res;
    }catch(e){
      if(url.pathname.endsWith("/manifest.webmanifest")){
        const m = await c.match("./manifest.webmanifest");
        if(m) return m;
      }
      return new Response("Sin conexión", {status:503, statusText:"offline"});
    }
  })());
});
