// Gerador no navegador: node dev/generator.mjs <base> <pasta-saida>
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
// Noite, no abrigo: fora, do lado da parede, com gerador, gasolina e extensão.
await T(() => {
  const g = window.__TDR__;
  g.clock.advance(((24 + 20) * 60 - g.clock.minuteOfDay) % (24 * 60));
  g.inventory.carryInArms('gerador');
  g.inventory.add('combustivel', 1);
  g.inventory.add('extensao', 1);
});
const home = await T(() => { const g = window.__TDR__; const b = g.map.buildings.find((x) => x.id === 'abrigo') ?? g.map.buildings[0]; return b.bounds; });
console.log('abrigo', home);
// Fica ao lado de fora, olhando para longe da parede (oeste).
await T((r) => { const g = window.__TDR__; g.teleport(r.x - 110, r.y + r.h / 2); g.scene.player.placeAt(r.x - 110, r.y + r.h / 2, Math.PI); }, home);
await sleep(600);
console.log('build', await T(() => { const g = window.__TDR__; window.__msgs = []; g.scene.s.bus.on('player:feedback', (o) => window.__msgs.push(o.text)); g.build('gerador'); return g.scene.s.session.build; }));
await sleep(500);
console.log('prévia', await T(() => { const g = window.__TDR__; const pv = g.crafting.preview('gerador'); return pv && { ok: pv.ok, reason: pv.reason, at: pv.at }; }), await T(() => window.__TDR__.scene.s.session.build), await T(() => window.__TDR__.player()));
console.log('start', await T(() => { const g = window.__TDR__; const why = g.crafting.start('gerador'); return { why, active: g.loop.runner.active, cur: g.loop.runner.current?.label ?? null }; }));
for (let i = 0; i < 200; i++) { await sleep(300); if (!(await T(() => window.__TDR__.loop.runner.active))) break; }
console.log('msgs', await T(() => window.__msgs), await T(() => window.__TDR__.scene.s.session.action ?? null));
const gen = await T(() => { const g = window.__TDR__; return [...g.state.structures.list('gerador')].map((s) => ({ id: s.id, x: s.x, y: s.y, hp: s.hp })); });
console.log('gerador', gen);
const opts = async () => T(() => window.__TDR__.options());
const choose = async (re) => {
  const o = await opts();
  const i = o.findIndex((l) => new RegExp(re).test(l));
  if (i < 0) return `sem opção ${re}: ${o.join(' | ')}`;
  await T((i) => window.__TDR__.choose(i), i);
  for (let k = 0; k < 10; k++) { if (await T(() => window.__TDR__.loop.runner.active)) break; await sleep(300); }
  for (let k = 0; k < 200; k++) { await sleep(300); if (!(await T(() => window.__TDR__.loop.runner.active))) break; }
  return o[i];
};
console.log('interação', await T(() => window.__TDR__.interaction()?.label));
console.log('opções', await opts());
console.log(await choose('^Abastecer'));
console.log(await choose('^Puxar extensão'));
console.log('ligar', await T(() => window.__TDR__.interact()));
await sleep(300);
console.log(await choose('^Acender'));
const st = await T((id) => { const g = window.__TDR__; const s = g.state.structures.get(id); return { fuel: s.fuel, run: s.run, link: s.link, lights: s.lights, powered: g.power.poweredCount }; }, gen[0].id);
console.log('estado', st, await T(() => window.__msgs));
// Zumbis a ~700 px ouvem o motor.
await T((r) => { const g = window.__TDR__; for (let i = 0; i < 4; i++) g.spawnZombie(r.x - 700 - i * 40, r.y + r.h / 2 + (i - 2) * 60); }, home);
await sleep(400);
await p.screenshot({ path: out + '/g-01.png' });
// Entra em casa (luz acesa).
const door = await T(() => { const g = window.__TDR__; const d = g.map.doors.find((d) => d.buildingId === 'abrigo' && d.exterior); g.state.setDoorOpen(d.id, true); return d; });
await T((r) => { const g = window.__TDR__; g.teleport(r.x + r.w / 2, r.y + r.h / 2); }, home);
await sleep(2500);
console.log('zumbis', await T(() => window.__TDR__.zombies.stats().states), 'luz', await T(() => window.__TDR__.scene.lightSources.length), 'escuro', await T(() => window.__TDR__.atmosphere()));
await p.screenshot({ path: out + '/g-02.png' });
await sleep(3000);
await p.screenshot({ path: out + '/g-03.png' });
// Save e volta: gerador continua.
await T(() => window.__TDR__.save());
await T(() => { window.__old = window.__TDR__; window.__TDR__.loadLast(); });
await p.waitForFunction(() => window.__TDR__ && window.__TDR__ !== window.__old, null, { timeout: 30000 });
await sleep(1500);
console.log('depois de carregar', await T(() => { const g = window.__TDR__; return [...g.state.structures.list('gerador')].map((s) => ({ run: s.run, fuel: s.fuel, link: s.link, lights: s.lights })); }));
console.log('erros', errors.slice(0, 8));
await b.close();
