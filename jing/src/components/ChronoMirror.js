import { CHRONO } from '../data/config.js';
import { $, el } from '../utils/dom.js';
import { tempo } from '../animations/timeControl.js';
import { audio } from '../utils/audio.js';
import { clamp, invLerp } from '../utils/math.js';

/**
 * CHRONO MIRROR — o controle real do tempo da cena.
 *
 * O deslizante não anima um número: ele muda `tempo.base`, que multiplica o
 * dt de TODOS os subsistemas 3D. Os fragmentos ficam lentos de verdade, as
 * partículas deixam rastro de verdade, a câmera desacelera de verdade.
 */
export function montarChrono({ stage, gsap }) {
  $('#chrono-descricao').textContent = CHRONO.descricao;
  $('#chrono-subtitulo').textContent = CHRONO.subtitulo;
  $('#quebra-nota').textContent = CHRONO.quebrar.nota;
  $('#quebra-rotulo').textContent = CHRONO.quebrar.rotulo;
  $('#chrono-explica').textContent =
    'Arraste a linha. O que muda não é o texto: é a velocidade das animações, ' +
    'o rastro das partículas e o peso da câmera.';

  const range = $('#chrono-range');
  const agulha = $('#chrono-agulha');
  const linha = $('#linha-temporal');
  const elValor = $('#chrono-valor');
  const elEstado = $('#chrono-estado');
  const elNota = $('#chrono-nota');
  const min = parseFloat(range.min);
  const max = parseFloat(range.max);

  // marcas da linha temporal
  for (const m of CHRONO.marcas) {
    const pos = clamp(m.t, 0, 1);
    linha.append(el('div', { class: 'marca', style: { left: `${pos * 100}%` } }, el('span', { text: m.rotulo })));
  }

  const aplicar = (v, comSom = true) => {
    tempo.definirBase(v);
    if (comSom) audio.tocar('metal', { volume: 0.12, detune: (v - 1) * 600 });
  };

  range.addEventListener('input', () => aplicar(parseFloat(range.value)));
  range.addEventListener('pointerdown', () => stage.rig.impulso({ fov: -1.2, tremor: 0.05 }));

  // --- métricas derivadas ---
  const metricas = [
    { rotulo: 'DILATAÇÃO', calc: (ts) => `${(1 / Math.max(ts, 0.05)).toFixed(2)}x` },
    { rotulo: 'JANELA DE LEITURA', calc: (ts) => `${(0.31 / Math.max(ts, 0.05)).toFixed(2)}s` },
    { rotulo: 'RASTRO', calc: (ts) => `${Math.round(clamp((ts - 1) * 120, 0, 100))}%` },
    { rotulo: 'ESTABILIDADE', calc: (ts) => `${Math.round(clamp(100 - Math.abs(ts - 1) * 55, 12, 100))}%` },
  ];
  const caixa = $('#chrono-metricas');
  const nos = metricas.map((m) => {
    const b = el('b', { text: m.calc(1) });
    caixa.append(el('div', {}, b, el('small', { text: m.rotulo })));
    return { ...m, b };
  });

  // --- QUEBRAR O TEMPO ---
  const botao = $('#botao-quebra');
  const rotulo = $('#quebra-rotulo');
  const corte = $('#corte');

  botao.addEventListener('click', () => {
    const ok = tempo.quebrar(2.1, CHRONO.quebrar.cooldown);
    if (!ok) return;
    audio.tocar('impacto', { volume: 1 });
    audio.tocar('vidro', { volume: 0.8 });
    stage.rig.impulso({ fov: -14, tremor: 1 });

    // onda de energia atravessando a tela
    gsap
      .timeline()
      .set(corte, { opacity: 1, backgroundPosition: '220% 0' })
      .to(corte, { backgroundPosition: '-120% 0', duration: 0.85, ease: 'power2.out' })
      .to(corte, { opacity: 0, duration: 0.4 }, '>-0.25');

    // o texto da página sofre distorção durante o congelamento
    document.documentElement.dataset.quebrado = 'sim';
    gsap.fromTo(
      '#chrono .interior, #hero .interior',
      { filter: 'none' },
      {
        keyframes: [
          { filter: 'blur(1.4px) contrast(1.25)', duration: 0.12 },
          { filter: 'none', duration: 0.18 },
          { filter: 'blur(2.2px) hue-rotate(28deg)', duration: 0.1 },
          { filter: 'none', duration: 0.5 },
        ],
      }
    );
    setTimeout(() => {
      delete document.documentElement.dataset.quebrado;
      audio.tocar('pulso', { volume: 0.9 });
    }, 2150);
  });

  tempo.escutar((ev) => {
    if (ev === 'quebra-inicio') rotulo.textContent = CHRONO.quebrar.rotuloAtivo;
    if (ev === 'quebra-fim') rotulo.textContent = CHRONO.quebrar.rotulo;
  });

  let acumulado = 0;
  return {
    atualizar(dt) {
      // agulha e leituras seguem a escala REAL da cena, não o valor do input
      const ts = tempo.atual;
      const p = clamp(invLerp(min, max, ts), 0, 1);
      agulha.style.left = `${p * 100}%`;

      botao.style.setProperty('--p', String(tempo.emCooldown ? tempo.progressoCooldown : 1));
      botao.disabled = tempo.emCooldown || tempo.quebrando;

      acumulado += dt;
      if (acumulado < 0.08) return;
      acumulado = 0;

      elValor.textContent = `${ts.toFixed(2)}x`;
      const estado = CHRONO.estados.find((e) => ts < e.limite) || CHRONO.estados.at(-1);
      if (elEstado.textContent !== estado.nome) {
        elEstado.textContent = estado.nome;
        elNota.textContent = estado.nota;
      }
      for (const n of nos) n.b.textContent = n.calc(ts);
      audio.setTimeScale(ts);
    },
  };
}
