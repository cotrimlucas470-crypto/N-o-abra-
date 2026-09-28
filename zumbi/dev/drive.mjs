// Teste de direção no navegador: node dev/drive.mjs <base> <pasta-saida>
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
// Carro inteiro mais perto do jogador, numa rua.
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
  s.fuel = 30; s.engine = 0.9; s.tires = [0.9, 0.9, 0.9, 0.9]; s.body = 0.9;
  return { id: best.id, x: best.x, y: best.y, a: best.angle, flip: best.flipX, d: bd };
});
console.log('carro', car);
await T((c) => window.__TDR__.teleport(c.x, c.y + 90), car);
await sleep(500);
console.log('entrar', await T((c) => window.__TDR__.drive(c.id), car));
await sleep(300);
await p.screenshot({ path: out + '/d-01.png' });
// Acelera para a frente do carro.
const drv0 = await T(() => window.__TDR__.driving());
console.log('ao volante', { x: drv0.x, y: drv0.y, a: drv0.a });
const push = (x, y) => T(([x, y]) => { window.__TDR__.scene.s.touch.move = { x, y, magnitude: Math.hypot(x, y), active: true }; }, [x, y]);
await push(Math.cos(drv0.a), Math.sin(drv0.a));
// Um zumbi na frente do carro.
await T((d) => { for (let i = 0; i < 3; i++) window.__TDR__.spawnZombie(d.x + Math.cos(d.a) * (420 + i * 60), d.y + Math.sin(d.a) * (420 + i * 60) + (i - 1) * 16); }, drv0);
for (let i = 0; i < 6; i++) {
  await sleep(700);
  const d = await T(() => window.__TDR__.driving());
  console.log('t', i, { x: Math.round(d.x), y: Math.round(d.y), kmh: d.kmh, fuel: d.st.fuel.toFixed(2), body: d.st.body.toFixed(3) });
  if (i === 2) await p.screenshot({ path: out + '/d-02.png' });
}
await p.screenshot({ path: out + '/d-03.png' });
// Vira à esquerda.
const d1 = await T(() => window.__TDR__.driving());
await push(Math.cos(d1.a - 1.2), Math.sin(d1.a - 1.2));
await sleep(1500);
await p.screenshot({ path: out + '/d-04.png' });
// Solta e freia apontando para trás.
const d2 = await T(() => window.__TDR__.driving());
await push(-Math.cos(d2.a), -Math.sin(d2.a));
await sleep(1500);
await push(0, 0);
await T(() => { window.__TDR__.scene.s.touch.move = { x: 0, y: 0, magnitude: 0, active: false }; });
for (let i = 0; i < 40; i++) { const d = await T(() => window.__TDR__.driving()); if (Math.abs(d.speed) < 5) break; await sleep(300); }
const d3 = await T(() => window.__TDR__.driving());
console.log('parado?', { kmh: d3.kmh, x: Math.round(d3.x), y: Math.round(d3.y) });
console.log('zumbis', await T(() => window.__TDR__.zombies.stats()));
await T(() => window.__TDR__.exitCar());
console.log('saiu', !(await T(() => window.__TDR__.driving())), await T(() => window.__TDR__.player()));
await sleep(600);
await p.screenshot({ path: out + '/d-05.png' });
await T(() => window.__TDR__.save());
const saved = await T((c) => { const g = window.__TDR__; return { pose: g.state.vehicles.state(c.id).pose, moved: g.state.vehicles.isMoved(c.id) }; }, car);
console.log('save', saved);
const old = await T(() => { window.__old = window.__TDR__; return window.__TDR__.loadLast(); });
console.log('carregar', old);
await sleep(3000);
console.log('cenas', await T(() => window.__old.scene.game.scene.scenes.map((x) => `${x.sys.settings.key}:${x.sys.settings.status}`)), await T(() => window.__TDR__ !== window.__old), errors.slice(0, 5));
await p.waitForFunction(() => window.__TDR__ && window.__TDR__ !== window.__old, null, { timeout: 30000 });
await sleep(1500);
const back = await T((c) => { const g = window.__TDR__; const v = g.state.vehicles.vehicle(c.id); return { x: v.x, y: v.y, a: v.angle, moved: g.state.vehicles.isMoved(c.id), me: g.player(), nav: g.model.nav.isBlocked ? null : null }; }, car);
console.log('depois de carregar', back);
await sleep(800);
await p.screenshot({ path: out + '/d-06.png' });
console.log('erros', errors.slice(0, 8));
await b.close();
