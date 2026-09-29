// Som no navegador: o motor liga, cada som do catálogo toca sem erro, sai sinal de verdade
// (medido num analisador no mestre), passos/porta/golpe chegam pelo jogo, memória e vozes no limite.
// node dev/audiocheck.mjs <base>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const [base] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e.stack ?? e).split('\n').slice(0, 6).join(' | ')));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await p.goto(base + '?debug&direto');
await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 90000 });
await p.evaluate(() => { const l = window.__TDR__.scene.game.loop; l.inFocus = true; l.panicMax = 0; });
await sleep(1500);
await p.touchscreen.tap(420, 60).catch(() => {});
const T = (fn, a) => p.evaluate(fn, a);
console.log('motor:', await T(async () => {
  const sc = window.__TDR__.scene;
  const a = sc.s.audio;
  if (!a) return 'SEM MOTOR';
  if (a.ctx.state !== 'running') await a.ctx.resume();
  // Analisador no mestre: mede se sai som de verdade.
  const an = a.ctx.createAnalyser();
  an.fftSize = 2048;
  a.master.connect(an);
  window.__an = an;
  window.__plays = [];
  const orig = a.play.bind(a);
  a.play = (id, o) => { window.__plays.push(id); return orig(id, o); };
  return { state: a.ctx.state, sr: a.ctx.sampleRate };
}));
const peak = () => T(() => {
  const an = window.__an;
  const d = new Float32Array(an.fftSize);
  let m = 0;
  for (let k = 0; k < 6; k++) { an.getFloatTimeDomainData(d); for (const x of d) m = Math.max(m, Math.abs(x)); }
  return m;
});
const sampled = async (ms) => { let m = 0; const t0 = Date.now(); while (Date.now() - t0 < ms) { m = Math.max(m, await peak()); await sleep(25); } return m; };

// 1) Pelo jogo: passo, porta, golpe, recipiente.
await T(() => {
  const sc = window.__TDR__.scene;
  const { x, y } = sc.player;
  sc.s.bus.emit('player:footstep', { x, y, loudness: 1 });
});
console.log('passo pico', (await sampled(400)).toFixed(3));
await T(() => { const sc = window.__TDR__.scene; sc.s.bus.emit('world:noise', { x: sc.player.x + 120, y: sc.player.y, radius: 260, source: 'porta', sound: 'porta.abrir' }); });
console.log('porta pico', (await sampled(600)).toFixed(3));
await T(() => window.__TDR__.scene.attack());
console.log('golpe pico', (await sampled(500)).toFixed(3));
console.log('tocados pelo jogo:', await T(() => window.__plays.slice()));

// 2) Todos os sons do catálogo, um de cada vez (erro? silêncio? tempo de gerar?).
const ids = await T(() => [...window.__TDR__.scene.s.audio.constructor.name ? [] : []]);
void ids;
const all = await T(async () => {
  const sc = window.__TDR__.scene;
  const mod = await import('/src/game/audio/SoundCatalog.ts');
  return [...mod.SOUNDS.keys()];
});
const silent = [];
const slow = [];
for (const id of all) {
  const ms = await T((id) => { const t0 = performance.now(); window.__TDR__.scene.s.bus.emit('sound:play', { id }); return performance.now() - t0; }, id);
  if (ms > 40) slow.push(`${id} ${ms.toFixed(0)}ms`);
  const m = await sampled(160);
  if (m < 0.01) silent.push(`${id} ${m.toFixed(4)}`);
}
console.log(`catálogo: ${all.length} sons; silenciosos:`, silent, 'lentos (>40 ms):', slow);
// 3) Várias vozes juntas e a fila de variações.
await T(() => { const bus = window.__TDR__.scene.s.bus; for (let i = 0; i < 40; i++) bus.emit('sound:play', { id: 'passo.cascalho.corrida', delay: i * 0.01 }); });
await sleep(300);
console.log('vozes (limite 24):', await T(() => window.__TDR__.scene.s.audio.playing));
await sleep(4000);
console.log('memória MB:', await T(() => window.__TDR__.scene.s.audio.memoryMb.toFixed(2)), 'fila:', await T(() => window.__TDR__.scene.s.audio.queued), 'worker:', await T(() => !!window.__TDR__.scene.s.audio.worker));
// 4) Pausa abaixa tudo.
await T(() => window.__TDR__.scene.s.bus.emit('game:paused', { reason: 'button' }));
await sleep(300);
await T(() => window.__TDR__.scene.s.bus.emit('sound:play', { id: 'tiro.espingarda' }));
console.log('pausado pico', (await sampled(400)).toFixed(4));
await T(() => window.__TDR__.scene.s.bus.emit('game:resumed', {}));
console.log('erros:', errors.length ? errors : 'nenhum');
await b.close();
