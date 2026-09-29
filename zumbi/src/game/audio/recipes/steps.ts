/**
 * PASSOS: calcanhar e ponta do pé, cada chão do seu jeito. O intervalo entre
 * os dois e a força mudam com o andar (furtivo rola o pé devagar; correndo
 * bate forte e curto). Cada variação sorteia força, timbre, número de grãos
 * e se o assoalho range — nenhum passo sai igual ao outro.
 */
import { burst, buffer, creak, finish, grain, modes, Rng, thump, trim, TAU } from '../dsp';
import { hit, materialModes } from './materials';

export type Surface = 'grama' | 'terra' | 'cascalho' | 'asfalto' | 'calcada' | 'garagem' | 'madeira' | 'ceramica' | 'carpete' | 'neve' | 'neveFunda' | 'molhado' | 'agua' | 'escada';
export type Gait = 'furtivo' | 'passo' | 'corrida';

export const SURFACES: readonly Surface[] = ['grama', 'terra', 'cascalho', 'asfalto', 'calcada', 'garagem', 'madeira', 'ceramica', 'carpete', 'neve', 'neveFunda', 'molhado', 'agua', 'escada'];
export const GAITS: readonly Gait[] = ['furtivo', 'passo', 'corrida'];

interface Foot {
  /** Força 0..1. */
  s: number;
  /** Início do calcanhar e da ponta (s). */
  heel: number;
  toe: number;
  /** Arrasto no fim (corrida/furtivo). */
  scuff: number;
}

function gaitFoot(rng: Rng, g: Gait): Foot {
  if (g === 'furtivo') return { s: rng.range(0.28, 0.4), heel: 0.004, toe: rng.range(0.12, 0.18), scuff: rng.range(0.25, 0.5) };
  if (g === 'corrida') return { s: rng.range(0.85, 1), heel: 0.003, toe: rng.range(0.035, 0.055), scuff: rng.range(0.3, 0.7) };
  return { s: rng.range(0.6, 0.75), heel: 0.004, toe: rng.range(0.065, 0.1), scuff: rng.range(0.1, 0.3) };
}

/** Chiado curto e tonal (neve fria "range" sob o pé; bolha estourando). */
function chirp(out: Float32Array, sr: number, at: number, f0: number, f1: number, dur: number, gain: number): void {
  const start = Math.round(at * sr);
  const n = Math.round(dur * sr);
  let ph = 0;
  for (let i = 0; i < n && start + i < out.length; i++) {
    const t = i / n;
    ph += (TAU * (f0 + (f1 - f0) * t)) / sr;
    const env = Math.sin(Math.PI * t) * Math.exp(-t * 2);
    out[start + i] = out[start + i]! + Math.sin(ph) * env * gain;
  }
}

/** Chão duro (asfalto, calçada, concreto): estalo do salto, baque e areia. */
function hard(out: Float32Array, sr: number, rng: Rng, f: Foot, o: { tone: number; grit: number; ring: number }): void {
  const at = (t: number, k: number) => {
    burst(out, sr, rng, { at: t, dur: 0.02, tau: 0.0035, gain: f.s * k * 0.9, type: 'bandpass', freq: rng.vary(2400 * o.tone, 0.25), q: 0.8 });
    burst(out, sr, rng, { at: t, dur: 0.05, tau: 0.011, gain: f.s * k * 0.75, type: 'lowpass', freq: rng.vary(420 * o.tone, 0.2), q: 0.8 });
    thump(out, sr, t, rng.vary(100, 0.15), 58, 0.05, f.s * k * 0.35);
    // Areia/pedrinha debaixo da sola.
    const ng = Math.round(o.grit * rng.range(4, 12));
    for (let i = 0; i < ng; i++) grain(out, sr, rng, t + rng.range(0, 0.045), rng.range(0.0015, 0.004), rng.range(2800, 7500), 2, f.s * k * rng.range(0.05, 0.16));
    if (o.ring > 0) modes(out, sr, t, materialModes(rng, 'concreto', 0.8), f.s * k * o.ring, rng);
  };
  at(f.heel, 1);
  at(f.toe, rng.range(0.4, 0.6));
  // Sola arrastando.
  burst(out, sr, rng, { at: f.toe + 0.01, dur: 0.07, tau: 0.022, gain: f.s * f.scuff * 0.22, type: 'bandpass', freq: 1800 * o.tone, freqEnd: 3400 * o.tone, q: 0.7, color: 'pink' });
}

/** Chão macio que se esmaga (grama, neve): nuvem de grãos + baque abafado. */
function crush(
  out: Float32Array,
  sr: number,
  rng: Rng,
  f: Foot,
  o: { grains: number; f0: number; f1: number; spread: number; thud: number; q: number; squeak: number },
): void {
  const step = (t: number, k: number) => {
    const n = Math.round(o.grains * k * rng.range(0.8, 1.2));
    for (let i = 0; i < n; i++) {
      // Mais grãos no começo (o peso chega de uma vez e vai assentando).
      const u = Math.pow(rng.next(), 1.8);
      grain(out, sr, rng, t + u * o.spread, rng.range(0.0015, 0.0055), rng.range(o.f0, o.f1), o.q, f.s * k * rng.range(0.08, 0.3));
    }
    burst(out, sr, rng, { at: t, dur: 0.07, tau: 0.02, gain: f.s * k * o.thud, type: 'lowpass', freq: rng.vary(260, 0.2), q: 0.7 });
    if (o.squeak > 0 && rng.chance(o.squeak)) {
      const fs = rng.range(900, 1700);
      chirp(out, sr, t + rng.range(0.01, o.spread * 0.7), fs, fs * rng.range(1.15, 1.5), rng.range(0.015, 0.035), f.s * k * 0.12);
    }
  };
  step(f.heel, 1);
  step(f.toe, 0.55);
}

export function footstep(surface: Surface, gait: Gait): (rng: Rng, sr: number) => Float32Array {
  return (rng, sr) => {
    const out = buffer(0.5, sr);
    const f = gaitFoot(rng, gait);
    switch (surface) {
      case 'asfalto':
        hard(out, sr, rng, f, { tone: 0.8, grit: 1.2, ring: 0 });
        break;
      case 'calcada':
        hard(out, sr, rng, f, { tone: 1.05, grit: 0.6, ring: 0.15 });
        break;
      case 'garagem':
        hard(out, sr, rng, f, { tone: 1, grit: 0.3, ring: 0.2 });
        break;
      case 'grama':
        crush(out, sr, rng, f, { grains: 38, f0: 2600, f1: 8500, spread: 0.09, thud: 0.45, q: 1.6, squeak: 0 });
        burst(out, sr, rng, { at: f.heel, dur: 0.1, tau: 0.035, gain: f.s * 0.1, type: 'bandpass', freq: 4200, q: 0.5, color: 'pink' });
        break;
      case 'terra':
        burst(out, sr, rng, { at: f.heel, dur: 0.06, tau: 0.016, gain: f.s * 0.8, type: 'lowpass', freq: rng.vary(560, 0.2), q: 0.8 });
        thump(out, sr, f.heel, rng.vary(85, 0.15), 50, 0.06, f.s * 0.35);
        crush(out, sr, rng, f, { grains: 14, f0: 900, f1: 3200, spread: 0.06, thud: 0.3, q: 1.2, squeak: 0 });
        burst(out, sr, rng, { at: f.toe, dur: 0.08, tau: 0.03, gain: f.s * f.scuff * 0.25, type: 'bandpass', freq: 1500, q: 0.7, color: 'pink' });
        break;
      case 'cascalho': {
        crush(out, sr, rng, f, { grains: 44, f0: 1100, f1: 5200, spread: 0.1, thud: 0.3, q: 1.6, squeak: 0 });
        // Pedrinhas batendo umas nas outras.
        const np = rng.int(6, 13);
        for (let i = 0; i < np; i++) {
          const fp = rng.range(2200, 6200);
          modes(out, sr, f.heel + Math.pow(rng.next(), 1.5) * 0.12, [{ f: fp, a: 1, d: rng.range(0.006, 0.018) }, { f: fp * rng.range(1.6, 2.3), a: 0.5, d: 0.006 }], f.s * rng.range(0.05, 0.14), rng);
        }
        break;
      }
      case 'madeira':
      case 'escada': {
        const stairs = surface === 'escada';
        const knock = (t: number, k: number) => hit(out, sr, rng, { at: t, m: 'madeira', gain: f.s * k, size: stairs ? rng.range(1.2, 1.6) : rng.range(0.9, 1.3), hard: 0.45 });
        knock(f.heel, stairs ? 1.1 : 0.9);
        knock(f.toe, 0.45);
        burst(out, sr, rng, { at: f.toe + 0.01, dur: 0.06, tau: 0.02, gain: f.s * f.scuff * 0.15, type: 'bandpass', freq: 1900, q: 0.8, color: 'pink' });
        // Tábua rangendo com o peso (às vezes).
        if (rng.chance(stairs ? 0.4 : gait === 'furtivo' ? 0.3 : 0.18)) {
          creak(out, sr, rng, {
            at: f.toe + rng.range(0, 0.04),
            dur: rng.range(0.12, 0.28),
            gain: f.s * rng.range(0.25, 0.45),
            rate0: rng.range(50, 110),
            rate1: rng.range(25, 70),
            res: [
              { f: rng.range(480, 900), q: 9, a: 1 },
              { f: rng.range(1300, 2100), q: 11, a: 0.45 },
            ],
          });
        }
        break;
      }
      case 'ceramica': {
        const clack = (t: number, k: number) => {
          burst(out, sr, rng, { at: t, dur: 0.012, tau: 0.0022, gain: f.s * k, type: 'bandpass', freq: rng.vary(3600, 0.2), q: 1 });
          modes(out, sr, t, materialModes(rng, 'ceramica', rng.range(0.8, 1.2)), f.s * k * 0.28, rng);
          burst(out, sr, rng, { at: t, dur: 0.04, tau: 0.009, gain: f.s * k * 0.45, type: 'lowpass', freq: 320, q: 0.8 });
        };
        clack(f.heel, 1);
        clack(f.toe, 0.5);
        break;
      }
      case 'carpete':
        for (const [t, k] of [
          [f.heel, 1],
          [f.toe, 0.6],
        ] as const) {
          burst(out, sr, rng, { at: t, dur: 0.07, tau: 0.022, gain: f.s * k * 0.85, type: 'lowpass', freq: rng.vary(330, 0.2), q: 0.7 });
          burst(out, sr, rng, { at: t, dur: 0.09, tau: 0.03, gain: f.s * k * 0.1, type: 'bandpass', freq: 1300, q: 0.6, color: 'pink' });
        }
        break;
      case 'neve':
        crush(out, sr, rng, f, { grains: 55, f0: 700, f1: 3200, spread: 0.1, thud: 0.4, q: 2.6, squeak: 0.55 });
        break;
      case 'neveFunda':
        crush(out, sr, rng, f, { grains: 85, f0: 500, f1: 2600, spread: 0.2, thud: 0.6, q: 2.4, squeak: 0.35 });
        break;
      case 'molhado':
        hard(out, sr, rng, f, { tone: 0.85, grit: 0.3, ring: 0 });
        splash(out, sr, rng, f.heel, f.s * 0.35, 2);
        break;
      case 'agua':
        splash(out, sr, rng, f.heel, f.s, rng.int(4, 8));
        splash(out, sr, rng, f.toe, f.s * 0.5, rng.int(2, 4));
        break;
    }
    return trim(finish(out, sr, 0.9), sr);
  };
}

/** Pé na água: tapa, chuá e gotas (bolhas que sobem de tom). */
export function splash(out: Float32Array, sr: number, rng: Rng, at: number, s: number, drops: number): void {
  burst(out, sr, rng, { at, dur: 0.14, tau: 0.035, gain: s * 0.55, type: 'bandpass', freq: rng.vary(2300, 0.2), q: 0.5 });
  burst(out, sr, rng, { at, dur: 0.04, tau: 0.008, gain: s * 0.45, type: 'lowpass', freq: 480, q: 0.8 });
  for (let i = 0; i < drops; i++) {
    const f0 = rng.range(700, 1800);
    chirp(out, sr, at + rng.range(0.02, 0.26), f0, f0 * rng.range(1.6, 2.6), rng.range(0.012, 0.03), s * rng.range(0.06, 0.16));
  }
}

