/**
 * Teste de fumaça no navegador (Chromium headless, celular simulado).
 * Uso: npm run build && npm run smoke
 * Salva prints em ./smoke-out/ e falha (exit 1) se algo quebrar.
 *
 * Verifica: abre sem erros, título -> jogo, joystick move o personagem,
 * colisão com parede, correr gasta fôlego, mira gira o tronco, pausa,
 * retrato/paisagem e teclado no PC.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}

const PORT = 4179;
const BASE = `http://localhost:${PORT}/`;
const OUT = new URL('../smoke-out/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const viteBin = new URL('../node_modules/vite/bin/vite.js', import.meta.url).pathname;
const server = spawn(process.execPath, [viteBin, 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
server.stderr.on('data', (d) => process.stderr.write(d));
process.on('exit', () => server.kill());
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('preview não subiu')), 15000);
  server.stdout.on('data', (d) => {
    if (String(d).includes(String(PORT))) {
      clearTimeout(t);
      resolve();
    }
  });
});

const failures = [];
const check = (ok, msg) => {
  console.log(`${ok ? '  ok ' : ' FALHOU'}  ${msg}`);
  if (!ok) failures.push(msg);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

async function mobilePage(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.bringToFront();
  const cdp = await ctx.newCDPSession(page);
  const touch = async (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  return { ctx, page, errors, touch };
}

async function waitGame(page) {
  await page.waitForFunction(() => !!window.__TDR__, null, { timeout: 20000 });
  // Headless roda a poucos FPS e sem foco de janela; o Phaser então limita o delta
  // ("câmera lenta" de proteção). Desliga essa proteção para medir em tempo real —
  // e, de quebra, testar a física com FPS baixo (passos fixos de 1/120 s).
  await page.evaluate(() => {
    const loop = window.__TDR__.scene.game.loop;
    loop.inFocus = true;
    loop.panicMax = 0;
    loop._coolDown = 0;
    // As checagens de movimento/porta/itens não são sobre zumbis: IA parada até a
    // seção deles (a poucos FPS o jogador não reage e morreria no meio do teste).
    if (window.__TDR__.zombies) window.__TDR__.zombies.frozen = true;
  });
  await sleep(700);
}
const pos = (page) => page.evaluate(() => window.__TDR__.player());

try {
  // ---------------------------------------------------------------- celular deitado
  {
    const { ctx, page, errors, touch } = await mobilePage(844, 390);
    await page.goto(BASE + '?debug');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: OUT + '01-titulo.png' });
    // toca em JOGAR (centro, ~58% da altura)
    await touch('touchStart', [{ x: 422, y: 242, id: 1 }]);
    await sleep(80);
    await touch('touchEnd', []);
    await waitGame(page);
    await sleep(900);
    await page.screenshot({ path: OUT + '02-abrigo.png' });

    // setor inicial fica no centro da cidade: coordenadas do teste são relativas a ele
    const S = await page.evaluate(() => window.__TDR__.map.regions.find((r) => r.id === 'setor-1').rect);
    const at = (tx, ty) => [S.x + tx * 64, S.y + ty * 64];
    const p0 = await pos(page);
    const scale = Math.max(0.78, Math.min(1.35, 390 / 400));
    const tap = async (x, y, id = 9) => {
      await touch('touchStart', [{ x, y, id }]);
      await sleep(70);
      await touch('touchEnd', []);
      await sleep(250);
    };
    // A porta do abrigo começa fechada: anda até ela e esbarra.
    const door = await page.evaluate(() => window.__TDR__.map.doors.find((d) => d.buildingId === 'abrigo' && d.exterior));
    const doorOpen = () => page.evaluate((id) => window.__TDR__.state.doorState(id).open, door.id);
    check(!(await doorOpen()), 'porta do abrigo começa fechada');
    await touch('touchStart', [{ x: 130, y: 250, id: 1 }]);
    await touch('touchMove', [{ x: 130, y: 310, id: 1 }]);
    await sleep(1500);
    await touch('touchEnd', []);
    const pd = await pos(page);
    check(pd.y < door.y - 7 - 12, `porta fechada segura o jogador (y=${Math.round(pd.y)}, porta em ${Math.round(door.y)})`);
    await sleep(300);
    const tgt = await page.evaluate(() => window.__TDR__.interaction());
    check(tgt?.kind === 'door' && tgt?.verb === 'ABRIR', `perto da porta o alvo é ABRIR (${tgt?.label})`);
    await page.screenshot({ path: OUT + '02b-porta-fechada.png' });
    // botão Interagir: âncora inferior direita (250, 168) * escala
    await tap(844 - 250 * scale, 390 - 168 * scale);
    await sleep(400);
    check(await doorOpen(), 'botão Interagir abre a porta');
    const noNav = await page.evaluate((d) => {
      const nav = window.__TDR__.model.nav;
      const c = nav.cellOf(d.x, d.y);
      return nav.isBlocked(c.cx, c.cy);
    }, door);
    check(!noNav, 'porta aberta libera a grade de navegação');
    await page.screenshot({ path: OUT + '02c-porta-aberta.png' });

    // joystick esquerdo: toca e arrasta para BAIXO (sai pela porta do abrigo)
    await touch('touchStart', [{ x: 130, y: 250, id: 1 }]);
    for (let i = 1; i <= 6; i++) {
      await touch('touchMove', [{ x: 130, y: 250 + i * 10, id: 1 }]);
      await sleep(16);
    }
    await sleep(500);
    const pa = await pos(page); // já acelerado
    await sleep(900);
    const p1 = await pos(page);
    // velocidades no tempo DO JOGO (soma dos deltas da física)
    const walk = (p1.y - pa.y) / (p1.t - pa.t);
    check(walk > 150 && walk < 200, `joystick anda na velocidade certa (${Math.round(walk)} px/s, alvo ~178)`);
    check(p1.y - p0.y > 150, `saiu do abrigo pela porta (dy=${Math.round(p1.y - p0.y)})`);
    check(Math.abs(p1.x - p0.x) < 40, `movimento reto não desvia (dx=${Math.round(p1.x - p0.x)})`);
    await page.screenshot({ path: OUT + '03-saindo.png' });

    // segundo dedo: mira à direita, enquanto anda
    await touch('touchMove', [{ x: 130, y: 310, id: 1 }, { x: 700, y: 250, id: 2 }]);
    for (let i = 1; i <= 5; i++) {
      await touch('touchMove', [{ x: 130, y: 310, id: 1 }, { x: 700 + i * 12, y: 250 - i * 4, id: 2 }]);
      await sleep(16);
    }
    await sleep(500);
    await page.screenshot({ path: OUT + '04-mirando.png' });
    const rot = await page.evaluate(() => window.__TDR__.scene.children.list.find((o) => o.body && o.body.isCircle && o.body.moves)?.rotation ?? null);
    check(rot !== null && Math.abs(rot - -0.3) < 0.35, `tronco gira para a mira (rot=${rot?.toFixed(2)})`);
    await touch('touchEnd', []);
    await sleep(300);

    // correr: vai para a avenida, liga o botão Correr e anda para a direita
    await page.evaluate(([x, y]) => window.__TDR__.teleport(x, y), at(8, 29));
    await sleep(200);
    // botão correr: âncora inferior direita (262, 70) * escala
    const sx = 844 - 262 * scale;
    const sy = 390 - 70 * scale;
    // 1) toca no botão Correr (liga), 2) segura o joystick para a direita
    await touch('touchStart', [{ x: sx, y: sy, id: 3 }]);
    await sleep(60);
    await touch('touchEnd', []);
    await sleep(60);
    await touch('touchStart', [{ x: 130, y: 250, id: 1 }]);
    await touch('touchMove', [{ x: 200, y: 250, id: 1 }]);
    await sleep(500);
    const s0 = await pos(page);
    await sleep(900);
    const s1 = await pos(page);
    await page.screenshot({ path: OUT + '05-correndo.png' });
    await touch('touchEnd', []);
    const speed = (s1.x - s0.x) / (s1.t - s0.t);
    check(s1.stamina < 97, `correr gasta fôlego (fôlego=${Math.round(s1.stamina)})`);
    check(speed > 270, `correndo é mais rápido que andando (${Math.round(speed)} px/s, alvo 300)`);

    // colisão: encosta na parede sul do mercadinho por dentro e empurra
    const store = await page.evaluate(() => window.__TDR__.map.buildings.find((b) => b.id === 'mercadinho').bounds);
    await page.evaluate(([x, y]) => window.__TDR__.teleport(x, y), [store.x + 5 * 64, store.y + store.h - 60]);
    await sleep(200);
    await touch('touchStart', [{ x: 130, y: 250, id: 1 }]);
    await touch('touchMove', [{ x: 130, y: 330, id: 1 }]);
    await sleep(1200);
    const c1 = await pos(page);
    await touch('touchEnd', []);
    check(c1.y < store.y + store.h - 10, `parede segura o jogador (y=${Math.round(c1.y)} < ${Math.round(store.y + store.h - 10)})`);
    const inside = await page.evaluate(([x, y]) => window.__TDR__.buildingAt(x, y), [c1.x, c1.y]);
    // O nome do prédio é sorteado (Mercadinho, Mercearia, Empório...): vale o do mapa.
    const storeName = await page.evaluate(() => window.__TDR__.map.buildings.find((b) => b.id === 'mercadinho').name);
    check(inside === storeName, `detecta interior (${inside})`);
    await sleep(500);
    await page.screenshot({ path: OUT + '06-mercadinho.png' });

    // itens: pega o martelo da bancada do abrigo, abre o inventário e larga
    const hammer = await page.evaluate(() => window.__TDR__.map.items.find((i) => i.defId === 'martelo'));
    await page.evaluate(([x, y]) => window.__TDR__.teleport(x, y), [hammer.x + 10, hammer.y - 40]);
    // Headless lento: espera a varredura de interação rodar (até 3 s) em vez de um tempo fixo.
    await page.waitForFunction(() => window.__TDR__.interaction()?.kind === 'item', null, { timeout: 3000 }).catch(() => undefined);
    const itemTarget = await page.evaluate(() => window.__TDR__.interaction());
    check(itemTarget?.kind === 'item' && itemTarget.label === 'Pegar Martelo', `alvo é o item (${itemTarget?.label})`);
    const itemsBefore = await page.evaluate(() => window.__TDR__.state.itemCount);
    await tap(844 - 250 * scale, 390 - 168 * scale);
    await sleep(300);
    const carried = await page.evaluate(() => window.__TDR__.inventory.carried.countOf('martelo'));
    check(carried === 1, `Interagir pega o item (${carried} martelo)`);
    check((await page.evaluate(() => window.__TDR__.state.itemCount)) === itemsBefore - 1, 'item saiu do chão');
    // botão Inventário: âncora inferior direita (46, 246)
    await tap(844 - 46 * scale, 390 - 246 * scale);
    await sleep(300);
    const hud = () => page.evaluate(() => {
      const h = window.__TDR__.scene.scene.get('Hud');
      const inv = h.inventory;
      return { open: inv.isOpen, box: inv.box, row0: inv.rowCenter('inv', 0), drop: inv.buttonAt('LARGAR') };
    });
    let panel = await hud();
    check(panel.open, 'botão Inventário abre o painel');
    await tap(panel.row0.x, panel.row0.y); // primeira linha (o martelo)
    await sleep(200);
    panel = await hud();
    await page.screenshot({ path: OUT + '06b-inventario.png' });
    check(!!panel.drop, 'tocar no item mostra LARGAR');
    await tap(panel.drop.x, panel.drop.y);
    await sleep(300);
    const afterDrop = await page.evaluate(() => ({ n: window.__TDR__.inventory.carried.countOf('martelo'), items: window.__TDR__.state.itemCount }));
    check(afterDrop.n === 0 && afterDrop.items === itemsBefore, `LARGAR devolve o item ao chão (${afterDrop.n} no bolso, ${afterDrop.items} no mundo)`);
    // Chão aberto (a planta da loja é sorteada e pode ter móvel logo ao lado): anda na rua.
    await page.evaluate(([x, y]) => window.__TDR__.teleport(x, y), at(20, 29));
    await sleep(300);
    const moved = await pos(page);
    await touch('touchStart', [{ x: 130, y: 250, id: 1 }]);
    await touch('touchMove', [{ x: 190, y: 250, id: 1 }]);
    await sleep(500);
    await touch('touchEnd', []);
    const moved2 = await pos(page);
    check(Math.abs(moved2.x - moved.x) > 30, `dá para andar com o inventário aberto (dx=${Math.round(moved2.x - moved.x)})`);
    await tap(844 - 46 * scale, 390 - 246 * scale);
    check(!(await hud()).open, 'botão Inventário fecha o painel');

    // loot: abre a geladeira da casa vizinha, pega tudo e confere que não volta
    const fridge = await page.evaluate(() => {
      const T = window.__TDR__;
      const b = T.map.buildings.find((x) => x.id === 'casa-no');
      const f = T.map.props.find((p) => p.type === 'fridge' && p.x > b.bounds.x && p.x < b.bounds.x + b.bounds.w && p.y > b.bounds.y && p.y < b.bounds.y + b.bounds.h);
      return { id: f.id, x: f.x, y: f.y };
    });
    // chega pela frente (lado da cozinha): tenta alguns pontos até a geladeira ser o alvo
    let fridgeTarget = null;
    for (const [dx, dy] of [[-58, 0], [-50, 30], [-50, -30], [0, 58], [0, -58]]) {
      await page.evaluate(([x, y]) => window.__TDR__.teleport(x, y), [fridge.x + dx, fridge.y + dy]);
      await sleep(350);
      fridgeTarget = await page.evaluate(() => window.__TDR__.interaction());
      if (fridgeTarget?.key === `recipiente:${fridge.id}`) break;
    }
    check(fridgeTarget?.kind === 'container', `geladeira vira alvo (${fridgeTarget?.label})`);
    await tap(844 - 250 * scale, 390 - 168 * scale); // Interagir = abrir
    await sleep(500);
    const lootInfo = await page.evaluate(() => {
      const T = window.__TDR__;
      const open = T.scene.s.session.openContainer;
      const inv = T.scene.scene.get('Hud').inventory;
      return { open: !!open, n: open ? open.container.stacks.length : -1, panel: inv.isOpen, all: inv.buttonAt('PEGAR TUDO') };
    });
    check(lootInfo.open && lootInfo.panel, `abrir mostra o painel de saque (${lootInfo.n} pilhas na geladeira)`);
    await page.screenshot({ path: OUT + '06c-saque.png' });
    if (lootInfo.all) {
      await tap(lootInfo.all.x, lootInfo.all.y);
      await sleep(400);
    }
    const afterLoot = await page.evaluate((id) => ({ left: window.__TDR__.state.loot.peek(id).stacks.length, carried: window.__TDR__.inventory.carried.stacks.length }), fridge.id);
    check(lootInfo.n === 0 || afterLoot.left < lootInfo.n, `PEGAR TUDO tira da geladeira (${lootInfo.n} → ${afterLoot.left})`);
    await page.screenshot({ path: OUT + '06d-saque-pego.png' });
    // fecha o painel e colhe numa frutífera
    await tap(844 - 46 * scale, 390 - 246 * scale);
    const tree = await page.evaluate(() => {
      const T = window.__TDR__;
      const t = T.map.props.find((p) => ['treeOrange', 'treeMango', 'treeLemon', 'treeBanana', 'treeGuava'].includes(p.type));
      return t ? { x: t.x, y: t.y, type: t.type } : null;
    });
    check(!!tree, 'há frutíferas no mapa');
    if (tree) {
      let harvest = null;
      for (const [dx, dy] of [[45, 0], [-45, 0], [0, 45], [0, -45]]) {
        await page.evaluate(([x, y]) => window.__TDR__.teleport(x, y), [tree.x + dx, tree.y + dy]);
        await sleep(400);
        harvest = await page.evaluate(() => window.__TDR__.interaction());
        if (harvest?.kind === 'harvest') break;
      }
      check(harvest?.kind === 'harvest', `frutífera vira alvo (${harvest?.label})`);
      await page.screenshot({ path: OUT + '06e-frutifera.png' });
      const before = await page.evaluate(() => window.__TDR__.inventory.weight);
      await tap(844 - 250 * scale, 390 - 168 * scale);
      await sleep(300);
      const after = await page.evaluate(() => window.__TDR__.inventory.weight);
      check(after > before, `COLHER põe frutas no inventário (${before.toFixed(2)} → ${after.toFixed(2)} kg)`);
    }

    // pausa (canto superior direito)
    const pscale = scale;
    await touch('touchStart', [{ x: 844 - 34 * pscale, y: 34 * pscale, id: 4 }]);
    await sleep(60);
    await touch('touchEnd', []);
    // Pausar também salva o jogo: espera o quadro (headless é lento).
    const paused = await page.waitForFunction(() => window.__TDR__.scene.scene.isPaused(), null, { timeout: 3000 }).then(() => true, () => false);
    check(paused, 'botão de pausa pausa o jogo');
    const somLabel = await page.evaluate(() => {
      const hud = window.__TDR__.scene.game.scene.getScenes(true).find((x) => x.sys.settings.key.toLowerCase().includes('hud'));
      const vis = (o) => { for (let q = o; q; q = q.parentContainer) if (!q.visible) return false; return true; };
      return hud?.children.list.flatMap((o) => (o.list ? o.list : [o])).find((o) => o.label?.text?.startsWith('SOM') && vis(o))?.label.text ?? null;
    });
    check(!!somLabel, `pausa tem o botão SOM (${somLabel})`);
    await page.screenshot({ path: OUT + '07-pausa.png' });
    await touch('touchStart', [{ x: 422, y: 234, id: 5 }]);
    await sleep(60);
    await touch('touchEnd', []);
    const resumed = await page.waitForFunction(() => !window.__TDR__.scene.scene.isPaused(), null, { timeout: 3000 }).then(() => true, () => false);
    check(resumed, 'CONTINUAR volta ao jogo');

    // Sono: deitar abre o seletor de horas; escolher 3 h dorme e acorda sozinho.
    await page.evaluate(() => {
      const sc = window.__TDR__.scene;
      sc.survivor.body.fatigue = 80;
      sc.s.bus.emit('body:sleep', { place: 'chao' });
    });
    await sleep(400);
    const picker = await page.evaluate(() => {
      const hud = window.__TDR__.scene.game.scene.getScenes(true).find((x) => x.sys.settings.key.toLowerCase().includes('hud'));
      const vis = (o) => { for (let q = o; q; q = q.parentContainer) if (!q.visible) return false; return true; };
      const btn = hud.children.list.flatMap((o) => (o.list ? o.list : [o])).find((o) => o.label?.text?.startsWith('3 h') && vis(o));
      if (!btn) return null;
      const label = btn.label.text;
      btn.emit('pointerdown', { x: 0, y: 0 });
      btn.emit('pointerup', { x: 0, y: 0 });
      return label;
    });
    check(!!picker, `deitar abre o seletor de horas (${picker})`);
    const slept = await page.waitForFunction(() => window.__TDR__.scene.loop.sleeping, null, { timeout: 3000 }).then(() => true, () => false);
    check(slept, 'escolher 3 h começa a dormir');
    await page.screenshot({ path: OUT + '07b-dormindo.png' });
    const woke = await page.waitForFunction(() => !window.__TDR__.scene.loop.sleeping, null, { timeout: 20000 }).then(() => true, () => false);
    const fat = await page.evaluate(() => window.__TDR__.scene.survivor.body.fatigue);
    check(woke && fat < 76, `acorda depois das horas escolhidas, descansado em parte (cansaço ${Math.round(fat)})`);

    // Ficha do personagem, minimapa e mapa: definir moradia tocando no mapa.
    const hudBtn = (label) => page.evaluate((label) => {
      const hud = window.__TDR__.scene.game.scene.getScenes(true).find((x) => x.sys.settings.key.toLowerCase().includes('hud'));
      const vis = (o) => { for (let q = o; q; q = q.parentContainer) if (!q.visible) return false; return true; };
      const btn = hud.children.list.flatMap((o) => (o.list ? o.list : [o])).find((o) => o.label?.text === label && vis(o));
      if (!btn) return false;
      btn.emit('pointerdown', { x: 0, y: 0 });
      btn.emit('pointerup', { x: 0, y: 0 });
      return true;
    }, label);
    await page.evaluate(() => window.__TDR__.scene.s.bus.emit('ui:character', {}));
    await sleep(500);
    const ficha = await page.evaluate(() => window.__TDR__.scene.game.scene.getScenes(true).find((x) => x.sys.settings.key.toLowerCase().includes('hud')).character.isOpen);
    check(ficha, 'ficha do personagem abre');
    await page.screenshot({ path: OUT + '07c-ficha.png' });
    await page.evaluate(() => window.__TDR__.scene.game.scene.getScenes(true).find((x) => x.sys.settings.key.toLowerCase().includes('hud')).character.hide());
    const mini = await page.evaluate(() => window.__TDR__.scene.game.scene.getScenes(true).find((x) => x.sys.settings.key.toLowerCase().includes('hud')).minimap.ready);
    check(mini, 'minimapa aparece na tela');
    // Tirar e pôr o minimapa quando quiser (fica gravado).
    const hiddenNow = await page.evaluate(() => { const m = (window.__hudOf ??= () => window.__TDR__.scene.game.scene.getScenes(true).find((x) => x.sys.settings.key.toLowerCase().includes('hud')).minimap)(); m.setShown(false); return { img: m.img.visible, saved: localStorage.getItem('tdr.ui.minimap') }; });
    await page.evaluate(() => window.__hudOf().setShown(true));
    await sleep(500);
    const shownNow = await page.evaluate(() => { const m = window.__hudOf(); return { img: m.img.visible, shown: m.shown, saved: localStorage.getItem('tdr.ui.minimap') }; });
    check(!hiddenNow.img && hiddenNow.saved === 'false' && shownNow.img && shownNow.shown && shownNow.saved === 'true', `minimapa some e volta pelo botão (${JSON.stringify({ hiddenNow, shownNow })})`);
    // O mapa começa sem nenhuma marcação do jogo (nada de base pronta).
    const clean = await page.evaluate(() => { const m = window.__TDR__.scene.s.session.marks; return !m.home && m.marks.length === 0; });
    check(clean, 'mapa começa sem moradia nem marcadores pré-definidos');
    const at0 = await page.evaluate(() => {
      const sc = window.__TDR__.scene;
      sc.s.bus.emit('ui:fullmap', {});
      const hud = sc.game.scene.getScenes(true).find((x) => x.sys.settings.key.toLowerCase().includes('hud'));
      const p = hud.fullMap.toScreen(sc.s.session.player.x, sc.s.session.player.y);
      return { x: p.x + 6, y: p.y + 4 };
    });
    await sleep(400);
    // Tocar e SEGURAR o dedo num lugar já visto → MARCAR LOCAL.
    await touch('touchStart', [{ x: at0.x, y: at0.y, id: 31 }]);
    await sleep(900);
    await touch('touchEnd', []);
    await sleep(300);
    check(await hudBtn('MARCAR LOCAL'), 'mapa: segurar o dedo num ponto oferece MARCAR LOCAL');
    await sleep(300);
    const chips = await page.evaluate(() => [...document.querySelectorAll('button[data-cat]')].map((b) => b.textContent));
    check(chips.length === 5 && chips.some((c) => c.includes('Moradia')) && chips.some((c) => c.includes('Água')), `MARCAR LOCAL: nome e categoria (${chips.join(' ')})`);
    await page.click('button[data-cat="moradia"]');
    await page.fill('form input', 'Casa da esquina');
    await page.screenshot({ path: OUT + '07d0-marcar.png' });
    await page.click('form button[type="submit"]');
    await sleep(300);
    const home = await page.evaluate(() => { const m = window.__TDR__.scene.s.session.marks; return m.home ? { name: m.home.name, target: m.target } : null; });
    check(!!home && home.name === 'Casa da esquina' && home.target === 0, `moradia marcada pelo jogador e guiando até ela (${home?.name})`);
    await page.screenshot({ path: OUT + '07d-mapa.png' });
    // Resumo da moradia (botão MORADIA ao tocar nela) e preparação de expedição até um marcador.
    await page.evaluate(() => {
      const sc = window.__TDR__.scene;
      const hud = sc.game.scene.getScenes(true).find((x) => x.sys.settings.key.toLowerCase().includes('hud'));
      const h = sc.s.session.marks.home;
      hud.fullMap.select({ x: h.x, y: h.y });
    });
    await sleep(300);
    check(await hudBtn('MORADIA'), 'mapa: moradia tem o botão MORADIA (resumo)');
    await sleep(400);
    const card = await page.evaluate(() => {
      const hud = window.__TDR__.scene.game.scene.getScenes(true).find((x) => x.sys.settings.key.toLowerCase().includes('hud'));
      return { open: hud.card.isOpen, title: hud.card.data?.title ?? '', rows: hud.card.data?.rows.length ?? 0 };
    });
    check(card.open && /MORADIA/.test(card.title) && card.rows >= 8, `resumo da moradia abre (${card.rows} linhas)`);
    await page.screenshot({ path: OUT + '07e-moradia.png' });
    const exp = await page.evaluate(() => {
      const sc = window.__TDR__.scene;
      const hud = sc.game.scene.getScenes(true).find((x) => x.sys.settings.key.toLowerCase().includes('hud'));
      hud.card.close();
      const m = sc.s.session.marks.add(sc.player.x + 1800, sc.player.y + 300, 'Poço', 'agua');
      sc.s.bus.emit('ui:expedition', { target: m.id });
      const d = hud.card.data;
      return { open: hud.card.isOpen, title: d?.title ?? '', labels: d?.rows.map((r) => r.label) ?? [] };
    });
    check(exp.open && exp.title === 'PREPARAR EXPEDIÇÃO' && ['Distância', 'Tempo', 'Água', 'Comida', 'Energia', 'Peso', 'Munição', 'Temperatura', 'Condições'].every((l) => exp.labels.includes(l)), 'preparar expedição: distância, tempo, água, comida, energia, peso, munição, temperatura e condições');
    await page.screenshot({ path: OUT + '07f-expedicao.png' });
    await page.evaluate(() => {
      const hud = window.__TDR__.scene.game.scene.getScenes(true).find((x) => x.sys.settings.key.toLowerCase().includes('hud'));
      hud.card.close();
      hud.fullMap.hide();
    });

    // visão geral da rua
    await page.evaluate(([x, y]) => window.__TDR__.teleport(x, y), at(37, 29));
    await sleep(900);
    await page.screenshot({ path: OUT + '08-cruzamento.png' });
    await page.evaluate(([x, y]) => window.__TDR__.teleport(x, y), at(50, 12));
    await sleep(900);
    await page.screenshot({ path: OUT + '09-praca.png' });
    await page.evaluate(([x, y]) => window.__TDR__.teleport(x, y), at(16, 38.5));
    await sleep(900);
    await page.screenshot({ path: OUT + '10-estacionamento.png' });

    // outros setores da cidade: teleporta, confere que o mundo foi carregado lá e não há erros
    const regions = await page.evaluate(() => window.__TDR__.map.regions.filter((r) => r.id !== 'setor-1').map((r) => ({ id: r.id, name: r.name, rect: r.rect })));
    let shot = 0;
    for (const r of regions.slice(0, 8)) {
      await page.evaluate(([x, y]) => window.__TDR__.teleport(x, y), [r.rect.x + 37 * 64, r.rect.y + 22.5 * 64]);
      await sleep(700);
      const w = await page.evaluate(() => window.__TDR__.world());
      check(w.chunks > 0 && w.chunks < 60 && w.colliders > 20, `${r.name}: chunks carregados ${w.chunks}, colisores ${w.colliders}`);
      if (shot < 4) await page.screenshot({ path: OUT + `14-setor-${++shot}.png` });
    }
    const far = await page.evaluate(() => window.__TDR__.world());
    check(far.chunks <= 40, `descarrega o que ficou longe (${far.chunks} chunks carregados)`);

    // painel de debug: abrir, ligar camadas, marcar alvo (visão + rota), mapa com teleporte
    await page.evaluate(([x, y]) => window.__TDR__.teleport(x, y), at(20, 20));
    await sleep(400);
    await tap(844 - 40, 88); // DBG
    // painel de debug deitado: 3 colunas de botões
    const PW = 124 * 3 + 8 + 4 + 8;
    const px = 844 - PW - 4;
    const py = 108;
    const btn = (i) => [px + 8 + 62 + (i % 3) * 126, py + 6 + 13 + Math.floor(i / 3) * 30];
    await tap(...btn(0)); // colisões
    await tap(...btn(1)); // navegação
    await tap(...btn(2)); // chunks
    await tap(...btn(3)); // marcar alvo
    await tap(200, 120); // alvo no mundo
    await sleep(900);
    const dbg = await page.evaluate(() => ({ info: window.__TDR__.scene.debugInfo(), target: window.__TDR__.scene.debugState.target }));
    check(!!dbg.target && dbg.info.startsWith('rota:'), `debug: alvo marcado e rota calculada (${dbg.info})`);
    await page.screenshot({ path: OUT + '15-debug.png' });
    await tap(...btn(4)); // mapa
    await sleep(500);
    await page.screenshot({ path: OUT + '16-debug-mapa.png' });
    const before = await pos(page);
    await tap(422, 200); // teleporta para o meio do mapa
    await sleep(600);
    const after = await pos(page);
    check(Math.hypot(after.x - before.x, after.y - before.y) > 200, `debug: teleporte pelo mapa (${Math.round(before.x)},${Math.round(before.y)} → ${Math.round(after.x)},${Math.round(after.y)})`);
    for (const i of [0, 1, 2, 3]) await tap(...btn(i)); // desliga tudo
    // portas + ruído + gerar item, perto do abrigo
    await tap(...btn(7)); // portas
    await tap(...btn(8)); // ruído
    const sd = await page.evaluate(() => window.__TDR__.map.doors.find((d) => d.buildingId === 'abrigo' && d.exterior));
    await page.evaluate(([x, y]) => window.__TDR__.teleport(x, y), [sd.x, sd.y + 60]);
    await sleep(400);
    await page.evaluate(() => window.__TDR__.interact()); // abre/fecha a porta: faz barulho
    const n0 = await page.evaluate(() => window.__TDR__.state.itemCount);
    await tap(...btn(9)); // gerar item
    const n1 = await page.evaluate(() => window.__TDR__.state.itemCount);
    check(n1 === n0 + 1, `debug: gerar item larga um item no chão (${n0} → ${n1})`);
    await page.screenshot({ path: OUT + '17-debug-portas-ruido.png' });
    for (const i of [7, 8]) await tap(...btn(i));
    await tap(...btn(11)); // loot
    await sleep(300);
    await page.screenshot({ path: OUT + '18-debug-loot.png' });
    const d0 = await page.evaluate(() => window.__TDR__.scene.s.session.clock.day);
    await tap(...btn(12)); // dia +1
    const d1 = await page.evaluate(() => window.__TDR__.scene.s.session.clock.day);
    check(d1 === d0 + 1, `debug: Dia +1 avança o relógio (${d0} → ${d1})`);
    await tap(...btn(11));
    await tap(844 - 40, 88); // fecha

    const cull = await page.evaluate(() => window.__TDR__.culler());
    check(cull.visible < cull.total * 0.6, `culling esconde o que está fora da tela (${cull.visible}/${cull.total})`);

    // ---------------------------------------------------------------- zumbis, andares e carro
    {
      const T = (fn, a) => page.evaluate(fn, a);
      // Zumbis na rua: acordam e vêm atrás.
      const street = at(8, 29);
      await T(([x, y]) => window.__TDR__.teleport(x, y), street);
      await T(([x, y]) => { const g = window.__TDR__; g.zombies.frozen = false; for (let i = 0; i < 4; i++) g.spawnZombie(x + 260 + i * 30, y + (i - 2) * 40); }, street);
      await page.waitForFunction(() => { const s = window.__TDR__.zombies.stats().states; return (s.CHASE ?? 0) + (s.ALERT ?? 0) + (s.ATTACK ?? 0) + (s.GRAB ?? 0) > 0; }, null, { timeout: 30000 }).catch(() => undefined);
      const zst = await T(() => window.__TDR__.zombies.stats().states);
      check((zst.CHASE ?? 0) + (zst.ALERT ?? 0) + (zst.ATTACK ?? 0) + (zst.GRAB ?? 0) > 0, `zumbis perto percebem o jogador (${JSON.stringify(zst)})`);
      await page.screenshot({ path: OUT + '20-zumbis.png' });
      const zv = await T(() => window.__TDR__.zombieViews());
      check(zv.views >= 2, `zumbis desenhados (${zv.views})`);
      await T(() => { const g = window.__TDR__; g.zombies.frozen = true; });
      // Andares: sobe a escada de um prédio de vários andares.
      const st = await T(() => { const g = window.__TDR__; const f = g.model.floors; return g.map.stairs.filter((q) => q.level === 0).sort((a, b) => f.top(b.building) - f.top(a.building))[0]; });
      check(!!st, `há escadas (${(await T(() => window.__TDR__.map.stairs.length))})`);
      if (st) {
        // A escada pode ter móvel encostado num lado (planta sorteada): tenta os quatro lados.
        for (const side of [0, 1, 2, 3]) {
          await T(([q, k]) => {
            const g = window.__TDR__;
            const cx = q.x + q.w / 2;
            const cy = q.y + q.h / 2;
            const dx = [q.w / 2 + 24, -q.w / 2 - 24, 0, 0][k];
            const dy = [0, 0, q.h / 2 + 24, -q.h / 2 - 24][k];
            g.teleport(cx + dx, cy + dy);
          }, [st, side]);
          await sleep(250);
          const ok = await page.waitForFunction(() => window.__TDR__.interaction()?.kind === 'stair', null, { timeout: 2500 }).then(() => true).catch(() => false);
          if (ok) break;
        }
        const tgt = await T(() => window.__TDR__.interaction());
        check(tgt?.verb === 'SUBIR', `escada vira alvo SUBIR (${tgt?.label})`);
        await T(() => window.__TDR__.interact());
        await page.waitForFunction(() => !!window.__TDR__.floor(), null, { timeout: 8000 }).catch(() => undefined);
        const fl = await T(() => { const f = window.__TDR__.floor(); return f && { level: f.level, below: window.__TDR__.scene.floorCam.active }; });
        check(fl?.level === 1 && fl.below, `subiu para o 1º andar com a vista da rua (${JSON.stringify(fl)})`);
        await sleep(1200);
        await page.screenshot({ path: OUT + '21-andar.png' });
        await T((q) => window.__TDR__.teleport(q.x + q.w / 2, q.y + q.h / 2), st);
        await sleep(400);
        check(!(await T(() => window.__TDR__.floor())), 'voltar ao térreo desliga o andar');
      }
      // Carro: entra, acelera, sai.
      const car = await T(() => { const g = window.__TDR__; const me = g.player(); let best = null; let bd = Infinity; for (const v of g.state.vehicles.all()) { if (v.type !== 'car') continue; const d = Math.hypot(v.x - me.x, v.y - me.y); if (d < bd) { bd = d; best = v; } } const s = g.state.vehicles.state(best.id); s.fuel = 20; s.engine = 0.9; s.tires = [0.9, 0.9, 0.9, 0.9]; return { id: best.id, x: best.x, y: best.y }; });
      await T((c) => window.__TDR__.teleport(c.x, c.y + 110), car);
      await sleep(300);
      const dr = await T((c) => window.__TDR__.drive(c.id), car);
      check(dr?.ok, `entra no carro para dirigir (${dr?.message})`);
      // A HUD troca para volante/pedais no quadro seguinte (e zera o joystick): espera antes de simular o controle.
      await page.waitForFunction(() => window.__TDR__.scene.s.touch.drive.active === true, null, { timeout: 8000 }).catch(() => undefined);
      await sleep(100);
      await T(() => { const g = window.__TDR__; const d = g.driving(); g.scene.s.touch.move = { x: Math.cos(d.a), y: Math.sin(d.a), magnitude: 1, active: true }; });
      await sleep(2500);
      const d1 = await T(() => window.__TDR__.driving());
      await T(() => { window.__TDR__.scene.s.touch.move = { x: 0, y: 0, magnitude: 0, active: false }; });
      check(!!d1 && Math.abs(d1.speed) > 5, `acelera (${d1 ? Math.round(d1.speed) : '-'} px/s)`);
      // Celular: pedal ACELERAR (toque de verdade) e volante (segundo dedo arrastando para o lado).
      await sleep(300);
      const pedal = await T(() => { const hud = window.__TDR__.scene.game.scene.getScenes(true).find((x) => x.sys.settings.key.toLowerCase().includes('hud')); const c = hud.controls.car; return c.isVisible ? { gx: c.gasBox.x + c.gasBox.w / 2, gy: c.gasBox.y + c.gasBox.h / 2, wx: c.wheel.x, wy: c.wheel.y } : null; });
      check(!!pedal, 'dirigindo: volante à esquerda e pedais à direita');
      if (pedal) {
        await T(() => { window.__TDR__.scene.drive.car.speed = 0; });
        await touch('touchStart', [{ x: pedal.gx, y: pedal.gy, id: 21 }]);
        await sleep(1500);
        const g1 = await T(() => window.__TDR__.driving());
        check(!!g1 && g1.speed > 5, `pedal ACELERAR anda para frente (${g1 ? Math.round(g1.speed) : '-'} px/s)`);
        const a0 = g1?.a ?? 0;
        await touch('touchStart', [{ x: pedal.gx, y: pedal.gy, id: 21 }, { x: pedal.wx, y: pedal.wy, id: 22 }]);
        await sleep(100);
        await touch('touchMove', [{ x: pedal.gx, y: pedal.gy, id: 21 }, { x: pedal.wx + 70, y: pedal.wy, id: 22 }]);
        await sleep(900);
        const g2 = await T(() => ({ d: window.__TDR__.driving(), steer: window.__TDR__.scene.s.touch.drive.steer }));
        await page.screenshot({ path: OUT + '22b-volante.png' });
        check(g2.steer > 0.5 && !!g2.d && Math.abs(g2.d.a - a0) > 0.05, `volante vira o carro (direção ${g2.steer.toFixed(2)})`);
        await touch('touchEnd', []);
        await sleep(200);
      }
      await page.screenshot({ path: OUT + '22-carro.png' });
      await T(() => { const g = window.__TDR__; g.scene.drive.car.speed = 0; g.exitCar(true); });
      check(!(await T(() => window.__TDR__.driving())), 'sai do carro');
    }
    // Som (gerado pelo jogo): motor ligado, variações no worker, memória no limite, sons tocando.
    const snd = await page.evaluate(async () => {
      const sc = window.__TDR__.scene;
      const a = sc.s.audio;
      if (!a) return null;
      if (a.ctx.state !== 'running') await a.ctx.resume().catch(() => {});
      for (const id of ['tiro.espingarda', 'vidro.janela', 'porta.fechar', 'passo.neve.corrida']) sc.s.bus.emit('sound:play', { id });
      return { state: a.ctx.state, worker: !!a.worker, mb: a.memoryMb, playing: a.playing };
    });
    check(!!snd, 'motor de som ligado (Web Audio)');
    if (snd) {
      check(snd.worker, 'variações de som geradas no worker (sem travar o jogo)');
      check(snd.mb < 20, `memória de som no limite (${snd.mb.toFixed(1)} MB)`);
      check(snd.state !== 'running' || snd.playing > 0, `sons tocando (${snd.playing} vozes, contexto ${snd.state})`);
    }
    check(errors.length === 0, `sem erros no console (${errors.length}) ${errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }

  // ---------------------------------------------------------------- dentro de um iframe (como o visualizador do Claude)
  {
    // iframe SEM permissão de tela cheia: o navegador recusa o pedido.
    // Antes isso virava "erro" na tela ao tocar em JOGAR.
    const { ctx, page, errors, touch } = await mobilePage(844, 390);
    await page.setContent(
      `<body style="margin:0;background:#000"><iframe id="f" src="${BASE}?debug" style="border:0;width:844px;height:390px;display:block"></iframe></body>`,
    );
    const frame = await (await page.$('#f')).contentFrame();
    await frame.waitForFunction(() => document.querySelector('canvas'), null, { timeout: 20000 });
    await sleep(2500);
    await touch('touchStart', [{ x: 422, y: 242, id: 1 }]);
    await sleep(80);
    await touch('touchEnd', []);
    await frame.waitForFunction(() => !!window.__TDR__, null, { timeout: 20000 });
    await sleep(1200);
    await touch('touchStart', [{ x: 130, y: 250, id: 2 }]);
    await touch('touchMove', [{ x: 130, y: 300, id: 2 }]);
    await sleep(600);
    await touch('touchEnd', []);
    await sleep(300);
    const erroVisivel = await frame.evaluate(() => getComputedStyle(document.getElementById('erro')).display !== 'none');
    const fsPermitido = await frame.evaluate(() => document.fullscreenEnabled);
    await page.screenshot({ path: OUT + '13-iframe.png' });
    check(!fsPermitido, 'iframe de teste realmente proíbe tela cheia');
    check(!erroVisivel, 'tocar em JOGAR sem permissão de tela cheia não mostra erro');
    check(errors.length === 0, `iframe sem erros no console (${errors.length}) ${errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }

  // ---------------------------------------------------------------- celular em pé
  {
    const { ctx, page, errors } = await mobilePage(390, 844);
    // "#debug" (sem "?"): é assim que o debug liga pelo link do Claude
    await page.goto(BASE + '?direto#debug');
    await waitGame(page);
    await page.screenshot({ path: OUT + '11-retrato.png' });
    // inventário em pé: painel em cima, botões embaixo livres
    const ps = Math.max(0.78, Math.min(1.35, 390 / 400));
    await page.evaluate(() => window.__TDR__.inventory.add('agua', 3));
    await page.evaluate(() => window.__TDR__.scene.scene.get('Hud').inventory.toggle());
    await sleep(400);
    await page.screenshot({ path: OUT + '11b-retrato-inventario.png' });
    const pbox = await page.evaluate(() => window.__TDR__.scene.scene.get('Hud').inventory.box);
    check(pbox.y + pbox.h < 844 - 332 * ps - 25 * ps, `retrato: painel não cobre o botão do inventário (fim ${Math.round(pbox.y + pbox.h)})`);
    // saque em pé: recipiente em cima, inventário embaixo
    await page.evaluate(() => {
      const T = window.__TDR__;
      const crate = T.map.props.find((p) => p.type === 'crate' && T.state.loot.ref(p.id)?.table === 'abrigo-caixas');
      T.state.openContainer(crate.id);
      T.scene.s.bus.emit('ui:container-open', { id: crate.id });
    });
    await sleep(400);
    await page.screenshot({ path: OUT + '11c-retrato-saque.png' });
    const pbox2 = await page.evaluate(() => window.__TDR__.scene.scene.get('Hud').inventory.box);
    check(pbox2.y + pbox2.h < 844 - 332 * ps - 25 * ps, 'retrato: painel de saque não cobre os botões');
    check(errors.length === 0, `retrato sem erros (${errors.length}) ${errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }

  // ---------------------------------------------------------------- morte → carregar / menu → continuar
  {
    // Antes: voltar ao menu depois de morrer dava erro (câmera do andar de cima já
    // destruída) e, carregando da tela de morte, o jogador não morria mais.
    const { ctx, page, errors } = await mobilePage(844, 390);
    await page.goto(BASE + '?debug&direto');
    await waitGame(page);
    const T = (fn, a) => page.evaluate(fn, a);
    // Botão = objeto com rótulo (UiButton) visível; aperta como um toque.
    const press = (scene, label) =>
      T(
        ([scene, label]) => {
          const sc = window.__TDR__.scene.game.scene.getScene(scene);
          const all = [];
          const walk = (o) => {
            all.push(o);
            for (const c of o.list ?? []) walk(c);
          };
          sc.children.list.forEach(walk);
          const vis = (o) => {
            for (let q = o; q; q = q.parentContainer) if (!q.visible) return false;
            return true;
          };
          const b = all.find((o) => o.label?.text === label && vis(o));
          if (!b) return false;
          b.emit('pointerdown', {});
          b.emit('pointerup', {});
          return true;
        },
        [scene, label],
      );
    const kill = () => T(() => { const sc = window.__TDR__.scene; if (!sc.dead) sc.die(); });
    await T(() => window.__TDR__.save());
    await page.goto(BASE + '?debug&direto');
    await waitGame(page);
    await kill();
    await sleep(3500);
    await T(() => { window.__old = window.__TDR__; });
    check(await press('Hud', 'CARREGAR ÚLTIMO SAVE'), 'tela de morte tem CARREGAR ÚLTIMO SAVE');
    await page.waitForFunction(() => window.__TDR__ !== window.__old, null, { timeout: 60000 }).catch(() => undefined);
    await waitGame(page);
    check(!(await T(() => window.__TDR__.dead())), 'carregar da tela de morte volta vivo');
    await kill();
    await sleep(3500);
    check(await T(() => window.__TDR__.dead()), 'depois de carregar dá para morrer de novo');
    check(await press('Hud', 'MENU'), 'tela de morte tem MENU');
    await page.waitForFunction(() => window.__TDR__.scene.game.scene.getScenes(true).some((s) => s.sys.settings.key === 'Title'), null, { timeout: 30000 }).catch(() => undefined);
    check(await T(() => window.__TDR__.scene.game.scene.isActive('Title')), 'MENU volta ao título');
    await T(() => { window.__old = window.__TDR__; });
    check(await press('Title', 'CONTINUAR'), 'título tem CONTINUAR');
    await page.waitForFunction(() => window.__TDR__ !== window.__old, null, { timeout: 60000 }).catch(() => undefined);
    await waitGame(page);
    check(await T(() => window.__TDR__.scene.game.scene.isActive('Game') && !window.__TDR__.dead()), 'continuar do título abre o jogo');
    check(errors.length === 0, `morte e menu sem erros no console (${errors.length}) ${errors.slice(0, 3).join(' | ')}`);
    await ctx.close();
  }

  // ---------------------------------------------------------------- PC com teclado
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    await page.bringToFront();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text());
    });
    await page.goto(BASE + '?debug&direto');
    try {
      await waitGame(page);
    } catch (e) {
      await page.screenshot({ path: OUT + '12-pc-erro.png' });
      throw new Error('PC não iniciou: ' + errors.join(' | '));
    }
    // Deixa o começo da partida assentar (sons sendo gerados no worker, texturas): o teste é do teclado.
    await sleep(2500);
    // Mede depois da arrancada (a poucos FPS a aceleração leva vários quadros).
    await page.keyboard.down('KeyD');
    await sleep(600);
    const k0 = await pos(page);
    await sleep(1000);
    const k1 = await pos(page);
    await page.keyboard.up('KeyD');
    const kv = (k1.x - k0.x) / (k1.t - k0.t);
    check(kv > 140, `teclado move (${Math.round(kv)} px/s)`);
    // E abre a porta do abrigo; I abre o inventário
    const pcDoor = await page.evaluate(() => window.__TDR__.map.doors.find((d) => d.buildingId === 'abrigo' && d.exterior));
    await page.evaluate(([x, y]) => window.__TDR__.teleport(x, y), [pcDoor.x, pcDoor.y - 40]);
    await sleep(400);
    await page.keyboard.press('KeyE');
    await sleep(300);
    check(await page.evaluate((id) => window.__TDR__.state.doorState(id).open, pcDoor.id), 'tecla E abre a porta');
    await page.keyboard.press('KeyI');
    await sleep(300);
    check(await page.evaluate(() => window.__TDR__.scene.scene.get('Hud').inventory.isOpen), 'tecla I abre o inventário');
    await page.screenshot({ path: OUT + '12-pc.png' });
    check(errors.length === 0, `PC sem erros (${errors.length}) ${errors.slice(0, 3).join(' | ')}`);
  }
} catch (e) {
  failures.push(String(e?.stack ?? e));
  console.error(e);
} finally {
  await browser.close();
  server.kill();
}

console.log(failures.length ? `\n${failures.length} falha(s).` : '\nTudo certo.');
process.exit(failures.length ? 1 : 0);
