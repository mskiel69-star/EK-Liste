const VERSION='einkauf-v3-20261109-github-14';
const FILES=['./','./index.html','./app.js','./product-pictures.js','./mqtt.min.js','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(VERSION);await cache.addAll(FILES.map(path=>new Request(new URL(path,self.location).href,{cache:'reload'})))})()));
// Neue Versionen bleiben in waiting, bis der Nutzer ausdrücklich zustimmt.
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE')self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil((async()=>{await self.clients.claim();const clients=await self.clients.matchAll();if(clients.length<=1){for(const key of await caches.keys())if(key.startsWith('einkauf-v3-')&&key!==VERSION)await caches.delete(key)}})()));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;event.respondWith((async()=>{const cache=await caches.open(VERSION);const clean=new Request(url.origin+url.pathname);const match=await cache.match(clean);if(match)return match;if(event.request.mode==='navigate')return await cache.match(new URL('./index.html',self.location).href)||fetch(event.request);return fetch(event.request)})())});
