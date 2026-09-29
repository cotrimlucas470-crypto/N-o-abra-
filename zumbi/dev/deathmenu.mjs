// Morrer → MENU → jogo novo, e morrer → CARREGAR ÚLTIMO SAVE: nenhum erro no console.
// node dev/deathmenu.mjs <base> <saida>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const [base, out] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e.stack ?? e).split('\n').slice(0, 6).join(' | ')));
p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await p.goto(base + '?debug&direto');
await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 90000 });
await p.evaluate(() => { const l = window.__TDR__.scene.game.loop; l.inFocus = true; l.panicMax = 0; });
await sleep(1500);
const T = (fn, a) => p.evaluate(fn, a);
const kill = () => T(() => { const sc = window.__TDR__.scene; if (!sc.dead) sc.die(); });
const hudBtn = (label) => T((label) => {
  const g = window.__TDR__.scene.game;
  const hud = g.scene.getScene('hud') ?? g.scene.scenes.find((s) => s.sys.settings.key.toLowerCase().includes('hud'));
  // Só botão visível (a pausa também tem um MENU, escondido).
  const vis = (o) => { for (let q = o; q; q = q.parentContainer) if (!q.visible) return false; return true; };
  const btn = hud.children.list.flatMap((o) => (o.list ? o.list : [o])).find((o) => o.label?.text === label && vis(o));
  if (!btn) return 'sem botão visível ' + label;
  btn.emit('pointerdown', { x: 0, y: 0 });
  btn.emit('pointerup', { x: 0, y: 0 });
  return 'ok';
}, label);
// 1) salva, recarrega a página (a tela de morte decide o botão CARREGAR ao abrir), morre, carrega o último save
await T(() => window.__TDR__.save());
await p.goto(base + '?debug&direto');
await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 90000 });
await p.evaluate(() => { const l = window.__TDR__.scene.game.loop; l.inFocus = true; l.panicMax = 0; });
await sleep(2000);
await kill();
await sleep(3500);
console.log('morto?', await T(() => window.__TDR__.dead()));
await p.screenshot({ path: `${out}/1-morte.png` });
const before = await T(() => window.__TDR__.scene.sys.settings.key + ':' + window.__TDR__.clock.minutes);
await T(() => { window.__old = window.__TDR__; });
console.log('carregar:', await hudBtn('CARREGAR ÚLTIMO SAVE'));
await p.waitForFunction(() => window.__TDR__ !== window.__old, null, { timeout: 90000 }).catch(() => console.log('cena não recriou'));
await sleep(5000);
console.log('vivo de novo?', await T(() => ({ novo: window.__TDR__ !== window.__old, mesmaCena: window.__TDR__.scene === window.__old.scene, dead: window.__TDR__.dead(), sceneDead: window.__TDR__.scene.dead, ativo: window.__TDR__.scene.sys.isActive() })));
await p.screenshot({ path: `${out}/2-carregado.png` });
// 2) morre de novo e vai ao MENU
await kill();
await sleep(5000);
console.log('menu:', await hudBtn('MENU'));
await sleep(4000);
await p.screenshot({ path: `${out}/3-menu.png` });
const scenes = await T(() => window.__TDR__.scene.game.scene.getScenes(true).map((s) => s.sys.settings.key));
console.log('cenas ativas', scenes);
// 3) jogo novo a partir do título
const title = await T(() => {
  const g = window.__TDR__.scene.game;
  const t = g.scene.getScenes(true).find((s) => s.sys.settings.key.toLowerCase().includes('title'));
  if (!t) return 'sem título';
  // Botão = objeto com rótulo (UiButton); o texto de dentro não conta.
  const all = [];
  const walk = (o) => { all.push(o); for (const c of o.list ?? []) walk(c); };
  t.children.list.forEach(walk);
  const btn = all.find((o) => /^(JOGAR|CONTINUAR)$/.test(o.label?.text ?? '') && o.visible);
  if (!btn) return 'sem botão no título: ' + t.children.list.map((o) => o.label?.text ?? o.text).filter(Boolean).join(',');
  const g2 = window.__TDR__.scene.game;
  const origStart = t.scene.start.bind(t.scene);
  window.__startCalls = [];
  t.scene.start = (k, d) => { window.__startCalls.push(k); return origStart(k, d); };
  btn.emit('pointerdown', { x: 0, y: 0 });
  btn.emit('pointerup', { x: 0, y: 0 });
  return 'ok ' + (btn.label?.text ?? btn.text) + ' pressed=' + btn.pressed + ' calls=' + JSON.stringify(window.__startCalls) + ' vis=' + btn.visible + ' input=' + !!btn.input?.enabled;
});
console.log('título:', title);
await sleep(3000);
console.log('estado', await T(() => { const g = window.__TDR__.scene.game; return { frame: g.loop.frame, game: g.scene.getScene('Game')?.sys.settings.status, title: g.scene.getScene('Title')?.sys.settings.status, queue: g.scene._queue?.length, pending: g.scene._pending?.length, processing: g.scene.isProcessing }; }));
await p.waitForFunction(() => window.__TDR__.scene.game.scene.getScenes(true).some((s) => s.sys.settings.key === 'Game'), null, { timeout: 90000 }).catch(() => console.log('jogo não abriu'));
console.log('estado', await T(() => { const g = window.__TDR__.scene.game; return { frame: g.loop.frame, game: g.scene.getScene('Game')?.sys.settings.status, title: g.scene.getScene('Title')?.sys.settings.status }; }));
await sleep(6000);
await p.screenshot({ path: `${out}/4-novo.png` });
console.log('cenas ativas', await T(() => window.__TDR__.scene.game.scene.getScenes(true).map((s) => s.sys.settings.key)));
console.log('ERROS', errors.length);
for (const e of errors.slice(0, 8)) console.log(' -', e);
await b.close();
