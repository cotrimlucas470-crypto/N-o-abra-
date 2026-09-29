/**
 * PORTAS: trinco, dobradiça, batida, maçaneta trancada, portão de enrolar,
 * porta de carro, porta-malas, arrombamento e zumbi batendo/empurrando.
 */
import { burst, buffer, creak, finish, grain, modes, type Rng, thump, trim } from '../dsp';
import { hit, materialModes } from './materials';

type Recipe = (rng: Rng, sr: number) => Float32Array;

/** Clique metálico pequeno (trinco, lingueta, mecanismo). */
export function click(out: Float32Array, sr: number, rng: Rng, at: number, gain: number, pitch = 1): void {
  burst(out, sr, rng, { at, dur: 0.008, tau: 0.0015, gain: gain * 0.8, type: 'bandpass', freq: rng.vary(4200 * pitch, 0.2), q: 1.2 });
  const f = rng.vary(2600 * pitch, 0.25);
  modes(out, sr, at, [
    { f, a: 1, d: rng.range(0.015, 0.035) },
    { f: f * rng.range(2.3, 2.9), a: 0.5, d: 0.012 },
    { f: f * rng.range(4.1, 5.3), a: 0.25, d: 0.008 },
  ], gain * 0.35, rng);
}

/** Dobradiça rangendo (às vezes não range: porta boa). */
function hinge(out: Float32Array, sr: number, rng: Rng, at: number, dur: number, gain: number): void {
  creak(out, sr, rng, {
    at,
    dur,
    gain,
    rate0: rng.range(22, 55),
    rate1: rng.range(55, 140),
    res: [
      { f: rng.range(650, 1100), q: 12, a: 1 },
      { f: rng.range(1500, 2400), q: 14, a: 0.6 },
      { f: rng.range(2900, 3900), q: 16, a: 0.3 },
    ],
  });
}

/** Porta de madeira batendo no batente: painel grande + trinco + batente chacoalhando. */
function slam(out: Float32Array, sr: number, rng: Rng, at: number, force: number): void {
  burst(out, sr, rng, { at, dur: 0.035, tau: 0.009, gain: force, type: 'lowpass', freq: rng.vary(900, 0.2), q: 0.7 });
  thump(out, sr, at, rng.vary(110, 0.15), 60, 0.12, force * 0.6);
  modes(out, sr, at, materialModes(rng, 'madeira', rng.range(2.2, 3), 0.1), force * 0.7, rng);
  click(out, sr, rng, at + rng.range(0.002, 0.008), force * 0.5, 0.9);
  const n = rng.int(1, 4);
  for (let i = 0; i < n; i++) click(out, sr, rng, at + rng.range(0.02, 0.08), force * rng.range(0.05, 0.15), rng.range(0.6, 1.2));
}

export const doorOpen: Recipe = (rng, sr) => {
  const out = buffer(1.3, sr);
  click(out, sr, rng, 0.01, 0.55);
  click(out, sr, rng, rng.range(0.06, 0.1), 0.4, 0.85);
  if (rng.chance(0.6)) hinge(out, sr, rng, 0.12, rng.range(0.35, 0.9), rng.range(0.25, 0.5));
  // Ar e madeira da folha se movendo.
  burst(out, sr, rng, { at: 0.1, dur: 0.5, tau: 0.2, gain: 0.06, type: 'lowpass', freq: 500, q: 0.6, color: 'pink' });
  return trim(finish(out, sr, 0.8), sr);
};

export const doorClose: Recipe = (rng, sr) => {
  const out = buffer(1.2, sr);
  let t = 0.02;
  if (rng.chance(0.45)) {
    const d = rng.range(0.15, 0.4);
    hinge(out, sr, rng, t, d, rng.range(0.2, 0.4));
    t += d * 0.9;
  }
  slam(out, sr, rng, t, rng.range(0.55, 1));
  return trim(finish(out, sr, 0.9), sr);
};

/** Maçaneta de porta trancada: sacode, a lingueta bate no batente. */
export const lockedRattle: Recipe = (rng, sr) => {
  const out = buffer(0.9, sr);
  const n = rng.int(3, 6);
  let t = 0.01;
  for (let i = 0; i < n; i++) {
    click(out, sr, rng, t, rng.range(0.4, 0.8), rng.range(0.85, 1.15));
    hit(out, sr, rng, { at: t + 0.004, m: 'madeira', gain: rng.range(0.15, 0.35), size: 1.6, hard: 0.6 });
    t += rng.range(0.06, 0.13);
  }
  return trim(finish(out, sr, 0.8), sr);
};

/** Portão de enrolar: lâminas de metal batendo em série + ronco do rolo. */
export const rollingGate: Recipe = (rng, sr) => {
  const dur = rng.range(1, 1.5);
  const out = buffer(dur + 0.6, sr);
  let t = 0.02;
  while (t < dur) {
    const rate = 14 + 18 * (t / dur) + rng.range(-3, 3);
    hit(out, sr, rng, { at: t, m: 'lataria', gain: rng.range(0.12, 0.3), size: rng.range(0.8, 1.4), hard: 0.8 });
    t += 1 / rate;
  }
  burst(out, sr, rng, { at: 0, dur, tau: dur, gain: 0.25, type: 'lowpass', freq: 300, q: 0.7, color: 'brown', attack: 0.1 });
  // Batida final no chão/topo.
  hit(out, sr, rng, { at: dur, m: 'lataria', gain: 0.9, size: 2.5, hard: 0.7 });
  return trim(finish(out, sr, 0.85), sr);
};

/** Zumbi batendo na porta: pancada surda (às vezes duas), madeira ou metal. */
export function doorBang(metal: boolean): Recipe {
  return (rng, sr) => {
    const out = buffer(1.2, sr);
    const n = rng.chance(0.4) ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const at = 0.01 + i * rng.range(0.18, 0.3);
      const f = rng.range(0.7, 1) * (i ? 0.7 : 1);
      if (metal) {
        hit(out, sr, rng, { at, m: 'lataria', gain: f, size: rng.range(2.4, 3.4), hard: 0.3 });
        thump(out, sr, at, 90, 50, 0.15, f * 0.6);
      } else {
        burst(out, sr, rng, { at, dur: 0.05, tau: 0.012, gain: f, type: 'lowpass', freq: 700, q: 0.7 });
        thump(out, sr, at, rng.vary(95, 0.15), 55, 0.14, f * 0.7);
        modes(out, sr, at, materialModes(rng, 'madeira', rng.range(2.4, 3.2), 0.2), f * 0.6, rng);
        click(out, sr, rng, at + 0.006, f * 0.2, 0.8);
      }
    }
    return trim(finish(out, sr, 0.95), sr);
  };
}

/** Barricada de tábuas levando pancada: tábuas chacoalham, pregos rangem. */
export const barricadeHit: Recipe = (rng, sr) => {
  const out = buffer(1, sr);
  thump(out, sr, 0.01, 100, 55, 0.12, 0.6);
  const n = rng.int(3, 6);
  for (let i = 0; i < n; i++) hit(out, sr, rng, { at: 0.01 + rng.range(0, 0.09), m: 'madeira', gain: rng.range(0.3, 0.7), size: rng.range(0.6, 1.4), hard: 0.5 });
  if (rng.chance(0.5)) creak(out, sr, rng, { at: 0.05, dur: 0.18, gain: 0.25, rate0: 90, rate1: 40, res: [{ f: rng.range(1800, 2600), q: 14, a: 1 }] });
  return trim(finish(out, sr, 0.9), sr);
};

/** Zumbi empurrando a porta: range e bate de leve. */
export const doorPushed: Recipe = (rng, sr) => {
  const out = buffer(1, sr);
  hinge(out, sr, rng, 0.02, rng.range(0.25, 0.5), 0.35);
  hit(out, sr, rng, { at: rng.range(0.25, 0.45), m: 'madeira', gain: 0.5, size: 2.6, hard: 0.3 });
  return trim(finish(out, sr, 0.8), sr);
};

/** Arrombar com pé de cabra: madeira forçando, estala e a porta cede. */
export const forceDoor: Recipe = (rng, sr) => {
  const out = buffer(1.6, sr);
  const strain = rng.range(0.4, 0.8);
  creak(out, sr, rng, { at: 0.02, dur: strain, gain: 0.45, rate0: rng.range(12, 22), rate1: rng.range(30, 60), res: [{ f: rng.range(280, 520), q: 6, a: 1 }, { f: rng.range(900, 1400), q: 8, a: 0.5 }] });
  // Metal da ferramenta rangendo na madeira.
  burst(out, sr, rng, { at: 0.05, dur: strain, tau: strain, gain: 0.08, type: 'bandpass', freq: 2600, q: 3, color: 'pink', attack: 0.1 });
  const snap = strain + 0.03;
  // Estalo: lascas de madeira (vários estalos agudos colados) + a porta pulando.
  const nc = rng.int(5, 10);
  for (let i = 0; i < nc; i++) burst(out, sr, rng, { at: snap + rng.range(0, 0.035), dur: 0.006, tau: 0.0015, gain: rng.range(0.4, 1), type: 'highpass', freq: rng.range(1200, 3500), q: 0.7 });
  modes(out, sr, snap, materialModes(rng, 'madeira', 0.5), 0.5, rng);
  slam(out, sr, rng, snap + rng.range(0.05, 0.12), 0.7);
  for (let i = 0; i < 8; i++) grain(out, sr, rng, snap + rng.range(0.05, 0.35), 0.004, rng.range(1500, 4500), 2, 0.15);
  return trim(finish(out, sr, 0.95), sr);
};

/** Porta de carro: trinco, e ao entrar/sair a batida "tunc" (chapa + borracha). */
export const carDoor: Recipe = (rng, sr) => {
  const out = buffer(1.4, sr);
  // Trinco de plástico/metal.
  burst(out, sr, rng, { at: 0.01, dur: 0.012, tau: 0.003, gain: 0.35, type: 'bandpass', freq: rng.vary(2200, 0.2), q: 1.4 });
  modes(out, sr, 0.01, [{ f: rng.range(1100, 1800), a: 1, d: 0.02 }], 0.2, rng);
  const t = rng.range(0.55, 0.95);
  burst(out, sr, rng, { at: t, dur: 0.06, tau: 0.016, gain: 1, type: 'lowpass', freq: rng.vary(420, 0.2), q: 0.8 });
  thump(out, sr, t, rng.vary(115, 0.15), 70, 0.1, 0.8);
  modes(out, sr, t, materialModes(rng, 'lataria', rng.range(1, 1.6), 0.55), 0.35, rng);
  click(out, sr, rng, t + 0.012, 0.25, 0.7);
  return trim(finish(out, sr, 0.9), sr);
};

/** Porta-malas: trinco pula, amortecedor chia, tampa sobe. */
export const trunk: Recipe = (rng, sr) => {
  const out = buffer(1.2, sr);
  click(out, sr, rng, 0.01, 0.6, 0.8);
  thump(out, sr, 0.02, 140, 90, 0.08, 0.35);
  burst(out, sr, rng, { at: 0.08, dur: 0.6, tau: 0.3, gain: 0.18, type: 'bandpass', freq: rng.vary(3000, 0.2), q: 0.7, color: 'pink', attack: 0.08 });
  modes(out, sr, 0.03, materialModes(rng, 'lataria', 1.4, 0.3), 0.25, rng);
  return trim(finish(out, sr, 0.8), sr);
};
