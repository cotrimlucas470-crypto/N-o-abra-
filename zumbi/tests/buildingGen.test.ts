import { describe, expect, it } from 'vitest';
import { TILE } from '../src/game/config/GameConfig';
import { ARCHETYPES, type ArchetypeId } from '../src/game/world/buildings/gen/archetypes';
import { generateBuilding } from '../src/game/world/buildings/gen/generate';
import { circleHitsSolid, mapSolids } from '../src/game/world/collision';
import { MapBuilder } from '../src/game/world/MapBuilder';
import { Ground } from '../src/game/world/MapTypes';
import { PROP_DEFS } from '../src/game/world/PropCatalog';
import { flood, walkableGrid } from './support/reach';

/** Monta o prédio sozinho num terreno (com rua na frente) e confere a planta. */
function check(arch: ArchetypeId, seed: string, rot: 0 | 90 | 180 | 270 = 0) {
  const a = ARCHETYPES[arch];
  const W = a.w[0] + (seed.length % (a.w[1] - a.w[0] + 1));
  const H = a.h[0] + ((seed.length * 7) % (a.h[1] - a.h[0] + 1));
  const g = generateBuilding(arch, W, H, `${arch}:${seed}`);
  const size = Math.max(W, H) + 8;
  const b = new MapBuilder('t', 't', size, size, 1, Ground.Grass);
  const placed = b.building(g.tpl, 4, 4, { id: 'p', rot });
  const map = b.build();
  map.spawn = { x: 1 * TILE, y: 1 * TILE };
  const solids = mapSolids(map);
  const CELL = 8;
  const grid = walkableGrid(map, solids, CELL);
  const reach = flood(grid, map.spawn.x, map.spawn.y, CELL);
  const problems: string[] = [];
  for (const room of map.buildings[0]!.rooms) {
    let ok = false;
    for (let y = room.rect.y; y < room.rect.y + room.rect.h && !ok; y += CELL) {
      for (let x = room.rect.x; x < room.rect.x + room.rect.w; x += CELL) {
        if (reach[Math.floor(y / CELL) * grid.cols + Math.floor(x / CELL)]) {
          ok = true;
          break;
        }
      }
    }
    if (!ok) problems.push(`cômodo sem acesso: ${room.name}`);
  }
  const walls = map.walls.filter((w) => w.kind !== 'fence');
  for (const p of map.props) {
    const def = PROP_DEFS[p.type];
    if (def.collider.shape === 'none') continue;
    for (const s of mapSolids({ ...map, walls: [], props: [p] })) {
      for (const w of walls) {
        const hit =
          s.kind === 'circle'
            ? circleHitsSolid(s.x, s.y, s.r - 1, { kind: 'rect', x: w.x, y: w.y, w: w.w, h: w.h })
            : s.x < w.x + w.w - 1 && s.x + s.w > w.x + 1 && s.y < w.y + w.h - 1 && s.y + s.h > w.y + 1;
        if (hit) problems.push(`${p.type} na parede`);
      }
    }
  }
  return { g, map, problems, placed };
}

const ARCH_IDS = Object.keys(ARCHETYPES) as ArchetypeId[];

describe('gerador de prédios', () => {
  for (const arch of ARCH_IDS) {
    it(`${arch}: todo cômodo acessível e nada dentro da parede (várias sementes e giros)`, () => {
      const all: string[] = [];
      for (const [i, seed] of ['a', 'bb', 'ccc', 'dddd', 'eeeee', 'ffffff'].entries()) {
        const r = check(arch, seed, ([0, 90, 180, 270] as const)[i % 4]);
        all.push(...r.problems.map((p) => `${seed}: ${p}`));
        expect(r.map.buildings[0]!.rooms.length).toBeGreaterThan(0);
        expect(r.placed.doors.length).toBeGreaterThan(0);
      }
      expect(all).toEqual([]);
    });
  }

  it('mesma chave = mesmo prédio; chaves diferentes = plantas diferentes', () => {
    const a = generateBuilding('casaMedia', 10, 8, 'x1');
    const b = generateBuilding('casaMedia', 10, 8, 'x1');
    const c = generateBuilding('casaMedia', 10, 8, 'x2');
    expect(JSON.stringify(a.tpl)).toBe(JSON.stringify(b.tpl));
    expect(JSON.stringify(a.tpl)).not.toBe(JSON.stringify(c.tpl));
  });

  it('densidade: bem mais objetos por cômodo que as plantas antigas (4,6)', () => {
    let props = 0;
    let rooms = 0;
    for (const arch of ARCH_IDS) {
      for (const seed of ['p', 'q', 'r']) {
        const a = ARCHETYPES[arch];
        const g = generateBuilding(arch, a.w[1], a.h[1], `${arch}:${seed}`, { condition: 'conservado' });
        props += g.tpl.props.length;
        rooms += g.tpl.floors.length;
      }
    }
    expect(props / rooms).toBeGreaterThan(5);
  });
});
