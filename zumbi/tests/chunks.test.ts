import { describe, expect, it } from 'vitest';
import { CHUNK_PX, chunkKeyAt } from '../src/game/sim/ChunkGrid';
import { chunkifyMap, splitMarking, splitWall } from '../src/game/world/chunkify';
import { mapSolids } from '../src/game/world/collision';
import { buildStarterDistrict } from '../src/game/world/districts/StarterDistrict';
import { WorldModel } from '../src/game/world/WorldModel';

describe('chunkify', () => {
  it('corta faixa longa nas fronteiras e mantém o desenho contínuo', () => {
    const m = { kind: 'lane-dash' as const, x: 2000, y: 100, length: 3000, thickness: 6, vertical: false };
    const parts = splitMarking(m);
    expect(parts.length).toBeGreaterThan(2);
    expect(parts.reduce((s, p) => s + p.length, 0)).toBeCloseTo(3000, 6);
    let expectedOffset = 0;
    for (const p of parts) {
      expect(p.offset ?? 0).toBeCloseTo(expectedOffset, 6);
      expectedOffset += p.length;
      const a = p.x - p.length / 2;
      const b = p.x + p.length / 2;
      expect(Math.floor(a / CHUNK_PX)).toBe(Math.floor((b - 1e-6) / CHUNK_PX));
    }
  });

  it('parede de construção curta não é cortada; cerca longa é', () => {
    expect(splitWall({ kind: 'wall', x: 1000, y: 0, w: 60, h: 14 })).toHaveLength(1);
    const fence = splitWall({ kind: 'fence', x: 0, y: 500, w: 4000, h: 8 });
    expect(fence.length).toBe(4);
    expect(fence.reduce((s, f) => s + f.w, 0)).toBeCloseTo(4000, 6);
  });

  it('não muda a colisão do mapa (mesma área sólida)', () => {
    const map = buildStarterDistrict();
    const area = (m: typeof map) => mapSolids(m).reduce((s, x) => s + (x.kind === 'rect' ? x.w * x.h : Math.PI * x.r * x.r), 0);
    expect(area(chunkifyMap(map))).toBeCloseTo(area(map), 3);
  });
});

describe('WorldModel / ChunkIndex', () => {
  const model = new WorldModel(buildStarterDistrict());

  it('todo item do mapa está em exatamente um chunk', () => {
    let props = 0;
    let walls = 0;
    const seen = new Set<number>();
    for (let cy = 0; cy * CHUNK_PX < model.heightPx; cy++) {
      for (let cx = 0; cx * CHUNK_PX < model.widthPx; cx++) {
        const c = model.index.get(chunkKeyAt(cx * CHUNK_PX + 1, cy * CHUNK_PX + 1));
        if (!c) continue;
        props += c.props.length;
        walls += c.walls.length;
        for (const i of c.props) seen.add(i);
      }
    }
    expect(props).toBe(model.map.props.length);
    expect(seen.size).toBe(model.map.props.length);
    expect(walls).toBe(model.map.walls.length);
  });

  it('nenhuma faixa ou cerca ultrapassa o próprio chunk', () => {
    for (const m of model.map.markings) {
      const a = (m.vertical ? m.y : m.x) - m.length / 2;
      const b = a + m.length;
      expect(Math.floor((a + 1e-6) / CHUNK_PX)).toBe(Math.floor((b - 1e-6) / CHUNK_PX));
    }
  });

  it('acha a construção do jogador pelo índice', () => {
    const near = model.index.buildingsNear(model.map.spawn.x, model.map.spawn.y);
    expect(near.some((b) => b.kind === 'shelter')).toBe(true);
    expect(model.regionAt(model.map.spawn.x, model.map.spawn.y)?.id).toBe('setor-1');
  });
});
