/**
 * Arte do CLIMA (procedural, gerada uma vez).
 *
 * Neve e água no chão são TILES POR MATERIAL (grama, terra, asfalto, calçada,
 * concreto), desenhados a partir de um ruído PERIÓDICO: o tile na posição
 * (x mod 3, y mod 3) pega o pedaço certo do ruído, então tiles vizinhos
 * emendam sem costura e sem quadrados. Cada estágio é o mesmo ruído com um
 * limiar diferente — a neve CRESCE a partir dos mesmos pontos (primeiro os
 * altos do terreno, depois tudo).
 *
 * Cada material recebe a neve do seu jeito: grama deixa pontas de folha
 * aparecendo, terra mistura com o solo, asfalto fica com camada fina e
 * translúcida (lama de neve), calçada e concreto mostram o rejunte até a
 * neve ficar funda. Duas paletas: neve NOVA (branca, azulada nas bordas,
 * brilhos) e VELHA (acinzentada, pisada, com sujeira).
 */
import { hash2, Random } from '../../core/Random';
import { makeCanvas } from './canvas';

export const WEATHER_TILE = 64;
const T = WEATHER_TILE;

/** Materiais de chão ao ar livre (o GroundWeatherLayer escolhe pelo tipo de chão). */
export const SNOW_MAT = { grass: 0, dirt: 1, asphalt: 2, sidewalk: 3, concrete: 4 } as const;
export type SnowMat = (typeof SNOW_MAT)[keyof typeof SNOW_MAT];
const MATS = 5;

/** Neve: estágios (1 = uns pontos, 6 = tudo coberto), período do ruído (tiles) e paletas. */
export const SNOW_STAGES = 6;
export const SNOW_PERIOD = 3;
export const SNOW_PALETTES = 2;
const SNOW_COLS = 32;

/** Água: 4 estágios molhados (úmido → poças grandes) + 2 de gelo; período 2 tiles. */
export const WET_STAGES = 4;
export const ICE_STAGES = 2;
export const WATER_PERIOD = 2;
const WATER_COLS = 16;

export function snowTileIndex(mat: SnowMat, px: number, py: number, stage: number, palette: number): number {
  return (((palette * MATS + mat) * SNOW_PERIOD + py) * SNOW_PERIOD + px) * SNOW_STAGES + (stage - 1);
}

export function waterTileIndex(mat: SnowMat, px: number, py: number, kind: 'wet' | 'ice', stage: number): number {
  const k = kind === 'wet' ? stage - 1 : WET_STAGES + stage - 1;
  return ((mat * WATER_PERIOD + py) * WATER_PERIOD + px) * (WET_STAGES + ICE_STAGES) + k;
}

// ---------------------------------------------------------------- ruído

const sstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * Ruído de valor periódico (emenda a cada `size` px), várias oitavas, e
 * "achatado" pela posição (rank) para ficar uniforme 0..1: um limiar de 0,3
 * cobre ~30% da área — a cobertura segue o estágio de verdade.
 */
function periodicNoise(size: number, seed: number, octaves: readonly (readonly [number, number])[]): Float32Array {
  const out = new Float32Array(size * size);
  for (const [cell, amp] of octaves) {
    const n = Math.max(1, Math.round(size / cell));
    const lat = new Float32Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) lat[j * n + i] = hash2(i, j, seed + cell * 131);
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * n;
      const j0 = Math.floor(fy) % n;
      const j1 = (j0 + 1) % n;
      const ty = fy - Math.floor(fy);
      const sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * n;
        const i0 = Math.floor(fx) % n;
        const i1 = (i0 + 1) % n;
        const tx = fx - Math.floor(fx);
        const sx = tx * tx * (3 - 2 * tx);
        const a = lat[j0 * n + i0]!;
        const b = lat[j0 * n + i1]!;
        const c = lat[j1 * n + i0]!;
        const d = lat[j1 * n + i1]!;
        out[y * size + x] = out[y * size + x]! + (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy) * amp;
      }
    }
  }
  // Uniformiza (rank): o valor passa a ser a fração de pixels abaixo dele.
  const idx = Array.from({ length: out.length }, (_, i) => i);
  idx.sort((p, q) => out[p]! - out[q]!);
  const r = new Float32Array(out.length);
  for (let k = 0; k < idx.length; k++) r[idx[k]!] = k / (idx.length - 1);
  return r;
}

const wrap = (v: number, n: number) => ((v % n) + n) % n;
const byte = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

// ---------------------------------------------------------------- neve no chão

interface MatStyle {
  /** Quanto o material segura (soma no ruído). */
  bias: number;
  /** Alfa na neve fina (asfalto: translúcida). */
  thinAlpha: number;
  /** Cor que aparece por baixo da neve fina (lama, terra). */
  thinTint: readonly [number, number, number] | null;
  thinMix: number;
  /** Pontas de grama/pedrinhas furando a neve rasa. */
  blades: number;
  /** Rejunte visível até a neve ficar funda (px entre linhas; 0 = sem). */
  joint: number;
}

const MAT_STYLE: readonly MatStyle[] = [
  { bias: 0.05, thinAlpha: 1, thinTint: null, thinMix: 0, blades: 0.3, joint: 0 },
  { bias: 0, thinAlpha: 0.95, thinTint: [118, 100, 82], thinMix: 0.4, blades: 0.12, joint: 0 },
  { bias: -0.07, thinAlpha: 0.55, thinTint: [120, 126, 134], thinMix: 0.55, blades: 0, joint: 0 },
  { bias: 0.02, thinAlpha: 0.92, thinTint: null, thinMix: 0, blades: 0, joint: 32 },
  { bias: 0, thinAlpha: 0.9, thinTint: [150, 150, 146], thinMix: 0.2, blades: 0, joint: 64 },
];

/** Tileset da neve: 5 materiais × 3×3 posições × 6 estágios × 2 paletas. */
export function drawSnowTiles(): HTMLCanvasElement {
  const P = SNOW_PERIOD * T;
  const total = SNOW_PALETTES * MATS * SNOW_PERIOD * SNOW_PERIOD * SNOW_STAGES;
  const rows = Math.ceil(total / SNOW_COLS);
  const W = SNOW_COLS * T;
  const { canvas, ctx } = makeCanvas(W, rows * T);
  const img = ctx.createImageData(W, rows * T);
  const px = img.data;
  for (let m = 0; m < MATS; m++) {
    const style = MAT_STYLE[m]!;
    // Forma dos montes (grande) e textura da superfície (fina).
    const N = periodicNoise(P, 7100 + m * 37, [
      [96, 0.5],
      [48, 0.28],
      [24, 0.14],
      [12, 0.08],
    ]);
    const F = periodicNoise(P, 7300 + m * 41, [
      [8, 0.6],
      [4, 0.4],
    ]);
    for (let pal = 0; pal < SNOW_PALETTES; pal++)
      for (let py = 0; py < SNOW_PERIOD; py++)
        for (let pxl = 0; pxl < SNOW_PERIOD; pxl++)
          for (let s = 1; s <= SNOW_STAGES; s++) {
            const tile = snowTileIndex(m as SnowMat, pxl, py, s, pal);
            const ox = (tile % SNOW_COLS) * T;
            const oy = Math.floor(tile / SNOW_COLS) * T;
            const thr = 1 - (s / SNOW_STAGES) * 1.08;
            for (let y = 0; y < T; y++)
              for (let x = 0; x < T; x++) {
                const gx = pxl * T + x;
                const gy = py * T + y;
                const d = N[gy * P + gx]! + style.bias - thr;
                const o = ((oy + y) * W + ox + x) * 4;
                if (d <= 0) {
                  // Sombra que a neve (mais alta) faz logo ao lado, embaixo à direita.
                  const up = N[wrap(gy - 2, P) * P + wrap(gx - 2, P)]! + style.bias - thr;
                  if (up > 0.02 && s >= 3) {
                    px[o] = 30;
                    px[o + 1] = 40;
                    px[o + 2] = 58;
                    px[o + 3] = Math.round(46 * Math.min(1, up / 0.08));
                  }
                  continue;
                }
                const depth = sstep(0, 0.22, d);
                // Luz de cima à esquerda pelo relevo do ruído (monte ganha volume).
                const lit = (N[wrap(gy - 1, P) * P + wrap(gx - 1, P)]! - N[wrap(gy + 1, P) * P + wrap(gx + 1, P)]!) * 260;
                const f = (F[gy * P + gx]! - 0.5) * 14;
                let r: number;
                let g: number;
                let b: number;
                if (pal === 0) {
                  // Neve nova: azulada na borda/rasa, branca no fundo.
                  r = 186 + (243 - 186) * depth;
                  g = 198 + (247 - 198) * depth;
                  b = 216 + (252 - 216) * depth;
                } else {
                  // Neve velha/pisada: cinza, com sujeira.
                  r = 150 + (206 - 150) * depth;
                  g = 153 + (208 - 153) * depth;
                  b = 158 + (211 - 158) * depth;
                }
                r += lit + f;
                g += lit + f;
                b += lit * 0.8 + f;
                // Rasa: aparece o que está por baixo (lama no asfalto, terra).
                if (style.thinTint && depth < 1) {
                  const k = (1 - depth) * style.thinMix;
                  r += (style.thinTint[0] - r) * k;
                  g += (style.thinTint[1] - g) * k;
                  b += (style.thinTint[2] - b) * k;
                }
                const h = hash2(gx, gy, 7400 + m * 7 + pal * 3);
                if (pal === 1 && h < 0.035) {
                  r = 124;
                  g = 114;
                  b = 100;
                } else if (pal === 0 && depth > 0.6 && h > 0.9965) {
                  r = g = b = 255;
                }
                let a = sstep(0, 0.03, d) * (style.thinAlpha + (1 - style.thinAlpha) * depth);
                // Pontas de grama furando a neve rasa.
                if (style.blades > 0 && depth < 0.9 && hash2(gx, gy, 7500 + m) < style.blades * (1 - depth)) a *= 0.2;
                // Rejunte da calçada/concreto até a neve ficar funda.
                if (style.joint > 0 && depth < 0.75 && (x % style.joint < 1 || y % style.joint < 1)) a *= 0.3;
                px[o] = byte(r);
                px[o + 1] = byte(g);
                px[o + 2] = byte(b);
                px[o + 3] = Math.round(Math.min(1, a) * 255);
              }
          }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// ---------------------------------------------------------------- água e gelo no chão

/** Escurecimento do chão molhado por material (asfalto e cimento escurecem mais). */
const DAMP = [0.1, 0.15, 0.22, 0.17, 0.17] as const;

/** Tileset da água: 5 materiais × 2×2 posições × (4 molhados + 2 de gelo). */
export function drawWaterTiles(): HTMLCanvasElement {
  const P = WATER_PERIOD * T;
  const per = WET_STAGES + ICE_STAGES;
  const total = MATS * WATER_PERIOD * WATER_PERIOD * per;
  const rows = Math.ceil(total / WATER_COLS);
  const W = WATER_COLS * T;
  const { canvas, ctx } = makeCanvas(W, rows * T);
  const img = ctx.createImageData(W, rows * T);
  const px = img.data;
  const puddleThr = [2, 0.9, 0.76, 0.6];
  for (let m = 0; m < MATS; m++) {
    const Wn = periodicNoise(P, 8100 + m * 29, [
      [64, 0.55],
      [32, 0.3],
      [16, 0.15],
    ]);
    const mud = m === SNOW_MAT.dirt || m === SNOW_MAT.grass;
    for (let py = 0; py < WATER_PERIOD; py++)
      for (let pxl = 0; pxl < WATER_PERIOD; pxl++)
        for (let k = 0; k < per; k++) {
          const tile = ((m * WATER_PERIOD + py) * WATER_PERIOD + pxl) * per + k;
          const ox = (tile % WATER_COLS) * T;
          const oy = Math.floor(tile / WATER_COLS) * T;
          const ice = k >= WET_STAGES;
          const stage = ice ? k - WET_STAGES + 1 : k + 1;
          const thr = ice ? (stage === 1 ? 0.72 : 0.6) : puddleThr[stage - 1]!;
          const damp = ice ? 0.06 : DAMP[m]! * (0.7 + 0.1 * stage);
          for (let y = 0; y < T; y++)
            for (let x = 0; x < T; x++) {
              const gx = pxl * T + x;
              const gy = py * T + y;
              const e = Wn[gy * P + gx]! - thr;
              const o = ((oy + y) * W + ox + x) * 4;
              if (e <= 0) {
                // Chão úmido: só escurece (perto da poça, um pouco mais).
                const near = sstep(-0.12, 0, e);
                px[o] = ice ? 180 : 8;
                px[o + 1] = ice ? 200 : 12;
                px[o + 2] = ice ? 215 : 18;
                px[o + 3] = Math.round(255 * (damp + near * 0.06));
                continue;
              }
              const lit = (Wn[wrap(gy - 1, P) * P + wrap(gx - 1, P)]! - Wn[wrap(gy + 1, P) * P + wrap(gx + 1, P)]!) * 900;
              const inner = sstep(0, 0.05, e);
              let r: number;
              let g: number;
              let b: number;
              let a: number;
              if (ice) {
                r = 196 + lit * 0.5;
                g = 216 + lit * 0.5;
                b = 232 + lit * 0.4;
                a = 0.35 + 0.3 * inner;
                // Rachaduras finas no gelo.
                if (hash2(Math.floor(gx / 3), Math.floor(gy / 1.5), 8300 + m) < 0.03) {
                  r = g = b = 250;
                  a = 0.7;
                }
              } else {
                // Poça: escura no fundo, céu refletido de um lado, borda molhada.
                r = (mud ? 44 : 20) + Math.max(0, lit) * 1.2;
                g = (mud ? 38 : 28) + Math.max(0, lit) * 1.3;
                b = (mud ? 30 : 40) + Math.max(0, lit) * 1.5;
                a = 0.5 + 0.25 * inner;
                if (e < 0.012) {
                  r += 50;
                  g += 55;
                  b += 60;
                  a = 0.45;
                }
                if (hash2(gx, gy, 8200 + m) > 0.994 && inner > 0.5) {
                  r = 170;
                  g = 185;
                  b = 205;
                }
              }
              px[o] = byte(r);
              px[o + 1] = byte(g);
              px[o + 2] = byte(b);
              px[o + 3] = Math.round(Math.min(1, a) * 255);
            }
        }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

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
