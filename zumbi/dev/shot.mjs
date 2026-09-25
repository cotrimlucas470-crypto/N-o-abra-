// Print de uma página de desenvolvimento: node dev/shot.mjs <url> <saída.png> [largura] [altura]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}
const [url, out, w, h] = process.argv.slice(2);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: Number(w || 1400), height: Number(h || 1200) } });
p.on('console', (m) => console.log('console:', m.text()));
p.on('pageerror', (e) => console.log('pageerror:', e.message));
await p.goto(url);
await p.waitForFunction(() => window.done === true, null, { timeout: 30000 }).catch((e) => console.log('timeout', e.message));
const clip = process.env.CLIP?.split(',').map(Number);
await p.screenshot(clip ? { path: out, clip: { x: clip[0], y: clip[1], width: clip[2], height: clip[3] } } : { path: out, fullPage: true });
await b.close();
