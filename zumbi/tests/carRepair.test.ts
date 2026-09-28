import { describe, expect, it } from 'vitest';
import type { InteractionCandidate } from '../src/game/interaction/InteractionSystem';
import { VehicleInteractions, type VehicleHooks } from '../src/game/interaction/VehicleInteractions';
import { PlayerInventory } from '../src/game/items/PlayerInventory';
import type { TimedActionSpec } from '../src/game/sim/Actions';
import { NoiseSystem } from '../src/game/sim/Noise';
import { WorldState } from '../src/game/sim/WorldState';
import { Survivor } from '../src/game/survival/Survivor';
import { DriveSession } from '../src/game/vehicles/DriveSession';
import { CAR_REPAIR, DRIVE_TUNING, startChance } from '../src/game/vehicles/Driving';
import { VEHICLE_SPECS, isVehicle, toWorld } from '../src/game/vehicles/Vehicles';
import { buildCity } from '../src/game/world/districts/CityGenerator';
import { buildStarterDistrict } from '../src/game/world/districts/StarterDistrict';
import { WorldModel } from '../src/game/world/WorldModel';
import { difficultyFrom, ZOMBIE_PRESETS } from '../src/game/zombies/Difficulty';
import { ZombieSystem } from '../src/game/zombies/ZombieSystem';

/** 1 km em px (1 tile = 64 px = 1,3 m). */
const KM = (1000 / 1.3) * 64;

describe('carro: defeitos raros', () => {
  it('motor bom pega sempre; fraco engasga; destruído não pega', () => {
    expect(startChance(1)).toBe(1);
    expect(startChance(DRIVE_TUNING.sureStart)).toBe(1);
    expect(startChance(0.3)).toBeGreaterThan(0.25);
    expect(startChance(0.3)).toBeLessThan(1);
    expect(startChance(0.1)).toBe(0);
  });

  it('não quebra fácil: ~1% de motor e ~1% de chance de furar pneu por km', () => {
    expect(DRIVE_TUNING.engineWearPerPx * KM).toBeGreaterThan(0.005);
    expect(DRIVE_TUNING.engineWearPerPx * KM).toBeLessThan(0.02);
    // 4 pneus bons (fator 1,5 − 1): chance de algum furar num km.
    const good = 4 * KM * DRIVE_TUNING.flatPerPx * 0.5;
    expect(good).toBeGreaterThan(0.005);
    expect(good).toBeLessThan(0.02);
    // Um tanque cheio (~10 km) com carro bom nunca chega a motor fraco.
    expect(1 - DRIVE_TUNING.engineWearPerPx * KM * 10).toBeGreaterThan(DRIVE_TUNING.sureStart);
  });

  function drive(rng: () => number, engine = 1) {
    const model = new WorldModel(buildStarterDistrict());
    const state = new WorldState(model);
    const zs = new ZombieSystem(model, state, new NoiseSystem(model.sight), difficultyFrom(ZOMBIE_PRESETS.sobrevivencia.settings), { attack: () => null, noise: () => undefined });
    const car = model.map.props.find((p) => p.type === 'car' && isVehicle(p.type))!;
    const st = state.vehicles.state(car.id)!;
    st.fuel = 20;
    st.engine = engine;
    st.tires = [1, 1, 1, 1];
    const msgs: string[] = [];
    const d = new DriveSession(car.id, state, zs.solids, zs, { noise: () => undefined, message: (t) => msgs.push(t) }, rng);
    const go = (n: number) => {
      for (let i = 0; i < n; i++) d.update(1 / 30, { x: Math.cos(d.car.a), y: Math.sin(d.car.a), mag: 1 }, false);
    };
    return { d, st, msgs, go };
  }

  it('rodando, o motor gasta devagar; com azar, um pneu fura', () => {
    const lucky = drive(() => 0.99);
    lucky.go(40);
    expect(lucky.st.engine).toBeLessThan(1);
    expect(lucky.st.engine).toBeGreaterThan(0.999);
    expect(lucky.st.tires.every((t) => t === 1)).toBe(true);
    // Um sorteio de azar só (o primeiro), depois sorte.
    let first = true;
    const unlucky = drive(() => (first ? ((first = false), 0) : 0.99));
    unlucky.go(10);
    expect(unlucky.st.tires.filter((t) => t !== null && t < 0.1)).toHaveLength(1);
    expect(unlucky.msgs.join(' ')).toMatch(/pneu furou/);
  });

  it('motor fraco morre andando e pega de novo; motor bom nunca morre', () => {
    let r = 0;
    const weak = drive(() => r, 0.3);
    weak.go(3);
    expect(weak.d.stalled).toBe(true);
    expect(weak.msgs.join(' ')).toMatch(/motor morreu/);
    const speed = weak.d.car.speed;
    weak.go(10);
    expect(weak.d.car.speed).toBeLessThanOrEqual(speed);
    // Acelerando, tenta a partida de tempos em tempos: 0,3 pega (chance ~57%) e não morre de novo.
    r = 0.3;
    weak.go(Math.ceil(DRIVE_TUNING.restartEvery * 30) + 2);
    expect(weak.d.stalled).toBe(false);
    expect(weak.msgs.join(' ')).toMatch(/pegou de novo/);
    r = 0.99;
    const good = drive(() => 0, 1);
    good.go(60);
    expect(good.d.stalled).toBe(false);
  });
});

describe('carro: conserto no capô', () => {
  function world() {
    const model = new WorldModel(buildCity({ seed: 1337, sectorsX: 3, sectorsY: 3 }));
    const state = new WorldState(model);
    const inv = new PlayerInventory();
    const stats = { health: 100, maxHealth: 100, setHealth(v: number) { this.health = v; } };
    const sv = new Survivor(stats, inv);
    const started: TimedActionSpec[] = [];
    const infos: string[][] = [];
    const roll = { v: 0.99 };
    const hooks: VehicleHooks = {
      start: (s) => started.push(s),
      drop: () => undefined,
      noise: () => undefined,
      moveTo: () => undefined,
      now: () => 0,
      rng: () => roll.v,
      openContainer: () => undefined,
      info: (_t, lines) => infos.push(lines),
    };
    const vi = new VehicleInteractions(state, inv, sv, hooks);
    const v = [...state.vehicles.all()].find((p) => p.type === 'car')!;
    const s = state.vehicles.state(v.id)!;
    s.hood = true;
    const h = VEHICLE_SPECS.car.hood;
    const at = toWorld(v, h[0] + 25, h[1]);
    const who = { x: at.x, y: at.y, radius: 15, facing: 0 };
    const hood = () => {
      const out: InteractionCandidate[] = [];
      vi.collect(who, out);
      return out.find((c) => c.target.key === `carro:${v.id}:capo`)!.more!();
    };
    const pick = (label: RegExp) => hood().find((o) => label.test(o.label));
    return { state, inv, sv, started, infos, roll, vi, v, s, hood, pick };
  }

  it('consertar o motor gasta a peça e sobe o motor; falhar pode poupar a peça', () => {
    const t = world();
    t.s.engine = 0.2;
    t.inv.add('pecasMotor', 2);
    expect(t.pick(/Consertar o motor/)!.enabled).toBe(false); // sem chave inglesa
    t.inv.add('chaveInglesa', 1);
    const opt = t.pick(/Consertar o motor/)!;
    expect(opt.enabled).toBe(true);
    // Falha (rng alto): peça fica (o segundo sorteio também é alto).
    opt.perform();
    t.started.at(-1)!.done();
    expect(t.s.engine).toBe(0.2);
    expect(t.inv.countOf('pecasMotor')).toBe(2);
    // Acerto (rng baixo).
    t.roll.v = 0;
    t.pick(/Consertar o motor/)!.perform();
    t.started.at(-1)!.done();
    expect(t.s.engine).toBeCloseTo(0.2 + CAR_REPAIR.engine.gain, 5);
    expect(t.inv.countOf('pecasMotor')).toBe(1);
  });

  it('chave de carro ou a própria peça não servem de chave inglesa', () => {
    const t = world();
    t.s.engine = 0.2;
    t.inv.add('pecasMotor', 1);
    t.inv.add('chaveCarro', 1, { key: 'outro' });
    t.inv.add('chaveRoda', 1);
    expect(t.pick(/Consertar o motor/)!.enabled).toBe(false);
    expect(t.pick(/Tirar a bateria/)!.enabled).toBe(false);
  });

  it('vela e óleo ajudam motor fraco a pegar, com teto', () => {
    const t = world();
    t.roll.v = 0;
    t.s.engine = 0.3;
    t.inv.add('chaveInglesa', 1);
    t.inv.add('velaIgnicao', 4);
    t.pick(/Trocar a vela/)!.perform();
    t.started.at(-1)!.done();
    expect(t.s.engine).toBeCloseTo(0.4, 5);
    t.s.engine = CAR_REPAIR.plug.cap - 0.02;
    t.pick(/Trocar a vela/)!.perform();
    t.started.at(-1)!.done();
    expect(t.s.engine).toBeCloseTo(CAR_REPAIR.plug.cap, 5);
    expect(t.pick(/Trocar a vela/)).toBeUndefined(); // já no teto
    t.inv.add('oleoMotor', 1);
    t.pick(/Trocar o óleo/)!.perform();
    t.started.at(-1)!.done();
    expect(t.s.engine).toBeCloseTo(CAR_REPAIR.oil.cap, 5);
    expect(t.inv.countOf('oleoMotor')).toBe(0);
  });

  it('pneu furado: remendo com borracha + cola; tirado, vira só borracha', () => {
    const t = world();
    t.roll.v = 0;
    t.s.tires = [1, 0.05, 1, 1];
    t.inv.add('borracha', 1);
    expect(t.pick(/Remendar/)!.enabled).toBe(false);
    t.inv.add('cola', 1);
    t.pick(/Remendar/)!.perform();
    t.started.at(-1)!.done();
    expect(t.s.tires[1]).toBe(CAR_REPAIR.patch.result);
    expect(t.inv.countOf('borracha') + t.inv.countOf('cola')).toBe(0);
    // Tirar um pneu furado não rende pneu bom.
    t.s.tires = [0.05, 1, 1, 1];
    t.inv.add('macaco', 1);
    t.inv.add('chaveRoda', 1);
    t.pick(/Tirar um pneu/)!.perform();
    t.started.at(-1)!.done();
    expect(t.inv.countOf('pneu')).toBe(0);
    expect(t.inv.countOf('borracha')).toBe(1);
  });

  it('motor fraco engasga na partida; examinar diz o que está ruim e como consertar', () => {
    const t = world();
    const s = t.s;
    for (const d of Object.values(s.doors)) {
      d.locked = false;
      d.open = true;
    }
    Object.assign(s, { engine: 0.3, battery: 1, fuel: 20, keyInside: true, tires: [1, 0.05, 1, 1] });
    t.vi.examine(t.v);
    const text = t.infos.at(-1)!.join('\n');
    expect(text).toMatch(/Motor fraco/);
    expect(text).toMatch(/Pneu furado: remendar/);
    s.tires = [1, 1, 1, 1];
    const door = toWorld(t.v, 20, -60);
    const out: InteractionCandidate[] = [];
    t.vi.collect({ x: door.x, y: door.y, radius: 15, facing: 0 }, out);
    const start = () => out.find((c) => c.target.key === `carro:${t.v.id}:motorista`)!.more!().find((o) => o.label === 'Tentar ligar o carro')!.perform();
    t.roll.v = 0.99;
    expect(start().message).toMatch(/engasgou/);
    t.roll.v = 0;
    expect(start().ok).toBe(true);
  });
});
