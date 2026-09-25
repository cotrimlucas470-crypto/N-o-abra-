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
await T((n) => { const t = window.__TDR__; const me = t.player(); for (let i = 0; i < n; i++) { t.spawnZombie(me.x + Math.cos(i * 1.25) * 110, me.y + Math.sin(i * 1.25) * 110); const z = t.zombies.store.all.at(-1); z.facing = Math.atan2(me.y - z.y, me.x - z.x); } }, Number(process.env.N || 5));
const clip = { x: 322, y: 120, width: 200, height: 150 };
for (let i = 0; i < 6; i++) {
  await sleep(1200);
  await p.screenshot({ path: `${out}/r${i}.png`, clip });
  const occ = await T(() => {
    const t = window.__TDR__; const sc = t.scene; const me = t.player();
    return sc.children.list.filter((o) => o.visible && o.depth >= 29.5 && typeof o.x === 'number' && Math.abs(o.x - me.x) < 40 && Math.abs(o.y - me.y) < 40).map((o) => `${o.type}:${o.texture?.key ?? ''}:${o.frame?.name ?? ''}@${o.depth.toFixed(1)} a=${o.alpha.toFixed(2)}`);
  });
  console.log(i, occ.join(' | '));
}
await b.close();
