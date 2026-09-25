// Experimento: o que faz o tronco do jogador sumir com vários zumbis na tela.
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
await T(() => { const t = window.__TDR__; const me = t.player(); for (let i = 0; i < 5; i++) { t.spawnZombie(me.x + Math.cos(i * 1.25) * 110, me.y + Math.sin(i * 1.25) * 110); const z = t.zombies.store.all.at(-1); z.traits.walk = 0; z.traits.sprint = 0; z.traits.vision = 0; } });
await sleep(2000);
const clip = { x: 322, y: 120, width: 200, height: 150 };
await p.screenshot({ path: `${out}/e0.png`, clip });
const texs = await T(() => {
  const sc = window.__TDR__.scene;
  const cam = sc.cameras.main;
  const set = new Map();
  for (const o of sc.children.list) {
    if (!o.visible || !o.texture) continue;
    const k = o.texture.key;
    set.set(k, (set.get(k) ?? 0) + 1);
  }
  return [...set.entries()];
});
console.log('texturas na cena:', texs.length, JSON.stringify(texs));
// Esconde as imagens de zumbi.
await T(() => { for (const o of window.__TDR__.scene.children.list) if (o.texture?.key?.startsWith('zumbi:')) o.setVisible(false); });
await sleep(400);
await p.screenshot({ path: `${out}/e1.png`, clip });
await b.close();
