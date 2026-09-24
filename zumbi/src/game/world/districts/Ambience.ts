/**
 * CAMADA DE AMBIENTE: depois que a cidade está pronta, espalha vegetação,
 * pedras, flores, capim, lixo, sucata e recursos coletáveis nos espaços
 * livres — o mundo deixa de ter áreas vazias e repetidas.
 *
 * Regras para não estragar o que existe:
 *  - não mexe no traçado: só ACRESCENTA objetos marcados `ambient`
 *    (o teste do "mapa expandido preservado" ignora esta camada);
 *  - gerador aleatório próprio por setor (mudar a densidade não muda a cidade);
 *  - o que tem colisão fica longe de parede, porta, construção e de outros
 *    obstáculos (sempre sobra passagem) — e os testes de integridade conferem
 *    que todo cômodo continua alcançável;
 *  - o que é do chão (capim, flores, lixo) não colide.
 *
 * O tipo de chão e a zona decidem o quê: parque tem mata, cogumelo e galho;
 * quintal residencial tem frutífera e flor; indústria tem sucata e árvore seca.
 */
import { TILE } from '../../config/GameConfig';
import { Random, hashString } from '../../core/Random';
import { circleHitsSolid, mapSolids, propSolids, type Solid } from '../collision';
import type { DecalType } from '../DecalCatalog';
import { Ground, type GroundId, type MapData, type PropPlacement, type ResourceType } from '../MapTypes';
import { PROP_DEFS, type PropType } from '../PropCatalog';
import { SECTOR_H, SECTOR_W } from './SectorLayout';

type Zone = 'parque' | 'residencial' | 'comercial' | 'industrial';

interface Pick<T> {
  t: T;
  w: number;
}

const p = <T>(t: T, w: number): Pick<T> => ({ t, w });

/** Objetos (com colisão) por tipo de chão e zona: [chance por célula, opções]. */
function objectTable(g: GroundId, zone: Zone): [number, Pick<PropType>[]] | null {
  if (g === Ground.GrassDark || (g === Ground.Grass && zone === 'parque')) {
    return [
      0.22,
      [
        p('treeBroad', 4), p('treePine', 2), p('treeYoung', 2), p('treeMango', 1), p('treeAvocado', 0.7), p('treeJabuticaba', 0.8),
        p('treeGuava', 0.8), p('treeDead', 1), p('treePalm', 0.6), p('bushRound', 2), p('bushBerry', 1.2), p('bushFlower', 1.2),
        p('rock', 1.5), p('stump', 1.2), p('fallenLog', 0.8),
      ],
    ];
  }
  if (g === Ground.Grass) {
    if (zone === 'residencial') {
      return [
        0.1,
        [
          p('treeOrange', 2), p('treeLemon', 1.5), p('treeMango', 1.5), p('treeBanana', 1.5), p('treeApple', 1), p('treeGuava', 1.2),
          p('treeJabuticaba', 1), p('treeAvocado', 0.6), p('treePalm', 0.8), p('treeYoung', 1.5), p('bushFlower', 2.5), p('bushRound', 2),
          p('bushBerry', 1), p('rock', 0.4), p('stump', 0.4),
        ],
      ];
    }
    if (zone === 'comercial') return [0.06, [p('treeYoung', 3), p('treeBroad', 1), p('treePalm', 1.5), p('bushRound', 2), p('bushFlower', 1), p('treeDead', 0.5)]];
    return [0.07, [p('treeDead', 2), p('treeYoung', 1), p('bushRound', 1), p('rock', 1.5), p('scrapPile', 1.5), p('stump', 1), p('treeBroad', 0.6)]];
  }
  if (g === Ground.Gravel) return [0.04, [p('scrapPile', 3), p('rock', 1.5), p('treeDead', 0.5)]];
  if (g === Ground.Dirt) return [0.02, [p('bushRound', 1), p('rock', 1), p('stump', 0.5)]];
  return null;
}

/** Decalques (sem colisão) por chão e zona. */
function decalTable(g: GroundId, zone: Zone): [number, Pick<DecalType>[]] | null {
  if (g === Ground.GrassDark) return [0.35, [p('grass', 5), p('flowers', 2), p('pebbles', 1), p('weeds', 1.5), p('leaves', 1)]];
  if (g === Ground.Grass) {
    if (zone === 'residencial' || zone === 'parque') return [0.22, [p('grass', 5), p('flowers', 2.5), p('weeds', 1), p('pebbles', 0.5)]];
    return [0.2, [p('grass', 3), p('weeds', 3), p('litter', 1.5), p('pebbles', 0.5)]];
  }
  if (g === Ground.Dirt) return [0.3, [p('pebbles', 2), p('weeds', 2), p('grass', 1)]];
  if (g === Ground.Gravel) return [0.2, [p('weeds', 2), p('pebbles', 2), p('litter', 1)]];
  if (g === Ground.Parking || g === Ground.Concrete || g === Ground.Sidewalk) return [0.05, [p('litter', 2), p('weeds', 1)]];
  if (g === Ground.Asphalt) return [0.015, [p('litter', 1)]];
  return null;
}

function zoneOfName(name: string | undefined): Zone {
  if (!name) return 'residencial';
  if (name.includes('Parque')) return 'parque';
  if (name.includes('Comercial')) return 'comercial';
  if (name.includes('Industrial')) return 'industrial';
  return 'residencial';
}

/** Índice espacial simples de sólidos (px). */
class SolidHash {
  private readonly cells = new Map<number, Solid[]>();
  constructor(private readonly size = 128) {}
  private key(cx: number, cy: number) {
    return cy * 100000 + cx;
  }
  add(s: Solid): void {
    const [x0, y0, x1, y1] = s.kind === 'rect' ? [s.x, s.y, s.x + s.w, s.y + s.h] : [s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r];
    for (let cy = Math.floor(y0 / this.size); cy <= Math.floor(y1 / this.size); cy++) {
      for (let cx = Math.floor(x0 / this.size); cx <= Math.floor(x1 / this.size); cx++) {
        const k = this.key(cx, cy);
        let l = this.cells.get(k);
        if (!l) this.cells.set(k, (l = []));
        l.push(s);
      }
    }
  }
  /** Algum sólido a menos de `r` px do ponto? */
  near(x: number, y: number, r: number): boolean {
    for (let cy = Math.floor((y - r) / this.size); cy <= Math.floor((y + r) / this.size); cy++) {
      for (let cx = Math.floor((x - r) / this.size); cx <= Math.floor((x + r) / this.size); cx++) {
        for (const s of this.cells.get(this.key(cx, cy)) ?? []) if (circleHitsSolid(x, y, r, s)) return true;
      }
    }
    return false;
  }
}

export interface AmbienceOptions {
  seed: number;
  /** 0 = nenhuma; 1 = normal; 2 = mata fechada. */
  density: number;
}

export function addAmbience(map: MapData, opts: AmbienceOptions): void {
  if (opts.density <= 0) return;
  const T = TILE;
  const W = map.widthTiles;
  const H = map.heightTiles;
  const groundAt = (x: number, y: number): GroundId | undefined => {
    const tx = Math.floor(x / T);
    const ty = Math.floor(y / T);
    if (tx < 0 || ty < 0 || tx >= W || ty >= H) return undefined;
    return map.ground[ty * W + tx] as GroundId;
  };

  // O que já existe no mapa: sólidos, construções (com folga) e portas.
  const solids = new SolidHash();
  for (const s of mapSolids(map)) solids.add(s);
  const blocks = map.buildings.map((b) => ({ x0: b.bounds.x, y0: b.bounds.y, x1: b.bounds.x + b.bounds.w, y1: b.bounds.y + b.bounds.h }));
  const nearBuilding = (x: number, y: number, m: number) => blocks.some((b) => x > b.x0 - m && x < b.x1 + m && y > b.y0 - m && y < b.y1 + m);
  const doorPts = map.doors.map((d) => ({ x: d.x, y: d.y }));
  const nearDoor = (x: number, y: number, r: number) => doorPts.some((d) => (d.x - x) ** 2 + (d.y - y) ** 2 < r * r);
  const regionName = (x: number, y: number) => map.regions.find((r) => x >= r.rect.x && x < r.rect.x + r.rect.w && y >= r.rect.y && y < r.rect.y + r.rect.h)?.name;

  const ids = new Set(map.props.map((pp) => pp.id));
  const uniqueId = (base: string) => {
    let id = base;
    for (let n = 1; ids.has(id); n++) id = `${base}#a${n}`;
    ids.add(id);
    return id;
  };

  const ambientColliders = new SolidHash();
  const placedTrees: { x: number; y: number; zone: Zone }[] = [];
  const resources: { type: ResourceType; x: number; y: number }[] = [];
  const edge = 1.5 * T;

  const sectorsX = Math.max(1, Math.round(W / SECTOR_W));
  const sectorsY = Math.max(1, Math.round(H / SECTOR_H));
  for (let sy = 0; sy < sectorsY; sy++) {
    for (let sx = 0; sx < sectorsX; sx++) {
      const rng = new Random(hashString(`${opts.seed}:ambiente:${sx}:${sy}`));
      const x0 = sx * SECTOR_W * T;
      const y0 = sy * SECTOR_H * T;
      const zone = zoneOfName(regionName(x0 + 10, y0 + 10));

      // ---------------- objetos com colisão (grade com sorteio de posição)
      const cell = 1.7 * T;
      for (let cy = y0; cy < y0 + SECTOR_H * T; cy += cell) {
        for (let cx = x0; cx < x0 + SECTOR_W * T; cx += cell) {
          const x = cx + rng.range(0.15, 0.85) * cell;
          const y = cy + rng.range(0.15, 0.85) * cell;
          const roll = rng.next();
          const pickRoll = rng.next();
          const g = groundAt(x, y);
          if (g === undefined) continue;
          const table = objectTable(g, zone);
          if (!table || roll > table[0] * opts.density) continue;
          if (x < edge || y < edge || x > W * T - edge || y > H * T - edge) continue;
          const type = weighted(table[1], pickRoll);
          const def = PROP_DEFS[type];
          const r = def.collider.shape === 'circle' ? def.collider.r : def.collider.shape === 'rect' ? Math.max(def.collider.w, def.collider.h) / 2 : 10;
          // folgas: nunca fecha passagem, nem encosta em construção/porta
          if (nearBuilding(x, y, 1.5 * T) || nearDoor(x, y, 3 * T)) continue;
          if (solids.near(x, y, r + 64)) continue;
          if (ambientColliders.near(x, y, r + 70)) continue;
          // chão ao redor precisa ser do mesmo tipo "aberto" (nada de árvore na beira da calçada)
          const around = [groundAt(x - r - 20, y), groundAt(x + r + 20, y), groundAt(x, y - r - 20), groundAt(x, y + r + 20)];
          if (around.some((a) => a === undefined || !objectTable(a, zone))) continue;
          const angle = type === 'fallenLog' || type === 'rock' || type === 'scrapPile' || type.startsWith('tree') ? Math.round(rng.range(0, 360)) : 0;
          const variant = rng.int(0, def.sprites.length - 1);
          const prop: PropPlacement = { id: uniqueId(`${type}@${Math.round(x)},${Math.round(y)}`), type, x, y, angle, variant, ambient: true };
          for (const s of propSolids(prop)) ambientColliders.add(s);
          map.props.push(prop);
          if (type.startsWith('tree')) placedTrees.push({ x, y, zone });
        }
      }

      // ---------------- decalques do chão
      const dcell = 1.15 * T;
      for (let cy = y0; cy < y0 + SECTOR_H * T; cy += dcell) {
        for (let cx = x0; cx < x0 + SECTOR_W * T; cx += dcell) {
          const x = cx + rng.range(0.1, 0.9) * dcell;
          const y = cy + rng.range(0.1, 0.9) * dcell;
          const roll = rng.next();
          const pickRoll = rng.next();
          const scale = rng.range(0.8, 1.25);
          const angle = rng.range(0, 360);
          const alpha = rng.range(0.75, 1);
          const g = groundAt(x, y);
          if (g === undefined) continue;
          const table = decalTable(g, zone);
          if (!table || roll > table[0] * opts.density) continue;
          if (nearBuilding(x, y, 4) || solids.near(x, y, 12)) continue;
          const type = weighted(table[1], pickRoll);
          map.decals.push({ type, x, y, angle, scale, alpha, ambient: true });
        }
      }

      // ---------------- pedras soltas em parque e cascalho
      const scell = 4 * T;
      for (let cy = y0; cy < y0 + SECTOR_H * T; cy += scell) {
        for (let cx = x0; cx < x0 + SECTOR_W * T; cx += scell) {
          const x = cx + rng.range(0.2, 0.8) * scell;
          const y = cy + rng.range(0.2, 0.8) * scell;
          const roll = rng.next();
          const g = groundAt(x, y);
          const ok = g === Ground.Gravel || g === Ground.GrassDark || (g === Ground.Grass && zone === 'parque');
          if (!ok || roll > 0.12 * opts.density) continue;
          if (nearBuilding(x, y, T) || solids.near(x, y, 28) || ambientColliders.near(x, y, 28)) continue;
          resources.push({ type: 'pedras', x, y });
        }
      }
    }
  }

  // ---------------- galhos e cogumelos à sombra das árvores
  const rng = new Random(hashString(`${opts.seed}:ambiente:recursos`));
  for (const t of placedTrees) {
    const shade = t.zone === 'parque' ? 1 : 0.25;
    const a = rng.range(0, Math.PI * 2);
    const d = rng.range(1.1, 1.7) * T;
    const x = t.x + Math.cos(a) * d;
    const y = t.y + Math.sin(a) * d;
    const roll = rng.next();
    const bad = rng.chance(0.25);
    const g = groundAt(x, y);
    if (g !== Ground.Grass && g !== Ground.GrassDark && g !== Ground.Dirt) continue;
    if (nearBuilding(x, y, T) || solids.near(x, y, 26) || ambientColliders.near(x, y, 26)) continue;
    if (roll < 0.3 * shade * opts.density) resources.push({ type: 'galhos', x, y });
    else if (roll < 0.45 * shade * opts.density) resources.push({ type: bad ? 'cogumelosVenenosos' : 'cogumelos', x, y });
  }
  for (const r of resources) map.resources.push({ id: `recurso:${r.type}@${Math.round(r.x)},${Math.round(r.y)}`, ...r });
  // ids de recurso únicos
  const seen = new Set<string>();
  for (const r of map.resources) {
    let id = r.id;
    for (let n = 1; seen.has(id); n++) id = `${r.id}#${n}`;
    r.id = id;
    seen.add(id);
  }
}

function weighted<T>(list: Pick<T>[], roll: number): T {
  const total = list.reduce((s, x) => s + x.w, 0);
  let acc = roll * total;
  for (const x of list) {
    acc -= x.w;
    if (acc <= 0) return x.t;
  }
  return list[list.length - 1]!.t;
}
