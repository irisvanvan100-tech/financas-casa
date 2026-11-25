// Finanças da Casa - service worker
// Página (index.html): busca na internet primeiro; se demorar mais de 3s ou estiver offline, usa a cópia guardada.
// Arquivos fixos (biblioteca, ícones, fontes): usa a cópia guardada, sem esperar a internet.
const C='fin-v13',
  SUPA='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js',
  A=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png',SUPA];

self.addEventListener('install',e=>e.waitUntil(
  caches.open(C).then(c=>Promise.all(A.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x)))).then(()=>clients.claim())
));

const guardar=(req,r)=>{if(r&&(r.ok||r.type==='opaque')){const cp=r.clone();caches.open(C).then(c=>c.put(req,cp))}return r};
const copiaPagina=req=>caches.match(req,{ignoreSearch:true}).then(c=>c||caches.match('index.html'));

self.addEventListener('fetch',e=>{
  const req=e.request,u=new URL(req.url);
  if(req.method!='GET'||u.hostname.endsWith('supabase.co')||u.hostname.endsWith('formsubmit.co'))return;

  if(req.mode==='navigate'){
    const rede=fetch(req).then(r=>guardar(req,r));
    const espera=new Promise(res=>setTimeout(res,3000));
    e.respondWith(
      Promise.race([rede,espera])
        .then(r=>r||copiaPagina(req).then(c=>c||rede))
        .catch(()=>copiaPagina(req))
    );
    return;
  }

  e.respondWith(caches.match(req).then(c=>c||fetch(req).then(r=>guardar(req,r))));
});
