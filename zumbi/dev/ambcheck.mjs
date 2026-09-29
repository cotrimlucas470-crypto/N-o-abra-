// Ambiente no navegador: força chuva/vento/fogo/gerador/motor e mede se os laços tocam de verdade.
// node dev/ambcheck.mjs <base>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const [base] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true })).newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e.stack ?? e).split('\n').slice(0, 4).join(' | ')));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await p.goto(base + '?debug&direto');
await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 90000 });
await p.evaluate(() => { const l = window.__TDR__.scene.game.loop; l.inFocus = true; l.panicMax = 0; });
const T = (fn, a) => p.evaluate(fn, a);
await T(async () => {
  const sc = window.__TDR__.scene;
  const a = sc.s.audio;
  if (a.ctx.state !== 'running') await a.ctx.resume();
  const an = a.ctx.createAnalyser();
  an.fftSize = 2048;
  a.master.connect(an);
  window.__an = an;
});
const rms = () => T(() => { const d = new Float32Array(2048); window.__an.getFloatTimeDomainData(d); let s = 0; for (const x of d) s += x * x; return Math.sqrt(s / d.length); });
const avg = async (ms) => { let s = 0, n = 0; const t0 = Date.now(); while (Date.now() - t0 < ms) { s += await rms(); n++; await sleep(40); } return s / n; };
const force = (st) => T((st) => {
  const sc = window.__TDR__.scene;
  const w = sc.sfx.world;
  const orig = w.__orig ?? (w.__orig = w.ambience);
  w.ambience = () => ({ ...orig(), ...st });
}, st);
const loops = () => T(() => [...window.__TDR__.scene.sfx.amb.loops.entries()].filter(([, v]) => v.alive).map(([k]) => k));
console.log('silêncio base', (await avg(800)).toFixed(4), await loops());
for (const [name, st] of [
  ['temporal lá fora', { rain: 1, sheltered: false, wind: 0.3 }],
  ['temporal dentro', { rain: 1, sheltered: true, wind: 0.3 }],
  ['ventania', { rain: 0, wind: 1, sheltered: false }],
  ['noite de grilos', { rain: 0, wind: 0, minuteOfDay: 1380, temp: 24, winter: 0 }],
  ['fogueira', { rain: 0, wind: 0, minuteOfDay: 600, fires: [{ x: 0, y: 0, power: 1 }] }],
  ['gerador', { fires: [], generators: [{ x: 0, y: 0 }] }],
  ['dirigindo 60 km/h', { generators: [], engine: { kmh: 60, stalled: false } }],
]) {
  await T((st) => {
    const sc = window.__TDR__.scene;
    // fogo/gerador perto do jogador
    for (const k of ['fires', 'generators']) if (st[k]) st[k] = st[k].map((f) => ({ ...f, x: sc.player.x + 120, y: sc.player.y }));
    const w = sc.sfx.world;
    const orig = w.__orig ?? (w.__orig = w.ambience);
    w.ambience = () => ({ ...orig(), rain: 0, wind: 0, thunder: 0, fires: [], generators: [], engine: null, ...st });
  }, st);
  await sleep(2500);
  console.log(name.padEnd(20), 'rms', (await avg(1200)).toFixed(4), await loops());
}
// raio perto: trovão chega depois
await T(() => { const sc = window.__TDR__.scene; sc.s.bus.emit('world:noise', { x: sc.player.x + 1500, y: sc.player.y, radius: 1400, source: 'trovão', kind: 'outro' }); });
const t0 = Date.now();
let first = -1;
while (Date.now() - t0 < 5000) { if ((await rms()) > 0.05 && first < 0) first = Date.now() - t0; await sleep(30); }
console.log('trovão chegou após', first, 'ms');
console.log('memória MB', await T(() => window.__TDR__.scene.s.audio.memoryMb.toFixed(1)));
console.log('erros:', errors.length ? errors : 'nenhum');
await b.close();
