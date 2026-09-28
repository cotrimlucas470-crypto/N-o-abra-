/**
 * ANDARES DE CIMA como camada (puro, determinístico pela semente).
 *
 * A cidade gerada (`buildCity`) não muda: os andares vão para uma FAIXA
 * abaixo dela no mapa, cada andar num pedaço só dele (chunks próprios), com
 * as mesmas medidas do prédio. A escada é o mesmo vão em todos os andares:
 * no térreo, num canto livre de um cômodo; lá em cima a planta é feita em
 * volta dela. Quem está num andar vê a rua lá embaixo por uma segunda
 * câmera (cena); os zumbis sobem e descem pela escada (ZombieSystem).
 *
 * Quem tem andar: parte das casas (1), das lojas (apartamento em cima; às
 * vezes 2), algumas oficinas e galpões (escritório) e os dois maiores
 * comércios da cidade viram prédios de 4 pavimentos.
 */
import { TILE } from '../../config/GameConfig';
import { Random, hashString } from '../../core/Random';
import { CHUNK_TILES } from '../../sim/ChunkGrid';
import { MapBuilder } from '../MapBuilder';
import { PROP_DEFS } from '../PropCatalog';
import { VOID_GROUND, type BuildingData, type FloorData, type GroundId, type MapData, type StairPlacement } from '../MapTypes';
import { floorPlan, type FloorUse, type LocalRect } from './FloorPlans';

export const FLOOR_TUNING = {
  /** Vão da escada (tiles): largura × comprimento. */
  stairW: 1.1,
  stairL: 2.3,
  /** Teto de andares na cidade (memória das grades). */
  maxFloors: 80,
  /** Chunks vazios entre a cidade e a faixa dos andares. */
  gapChunks: 2,
} as const;

const SHOPS = new Set(['store', 'pharmacy', 'restaurant', 'clothing']);

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function hits(a: Rect, b: Rect, pad = 0): boolean {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}

function distRect(a: Rect, b: Rect): number {
  const dx = Math.max(b.x - (a.x + a.w), 0, a.x - (b.x + b.w));
  const dy = Math.max(b.y - (a.y + a.h), 0, a.y - (b.y + b.h));
  return Math.hypot(dx, dy);
}

/** Quantos andares acima do térreo (0 = térreo só). */
function levelsFor(b: BuildingData, rng: Random): number {
  const W = b.bounds.w / TILE;
  const H = b.bounds.h / TILE;
  if (W < 8 || H < 7 || b.kind === 'shelter') return 0;
  if (b.kind === 'house') return rng.chance(0.5) ? 1 : 0;
  if (SHOPS.has(b.kind)) return rng.chance(0.65) ? (rng.chance(0.3) ? 2 : 1) : 0;
  if (b.kind === 'garage') return rng.chance(0.4) ? 1 : 0;
  if (b.kind === 'warehouse') return rng.chance(0.3) ? 1 : 0;
  return 0;
}

function useFor(b: BuildingData, level: number, rng: Random): FloorUse {
  if (b.kind === 'house') return 'casa';
  if (b.kind === 'garage' || b.kind === 'warehouse') return 'escritorio';
  // Loja: apartamento em cima; prédio alto mistura escritórios.
  return level === 1 || rng.chance(0.6) ? 'apartamento' : 'escritorio';
}

/**
 * Vão da escada no térreo: canto livre (sem parede, móvel, nem porta perto),
 * de preferência encostado numa parede e fora do banheiro. Tiles locais.
 */
/** Paredes e objetos da cidade por célula de 16 tiles (a busca da escada olha só a vizinhança). */
class Buckets {
  readonly walls = new Map<number, number[]>();
  readonly props = new Map<number, number[]>();
  constructor(readonly city: MapData) {
    const T = TILE * 16;
    const put = (m: Map<number, number[]>, i: number, x0: number, y0: number, x1: number, y1: number) => {
      for (let cy = Math.floor(y0 / T); cy <= Math.floor(y1 / T); cy++) {
        for (let cx = Math.floor(x0 / T); cx <= Math.floor(x1 / T); cx++) {
          const k = cy * 4096 + cx;
          const l = m.get(k);
          if (l) l.push(i);
          else m.set(k, [i]);
        }
      }
    };
    city.walls.forEach((w, i) => put(this.walls, i, w.x, w.y, w.x + w.w, w.y + w.h));
    city.props.forEach((p, i) => {
      if (!p.ambient) put(this.props, i, p.x, p.y, p.x, p.y);
    });
  }

  near(m: Map<number, number[]>, r: { x: number; y: number; w: number; h: number }): number[] {
    const T = TILE * 16;
    const out = new Set<number>();
    for (let cy = Math.floor((r.y - 128) / T); cy <= Math.floor((r.y + r.h + 128) / T); cy++) {
      for (let cx = Math.floor((r.x - 128) / T); cx <= Math.floor((r.x + r.w + 128) / T); cx++) for (const i of m.get(cy * 4096 + cx) ?? []) out.add(i);
    }
    return [...out];
  }
}

export function findStair(city: MapData, b: BuildingData, buckets: Buckets = new Buckets(city)): LocalRect | null {
  const T = TILE;
  const bx = b.bounds.x / T;
  const by = b.bounds.y / T;
  const W = b.bounds.w / T;
  const H = b.bounds.h / T;
  const area: Rect = { x: bx, y: by, w: W, h: H };
  const walls: Rect[] = [];
  for (const i of buckets.near(buckets.walls, b.bounds)) {
    const w = city.walls[i]!;
    const r = { x: w.x / T, y: w.y / T, w: w.w / T, h: w.h / T };
    if (hits(r, area, 0.5)) walls.push(r);
  }
  const boxes: Rect[] = [];
  for (const i of buckets.near(buckets.props, b.bounds)) {
    const p = city.props[i]!;
    if (p.ambient) continue;
    const px = p.x / T;
    const py = p.y / T;
    if (px < bx - 1 || px > bx + W + 1 || py < by - 1 || py > by + H + 1) continue;
    const d = PROP_DEFS[p.type];
    const q = Math.round((((p.angle % 360) + 360) % 360) / 90) % 2 === 1;
    const w = (q ? d.height : d.width) / T;
    const h = (q ? d.width : d.height) / T;
    boxes.push({ x: px - w / 2, y: py - h / 2, w, h });
  }
  const doors = city.doors.filter((d) => d.buildingId === b.id).map((d) => ({ x: d.x / T, y: d.y / T, r: d.length / T / 2 + 1.2 }));
  const rooms = b.rooms.map((r) => ({ name: r.name, x: r.rect.x / T, y: r.rect.y / T, w: r.rect.w / T, h: r.rect.h / T }));
  let best: { r: LocalRect; score: number } | null = null;
  const { stairW, stairL } = FLOOR_TUNING;
  for (const [w, h] of [[stairW, stairL], [stairL, stairW]] as const) {
    for (let y = 0.25; y <= H - 0.25 - h + 1e-6; y += 0.5) {
      for (let x = 0.25; x <= W - 0.25 - w + 1e-6; x += 0.5) {
        const r: Rect = { x: bx + x, y: by + y, w, h };
        if (walls.some((wr) => hits(wr, r, 0.06))) continue;
        if (boxes.some((pb) => hits(pb, r, 0.22))) continue;
        if (doors.some((d) => distRect(r, { x: d.x, y: d.y, w: 0, h: 0 }) < d.r)) continue;
        const cx = r.x + w / 2;
        const cy = r.y + h / 2;
        const room = rooms.find((rm) => cx > rm.x && cx < rm.x + rm.w && cy > rm.y && cy < rm.y + rm.h);
        if (!room) continue;
        // Encostada numa parede pelo lado comprido: parece escada de verdade.
        const long = w > h;
        const edgeA: Rect = long ? { x: r.x, y: r.y - 0.3, w, h: 0.3 } : { x: r.x - 0.3, y: r.y, w: 0.3, h };
        const edgeB: Rect = long ? { x: r.x, y: r.y + h, w, h: 0.3 } : { x: r.x + w, y: r.y, w: 0.3, h };
        let score = 0;
        if (walls.some((wr) => hits(wr, edgeA) || hits(wr, edgeB))) score += 3;
        if (room.name !== 'Banheiro' && room.name !== 'Cozinha') score += 1;
        score -= Math.hypot(cx - (bx + W / 2), cy - (by + H / 2)) * 0.02;
        if (!best || score > best.score + 1e-9) best = { r: { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, w, h }, score };
      }
    }
  }
  return best?.r ?? null;
}

/** Cidade + andares. A cidade (traçado, ids, chão) fica igual. */
export function addUpperFloors(city: MapData): MapData {
  const T = TILE;
  const cityH = city.heightTiles;
  const plans: { b: BuildingData; levels: number; stair: LocalRect; rng: Random }[] = [];
  for (const b of city.buildings) {
    const rng = new Random(hashString(`${city.seed}:andar:${b.id}`));
    const levels = levelsFor(b, rng);
    if (levels) plans.push({ b, levels, stair: null as unknown as LocalRect, rng });
  }
  // Os dois maiores comércios viram prédios de 4 pavimentos.
  const big = city.buildings
    .filter((b) => SHOPS.has(b.kind) && b.bounds.w >= 10 * T && b.bounds.h >= 8 * T)
    .sort((a, b) => b.bounds.w * b.bounds.h - a.bounds.w * a.bounds.h || (a.id < b.id ? -1 : 1))
    .slice(0, 2);
  for (const b of big) {
    const p = plans.find((q) => q.b.id === b.id);
    if (p) p.levels = 3;
    else plans.push({ b, levels: 3, stair: null as unknown as LocalRect, rng: new Random(hashString(`${city.seed}:andar:${b.id}`)) });
  }
  const ok: typeof plans = [];
  let total = 0;
  const buckets = new Buckets(city);
  for (const p of plans.sort((a, b) => (a.b.id < b.b.id ? -1 : 1))) {
    const s = findStair(city, p.b, buckets);
    if (!s) continue;
    if (total + p.levels > FLOOR_TUNING.maxFloors) continue;
    p.stair = s;
    ok.push(p);
    total += p.levels;
  }
  if (!ok.length) return city;

  // Faixa: cada andar num pedaço de chunks só dele.
  const C = CHUNK_TILES;
  const cols = Math.floor(city.widthTiles / C);
  const startCy = Math.ceil(cityH / C) + FLOOR_TUNING.gapChunks;
  let cx = 0;
  let cy = startCy;
  let rowH = 1;
  const slots: { p: (typeof ok)[number]; level: number; ox: number; oy: number }[] = [];
  for (const p of ok) {
    const W = p.b.bounds.w / T;
    const H = p.b.bounds.h / T;
    const nw = Math.ceil((W + 2) / C);
    const nh = Math.ceil((H + 2) / C);
    for (let level = 1; level <= p.levels; level++) {
      if (cx + nw > cols) {
        cx = 0;
        cy += rowH;
        rowH = 1;
      }
      slots.push({ p, level, ox: cx * C + 1, oy: cy * C + 1 });
      cx += nw;
      rowH = Math.max(rowH, nh);
    }
  }
  const totalH = (cy + rowH) * C;
  const builder = new MapBuilder(city.id, city.name, city.widthTiles, totalH, city.seed, VOID_GROUND as GroundId);
  // Barreira na borda sul da cidade: nada anda da rua para o vazio da faixa.
  builder.wall(0, cityH + 0.25, city.widthTiles, cityH + 0.25);
  const floors: FloorData[] = [];
  const stairs: StairPlacement[] = [];
  for (const { p, level, ox, oy } of slots) {
    const b = p.b;
    const W = b.bounds.w / T;
    const H = b.bounds.h / T;
    const use = useFor(b, level, p.rng);
    const name = `${b.name} · ${level}º andar`;
    const tpl = floorPlan(W, H, use, p.stair, p.rng, name);
    const placed = builder.building(tpl, ox, oy, { id: `${b.id}#${level}`, name, roof: 'flat' });
    placed.data.floorOf = b.id;
    placed.data.level = level;
    const bx = b.bounds.x / T;
    const by = b.bounds.y / T;
    floors.push({ id: placed.data.id, building: b.id, level, bounds: { ...placed.data.bounds }, dx: (ox - bx) * T, dy: (oy - by) * T });
    stairs.push({ id: `escada@${b.id}#${level}`, building: b.id, level, x: (ox + p.stair.x) * T, y: (oy + p.stair.y) * T, w: p.stair.w * T, h: p.stair.h * T, up: level < p.levels, down: true });
    if (level === 1) stairs.push({ id: `escada@${b.id}#0`, building: b.id, level: 0, x: (bx + p.stair.x) * T, y: (by + p.stair.y) * T, w: p.stair.w * T, h: p.stair.h * T, up: true, down: false });
  }
  const strip = builder.build();
  const W = city.widthTiles;
  const ground = new Uint8Array(W * totalH);
  ground.set(strip.ground);
  ground.set(city.ground.subarray(0, W * cityH), 0);
  return {
    ...city,
    heightTiles: totalH,
    ground,
    walls: [...city.walls, ...strip.walls],
    props: [...city.props, ...strip.props],
    decals: [...city.decals, ...strip.decals],
    doors: [...city.doors, ...strip.doors],
    buildings: [...city.buildings, ...strip.buildings],
    floors,
    stairs,
    cityHeightTiles: cityH,
  };
}
