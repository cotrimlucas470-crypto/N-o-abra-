/**
 * Detecção de capacidade + redução dinâmica de qualidade.
 *
 * Tiers:
 *   3 ALTO   — desktop dedicado: vidro com transmissão, DOF, bloom, 8k partículas
 *   2 MÉDIO  — laptop/tablet:     bloom + pós final, sem DOF, 4k partículas
 *   1 BAIXO  — celular:           bloom barato, geometria reduzida, 1.6k partículas
 *   0 MÍNIMO — reduced-motion /   render direto, cena quase estática, tudo legível
 *              hardware fraco
 */
const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const mqCoarse = window.matchMedia('(pointer: coarse)');
const mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');

function gpuHint() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return { ok: false, renderer: '', maxTex: 0 };
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return { ok: true, renderer, maxTex };
  } catch (_) {
    return { ok: false, renderer: '', maxTex: 0 };
  }
}

const PERFIS = {
  3: {
    tier: 3,
    nome: 'ALTO',
    particulas: 8000,
    fragmentos: { longe: 210, medio: 130, perto: 46 },
    heroVidro: 14,
    transmissao: true,
    bloom: true,
    bloomForca: 0.85,
    dof: true,
    posFinal: true,
    sombras: false,
    envRes: 256,
    maxPixelRatio: 2,
    placas: 26,
  },
  2: {
    tier: 2,
    nome: 'MÉDIO',
    particulas: 4200,
    fragmentos: { longe: 150, medio: 92, perto: 30 },
    heroVidro: 9,
    transmissao: false,
    bloom: true,
    bloomForca: 0.72,
    dof: false,
    posFinal: true,
    sombras: false,
    envRes: 128,
    maxPixelRatio: 1.75,
    placas: 18,
  },
  1: {
    tier: 1,
    nome: 'BAIXO',
    particulas: 1600,
    fragmentos: { longe: 84, medio: 52, perto: 18 },
    heroVidro: 5,
    transmissao: false,
    bloom: true,
    bloomForca: 0.6,
    dof: false,
    posFinal: true,
    sombras: false,
    envRes: 64,
    maxPixelRatio: 1.35,
    placas: 10,
  },
  0: {
    tier: 0,
    nome: 'MÍNIMO',
    particulas: 500,
    fragmentos: { longe: 40, medio: 26, perto: 10 },
    heroVidro: 3,
    transmissao: false,
    bloom: false,
    bloomForca: 0,
    dof: false,
    posFinal: false,
    sombras: false,
    envRes: 32,
    maxPixelRatio: 1,
    placas: 6,
  },
};

function detectarTier() {
  const g = gpuHint();
  if (!g.ok) return 0;

  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const largura = Math.max(window.screen.width, window.screen.height);
  const coarse = mqCoarse.matches;
  const r = g.renderer.toLowerCase();
  const swiftshader = /swiftshader|software|llvmpipe|angle \(google/.test(r);

  if (swiftshader) return 1;

  let tier;
  if (coarse) {
    // celular / tablet
    tier = mem >= 6 && cores >= 6 && largura >= 900 ? 2 : 1;
  } else {
    tier = 3;
    if (mem <= 4 || cores <= 4) tier = 2;
    if (mem <= 2 || cores <= 2) tier = 1;
  }
  if (g.maxTex && g.maxTex < 4096) tier = Math.min(tier, 1);
  return tier;
}

export function criarPerf() {
  const reduzir = mqReduce.matches;
  let tier = reduzir ? 0 : detectarTier();
  let perfil = { ...PERFIS[tier] };

  const estado = {
    get tier() {
      return tier;
    },
    get perfil() {
      return perfil;
    },
    reduzirMovimento: reduzir,
    toqueApenas: mqCoarse.matches,
    ponteiroFino: mqFine.matches,
    fps: 60,
    rebaixou: false,
    ouvintes: new Set(),
  };

  estado.onMudanca = (fn) => {
    estado.ouvintes.add(fn);
    return () => estado.ouvintes.delete(fn);
  };

  function aplicar(novoTier, motivo) {
    if (novoTier === tier) return;
    tier = novoTier;
    perfil = { ...PERFIS[tier] };
    estado.rebaixou = true;
    document.documentElement.dataset.tier = String(tier);
    for (const fn of estado.ouvintes) fn(perfil, motivo);
  }
  estado.aplicarTier = aplicar;

  // --- vigia de framerate: rebaixa sozinho se a média cair ---
  let acumulado = 0;
  let quadros = 0;
  let janelasRuins = 0;
  let carencia = 2.5; // segundos de folga antes de começar a julgar

  estado.amostrar = (dt) => {
    if (carencia > 0) {
      carencia -= dt;
      return;
    }
    acumulado += dt;
    quadros++;
    if (acumulado >= 1) {
      const fps = quadros / acumulado;
      estado.fps = fps;
      acumulado = 0;
      quadros = 0;
      if (fps < 34 && tier > 0) {
        janelasRuins += fps < 18 ? 2 : 1; // queda brusca não espera duas janelas
        if (janelasRuins >= 2) {
          janelasRuins = 0;
          carencia = 3;
          aplicar(tier - 1, 'fps');
        }
      } else {
        janelasRuins = Math.max(0, janelasRuins - 1);
      }
    }
  };

  document.documentElement.dataset.tier = String(tier);
  if (reduzir) document.documentElement.dataset.reduzir = 'sim';
  if (estado.toqueApenas) document.documentElement.dataset.toque = 'sim';

  mqReduce.addEventListener?.('change', (e) => {
    estado.reduzirMovimento = e.matches;
    document.documentElement.dataset.reduzir = e.matches ? 'sim' : 'nao';
    if (e.matches) aplicar(0, 'reduced-motion');
  });

  return estado;
}
