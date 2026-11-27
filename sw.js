// Finanças da Casa - service worker
// Página (index.html): na primeira vez em cada aparelho abre pela internet e guarda uma cópia.
// Nas próximas, abre na hora pela cópia guardada e busca a versão nova em segundo plano;
// se mudou, avisa a página para mostrar "Nova versão do app · Atualizar".
// Arquivos fixos (biblioteca do Supabase, ícones, fontes): usa a cópia guardada, sem esperar a internet.
// A biblioteca do Supabase fica dentro do próprio app (supabase-2.45.4.js), sem depender de CDN.
const C='fin-v19',
  SUPA='supabase-2.45.4.js',
  A=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png',SUPA];

self.addEventListener('install',e=>e.waitUntil(
  caches.open(C).then(c=>Promise.all(A.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x)))).then(()=>clients.claim())
));

const guardar=(req,r)=>{if(r&&(r.ok||r.type==='opaque')){const cp=r.clone();caches.open(C).then(c=>c.put(req,cp))}return r};
const copiaPagina=req=>caches.match(req,{ignoreSearch:true}).then(c=>c||caches.match('index.html'));
// Avisa a página que acabou de abrir (espera ela ficar pronta; se não achar, avisa todas as janelas do app).
const avisar=async id=>{for(let i=0;i<20&&id;i++){const w=await self.clients.get(id);if(w){w.postMessage('nova-versao');return}await new Promise(r=>setTimeout(r,250))}(await self.clients.matchAll({type:'window'})).forEach(w=>w.postMessage('nova-versao'))};

self.addEventListener('fetch',e=>{
  const req=e.request,u=new URL(req.url);
  if(req.method!='GET'||u.hostname.endsWith('supabase.co')||u.hostname.endsWith('bcb.gov.br'))return;

  if(req.mode==='navigate'){
    const rede=fetch(req.url,{cache:'no-cache',credentials:'same-origin'}).then(r=>guardar(req,r));
    const salvo=copiaPagina(req).then(c=>c?{c,txt:c.clone().text()}:null);
    // Com cópia: abre na hora. Sem cópia (primeira vez): espera a internet, como antes.
    e.respondWith(salvo.then(x=>x?x.c:rede).catch(()=>copiaPagina(req)));
    // Em segundo plano: se a versão da internet for diferente da cópia, avisa a página.
    e.waitUntil(salvo.then(x=>x&&rede.then(r=>r&&r.ok?r.clone().text():null).then(novo=>x.txt.then(velho=>{if(novo&&novo!==velho)return avisar(e.resultingClientId)}))).catch(()=>{}));
    return;
  }

  e.respondWith(caches.match(req).then(c=>c||fetch(req).then(r=>guardar(req,r))));
});
