/**
 * Ruídos do CLIMA para os shaders (lógica pura, sem Phaser: testável).
 *
 * Texturas quadradas PERIÓDICAS (a borda direita emenda na esquerda e a de
 * baixo na de cima). O shader nunca usa uma só: amostra cada uma em escalas
 * que não são múltiplas entre si e giradas, então a soma não se repete em
 * nenhum lugar visível do mapa — nada de padrão carimbado.
 *
 * - A: R montinhos (neve fofa, grama por baixo) · G luz do sol do noroeste
 *   já calculada sobre os montinhos · B grão fino.
 * - B: R manchas grandes (poças, neve velha, derretimento) · G ruído branco
 *   por texel (anéis de gota, brilhos, sujeira) · B faixas compridas ao longo
 *   de x (rastro na rua, neve arrastada pelo vento).
 */
import { hash2 } from '../../core/Random';

export const NOISE_SIZE = 256;

/** Oitava de ruído: tamanho da célula em px (x, y) e peso. */
type Octave = readonly [cellX: number, cellY: number, amp: number];

/** Ruído de valor periódico (emenda a cada `size` px), várias oitavas, sem normalizar. */
export function fbm(size: number, seed: number, octaves: readonly Octave[]): Float32Array {
  const out = new Float32Array(size * size);
  for (const [cx, cy, amp] of octaves) {
    const nx = Math.max(1, Math.round(size / cx));
    const ny = Math.max(1, Math.round(size / cy));
    const lat = new Float32Array(nx * ny);
    const s = seed + cx * 131 + cy * 17;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) lat[j * nx + i] = hash2(i, j, s);
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * ny;
      const j0 = Math.floor(fy) % ny;
      const j1 = (j0 + 1) % ny;
      const ty = fy - Math.floor(fy);
      const sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * nx;
        const i0 = Math.floor(fx) % nx;
        const i1 = (i0 + 1) % nx;
        const tx = fx - Math.floor(fx);
        const sx = tx * tx * (3 - 2 * tx);
        const a = lat[j0 * nx + i0]!;
        const b = lat[j0 * nx + i1]!;
        const c = lat[j1 * nx + i0]!;
        const d = lat[j1 * nx + i1]!;
        out[y * size + x] = out[y * size + x]! + (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy) * amp;
      }
    }
  }
  return out;
}

/**
 * "Achata" pela posição (rank): o valor vira a fração de pixels abaixo dele,
 * uniforme 0..1. Assim um limiar de 0,3 cobre ~30% da área e a cobertura da
 * neve segue o número do clima de verdade.
 */
export function rankNormalize(v: Float32Array): Float32Array {
  const idx = new Uint32Array(v.length);
  for (let i = 0; i < idx.length; i++) idx[i] = i;
  idx.sort((p, q) => v[p]! - v[q]!);
  const r = new Float32Array(v.length);
  const last = Math.max(1, idx.length - 1);
  for (let k = 0; k < idx.length; k++) r[idx[k]!] = k / last;
  return r;
}

/** Ruído periódico já uniformizado (usado também pela arte dos objetos). */
export function periodicNoise(size: number, seed: number, octaves: readonly (readonly [number, number])[]): Float32Array {
  return rankNormalize(fbm(size, seed, octaves.map(([c, a]) => [c, c, a] as const)));
}

const wrap = (v: number, n: number) => ((v % n) + n) % n;
const byte = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));

/**
 * Luz sobre um relevo: o lado que sobe na direção sudeste está virado para o
 * noroeste (de onde vem a luz nas sombras e nos telhados) e fica claro.
 * Normalizada para ~0,5 ± 0,2.
 */
export function shadeRelief(h: Float32Array, size: number, step = 2): Float32Array {
  const out = new Float32Array(size * size);
  let sum = 0;
  let sum2 = 0;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const a = h[wrap(y - step, size) * size + wrap(x - step, size)]!;
      const b = h[wrap(y + step, size) * size + wrap(x + step, size)]!;
      const v = b - a;
      out[y * size + x] = v;
      sum += v;
      sum2 += v * v;
    }
  const n = size * size;
  const mean = sum / n;
  const sd = Math.sqrt(Math.max(1e-9, sum2 / n - mean * mean));
  for (let i = 0; i < n; i++) out[i] = Math.max(0, Math.min(1, 0.5 + ((out[i]! - mean) / sd) * 0.2));
  return out;
}

/** Junta 3 canais 0..1 numa textura RGBA (alfa cheio: o canal alfa não guarda dado). */
export function packRGB(size: number, r: Float32Array, g: Float32Array, b: Float32Array): Uint8Array {
  const out = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    out[i * 4] = byte(r[i]!);
    out[i * 4 + 1] = byte(g[i]!);
    out[i * 4 + 2] = byte(b[i]!);
    out[i * 4 + 3] = 255;
  }
  return out;
}

/**
 * Torrões: domos arredondados (um por célula, posição e tamanho sorteados,
 * emendando nas bordas). A união deles parece neve fofa em montinhos —
 * com a luz calculada, cada um ganha o lado claro e o lado azulado.
 */
export function domes(size: number, seed: number, cell: number, radius: number): Float32Array {
  const n = Math.max(1, Math.round(size / cell));
  const px = new Float32Array(n * n);
  const py = new Float32Array(n * n);
  const pr = new Float32Array(n * n);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      px[k] = (i + 0.15 + hash2(i, j, seed) * 0.7) * cell;
      py[k] = (j + 0.15 + hash2(i, j, seed + 1) * 0.7) * cell;
      pr[k] = cell * radius * (0.7 + hash2(i, j, seed + 2) * 0.6);
    }
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const ci = Math.floor(x / cell);
      const cj = Math.floor(y / cell);
      let h = 0;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const i = wrap(ci + di, n);
          const j = wrap(cj + dj, n);
          const k = j * n + i;
          // Distância com a volta da textura (o ponto pode estar do outro lado da emenda).
          let dx = Math.abs(x - px[k]!);
          let dy = Math.abs(y - py[k]!);
          dx = Math.min(dx, size - dx);
          dy = Math.min(dy, size - dy);
          const d = Math.sqrt(dx * dx + dy * dy) / pr[k]!;
          if (d < 1) h = Math.max(h, Math.sqrt(1 - d * d));
        }
      out[y * size + x] = h;
    }
  return out;
}

/** Textura A: montinhos (torrões + relevo), luz sobre eles e grão fino. */
export function weatherNoiseA(seed = 4101): Uint8Array {
  const n = NOISE_SIZE;
  const big = domes(n, seed + 20, 16, 0.85);
  const small = domes(n, seed + 30, 8, 0.8);
  const soft = fbm(n, seed, [
    [32, 32, 0.6],
    [16, 16, 0.4],
  ]);
  const raw = new Float32Array(n * n);
  for (let i = 0; i < raw.length; i++) raw[i] = big[i]! * 0.55 + small[i]! * 0.28 + soft[i]! * 0.17;
  const mounds = rankNormalize(raw);
  const light = shadeRelief(raw, n, 1);
  const grain = rankNormalize(
    fbm(n, seed + 7, [
      [4, 4, 0.5],
      [2, 2, 0.5],
    ]),
  );
  return packRGB(n, mounds, light, grain);
}

/** Textura B: manchas grandes, ruído branco e faixas compridas. */
export function weatherNoiseB(seed = 5203): Uint8Array {
  const n = NOISE_SIZE;
  const blobs = rankNormalize(
    fbm(n, seed, [
      [128, 128, 0.55],
      [64, 64, 0.3],
      [32, 32, 0.15],
    ]),
  );
  const white = new Float32Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) white[y * n + x] = hash2(x, y, seed + 3);
  const streaks = rankNormalize(
    fbm(n, seed + 11, [
      [128, 16, 0.5],
      [64, 6, 0.3],
      [32, 3, 0.2],
    ]),
  );
  return packRGB(n, blobs, white, streaks);
}
