import { describe, expect, it } from 'vitest';
import { PLAYER_TUNING } from '../src/game/config/PlayerTuning';
import { TILE } from '../src/game/config/GameConfig';
import { circleHitsSolid, mapSolids, type Solid } from '../src/game/world/collision';
import { buildCity, planCity } from '../src/game/world/districts/CityGenerator';
import { buildStarterDistrict } from '../src/game/world/districts/StarterDistrict';
import { GROUND_COUNT, type MapData } from '../src/game/world/MapTypes';
import { PROP_DEFS } from '../src/game/world/PropCatalog';

const R = PLAYER_TUNING.bodyRadius;

/** Grade de células onde o CENTRO do jogador cabe sem encostar em nada. */
function walkableGrid(map: MapData, solids: Solid[], CELL: number): { cols: number; rows: number; free: Uint8Array } {
  const cols = Math.floor((map.widthTiles * TILE) / CELL);
  const rows = Math.floor((map.heightTiles * TILE) / CELL);
  const free = new Uint8Array(cols * rows).fill(1);
  // Índice espacial simples para não testar todos os sólidos por célula.
  const bucket = new Map<number, Solid[]>();
  const B = 128;
  const key = (bx: number, by: number) => by * 10000 + bx;
  for (const s of solids) {
    const [x0, y0, x1, y1] =
      s.kind === 'rect' ? [s.x, s.y, s.x + s.w, s.y + s.h] : [s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r];
    for (let by = Math.floor((y0 - R) / B); by <= Math.floor((y1 + R) / B); by++) {
      for (let bx = Math.floor((x0 - R) / B); bx <= Math.floor((x1 + R) / B); bx++) {
        const k = key(bx, by);
        if (!bucket.has(k)) bucket.set(k, []);
        bucket.get(k)!.push(s);
      }
    }
  }
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const x = cx * CELL + CELL / 2;
      const y = cy * CELL + CELL / 2;
      if (x < R || y < R || x > map.widthTiles * TILE - R || y > map.heightTiles * TILE - R) {
        free[cy * cols + cx] = 0;
        continue;
      }
      const list = bucket.get(key(Math.floor(x / B), Math.floor(y / B))) ?? [];
      if (list.some((s) => circleHitsSolid(x, y, R, s))) free[cy * cols + cx] = 0;
    }
  }
  return { cols, rows, free };
}

function flood(grid: ReturnType<typeof walkableGrid>, sx: number, sy: number, CELL: number): Uint8Array {
  const { cols, rows, free } = grid;
  const seen = new Uint8Array(cols * rows);
  const start = Math.floor(sy / CELL) * cols + Math.floor(sx / CELL);
  if (!free[start]) return seen;
  const queue = [start];
  seen[start] = 1;
  while (queue.length) {
    const i = queue.pop()!;
    const cx = i % cols;
    const cy = (i / cols) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const j = ny * cols + nx;
      if (!seen[j] && free[j]) {
        seen[j] = 1;
        queue.push(j);
      }
    }
  }
  return seen;
}

function checkMap(label: string, build: () => MapData, CELL: number) {
describe(label, () => {
  const map = build();
  const solids = mapSolids(map);
  let cached: { grid: ReturnType<typeof walkableGrid>; reach: Uint8Array } | null = null;
  const reachability = () => {
    if (!cached) {
      const grid = walkableGrid(map, solids, CELL);
      cached = { grid, reach: flood(grid, map.spawn.x, map.spawn.y, CELL) };
    }
    return cached;
  };

  it('tem dimensões e chão válidos', () => {
    expect(map.ground.length).toBe(map.widthTiles * map.heightTiles);
    for (const g of map.ground) expect(g).toBeLessThan(GROUND_COUNT);
  });

  it('é determinístico para a mesma semente', () => {
    const again = build();
    expect(again.props).toEqual(map.props);
    expect(again.decals).toEqual(map.decals);
    expect(Array.from(again.ground)).toEqual(Array.from(map.ground));
  });

  it('nasce o jogador num lugar livre, dentro do abrigo', () => {
    for (const s of solids) expect(circleHitsSolid(map.spawn.x, map.spawn.y, R + 2, s)).toBe(false);
    const shelter = map.buildings.find((b) => b.kind === 'shelter')!;
    const { x, y, w, h } = shelter.bounds;
    expect(map.spawn.x).toBeGreaterThan(x);
    expect(map.spawn.x).toBeLessThan(x + w);
    expect(map.spawn.y).toBeGreaterThan(y);
    expect(map.spawn.y).toBeLessThan(y + h);
  });

  it('todo objeto usa um tipo e variação existentes', () => {
    for (const p of map.props) {
      const def = PROP_DEFS[p.type];
      expect(def, p.type).toBeDefined();
      expect(p.variant).toBeLessThan(def.sprites.length);
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
    }
  });

  it('todo objeto tem id estável e único', () => {
    const ids = map.props.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[a-zA-Z]+@-?\d+,-?\d+(#\d+)?$/.test(id))).toBe(true);
  });

  it('paredes têm tamanho positivo', () => {
    for (const w of map.walls) {
      expect(w.w).toBeGreaterThan(0);
      expect(w.h).toBeGreaterThan(0);
    }
  });

  it('todo cômodo de toda construção é alcançável a partir do spawn', () => {
    const { grid, reach } = reachability();
    const problems: string[] = [];
    for (const b of map.buildings) {
      for (const room of b.rooms) {
        let reachable = false;
        for (let y = room.rect.y; y < room.rect.y + room.rect.h && !reachable; y += CELL) {
          for (let x = room.rect.x; x < room.rect.x + room.rect.w; x += CELL) {
            const i = Math.floor(y / CELL) * grid.cols + Math.floor(x / CELL);
            if (reach[i]) {
              reachable = true;
              break;
            }
          }
        }
        if (!reachable) problems.push(`${b.id} / ${room.name}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('toda porta externa é atravessável (dos dois lados)', () => {
    const { grid, reach } = reachability();
    const blocked: string[] = [];
    for (const b of map.buildings) {
      for (const d of b.doors) {
        // procura célula alcançável num raio de 40px em torno do centro da porta
        let ok = false;
        for (let dy = -40; dy <= 40 && !ok; dy += CELL) {
          for (let dx = -40; dx <= 40; dx += CELL) {
            const i = Math.floor((d.y + dy) / CELL) * grid.cols + Math.floor((d.x + dx) / CELL);
            if (reach[i]) {
              ok = true;
              break;
            }
          }
        }
        if (!ok) blocked.push(`${b.id} @ ${Math.round(d.x)},${Math.round(d.y)}`);
      }
    }
    expect(blocked).toEqual([]);
  });

  it('objetos sólidos não atravessam paredes das construções', () => {
    const walls = map.walls.filter((w) => w.kind !== 'fence');
    const overlaps: string[] = [];
    for (const p of map.props) {
      const def = PROP_DEFS[p.type];
      if (def.collider.shape === 'none' || def.layer === 'overhead') continue;
      for (const s of mapSolids({ ...map, walls: [], props: [p] })) {
        for (const w of walls) {
          const hit =
            s.kind === 'circle'
              ? circleHitsSolid(s.x, s.y, s.r - 1, { kind: 'rect', x: w.x, y: w.y, w: w.w, h: w.h })
              : s.x < w.x + w.w - 1 && s.x + s.w > w.x + 1 && s.y < w.y + w.h - 1 && s.y + s.h > w.y + 1;
          if (hit) overlaps.push(`${p.type} @ ${Math.round(p.x / TILE * 10) / 10},${Math.round(p.y / TILE * 10) / 10}`);
        }
      }
    }
    expect([...new Set(overlaps)]).toEqual([]);
  });
});
}

checkMap('Setor inicial (cidade 1×1)', () => buildStarterDistrict(), 8);
checkMap('Cidade 3×3 (semente padrão)', () => buildCity({ seed: 1337, sectorsX: 3, sectorsY: 3 }), 12);
checkMap('Cidade 3×3 (outra semente)', () => buildCity({ seed: 90210, sectorsX: 3, sectorsY: 3 }), 12);
checkMap('Cidade 2×4 (outra forma)', () => buildCity({ seed: 4242, sectorsX: 2, sectorsY: 4 }), 12);

describe('plano da cidade', () => {
  it('3×3 tem setor inicial no centro e ao menos um de cada zona', () => {
    const plan = planCity({ seed: 1337, sectorsX: 3, sectorsY: 3 });
    expect(plan.find((p) => p.zone === 'starter')).toMatchObject({ sx: 1, sy: 1 });
    for (const z of ['residential', 'commercial', 'industrial', 'park']) expect(plan.some((p) => p.zone === z), z).toBe(true);
    expect(new Set(plan.map((p) => p.name)).size).toBe(plan.length);
  });

  it('muitas sementes geram cidades válidas (sem erro, spawn livre)', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const map = buildCity({ seed, sectorsX: 3, sectorsY: 3 });
      const solids = mapSolids(map);
      for (const s of solids) expect(circleHitsSolid(map.spawn.x, map.spawn.y, R + 2, s)).toBe(false);
      expect(map.buildings.length).toBeGreaterThan(30);
    }
  });
});
