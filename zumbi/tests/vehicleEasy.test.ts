import { describe, expect, it } from 'vitest';
import { VehicleInteractions, type VehicleHooks } from '../src/game/interaction/VehicleInteractions';
import type { InteractionCandidate } from '../src/game/interaction/InteractionSystem';
import { PlayerInventory } from '../src/game/items/PlayerInventory';
import type { TimedActionSpec } from '../src/game/sim/Actions';
import { WorldState } from '../src/game/sim/WorldState';
import { Survivor } from '../src/game/survival/Survivor';
import { DRIVE_TUNING, pedalControls, stepCar, wheelSteer } from '../src/game/vehicles/Driving';
import { stripYield, toWorld, vehicleCondition, type VehicleState } from '../src/game/vehicles/Vehicles';
import { buildCity } from '../src/game/world/districts/CityGenerator';
import { WorldModel } from '../src/game/world/WorldModel';

function world() {
  const state = new WorldState(new WorldModel(buildCity({ seed: 1337, sectorsX: 3, sectorsY: 3 })));
  const inv = new PlayerInventory();
  const sv = new Survivor({ health: 100, maxHealth: 100, setHealth() {} }, inv);
  const started: TimedActionSpec[] = [];
  const drove: string[] = [];
  const hooks: VehicleHooks = {
    start: (s) => started.push(s),
    drop: () => undefined,
    noise: () => undefined,
    moveTo: () => undefined,
    now: () => 0,
    rng: () => 0.5,
    openContainer: () => undefined,
    info: () => undefined,
    drive: (p) => (drove.push(p.id), { ok: true }),
  };
  return { state, inv, started, drove, vi: new VehicleInteractions(state, inv, sv, hooks) };
}

function good(): VehicleState {
  return { doors: {}, trunk: { open: false, locked: false }, hood: false, broken: [], fuel: 20, battery: 1, engine: 1, tires: [1, 1, 1, 1], body: 1, alarm: false, keyInside: true };
}

describe('carro no celular: volante e pedais', () => {
  it('acelerar anda para frente; freio parado dá ré; os dois juntos = freio', () => {
    expect(pedalControls(0, 1, 0)).toEqual({ throttle: 1, steer: 0 });
    expect(pedalControls(0.5, 0, 1).throttle).toBe(-1);
    expect(pedalControls(0, 1, 1).throttle).toBe(-1);
    const car = { x: 0, y: 0, a: 0, speed: 0 };
    const cond = { engine: 1, tires: 1, body: 1, fuel: 20 };
    for (let i = 0; i < 30; i++) stepCar(car, pedalControls(0, 1, 0), cond, 1 / 30);
    expect(car.speed).toBeGreaterThan(0);
    for (let i = 0; i < 120; i++) stepCar(car, pedalControls(0, 0, 1), cond, 1 / 30);
    expect(car.speed).toBeLessThan(0);
    expect(car.speed).toBeGreaterThanOrEqual(-DRIVE_TUNING.reverseMax);
  });

  it('volante: arrastar para o lado vira proporcional, com zona morta e limite', () => {
    expect(wheelSteer(2, 70)).toBe(0);
    expect(wheelSteer(30, 70)).toBeGreaterThan(0.4);
    expect(wheelSteer(-500, 70)).toBe(-1);
    const car = { x: 0, y: 0, a: 0, speed: 200 };
    stepCar(car, pedalControls(wheelSteer(60, 70), 1, 0), { engine: 1, tires: 1, body: 1, fuel: 20 }, 0.3);
    expect(car.a).toBeGreaterThan(0);
  });
});

describe('estado do veículo', () => {
  it('FUNCIONANDO, DANIFICADO (tem conserto) e INUTILIZADO', () => {
    expect(vehicleCondition(good(), 'car').label).toBe('FUNCIONANDO');
    const empty = { ...good(), fuel: 0 };
    expect(vehicleCondition(empty, 'car')).toEqual({ label: 'FUNCIONANDO', why: ['tanque vazio'] });
    expect(vehicleCondition({ ...good(), tires: [1, 0.05, 1, 1] }, 'car').label).toBe('DANIFICADO');
    expect(vehicleCondition({ ...good(), battery: null }, 'car').why).toContain('sem bateria');
    expect(vehicleCondition({ ...good(), engine: 0.05 }, 'car').label).toBe('INUTILIZADO');
    expect(vehicleCondition(good(), 'carWreck').label).toBe('INUTILIZADO');
    expect(vehicleCondition({ ...good(), stripped: true }, 'car').label).toBe('INUTILIZADO');
  });

  it('desmontar rende sucata, parafusos e fios; lataria destruída não dá chapa', () => {
    const got = stripYield({ ...good(), engine: 0, body: 0.1 }, () => 0.99);
    const ids = got.map((g) => g.id);
    expect(ids).toEqual(expect.arrayContaining(['sucata', 'parafusos', 'fioEletrico']));
    expect(ids).not.toContain('chapaMetal');
    expect(got.find((g) => g.id === 'pecasMotor')?.n ?? 0).toBeLessThanOrEqual(1);
  });
});

describe('entrar e ligar em um toque; desmontar carcaça', () => {
  it('porta do motorista fechada e destrancada: DIRIGIR abre, entra e liga', () => {
    const t = world();
    const v = [...t.state.vehicles.all()].find((x) => x.type === 'car' && !t.state.vehicles.state(x.id)!.doors['motorista']!.locked)!;
    const s = t.state.vehicles.state(v.id)!;
    Object.assign(s, { keyInside: true, battery: 1, fuel: 20, engine: 1, tires: [1, 1, 1, 1] });
    s.doors['motorista']!.open = false;
    const p = toWorld(v, 20, -60);
    const out: InteractionCandidate[] = [];
    t.vi.collect({ x: p.x, y: p.y, radius: 15, facing: 0 }, out);
    const door = out.find((c) => c.target.key === `carro:${v.id}:motorista`)!;
    expect(door.target.verb).toBe('DIRIGIR');
    door.perform();
    expect(s.doors['motorista']!.open).toBe(true);
    expect(t.drove).toEqual([v.id]);
    // "Só abrir a porta" continua no ⋯ quando fechada.
    s.doors['motorista']!.open = false;
    expect(door.more!().some((o) => o.label === 'Só abrir a porta')).toBe(true);
  });

  it('sem chave: diz o caminho (ligação direta)', () => {
    const t = world();
    const v = [...t.state.vehicles.all()].find((x) => x.type === 'car' && !t.state.vehicles.state(x.id)!.doors['motorista']!.locked)!;
    const s = t.state.vehicles.state(v.id)!;
    Object.assign(s, { keyInside: false, hotwired: false, battery: 1, fuel: 20, engine: 1, tires: [1, 1, 1, 1] });
    const p = toWorld(v, 20, -60);
    const out: InteractionCandidate[] = [];
    t.vi.collect({ x: p.x, y: p.y, radius: 15, facing: 0 }, out);
    const r = out.find((c) => c.target.key === `carro:${v.id}:motorista`)!.perform();
    expect(r.message).toMatch(/ligação direta/);
    expect(t.drove).toHaveLength(0);
  });

  it('carcaça: capô aberto + chave inglesa → desmontar uma vez', () => {
    const t = world();
    const w = [...t.state.vehicles.all()].find((x) => x.type === 'carWreck');
    expect(w).toBeDefined();
    if (!w) return;
    const s = t.state.vehicles.state(w.id)!;
    s.hood = true;
    t.inv.add('chaveInglesa', 1);
    const h = toWorld(w, 100, 0);
    const out: InteractionCandidate[] = [];
    t.vi.collect({ x: h.x + 20, y: h.y, radius: 15, facing: 0 }, out);
    const hood = out.find((c) => c.target.key === `carro:${w.id}:capo`)!;
    const opt = hood.more!().find((o) => o.label.startsWith('Desmontar'))!;
    expect(opt.enabled).toBe(true);
    opt.perform();
    const r = t.started[0]!.done!();
    expect(r && r.ok).toBe(true);
    expect(t.inv.countOf('sucata')).toBeGreaterThan(0);
    expect(s.stripped).toBe(true);
    expect(hood.more!().some((o) => o.label.startsWith('Desmontar'))).toBe(false);
  });
});
