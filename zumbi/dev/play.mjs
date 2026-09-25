// Sessão de teste com zumbis: node dev/play.mjs <base> <pasta-saida>
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
p.on('pageerror', (e) => errors.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(base + '?debug&direto');
await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 30000 });
await p.evaluate(() => { const l = window.__TDR__.scene.game.loop; l.inFocus = true; l.panicMax = 0; });
await sleep(1500);
const T = (fn, ...a) => p.evaluate(fn, ...a);
console.log('zumbis', await T(() => { const z = window.__TDR__.zombies; return { total: z.store.size, vivos: z.store.aliveCount(), stats: z.stats() }; }));
// Sai do abrigo e vai para a rua.
const pl = await T(() => window.__TDR__.player());
console.log('jogador', pl);
const S = await T(() => { const d = window.__TDR__.map.doors.find((d) => d.buildingId === 'abrigo' && d.exterior); window.__TDR__.state.setDoorOpen(d.id, true); return d; });
await T((d) => window.__TDR__.teleport(d.x, d.y + 120), S);
await sleep(600);
const me = await T(() => window.__TDR__.player());
for (let i = 0; i < 5; i++) await T((m) => window.__TDR__.spawnZombie(m.x + 260 + (Math.random() - 0.5) * 160, m.y + (Math.random() - 0.5) * 200), me);
await sleep(300);
await p.screenshot({ path: out + '/z-01.png' });
await sleep(2500);
await p.screenshot({ path: out + '/z-02.png' });
console.log('estados', await T(() => window.__TDR__.zombies.stats().states), await T(() => window.__TDR__.player()));
await sleep(3000);
await p.screenshot({ path: out + '/z-03.png' });
console.log('estados', await T(() => window.__TDR__.zombies.stats().states), await T(() => window.__TDR__.player()), await T(() => window.__TDR__.zombies.threat.log.slice(-5)));
// Bate no mais perto.
for (let i = 0; i < 6; i++) { await T(() => window.__TDR__.attack()); await sleep(700); }
await p.screenshot({ path: out + '/z-04.png' });
console.log('depois dos golpes', await T(() => window.__TDR__.zombies.stats()), await T(() => window.__TDR__.zombieViews()));
console.log('sprite', await T(() => { const s = window.__TDR__.scene.player.sprite; return { vis: s.visible, a: s.alpha, frame: s.frame.name, x: s.x, y: s.y, tint: s.tintTopLeft, down: window.__TDR__.zombies.threat.downT, grab: window.__TDR__.zombies.threat.grabbed }; }));
console.log('erros', errors.slice(0, 5));
await b.close();
