import { PROTOCOLO } from '../data/config.js';
import { $, el, onEnter } from '../utils/dom.js';
import { Estrutura } from '../scene/Holografia.js';
import { audio } from '../utils/audio.js';
import { clamp } from '../utils/math.js';

/**
 * PROTOCOLO DE RETORNO — linha temporal 3D.
 *
 * Cada etapa tem um CRISTAL no espaço da câmera, remontado peça a peça
 * quando entra na viewport (a etapa 01 pede exatamente isso: "um fragmento
 * de espelho se encaixa lentamente"). A etapa 02 ganha uma demonstração
 * abstrata do ritmo — não texto. A etapa 03 abre os três slots de build,
 * todos marcados como campo editável.
 */
export function montarProtocolo({ stage, escurecerCena }) {
  $('#protocolo-subtitulo').textContent = PROTOCOLO.subtitulo;
  const lista = $('#protocolo-lista');
  const demos = [];

  PROTOCOLO.etapas.forEach((etapa, i) => {
    const corpo = el(
      'div',
      { class: 'vidro etapa-corpo sheen', 'data-espelho': true },
      el(
        'header',
        {},
        el('h3', { text: etapa.nome }),
        el('span', { class: 'rotulo-tec', text: etapa.quando }),
        el('span', { class: 'rotulo-tec', style: { opacity: '.6' }, text: etapa.contexto })
      ),
      el('p', { text: etapa.resumo })
    );

    if (etapa.itens.length) {
      corpo.append(el('ul', { class: 'etapa-itens' }, ...etapa.itens.map((t) => el('li', { text: t }))));
    }

    if (etapa.animacao === 'ritmo') {
      const caixa = el('div', { class: 'ritmo-demo' });
      const cv = document.createElement('canvas');
      caixa.append(cv);
      corpo.append(caixa);
      demos.push(criarDemoRitmo(cv));
    }

    if (etapa.animacao === 'build') {
      const slots = el(
        'div',
        { class: 'slots' },
        ...PROTOCOLO.build.slots.map((s) =>
          el(
            'div',
            { class: 'vidro slot sheen', 'data-espelho': true },
            el('span', { class: 'icone', text: s.icone, 'aria-hidden': 'true' }),
            el('h4', { text: s.nome }),
            el(
              'dl',
              {},
              el('dt', { text: 'Função' }),
              el('dd', { text: s.funcao }),
              el('dt', { text: 'Atributo' }),
              el('dd', { text: s.atributo }),
              el('dt', { text: 'Motivo' }),
              el('dd', { text: s.motivo })
            ),
            s.editavel ? el('span', { class: 'editavel', text: 'CAMPO EDITÁVEL' }) : null
          )
        )
      );
      corpo.append(slots);
      corpo.append(
        el(
          'p',
          { class: 'aviso-build' },
          el('span', { class: 'editavel', text: 'VERSÃO' }),
          el('span', { text: PROTOCOLO.build.aviso })
        )
      );
    }

    corpo.append(
      el('div', { class: 'etapa-objetivo' }, el('b', { class: 'rotulo-tec', text: 'OBJETIVO' }), el('div', { text: etapa.objetivo }))
    );

    const marca = el(
      'div',
      { class: 'etapa-marca' },
      el('span', { class: 'indice', text: etapa.indice }),
      el('span', { class: 'linha' })
    );

    const bloco = el('article', { class: 'etapa', 'data-revelar': true, style: { '--atraso': `${i * 0.08}s` } }, marca, corpo);
    lista.append(bloco);

    const est = new Estrutura({
      tipo: 'cristal',
      el: marca,
      envMap: stage.envMap,
      tom: i / Math.max(1, PROTOCOLO.etapas.length - 1),
      rotulo: etapa.indice,
      distancia: 8,
    });
    stage.registrarEstrutura(est);

    onEnter(
      bloco,
      (dentro) => {
        est.visivel = dentro;
        if (dentro) audio.tocar('vidro', { volume: 0.22, detune: i * 300 });
      },
      { threshold: 0.15, once: false, rootMargin: '-8% 0px' }
    );

    corpo.addEventListener('pointerenter', () => {
      est.focar = true;
      escurecerCena(0.26);
    });
    corpo.addEventListener('pointerleave', () => {
      est.focar = false;
      escurecerCena(0);
    });
  });

  return {
    atualizar(dt, escalaTempo) {
      for (const d of demos) d.atualizar(dt, escalaTempo);
    },
  };
}

/**
 * Demonstração abstrata do RITMO DO ESPELHO.
 * Uma trilha: marcador principal, eco de troca de posição, janelas de
 * habilidade e o pulso de reset. Obedece à escala temporal da cena.
 */
function criarDemoRitmo(canvas) {
  const ctx = canvas.getContext('2d');
  let w = 0;
  let h = 0;
  let t = 0;
  let visivel = true;

  onEnter(canvas, (dentro) => (visivel = dentro), { threshold: 0.05, once: false });

  const redimensionar = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.floor(r.width));
    h = Math.max(1, Math.floor(r.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  redimensionar();
  window.addEventListener('resize', redimensionar, { passive: true });

  const CICLO = 3.4;
  const janelas = [
    { ini: 0.04, fim: 0.2, rotulo: 'HAB', cor: '#00E5FF' },
    { ini: 0.26, fim: 0.42, rotulo: 'TROCA', cor: '#7B61FF' },
    { ini: 0.48, fim: 0.62, rotulo: 'BÁSICO', cor: '#00E5FF' },
    { ini: 0.72, fim: 0.86, rotulo: 'RESET', cor: '#E8F1FF' },
  ];

  return {
    atualizar(dt, escala = 1) {
      if (!visivel || w === 0) return;
      t = (t + dt * escala) % CICLO;
      const p = t / CICLO;

      ctx.clearRect(0, 0, w, h);

      // trilho
      const y = h * 0.62;
      ctx.strokeStyle = 'rgba(184,196,216,0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(12, y);
      ctx.lineTo(w - 12, y);
      ctx.stroke();

      const px = (v) => 12 + v * (w - 24);

      // janelas
      for (const j of janelas) {
        const ativa = p >= j.ini && p <= j.fim;
        ctx.fillStyle = ativa ? `${j.cor}33` : 'rgba(184,196,216,0.06)';
        ctx.fillRect(px(j.ini), y - 22, px(j.fim) - px(j.ini), 44);
        ctx.strokeStyle = ativa ? j.cor : 'rgba(184,196,216,0.16)';
        ctx.strokeRect(px(j.ini) + 0.5, y - 22.5, px(j.fim) - px(j.ini) - 1, 44);
        ctx.fillStyle = ativa ? j.cor : 'rgba(184,196,216,0.42)';
        ctx.font = '9px "Share Tech Mono", monospace';
        ctx.fillText(j.rotulo, px(j.ini) + 4, y - 27);
      }

      // eco: a posição anterior ainda visível (a leitura de "dois lugares")
      const pe = (p + 0.86) % 1;
      ctx.fillStyle = 'rgba(123,97,255,0.5)';
      ctx.beginPath();
      ctx.arc(px(pe), y, 5, 0, Math.PI * 2);
      ctx.fill();

      // marcador principal + rastro
      const x = px(p);
      const grad = ctx.createLinearGradient(x - 60, 0, x, 0);
      grad.addColorStop(0, 'rgba(0,229,255,0)');
      grad.addColorStop(1, 'rgba(0,229,255,0.7)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.max(12, x - 60), y);
      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.fillStyle = '#E8F1FF';
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // pulso do reset
      const dist = Math.abs(p - 0.79);
      if (dist < 0.08) {
        const k = 1 - dist / 0.08;
        ctx.strokeStyle = `rgba(232,241,255,${(k * 0.7).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px(0.79), y, 8 + (1 - k) * 40, 0, Math.PI * 2);
        ctx.stroke();
      }

      // barra de ciclo
      ctx.fillStyle = 'rgba(184,196,216,0.1)';
      ctx.fillRect(12, h - 8, w - 24, 2);
      ctx.fillStyle = '#00E5FF';
      ctx.fillRect(12, h - 8, clamp(p, 0, 1) * (w - 24), 2);
    },
  };
}
