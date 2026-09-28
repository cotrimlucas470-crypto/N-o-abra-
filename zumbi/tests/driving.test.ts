import { describe, expect, it } from 'vitest';
import { carCircles, collideCar, driveControls, stepCar, type CarBody } from '../src/game/vehicles/Driving';
import { DriveSession } from '../src/game/vehicles/DriveSession';
import { NoiseSystem } from '../src/game/sim/Noise';
import { WorldState } from '../src/game/sim/WorldState';
import { buildStarterDistrict } from '../src/game/world/districts/StarterDistrict';
import { WorldModel } from '../src/game/world/WorldModel';
import { difficultyFrom, ZOMBIE_PRESETS } from '../src/game/zombies/Difficulty';
import { ZombieSystem } from '../src/game/zombies/ZombieSystem';
import { isVehicle } from '../src/game/vehicles/Vehicles';
import type { TaggedSolid } from '../src/game/sim/SolidIndex';

const GOOD = { engine: 1, tires: 1, body: 1, fuel: 30 };

describe('física do carro', () => {
  it('acelera para a frente, freia, dá ré; parado não gira', () => {
    const car: CarBody = { x: 0, y: 0, a: 0, speed: 0 };
    for (let i = 0; i < 60; i++) stepCar(car, { throttle: 1, steer: 0 }, GOOD, 1 / 30);
    expect(car.speed).toBeGreaterThan(200);
    expect(car.x).toBeGreaterThan(100);
    for (let i = 0; i < 60; i++) stepCar(car, { throttle: -1, steer: 0 }, GOOD, 1 / 30);
    expect(car.speed).toBeLessThan(0);
    const still: CarBody = { x: 0, y: 0, a: 0, speed: 0 };
    stepCar(still, { throttle: 0, steer: 1 }, GOOD, 1);
    expect(still.a).toBe(0);
  });

  it('sem gasolina não anda; motor ruim é mais lento', () => {
    const a: CarBody = { x: 0, y: 0, a: 0, speed: 0 };
    stepCar(a, { throttle: 1, steer: 0 }, { ...GOOD, fuel: 0 }, 1);
    expect(a.speed).toBe(0);
    const good: CarBody = { x: 0, y: 0, a: 0, speed: 0 };
    const bad: CarBody = { x: 0, y: 0, a: 0, speed: 0 };
    for (let i = 0; i < 300; i++) {
      stepCar(good, { throttle: 1, steer: 0 }, GOOD, 1 / 30);
      stepCar(bad, { throttle: 1, steer: 0 }, { ...GOOD, engine: 0.3, tires: 0.4 }, 1 / 30);
    }
    expect(bad.speed).toBeLessThan(good.speed * 0.75);
  });

  it('joystick para trás = ré; para o lado = vira', () => {
    const car: CarBody = { x: 0, y: 0, a: 0, speed: 0 };
    expect(driveControls(car, -1, 0, 1).throttle).toBeLessThan(0);
    const c = driveControls(car, 0.5, 1, 1);
    expect(c.throttle).toBeGreaterThan(0);
    expect(c.steer).toBeGreaterThan(0);
  });

  it('bate na parede e não atravessa', () => {
    const wall: TaggedSolid = { s: { kind: 'rect', x: 100, y: -200, w: 20, h: 400 }, kind: 'wall', id: 'w' };
    const q = { query: () => [wall] };
    // Um quadro depois de encostar: a frente entrou uns 9 px na parede.
    const car: CarBody = { x: 0, y: 0, a: 0, speed: 300 };
    const r = collideCar(car, [92, 44], q, 'eu');
    expect(r.hit).toBeTruthy();
    expect(r.impact).toBeGreaterThan(200);
    // Nenhum círculo da lataria fica dentro da parede.
    for (const c of carCircles(car, [92, 44])) expect(c.x + c.r).toBeLessThanOrEqual(100 + 3);
    expect(car.speed).toBeLessThan(0);
  });
});

describe('dirigindo no mundo', () => {
  it('o carro sai do lugar do mapa, leva os compartimentos junto e vai para o save', () => {
    const model = new WorldModel(buildStarterDistrict());
    const state = new WorldState(model);
    const noise = new NoiseSystem(model.sight);
    const zs = new ZombieSystem(model, state, noise, difficultyFrom(ZOMBIE_PRESETS.sobrevivencia.settings), { attack: () => null, noise: () => undefined });
    const car = model.map.props.find((p) => p.type === 'car' && isVehicle(p.type))!;
    expect(car).toBeTruthy();
    const st = state.vehicles.state(car.id)!;
    st.fuel = 20;
    st.engine = 1;
    st.tires = [1, 1, 1, 1];
    const drive = new DriveSession(car.id, state, zs.solids, zs, { noise: () => undefined, message: () => undefined });
    for (let i = 0; i < 40; i++) drive.update(1 / 30, { x: Math.cos(drive.car.a), y: Math.sin(drive.car.a), mag: 1 }, false);
    drive.sync(true);
    expect(state.vehicles.isMoved(car.id)).toBe(true);
    expect(state.isPropHidden(car.id)).toBe(true);
    const moved = state.vehicles.vehicle(car.id)!;
    expect(Math.hypot(moved.x - car.x, moved.y - car.y)).toBeGreaterThan(10);
    // Compartimento acompanhou.
    const glove = state.loot.ref(`${car.id}:luvas`);
    if (glove) expect(Math.hypot(glove.x - moved.x, glove.y - moved.y)).toBeLessThan(120);
    expect(st.fuel).toBeLessThan(20);
    // Save e volta.
    const save = JSON.parse(JSON.stringify(state.serialize()));
    const s2 = new WorldState(new WorldModel(buildStarterDistrict()));
    s2.restore(save);
    const back = s2.vehicles.vehicle(car.id)!;
    expect(back.x).toBeCloseTo(moved.x, 0);
    expect(s2.isPropHidden(car.id)).toBe(true);
    expect(s2.propsNear(back.x, back.y, 10).some((p) => p.prop.id === car.id)).toBe(true);
  });
});
