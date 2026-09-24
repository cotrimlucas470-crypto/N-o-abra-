import { describe, expect, it } from 'vitest';
import { TILE } from '../src/game/config/GameConfig';
import { MapBuilder } from '../src/game/world/MapBuilder';
import { Ground } from '../src/game/world/MapTypes';
import { NavGrid } from '../src/game/world/nav/NavGrid';
import { Pathfinder } from '../src/game/world/nav/Pathfinder';
import { SightGrid } from '../src/game/world/nav/SightGrid';
import { buildStarterDistrict } from '../src/game/world/districts/StarterDistrict';
import { buildCity } from '../src/game/world/districts/CityGenerator';

/** Sala 6x6 tiles em (4,4) com porta ao sul e janela a leste; sala lacrada em (14,4). */
function testMap() {
  const b = new MapBuilder('t', 't', 24, 16, 1, Ground.Grass);
  b.wall(4, 4, 10, 4);
  b.wall(4, 10, 10, 10, 'wall', [{ at: 2, len: 1.5, type: 'door' }]);
  b.wall(4, 4, 4, 10);
  b.wall(10, 4, 10, 10, 'wall', [{ at: 2, len: 2, type: 'window' }]);
  b.outline(14, 4, 5, 5, 'wall');
  return b.build();
}

const T = TILE;

describe('NavGrid + Pathfinder', () => {
  const map = testMap();
  const grid = NavGrid.fromMap(map);
  const pf = new Pathfinder(grid);

  it('entra na sala pela porta', () => {
    const r = pf.find(2 * T, 14 * T, 7 * T, 7 * T);
    expect(r.found).toBe(true);
    // algum ponto da rota passa pelo vão da porta (x 6..7.5 tiles, y ~10)
    const all = [{ x: 2 * T, y: 14 * T }, ...r.points];
    let crossed = false;
    for (let i = 1; i < all.length; i++) {
      const a = all[i - 1]!;
      const c = all[i]!;
      if ((a.y - 10 * T) * (c.y - 10 * T) <= 0) {
        const x = a.x + ((c.x - a.x) * (10 * T - a.y)) / (c.y - a.y || 1);
        if (x > 6 * T && x < 7.5 * T) crossed = true;
      }
    }
    expect(crossed).toBe(true);
  });

  it('não passa pela janela nem entra em sala lacrada', () => {
    const r = pf.find(12 * T, 7 * T, 7 * T, 7 * T);
    expect(r.found).toBe(true); // contorna até a porta
    expect(r.points.every((p) => !(p.x > 9.5 * T && p.x < 10.5 * T && p.y > 6 * T && p.y < 8 * T))).toBe(true);
    const sealed = pf.find(2 * T, 14 * T, 16.5 * T, 6.5 * T, { maxExpanded: 5000 });
    expect(sealed.found).toBe(false);
  });

  it('rota parcial quando estoura o orçamento', () => {
    const r = pf.find(1 * T, 1 * T, 22 * T, 14 * T, { maxExpanded: 30 });
    expect(r.found).toBe(false);
    expect(r.partial).toBe(true);
    expect(r.points.length).toBeGreaterThan(0);
  });

  it('obstáculo dinâmico fecha e reabre a porta', () => {
    const door = { kind: 'rect' as const, x: 6 * T, y: 10 * T - 8, w: 1.5 * T, h: 16 };
    grid.addSolid(door);
    expect(pf.find(2 * T, 14 * T, 7 * T, 7 * T, { maxExpanded: 5000 }).found).toBe(false);
    grid.removeSolid(door);
    expect(pf.find(2 * T, 14 * T, 7 * T, 7 * T).found).toBe(true);
  });

  it('não corta quina de parede na diagonal', () => {
    const r = pf.find(3.5 * T, 3.5 * T, 3.5 * T, 10.5 * T, { smooth: false });
    for (const p of r.points) expect(grid.isWalkableAt(p.x, p.y)).toBe(true);
  });
});

describe('SightGrid', () => {
  const map = testMap();
  const sight = SightGrid.fromMap(map);

  it('parede bloqueia, janela e porta não', () => {
    expect(sight.hasLineOfSight(2 * T, 7 * T, 7 * T, 7 * T)).toBe(false); // parede oeste
    expect(sight.hasLineOfSight(12 * T, 7 * T, 7 * T, 7 * T)).toBe(true); // janela leste
    expect(sight.hasLineOfSight(6.75 * T, 13 * T, 6.75 * T, 7 * T)).toBe(true); // pela porta
  });

  it('informa onde a linha bateu', () => {
    const hit = { x: 0, y: 0 };
    expect(sight.hasLineOfSight(1 * T, 7 * T, 7 * T, 7 * T, hit)).toBe(false);
    expect(Math.abs(hit.x - 4 * T)).toBeLessThan(20);
  });
});

describe('mapa inicial na grade de navegação', () => {
  it('um zumbi alcança todo cômodo andando pela grade', () => {
    const map = buildStarterDistrict();
    const grid = NavGrid.fromMap(map);
    const pf = new Pathfinder(grid);
    const missing: string[] = [];
    for (const b of map.buildings) {
      for (const room of b.rooms) {
        const cx = room.rect.x + room.rect.w / 2;
        const cy = room.rect.y + room.rect.h / 2;
        const r = pf.find(map.spawn.x, map.spawn.y, cx, cy, { maxExpanded: 60000, smooth: false });
        if (!r.found) missing.push(`${b.id}/${room.name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('busca longa cabe no orçamento de tempo', () => {
    const map = buildStarterDistrict();
    const grid = NavGrid.fromMap(map);
    const pf = new Pathfinder(grid);
    const t0 = performance.now();
    let found = 0;
    for (let i = 0; i < 20; i++) {
      const r = pf.find(map.spawn.x, map.spawn.y, 62 * T, 50 * T, { maxExpanded: 20000 });
      if (r.found) found++;
    }
    const ms = (performance.now() - t0) / 20;
    expect(found).toBe(20);
    expect(ms).toBeLessThan(25);
  });
});

describe('cidade na grade de navegação', () => {
  it('zumbis alcançam todo cômodo da cidade 3×3', () => {
    const map = buildCity({ seed: 1337, sectorsX: 3, sectorsY: 3 });
    const grid = NavGrid.fromMap(map);
    const start = grid.cellOf(map.spawn.x, map.spawn.y);
    const reach = grid.reachableFrom(start.cx, start.cy);
    const missing: string[] = [];
    for (const b of map.buildings) {
      for (const room of b.rooms) {
        let ok = false;
        for (let y = room.rect.y; y < room.rect.y + room.rect.h && !ok; y += grid.cell) {
          for (let x = room.rect.x; x < room.rect.x + room.rect.w && !ok; x += grid.cell) {
            const c = grid.cellOf(x + grid.cell / 2, y + grid.cell / 2);
            if (reach[c.cy * grid.cols + c.cx]) ok = true;
          }
        }
        if (!ok) missing.push(`${b.id}/${room.name}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
