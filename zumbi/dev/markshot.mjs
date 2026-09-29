// Print do MARCAR LOCAL (segurar o dedo no mapa), deitado e em pé.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const [base, out] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const [name, vp] of [['deitado', { width: 844, height: 390 }], ['em-pe', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  await p.bringToFront();
  const cdp = await ctx.newCDPSession(p);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(base + '?debug&direto');
  await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 90000 });
  await sleep(1500);
  const at = await p.evaluate(() => {
    const sc = window.__TDR__.scene;
    const m = sc.s.session.marks;
    for (let i = -4; i <= 4; i++) m.explore(sc.player.x + i * 300, sc.player.y, 700);
    m.place(sc.player.x + 900, sc.player.y - 300, 'Carro bom', 'carro');
    m.place(sc.player.x - 700, sc.player.y + 400, 'Poço', 'agua');
    sc.s.bus.emit('ui:fullmap', {});
    const hud = sc.game.scene.getScenes(true).find((x) => x.sys.settings.key.toLowerCase().includes('hud'));
    const q = hud.fullMap.toScreen(sc.s.session.player.x, sc.s.session.player.y);
    return { x: q.x + 30, y: q.y + 20 };
  });
  await sleep(500);
  await touch('touchStart', [{ x: at.x, y: at.y, id: 5 }]);
  await sleep(300);
  await p.screenshot({ path: `${out}/segurando-${name}.png` });
  await sleep(600);
  await touch('touchEnd', []);
  await sleep(300);
  await p.screenshot({ path: `${out}/ponto-${name}.png` });
  await p.evaluate(() => {
    const hud = window.__TDR__.scene.game.scene.getScenes(true).find((x) => x.sys.settings.key.toLowerCase().includes('hud'));
    hud.fullMap.actRuns[0]();
  });
  await sleep(400);
  await p.screenshot({ path: `${out}/prompt-${name}.png` });
  await p.click('button[data-cat="moradia"]');
  await p.click('form button[type="submit"]');
  await sleep(400);
  await p.screenshot({ path: `${out}/moradia-marcada-${name}.png` });
  console.log(name, 'erros:', errors, await p.evaluate(() => JSON.stringify(window.__TDR__.scene.s.session.marks.home)));
  await ctx.close();
}
await b.close();
