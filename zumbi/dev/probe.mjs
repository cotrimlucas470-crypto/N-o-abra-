import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const [base, out] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('ERR', String(e)));
await p.goto(base + '?debug&direto');
await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 30000 });
await p.evaluate(() => { const l = window.__TDR__.scene.game.loop; l.inFocus = true; l.panicMax = 0; });
await sleep(1500);
const T = (fn, ...a) => p.evaluate(fn, ...a);
const info = () => T(() => { const s = window.__TDR__.scene.player.sprite; return { vis: s.visible, a: s.alpha, key: s.texture.key, frame: s.frame.name, x: s.x, y: s.y, sx: s.scaleX, depth: s.depth }; });
console.log('antes', await info());
for (let i = 0; i < 3; i++) { await T(() => window.__TDR__.attack()); await sleep(700); console.log('golpe', i, await info()); }
await p.screenshot({ path: out + '/probe.png', clip: { x: 322, y: 145, width: 200, height: 100 } });
await b.close();
