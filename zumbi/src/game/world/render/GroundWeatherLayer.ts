/**
 * Clima no CHÃO (parte Phaser): duas camadas de tiles logo acima do chão
 * (abaixo de sangue, objetos e paredes), só nos tiles ao ar livre — dentro
 * das construções nunca aparece nada:
 *
 * - ÁGUA: chão úmido que escurece por material (asfalto e cimento mais),
 *   poças que crescem nas partes baixas e somem devagar, gelo nas poças.
 * - NEVE: tiles por MATERIAL (grama, terra, asfalto, calçada, concreto) de
 *   ruído que emenda entre vizinhos; o estágio de cada tile vem de quanto
 *   aquele lugar "segura" neve:
 *     · ruído suave do terreno + material (grama segura, asfalto menos);
 *     · beiral das construções e debaixo de copa: menos (abrigado);
 *     · lado de sombra dos prédios (sul, hemisfério sul): mais, e derrete
 *       por último na primavera;
 *     · na frente das portas e onde se pisa: neve remexida, velha, mais baixa.
 *   Neve nova é branca; a velha (dias sem nevar, derretendo, pisada) fica
 *   cinza e suja — tile a tile, aos poucos.
 *
 * A cobertura da cidade é UM número (Ground); os tiles só são reescritos
 * quando algo muda um degrau (a cada vários segundos, no máximo).
 */
import Phaser from 'phaser';
import { DEPTH, TILE } from '../../config/GameConfig';
import { TEX } from '../../assets/AssetKeys';
import { ICE_STAGES, SNOW_MAT, SNOW_PERIOD, SNOW_STAGES, WATER_PERIOD, snowTileIndex, waterTileIndex, type SnowMat } from '../../assets/procedural/weatherArt';
import { clamp } from '../../core/math';
import { hash2 } from '../../core/Random';
import { Ground as G } from '../MapTypes';
import { PROP_DEFS, type PropDef } from '../PropCatalog';
import { buildingAtPoint } from '../shelter';
import type { WorldModel } from '../WorldModel';

/** Material de neve por tipo de chão de fora (o resto é piso de dentro). */
const MATERIAL: Partial<Record<number, SnowMat>> = {
  [G.Grass]: SNOW_MAT.grass,
  [G.GrassDark]: SNOW_MAT.grass,
  [G.Dirt]: SNOW_MAT.dirt,
  [G.Gravel]: SNOW_MAT.dirt,
  [G.Asphalt]: SNOW_MAT.asphalt,
  [G.Parking]: SNOW_MAT.asphalt,
  [G.Sidewalk]: SNOW_MAT.sidewalk,
  [G.Concrete]: SNOW_MAT.concrete,
};
/** Quanto cada chão segura de neve. */
const HOLD: Partial<Record<number, number>> = {
  [G.Grass]: 0.08,
  [G.GrassDark]: 0.1,
  [G.Dirt]: 0.04,
  [G.Gravel]: 0.02,
  [G.Asphalt]: -0.1,
  [G.Parking]: -0.08,
  [G.Sidewalk]: -0.02,
  [G.Concrete]: -0.03,
};

interface Cell {
  x: number;
  y: number;
  mat: SnowMat;
  /** Quanto pega neve (0..1). */
  hold: number;
  /** Quanto junta água (0..1: parte baixa). */
  low: number;
  /** Sorteio fixo do tile (neve velha aos poucos). */
  age: number;
  /** Na frente de porta: neve remexida. */
  door: boolean;
  snowIdx: number;
  waterIdx: number;
}

export interface GroundLook {
  /** Cobertura de neve 0..1. */
  snow: number;
  /** Geada 0..1. */
  frost: number;
  wet: number;
  ice: number;
  /** Horas desde a última nevada. */
  sinceSnow: number;
  /** Derretendo 0..1. */
  melting: number;
}

function smooth2(x: number, y: number, seed: number): number {
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

type Layer = Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer;

export class GroundWeatherLayer {
  private readonly snowLayer: Layer;
  private readonly waterLayer: Layer;
  private readonly cells: Cell[] = [];
  /** Tile (y*w+x) → célula. */
  private readonly byTile = new Map<number, Cell>();
  /** Neve pisada/compactada por tile (0..1): caminhos. */
  private readonly packed = new Map<number, number>();
  private readonly w: number;
  private key = '';
  private packedVer = 0;
  /** Quantas vezes os tiles foram reescritos (debug/medida). */
  rewrites = 0;

  constructor(scene: Phaser.Scene, model: WorldModel) {
    const map = model.map;
    const w = map.widthTiles;
    const h = map.cityHeightTiles ?? map.heightTiles;
    this.w = w;
    // Onde a neve cai menos (abrigado) ou fica mais (sombra), pelas construções e árvores.
    const shelter = new Float32Array(w * h);
    const mark = (tx: number, ty: number, v: number, mode: 'min' | 'add' = 'add') => {
      if (tx < 0 || ty < 0 || tx >= w || ty >= h) return;
      const i = ty * w + tx;
      shelter[i] = mode === 'min' ? Math.min(shelter[i]!, v) : shelter[i]! + v;
    };
    for (const b of map.buildings) {
      const x0 = Math.floor(b.bounds.x / TILE);
      const y0 = Math.floor(b.bounds.y / TILE);
      const x1 = Math.ceil((b.bounds.x + b.bounds.w) / TILE);
      const y1 = Math.ceil((b.bounds.y + b.bounds.h) / TILE);
      // Beiral: o anel de 1 tile em volta recebe menos neve.
      for (let x = x0 - 1; x <= x1; x++) {
        mark(x, y0 - 1, -0.18, 'min');
        mark(x, y1, -0.06, 'min');
      }
      for (let y = y0; y < y1; y++) {
        mark(x0 - 1, y, -0.18, 'min');
        mark(x1, y, -0.18, 'min');
      }
      // Lado sul (sombra do sol do norte): a neve fica mais e derrete por último.
      for (let x = x0; x < x1; x++) for (let k = 1; k <= 3; k++) mark(x, y1 + k, 0.14 / k);
    }
    const doorTiles = new Set<number>();
    for (const d of map.doors) {
      if (!d.exterior) continue;
      const cx = Math.floor(d.x / TILE);
      const cy = Math.floor(d.y / TILE);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (Math.abs(dx) + Math.abs(dy) <= 1) doorTiles.add((cy + dy) * w + cx + dx);
    }
    for (const p of map.props) {
      const def: PropDef = PROP_DEFS[p.type];
      if (!def?.fadeWhenNear) continue;
      // Debaixo da copa cai menos neve.
      const r = Math.max(1, Math.round((def.width * 0.35) / TILE));
      const cx = Math.floor(p.x / TILE);
      const cy = Math.floor(p.y / TILE);
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) mark(cx + dx, cy + dy, -0.12);
    }

    const data: number[][] = [];
    for (let y = 0; y < h; y++) {
      data.push(new Array<number>(w).fill(-1));
      for (let x = 0; x < w; x++) {
        const g = map.ground[y * w + x]!;
        const mat = MATERIAL[g];
        if (mat === undefined) continue;
        if (buildingAtPoint(model, (x + 0.5) * TILE, (y + 0.5) * TILE)) continue;
        const i = y * w + x;
        const hold = clamp(smooth2(x / 6, y / 6, map.seed + 71) * 0.7 + hash2(x, y, map.seed + 72) * 0.12 + 0.09 + (HOLD[g] ?? 0) + shelter[i]!, 0, 1);
        const low = clamp(smooth2(x / 4, y / 4, map.seed + 73) * 0.85 + hash2(x, y, map.seed + 74) * 0.15, 0, 1);
        const c: Cell = { x, y, mat, hold, low, age: hash2(x, y, map.seed + 75), door: doorTiles.has(i), snowIdx: -1, waterIdx: -1 };
        this.cells.push(c);
        this.byTile.set(i, c);
      }
    }
    const make = (key: string, depth: number): Layer => {
      const tm = scene.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
      const ts = tm.addTilesetImage(key, key, TILE, TILE, 0, 0);
      if (!ts) throw new Error(`Tileset ${key} não carregou`);
      const layer = tm.createLayer(0, ts, 0, 0, scene.game.renderer.type === Phaser.WEBGL);
      if (!layer) throw new Error(`Falha ao criar a camada ${key}`);
      layer.setDepth(depth).setVisible(false);
      return layer;
    };
    // Acima das faixas da rua (a neve cobre a pintura), abaixo de sangue, objetos e paredes.
    this.waterLayer = make(TEX.waterTiles, DEPTH.groundMarkings + 0.3);
    this.snowLayer = make(TEX.snowTiles, DEPTH.groundMarkings + 0.45);
  }

  /**
   * Pisou (jogador) ou passou (carro) num ponto: a neve daquele tile vai
   * ficando compactada (cinza, mais baixa). Neve nova por cima apaga devagar.
   */
  trample(x: number, y: number, amount: number): void {
    const i = Math.floor(y / TILE) * this.w + Math.floor(x / TILE);
    if (!this.byTile.has(i)) return;
    const before = this.packed.get(i) ?? 0;
    const after = Math.min(1, before + amount);
    this.packed.set(i, after);
    if (Math.floor(after * 4) !== Math.floor(before * 4)) this.packedVer++;
  }

  /** Neve nova cobrindo os caminhos (chamado enquanto neva). */
  coverTracks(amount: number): void {
    let changed = false;
    for (const [i, v] of this.packed) {
      const n = v - amount;
      if (Math.floor(n * 4) !== Math.floor(v * 4)) changed = true;
      if (n <= 0) this.packed.delete(i);
      else this.packed.set(i, n);
    }
    if (changed) this.packedVer++;
  }

  /** Aplica o estado do chão (só reescreve quando muda um degrau). */
  update(look: GroundLook): void {
    const q = (v: number, step: number) => Math.round(v / step);
    const old = clamp((look.sinceSnow - 18) / 60, 0, 1) * 0.8 + look.melting * 0.6;
    const key = `${q(look.snow, 0.015)}|${q(look.frost, 0.1)}|${q(look.wet, 0.04)}|${q(look.ice, 0.05)}|${q(old, 0.1)}|${this.packedVer}`;
    if (key === this.key) return;
    this.key = key;
    const snow = Math.max(look.snow, look.frost * 0.16);
    const sd = this.snowLayer.layer.data;
    const wd = this.waterLayer.layer.data;
    let snowChanged = false;
    let waterChanged = false;
    let anySnow = false;
    let anyWater = false;
    for (const c of this.cells) {
      const packed = this.packed.get(c.y * this.w + c.x) ?? 0;
      // Neve no lugar: cobertura da cidade × o quanto o lugar segura (porta e caminho: remexida).
      const hold = c.hold - (c.door ? 0.2 : 0) - packed * 0.25;
      const L = snow > 0.005 ? clamp(snow * 1.55 - (1 - hold) * 0.85 + 0.05, 0, 1) : 0;
      const stage = L <= 0.02 ? 0 : Math.min(SNOW_STAGES, 1 + Math.floor(L * SNOW_STAGES));
      let si = -1;
      if (stage > 0) {
        // Velha/pisada: acinzenta tile a tile conforme os dias passam (e onde se pisa/porta).
        const pal = c.age < old || packed > 0.35 || c.door ? 1 : 0;
        si = snowTileIndex(c.mat, c.x % SNOW_PERIOD, c.y % SNOW_PERIOD, stage, pal);
        anySnow = true;
      }
      // Água: sob neve funda não aparece; gelo nas partes baixas; poças crescem pela umidade.
      let wi = -1;
      if (stage < 4) {
        if (look.ice > 0.1) {
          const s = Math.min(ICE_STAGES, Math.ceil(clamp(look.ice * 1.3 + (c.low - 0.5) * 0.8, 0, 1) * ICE_STAGES));
          if (s > 0) wi = waterTileIndex(c.mat, c.x % WATER_PERIOD, c.y % WATER_PERIOD, 'ice', s);
        } else {
          const lw = look.wet * 1.3 + (c.low - 0.5) * 0.6 + (stage > 0 ? look.melting * 0.3 : 0);
          const s = lw < 0.12 ? 0 : lw < 0.4 ? 1 : lw < 0.62 ? 2 : lw < 0.85 ? 3 : 4;
          if (s > 0) wi = waterTileIndex(c.mat, c.x % WATER_PERIOD, c.y % WATER_PERIOD, 'wet', s);
        }
        if (wi >= 0) anyWater = true;
      }
      if (si !== c.snowIdx) {
        c.snowIdx = si;
        sd[c.y]![c.x]!.index = si;
        snowChanged = true;
      }
      if (wi !== c.waterIdx) {
        c.waterIdx = wi;
        wd[c.y]![c.x]!.index = wi;
        waterChanged = true;
      }
    }
    if (snowChanged) this.refresh(this.snowLayer);
    if (waterChanged) this.refresh(this.waterLayer);
    this.snowLayer.setVisible(anySnow);
    this.waterLayer.setVisible(anyWater);
  }

  private refresh(layer: Layer): void {
    this.rewrites++;
    if (layer instanceof Phaser.Tilemaps.TilemapGPULayer) layer.generateLayerDataTexture();
  }

  /** O tile é chão de fora (pegadas). */
  isOutdoorGround(x: number, y: number): boolean {
    return this.byTile.has(Math.floor(y / TILE) * this.w + Math.floor(x / TILE));
  }

  /** Quantos tiles têm neve ou água agora — debug. */
  get covered(): number {
    let n = 0;
    for (const c of this.cells) if (c.snowIdx >= 0 || c.waterIdx >= 0) n++;
    return n;
  }

  get outdoorTiles(): number {
    return this.cells.length;
  }
}
