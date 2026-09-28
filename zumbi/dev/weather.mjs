// Clima no navegador: node dev/weather.mjs <base> <saida> [filtro]
// Percorre as estações (pulando dias de verdade) e força cada clima para fotografar.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const [base, out, only] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 })).newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(String(e.stack ?? e)));
await p.goto(base + '?debug&direto');
await p.waitForFunction(() => !!window.__TDR__, null, { timeout: 60000 });
await p.evaluate(() => { const l = window.__TDR__.scene.game.loop; l.inFocus = true; l.panicMax = 0; });
await sleep(1500);
const T = (fn, a) => p.evaluate(fn, a);
const calm = { rain: 0, snow: 0, precip: 0, fog: 0, thunder: 0, front: 0 };
const W = {
  sol: { ...calm, cloud: 0.05, wind: 0.12, sky: 'limpo' },
  nuvens: { ...calm, cloud: 0.48, wind: 0.3, sky: 'poucas-nuvens' },
  garoa: { ...calm, cloud: 0.9, rain: 0.18, precip: 0.18, wind: 0.25, sky: 'chuva-fraca' },
  chuvaForte: { ...calm, cloud: 1, rain: 0.8, precip: 0.8, wind: 0.6, front: 1, sky: 'chuva' },
  tempestade: { ...calm, cloud: 1, rain: 0.95, precip: 0.95, wind: 0.9, thunder: 0.95, front: 1, sky: 'tempestade' },
  neblina: { ...calm, cloud: 0.7, fog: 0.95, wind: 0.02, sky: 'neblina' },
  ventania: { ...calm, cloud: 0.4, wind: 0.95, sky: 'poucas-nuvens' },
  neveFraca: { ...calm, cloud: 0.9, snow: 0.2, precip: 0.2, wind: 0.2, temp: -1, sky: 'neve-fraca' },
  neve: { ...calm, cloud: 0.95, snow: 0.55, precip: 0.55, wind: 0.35, temp: -4, sky: 'neve' },
  nevasca: { ...calm, cloud: 1, snow: 0.95, precip: 0.95, wind: 0.9, temp: -9, sky: 'nevasca' },
};
const set = (w, g) => T(({ w, g }) => {
  const t = window.__TDR__;
  t.loop.debugWeather = w;
  Object.assign(t.loop.ground, { snowCm: 0, wet: 0, ice: 0, sinceSnow: 999, melting: 0 }, g ?? {});
  t.loop.refreshWeather();
}, { w, g });
const toDate = (m, d) => T(({ m, d }) => {
  const t = window.__TDR__;
  for (let i = 0; i < 400; i++) { const g = t.loop.calendar.dateOf(t.clock.dayIndex); if (g.month === m && g.day === d) break; t.scene.debugSkipDays(1); }
  t.clock.minutes = t.clock.dayIndex * 1440 + 11 * 60;
  t.loop.refreshWeather();
}, { m, d });
const place = (where, zoom = 0.9) => T(({ where, zoom }) => {
  const t = window.__TDR__;
  const d = t.map.doors.find((d) => d.buildingId === 'abrigo' && d.exterior);
  t.teleport(d.x, where === 'dentro' ? d.y - 140 : d.y + 150);
  t.scene.director.setZoom(zoom);
}, { where, zoom });
const shots = [];
const shot = async (name, wait = 1400) => {
  if (only && !name.includes(only)) return;
  await sleep(wait);
  const info = await T(() => { const t = window.__TDR__; const l = t.loop; const w = l.weather; const g = l.ground; return `${l.dateLabel()} · ${w.temp}°C ${w.sky} · chão neve=${g.snow.toFixed(2)} mol=${g.wet.toFixed(2)} · FPS ${t.scene.game.loop.actualFps.toFixed(0)}`; });
  console.log(name, info);
  await p.screenshot({ path: `${out}/wx-${name}.png` });
  shots.push(name);
};
await T(() => { window.__TDR__.clock.userScale = 0; });
await place('fora');
// Outono (começo: 3 de maio) — cores do outono e vento.
await set(W.sol);
await shot('01-outono-sol');
await set(W.ventania);
await shot('02-outono-ventania');
await set(W.garoa, { wet: 0.3 });
await shot('03-chuva-fraca');
await set(W.chuvaForte, { wet: 0.85 });
await shot('04-chuva-forte');
await set(W.tempestade, { wet: 1 });
await T(() => { const a = window.__TDR__.scene.atmosphere; a.boltT = 0.02; a.boltStrong = true; });
await shot('05-tempestade-raio', 60);
await set(W.tempestade, { wet: 1 });
await shot('06-tempestade');
await set(W.chuvaForte, { wet: 0.85 });
await place('dentro');
await shot('07-dentro-chuva');
await place('fora');
await set(W.neblina);
await shot('08-neblina');
await set({ ...W.sol, cloud: 0.1 }, { wet: 0.45 });
await shot('09-depois-da-chuva');
// Fim de maio: primeira neve.
await toDate(5, 28);
await set(W.neveFraca, { snowCm: 0.35, sinceSnow: 0 });
await shot('10-primeira-neve');
await set(W.neve, { snowCm: 1.4, sinceSnow: 0 });
await shot('11-neve-fraca-chao');
await set(W.neve, { snowCm: 3, sinceSnow: 0 });
await shot('12-neve-moderada');
// Inverno.
await toDate(7, 10);
await set(W.nevasca, { snowCm: 14, sinceSnow: 0 });
await shot('13-nevasca');
await set(W.sol, { snowCm: 22, sinceSnow: 120 });
await shot('14-neve-acumulada-velha');
await set(W.neve, { snowCm: 14, sinceSnow: 0 });
await place('dentro');
await shot('15-dentro-neve');
await place('fora', 0.5);
await set(W.sol, { snowCm: 10, sinceSnow: 6 });
await shot('16-cidade-neve');
await place('fora');
// Fim do inverno: derretendo.
await toDate(9, 20);
await set({ ...W.sol, cloud: 0.3, temp: 6 }, { snowCm: 1.6, melting: 0.9, wet: 0.6, sinceSnow: 90 });
await shot('17-derretendo');
await toDate(10, 20);
await set(W.sol);
await shot('18-primavera');
await toDate(1, 15);
await set(W.sol);
await shot('19-verao-sol');
await set(W.nuvens);
await shot('20-verao-nuvens');
console.log('erros', JSON.stringify(errors.slice(0, 5)));
await b.close();
