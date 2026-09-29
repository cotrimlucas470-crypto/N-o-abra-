// Print do resumo da MORADIA e da PREPARAÇÃO DE EXPEDIÇÃO, deitado e em pé.
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
  await p.goto(base + '?debug&direto');
  await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 90000 });
  await sleep(1500);
  await p.evaluate(() => {
    const sc = window.__TDR__.scene;
    const m = sc.s.session.marks;
    m.setHome(sc.player.x, sc.player.y, 'Casa da esquina');
    m.add(sc.player.x + 2500, sc.player.y - 900, 'Mercado', 'comida');
    sc.s.bus.emit('ui:home', {});
  });
  await sleep(700);
  await p.screenshot({ path: `${out}/moradia-${name}.png` });
  await p.evaluate(() => {
    const sc = window.__TDR__.scene;
    const id = sc.s.session.marks.marks[0].id;
    sc.s.bus.emit('ui:expedition', { target: id });
  });
  await sleep(700);
  await p.screenshot({ path: `${out}/expedicao-${name}.png` });
  console.log(name, 'erros:', errors);
  await p.context().close();
}
await b.close();
