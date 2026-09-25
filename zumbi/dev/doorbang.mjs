// Zumbis batendo na porta do abrigo, com camadas de debug ligadas.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const [base, out] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('ERR', String(e)));
await p.goto(base + '?debug&direto');
await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 30000 });
await p.evaluate(() => { const l = window.__TDR__.scene.game.loop; l.inFocus = true; l.panicMax = 0; });
await sleep(1200);
const T = (fn, ...a) => p.evaluate(fn, ...a);
const door = await T(() => { const t = window.__TDR__; const d = t.map.doors.find((d) => d.buildingId === 'abrigo' && d.exterior); t.state.setDoorOpen(d.id, false); t.state.setDoorLocked(d.id, true); t.teleport(d.x, d.y - 110); const ds = t.scene.debugState; ds.zombies = true; ds.damage = true; return d; });
await T((d) => { const t = window.__TDR__; for (let i = 0; i < 5; i++) { t.spawnZombie(d.x - 60 + i * 30, d.y + 90 + (i % 2) * 30); const z = t.zombies.store.all.at(-1); z.mind.state = 'CHASE'; z.mind.lastSeen = { x: d.x, y: d.y - 110, t: t.zombies.now }; z.traits.memory = 999; } }, door);
for (let i = 0; i < 8; i++) {
  await sleep(2500);
  // Mantém a memória fresca (o jogador faz barulho lá dentro).
  await T((d) => { const t = window.__TDR__; for (const z of t.zombies.store.all.slice(-5)) if (z.mind.lastSeen) z.mind.lastSeen.t = t.zombies.now; }, door);
  const st = await T((d) => { const t = window.__TDR__; return { hp: t.state.doorHealth(d.id).toFixed(1), broken: !!t.state.doorState(d.id).broken, bang: t.zombies.store.all.slice(-5).map((z) => z.mind.state + (z.mind.bang ? '*' : '')).join(',') }; }, door);
  console.log(i, JSON.stringify(st));
  if (i === 3) await p.screenshot({ path: out + '/b1.png' });
  if (st.broken) break;
}
await p.screenshot({ path: out + '/b2.png' });
await b.close();
