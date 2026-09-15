import { SECOES } from '../data/config.js';
import { $, $$ } from '../utils/dom.js';
import { clamp } from '../utils/math.js';
import { audio } from '../utils/audio.js';

/**
 * SCROLL CINEMATOGRÁFICO.
 *
 * O scroll da página não muda "de seção em seção": ele move a câmera ao
 * longo da rota do salão. Cada seção acrescenta a sua própria transição —
 * os espelhos giram, a névoa fecha, a câmera desce — e o conteúdo entra
 * com atraso escalonado.
 */
export function montarScroll({ gsap, ScrollTrigger, stage, hud, perf }) {
  const reduzido = perf.reduzirMovimento;

  // --- a câmera atravessa o salão ---
  ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate(self) {
      stage.rig.definirProgresso(self.progress);
      stage.estado.scroll = (self.progress - 0.5) * 2;
      stage.estado.progresso = self.progress;
    },
  });

  // --- transições por seção ---
  const secoes = SECOES.map((s) => ({ ...s, el: document.getElementById(s.id) })).filter((s) => s.el);

  for (const s of secoes) {
    ScrollTrigger.create({
      trigger: s.el,
      start: 'top 62%',
      end: 'bottom 38%',
      onToggle(self) {
        if (self.isActive) {
          hud.marcarSecao(s.id);
          document.documentElement.dataset.secao = s.id;
        }
      },
    });
  }

  // os espelhos giram entre CHRONO MIRROR e a curva de aprendizado
  const chrono = document.getElementById('chrono');
  if (chrono) {
    ScrollTrigger.create({
      trigger: chrono,
      start: 'top 70%',
      end: 'bottom 20%',
      scrub: 0.6,
      onUpdate(self) {
        stage.corredor.giro = Math.sin(self.progress * Math.PI) * 0.9;
      },
    });
  }

  // a névoa fecha e a atmosfera muda de peso ao longo da travessia
  ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1.2,
    onUpdate(self) {
      const p = self.progress;
      stage.cena.fog.density = 0.0165 + Math.sin(p * Math.PI) * 0.012;
      stage.nevoa.userData.uniforms.uOpacidade.value = 0.7 + Math.sin(p * Math.PI * 1.4) * 0.5;
      stage.feixes.userData.uniforms.uForca.value = 0.6 + Math.cos(p * Math.PI * 2) * 0.4;
    },
  });

  // --- entradas de conteúdo ---
  const revelaveis = $$('[data-revelar]');
  revelaveis.forEach((elx, i) => {
    if (reduzido) {
      elx.classList.add('revelado');
      return;
    }
    ScrollTrigger.create({
      trigger: elx,
      start: 'top 88%',
      once: true,
      onEnter() {
        elx.style.setProperty('--atraso', elx.style.getPropertyValue('--atraso') || `${(i % 4) * 0.07}s`);
        elx.classList.add('revelado');
      },
    });
  });

  // --- navegação pela trilha do HUD ---
  function irPara(id) {
    const alvo = document.getElementById(id);
    if (!alvo) return;
    audio.tocar('transicao', { volume: 0.4 });
    // alvo numérico e sem autoKill: o scrub da câmera roda no mesmo quadro e
    // o autoKill do plugin interpretaria isso como "o usuário rolou".
    const y = Math.max(0, alvo.getBoundingClientRect().top + window.scrollY);
    gsap.to(window, {
      scrollTo: { y, autoKill: false },
      duration: reduzido ? 0.35 : 1.5,
      ease: 'power3.inOut',
      overwrite: 'auto',
    });
  }

  // teclado: setas e Page Up/Down pulam seções
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const i = secoes.findIndex((s) => s.id === document.documentElement.dataset.secao);
    if (i < 0) return;
    if (e.key === 'PageDown') {
      e.preventDefault();
      irPara(secoes[clamp(i + 1, 0, secoes.length - 1)].id);
    }
    if (e.key === 'PageUp') {
      e.preventDefault();
      irPara(secoes[clamp(i - 1, 0, secoes.length - 1)].id);
    }
  });

  const refazer = () => ScrollTrigger.refresh();
  window.addEventListener('load', refazer);
  setTimeout(refazer, 800);
  document.fonts?.ready?.then(refazer);

  return { irPara, refazer };
}
