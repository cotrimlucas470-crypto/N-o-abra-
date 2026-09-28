// Perfil de CPU no navegador: node dev/profile.mjs <base> [segundos]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const [base, secs = '6'] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(base + '?debug&direto');
await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 60000 });
await p.evaluate(() => { const l = window.__TDR__.scene.game.loop; l.inFocus = true; });
await sleep(3000);
const cdp = await ctx.newCDPSession(p);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
await cdp.send('Profiler.start');
await sleep(Number(secs) * 1000);
const { profile } = await cdp.send('Profiler.stop');
const self = new Map();
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const dt = profile.timeDeltas;
const counts = new Map();
profile.samples.forEach((id, i) => counts.set(id, (counts.get(id) ?? 0) + (dt[i] ?? 0)));
for (const [id, t] of counts) {
  const n = byId.get(id);
  const f = n.callFrame;
  const key = `${f.functionName || '(anon)'} ${f.url.split('/').slice(-1)[0]}:${f.lineNumber}`;
  self.set(key, (self.get(key) ?? 0) + t);
}
const total = [...self.values()].reduce((a, b) => a + b, 0);
console.log('total ms', (total / 1000).toFixed(0));
for (const [k, t] of [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(((t / total) * 100).toFixed(1).padStart(5), '%', k);
await b.close();
