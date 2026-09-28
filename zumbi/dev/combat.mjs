// Combate recuando: node dev/combat.mjs <base> <saida> [arma|mao] [distância] [fraco]
// Dois zumbis vêm pela esquerda; o jogador anda para a direita (de costas para eles) e aperta Atacar.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const [base, out, weapon = 'facao', gap = '110', frail = ''] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto(base + '?debug&direto');
await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 60000 });
await p.evaluate(() => { const l = window.__TDR__.scene.game.loop; l.inFocus = true; l.panicMax = 0; });
await sleep(1500);
const T = (fn, ...a) => p.evaluate(fn, ...a);
const zs = await T((w) => {
  const t = window.__TDR__;
  const d = t.map.doors.find((d) => d.buildingId === 'abrigo' && d.exterior);
  t.teleport(d.x, d.y + 150);
  if (w.w) {
    t.inventory.add(w.w, 1);
    t.inventory.equipHand(t.inventory.carried, t.inventory.carried.stacks.length - 1);
  }
  const me = t.player();
  const ids = [];
  for (const dy of [-30, 30]) {
    t.spawnZombie(me.x - w.gap, me.y + dy);
    const z = t.zombies.store.all.at(-1);
    z.facing = 0;
    // "fraco": um golpe derruba (para ver a morte no ritmo lento do headless).
    if (w.frail) for (const k of Object.keys(z.parts)) z.parts[k] = 0.08;
    ids.push(z.id);
  }
  return { ids, hand: t.inventory.handDef?.name ?? 'mãos' };
}, { w: weapon === 'mao' ? null : weapon, gap: +gap, frail: frail === 'fraco' });
console.log('arma', zs.hand);
const status = () => T((ids) => {
  const t = window.__TDR__;
  return { hp: Math.round(t.player().health), x: Math.round(t.player().x), zs: ids.map((id) => { const z = t.zombies.store.get(id); return z ? { dead: z.dead, hit: +(t.zombies.now - z.anim.hitAt).toFixed(1), dx: Math.round(z.x - t.player().x) } : null; }) };
}, zs.ids);
await sleep(2500);
console.log('antes', JSON.stringify(await status()));
// Recua para a direita (olhando para +x, de costas) batendo.
let shot = 0;
for (let i = 0; i < 40; i++) {
  // Passo curto para trás (tronco vira para +x, de costas para os zumbis) e golpe.
  await p.keyboard.down('KeyD');
  await sleep(200);
  await p.keyboard.up('KeyD');
  await T(() => window.__TDR__.attack());
  await sleep(250);
  const st = await status();
  if (i % 4 === 0) console.log(i, JSON.stringify(st));
  if (shot < 2 && st.zs.some((z) => z && z.hit < 0.15)) await p.screenshot({ path: `${out}/c-0${++shot}.png` });
  if (st.zs.every((z) => z?.dead)) {
    await sleep(150);
    await p.screenshot({ path: `${out}/c-02.png` });
    break;
  }
}
await sleep(400);
await p.screenshot({ path: out + '/c-03.png' });
console.log('fim', JSON.stringify(await status()));
console.log('erros', errors);
await b.close();
