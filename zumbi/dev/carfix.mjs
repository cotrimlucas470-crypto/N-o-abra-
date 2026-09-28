// Carro no navegador: node dev/carfix.mjs <base> <saida>
// Abre a porta, liga e dirige pelo botão; força um pneu furado e o motor morrendo;
// sai, abre o capô, examina, conserta (peças de motor, remendo) e dirige de novo. Prints em <saida>/c-*.png.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const [base, out] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 })).newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e.stack ?? e)));
await p.goto(base + '?debug&direto');
await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 60000 });
await p.evaluate(() => { const l = window.__TDR__.scene.game.loop; l.inFocus = true; l.panicMax = 0; });
await sleep(1500);
const T = (fn, a) => p.evaluate(fn, a);
await T(() => { window.__feed = []; window.__TDR__.scene.s.bus.on('player:feedback', (e) => window.__feed.push(e.text)); });
const feed = () => T(() => window.__feed.splice(0));
const label = () => T(() => window.__TDR__.interaction()?.label ?? null);
const waitIdle = async () => { for (let i = 0; i < 200; i++) { await sleep(300); if (!(await T(() => window.__TDR__.loop.runner.active))) return; } };
const hideMenu = () => T(() => window.__TDR__.scene.game.scene.getScene('Hud').optionsMenu.hide());
const choose = async (re) => {
  const opts = await T(() => window.__TDR__.options());
  const i = opts.findIndex((o) => new RegExp(re).test(o));
  if (i < 0) return console.log('sem opção', re, JSON.stringify(opts));
  await T((k) => { window.__TDR__.choose(k); window.__TDR__.scene.game.scene.getScene('Hud').optionsMenu.hide(); }, i);
  await waitIdle();
  await sleep(300);
};
// Carro bom mais perto, destrancado, com a chave no contato; ninguém por perto.
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
  for (const d of Object.values(s.doors)) { d.open = false; d.locked = false; delete d.jammed; }
  Object.assign(s, { fuel: 30, engine: 0.9, battery: 0.9, tires: [0.9, 0.9, 0.9, 0.9], body: 0.9, broken: [], keyInside: true, alarm: false, hood: false });
  g.state.vehicles.touch(best.id);
  g.inventory.updateHand(null);
  while (g.inventory.carried.stacks.length) g.inventory.carried.take(0, 999);
  const f = best.flipX ? -1 : 1;
  const c = Math.cos((best.angle * Math.PI) / 180);
  const sn = Math.sin((best.angle * Math.PI) / 180);
  const at = (lx, ly) => ({ x: best.x + lx * f * c - ly * sn, y: best.y + lx * f * sn + ly * c });
  return { id: best.id, door: at(20, -64), hood: at(128, 0) };
});
const zoom = (z) => T((zz) => window.__TDR__.scene.director.setZoom(zz), z);
await zoom(1.6);
await T((c) => window.__TDR__.teleport(c.door.x, c.door.y), car);
await sleep(900);
console.log('1', await label());
await p.screenshot({ path: `${out}/c-1-porta.png` });
await T(() => window.__TDR__.interact());
await sleep(500);
console.log('2', await label());
await T(() => window.__TDR__.interact());
await sleep(700);
console.log('dirigindo', JSON.stringify(await T(() => { const d = window.__TDR__.driving(); return d && { kmh: d.kmh }; })), await feed());
// Anda um pouco (joystick para a frente).
const go = (on) => T((on) => { const g = window.__TDR__; const d = g.driving(); if (!d) return; g.scene.s.touch.move = on ? { x: Math.cos(d.a), y: Math.sin(d.a), magnitude: 1, active: true } : { x: 0, y: 0, magnitude: 0, active: false }; }, on);
await go(true);
await sleep(1500);
await p.screenshot({ path: `${out}/c-2-dirigindo.png` });
// Defeito forçado: um pneu fura e, com o motor fraco, ele morre.
await T(() => { const d = window.__TDR__.scene.drive; d.flat(1); d.st.engine = 0.22; d.rng = () => 0.00002; });
await sleep(1200);
await p.screenshot({ path: `${out}/c-3-defeito.png` });
console.log('defeito', JSON.stringify(await T(() => { const d = window.__TDR__.scene.drive; return { stalled: d.stalled, tires: d.st.tires, engine: d.st.engine }; })), await feed());
await go(false);
for (let i = 0; i < 30; i++) { const d = await T(() => window.__TDR__.driving()); if (Math.abs(d.speed) < 20) break; await sleep(300); }
await T(() => window.__TDR__.exitCar());
await sleep(600);
// O carro andou: pontos da porta e do capô de novo.
const again = await T((id) => {
  const g = window.__TDR__;
  const v = g.state.vehicles.vehicle(id);
  const f = v.flipX ? -1 : 1;
  const c = Math.cos((v.angle * Math.PI) / 180);
  const sn = Math.sin((v.angle * Math.PI) / 180);
  const at = (lx, ly) => ({ x: v.x + lx * f * c - ly * sn, y: v.y + lx * f * sn + ly * c });
  return { door: at(20, -64), hood: at(128, 0) };
}, car.id);
await T((c) => window.__TDR__.teleport(c.door.x, c.door.y), again);
await sleep(500);
console.log('porta', await label());
if (/Abrir/.test((await label()) ?? '')) await T(() => window.__TDR__.interact());
await T((c) => window.__TDR__.teleport(c.hood.x, c.hood.y), again);
await sleep(600);
console.log('capô', await label());
await T(() => window.__TDR__.interact());
await sleep(400);
console.log('capô aberto', await label(), await feed());
await T(() => window.__TDR__.interact());
await sleep(700);
await p.screenshot({ path: `${out}/c-4-examinar.png` });
await T(() => { const g = window.__TDR__; g.scene.game.scene.getScene('Hud').infoCard.hide(); g.inventory.add('chaveInglesa', 1); g.inventory.add('pecasMotor', 3); g.inventory.add('borracha', 1); g.inventory.add('cola', 1); g.inventory.add('velaIgnicao', 2); });
await T(() => window.__TDR__.options());
await sleep(700);
await p.screenshot({ path: `${out}/c-5-opcoes.png` });
await hideMenu();
for (let k = 0; k < 3; k++) {
  const e0 = await T((id) => window.__TDR__.state.vehicles.state(id).engine, car.id);
  if (e0 > 0.4) break;
  await choose('Consertar o motor');
  console.log('motor', JSON.stringify(await T((id) => window.__TDR__.state.vehicles.state(id).engine, car.id)), await feed());
}
await choose('Remendar');
console.log('remendo', JSON.stringify(await T((id) => window.__TDR__.state.vehicles.state(id).tires, car.id)), await feed());
await T(() => window.__TDR__.interact());
await sleep(700);
await p.screenshot({ path: `${out}/c-6-consertado.png` });
await T(() => window.__TDR__.scene.game.scene.getScene('Hud').infoCard.hide());
// Liga de novo pela porta e sai andando.
await T((c) => window.__TDR__.teleport(c.door.x, c.door.y), again);
await sleep(500);
console.log('porta de novo', await label());
for (let k = 0; k < 4 && !(await T(() => !!window.__TDR__.driving())); k++) { await T(() => window.__TDR__.interact()); await sleep(500); }
await go(true);
await sleep(1500);
await p.screenshot({ path: `${out}/c-7-de-novo.png` });
console.log('fim', JSON.stringify(await T(() => { const d = window.__TDR__.driving(); return d && { kmh: d.kmh, engine: d.st.engine, tires: d.st.tires }; })), await feed());
console.log('erros', JSON.stringify(errors));
await b.close();
