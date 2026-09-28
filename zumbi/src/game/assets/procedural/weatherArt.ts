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
import { periodicNoise } from './weatherNoise';

const sstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

const wrap = (v: number, n: number) => ((v % n) + n) % n;
const byte = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

// ---------------------------------------------------------------- telhado

/** Neve no telhado, estágio 1..5 (256 px, emenda nas bordas). */
export function drawRoofSnow(stage: number): HTMLCanvasElement {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S, S);
  const img = ctx.createImageData(S, S);
  const px = img.data;
  const N = periodicNoise(S, 9500, [
    [128, 0.45],
    [64, 0.3],
    [32, 0.15],
    [16, 0.1],
  ]);
  const F = periodicNoise(S, 9510, [[8, 1]]);
  const thr = 1 - (stage / 5) * 1.08;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const d = N[y * S + x]! - thr;
      const o = (y * S + x) * 4;
      if (d <= 0) continue;
      const depth = sstep(0, 0.2, d);
      const lit = (N[wrap(y - 1, S) * S + wrap(x - 1, S)]! - N[wrap(y + 1, S) * S + wrap(x + 1, S)]!) * 240;
      const f = (F[y * S + x]! - 0.5) * 12;
      px[o] = byte(188 + 55 * depth + lit + f);
      px[o + 1] = byte(200 + 47 * depth + lit + f);
      px[o + 2] = byte(218 + 34 * depth + lit * 0.8 + f);
      px[o + 3] = Math.round(sstep(0, 0.03, d) * 255);
    }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// ---------------------------------------------------------------- objetos

/**
 * Neve por cima de um objeto visto de cima, em 3 níveis (pouca, média,
 * muita): fica nas partes LISAS e CLARAS longe da borda da silhueta (o
 * topo: capô, teto, copa, tampa), nunca pintando o objeto inteiro de branco.
 */
export function drawObjectSnow(src: HTMLCanvasElement, seed: number): HTMLCanvasElement[] {
  const w = src.width;
  const h = src.height;
  const data = src.getContext('2d')!.getImageData(0, 0, w, h).data;
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
  const span = Math.max(0.05, lmax - lmin);
  const edge = Math.max(2, Math.min(6, Math.min(w, h) * 0.04));
  const score = new Float32Array(n);
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (alpha[i]! < 0.5) continue;
      const grad = Math.abs(lum[i + 1]! - lum[i - 1]!) + Math.abs(lum[i + w]! - lum[i - w]!);
      const flat = 1 - Math.min(1, grad * 5);
      const bright = (lum[i]! - lmin) / span;
      const inside = Math.min(1, dist[i]! / edge);
      const noise = hash2(Math.floor(x / 5), Math.floor(y / 5), seed) * 0.6 + hash2(Math.floor(x / 2), Math.floor(y / 2), seed + 1) * 0.4;
      score[i] = inside * (0.45 + 0.55 * flat) * (0.55 + 0.45 * bright) + (noise - 0.5) * 0.5;
    }
  const out: HTMLCanvasElement[] = [];
  for (const thr of [0.58, 0.44, 0.3]) {
    const { canvas, ctx } = makeCanvas(w, h);
    const img = ctx.createImageData(w, h);
    const px = img.data;
    for (let y = 2; y < h - 1; y++)
      for (let x = 2; x < w - 1; x++) {
        const i = y * w + x;
        const d = score[i]! - thr;
        const o = i * 4;
        if (d <= 0) {
          // Sombra da neve (mais alta) logo ao lado, dentro do objeto.
          if (alpha[i]! > 0.5 && score[i - w - 1]! - thr > 0.03) {
            px[o] = 25;
            px[o + 1] = 32;
            px[o + 2] = 48;
            px[o + 3] = 60;
          }
          continue;
        }
        const depth = sstep(0, 0.18, d);
        const lit = (score[i - w - 1]! - score[i + w + 1]!) * 120;
        px[o] = byte(196 + 50 * depth + lit);
        px[o + 1] = byte(206 + 43 * depth + lit);
        px[o + 2] = byte(222 + 31 * depth + lit * 0.8);
        px[o + 3] = Math.round(sstep(0, 0.04, d) * 245 * Math.min(1, alpha[i]!));
      }
    ctx.putImageData(img, 0, 0);
    out.push(canvas);
  }
  return out;
}

// ---------------------------------------------------------------- partículas e marcas

/** Floco de neve (ponto macio). */
export function drawSnowFlake(size: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size, size);
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(245,249,255,0.9)');
  g.addColorStop(1, 'rgba(235,242,250,0)');
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
  const { canvas, ctx } = makeCanvas(16, 9);
  ctx.fillStyle = 'rgba(70,86,110,0.55)';
  ctx.beginPath();
  ctx.ellipse(10, 4.5, 5, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(3.5, 4.5, 2.8, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(9, 1, 3, 1);
  return canvas;
}

/** Trecho de marca de pneu (sulcos). */
export function drawTireTrack(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(18, 10);
  ctx.fillStyle = 'rgba(64,76,96,0.5)';
  ctx.fillRect(0, 0, 18, 10);
  ctx.fillStyle = 'rgba(40,48,64,0.45)';
  for (let x = 1; x < 18; x += 4) ctx.fillRect(x, 1, 2, 8);
  return canvas;
}

/** Neblina: fiapos macios que emendam (512 px). */
export function drawFogNoise(): HTMLCanvasElement {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S, S);
  const img = ctx.createImageData(S, S);
  const N = periodicNoise(S, 9700, [
    [256, 0.5],
    [128, 0.3],
    [64, 0.2],
  ]);
  for (let i = 0; i < S * S; i++) {
    img.data[i * 4] = 214;
    img.data[i * 4 + 1] = 219;
    img.data[i * 4 + 2] = 224;
    img.data[i * 4 + 3] = Math.round(sstep(0.15, 1, N[i]!) * 255);
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Sombra de nuvem passando (manchas escuras macias, 512 px, emenda). */
export function drawCloudShadow(): HTMLCanvasElement {
  const S = 512;
  const { canvas, ctx } = makeCanvas(S, S);
  const img = ctx.createImageData(S, S);
  const N = periodicNoise(S, 9800, [
    [256, 0.55],
    [128, 0.3],
    [64, 0.15],
  ]);
  for (let i = 0; i < S * S; i++) {
    img.data[i * 4] = 8;
    img.data[i * 4 + 1] = 12;
    img.data[i * 4 + 2] = 22;
    img.data[i * 4 + 3] = Math.round(sstep(0.5, 0.8, N[i]!) * 255);
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Neve pousada num corpo caído (mancha genérica do tamanho de um corpo). */
export function drawCorpseSnow(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(64, 40);
  const rng = new Random(9900);
  for (let i = 0; i < 70; i++) {
    const x = 32 + rng.range(-22, 22);
    const y = 20 + rng.range(-10, 10);
    const r = rng.range(1, 3.2);
    ctx.fillStyle = rng.chance(0.7) ? 'rgba(240,245,251,0.9)' : 'rgba(200,212,228,0.8)';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}
