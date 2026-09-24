import { describe, expect, it } from 'vitest';
import { VehicleInteractions, type VehicleHooks } from '../src/game/interaction/VehicleInteractions';
import type { InteractionCandidate } from '../src/game/interaction/InteractionSystem';
import { PlayerInventory } from '../src/game/items/PlayerInventory';
import type { TimedActionSpec } from '../src/game/sim/Actions';
import { WorldState } from '../src/game/sim/WorldState';
import { Survivor } from '../src/game/survival/Survivor';
import { VEHICLE_SPECS, Vehicles, initialState, toWorld } from '../src/game/vehicles/Vehicles';
import { buildCity } from '../src/game/world/districts/CityGenerator';
import { WorldModel } from '../src/game/world/WorldModel';

function world() {
  const model = new WorldModel(buildCity({ seed: 1337, sectorsX: 3, sectorsY: 3 }));
  const state = new WorldState(model);
  const inv = new PlayerInventory();
  const stats = { health: 100, maxHealth: 100, setHealth(v: number) { this.health = v; } };
  const sv = new Survivor(stats, inv);
  const started: TimedActionSpec[] = [];
  const opened: string[] = [];
  const infos: string[][] = [];
  const hooks: VehicleHooks = {
    start: (s) => started.push(s),
    drop: () => undefined,
    noise: () => undefined,
    moveTo: () => undefined,
    now: () => 0,
    rng: () => 0.99,
    openContainer: (id) => opened.push(id),
    info: (_t, lines) => infos.push(lines),
  };
  const vi = new VehicleInteractions(state, inv, sv, hooks);
  return { model, state, inv, sv, started, opened, infos, vi };
}

describe('veículos: estado', () => {
  it('o estado nasce da semente (mesmo mundo, mesmos carros)', () => {
    const t = world();
    const car = t.model.map.props.find((p) => p.type === 'car')!;
    expect(initialState(1337, car)).toEqual(initialState(1337, car));
    expect(t.state.vehicles.count).toBeGreaterThan(10);
  });

  it('há carros trancados e destrancados; carcaça tem porta emperrada às vezes', () => {
    const t = world();
    const states = [...t.state.vehicles.all()].map((v) => ({ v, s: t.state.vehicles.state(v.id)! }));
    expect(states.some(({ s }) => s.trunk.locked)).toBe(true);
    expect(states.some(({ s }) => !s.trunk.locked)).toBe(true);
    for (const { v, s } of states) {
      const spec = VEHICLE_SPECS[v.type as 'car'];
      expect(s.fuel).toBeLessThanOrEqual(spec.tankLiters);
      expect(s.tires.length).toBe(4);
    }
  });

  it('banco e porta-luvas só com porta aberta ou vidro quebrado; porta-malas só aberto', () => {
    const v = new Vehicles(1, []);
    const model = new WorldModel(buildCity({ seed: 1337, sectorsX: 1, sectorsY: 1 }));
    const car = model.map.props.find((p) => p.type === 'car')!;
    const vs = new Vehicles(7, [car]);
    const s = vs.state(car.id)!;
    for (const d of Object.values(s.doors)) (d.open = false), (d.locked = true);
    s.broken = [];
    s.trunk = { open: false, locked: true };
    expect(vs.access(car.id, 'luvas')).toMatch(/trancado/i);
    expect(vs.access(car.id, 'malas')).toMatch(/trancado/i);
    vs.breakWindow(car.id, 'motorista');
    expect(vs.access(car.id, 'luvas')).toBeNull();
    expect(vs.access(car.id, 'bancoT')).not.toBeNull();
    vs.force(car.id, 'malas');
    expect(vs.access(car.id, 'malas')).toBeNull();
    expect(v.count).toBe(0);
  });

  it('alarme dispara ao quebrar vidro de carro com alarme e bateria', () => {
    const model = new WorldModel(buildCity({ seed: 1337, sectorsX: 1, sectorsY: 1 }));
    const car = model.map.props.find((p) => p.type === 'car')!;
    const vs = new Vehicles(7, [car]);
    const s = vs.state(car.id)!;
    s.alarm = true;
    s.battery = 0.8;
    vs.breakWindow(car.id, 'passageiro');
    expect(vs.alarming(car.id)).toBe(true);
    expect(vs.tickAlarms(1).length).toBe(1);
    vs.tickAlarms(200);
    expect(vs.alarming(car.id)).toBe(false);
  });

  it('gasolina, bateria e pneus saem e voltam; o que falta para andar', () => {
    const model = new WorldModel(buildCity({ seed: 1337, sectorsX: 1, sectorsY: 1 }));
    const car = model.map.props.find((p) => p.type === 'car')!;
    const vs = new Vehicles(7, [car]);
    const s = vs.state(car.id)!;
    s.fuel = 10;
    expect(vs.siphon(car.id, 5)).toBe(5);
    expect(s.fuel).toBe(5);
    const b = vs.takeBattery(car.id);
    expect(b).not.toBeNull();
    expect(vs.cannotDrive(car.id, true)).toContain('sem bateria');
    vs.putBattery(car.id, 1);
    expect(vs.takeTire(car.id, 0)).not.toBeNull();
    expect(vs.cannotDrive(car.id, true).some((w) => w.includes('pneu'))).toBe(true);
    vs.putTire(car.id, 0, 0.9);
    const save = JSON.parse(JSON.stringify(vs.serialize()));
    const again = new Vehicles(7, [car]);
    again.restore(save);
    expect(again.state(car.id)).toEqual(vs.state(car.id));
  });
});

describe('veículos: interação', () => {
  function nearDoor(t: ReturnType<typeof world>, wantLocked: boolean) {
    for (const v of t.state.vehicles.all()) {
      if (v.type !== 'car') continue;
      const s = t.state.vehicles.state(v.id)!;
      if (s.doors['motorista']!.locked !== wantLocked) continue;
      const p = toWorld(v, 20, -60);
      return { v, s, who: { x: p.x, y: p.y, radius: 15, facing: 0 } };
    }
    throw new Error('sem carro');
  }

  it('porta do motorista destrancada abre e libera o porta-luvas', () => {
    const t = world();
    const { v, s, who } = nearDoor(t, false);
    s.doors['motorista']!.open = false;
    const out: InteractionCandidate[] = [];
    t.vi.collect(who, out);
    const door = out.find((c) => c.target.key === `carro:${v.id}:motorista`)!;
    expect(door.target.label).toMatch(/Abrir porta do motorista/);
    door.perform();
    expect(s.doors['motorista']!.open).toBe(true);
    const more = door.more!();
    more.find((o) => o.label.includes('porta-luvas'))!.perform();
    expect(t.opened).toContain(`${v.id}:luvas`);
  });

  it('trancado: chave certa destranca; quebrar vidro dá acesso', () => {
    const t = world();
    const { v, s, who } = nearDoor(t, true);
    const out: InteractionCandidate[] = [];
    t.vi.collect(who, out);
    const door = out.find((c) => c.target.key === `carro:${v.id}:motorista`)!;
    expect(door.target.enabled).toBe(false);
    expect(door.more!().some((o) => o.label.startsWith('Destrancar'))).toBe(false);
    t.inv.add('chaveCarro', 1, { key: v.id });
    door.more!().find((o) => o.label.startsWith('Destrancar'))!.perform();
    expect(s.doors['motorista']!.locked).toBe(false);
    // outro carro trancado: vidro
    const b = nearDoor(t, true);
    const o2: InteractionCandidate[] = [];
    t.vi.collect(b.who, o2);
    o2.find((c) => c.target.key === `carro:${b.v.id}:motorista`)!.more!().find((o) => o.label === 'Quebrar o vidro')!.perform();
    expect(t.state.vehicles.access(b.v.id, 'luvas')).toBeNull();
  });

  it('examinar mostra gasolina, bateria, motor e pneus', () => {
    const t = world();
    const { v } = nearDoor(t, false);
    t.vi.examine(v);
    expect(t.infos[0]!.join(' ')).toMatch(/Gasolina/);
    expect(t.infos[0]!.join(' ')).toMatch(/Pneus/);
  });

  it('tirar gasolina com mangueira enche o galão', () => {
    const t = world();
    const { v, s, who } = nearDoor(t, false);
    s.fuel = 20;
    t.inv.add('mangueira', 1);
    t.inv.add('galaoVazio', 1);
    const out: InteractionCandidate[] = [];
    t.vi.collect(who, out);
    out.find((c) => c.target.key === `carro:${v.id}:motorista`)!.more!().find((o) => o.label.startsWith('Tirar gasolina'))!.perform();
    t.started.at(-1)!.done();
    expect(t.inv.countOf('combustivel')).toBe(1);
    expect(s.fuel).toBeCloseTo(15, 5);
  });

  it('o save do mundo guarda o carro mexido', () => {
    const t = world();
    const { v, s } = nearDoor(t, false);
    t.state.vehicles.toggleDoor(v.id, 'passageiro');
    const save = JSON.parse(JSON.stringify(t.state.serialize()));
    const again = new WorldState(new WorldModel(buildCity({ seed: 1337, sectorsX: 3, sectorsY: 3 })));
    again.restore(save);
    expect(again.vehicles.state(v.id)!.doors['passageiro']!.open).toBe(s.doors['passageiro']!.open);
  });
});
