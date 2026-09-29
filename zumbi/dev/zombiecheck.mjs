// Zumbis no navegador: gemidos/rosnados com voz própria, passos arrastados, sem erro.
// node dev/zombiecheck.mjs <base>
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
  window.__plays = [];
  const orig = a.play.bind(a);
  a.play = (id, o) => { window.__plays.push({ id, v: o?.variant, r: o?.rate?.toFixed(2) }); return orig(id, o); };
  // Leva o jogador para a rua e solta zumbis por perto.
  const me = sc.player;
  const g = window.__TDR__;
  if (g.zombiesFrozen?.()) g.toggleZombiesFrozen();
  for (let i = 0; i < 4; i++) sc.debugSpawnZombie(me.x + 180 + i * 40, me.y + 60 - i * 30);
});
await sleep(9000);
const plays = await T(() => window.__plays);
const count = {};
for (const x of plays) count[x.id] = (count[x.id] ?? 0) + 1;
console.log('tocados:', count);
console.log('vozes de zumbi:', plays.filter((x) => x.id.startsWith('zumbi.') && x.id !== 'zumbi.passo').slice(0, 8));
console.log('erros:', errors.length ? errors : 'nenhum');
await b.close();
