const CACHE="kontrola-verificacion-v020";const ASSETS=["./","./index.html","./styles.css","./src/app.mjs","./src/core.mjs","./src/daily-import.mjs","./src/logic.mjs","./src/verification.mjs","./src/config.mjs","./assets/kontrola.svg","./manifest.webmanifest","./version.json"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("kontrola-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("message",e=>{if(e.data?.type==="SKIP_WAITING")self.skipWaiting()});
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);if(u.origin!==location.origin)return;
if(r.mode==="navigate"||/\/(index\.html|app\.mjs|config\.mjs|version\.json)$/.test(u.pathname))e.respondWith(fetch(r,{cache:"no-store"}).then(x=>{if(x.ok){const cp=x.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(r,cp)))}return x}).catch(()=>caches.match(r,{ignoreSearch:true})));
else e.respondWith(caches.match(r,{ignoreSearch:true}).then(x=>x||fetch(r)));});
