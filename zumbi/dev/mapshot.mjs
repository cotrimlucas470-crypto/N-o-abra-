// Print do minimapa e do mapa completo (com moradia e marcador), deitado e em pé.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const [base, out] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [name, vp] of [['deitado', { width: 844, height: 390 }], ['em-pe', { width: 390, height: 844 }]]) {
  const p = await (await b.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
  await p.bringToFront();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(base + '?direto');
  await p.waitForFunction(() => !!window.__TDR__ || !!window.game, null, { timeout: 90000 }).catch(() => {});
  await sleep(2500);
  await p.screenshot({ path: `${out}/mini-${name}.png` });
  await p.goto(base + '?debug&direto');
  await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 90000 });
  await sleep(1500);
  await p.evaluate(() => {
    const sc = window.__TDR__.scene;
    const m = sc.s.session.marks;
    // Anda pela cidade para ter área explorada.
    for (let i = -6; i <= 6; i++) m.explore(sc.player.x + i * 300, sc.player.y, 700);
    m.setHome(sc.player.x, sc.player.y, 'Moradia · Casa');
    m.add(sc.player.x + 1500, sc.player.y - 400, 'Mercado saqueado', 'comida');
    m.add(sc.player.x - 1200, sc.player.y + 600, 'Muitos zumbis', 'perigo');
    sc.s.bus.emit('ui:fullmap', {});
  });
  await sleep(900);
  await p.screenshot({ path: `${out}/mapa-${name}.png` });
  console.log(name, 'erros:', errors);
  await p.context().close();
}
await b.close();
