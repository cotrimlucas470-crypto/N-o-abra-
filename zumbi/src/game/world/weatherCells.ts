/**
 * Dados do CLIMA NO CHÃO por tile (lógica pura, sem Phaser: testável).
 *
 * O shader do chão (render/GroundWeatherLayer) lê estes números como
 * texturas pequenas, 1 texel por tile:
 *
 * - `cells` (suavizada, lida com interpolação): R quanto o lugar SEGURA neve
 *   (relevo + beiral das casas + sombra do lado sul + debaixo de copa),
 *   G parte BAIXA (onde junta poça), B COPA de árvore perto (folhas no chão).
 *   Tudo passa por um desfoque: nada de degrau ou anel quadrado entre tiles.
 * - `mats` (lida no centro do tile, sem mistura): R material e direção da
 *   rua, G qual desenho de chão está ali (o shader lê o próprio desenho),
 *   B brilho médio desse desenho (preenchido pela parte Phaser).
 * - `trampBase`: frente das portas de fora — neve remexida de quem entra e sai.
 *
 * Dentro das construções e fora da cidade (faixa dos andares): material 0,
 * o shader não desenha nada.
 */
import { TILE } from '../config/GameConfig';
import { clamp } from '../core/math';
import { hash2 } from '../core/Random';
import { Ground as G, GROUND_VARIANTS, pickVariant } from './MapTypes';
import { PROP_DEFS, type PropDef } from './PropCatalog';
import { buildingAtPoint } from './shelter';
import type { WorldModel } from './WorldModel';

/** Material de clima (o número vai para o shader). */
export const WX_MAT = { none: 0, grass: 1, dirt: 2, asphalt: 3, sidewalk: 4, concrete: 5 } as const;
export type WxMat = (typeof WX_MAT)[keyof typeof WX_MAT];

const MATERIAL: Partial<Record<number, WxMat>> = {
  [G.Grass]: WX_MAT.grass,
  [G.GrassDark]: WX_MAT.grass,
  [G.Dirt]: WX_MAT.dirt,
  [G.Gravel]: WX_MAT.dirt,
  [G.Asphalt]: WX_MAT.asphalt,
  [G.Parking]: WX_MAT.asphalt,
  [G.Sidewalk]: WX_MAT.sidewalk,
  [G.Concrete]: WX_MAT.concrete,
};

/** Direção da rua (faixas de neve e rastro de pneu ao longo dela). */
export const ROAD = { none: 0, horizontal: 1, vertical: 2 } as const;

/** Codificação do canal R de `mats` (o shader desfaz: floor(R/40), floor(mod(R,40)/10)). */
export const MAT_STEP = 40;
export const ROAD_STEP = 10;
/** Codificação do canal G de `mats` (índice do tile no tileset × 5). */
export const TILE_STEP = 5;

export interface WeatherCells {
  w: number;
  h: number;
  /** RGBA: segura neve, parte baixa, copa. */
  cells: Uint8Array;
  /** RGBA: material+rua, tile do chão, brilho médio do tile. */
  mats: Uint8Array;
  /** Pisado fixo (frente das portas), 0..1 por tile. */
  trampBase: Float32Array;
  /** 1 = chão de fora (tem clima). */
  outdoor: Uint8Array;
  outdoorCount: number;
}

/** Ruído suave (interpolado) — relevo e partes baixas do terreno. */
export function smooth2(x: number, y: number, seed: number): number {
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

/** Desfoque [1 2 1] nos dois eixos, `passes` vezes (borda repete o vizinho). */
export function blurField(f: Float32Array, w: number, h: number, passes: number): void {
  const tmp = new Float32Array(f.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const l = f[i - (x > 0 ? 1 : 0)]!;
        const r = f[i + (x < w - 1 ? 1 : 0)]!;
        tmp[i] = (l + 2 * f[i]! + r) / 4;
      }
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const u = tmp[i - (y > 0 ? w : 0)]!;
        const d = tmp[i + (y < h - 1 ? w : 0)]!;
        f[i] = (u + 2 * tmp[i]! + d) / 4;
      }
  }
}

/** Índice do desenho de chão de um tile (o mesmo que o WorldRenderer usa). */
export function groundTileIndex(ground: number, x: number, y: number, seed: number): number {
  return ground * GROUND_VARIANTS + pickVariant(hash2(x, y, seed));
}

const byte = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));

export function buildWeatherCells(model: WorldModel): WeatherCells {
  const map = model.map;
  const w = map.widthTiles;
  const h = map.cityHeightTiles ?? map.heightTiles;
  const n = w * h;
  const at = (x: number, y: number) => y * w + x;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;

  // Material e fora/dentro.
  const mat = new Uint8Array(n);
  const outdoor = new Uint8Array(n);
  let outdoorCount = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const m = MATERIAL[map.ground[at(x, y)]!];
      if (m === undefined) continue;
      if (buildingAtPoint(model, (x + 0.5) * TILE, (y + 0.5) * TILE)) continue;
      mat[at(x, y)] = m;
      outdoor[at(x, y)] = 1;
      outdoorCount++;
    }

  // Onde a neve cai menos (abrigado) ou fica mais (sombra), pelas construções e árvores.
  const shelter = new Float32Array(n);
  const add = (x: number, y: number, v: number) => {
    if (inside(x, y)) shelter[at(x, y)] = shelter[at(x, y)]! + v;
  };
  for (const b of map.buildings) {
    const x0 = Math.floor(b.bounds.x / TILE);
    const y0 = Math.floor(b.bounds.y / TILE);
    const x1 = Math.ceil((b.bounds.x + b.bounds.w) / TILE);
    const y1 = Math.ceil((b.bounds.y + b.bounds.h) / TILE);
    // Beiral: rente à parede cai menos (o telhado avança sobre o chão).
    for (let x = x0 - 1; x <= x1; x++) {
      add(x, y0 - 1, -0.2);
      add(x, y1, -0.08);
    }
    for (let y = y0; y < y1; y++) {
      add(x0 - 1, y, -0.2);
      add(x1, y, -0.2);
    }
    // Lado sul (sombra do sol do norte): a neve fica mais e derrete por último.
    for (let x = x0; x < x1; x++) for (let k = 1; k <= 3; k++) add(x, y1 + k, 0.16 / k);
  }
  const canopy = new Float32Array(n);
  for (const p of map.props) {
    const def: PropDef | undefined = PROP_DEFS[p.type];
    if (!def?.fadeWhenNear) continue;
    const r = Math.max(1, (def.width * 0.4) / TILE);
    const cx = p.x / TILE;
    const cy = p.y / TILE;
    const ri = Math.ceil(r);
    for (let dy = -ri; dy <= ri; dy++)
      for (let dx = -ri; dx <= ri; dx++) {
        const x = Math.floor(cx) + dx;
        const y = Math.floor(cy) + dy;
        if (!inside(x, y)) continue;
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
        if (d > 1.2) continue;
        const k = clamp(1.2 - d, 0, 1);
        canopy[at(x, y)] = Math.max(canopy[at(x, y)]!, k);
        // Debaixo da copa cai menos neve.
        add(x, y, -0.14 * k);
      }
  }

  // Quanto segura: relevo suave + abrigo, desfocado (sem anel quadrado).
  const hold = new Float32Array(n);
  const low = new Float32Array(n);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = at(x, y);
      hold[i] = smooth2(x / 6, y / 6, map.seed + 71) * 0.62 + smooth2(x / 2.5, y / 2.5, map.seed + 72) * 0.16 + 0.11 + shelter[i]!;
      low[i] = smooth2(x / 4, y / 4, map.seed + 73) * 0.8 + smooth2(x / 1.7, y / 1.7, map.seed + 74) * 0.2;
    }
  blurField(hold, w, h, 2);
  blurField(canopy, w, h, 1);
  blurField(low, w, h, 1);

  // Direção da rua: corrida de asfalto mais longa em x ou em y.
  const run = (x: number, y: number, dx: number, dy: number) => {
    let k = 0;
    for (let s = 1; s <= 8; s++) {
      const xx = x + dx * s;
      const yy = y + dy * s;
      if (!inside(xx, yy) || mat[at(xx, yy)] !== WX_MAT.asphalt) break;
      k++;
    }
    return k;
  };

  const cells = new Uint8Array(n * 4);
  const mats = new Uint8Array(n * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = at(x, y);
      cells[i * 4] = byte(clamp(hold[i]!, 0, 1));
      cells[i * 4 + 1] = byte(clamp(low[i]!, 0, 1));
      cells[i * 4 + 2] = byte(clamp(canopy[i]!, 0, 1));
      cells[i * 4 + 3] = 255;
      const m = mat[i]!;
      let road: number = ROAD.none;
      if (m === WX_MAT.asphalt) {
        const hr = run(x, y, -1, 0) + run(x, y, 1, 0);
        const vr = run(x, y, 0, -1) + run(x, y, 0, 1);
        road = hr > vr * 1.5 ? ROAD.horizontal : vr > hr * 1.5 ? ROAD.vertical : ROAD.none;
      }
      const g = map.ground[i]!;
      mats[i * 4] = m * MAT_STEP + road * ROAD_STEP;
      mats[i * 4 + 1] = m ? groundTileIndex(g, x, y, map.seed) * TILE_STEP : 0;
      mats[i * 4 + 2] = 128;
      mats[i * 4 + 3] = 255;
    }

  // Frente das portas de fora: neve remexida.
  const trampBase = new Float32Array(n);
  for (const d of map.doors) {
    if (!d.exterior) continue;
    const cx = Math.floor(d.x / TILE);
    const cy = Math.floor(d.y / TILE);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (!inside(x, y)) continue;
        const v = dx === 0 && dy === 0 ? 0.9 : Math.abs(dx) + Math.abs(dy) === 1 ? 0.65 : 0.3;
        trampBase[at(x, y)] = Math.max(trampBase[at(x, y)]!, v);
      }
  }
  return { w, h, cells, mats, trampBase, outdoor, outdoorCount };
}
