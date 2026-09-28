// Andares no navegador: node dev/floors.mjs <base> <pasta-saida>
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
await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 60000 });
await p.evaluate(() => { const l = window.__TDR__.scene.game.loop; l.inFocus = true; l.panicMax = 0; });
await sleep(1500);
const T = (fn, ...a) => p.evaluate(fn, ...a);
const info = await T(() => { const g = window.__TDR__; const m = g.map; return { floors: m.floors.length, stairs: m.stairs.length, H: m.heightTiles, cityH: m.cityHeightTiles }; });
console.log('mapa', info);
// Escada térrea mais perto do jogador, num prédio de vários andares.
const st = await T(() => {
  const g = window.__TDR__;
  const me = g.player();
  const f = g.model.floors;
  const list = g.map.stairs.filter((s) => s.level === 0).sort((a, b) => f.top(b.building) - f.top(a.building) || Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y));
  return list[0];
});
console.log('escada', st);
// Abre a porta do prédio e vai para perto da escada.
await T((s) => { const g = window.__TDR__; for (const d of g.map.doors) if (d.buildingId === s.building) g.state.setDoorOpen(d.id, true); g.teleport(s.x + s.w / 2 + (s.h > s.w ? s.w / 2 + 24 : 0), s.y + s.h / 2 + (s.h > s.w ? 0 : s.h / 2 + 24)); }, st);
await sleep(800);
await p.screenshot({ path: out + '/f-00.png' });
console.log('alvo', await T(() => window.__TDR__.interaction()));
// Zumbis na rua perto do prédio.
const bld = await T((s) => window.__TDR__.map.buildings.find((b) => b.id === s.building).bounds, st);
await T((r) => { const g = window.__TDR__; for (let i = 0; i < 5; i++) g.spawnZombie(r.x + r.w / 2 + (i - 2) * 50, r.y + r.h + 120 + (i % 2) * 40); }, bld);
await T(() => window.__TDR__.interact());
await sleep(1500);
console.log('andar', await T(() => { const f = window.__TDR__.floor(); return f && { id: f.id, level: f.level }; }), await T(() => window.__TDR__.player()));
await p.screenshot({ path: out + '/f-01.png' });
console.log('alvo lá em cima', await T(() => window.__TDR__.interaction()));
// Sobe mais (se der).
const up = await T(() => window.__TDR__.options());
console.log('opções', up);
await T(() => window.__TDR__.interact());
await sleep(1500);
console.log('andar2', await T(() => { const f = window.__TDR__.floor(); return f && { id: f.id, level: f.level }; }));
await p.screenshot({ path: out + '/f-02.png' });
// Anda até uma janela: vista da rua.
const f2 = await T(() => { const f = window.__TDR__.floor(); return f && f.bounds; });
if (f2) {
  await T((r) => window.__TDR__.teleport(r.x + r.w / 2, r.y + r.h - 60), f2);
  await sleep(1200);
  await p.screenshot({ path: out + '/f-03.png' });
}
// Barulho lá em cima: zumbi da rua sobe?
await T(() => { const g = window.__TDR__; for (let i = 0; i < 4; i++) g.scene.s.bus.emit('world:noise', { x: g.player().x, y: g.player().y, radius: 1200, source: 'tiro', kind: 'tiro', byPlayer: true }); });
for (let i = 0; i < 10; i++) {
  await sleep(1500);
  const st2 = await T(() => { const g = window.__TDR__; const f = g.model.floors; const c = {}; for (const z of g.zombies.store.all) { if (z.dead) continue; const k = `${f.spaceAt(z.x, z.y)}:${z.mind.state}${z.mind.stair ? '*' : ''}`; if (/INVESTIGATE|CHASE|SEARCH|\*/.test(k)) c[k] = (c[k] ?? 0) + 1; } return { t: Math.round(g.player().t), c }; });
  console.log('zumbis', JSON.stringify(st2));
}
await p.screenshot({ path: out + '/f-04.png' });
console.log('erros', errors.slice(0, 8));
await b.close();
