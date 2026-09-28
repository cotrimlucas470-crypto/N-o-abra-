import { describe, expect, it } from 'vitest';
import { TILE } from '../src/game/config/GameConfig';
import { CHUNK_PX, chunkKeyAt } from '../src/game/sim/ChunkGrid';
import { mapSolids } from '../src/game/world/collision';
import { buildCity } from '../src/game/world/districts/CityGenerator';
import { addUpperFloors } from '../src/game/world/floors/UpperFloors';
import { WorldModel } from '../src/game/world/WorldModel';
import { flood, walkableGrid } from './support/reach';

const CITIES: [number, number, number][] = [
  [1337, 3, 3],
  [4242, 2, 4],
];

describe('andares de cima (camada)', () => {
  for (const [seed, sx, sy] of CITIES) {
    const city = buildCity({ seed, sectorsX: sx, sectorsY: sy });
    const snapshot = JSON.stringify([city.walls, city.props, city.doors, city.buildings, city.decals]);
    const map = addUpperFloors(city);

    it(`cidade ${sx}x${sy} semente ${seed}: a cidade não muda`, () => {
      expect(JSON.stringify([city.walls, city.props, city.doors, city.buildings, city.decals])).toBe(snapshot);
      const H = city.heightTiles;
      expect(map.cityHeightTiles).toBe(H);
      expect(Array.from(map.ground.subarray(0, city.widthTiles * H))).toEqual(Array.from(city.ground));
      expect(map.walls.slice(0, city.walls.length)).toEqual(city.walls);
      expect(map.props.slice(0, city.props.length)).toEqual(city.props);
      expect(map.buildings.slice(0, city.buildings.length)).toEqual(city.buildings);
    });

    it(`cidade ${sx}x${sy}: tem andares, prédios de 4 pavimentos e é determinística`, () => {
      const floors = map.floors!;
      expect(floors.length).toBeGreaterThan(8);
      const tall = new Map<string, number>();
      for (const f of floors) tall.set(f.building, Math.max(tall.get(f.building) ?? 0, f.level));
      expect([...tall.values()].filter((l) => l >= 3).length).toBeGreaterThanOrEqual(1);
      expect(JSON.stringify(addUpperFloors(buildCity({ seed, sectorsX: sx, sectorsY: sy })).floors)).toBe(JSON.stringify(floors));
      // Toda escada existe em todos os andares do prédio, no mesmo lugar relativo.
      for (const f of floors) {
        const s = map.stairs!.find((q) => q.building === f.building && q.level === f.level)!;
        const g = map.stairs!.find((q) => q.building === f.building && q.level === 0)!;
        expect(s).toBeDefined();
        expect(g).toBeDefined();
        expect(s.x - f.dx).toBeCloseTo(g.x, 5);
        expect(s.y - f.dy).toBeCloseTo(g.y, 5);
      }
    });

    it(`cidade ${sx}x${sy}: cada andar tem chunks só dele, longe da cidade`, () => {
      const owner = new Map<number, string>();
      for (const f of map.floors!) {
        expect(f.bounds.y).toBeGreaterThan(city.heightTiles * TILE + CHUNK_PX);
        for (let y = f.bounds.y; y <= f.bounds.y + f.bounds.h; y += 32) {
          for (let x = f.bounds.x; x <= f.bounds.x + f.bounds.w; x += 32) {
            const k = chunkKeyAt(x, y);
            const o = owner.get(k);
            expect(o === undefined || o === f.id, `${f.id} divide chunk com ${o}`).toBe(true);
            owner.set(k, f.id);
          }
        }
      }
      const model = new WorldModel(map);
      const f = map.floors![0]!;
      expect(model.floors.spaceAt(f.bounds.x + 70, f.bounds.y + 70)).toBeGreaterThan(0);
      expect(model.floors.floorAt(f.bounds.x + 70, f.bounds.y + 70)?.id).toBe(f.id);
      expect(model.floors.spaceAt(100, 100)).toBe(0);
    });
  }

  it('todo cômodo de todo andar é alcançável a partir da escada (corpo do jogador)', () => {
    const map = addUpperFloors(buildCity({ seed: 1337, sectorsX: 3, sectorsY: 3 }));
    const CELL = 16;
    const grid = walkableGrid(map, mapSolids(map), CELL);
    for (const f of map.floors!) {
      const s = map.stairs!.find((q) => q.building === f.building && q.level === f.level)!;
      const reach = flood(grid, s.x + s.w / 2, s.y + s.h / 2, CELL);
      const b = map.buildings.find((x) => x.id === f.id)!;
      for (const r of b.rooms) {
        let ok = false;
        for (let y = r.rect.y + 8; y < r.rect.y + r.rect.h && !ok; y += CELL) {
          for (let x = r.rect.x + 8; x < r.rect.x + r.rect.w && !ok; x += CELL) {
            if (reach[Math.floor(y / CELL) * grid.cols + Math.floor(x / CELL)]) ok = true;
          }
        }
        expect(ok, `${f.id} ${r.name} fechado`).toBe(true);
      }
    }
    // E no térreo: a escada fica num lugar alcançável a partir do nascimento.
    const start = flood(grid, map.spawn.x, map.spawn.y, CELL);
    for (const s of map.stairs!.filter((q) => q.level === 0)) {
      const i = Math.floor((s.y + s.h / 2) / CELL) * grid.cols + Math.floor((s.x + s.w / 2) / CELL);
      expect(start[i], `escada de ${s.building} inalcançável`).toBe(1);
    }
  });
});

describe('zumbis e andares', () => {
  it('som lá de cima desce pela escada: zumbi do térreo vai até ela e sobe', async () => {
    const { WorldState } = await import('../src/game/sim/WorldState');
    const { NoiseSystem } = await import('../src/game/sim/Noise');
    const { ZombieSystem } = await import('../src/game/zombies/ZombieSystem');
    const { createZombie } = await import('../src/game/zombies/ZombieFactory');
    const { difficultyFrom, ZOMBIE_PRESETS } = await import('../src/game/zombies/Difficulty');
    const { bridgeNoise } = await import('../src/game/world/floors/NoiseBridge');
    const model = new WorldModel(addUpperFloors(buildCity({ seed: 1337, sectorsX: 3, sectorsY: 3 })));
    const state = new WorldState(model);
    let r = 7;
    const rng = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    const noise = new NoiseSystem(model.sight, () => ({ rain: 0, wind: 0 }), rng);
    const diff = difficultyFrom(ZOMBIE_PRESETS.sobrevivencia.settings);
    const sys = new ZombieSystem(model, state, noise, diff, { attack: () => null, noise: () => undefined }, rng);
    const floors = model.floors;
    const f = floors.list[0]!;
    const g = floors.stair(f.building, 0)!;
    const up = floors.stair(f.building, 1)!;
    // Zumbi no térreo, dentro do prédio, a uns 3 tiles da escada; jogador lá em cima.
    const z = createZombie({ id: 'zz', seed: 9, arch: 'morador', x: g.x + g.w / 2, y: g.y + g.h / 2, collapseDays: 0 }, diff);
    for (const k of Object.keys(z.parts) as (keyof typeof z.parts)[]) z.parts[k] = 1;
    // Lugar livre perto da escada.
    const spots = [[80, 0], [-80, 0], [0, 110], [0, -110], [120, 60], [-120, -60]];
    for (const [dx, dy] of spots) {
      if (sys.solids.free(g.x + g.w / 2 + dx!, g.y + g.h / 2 + dy!, 16)) {
        z.x = g.x + g.w / 2 + dx!;
        z.y = g.y + g.h / 2 + dy!;
        break;
      }
    }
    sys.add(z);
    expect(z.floor).toBe(0);
    const px = up.x + up.w / 2 + 120;
    const py = up.y + up.h / 2;
    const p = { x: px, y: py, floor: 1, vx: 0, vy: 0, radius: 15, posture: 'andando' as const, inVehicle: false, alive: true, down: false };
    const light = { ambient: 1, beam: null, glow: 0, rain: 0, fog: 0 };
    // Tiro lá em cima: o som chega ao térreo pela escada.
    const bridged = bridgeNoise(floors, px, py, 1600);
    expect(bridged.some((b) => b.via.level === 1 && Math.abs(b.x - (g.x + g.w / 2)) < 1)).toBe(true);
    noise.emit(px, py, 'tiro', { radius: 1600, floor: 1, byPlayer: true });
    for (const b of bridged) noise.emit(b.x, b.y, 'tiro', { radius: b.radius, floor: b.floor, byPlayer: true, via: b.via });
    expect(z.mind.state).toBe('INVESTIGATE');
    expect(z.mind.stairHint?.level).toBe(1);
    let climbed = false;
    for (let i = 0; i < 30 * 40 && !climbed; i++) {
      noise.update(1 / 30);
      sys.update({ dt: 1 / 30, player: p, light });
      if (floors.levelAt(z.x, z.y) === 1) climbed = true;
    }
    expect(climbed).toBe(true);
    expect(z.floor).toBe(1);
    // Lá em cima, no mesmo andar do jogador: acha e persegue.
    for (let i = 0; i < 30 * 12; i++) {
      noise.update(1 / 30);
      sys.update({ dt: 1 / 30, player: p, light });
    }
    expect(['CHASE', 'ATTACK', 'GRAB', 'BITE', 'INVESTIGATE', 'SEARCH', 'ALERT']).toContain(z.mind.state);
    expect(floors.levelAt(z.x, z.y)).toBe(1);
  }, 60000);
});

describe('cidade expandida (arredores)', () => {
  it('o miolo 3×3 da cidade 5×5 expandida é a cidade 3×3 de sempre', async () => {
    const { SECTOR_W, SECTOR_H } = await import('../src/game/world/districts/SectorLayout');
    const small = buildCity({ seed: 1337, sectorsX: 3, sectorsY: 3, ambience: 0 });
    const big = buildCity({ seed: 1337, sectorsX: 5, sectorsY: 5, core: 3, ambience: 0 });
    const ox = SECTOR_W * TILE;
    const oy = SECTOR_H * TILE;
    // Longe das bordas antigas (lá a cidade pequena tinha cercas e bloqueios).
    const M = 8 * TILE;
    const W = small.widthTiles * TILE;
    const H = small.heightTiles * TILE;
    const inside = (x: number, y: number) => x > M && y > M && x < W - M && y < H - M;
    const key = (p: { type: string; x: number; y: number; angle: number }) => `${p.type}@${Math.round(p.x)},${Math.round(p.y)},${Math.round(p.angle)}`;
    const a = small.props.filter((p) => inside(p.x, p.y)).map(key).sort();
    const b = big.props.filter((p) => inside(p.x - ox, p.y - oy)).map((p) => key({ ...p, x: p.x - ox, y: p.y - oy })).sort();
    expect(b).toEqual(a);
    const wk = (w: { kind: string; x: number; y: number; w: number; h: number }) => `${w.kind}:${Math.round(w.x)},${Math.round(w.y)},${Math.round(w.w)},${Math.round(w.h)}`;
    const wa = small.walls.filter((w) => inside(w.x, w.y)).map(wk).sort();
    const wb = big.walls.filter((w) => inside(w.x - ox, w.y - oy)).map((w) => wk({ ...w, x: w.x - ox, y: w.y - oy })).sort();
    expect(wb).toEqual(wa);
    const ba = small.buildings.map((q) => `${q.kind}:${q.bounds.x},${q.bounds.y}`).sort();
    const bb = big.buildings.filter((q) => inside(q.bounds.x - ox + 1, q.bounds.y - oy + 1) || inside(q.bounds.x - ox + q.bounds.w - 1, q.bounds.y - oy + q.bounds.h - 1)).map((q) => `${q.kind}:${q.bounds.x - ox},${q.bounds.y - oy}`).sort();
    expect(bb).toEqual(ba);
    for (let ty = 8; ty < small.heightTiles - 8; ty++) {
      for (let tx = 8; tx < small.widthTiles - 8; tx++) {
        const g1 = small.ground[ty * small.widthTiles + tx];
        const g2 = big.ground[(ty + SECTOR_H) * big.widthTiles + tx + SECTOR_W];
        if (g1 !== g2) throw new Error(`chão diferente em ${tx},${ty}`);
      }
    }
    // O abrigo continua no setor 1, no centro.
    expect(big.regions.some((r) => r.id === 'setor-1')).toBe(true);
    expect(big.buildings.length).toBeGreaterThan(small.buildings.length * 2);
  });
});
