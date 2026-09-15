import { $$ } from '../utils/dom.js';

/**
 * Sistema de brilho reutilizável.
 * Cada `.sheen` ganha sua camada de luz e um atraso próprio — o brilho nunca
 * passa em todos os elementos ao mesmo tempo.
 */
export function montarSheen(raiz = document) {
  const alvos = $$('.sheen', raiz);
  alvos.forEach((el, i) => {
    let luz = el.querySelector(':scope > .sheen-luz');
    if (!luz) {
      luz = document.createElement('span');
      luz.className = 'sheen-luz';
      luz.setAttribute('aria-hidden', 'true');
      el.append(luz);
    }
    // atraso determinístico e bem espalhado (razão áurea)
    const atraso = ((i * 0.618033) % 1) * 7.5 + (i % 3) * 0.8;
    luz.style.setProperty('--sheen-atraso', `${atraso.toFixed(2)}s`);
  });
}
