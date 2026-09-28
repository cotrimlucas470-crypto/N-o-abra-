// Atropelo e cerco ao carro: node dev/drive2.mjs <base> <pasta-saida>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}
const [base, out] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e.stack ?? e)));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(base + '?debug&direto');
await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 30000 });
await p.evaluate(() => { const l = window.__TDR__.scene.game.loop; l.inFocus = true; l.panicMax = 0; });
await sleep(1500);
const T = (fn, ...a) => p.evaluate(fn, ...a);
const car = await T(() => {
  const g = window.__TDR__;
  const me = g.player();
  let best = null;
  let bd = Infinity;
  for (const v of g.state.vehicles.all()) {
    if (v.type !== 'car') continue;
    const d = Math.hypot(v.x - me.x, v.y - me.y);
    if (d < bd) { bd = d; best = v; }
  }
  const s = g.state.vehicles.state(best.id);
  s.fuel = 30; s.engine = 0.9; s.tires = [0.9, 0.9, 0.9, 0.9]; s.body = 0.9; s.broken = [];
  return { id: best.id, x: best.x, y: best.y };
});
await T((c) => window.__TDR__.teleport(c.x + 90, c.y), car);
await sleep(400);
await T((c) => window.__TDR__.drive(c.id), car);
await sleep(300);
// Zumbis na frente, carro já embalado.
const d0 = await T(() => window.__TDR__.driving());
await T((d) => { const g = window.__TDR__; for (let i = 0; i < 3; i++) g.spawnZombie(d.x + Math.cos(d.a) * (230 + i * 40), d.y + Math.sin(d.a) * (230 + i * 40) + (i - 1) * 12); }, d0);
await T((d) => { const g = window.__TDR__; g.scene.drive.car.speed = 380; g.scene.s.touch.move = { x: Math.cos(d.a), y: Math.sin(d.a), magnitude: 1, active: true }; }, d0);
const before = await T(() => window.__TDR__.zombies.stats());
for (let i = 0; i < 12; i++) {
  await sleep(250);
  if (i === 3) await p.screenshot({ path: out + '/r-01.png' });
}
await T(() => { window.__TDR__.scene.s.touch.move = { x: 0, y: 0, magnitude: 0, active: false }; });
await p.screenshot({ path: out + '/r-02.png' });
const zs = await T((d) => window.__TDR__.zombies.store.near(d.x, d.y, 900).filter((z) => z.id.startsWith('dbg') || true).slice(0, 12).map((z) => ({ id: z.id, st: z.mind.state, dead: z.dead, parts: Object.values(z.parts).map((v) => Math.round(v * 10) / 10).join(',') })), d0);
console.log('antes', before.alive, before.dead, 'depois', await T(() => { const s = window.__TDR__.zombies.stats(); return [s.alive, s.dead]; }));
console.log('perto', zs);
console.log('carro', await T(() => { const d = window.__TDR__.driving(); return { kmh: d.kmh, body: d.st.body, broken: d.st.broken }; }));
// Para e deixa cercar.
for (let i = 0; i < 40; i++) { const d = await T(() => window.__TDR__.driving()); if (Math.abs(d.speed) < 5) break; await sleep(300); }
const d1 = await T(() => window.__TDR__.driving());
await T((d) => { const g = window.__TDR__; for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.spawnZombie(d.x + Math.cos(a) * 170, d.y + Math.sin(a) * 170); } }, d1);
for (let i = 0; i < 16; i++) {
  await sleep(1000);
  const r = await T(() => { const g = window.__TDR__; const d = g.driving(); return { t: Math.round(g.player().t * 10) / 10, body: d.st.body.toFixed(3), broken: d.st.broken, grab: g.zombies.threat.grabbed, hp: Math.round(g.player().health), states: g.zombies.stats().states, log: g.zombies.threat.log.slice(-2) }; });
  console.log(i, JSON.stringify(r));
  if (i === 6) await p.screenshot({ path: out + '/r-03.png' });
}
await p.screenshot({ path: out + '/r-04.png' });
console.log('erros', errors.slice(0, 8));
await b.close();
