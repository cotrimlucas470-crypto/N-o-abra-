/* O service worker antigo tinha DOIS erros que travavam o jogo
   numa versão velha pra sempre:
   1. o nome do cache era 'nao-abra-v1' e nunca mudava
   2. respondia SEMPRE do cache primeiro, sem checar a rede
   Resultado: deploy novo no Netlify não chegava no aparelho. */

const VERSAO = 'v48-' + '20260814c';
const CACHE  = 'nao-abra-' + VERSAO;
const ARQUIVOS = ['./','./index.html','./manifest.json',
  './icon-192.png','./icon-512.png','./icon-mask.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS).catch(()=>{})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const ehPagina = e.request.mode === 'navigate' ||
    e.request.url.endsWith('/') || e.request.url.endsWith('index.html');

  if (ehPagina) {
    /* a PÁGINA vem da rede primeiro: assim versão nova sempre
       chega. O cache só entra se você estiver sem internet. */
    e.respondWith(
      fetch(e.request).then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia)).catch(()=>{});
        return res;
      }).catch(() => caches.match(e.request).then(h => h || caches.match('./index.html')))
    );
    return;
  }
  /* ícone e manifesto podem vir do cache, não mudam */
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copia = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copia)).catch(()=>{});
      return res;
    }))
  );
});
