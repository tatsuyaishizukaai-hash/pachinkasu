/* パチンカスの成り上がり店長録 Service Worker（node src/build-app.js で sw.js を作り直す） */
const VERSION='202610100257';
const CACHE='pachinkasu-'+VERSION;
const FONT_CACHE='pachinkasu-fonts';
const CORE=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-icon.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k!==FONT_CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
function timeout(ms){return new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))}
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  /* ページ：ネット優先（4秒で諦めてキャッシュ） */
  if(req.mode==='navigate'){
    e.respondWith(Promise.race([fetch(req.url,{cache:'no-cache',credentials:'same-origin'}),timeout(4000)]).then(res=>{
      if(res.ok&&!res.redirected){const copy=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy))}return res;
    }).catch(()=>caches.match('./index.html').then(r=>r||caches.match('./'))));
    return;
  }
  /* Googleフォント：別のキャッシュ */
  if(url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.open(FONT_CACHE).then(c=>c.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok||res.type==='opaque')c.put(req,res.clone());return res}))));
    return;
  }
  /* 同じサイトのファイル：キャッシュ優先 */
  if(url.origin===self.location.origin){
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return res})));
  }
});
