import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOT } from '../src/game/loot/generate';
import { WorldState } from '../src/game/sim/WorldState';
import { buildStarterDistrict } from '../src/game/world/districts/StarterDistrict';
import { WorldModel } from '../src/game/world/WorldModel';

describe('improviso: fita na porta', () => {
  it('soma resistência, tem teto e vai para o save', () => {
    const model = new WorldModel(buildStarterDistrict());
    const state = new WorldState(model);
    const d = model.map.doors.find((x) => x.buildingId === 'abrigo' && x.exterior)!;
    const max = state.doorMaxHealth(d.id);
    expect(state.doorHealth(d.id)).toBe(max);
    const up = state.reinforceDoor(d.id, 22);
    expect(up).toBe(max + 22 > max * 1.25 ? max * 1.25 : max + 22);
    for (let i = 0; i < 20; i++) state.reinforceDoor(d.id, 22);
    expect(state.doorHealth(d.id)).toBeCloseTo(max * 1.25, 5);
    expect(state.serialize().doorHp?.[d.id]).toBeCloseTo(max * 1.25, 5);
  });
});

describe('casa inicial: itens melhores, sorteados a cada jogo novo', () => {
  const crateContents = (salt: number) => {
    const model = new WorldModel(buildStarterDistrict());
    const state = new WorldState(model, { loot: { ...DEFAULT_LOOT, runSalt: salt } });
    const crate = model.map.props.find((p) => state.loot.ref(p.id)?.table === 'abrigo-caixas')!;
    return JSON.stringify(state.loot.open(crate.id)!.stacks.map((s) => [s.defId, s.count]));
  };

  it('a mesma partida abre igual; partidas novas abrem diferente', () => {
    expect(crateContents(7)).toBe(crateContents(7));
    const many = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(crateContents));
    expect(many.size).toBeGreaterThan(3);
  });

  it('caixas da casa inicial trazem bastante coisa', () => {
    let total = 0;
    for (let s = 1; s <= 12; s++) total += (JSON.parse(crateContents(s)) as unknown[]).length;
    expect(total / 12).toBeGreaterThan(3);
  });
});
