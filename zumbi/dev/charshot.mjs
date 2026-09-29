// Print da ficha do personagem e do seletor de sono (deitado e em pé).
// node dev/charshot.mjs <base> <saida>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const [base, out] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [name, vp] of [['deitado', { width: 844, height: 390 }], ['em-pe', { width: 390, height: 844 }]]) {
  const p = await (await b.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(base + '?debug&direto');
  await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 90000 });
  await sleep(1500);
  await p.evaluate(() => {
    const sc = window.__TDR__.scene;
    sc.survivor.health.add('bracoE', 'corte', 0.6);
    sc.survivor.body.thirst = 62;
    sc.s.bus.emit('ui:character', {});
  });
  await sleep(800);
  await p.screenshot({ path: `${out}/ficha-${name}.png` });
  await p.evaluate(() => {
    const sc = window.__TDR__.scene;
    const hud = sc.game.scene.getScenes(true).find((x) => x.sys.settings.key.toLowerCase().includes('hud'));
    hud.character.hide();
    sc.survivor.body.fatigue = 80;
    sc.s.bus.emit('body:sleep', { place: 'cama' });
  });
  await sleep(600);
  await p.screenshot({ path: `${out}/sono-${name}.png` });
  console.log(name, 'erros:', errors);
  await p.context().close();
}
await b.close();
