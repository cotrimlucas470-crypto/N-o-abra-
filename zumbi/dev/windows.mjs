// Janela no navegador: node dev/windows.mjs <base> <saida>
// Quebra, pula ida e volta (confere o lado e se cabe), tira os cacos. Prints em <saida>/w-*.png.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const [base, out] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 })).newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
await p.goto(base + '?debug&direto');
await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 60000 });
await p.evaluate(() => { const l = window.__TDR__.scene.game.loop; l.inFocus = true; l.panicMax = 0; });
await sleep(1500);
const T = (fn, a) => p.evaluate(fn, a);
const feed = [];
await T(() => { window.__feed = []; window.__TDR__.scene.s.bus.on('player:feedback', (e) => window.__feed.push(e.text)); });
// Janela térrea perto do início, com lugar livre dos dois lados.
const w = await T(() => {
  const t = window.__TDR__;
  const me = t.player();
  const solids = t.zombies.solids;
  const list = t.map.walls.filter((w) => w.kind === 'window' && t.model.floors.levelAt(w.x, w.y) === 0).map((w) => {
    const v = w.h > w.w;
    const cx = w.x + w.w / 2;
    const cy = w.y + w.h / 2;
    const d = (v ? w.w : w.h) / 2 + 30;
    return { v, cx, cy, d, a: { x: cx - (v ? d : 0), y: cy - (v ? 0 : d) }, b: { x: cx + (v ? d : 0), y: cy + (v ? 0 : d) }, dist: Math.hypot(cx - me.x, cy - me.y) };
  }).filter((o) => solids.free(o.a.x, o.a.y, 16) && solids.free(o.b.x, o.b.y, 16)).sort((x, y) => x.dist - y.dist);
  const o = list[0];
  t.teleport(o.a.x, o.a.y);
  t.scene.player.face(o.v ? 0 : Math.PI / 2);
  return o;
});
console.log('janela', JSON.stringify(w));
const state = () => T(() => ({ me: window.__TDR__.player(), target: window.__TDR__.interaction()?.label ?? null, busy: window.__TDR__.loop.runner.active }));
const waitIdle = async () => { for (let i = 0; i < 40; i++) { await sleep(300); if (!(await T(() => window.__TDR__.loop.runner.active))) return; } };
await sleep(800);
console.log('antes', JSON.stringify(await state()));
await p.screenshot({ path: `${out}/w-1-inteira.png` });
await T(() => window.__TDR__.interact());
await sleep(700);
console.log('quebrou', JSON.stringify(await state()));
await p.screenshot({ path: `${out}/w-2-quebrada.png` });
await T(() => window.__TDR__.interact());
await waitIdle();
await sleep(500);
const s1 = await state();
console.log('pulou', JSON.stringify(s1));
await p.screenshot({ path: `${out}/w-3-pulou.png` });
await T(() => window.__TDR__.interact());
await waitIdle();
await sleep(500);
const s2 = await state();
console.log('voltou', JSON.stringify(s2));
const opts = await T(() => window.__TDR__.options());
console.log('opções', JSON.stringify(opts));
const i = opts.findIndex((o) => /cacos/.test(o));
if (i >= 0) { await T((k) => { window.__TDR__.choose(k); window.__TDR__.scene.game.scene.getScene('Hud').optionsMenu.hide(); }, i); await waitIdle(); }
await sleep(600);
console.log('cacos', JSON.stringify(await state()));
await p.screenshot({ path: `${out}/w-4-sem-cacos.png` });
const side = (me) => (w.v ? Math.sign(me.x - w.cx) : Math.sign(me.y - w.cy));
console.log('lados', side(s1.me), side(s2.me));
console.log('avisos', JSON.stringify(await T(() => window.__feed)));
console.log('erros', errors);
await b.close();
