/**
 * Forge Mobile — bootstrap.
 *
 * Inicialização enxuta (regra 44): o núcleo sobe primeiro; painéis pesados
 * (editor de código, stress test, importador de projeto) só são carregados quando
 * usados, via import dinâmico.
 */
import './core/components/index.js';
import { Editor } from './editor/Editor.js';

const splash = document.getElementById('splash');
const bar = splash.querySelector('.splash-bar i');
const app = document.getElementById('app');

function progress(p) { bar.style.width = `${Math.round(p * 100)}%`; }

async function boot() {
  progress(0.25);
  const editor = new Editor();
  window.forge = editor;              // acesso no DevTools para depuração
  progress(0.5);

  try {
    await editor.boot();
  } catch (err) {
    console.error(err);
    splash.innerHTML = `<div style="max-width:320px;text-align:center;padding:20px">
      <div style="font-size:32px">⚠</div>
      <h3>Falha ao iniciar</h3>
      <p style="color:#b7bfcc;font-size:13px">${escapeHtml(err.message)}</p>
      <button class="btn primary" onclick="location.reload()">Recarregar</button>
    </div>`;
    return;
  }

  progress(1);
  app.hidden = false;
  editor.resizeAll();
  /* só agora o canvas tem tamanho real: enquadra a cena com as medidas corretas */
  editor.sceneView.frameSelection();
  splash.classList.add('hide');
  setTimeout(() => splash.remove(), 200);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* PWA: service worker para funcionar offline depois da primeira carga */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('Service worker não registrado:', err.message);
    });
  });
}

/* evita o zoom por duplo toque atrapalhando o editor, sem bloquear o pinch */
document.addEventListener('dblclick', (e) => {
  if (e.target.closest('canvas')) e.preventDefault();
}, { passive: false });

boot();
