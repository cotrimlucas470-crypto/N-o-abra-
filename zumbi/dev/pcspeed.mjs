// Velocidade no teclado (PC) com e sem áudio, e o FPS.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const [base] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await page.bringToFront();
await page.goto(base + '?debug&direto');
await page.waitForFunction(() => !!window.__TDR__, null, { timeout: 90000 });
await sleep(2000);
const run = async (label) => {
  const k0 = await page.evaluate(() => window.__TDR__.player());
  await page.keyboard.down('KeyD');
  await sleep(1000);
  await page.keyboard.up('KeyD');
  const k1 = await page.evaluate(() => window.__TDR__.player());
  const fps = await page.evaluate(() => window.__TDR__.scene.game.loop.actualFps);
  console.log(label, Math.round((k1.x - k0.x) / (k1.t - k0.t)), 'px/s · fps', fps.toFixed(1));
  await page.keyboard.down('KeyA');
  await sleep(1000);
  await page.keyboard.up('KeyA');
};
console.log('audio', await page.evaluate(() => window.__TDR__.scene.s.audio?.ctx.state));
await run('com áudio');
await page.evaluate(() => window.__TDR__.scene.s.audio?.ctx.suspend());
await sleep(500);
await run('sem áudio');
await b.close();
