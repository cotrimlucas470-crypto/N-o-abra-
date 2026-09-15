import './styles/fontes.css';
import './styles/base.css';
import './styles/hud.css';
import './styles/ui.css';
import './styles/sections.css';

import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import ScrollToPlugin from 'gsap/ScrollToPlugin';

import { criarPerf } from './utils/perf.js';
import { $, el } from './utils/dom.js';
import { tempo } from './animations/timeControl.js';
import { montarSheen } from './animations/sheen.js';
import { montarScroll } from './animations/scroll.js';

import { montarCursor } from './components/Cursor.js';
import { montarHud } from './components/Hud.js';
import { montarHero } from './components/Hero.js';
import { montarIntro } from './components/Intro.js';
import { montarChrono } from './components/ChronoMirror.js';
import { montarCurva } from './components/LearningCurve.js';
import { montarCalculadora } from './components/Calculator.js';
import { montarProtocolo } from './components/Protocol.js';
import { montarMapa } from './components/MirrorMap.js';
import { montarCombos } from './components/Combos.js';
import { montarFinal } from './components/Finale.js';
import { montarAudio } from './components/AudioToggle.js';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });
// sem lag smoothing: num quadro longo (aparelho fraco, aba voltando ao foco)
// o padrão do GSAP congela as tweens de rolagem no meio do caminho.
gsap.ticker.lagSmoothing(0);

const perf = criarPerf();

/* ------------------------------------------------------------------ *
 * Palco 3D — com degradação honesta se o WebGL não estiver disponível.
 * ------------------------------------------------------------------ */
function temWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (_) {
    return false;
  }
}

function palcoInerte() {
  const nada = () => {};
  const uni = { value: 0 };
  return {
    inerte: true,
    envMap: null,
    estado: { scroll: 0, progresso: 0, presencaVisivel: true, escurecer: 0 },
    cena: { fog: { density: 0 } },
    nevoa: { userData: { uniforms: { uOpacidade: { ...uni } } } },
    feixes: { userData: { uniforms: { uForca: { ...uni } } } },
    corredor: { set giro(v) {} },
    presenca: { revelar: nada },
    espelhoFinal: {
      ativo: false,
      _quebrando: false,
      inteiro: false,
      set ativa(v) {},
      definirFase: nada,
      religar: nada,
      quebrar: () => false,
    },
    rig: { impulso: nada, definirProgresso: nada, intro: 0 },
    registrarEstrutura: () => nada,
    aoQuadro: () => nada,
    escurecer: nada,
    definirMouse: nada,
    iniciar: nada,
    pausar: nada,
  };
}

/* ------------------------------------------------------------------ *
 * Arranque. Tudo mora aqui dentro em vez de no topo do módulo: sem
 * top-level await, o mesmo código compila tanto para o bundle com code
 * splitting quanto para a versão de arquivo único (IIFE clássico).
 * ------------------------------------------------------------------ */
async function iniciar() {
  let stage;
  if (temWebGL()) {
    // o bundle 3D só é buscado quando existe WebGL para gastá-lo
    const { Stage } = await import('./scene/Stage.js');
    stage = new Stage({ canvas: $('#cena'), perf });
    stage.iniciar();
  } else {
    stage = palcoInerte();
    $('#cena')?.remove();
    document.body.append(
      el('div', {
        id: 'sem-webgl',
        text: 'WebGL indisponível neste dispositivo — o salão 3D foi desligado, mas todo o conteúdo continua acessível.',
      })
    );
    document.querySelectorAll('[data-revelar]').forEach((n) => n.classList.add('revelado'));
  }

  /* ------------------------------------------------------------------ *
   * Interface
   * ------------------------------------------------------------------ */
  // superfície única de depuração (também usada pelos testes visuais)
  window.__jing = { palco: stage, tempo, gsap, ScrollTrigger, perf };

  montarAudio();
  const navegacao = { irPara: () => {} };
  const hud = montarHud({ perf, aoIrPara: (id) => navegacao.irPara(id) });
  const cursor = montarCursor(perf);

  const escurecerCena = (v) => stage.escurecer(v);

  const hero = montarHero({
    gsap,
    stage,
    perf,
    aoAvancar: () => navegacao.irPara('chrono'),
  });
  const chrono = montarChrono({ stage, gsap });
  montarCurva({ stage, escurecerCena });
  montarCalculadora({ stage });
  const protocolo = montarProtocolo({ stage, escurecerCena });
  montarMapa({ stage, gsap, escurecerCena });
  montarCombos({ gsap });
  const final = montarFinal({ stage, gsap, ScrollTrigger });

  montarSheen();

  const scroll = montarScroll({ gsap, ScrollTrigger, stage, hud, perf });
  navegacao.irPara = scroll.irPara;

  /* ------------------------------------------------------------------ *
   * Ponteiro: -1..1, alimentando câmera, fragmentos, partículas e presença.
   * ------------------------------------------------------------------ */
  let px = 0;
  let py = 0;
  window.addEventListener(
    'pointermove',
    (e) => {
      px = (e.clientX / window.innerWidth) * 2 - 1;
      py = -((e.clientY / window.innerHeight) * 2 - 1);
      stage.definirMouse(px, py);
    },
    { passive: true }
  );
  window.addEventListener(
    'pointerleave',
    () => {
      px = 0;
      py = 0;
      stage.definirMouse(0, 0);
    },
    { passive: true }
  );

  // dispositivos com giroscópio ganham um parallax suave sem mouse
  if (perf.toqueApenas && window.DeviceOrientationEvent && !perf.reduzirMovimento) {
    window.addEventListener(
      'deviceorientation',
      (e) => {
        if (e.gamma == null || e.beta == null) return;
        px = Math.max(-1, Math.min(1, e.gamma / 35));
        py = Math.max(-1, Math.min(1, (e.beta - 45) / 45));
        stage.definirMouse(px * 0.6, py * 0.4);
      },
      { passive: true }
    );
  }

  /* ------------------------------------------------------------------ *
   * Um único laço: o palco chama os componentes que precisam de quadro.
   * ------------------------------------------------------------------ */
  function quadroDOM(dtReal, dtEscalado, _t, dtBruto = dtReal) {
    cursor.atualizar(dtReal);
    hud.atualizar(dtReal);
    chrono.atualizar(dtReal);
    hero.atualizar(dtReal);
    protocolo.atualizar(dtReal, tempo.atual);
    // o espelho final conta em tempo de relógio (escalado pelo domínio temporal):
    // a pausa com o espelho inteiro tem que durar segundos de verdade, mesmo
    // num aparelho lento onde o dt da simulação é limitado.
    final.atualizar(Math.min(dtBruto, 0.5) * tempo.atual);
  }

  if (stage.inerte) {
    let anterior = performance.now();
    const laco = (agora) => {
      const dt = Math.min((agora - anterior) / 1000, 0.05);
      anterior = agora;
      tempo.passo(dt);
      quadroDOM(dt, dt);
      requestAnimationFrame(laco);
    };
    requestAnimationFrame(laco);
  } else {
    stage.aoQuadro(quadroDOM);
  }

  /* ------------------------------------------------------------------ *
   * Abertura cinematográfica
   * ------------------------------------------------------------------ */
  montarIntro({
    gsap,
    stage,
    perf,
    aoTerminar: () => {
      ScrollTrigger.refresh();
      document.documentElement.dataset.pronto = 'sim';
    },
  });

  // última rede: se qualquer coisa impedir a abertura de terminar, a página
  // volta a rolar sozinha em vez de ficar presa.
  setTimeout(() => {
    if (document.body.dataset.travado) {
      delete document.body.dataset.travado;
      const capa = document.getElementById('abertura');
      if (capa) capa.hidden = true;
      ScrollTrigger.refresh();
    }
  }, 20000);

  // a escala de tempo também empurra o áudio
  tempo.escutar((ev) => {
    if (ev === 'quebra-inicio') document.documentElement.dataset.quebrado = 'sim';
    if (ev === 'quebra-fim') delete document.documentElement.dataset.quebrado;
  });
}

iniciar();
