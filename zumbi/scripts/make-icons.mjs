/**
 * Gera os ícones do app (public/icons/*.png) desenhando num canvas do Chromium.
 * Uso: node scripts/make-icons.mjs  (só precisa rodar de novo se mudar o desenho)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}

const OUT = new URL('../public/icons/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const draw = (size, maskable) => `
  const c = document.createElement('canvas'); c.width = c.height = ${size};
  const g = c.getContext('2d'); const S = ${size};
  const pad = ${maskable ? 0 : 0.06} * S; const R = ${maskable ? 0 : 0.2} * S;
  g.beginPath(); g.roundRect(pad, pad, S - 2 * pad, S - 2 * pad, R); g.clip();
  const bg = g.createLinearGradient(0, 0, 0, S); bg.addColorStop(0, '#2a2622'); bg.addColorStop(1, '#0f1013');
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  // sol se pondo
  const sun = g.createRadialGradient(S*0.5, S*0.62, S*0.02, S*0.5, S*0.62, S*0.3);
  sun.addColorStop(0, '#f2c46b'); sun.addColorStop(0.55, '#e0a84a'); sun.addColorStop(1, 'rgba(224,168,74,0)');
  g.fillStyle = sun; g.beginPath(); g.arc(S*0.5, S*0.62, S*0.3, 0, Math.PI*2); g.fill();
  g.fillStyle = '#e0a84a'; g.beginPath(); g.arc(S*0.5, S*0.62, S*0.16, Math.PI, 0); g.fill();
  // horizonte de prédios
  g.fillStyle = '#0c0d10';
  const b = [[0.08,0.5],[0.2,0.44],[0.3,0.56],[0.62,0.47],[0.74,0.52],[0.86,0.42]];
  for (const [x, h] of b) g.fillRect(S*x, S*(0.62 - h*0.32), S*0.11, S*h*0.32 + 1);
  g.fillRect(0, S*0.62, S, S*0.4);
  // poste
  g.strokeStyle = '#0c0d10'; g.lineWidth = S*0.025; g.lineCap = 'round';
  g.beginPath(); g.moveTo(S*0.44, S*0.9); g.lineTo(S*0.44, S*0.36); g.lineTo(S*0.54, S*0.36); g.stroke();
  g.fillStyle = '#f5e7c0'; g.beginPath(); g.arc(S*0.55, S*0.385, S*0.022, 0, Math.PI*2); g.fill();
  c.toDataURL('image/png');
`;

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, maskable] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true]]) {
  const url = await page.evaluate(draw(size, maskable));
  writeFileSync(OUT + name, Buffer.from(url.split(',')[1], 'base64'));
  console.log('ícone', name);
}
await browser.close();
