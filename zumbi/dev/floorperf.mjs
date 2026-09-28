// FPS no térreo x andar (com e sem a vista de baixo): node dev/floorperf.mjs <base>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const [base] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(base + '?debug&direto');
await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 60000 });
await p.evaluate(() => { const l = window.__TDR__.scene.game.loop; l.inFocus = true; });
await sleep(2000);
const T = (fn, ...a) => p.evaluate(fn, ...a);
const fps = async (label) => {
  const f0 = await T(() => window.__TDR__.scene.game.loop.frame);
  await sleep(5000);
  const f1 = await T(() => window.__TDR__.scene.game.loop.frame);
  console.log(label, ((f1 - f0) / 5).toFixed(1), 'fps', await T(() => window.__TDR__.world()));
};
const st = await T(() => { const g = window.__TDR__; const f = g.model.floors; return g.map.stairs.filter((s) => s.level === 1).sort((a, b) => f.top(b.building) - f.top(a.building))[0]; });
const g0 = await T((s) => window.__TDR__.map.stairs.find((q) => q.building === s.building && q.level === 0), st);
await T((s) => window.__TDR__.teleport(s.x + s.w / 2 + 40, s.y + s.h / 2), g0);
await sleep(1500);
await fps('térreo');
await T((s) => window.__TDR__.teleport(s.x + s.w / 2 + 40, s.y + s.h / 2), st);
await sleep(1500);
await fps('andar com vista');
await T(() => { const g = window.__TDR__.scene; g.floorCam.set(null); });
await sleep(1500);
await fps('andar sem vista');
await b.close();
