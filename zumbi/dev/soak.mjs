// Teste longo: dias passando com o clima de verdade, entrando e saindo de casa, subindo andar,
// dirigindo. A cada poucos segundos mede a tela; se ficou quase toda de uma cor só ("tampada"),
// salva o print e o estado (hora, clima, onde está).
// node dev/soak.mjs <base> <saida> [segundos=240]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const [base, out, secsArg] = process.argv.slice(2);
const SECS = Number(secsArg ?? 240);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true })).newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
await p.goto(base + '?debug&direto');
await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 90000 });
await p.evaluate(() => { const t = window.__TDR__; const l = t.scene.game.loop; l.inFocus = true; l.panicMax = 0; t.zombies.frozen = true; t.clock.userScale = 60; });
await sleep(1500);
const T = (fn, a) => p.evaluate(fn, a);

/** Mede a tela: fração de pixels na cor mais comum (quantizada) e desvio do brilho. */
const measure = () =>
  T(
    () =>
      new Promise((res) => {
        const g = window.__TDR__.scene.game;
        g.renderer.snapshot((img) => {
          const c = document.createElement('canvas');
          const w = 211;
          const h = 98;
          c.width = w;
          c.height = h;
          const x = c.getContext('2d', { willReadFrequently: true });
          x.drawImage(img, 0, 0, w, h);
          const d = x.getImageData(0, 0, w, h).data;
          const bins = new Map();
          let sum = 0;
          let sum2 = 0;
          const n = w * h;
          for (let i = 0; i < n; i++) {
            const r = d[i * 4];
            const gg = d[i * 4 + 1];
            const bb = d[i * 4 + 2];
            const k = ((r >> 4) << 8) | ((gg >> 4) << 4) | (bb >> 4);
            bins.set(k, (bins.get(k) ?? 0) + 1);
            const l = r * 0.3 + gg * 0.59 + bb * 0.11;
            sum += l;
            sum2 += l * l;
          }
          const top = Math.max(...bins.values()) / n;
          const mean = sum / n;
          res({ top: +top.toFixed(3), mean: Math.round(mean), sd: Math.round(Math.sqrt(Math.max(0, sum2 / n - mean * mean))) });
        });
      }),
  );

const info = () =>
  T(() => {
    const t = window.__TDR__;
    const l = t.loop;
    const w = l.weather;
    const me = t.player();
    return `${l.dateLabel()} ${String(Math.floor(t.clock.minuteOfDay / 60)).padStart(2, '0')}h · ${w.sky} nuv=${w.cloud.toFixed(2)} chuva=${w.rain.toFixed(2)} neve=${w.snow.toFixed(2)} nebl=${w.fog.toFixed(2)} · escuro=${t.atmosphere().darkness.toFixed(2)} · andar=${t.floor()?.level ?? 0} · dentro=${t.buildingAt(me.x, me.y) ?? '-'} · carro=${!!t.driving()}`;
  });

// Lugares para ir: fora, dentro do abrigo, dentro de outra construção, andar de cima.
const door = await T(() => { const d = window.__TDR__.map.doors.find((d) => d.buildingId === 'abrigo' && d.exterior); return { x: d.x, y: d.y }; });
const spots = [
  { name: 'fora', x: door.x, y: door.y + 180 },
  { name: 'dentro', x: door.x, y: door.y - 150 },
  { name: 'rua', x: door.x + 520, y: door.y + 60 },
];
let covered = 0;
let shots = 0;
const t0 = Date.now();
let k = 0;
while ((Date.now() - t0) / 1000 < SECS) {
  const s = spots[k % spots.length];
  // Mantém o jogador vivo (com o relógio acelerado ele morreria de sede em poucos dias).
  await T((s) => { const t = window.__TDR__; t.scene.debugHealAll(); t.teleport(s.x, s.y); }, s);
  // De vez em quando: dirigir um pouco ou subir um andar.
  if (k % 7 === 3) await T(() => { const t = window.__TDR__; const car = t.map.props.find((q) => q.type === 'car'); if (car) { t.teleport(car.x + 60, car.y); t.drive(car.id); } });
  if (k % 7 === 4) await T(() => window.__TDR__.exitCar(true));
  await sleep(2500);
  const m = await measure();
  const where = await info();
  const bad = m.top > 0.82 || m.sd < 6;
  console.log(`${bad ? 'TAMPADA' : 'ok     '} top=${m.top} brilho=${m.mean} desvio=${m.sd} · ${s.name} · ${where}`);
  if (bad) {
    covered++;
    if (shots < 8) await p.screenshot({ path: `${out}/tampada-${shots++}.png` });
  }
  k++;
}
console.log(`tampada ${covered}/${k} · erros ${errors.length}`, errors.slice(0, 4));
await b.close();
