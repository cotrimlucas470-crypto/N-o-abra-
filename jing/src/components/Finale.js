import { FINAL } from '../data/config.js';
import { $, onEnter } from '../utils/dom.js';
import { audio } from '../utils/audio.js';
import { tempo } from '../animations/timeControl.js';
import { clamp } from '../utils/math.js';

/**
 * CENA FINAL.
 * Os cacos espalhados convergem conforme o scroll; por alguns segundos
 * formam UMA superfície de espelho inteira; então ela quebra outra vez.
 */
export function montarFinal({ stage, gsap, ScrollTrigger }) {
  const linhas = $('#final-linhas').querySelectorAll('p');
  linhas.forEach((p, i) => (p.textContent = FINAL.linhas[i] || ''));
  $('#final-rodape').textContent = FINAL.rodape;
  const cta = $('#cta-final');
  cta.querySelector('span:nth-child(2)').textContent = FINAL.cta;

  const secao = $('#final');
  let seguradoEm = null;
  let jaQuebrou = false;

  onEnter(
    secao,
    (dentro) => {
      stage.espelhoFinal.ativa = dentro;
      stage.estado.presencaVisivel = !dentro;
      if (!dentro) {
        stage.espelhoFinal.religar();
        jaQuebrou = false;
        seguradoEm = null;
      }
    },
    { threshold: 0.02, once: false }
  );

  ScrollTrigger.create({
    trigger: secao,
    start: 'top 85%',
    end: 'bottom bottom',
    scrub: true,
    onUpdate(self) {
      // a convergência acompanha o scroll — o usuário fecha o espelho
      stage.espelhoFinal.definirFase(clamp(self.progress * 1.35, 0, 1));
    },
  });

  gsap.timeline({
    scrollTrigger: { trigger: secao, start: 'top 72%', end: 'top 20%', scrub: 0.8 },
  })
    .fromTo(linhas[0], { opacity: 0, y: 40, filter: 'blur(14px)' }, { opacity: 1, y: 0, filter: 'blur(0px)' })
    .fromTo(linhas[1], { opacity: 0, y: 30 }, { opacity: 1, y: 0 }, '>-0.2')
    .fromTo(linhas[2], { opacity: 0, y: 30, letterSpacing: '0.6em' }, { opacity: 1, y: 0, letterSpacing: '0.16em' }, '>-0.15');

  // retorno ao campo: volta ao topo com corte cinematográfico
  const corte = $('#corte');
  cta.addEventListener('click', () => {
    audio.tocar('transicao', { volume: 0.8 });
    audio.tocar('pulso', { volume: 0.7 });
    tempo.pulso(0.3, 900);
    stage.rig.impulso({ fov: -10, tremor: 0.6 });
    gsap
      .timeline()
      .set(corte, { opacity: 1, backgroundPosition: '220% 0' })
      .to(corte, { backgroundPosition: '-120% 0', duration: 1.0, ease: 'power2.inOut' })
      .to(corte, { opacity: 0, duration: 0.5 }, '>-0.35');
    gsap.to(window, { scrollTo: { y: 0, autoKill: false }, duration: 1.6, ease: 'power3.inOut', overwrite: 'auto' });
  });

  return {
    atualizar(dt) {
      const esp = stage.espelhoFinal;
      if (!esp.ativo) return;
      if (esp.inteiro && !jaQuebrou) {
        if (seguradoEm === null) {
          seguradoEm = 0;
          audio.tocar('metal', { volume: 0.8 });
          tempo.pulso(0.42, 1400);
        }
        seguradoEm += dt;
        // alguns segundos de espelho inteiro antes de quebrar de novo
        if (seguradoEm > 2.6) {
          jaQuebrou = true;
          esp.quebrar();
          audio.tocar('vidro', { volume: 1 });
          audio.tocar('impacto', { volume: 0.9 });
          stage.rig.impulso({ fov: -16, tremor: 1 });
          tempo.pulso(0.35, 700);
        }
      }
      if (!esp.inteiro && !esp._quebrando) seguradoEm = null;
    },
  };
}
