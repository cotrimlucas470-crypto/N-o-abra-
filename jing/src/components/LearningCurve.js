import { CURVA } from '../data/config.js';
import { $, el, onEnter } from '../utils/dom.js';
import { Estrutura } from '../scene/Holografia.js';
import { audio } from '../utils/audio.js';

/**
 * CRONÔMETRO DO DOMÍNIO.
 * Cada estágio é um prisma holográfico 3D com barra de progresso em luz,
 * gráfico real e partículas em órbita. O painel de vidro carrega o texto;
 * a estrutura atrás carrega a presença.
 */
export function montarCurva({ stage, escurecerCena }) {
  $('#curva-subtitulo').textContent = CURVA.subtitulo;
  const grade = $('#grade-estagios');
  const estruturas = [];

  CURVA.estagios.forEach((e, i) => {
    const barra = el('i');
    const painel = el(
      'article',
      {
        class: 'vidro estagio sheen',
        'data-revelar': true,
        'data-espelho': true,
        style: { '--atraso': `${i * 0.12}s` },
      },
      el('span', { class: 'indice', text: e.indice }),
      el('h3', { text: e.nome }),
      el('span', { class: 'foco', text: e.foco }),
      el('p', { class: 'nota', text: e.nota }),
      el('div', { class: 'barra-progresso' }, barra),
      el(
        'div',
        { class: 'tempo' },
        el('span', {}, el('span', { class: 'rotulo-tec', text: 'TEMPO ESTIMADO' }), el('br'), el('b', { text: e.tempo })),
        e.editavel ? el('span', { class: 'editavel', text: 'CAMPO EDITÁVEL' }) : null
      )
    );
    grade.append(painel);

    const est = new Estrutura({
      tipo: 'estagio',
      el: painel,
      envMap: stage.envMap,
      tom: i / Math.max(1, CURVA.estagios.length - 1),
      rotulo: e.indice,
      progresso: e.progresso,
      grafico: e.grafico,
      distancia: 9.5,
    });
    stage.registrarEstrutura(est);
    estruturas.push(est);

    onEnter(
      painel,
      (dentro) => {
        est.visivel = dentro;
        if (dentro) barra.style.width = `${Math.round(e.progresso * 100)}%`;
      },
      { threshold: 0.2, once: false, rootMargin: '-6% 0px' }
    );

    painel.addEventListener('pointerenter', () => {
      est.focar = true;
      escurecerCena(0.34);
      audio.tocar('metal', { volume: 0.16, detune: i * 180 });
    });
    painel.addEventListener('pointerleave', () => {
      est.focar = false;
      escurecerCena(0);
    });
    painel.addEventListener('focusin', () => {
      est.focar = true;
      escurecerCena(0.34);
    });
    painel.addEventListener('focusout', () => {
      est.focar = false;
      escurecerCena(0);
    });
    painel.tabIndex = 0;
  });

  return { estruturas };
}
