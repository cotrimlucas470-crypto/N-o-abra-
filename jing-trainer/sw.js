const CACHE = 'espelho-v10';
const ARQS = [
  './', './index.html', './css/app.css', './manifest.json', './icone.svg',
  './js/util.js', './js/estat.js', './js/ciencia.js', './js/musica.js', './js/hud.js',
  './js/toque.js', './js/otimiza.js', './js/conteudo.js', './js/modelo.js', './js/controlador.js',
  './js/gemeo.js', './js/evolucao.js', './js/indice.js', './js/engines.js',
  './js/emblema.js', './js/herois.js', './dados/herois/_roster.js', './dados/herois/jing.js', './dados/herois/_funcoes.js', './dados/herois/_tier.js', './dados/herois/_stats.js', './dados/herois/_habilidades.js', './dados/itens/_catalogo.js', './js/pratica.js', './js/drills.js', './js/decisao.js', './js/graf.js', './js/ui.js',
  './js/treino.js', './js/app.js',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
    const cp = resp.clone();
    caches.open(CACHE).then(c => c.put(e.request, cp)).catch(() => {});
    return resp;
  }).catch(() => caches.match('./index.html'))));
});
