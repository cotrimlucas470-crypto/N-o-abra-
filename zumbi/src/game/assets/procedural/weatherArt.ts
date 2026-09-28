/**
 * Arte do CLIMA desenhada uma vez (procedural): neve sobre objetos, flocos,
 * riscos de chuva, respingos, folhas, pegadas e marcas de pneu.
 *
 * A neve, a água e o gelo no CHÃO não são desenhos: são calculados pixel a
 * pixel pelos shaders (world/render/weatherShaders.ts), com os ruídos de
 * weatherNoise.ts — sem tile repetido.
 */
import { hash2, Random } from '../../core/Random';
import { makeCanvas } from './canvas';

const sstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

const byte = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

// ---------------------------------------------------------------- objetos

/** Ruído de valor suave (sem blocos): relevo da neve sobre o objeto. */
function vnoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Folhagem (copa, arbusto, cerca viva) ou objeto sólido (carro, caçamba, tambor...). */
export type SnowObjKind = 'foliage' | 'solid';

/**
 * Neve por cima de um objeto visto de cima, em 3 níveis (pouca, média,
 * muita), seguindo o PRÓPRIO desenho:
 * - folhagem: a neve pousa nos tufos claros de folha; os vãos entre eles
 *   continuam verde-escuros (como arbusto nevado de verdade);
 * - sólido: placas nas partes LISAS longe da borda (teto, capô, tampa),
 *   vidro com camada fina, laterais livres.
 * A cor da neve leva o claro/escuro do desenho (volume) e uma sombra azulada
 * fina do lado de baixo de cada placa. Ruído suave: nada de bloco quadrado.
 */
export function drawObjectSnow(src: HTMLCanvasElement, seed: number, kind: SnowObjKind = 'solid'): HTMLCanvasElement[] {
  const w = src.width;
  const h = src.height;
  const data = src.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data;
  const n = w * h;
  const alpha = new Float32Array(n);
  const lum = new Float32Array(n);
  let lmin = 1;
  let lmax = 0;
  for (let i = 0; i < n; i++) {
    alpha[i] = data[i * 4 + 3]! / 255;
    const l = (data[i * 4]! * 0.3 + data[i * 4 + 1]! * 0.59 + data[i * 4 + 2]! * 0.11) / 255;
    lum[i] = l;
    if (alpha[i]! > 0.5) {
      lmin = Math.min(lmin, l);
      lmax = Math.max(lmax, l);
    }
  }
  const span = Math.max(0.05, lmax - lmin);
  // Média local do brilho (janela 7×7, só pixels do objeto): separa tufo claro de vão escuro.
  const R = 3;
  const sumL = new Float32Array((w + 1) * (h + 1));
  const sumA = new Float32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const a = alpha[i]! > 0.5 ? 1 : 0;
      const k = (y + 1) * (w + 1) + x + 1;
      sumL[k] = lum[i]! * a + sumL[k - 1]! + sumL[k - (w + 1)]! - sumL[k - (w + 1) - 1]!;
      sumA[k] = a + sumA[k - 1]! + sumA[k - (w + 1)]! - sumA[k - (w + 1) - 1]!;
    }
  const localMean = (x: number, y: number) => {
    const x0 = Math.max(0, x - R);
    const y0 = Math.max(0, y - R);
    const x1 = Math.min(w, x + R + 1);
    const y1 = Math.min(h, y + R + 1);
    const at = (xx: number, yy: number, t: Float32Array) => t[yy * (w + 1) + xx]!;
    const sl = at(x1, y1, sumL) - at(x0, y1, sumL) - at(x1, y0, sumL) + at(x0, y0, sumL);
    const sa = at(x1, y1, sumA) - at(x0, y1, sumA) - at(x1, y0, sumA) + at(x0, y0, sumA);
    return sa > 0 ? sl / sa : lum[y * w + x]!;
  };
  // Distância até a borda da silhueta (chanfro em 2 passadas).
  const dist = new Float32Array(n);
  for (let i = 0; i < n; i++) dist[i] = alpha[i]! > 0.5 ? 99 : 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!dist[i]) continue;
      dist[i] = Math.min(dist[i]!, (x > 0 ? dist[i - 1]! : 0) + 1, (y > 0 ? dist[i - w]! : 0) + 1);
    }
  for (let y = h - 1; y >= 0; y--)
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (!dist[i]) continue;
      dist[i] = Math.min(dist[i]!, (x < w - 1 ? dist[i + 1]! : 0) + 1, (y < h - 1 ? dist[i + w]! : 0) + 1);
    }
  const edge = kind === 'foliage' ? Math.max(1.5, Math.min(4, Math.min(w, h) * 0.03)) : Math.max(3, Math.min(8, Math.min(w, h) * 0.07));
  const score = new Float32Array(n).fill(-9);
  const hp = new Float32Array(n);
  const opaque: number[] = [];
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (alpha[i]! < 0.5) continue;
      const m = localMean(x, y);
      hp[i] = lum[i]! - m;
      const b = (lum[i]! - lmin) / span;
      const inside = Math.min(1, dist[i]! / edge);
      let sc: number;
      if (kind === 'foliage') {
        const nz = vnoise(x / 7, y / 7, seed) * 0.6 + vnoise(x / 3, y / 3, seed + 1) * 0.4;
        sc = b * 0.45 + (hp[i]! / span) * 1.6 + (nz - 0.5) * 0.45 + inside * 0.15;
      } else {
        const grad = Math.abs(lum[i + 1]! - lum[i - 1]!) + Math.abs(lum[i + w]! - lum[i - w]!);
        const flat = 1 - Math.min(1, grad * 4);
        const nz = vnoise(x / 9, y / 9, seed) * 0.65 + vnoise(x / 4, y / 4, seed + 1) * 0.35;
        sc = inside * (0.5 * flat + 0.3 * b + 0.2) + (nz - 0.5) * 0.5 - (inside < 0.35 ? 1 : 0);
      }
      score[i] = sc;
      opaque.push(sc);
    }
  opaque.sort((a, b) => a - b);
  const fractions = kind === 'foliage' ? [0.2, 0.38, 0.58] : [0.18, 0.36, 0.55];
  const out: HTMLCanvasElement[] = [];
  for (const frac of fractions) {
    const thr = opaque.length ? opaque[Math.min(opaque.length - 1, Math.floor((1 - frac) * opaque.length))]! : 9;
    const { canvas, ctx } = makeCanvas(w, h);
    const img = ctx.createImageData(w, h);
    const px = img.data;
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (alpha[i]! < 0.5) continue;
        const d = score[i]! - thr;
        const o = i * 4;
        if (d <= 0) {
          // Sombra fina da placa de neve (do lado de baixo, a luz vem do noroeste).
          if (score[i - w - 1]! - thr > 0.02) {
            px[o] = 38;
            px[o + 1] = 48;
            px[o + 2] = 70;
            px[o + 3] = 64;
          }
          continue;
        }
        const depth = sstep(0, 0.2, d);
        let light = 0.6 + (hp[i]! / span) * 1.4 + ((lum[i]! - lmin) / span - 0.5) * 0.35 + depth * 0.18;
        light -= (1 - sstep(0, 0.04, d)) * 0.2;
        light = Math.max(0, Math.min(1, light));
        px[o] = byte(158 + (247 - 158) * light);
        px[o + 1] = byte(172 + (249 - 172) * light);
        px[o + 2] = byte(198 + (253 - 198) * light);
        px[o + 3] = Math.round(sstep(0, 0.025, d) * 250 * Math.min(1, alpha[i]!));
      }
    ctx.putImageData(img, 0, 0);
    out.push(canvas);
  }
  return out;
}

// ---------------------------------------------------------------- partículas e marcas

/** Floco de neve (ponto macio). */
export function drawSnowFlake(size: number): HTMLCanvasElement {
  // Miolo branco com uma borda cinza-azulada bem fraca: o floco aparece até
  // por cima do chão nevado.
  const { canvas, ctx } = makeCanvas(size, size);
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.42, 'rgba(250,252,255,0.95)');
  g.addColorStop(0.62, 'rgba(160,176,200,0.3)');
  g.addColorStop(1, 'rgba(160,176,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** Neve arrastada pelo vento rente ao chão (risco horizontal). */
export function drawSnowStreak(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(40, 3);
  const g = ctx.createLinearGradient(0, 0, 40, 0);
  g.addColorStop(0, 'rgba(240,245,252,0)');
  g.addColorStop(0.5, 'rgba(240,245,252,0.55)');
  g.addColorStop(1, 'rgba(240,245,252,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0.5, 40, 2);
  return canvas;
}

/** Gota grande perto da "câmera" (mais rápida e borrada). */
export function drawRainNear(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(4, 44);
  const g = ctx.createLinearGradient(0, 0, 0, 44);
  g.addColorStop(0, 'rgba(210,222,240,0)');
  g.addColorStop(0.7, 'rgba(210,222,240,0.35)');
  g.addColorStop(1, 'rgba(230,238,250,0.6)');
  ctx.fillStyle = g;
  ctx.fillRect(1, 0, 2, 44);
  return canvas;
}

/** Respingo de chuva no chão (anel achatado). */
export function drawSplash(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(20, 12);
  ctx.strokeStyle = 'rgba(215,228,245,0.85)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(10, 6, 8, 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(230,240,252,0.8)';
  ctx.fillRect(9, 2, 2, 2);
  return canvas;
}

/** Folha voando (branca: a partícula pinta com a cor da estação). */
export function drawLeaf(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(10, 6);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(5, 3, 4.5, 2.2, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(1, 3.5);
  ctx.lineTo(9, 2.5);
  ctx.stroke();
  return canvas;
}

/** Pegada de bota na neve (uma). */
export function drawFootprint(): HTMLCanvasElement {
  // Afundado na neve: fundo azulado, a borda do noroeste em sombra (a luz vem de lá)
  // e um friso claro de neve empurrada do outro lado.
  const { canvas, ctx } = makeCanvas(18, 11);
  const print = (dx: number, dy: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(11 + dx, 5.5 + dy, 5, 3.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4 + dx, 5.5 + dy, 2.8, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  print(0.8, 0.8, 'rgba(255,255,255,0.4)');
  print(0, 0, 'rgba(118,136,165,0.55)');
  print(-0.7, -0.7, 'rgba(78,94,122,0.35)');
  print(0.3, 0.3, 'rgba(128,146,175,0.3)');
  return canvas;
}

/** Trecho de marca de pneu: faixa compactada com os sulcos da banda de rodagem. */
export function drawTireTrack(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(18, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(0, 11, 18, 1);
  ctx.fillStyle = 'rgba(96,110,134,0.45)';
  ctx.fillRect(0, 1, 18, 10);
  ctx.fillStyle = 'rgba(62,74,96,0.4)';
  ctx.fillRect(0, 1, 18, 1.5);
  for (let x = 1; x < 18; x += 4) ctx.fillRect(x, 3, 2, 6);
  return canvas;
}

/** Floco perto da "câmera": grande, macio e meio transparente (desfocado). */
export function drawSnowBokeh(size: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size, size);
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.35, 'rgba(248,251,255,0.55)');
  g.addColorStop(0.75, 'rgba(240,246,252,0.16)');
  g.addColorStop(1, 'rgba(240,246,252,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/**
 * Raio (visto de cima, no céu da tempestade): caminho em zigue-zague com
 * galhos, halo largo e fraco, miolo branco-azulado. Desenhado uma vez; a
 * tela mostra por décimos de segundo junto com o clarão.
 */
export function drawBolt(): HTMLCanvasElement {
  const W = 180;
  const H = 440;
  const { canvas, ctx } = makeCanvas(W, H);
  const rng = new Random(9911);
  const path = (x: number, y: number, len: number, spread: number, depth: number): [number, number][] => {
    const pts: [number, number][] = [[x, y]];
    let cx = x;
    let cy = y;
    const steps = Math.max(4, Math.round(len / 18));
    for (let i = 0; i < steps; i++) {
      cx += rng.range(-spread, spread);
      cy += len / steps;
      cx = Math.max(8, Math.min(W - 8, cx));
      pts.push([cx, cy]);
      if (depth > 0 && rng.chance(0.18)) branches.push(path(cx, cy, len * rng.range(0.25, 0.45), spread * 0.8, depth - 1));
    }
    return pts;
  };
  const branches: [number, number][][] = [];
  const main = path(W / 2 + rng.range(-20, 20), 0, H - 10, 22, 2);
  const stroke = (pts: [number, number][], width: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0]![0], pts[0]![1]);
    for (const [x, y] of pts.slice(1)) ctx.lineTo(x, y);
    ctx.stroke();
  };
  for (const [w, c] of [
    [16, 'rgba(150,170,255,0.08)'],
    [8, 'rgba(180,200,255,0.2)'],
    [3.2, 'rgba(215,228,255,0.7)'],
    [1.4, 'rgba(255,255,255,1)'],
  ] as const) {
    stroke(main, w, c);
    for (const b of branches) stroke(b, w * 0.6, c);
  }
  return canvas;
}
