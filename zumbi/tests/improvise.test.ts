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

describe('nada atrás da parede', () => {
  it('de fora da casa não se vê nem se abre o que está lá dentro; por dentro sim', async () => {
    const { EventBus } = await import('../src/game/core/EventBus');
    const { ContainerInteractions } = await import('../src/game/interaction/ContainerInteractions');
    const { InteractionSystem } = await import('../src/game/interaction/InteractionSystem');
    const model = new WorldModel(buildStarterDistrict());
    const state = new WorldState(model);
    const bus = new EventBus();
    const open = new InteractionSystem([new ContainerInteractions(state, bus)]);
    const shut = new InteractionSystem([new ContainerInteractions(state, bus)], (ax, ay, bx, by) => !state.wallBetween(ax, ay, bx, by));
    const b = model.map.buildings.find((x) => x.id === 'abrigo')!;
    const inside = (x: number, y: number) => x > b.bounds.x && x < b.bounds.x + b.bounds.w && y > b.bounds.y && y < b.bounds.y + b.bounds.h;
    const who = (x: number, y: number) => ({ x, y, radius: 15, facing: 0 });
    let leaks = 0;
    let seenInside = 0;
    for (const { ref } of state.loot.refsNear(b.bounds.x + b.bounds.w / 2, b.bounds.y + b.bounds.h / 2, 900)) {
      if (!inside(ref.x, ref.y) || model.floors?.spaceAt(ref.x, ref.y)) continue;
      // Por dentro, ao lado do móvel: continua aparecendo.
      if (shut.scan(who(ref.x, ref.y + 40))?.key === `recipiente:${ref.id}` || shut.scan(who(ref.x + 40, ref.y))?.key === `recipiente:${ref.id}`) seenInside++;
      // Por fora, colado na parede: o sistema sem filtro oferece; o com filtro, nunca um recipiente de dentro.
      for (let a = 0; a < 360; a += 15) {
        const px = ref.x + Math.cos((a * Math.PI) / 180) * 55;
        const py = ref.y + Math.sin((a * Math.PI) / 180) * 55;
        if (inside(px, py)) continue;
        if (open.scan(who(px, py))?.kind === 'container') {
          const t = shut.scan(who(px, py));
          if (t?.kind === 'container' && inside(t.x, t.y)) leaks++;
        }
      }
    }
    expect(leaks).toBe(0);
    expect(seenInside).toBeGreaterThan(0);
  });
});
