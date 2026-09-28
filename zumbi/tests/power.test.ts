import { describe, expect, it } from 'vitest';
import { POWER_TUNING, addFuel, burnRate, cordTarget, fuelLeft, isRunning, poweredBuilding, settle, start, stop } from '../src/game/build/Power';
import { PowerSystem } from '../src/game/build/PowerSystem';
import { RECIPES } from '../src/game/crafting/Recipes';
import { WorldState } from '../src/game/sim/WorldState';
import { buildStarterDistrict } from '../src/game/world/districts/StarterDistrict';
import { WorldModel } from '../src/game/world/WorldModel';
import { explainDeath } from '../src/game/survival/Death';
import { Health } from '../src/game/health/Health';
import { Body } from '../src/game/survival/Body';

function world() {
  const state = new WorldState(new WorldModel(buildStarterDistrict()));
  const house = state.model.map.buildings.find((b) => b.rooms.length >= 3)!;
  return { state, house };
}

describe('gerador: gasolina pelo relógio', () => {
  it('abastece até o tanque, liga, gasta e desliga sozinho quando acaba', () => {
    const { state, house } = world();
    const r = house.bounds;
    const s = state.structures.add('gerador', r.x + r.w / 2, r.y + r.h / 2);
    expect(start(s, 0, 0)).toBe('Sem gasolina.');
    expect(addFuel(s, 50, 0)).toBe(POWER_TUNING.tank);
    expect(start(s, 0, 0)).toBeNull();
    expect(isRunning(s, 60)).toBe(true);
    expect(fuelLeft(s, 60)).toBeCloseTo(POWER_TUNING.tank - POWER_TUNING.burnPerHour, 5);
    // Luzes gastam mais.
    const base = burnRate(s);
    s.lights = 1;
    expect(burnRate(s)).toBeGreaterThan(base);
    delete s.lights;
    const endsAt = POWER_TUNING.tank / burnRate(s);
    expect(settle(s, endsAt + 5)).toBe('acabou');
    expect(s.run).toBeUndefined();
    expect(s.fuel).toBe(0);
  });

  it('gerador gasto às vezes não pega; desligar guarda a gasolina', () => {
    const { state } = world();
    const s = state.structures.add('gerador', 200, 200, 0, { hp: 30 });
    addFuel(s, 5, 0);
    expect(start(s, 0, 0.99)).toMatch(/tossiu/);
    expect(start(s, 0, 0.01)).toBeNull();
    stop(s, 120);
    expect(s.run).toBeUndefined();
    expect(fuelLeft(s, 600)).toBeCloseTo(5 - POWER_TUNING.burnPerHour * 2, 5);
  });
});

describe('gerador: energia, barulho, geladeira e fumaça', () => {
  it('dentro do prédio alimenta o prédio; lá fora só com extensão', () => {
    const { state, house } = world();
    const r = house.bounds;
    const inside = state.structures.add('gerador', r.x + r.w / 2, r.y + r.h / 2);
    expect(poweredBuilding(state.model, inside)?.id).toBe(house.id);
    const out = state.structures.add('gerador', r.x - 100, r.y + r.h / 2);
    expect(poweredBuilding(state.model, out)).toBeNull();
    const t = cordTarget(state.model, out);
    expect(t).not.toBeNull();
    out.link = t!.id;
    expect(poweredBuilding(state.model, out)?.id).toBe(t!.id);
  });

  it('ligado faz barulho em pulsos, acende os cômodos e intoxica quem está no mesmo prédio', () => {
    const { state, house } = world();
    const r = house.bounds;
    const noises: number[] = [];
    const ps = new PowerSystem(state, state.loot, { noise: (_x, _y, radius) => noises.push(radius) });
    const s = state.structures.add('gerador', r.x + r.w / 2, r.y + r.h / 2);
    addFuel(s, 10, 0);
    start(s, 0, 0);
    s.lights = 1;
    const px = r.x + r.w / 2 + 40;
    const py = r.y + r.h / 2;
    ps.tick(0, 0.5, px, py);
    let fumes = 0;
    for (let i = 1; i <= 20; i++) fumes += ps.tick(i, 0.5, px, py).fumes;
    expect(noises.length).toBeGreaterThanOrEqual(3);
    expect(noises[0]).toBe(POWER_TUNING.noiseRadius);
    expect(ps.isPowered(house.id)).toBe(true);
    expect(ps.poweredAt(px, py)).toBe(true);
    const lights: { radius: number }[] = [];
    ps.lights(px, py, lights as never);
    expect(lights.length).toBe(house.rooms.length);
    expect(fumes).toBeCloseTo(20, 5);
    // Fora do prédio: ar limpo.
    expect(ps.tick(21, 0.5, r.x - 300, r.y - 300).fumes).toBe(0);
  });

  it('geladeira com energia: a comida envelhece bem mais devagar', () => {
    const { state } = world();
    // Uma geladeira de casa do mapa, com comida perecível.
    let fridge = null as ReturnType<typeof state.loot.ref>;
    for (const b of state.model.map.buildings) {
      const r = b.bounds;
      const hit = state.loot.refsNear(r.x + r.w / 2, r.y + r.h / 2, Math.hypot(r.w, r.h) / 2).find(({ ref }) => ref.kind === 'geladeira' && ref.x > r.x && ref.x < r.x + r.w && ref.y > r.y && ref.y < r.y + r.h);
      if (hit) {
        fridge = hit.ref;
        break;
      }
    }
    expect(fridge).not.toBeNull();
    const c = state.loot.open(fridge!.id)!;
    c.add('carneBovina', 1, { born: 0.25 });
    const idx = c.stacks.findIndex((x) => x.defId === 'carneBovina' && x.st?.born === 0.25);
    expect(idx).toBeGreaterThanOrEqual(0);
    const b = state.model.map.buildings.find((bb) => fridge!.x > bb.bounds.x && fridge!.x < bb.bounds.x + bb.bounds.w && fridge!.y > bb.bounds.y && fridge!.y < bb.bounds.y + bb.bounds.h)!;
    const ps = new PowerSystem(state, state.loot, { noise: () => {} });
    const s = state.structures.add('gerador', b.bounds.x + b.bounds.w / 2, b.bounds.y + b.bounds.h / 2);
    addFuel(s, POWER_TUNING.tank, 0);
    start(s, 0, 0);
    // Um dia inteiro ligado (reabastecendo), em contas de meia hora.
    for (let m = 0; m <= 1440; m += 30) {
      if (fuelLeft(s, m) < 2) addFuel(s, 10, m);
      ps.tick(m, 0.5, 0, 0);
    }
    const born = c.stacks[idx]!.st!.born!;
    const age = 1 - (born - 0.25);
    expect(age).toBeCloseTo(POWER_TUNING.fridgeAging, 2);
  });

  it('receita de instalar existe e a morte por fumaça é explicada', () => {
    expect(RECIPES.some((r) => r.structure === 'gerador' && r.inputs.some((i) => i.opts.some((o) => o.id === 'gerador')))).toBe(true);
    const rep = explainDeath({ health: new Health(), body: new Body(), log: [], now: 100, lastHarm: -999, grabbed: 0, down: false, crowd: 0, load: 0, stamina: 1, darkness: 0, loudNoises: [], day: 3, kills: 0, fumes: 0.8 });
    expect(rep.title).toBe('Intoxicação');
  });
});

describe('coisa pesada nos braços', () => {
  it('gerador não cabe na bolsa: vai nos braços, trava a corrida e serve de ingrediente para instalar', async () => {
    const { PlayerInventory } = await import('../src/game/items/PlayerInventory');
    const { checkRecipe, craftRecipe } = await import('../src/game/crafting/Crafting');
    const { physicalEffects } = await import('../src/game/survival/Effects');
    const inv = new PlayerInventory();
    expect(inv.add('gerador', 1)).toBe(0);
    expect(inv.carryInArms('gerador', { c: 0.6 })).toBeNull();
    expect(inv.arms).toBe(45);
    expect(physicalEffects(new Body(), inv.effectiveLoad, inv.capacity, undefined, inv.arms).canSprint).toBe(false);
    const r = RECIPES.find((x) => x.id === 'gerador')!;
    const env = { stations: new Set<never>(), now: 0 } as never;
    expect(checkRecipe(r, inv, env).ok).toBe(true);
    const res = craftRecipe(r, inv, env);
    expect(res.ok).toBe(true);
    expect(res.structure).toBe('gerador');
    expect(inv.hand).toBeNull();
  });
});
