import { MECANICAS } from '../data/config.js';
import { $, el, onEnter } from '../utils/dom.js';
import { Estrutura } from '../scene/Holografia.js';
import { audio } from '../utils/audio.js';
import { tempo } from '../animations/timeControl.js';

/**
 * MAPA DO REFLEXO — as mecânicas como objetos 3D selecionáveis.
 * Ao selecionar: a estrutura se aproxima da câmera, o salão escurece,
 * o objeto ganha iluminação e o painel de vidro traz a leitura.
 */
export function montarMapa({ stage, gsap, escurecerCena }) {
  $('#mecanicas-subtitulo').textContent = MECANICAS.subtitulo;
  const caixaNodos = $('#mapa-nodos');
  const detalhe = $('#mapa-detalhe');
  const estruturas = new Map();
  let selecionado = null;

  const botoes = MECANICAS.itens.map((m, i) => {
    const b = el(
      'button',
      {
        type: 'button',
        class: 'nodo',
        role: 'tab',
        id: `nodo-${m.id}`,
        'aria-selected': 'false',
        'aria-controls': 'mapa-detalhe',
      },
      el('span', { class: 'simbolo', text: m.simbolo, 'aria-hidden': 'true' }),
      el('span', { text: m.nome })
    );
    b.addEventListener('click', () => selecionar(m.id));
    b.addEventListener('pointerenter', () => {
      estruturas.get(m.id).focar = true;
      audio.tocar('metal', { volume: 0.14, detune: i * 120 });
    });
    b.addEventListener('pointerleave', () => {
      if (selecionado !== m.id) estruturas.get(m.id).focar = false;
    });
    caixaNodos.append(b);

    const est = new Estrutura({
      tipo: 'nodo',
      el: b,
      envMap: stage.envMap,
      tom: (i % 3) / 2,
      rotulo: m.simbolo,
      distancia: 8.5,
    });
    stage.registrarEstrutura(est);
    estruturas.set(m.id, est);
    return b;
  });

  // navegação por teclado entre as abas
  caixaNodos.addEventListener('keydown', (e) => {
    const i = botoes.indexOf(document.activeElement);
    if (i < 0) return;
    let j = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % botoes.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + botoes.length) % botoes.length;
    if (j === null) return;
    e.preventDefault();
    botoes[j].focus();
    selecionar(MECANICAS.itens[j].id);
  });

  function selecionar(id) {
    if (selecionado === id) return;
    const anterior = selecionado;
    selecionado = id;
    const m = MECANICAS.itens.find((x) => x.id === id);

    for (const b of botoes) b.setAttribute('aria-selected', String(b.id === `nodo-${id}`));
    for (const [k, est] of estruturas) est.focar = k === id;
    if (anterior) escurecerCena(0.46);
    else escurecerCena(0.46);

    audio.tocar('vidro', { volume: 0.32 });
    tempo.pulso(0.55, 420);
    stage.rig.impulso({ fov: -2.6, tremor: 0.12 });

    const conteudo = el(
      'div',
      {},
      el('span', { class: 'rotulo-tec', text: 'EIXO SELECIONADO' }),
      el('h3', { text: m.nome }),
      el('p', { class: 'resumo', text: m.resumo }),
      el('p', { text: m.texto }),
      el('div', { class: 'pratica' }, el('b', { class: 'rotulo-tec', text: 'COMO TREINAR' }), el('div', { text: m.pratica })),
      m.nota ? el('p', { style: { marginTop: '1rem' } }, el('span', { class: 'editavel', text: m.nota })) : null
    );
    detalhe.replaceChildren(conteudo);
    detalhe.setAttribute('aria-labelledby', `nodo-${id}`);
    gsap.fromTo(
      conteudo,
      { opacity: 0, y: 20, filter: 'blur(8px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.75, ease: 'power3.out' }
    );
  }

  // a seção só escurece o salão enquanto está de fato na tela
  onEnter(
    $('#mecanicas'),
    (dentro) => {
      if (!dentro) {
        escurecerCena(0);
        for (const [, est] of estruturas) est.visivel = false;
      } else {
        for (const [, est] of estruturas) est.visivel = true;
        if (selecionado) escurecerCena(0.46);
      }
    },
    { threshold: 0.12, once: false }
  );

  selecionar(MECANICAS.itens[0].id);
  return { selecionar };
}
