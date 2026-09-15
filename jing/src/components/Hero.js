import { IDENTIDADE } from '../data/config.js';
import { $, el } from '../utils/dom.js';
import { tempo } from '../animations/timeControl.js';
import { audio } from '../utils/audio.js';

/**
 * HERO: título cromado com reflexo invertido e distorção de vidro,
 * manifesto e o CTA que dispara a travessia cinematográfica.
 */
export function montarHero({ gsap, stage, perf, aoAvancar }) {
  $('#hero-assinatura').textContent = IDENTIDADE.assinatura;
  $('#hero-titulo').textContent = IDENTIDADE.titulo;
  document.querySelector('.brilho-titulo').textContent = IDENTIDADE.titulo;
  document.querySelector('.hero-reflexo').textContent = IDENTIDADE.titulo;
  $('.hero-sub').textContent = IDENTIDADE.subtitulo;

  const manifesto = $('#hero-manifesto');
  manifesto.append(...IDENTIDADE.manifesto.map((linha) => el('span', { text: linha })));

  $('#hero-rodape').append(
    el('span', { text: 'DOMÍNIO TEMPORAL ATIVO' }),
    el('span', { text: 'RECUPERAÇÃO MECÂNICA · PROTOCOLO ABERTO' }),
    el('span', { text: 'PEÇA CONCEITUAL DE FÃ' })
  );

  const cta = $('#cta-principal');
  cta.querySelector('span:nth-child(2)').textContent = IDENTIDADE.cta;

  // --- luz que segue o ponteiro dentro do botão ---
  for (const botao of document.querySelectorAll('.botao')) {
    botao.addEventListener(
      'pointermove',
      (e) => {
        const r = botao.getBoundingClientRect();
        botao.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
        botao.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
      },
      { passive: true }
    );
    botao.addEventListener('pointerenter', () => {
      // os fragmentos do fundo reagem: pequena dilatação temporal
      tempo.pulso(0.68, 520);
      stage.rig.impulso({ fov: -1.4, tremor: 0.06 });
      audio.tocar('metal', { volume: 0.22 });
    });
  }

  // --- distorção viva do reflexo (feTurbulence animado) ---
  const turb = document.getElementById('turbulencia-reflexo');
  let fase = 0;
  const animarReflexo = (dt) => {
    if (!turb || perf.reduzirMovimento) return;
    fase += dt * 0.35;
    const fx = 0.009 + Math.sin(fase) * 0.004;
    const fy = 0.05 + Math.cos(fase * 0.7) * 0.02;
    turb.setAttribute('baseFrequency', `${fx.toFixed(5)} ${fy.toFixed(5)}`);
  };

  // --- CTA: transição cinematográfica ---
  const corte = $('#corte');
  cta.addEventListener('click', () => {
    audio.tocar('impacto', { volume: 0.8 });
    audio.tocar('vidro', { volume: 0.5 });
    tempo.pulso(0.28, 700);
    stage.rig.impulso({ fov: -11, tremor: 0.75 });

    gsap
      .timeline()
      .set(corte, { opacity: 1, backgroundPosition: '200% 0' })
      .to(corte, { backgroundPosition: '-100% 0', duration: 1.15, ease: 'power2.inOut' })
      .to(corte, { opacity: 0, duration: 0.45 }, '>-0.3');

    aoAvancar?.();
  });

  return { atualizar: animarReflexo };
}
