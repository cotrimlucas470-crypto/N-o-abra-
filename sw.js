/**
 * Service Worker do Forge Mobile.
 *
 * Estratégia:
 *  - shell do app (HTML/CSS/JS) em cache no install → abre offline e instantâneo;
 *  - navegação: network-first com fallback para o cache (pega updates sem quebrar offline);
 *  - demais requisições do mesmo domínio: cache-first (os arquivos são versionados por CACHE).
 *
 * Projetos do usuário NÃO passam por aqui: ficam no IndexedDB.
 */
const CACHE = 'forge-mobile-v1';

const SHELL = [
  './',
  'index.html',
  'manifest.json',
  'css/theme.css',
  'css/layout.css',
  'css/panels.css',
  'js/main.js',
  'js/core/EventBus.js',
  'js/core/MathUtils.js',
  'js/core/Component.js',
  'js/core/GameObject.js',
  'js/core/Scene.js',
  'js/core/Time.js',
  'js/core/Input.js',
  'js/core/Physics.js',
  'js/core/Renderer.js',
  'js/core/Engine.js',
  'js/core/Audio.js',
  'js/core/components/index.js',
  'js/core/components/Transform.js',
  'js/core/components/Renderers.js',
  'js/core/components/PhysicsComponents.js',
  'js/core/components/SceneComponents.js',
  'js/core/components/UIElement.js',
  'js/core/components/ScriptComponent.js',
  'js/scripting/ScriptEngine.js',
  'js/scripting/LoopGuard.js',
  'js/project/Storage.js',
  'js/project/Assets.js',
  'js/project/ProjectManager.js',
  'js/project/Zip.js',
  'js/project/demo/MiniAdventure.js',
  'js/perf/Device.js',
  'js/perf/Quality.js',
  'js/perf/PerfMonitor.js',
  'js/perf/StressTest.js',
  'js/editor/Editor.js',
  'js/editor/Console.js',
  'js/editor/History.js',
  'js/editor/Hierarchy.js',
  'js/editor/Inspector.js',
  'js/editor/SceneView.js',
  'js/editor/GameView.js',
  'js/editor/ProjectPanel.js',
  'js/editor/ScriptEditor.js',
  'js/editor/Learn.js',
  'js/editor/Commands.js',
  'js/editor/SettingsPanel.js',
  'js/editor/ui/Modal.js',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL).catch((err) => {
        // um arquivo ausente não pode impedir a instalação inteira
        console.warn('[sw] cache parcial:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // vídeos/links externos passam direto

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { cachePut(req, res.clone()); return res; })
        .catch(() => caches.match('index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => { cachePut(req, res.clone()); return res; });
    })
  );
});

function cachePut(req, res) {
  if (!res || res.status !== 200 || res.type === 'opaque') return;
  caches.open(CACHE).then((cache) => cache.put(req, res)).catch(() => {});
}
