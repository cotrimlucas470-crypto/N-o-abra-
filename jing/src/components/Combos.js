import { COMBOS } from '../data/config.js';
import { $, el, onEnter } from '../utils/dom.js';
import { audio } from '../utils/audio.js';
import { montarSheen } from '../animations/sheen.js';

/**
 * ARQUIVO DE COMBOS.
 * Cada combo é uma sequência temporal: os passos surgem um a um, e o hover
 * abre timing, janela, erro comum e dica.
 * Nenhum frame ou milissegundo é afirmado — os campos são descritivos e
 * marcados como editáveis em src/data/config.js.
 */
export function montarCombos({ gsap }) {
  $('#combos-subtitulo').textContent = COMBOS.subtitulo;
  $('#combos-aviso').replaceChildren(
    el('span', { class: 'editavel', text: 'TIMINGS' }),
    el('span', { text: ` ${COMBOS.aviso}`, style: { marginLeft: '.6rem', fontSize: '.86rem', opacity: '.75' } })
  );

  const abas = $('#combo-abas');
  const sequencia = $('#combo-sequencia');
  const contexto = el('div', { class: 'combo-contexto' });
  sequencia.parentElement.insertBefore(contexto, sequencia);
  let atual = null;

  const botoes = COMBOS.lista.map((c) => {
    const b = el('button', {
      type: 'button',
      class: 'chip',
      role: 'tab',
      id: `combo-${c.id}`,
      'aria-selected': 'false',
      text: c.nome,
      onclick: () => mostrar(c.id),
    });
    abas.append(b);
    return b;
  });

  function mostrar(id) {
    if (atual === id) return;
    atual = id;
    const combo = COMBOS.lista.find((c) => c.id === id);
    for (const b of botoes) b.setAttribute('aria-selected', String(b.id === `combo-${id}`));
    audio.tocar('metal', { volume: 0.25 });

    const passos = combo.passos.map((p, i) =>
      el(
        'article',
        { class: 'vidro passo sheen', 'data-espelho': true, tabindex: '0' },
        el('span', { class: 'ordem', text: String(i + 1).padStart(2, '0') }),
        el('span', { class: 'tipo', text: p.tipo }),
        el('span', { class: 'rotulo', text: p.rotulo }),
        el('span', { style: { fontSize: '.78rem', opacity: '.7' }, text: `janela ${p.janela}` }),
        el('span', { class: 'seta', 'aria-hidden': 'true', text: '↓' }),
        el('span', { class: 'dica-toque', 'aria-hidden': 'true', text: 'TOQUE PARA O TIMING' }),
        el(
          'div',
          { class: 'detalhe-passo' },
          el('div', {}, el('b', { text: 'TIMING' }), el('span', { text: p.timing })),
          el('div', {}, el('b', { text: 'JANELA DE ATIVAÇÃO' }), el('span', { text: p.janela })),
          el('div', {}, el('b', { text: 'ERRO COMUM' }), el('span', { text: p.erro })),
          el('div', {}, el('b', { text: 'DICA' }), el('span', { text: p.dica }))
        )
      )
    );

    contexto.replaceChildren(el('span', { class: 'rotulo-tec', text: combo.contexto }));
    sequencia.replaceChildren(...passos);
    montarSheen(sequencia);
    sequencia.setAttribute('aria-labelledby', `combo-${id}`);

    gsap.fromTo(
      passos,
      { opacity: 0, y: 26, filter: 'blur(10px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.62, stagger: 0.12, ease: 'power3.out' }
    );
    passos.forEach((p, i) => {
      p.classList.add('visivel');
      p.addEventListener('pointerenter', () => audio.tocar('vidro', { volume: 0.12, detune: i * 200 }));
      // sem hover no toque: o passo abre e fecha no toque/Enter
      const alternar = () => {
        const abrindo = !p.classList.contains('aberto');
        for (const outro of passos) outro.classList.remove('aberto');
        p.classList.toggle('aberto', abrindo);
        p.setAttribute('aria-expanded', String(abrindo));
        if (abrindo) audio.tocar('vidro', { volume: 0.18, detune: i * 200 });
      };
      p.setAttribute('aria-expanded', 'false');
      p.addEventListener('click', alternar);
      p.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          alternar();
        }
      });
    });
  }

  onEnter($('#combos'), () => mostrar(COMBOS.lista[0].id), { threshold: 0.08 });
  mostrar(COMBOS.lista[0].id);
  return { mostrar };
}
