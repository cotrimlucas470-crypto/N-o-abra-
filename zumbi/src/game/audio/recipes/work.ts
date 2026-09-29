/**
 * TRABALHO E OBJETOS: martelo, machado, picareta, serrote, tábuas,
 * demolição, desmonte; gavetas, armários, geladeira, caixas, sacos.
 */
import { burst, buffer, creak, finish, grain, modes, type Rng, thump, trim } from '../dsp';
import { click } from './doors';
import { hit, materialModes } from './materials';
import { whoosh } from './combat';

type Recipe = (rng: Rng, sr: number) => Float32Array;

/** Martelando prego: aço no prego (agudo) + tábua (grave); o prego afunda e sobe de tom. */
export const hammer: Recipe = (rng, sr) => {
  const n = rng.int(3, 5);
  const out = buffer(0.45 * n + 0.5, sr);
  let t = 0.01;
  const f = rng.range(2400, 3600);
  for (let i = 0; i < n; i++) {
    const g = rng.range(0.75, 1);
    modes(out, sr, t, [
      { f: f * (1 + i * 0.05), a: 1, d: rng.range(0.05, 0.1) },
      { f: f * 2.76 * (1 + i * 0.05), a: 0.4, d: 0.04 },
    ], g * 0.35, rng);
    hit(out, sr, rng, { at: t, m: 'madeira', gain: g, size: rng.range(0.8, 1.3), hard: 0.9 });
    t += rng.range(0.36, 0.55);
  }
  return trim(finish(out, sr, 0.9), sr);
};

/** Machadada: ar, baque, madeira rachando e lascas. */
export const axe: Recipe = (rng, sr) => {
  const out = buffer(1.2, sr);
  const w = whoosh('pesado')(rng, sr);
  for (let i = 0; i < w.length && i < out.length; i++) out[i] = out[i]! + w[i]! * 0.35;
  const t = 0.25;
  thump(out, sr, t, 105, 50, 0.14, 1);
  hit(out, sr, rng, { at: t, m: 'madeira', gain: 0.9, size: rng.range(1, 1.6), hard: 0.95 });
  burst(out, sr, rng, { at: t + 0.003, dur: 0.03, tau: 0.008, gain: 0.5, type: 'bandpass', freq: 2600, q: 0.8 });
  for (let i = 0; i < 10; i++) grain(out, sr, rng, t + rng.range(0.01, 0.2), 0.004, rng.range(2000, 5000), 2, rng.range(0.05, 0.15));
  return trim(finish(out, sr, 0.9), sr);
};

/** Picareta: aço na pedra (clangor) e pedra esfarelando. */
export const pickaxe: Recipe = (rng, sr) => {
  const out = buffer(1.1, sr);
  modes(out, sr, 0.01, materialModes(rng, 'metal', rng.range(0.5, 0.8), 0.4), 0.6, rng);
  hit(out, sr, rng, { at: 0.01, m: 'concreto', gain: 1, size: 1.2, hard: 1 });
  for (let i = 0; i < 26; i++) grain(out, sr, rng, 0.015 + Math.pow(rng.next(), 1.6) * 0.3, rng.range(0.002, 0.005), rng.range(900, 4200), 2, rng.range(0.06, 0.2));
  return trim(finish(out, sr, 0.9), sr);
};

/** Tábuas sendo manuseadas/assentadas: batidas de madeira de vários tamanhos. */
export const planks: Recipe = (rng, sr) => {
  const out = buffer(1, sr);
  const n = rng.int(3, 5);
  for (let i = 0; i < n; i++) hit(out, sr, rng, { at: 0.01 + i * rng.range(0.08, 0.18), m: 'madeira', gain: rng.range(0.5, 1), size: rng.range(0.7, 1.8), hard: 0.6 });
  burst(out, sr, rng, { at: 0.02, dur: 0.3, tau: 0.12, gain: 0.08, type: 'bandpass', freq: 1500, q: 0.8, color: 'pink' });
  return trim(finish(out, sr, 0.85), sr);
};

/** Demolição: estalos, desabamento e entulho caindo, ronco grave. */
export const demolish: Recipe = (rng, sr) => {
  const out = buffer(2.6, sr);
  for (let i = 0; i < 6; i++) burst(out, sr, rng, { at: 0.01 + rng.range(0, 0.05), dur: 0.006, tau: 0.0015, gain: rng.range(0.5, 1), type: 'highpass', freq: rng.range(1200, 3000), q: 0.7 });
  thump(out, sr, 0.05, 90, 38, 0.45, 1);
  burst(out, sr, rng, { at: 0.04, dur: 1.8, tau: 0.5, gain: 0.5, type: 'lowpass', freq: 220, q: 0.7, color: 'brown' });
  const n = rng.int(35, 60);
  for (let i = 0; i < n; i++) {
    const at = 0.06 + Math.min(2, -Math.log(1 - rng.next() * 0.97) * 0.35);
    const m = rng.pick(['madeira', 'madeira', 'concreto', 'metal'] as const);
    hit(out, sr, rng, { at, m, gain: rng.range(0.1, 0.5) * Math.exp(-at * 1.1), size: rng.range(0.4, 1.4), hard: 0.6 });
  }
  return trim(finish(out, sr, 0.95), sr);
};

/** Desmontando algo: parafuso rangendo, peças batendo, madeira forçando. */
export const dismantle: Recipe = (rng, sr) => {
  const out = buffer(1.4, sr);
  creak(out, sr, rng, { at: 0.05, dur: rng.range(0.2, 0.4), gain: 0.3, rate0: 70, rate1: 140, res: [{ f: rng.range(2000, 3200), q: 14, a: 1 }] });
  for (let i = 0; i < rng.int(2, 4); i++) hit(out, sr, rng, { at: rng.range(0.35, 1), m: rng.pick(['metal', 'madeira'] as const), gain: rng.range(0.4, 0.9), size: rng.range(0.4, 1), hard: 0.7, damp: 0.4 });
  return trim(finish(out, sr, 0.85), sr);
};

/** Gaveta: corrediça de madeira, bate no fim, coisas lá dentro chacoalham. */
export const drawer: Recipe = (rng, sr) => {
  const out = buffer(0.8, sr);
  const d = rng.range(0.18, 0.32);
  burst(out, sr, rng, { at: 0.01, dur: d, tau: 1, gain: 0.35, attack: 0.03, type: 'bandpass', freq: rng.vary(900, 0.2), q: 0.9, color: 'pink' });
  for (let i = 0; i < 8; i++) grain(out, sr, rng, 0.02 + rng.range(0, d), 0.003, rng.range(600, 1600), 3, 0.08);
  hit(out, sr, rng, { at: d + 0.01, m: 'madeira', gain: 0.6, size: 0.8, hard: 0.5 });
  for (let i = 0; i < rng.int(2, 5); i++) modes(out, sr, d + rng.range(0.01, 0.08), [{ f: rng.range(1500, 5000), a: 1, d: rng.range(0.01, 0.04) }], rng.range(0.05, 0.15), rng);
  return trim(finish(out, sr, 0.75), sr);
};

/** Porta de armário: dobradicinha e batida leve. */
export const cabinet: Recipe = (rng, sr) => {
  const out = buffer(0.7, sr);
  if (rng.chance(0.5)) creak(out, sr, rng, { at: 0.01, dur: rng.range(0.1, 0.22), gain: 0.25, rate0: 60, rate1: 150, res: [{ f: rng.range(1600, 2600), q: 14, a: 1 }] });
  click(out, sr, rng, 0.005, 0.3, 0.7);
  hit(out, sr, rng, { at: rng.range(0.15, 0.3), m: 'madeira', gain: 0.45, size: 0.9, hard: 0.4 });
  return trim(finish(out, sr, 0.7), sr);
};

/** Geladeira: vedação soltando (ventosa), borracha e garrafas tilintando. */
export const fridge: Recipe = (rng, sr) => {
  const out = buffer(0.9, sr);
  thump(out, sr, 0.01, 80, 55, 0.08, 0.6);
  burst(out, sr, rng, { at: 0.01, dur: 0.15, tau: 0.05, gain: 0.35, type: 'bandpass', freq: 600, q: 1, color: 'pink' });
  for (let i = 0; i < rng.int(2, 4); i++) modes(out, sr, rng.range(0.08, 0.3), materialModes(rng, 'vidro', rng.range(0.8, 1.2)), rng.range(0.1, 0.25), rng);
  return trim(finish(out, sr, 0.75), sr);
};

/** Mexendo em caixa/papelão/sacola: farfalhar e estalinhos de plástico. */
export const rummage: Recipe = (rng, sr) => {
  const out = buffer(0.9, sr);
  const d = rng.range(0.35, 0.6);
  for (let i = 0; i < 4; i++) burst(out, sr, rng, { at: rng.range(0, d), dur: 0.12, tau: 0.04, gain: rng.range(0.2, 0.4), type: 'bandpass', freq: rng.range(1800, 4200), q: 0.7, color: 'pink' });
  for (let i = 0; i < 30; i++) grain(out, sr, rng, rng.range(0, d), rng.range(0.001, 0.003), rng.range(2500, 9000), 2, rng.range(0.05, 0.15));
  return trim(finish(out, sr, 0.6), sr);
};

/** Metal de lataria levando pancada (carro). */
export const sheetMetal: Recipe = (rng, sr) => {
  const out = buffer(1, sr);
  hit(out, sr, rng, { at: 0.005, m: 'lataria', gain: 1, size: rng.range(1, 1.8), hard: 0.8 });
  return trim(finish(out, sr, 0.9), sr);
};
