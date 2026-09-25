// Medição (não roda no vitest normal): npx vitest run dev/perf.test.ts
import { it } from 'vitest';
import { NoiseSystem } from '../src/game/sim/Noise';
import { WorldState } from '../src/game/sim/WorldState';
import { buildCity } from '../src/game/world/districts/CityGenerator';
import { WorldModel } from '../src/game/world/WorldModel';
import { difficultyFrom, ZOMBIE_PRESETS } from '../src/game/zombies/Difficulty';
import { generatePopulation } from '../src/game/zombies/Population';
import { ZombieSystem } from '../src/game/zombies/ZombieSystem';
import { SANDBOX_DEFAULTS } from '../src/game/config/Sandbox';

for (const preset of ['sobrevivencia', 'extincao'] as const) {
  it(`desempenho ${preset}`, () => {
    const model = new WorldModel(buildCity({ ...SANDBOX_DEFAULTS.world, ambience: 1 }));
    const state = new WorldState(model);
    const noise = new NoiseSystem(model.sight);
    const diff = difficultyFrom(ZOMBIE_PRESETS[preset].settings);
    const sys = new ZombieSystem(model, state, noise, diff, { attack: () => null, noise: (x, y, k, r) => noise.emit(x, y, k, r ? { radius: r } : {}) });
    const t0 = performance.now();
    sys.populate(generatePopulation(model.map, model.nav, { population: diff.population, collapseDays: 0, safe: model.map.spawn }));
    const tPop = performance.now() - t0;
    const p = { x: model.map.spawn.x, y: model.map.spawn.y + 400, floor: 0, vx: 0, vy: 0, radius: 15, posture: 'andando' as const, inVehicle: false, alive: true, down: false };
    const light = { ambient: 1, beam: null, glow: 0, rain: 0, fog: 0 };
    const frames = 1200;
    const times: number[] = [];
    for (let i = 0; i < frames; i++) {
      // Jogador andando em círculo e um tiro de vez em quando.
      p.x = model.map.spawn.x + Math.cos(i / 200) * 600;
      p.y = model.map.spawn.y + 300 + Math.sin(i / 200) * 400;
      if (i % 300 === 150) noise.emit(p.x, p.y, 'tiro', { byPlayer: true });
      const a = performance.now();
      noise.update(1 / 60);
      sys.update({ dt: 1 / 60, player: p, light });
      times.push(performance.now() - a);
    }
    times.sort((a, b) => a - b);
    const avg = times.reduce((s, x) => s + x, 0) / times.length;
    const st = sys.stats();
    console.log(`${preset}: ${sys.store.size} zumbis (população ${tPop.toFixed(0)} ms) · média ${avg.toFixed(2)} ms · p95 ${times[Math.floor(frames * 0.95)]!.toFixed(2)} ms · máx ${times[frames - 1]!.toFixed(1)} ms · lod ${st.lod} · estados ${JSON.stringify(st.states)}`);
  }, 120000);
}
