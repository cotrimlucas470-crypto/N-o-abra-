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
    check(s1.stamina < 90, `correr gasta fôlego (fôlego=${Math.round(s1.stamina)})`);
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
    check(inside === 'Mercadinho', `detecta interior (${inside})`);
    await sleep(500);
    await page.screenshot({ path: OUT + '06-mercadinho.png' });

    // itens: pega o martelo da bancada do abrigo, abre o inventário e larga
    const hammer = await page.evaluate(() => window.__TDR__.map.items.find((i) => i.defId === 'martelo'));
    await page.evaluate(([x, y]) => window.__TDR__.teleport(x, y), [hammer.x + 10, hammer.y - 40]);
    await sleep(500);
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
    await page.screenshot({ path: OUT + '07-pausa.png' });
    await touch('touchStart', [{ x: 422, y: 234, id: 5 }]);
    await sleep(60);
    await touch('touchEnd', []);
    const resumed = await page.waitForFunction(() => !window.__TDR__.scene.scene.isPaused(), null, { timeout: 3000 }).then(() => true, () => false);
    check(resumed, 'CONTINUAR volta ao jogo');

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
    const k0 = await pos(page);
    await page.keyboard.down('KeyD');
    await sleep(1000);
    await page.keyboard.up('KeyD');
    const k1 = await pos(page);
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
