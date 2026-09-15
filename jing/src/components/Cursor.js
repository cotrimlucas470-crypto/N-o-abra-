import { damp } from '../utils/math.js';
import { $ } from '../utils/dom.js';

/**
 * CURSOR PERSONALIZADO (só em ponteiro fino).
 * Um ponto luminoso + anel que cresce em elementos interativos, e uma lente
 * de distorção que fica sobre superfícies marcadas com `data-espelho`.
 */
export function montarCursor(perf) {
  if (!perf.ponteiroFino || perf.toqueApenas) return { atualizar() {} };

  const ponto = $('#cursor');
  const anel = $('#cursor-anel');
  const lente = $('#cursor-distorcao');
  if (!ponto || !anel || !lente) return { atualizar() {} };

  const raiz = document.documentElement;
  raiz.dataset.cursor = 'ativo';

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let ax = x;
  let ay = y;
  let lx = x;
  let ly = y;
  let visivel = false;

  const mover = (e) => {
    x = e.clientX;
    y = e.clientY;
    if (!visivel) {
      visivel = true;
      ax = x; ay = y; lx = x; ly = y;
    }
  };
  window.addEventListener('pointermove', mover, { passive: true });
  window.addEventListener('pointerdown', () => anel.style.setProperty('transform', 'scale(0.82)'));
  window.addEventListener('pointerup', () => anel.style.removeProperty('transform'));
  document.addEventListener('mouseleave', () => {
    raiz.dataset.cursor = 'oculto';
  });
  document.addEventListener('mouseenter', () => {
    raiz.dataset.cursor = 'ativo';
  });

  const interativo = 'a, button, input, [role="tab"], [tabindex]:not([tabindex="-1"]), .passo, .nodo, .chip';
  document.addEventListener(
    'pointerover',
    (e) => {
      const alvo = e.target instanceof Element ? e.target : null;
      if (!alvo) return;
      if (alvo.closest(interativo)) raiz.dataset.alvo = 'interativo';
      else if (alvo.closest('[data-espelho]')) raiz.dataset.alvo = 'espelho';
      else raiz.dataset.alvo = 'nenhum';
    },
    { passive: true }
  );

  return {
    atualizar(dt) {
      ponto.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      ax = damp(ax, x, 0.0005, dt);
      ay = damp(ay, y, 0.0005, dt);
      anel.style.transform = `translate3d(${ax}px, ${ay}px, 0)`;
      lx = damp(lx, x, 0.02, dt);
      ly = damp(ly, y, 0.02, dt);
      lente.style.transform = `translate3d(${lx}px, ${ly}px, 0)`;
    },
  };
}
