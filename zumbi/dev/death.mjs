// Teste de ataque até a morte: node dev/death.mjs <base> <saida>
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
await sleep(1500);
const T = (fn, ...a) => p.evaluate(fn, ...a);
await T(() => { const t = window.__TDR__; const d = t.map.doors.find((d) => d.buildingId === 'abrigo' && d.exterior); t.state.setDoorOpen(d.id, true); t.teleport(d.x, d.y + 140); });
await sleep(500);
await T(() => { const t = window.__TDR__; const me = t.player(); for (let i = 0; i < 5; i++) { t.spawnZombie(me.x + Math.cos(i * 1.25) * 70, me.y + Math.sin(i * 1.25) * 70); const z = t.zombies.store.all.at(-1); z.facing = Math.atan2(me.y - z.y, me.x - z.x); } });
for (let i = 0; i < 30; i++) {
  await sleep(1500);
  const st = await T(() => ({ now: window.__TDR__.zombies.now.toFixed(1), hp: Math.round(window.__TDR__.player().health), dead: window.__TDR__.dead(), th: { g: window.__TDR__.zombies.threat.grabbed, d: window.__TDR__.zombies.threat.downT.toFixed(1) }, log: window.__TDR__.zombies.threat.log.slice(-2).map((l) => l.text) }));
  console.log(i, JSON.stringify(st));
  if (i === 2) await p.screenshot({ path: out + '/d-01.png' });
  if (st.dead) break;
}
await sleep(3500);
await p.screenshot({ path: out + '/d-02.png' });
await b.close();
