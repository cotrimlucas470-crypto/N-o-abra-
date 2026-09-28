// Tempo do campo de fluxo em vários pontos da cidade: npx vitest run -c dev/vitest.perf.config.ts dev/flow.test.ts
import { it } from 'vitest';
import { buildCity } from '../src/game/world/districts/CityGenerator';
import { addUpperFloors } from '../src/game/world/floors/UpperFloors';
import { WorldModel } from '../src/game/world/WorldModel';
import { FlowField } from '../src/game/world/nav/FlowField';
import { SANDBOX_DEFAULTS } from '../src/game/config/Sandbox';
it('campo de fluxo', () => {
  const model = new WorldModel(addUpperFloors(buildCity({ ...SANDBOX_DEFAULTS.world, ambience: 1 })));
  const f = new FlowField(model.nav, 38, 14);
  let worst = 0;
  let n = 0;
  const times: number[] = [];
  for (let y = 200; y < model.floors.cityHeightPx - 200; y += 97) {
    for (let x = 200; x < model.widthPx - 200; x += 131) {
      const t0 = performance.now();
      f.build(x, y);
      const dt = performance.now() - t0;
      times.push(dt);
      worst = Math.max(worst, dt);
      n++;
    }
  }
  times.sort((a, b) => a - b);
  console.log('FLOW', n, 'contas; média', (times.reduce((a, b) => a + b, 0) / n).toFixed(2), 'ms; p99', times[Math.floor(n * 0.99)]!.toFixed(2), 'ms; pior', worst.toFixed(1), 'ms');
}, 600000);
