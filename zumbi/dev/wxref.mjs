// Clima no MESMO ENQUADRAMENTO das imagens de referência (casa inicial, carro vermelho, zoom 0,53).
// node dev/wxref.mjs <base> <saida> [filtro,filtro...]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const [base, out, only] = process.argv.slice(2);
const filters = only ? only.split(',') : null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true })).newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e.stack ?? e)));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await p.goto(base + '?debug&direto');
await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 90000 });
await p.evaluate(() => { const l = window.__TDR__.scene.game.loop; l.inFocus = true; l.panicMax = 0; });
await sleep(1500);
const T = (fn, a) => p.evaluate(fn, a);
const calm = { rain: 0, snow: 0, precip: 0, fog: 0, thunder: 0, front: 0 };
const W = {
  sol: { ...calm, cloud: 0.05, wind: 0.12, temp: 24, sky: 'limpo' },
  nublado: { ...calm, cloud: 0.8, wind: 0.3, temp: 17, sky: 'nublado' },
  garoa: { ...calm, cloud: 0.9, rain: 0.2, precip: 0.2, wind: 0.25, temp: 15, sky: 'chuva-fraca' },
  chuva: { ...calm, cloud: 1, rain: 0.85, precip: 0.85, wind: 0.5, front: 1, temp: 13, sky: 'chuva' },
  tempestade: { ...calm, cloud: 1, rain: 0.95, precip: 0.95, wind: 0.9, thunder: 0.95, front: 1, temp: 12, sky: 'tempestade' },
  neblina: { ...calm, cloud: 0.7, fog: 0.9, wind: 0.05, temp: 8, sky: 'neblina' },
  ventania: { ...calm, cloud: 0.4, wind: 0.95, temp: 14, sky: 'poucas-nuvens' },
  geada: { ...calm, cloud: 0.05, wind: 0.05, temp: -3, sky: 'limpo' },
  neveFraca: { ...calm, cloud: 0.9, snow: 0.25, precip: 0.25, wind: 0.2, temp: -1, sky: 'neve-fraca' },
  neve: { ...calm, cloud: 0.95, snow: 0.55, precip: 0.55, wind: 0.3, temp: -4, sky: 'neve' },
  nevasca: { ...calm, cloud: 1, snow: 0.95, precip: 0.95, wind: 0.9, temp: -9, sky: 'nevasca' },
  frioSol: { ...calm, cloud: 0.2, wind: 0.1, temp: -2, sky: 'limpo' },
  degelo: { ...calm, cloud: 0.3, wind: 0.2, temp: 7, sky: 'poucas-nuvens' },
};
const set = (w, g, hour = 10) => T(({ w, g, hour }) => {
  const t = window.__TDR__;
  t.clock.minutes = t.clock.dayIndex * 1440 + hour * 60;
  t.loop.debugWeather = w;
  Object.assign(t.loop.ground, { snowCm: 0, wet: 0, ice: 0, sinceSnow: 999, melting: 0 }, g ?? {});
  t.loop.refreshWeather();
}, { w, g, hour });
const toDate = (m, d) => T(({ m, d }) => {
  const t = window.__TDR__;
  for (let i = 0; i < 400; i++) { const g = t.loop.calendar.dateOf(t.clock.dayIndex); if (g.month === m && g.day === d) break; t.scene.debugSkipDays(1); }
  t.loop.refreshWeather();
}, { m, d });
const place = (where = 'ref', zoom = 0.53) => T(({ where, zoom }) => {
  const t = window.__TDR__;
  const d = t.map.doors.find((d) => d.buildingId === 'abrigo' && d.exterior);
  const at = { ref: [d.x, d.y - 30], fora: [d.x, d.y + 150], dentro: [d.x, d.y - 160], rua: [d.x + 520, d.y + 60] }[where];
  t.teleport(at[0], at[1]);
  t.scene.director.setZoom(zoom);
}, { where, zoom });
const shot = async (name, wait = 1600) => {
  await sleep(wait);
  const info = await T(() => { const t = window.__TDR__; const l = t.loop; const w = l.weather; const g = l.ground; return `${l.dateLabel()} · ${w.temp}°C ${w.sky} · neve=${g.snow.toFixed(2)} mol=${g.wet.toFixed(2)} geada=${g.frost(w, t.clock.minuteOfDay).toFixed(2)} · FPS ${t.scene.game.loop.actualFps.toFixed(0)}`; });
  console.log(name, info);
  await p.screenshot({ path: `${out}/r-${name}.png` });
  if (process.env.CLOSE) {
    // Perto (zoom 1,4) para ver a textura: recorte do meio da tela.
    await T(() => window.__TDR__.scene.director.setZoom(1.4));
    await sleep(900);
    await p.screenshot({ path: `${out}/r-${name}-perto.png`, clip: { x: 170, y: 60, width: 500, height: 270 } });
  }
};
await T(() => { window.__TDR__.clock.userScale = 0; });
// [nome, data (mês, dia), clima, chão, lugar, zoom, hora]
const CASES = [
  // Outono (o jogo começa em 3 de maio).
  ['outono-vento', [5, 10], W.ventania, {}, 'ref'],
  ['outono-garoa', [5, 10], W.garoa, { wet: 0.25 }, 'ref'],
  ['outono-neblina', [5, 10], W.neblina, { wet: 0.2 }, 'ref'],
  // Inverno.
  ['geada', [6, 10], W.geada, {}, 'ref', 0.53, 8.6],
  ['neve-primeira', [6, 10], W.neveFraca, { snowCm: 0.3, sinceSnow: 0 }, 'ref'],
  ['neve-fraca', [6, 10], W.neveFraca, { snowCm: 1.1, sinceSnow: 0 }, 'ref'],
  ['neve-moderada', [7, 5], W.neve, { snowCm: 2.6, sinceSnow: 0 }, 'ref'],
  ['neve-intensa', [7, 5], W.nevasca, { snowCm: 9, sinceSnow: 0 }, 'ref'],
  ['neve-dentro', [7, 5], W.neve, { snowCm: 6, sinceSnow: 0 }, 'dentro'],
  ['neve-rua', [7, 5], W.neve, { snowCm: 4, sinceSnow: 12 }, 'rua'],
  ['neve-acumulada', [7, 20], W.frioSol, { snowCm: 20, sinceSnow: 6 }, 'ref'],
  ['neve-cidade', [7, 20], W.frioSol, { snowCm: 12, sinceSnow: 20 }, 'fora', 0.3],
  ['neve-velha', [7, 25], W.frioSol, { snowCm: 16, sinceSnow: 110 }, 'ref'],
  ['derretendo', [9, 15], W.degelo, { snowCm: 1.8, melting: 0.9, wet: 0.6, sinceSnow: 90 }, 'ref'],
  ['primavera', [10, 25], W.sol, {}, 'ref'],
  // Verão (grama verde, como nas referências de sol e chuva).
  ['sol', [1, 15], W.sol, {}, 'ref'],
  ['nublado', [1, 15], W.nublado, {}, 'ref'],
  ['chuva', [1, 15], W.chuva, { wet: 0.9 }, 'ref'],
  ['chuva-dentro', [1, 15], W.chuva, { wet: 0.9 }, 'dentro'],
  ['chuva-rua', [1, 15], W.chuva, { wet: 0.9 }, 'rua'],
  ['tempestade', [1, 15], W.tempestade, { wet: 1 }, 'ref'],
  ['depois-chuva', [1, 15], W.sol, { wet: 0.55 }, 'ref'],
  ['neblina', [1, 15], W.neblina, { wet: 0.2 }, 'ref'],
];
for (const [name, date, w, g, where, zoom = 0.53, hour = 10] of CASES) {
  if (filters && !filters.some((f) => name.includes(f))) continue;
  await toDate(date[0], date[1]);
  await place(where, zoom);
  await set(w, g, hour);
  await shot(name);
}
console.log('erros', JSON.stringify(errors.slice(0, 6)));
await b.close();
