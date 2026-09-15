import { CALCULADORA } from '../data/config.js';
import { $, el } from '../utils/dom.js';
import { clamp, invLerp, round } from '../utils/math.js';
import { audio } from '../utils/audio.js';
import { Estrutura } from '../scene/Holografia.js';

/**
 * CALCULADORA DE PRÁTICA — real, com fórmula explicável:
 *
 *     dias = horas totais estimadas do nível ÷ horas de treino por dia
 *
 * As horas totais são estimativas de prática deliberada (campo editável),
 * não dados oficiais do jogo. Resultado em tempo real, desenhado como uma
 * linha temporal holográfica.
 */
export function montarCalculadora({ stage }) {
  $('#calc-rotulo').textContent = CALCULADORA.rotuloInput;
  $('#calc-formula').innerHTML = `
    <div>FÓRMULA · ${CALCULADORA.formula}</div>
    <div style="margin-top:.5rem;opacity:.85">${CALCULADORA.aviso}</div>
  `;

  const range = $('#calc-range');
  const deslizante = $('#calc-deslizante');
  const elHoras = $('#calc-horas');
  const saida = $('#calc-saida');
  range.min = CALCULADORA.min;
  range.max = CALCULADORA.max;
  range.step = CALCULADORA.passo;
  range.value = CALCULADORA.padrao;

  // presets
  const presets = $('#calc-presets');
  const chips = CALCULADORA.presets.map((h) =>
    el('button', {
      type: 'button',
      class: 'chip',
      text: `${h}h`,
      'aria-pressed': 'false',
      onclick: () => {
        range.value = h;
        atualizar(true);
      },
    })
  );
  presets.append(...chips);

  // níveis
  const nos = CALCULADORA.niveis.map((n, i) => {
    const dias = el('b');
    const faixa = el('i');
    const cartao = el(
      'article',
      {
        class: 'vidro nivel sheen',
        'data-revelar': true,
        'data-espelho': true,
        style: { '--cor-nivel': n.cor, '--atraso': `${i * 0.1}s` },
      },
      el('h4', { text: n.nome }),
      el('span', { class: 'dias' }, dias, el('small', { text: 'DIAS' })),
      el('p', { text: n.descricao }),
      el('div', { class: 'faixa' }, faixa),
      el(
        'div',
        { style: { gridColumn: '1 / -1', display: 'flex', gap: '.7rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '.6rem' } },
        el('span', { class: 'rotulo-tec', text: `${n.horas}H TOTAIS ESTIMADAS` }),
        n.editavel ? el('span', { class: 'editavel', text: 'CAMPO EDITÁVEL' }) : null
      )
    );
    saida.append(cartao);

    const est = new Estrutura({
      tipo: 'painel',
      el: cartao,
      envMap: stage.envMap,
      tom: i / Math.max(1, CALCULADORA.niveis.length - 1),
      distancia: 10,
    });
    stage.registrarEstrutura(est);
    est.visivel = true;
    cartao.addEventListener('pointerenter', () => (est.focar = true));
    cartao.addEventListener('pointerleave', () => (est.focar = false));

    return { ...n, dias, faixa, cartao };
  });

  const maxDias = Math.max(...CALCULADORA.niveis.map((n) => n.horas)) / CALCULADORA.min;

  function atualizar(comSom = false) {
    const horas = clamp(parseFloat(range.value) || CALCULADORA.padrao, CALCULADORA.min, CALCULADORA.max);
    elHoras.textContent = horas % 1 === 0 ? String(horas) : horas.toFixed(2).replace(/0$/, '');
    deslizante.style.setProperty('--p', String(invLerp(CALCULADORA.min, CALCULADORA.max, horas)));

    for (const chip of chips) {
      chip.setAttribute('aria-pressed', String(Math.abs(parseFloat(chip.textContent) - horas) < 0.001));
    }

    for (const n of nos) {
      const dias = n.horas / horas;
      n.dias.textContent = dias >= 10 ? String(Math.round(dias)) : round(dias, 1).toFixed(1);
      n.faixa.style.width = `${clamp((dias / maxDias) * 100, 3, 100)}%`;
      const semanas = dias / 7;
      n.cartao.setAttribute(
        'title',
        `${n.horas}h ÷ ${horas}h/dia ≈ ${round(dias, 1)} dias (~${round(semanas, 1)} semanas)`
      );
    }
    if (comSom) audio.tocar('metal', { volume: 0.18 });
  }

  range.addEventListener('input', () => atualizar());
  range.addEventListener('change', () => audio.tocar('metal', { volume: 0.2 }));
  atualizar();

  return { atualizar };
}
