// Save antigo → versão nova: node dev/oldsave.mjs <pasta-dist-antiga> <pasta-dist-nova> <saida>
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const [oldDir, newDir, out] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const vite = new URL('../node_modules/vite/bin/vite.js', import.meta.url).pathname;
const serve = async (dir) => {
  const p = spawn(process.execPath, [vite, 'preview', '--outDir', dir, '--port', '5399', '--strictPort'], { stdio: 'pipe', cwd: new URL('..', import.meta.url).pathname });
  await sleep(2500);
  return p;
};
const ctx = await chromium.launchPersistentContext('/tmp/claude-0/oldsave-profile', { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = ctx.pages()[0] ?? (await ctx.newPage());
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack ?? e).split('\n').slice(0, 4).join(' | ')));
// 1) versão antiga: joga e salva
let srv = await serve(oldDir);
await page.goto('http://localhost:5399/?debug&direto');
await page.waitForFunction(() => !!window.__TDR__, null, { timeout: 60000 });
await sleep(2000);
await page.evaluate(() => window.__TDR__.save());
console.log('save antigo', await page.evaluate(() => Object.keys(localStorage)));
srv.kill();
await sleep(800);
// 2) versão nova: CONTINUAR pela tela inicial
srv = await serve(newDir);
errors.length = 0;
await page.goto('http://localhost:5399/?debug');
await sleep(4000);
await page.screenshot({ path: out + '/old-01-titulo.png' });
await page.touchscreen.tap(422, 242);
// Celular: a tela muda de tamanho enquanto o jogo carrega (tela cheia, barra, giro).
for (let i = 0; i < 12; i++) {
  await sleep(250);
  await page.setViewportSize(i % 2 ? { width: 844, height: 390 } : { width: 820, height: 370 });
}
await sleep(9000);
await page.screenshot({ path: out + '/old-02-jogo.png' });
console.log('jogo?', await page.evaluate(() => !!window.__TDR__ && window.__TDR__.player && window.__TDR__.player()));
// muda o tamanho (o erro vinha do ouvinte de viewport)
await page.setViewportSize({ width: 800, height: 380 });
await sleep(2000);
console.log('erros', errors);
srv.kill();
await ctx.close();
