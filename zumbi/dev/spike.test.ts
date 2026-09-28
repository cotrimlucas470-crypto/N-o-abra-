// Acha o que trava um quadro (perfil de CPU do pior quadro): npx vitest run -c dev/vitest.perf.config.ts dev/spike.test.ts
import { it } from 'vitest';
import { NoiseSystem } from '../src/game/sim/Noise';
import { WorldState } from '../src/game/sim/WorldState';
import { buildCity } from '../src/game/world/districts/CityGenerator';
import { addUpperFloors } from '../src/game/world/floors/UpperFloors';
import { WorldModel } from '../src/game/world/WorldModel';
import { difficultyFrom, ZOMBIE_PRESETS } from '../src/game/zombies/Difficulty';
import { generatePopulation } from '../src/game/zombies/Population';
import { ZombieSystem } from '../src/game/zombies/ZombieSystem';
import { SANDBOX_DEFAULTS } from '../src/game/config/Sandbox';

it('pico', async () => {
  const model = new WorldModel(addUpperFloors(buildCity({ ...SANDBOX_DEFAULTS.world, ambience: 1 })));
  const state = new WorldState(model);
  const noise = new NoiseSystem(model.sight);
  const diff = difficultyFrom(ZOMBIE_PRESETS.extincao.settings);
  const sys = new ZombieSystem(model, state, noise, diff, { attack: () => null, noise: (x, y, k, r) => noise.emit(x, y, k, r ? { radius: r } : {}) });
  sys.populate(generatePopulation(model.map, model.nav, { population: diff.population, collapseDays: 0, safe: model.map.spawn }));
  const p = { x: model.map.spawn.x, y: model.map.spawn.y + 400, floor: 0, vx: 0, vy: 0, radius: 15, posture: 'andando' as const, inVehicle: false, alive: true, down: false };
  const light = { ambient: 1, beam: null, glow: 0, rain: 0, fog: 0 };
  // Cronômetro por método (o pior quadro mostra quem pesou).
  const acc = new Map<string, number>();
  const proto = Object.getPrototypeOf(sys) as Record<string, unknown>;
  for (const name of ['solvePath', 'hear', 'tick', 'farTick', 'navigate', 'maybeStairs', 'decide', 'perceive', 'social']) {
    const f = proto[name] as ((...a: unknown[]) => unknown) | undefined;
    if (typeof f !== 'function') continue;
    proto[name] = function (this: unknown, ...a: unknown[]) {
      const t0 = performance.now();
      try {
        return f.apply(this, a);
      } finally {
        acc.set(name, (acc.get(name) ?? 0) + performance.now() - t0);
      }
    };
  }
  const flow = (sys as unknown as { flow: { build: (x: number, y: number) => void } }).flow;
  const fb = flow.build.bind(flow);
  flow.build = (x, y) => {
    const t0 = performance.now();
    fb(x, y);
    acc.set('flow.build', (acc.get('flow.build') ?? 0) + performance.now() - t0);
  };
  let worst = { t: 0, i: -1, parts: '' };
  for (let i = 0; i < 1200; i++) {
    p.x = model.map.spawn.x + Math.cos(i / 200) * 600;
    p.y = model.map.spawn.y + 300 + Math.sin(i / 200) * 400;
    if (i % 300 === 150) noise.emit(p.x, p.y, 'tiro', { byPlayer: true });
    acc.clear();
    const a = performance.now();
    noise.update(1 / 60);
    sys.update({ dt: 1 / 60, player: p, light });
    const t = performance.now() - a;
    if (t > worst.t) worst = { t, i, parts: [...acc.entries()].sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k}=${v.toFixed(1)}`).join(' ') };
  }
  console.log('PIOR', worst.i, worst.t.toFixed(0), 'ms', worst.parts);
}, 300000);
