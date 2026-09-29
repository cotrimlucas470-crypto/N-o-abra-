/**
 * COMBATE CORPO A CORPO: o ar deslocado pelo golpe (pelo peso da arma) e o
 * que o golpe acerta — carne (seco ou cortante, com osso às vezes), madeira,
 * metal, concreto, vidro — e o corpo caindo no chão.
 */
import { burst, buffer, finish, grain, modes, type Rng, thump, trim } from '../dsp';
import { hit, type Material } from './materials';

type Recipe = (rng: Rng, sr: number) => Float32Array;

export type Weight = 'leve' | 'medio' | 'pesado';

/** Golpe cortando o ar: sobe e desce de tom (passa perto e vai embora). */
export function whoosh(w: Weight): Recipe {
  const k = w === 'leve' ? 1.6 : w === 'medio' ? 1 : 0.7;
  const dur = w === 'leve' ? 0.14 : w === 'medio' ? 0.22 : 0.32;
  return (rng, sr) => {
    const out = buffer(dur + 0.1, sr);
    const f0 = rng.vary(500 * k, 0.15);
    const fm = rng.vary(1600 * k, 0.15);
    const half = dur * rng.range(0.45, 0.6);
    burst(out, sr, rng, { at: 0, dur: half, tau: 1, gain: 0.5, attack: half * 0.8, type: 'bandpass', freq: f0, freqEnd: fm, q: 1.1, color: 'pink' });
    burst(out, sr, rng, { at: half, dur: dur - half, tau: (dur - half) / 3, gain: 0.5, type: 'bandpass', freq: fm, freqEnd: f0 * 0.8, q: 1.1, color: 'pink' });
    if (w === 'pesado') burst(out, sr, rng, { at: 0, dur, tau: dur / 2, gain: 0.35, attack: half, type: 'lowpass', freq: 260, q: 0.9, color: 'brown' });
    return trim(finish(out, sr, 0.7), sr);
  };
}

export type FleshHit = 'contundente' | 'corte' | 'perfuracao' | 'soco';

/** Golpe em carne: baque do corpo, tapa, parte molhada e, às vezes, osso. */
export function fleshHit(kind: FleshHit): Recipe {
  return (rng, sr) => {
    const out = buffer(0.5, sr);
    const force = kind === 'soco' ? rng.range(0.5, 0.7) : rng.range(0.75, 1);
    if (kind === 'contundente' || kind === 'soco') {
      thump(out, sr, 0.004, rng.vary(kind === 'soco' ? 120 : 95, 0.15), 45, rng.range(0.08, 0.13), force);
      burst(out, sr, rng, { at: 0.002, dur: 0.06, tau: 0.014, gain: force * 0.8, type: 'lowpass', freq: rng.vary(650, 0.2), q: 0.8 });
      burst(out, sr, rng, { at: 0.002, dur: 0.03, tau: 0.005, gain: force * 0.55, type: 'bandpass', freq: rng.vary(1400, 0.25), q: 0.9 });
      // Osso estalando (golpe forte, às vezes).
      if (kind === 'contundente' && rng.chance(0.3)) {
        const n = rng.int(2, 5);
        for (let i = 0; i < n; i++) burst(out, sr, rng, { at: 0.006 + rng.range(0, 0.02), dur: 0.004, tau: 0.001, gain: rng.range(0.3, 0.6), type: 'highpass', freq: rng.range(2000, 4000), q: 0.7 });
        modes(out, sr, 0.008, [{ f: rng.range(1600, 2800), a: 1, d: 0.012 }], 0.25, rng);
      }
    } else {
      // Lâmina: chiado que sobe (corta), baque menor.
      burst(out, sr, rng, { at: 0, dur: 0.08, tau: 0.025, gain: force * 0.6, type: 'bandpass', freq: rng.vary(kind === 'corte' ? 2400 : 1600, 0.2), freqEnd: rng.vary(kind === 'corte' ? 5600 : 3000, 0.2), q: 1.4 });
      thump(out, sr, 0.004, rng.vary(130, 0.2), 70, 0.07, force * 0.5);
    }
    // Molhado: estalinhos graves (carne e sangue).
    const wet = kind === 'soco' ? 3 : rng.int(6, 12);
    for (let i = 0; i < wet; i++) grain(out, sr, rng, 0.01 + rng.range(0, 0.08), rng.range(0.004, 0.012), rng.range(300, 1100), 3, force * rng.range(0.08, 0.2));
    return trim(finish(out, sr, 0.9), sr);
  };
}

/** Golpe num objeto duro (arma na madeira, no metal, na parede...). */
export function objectHit(m: Material, size = 1): Recipe {
  return (rng, sr) => {
    const out = buffer(m === 'metal' ? 1.4 : 0.6, sr);
    hit(out, sr, rng, { at: 0.004, m, gain: 1, size: rng.vary(size, 0.3), hard: 0.8 });
    if (m === 'madeira' && rng.chance(0.35)) {
      for (let i = 0; i < 4; i++) burst(out, sr, rng, { at: 0.006 + rng.range(0, 0.02), dur: 0.005, tau: 0.0012, gain: rng.range(0.2, 0.4), type: 'highpass', freq: 2500, q: 0.7 });
    }
    if (m === 'concreto') for (let i = 0; i < 10; i++) grain(out, sr, rng, 0.01 + Math.pow(rng.next(), 1.5) * 0.2, 0.003, rng.range(1500, 5000), 2, rng.range(0.05, 0.15));
    return trim(finish(out, sr, 0.9), sr);
  };
}

/** Corpo caindo no chão: baque grave, depois braços/pernas e a roupa. */
export const bodyFall: Recipe = (rng, sr) => {
  const out = buffer(0.9, sr);
  thump(out, sr, 0.01, rng.vary(75, 0.15), 38, rng.range(0.22, 0.3), 1);
  burst(out, sr, rng, { at: 0.01, dur: 0.2, tau: 0.05, gain: 0.7, type: 'lowpass', freq: 420, q: 0.7 });
  const t2 = rng.range(0.1, 0.2);
  thump(out, sr, t2, 90, 50, 0.12, 0.45);
  burst(out, sr, rng, { at: t2, dur: 0.08, tau: 0.02, gain: 0.3, type: 'lowpass', freq: 600, q: 0.7 });
  burst(out, sr, rng, { at: 0.02, dur: 0.35, tau: 0.12, gain: 0.08, type: 'bandpass', freq: 2200, q: 0.6, color: 'pink' });
  return trim(finish(out, sr, 0.9), sr);
};
