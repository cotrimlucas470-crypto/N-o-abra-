/**
 * VIDRO: janela estourando (estalo, estilhaço e dezenas de cacos caindo e
 * quicando), vidro temperado de carro (esfarela em mil pedacinhos) e
 * pancada em vidro que não quebra.
 */
import { burst, buffer, finish, grain, modes, type Rng, thump, trim } from '../dsp';
import { materialModes } from './materials';

type Recipe = (rng: Rng, sr: number) => Float32Array;

/** Um caco: 2–3 modos bem agudos e curtos. */
function shard(out: Float32Array, sr: number, rng: Rng, at: number, gain: number): void {
  const f = rng.range(2400, 9000);
  modes(out, sr, at, [
    { f, a: 1, d: rng.range(0.012, 0.07) },
    { f: f * rng.range(1.5, 2.5), a: rng.range(0.3, 0.7), d: rng.range(0.008, 0.03) },
    { f: f * rng.range(2.8, 3.6), a: 0.2, d: 0.01 },
  ], gain, rng);
  burst(out, sr, rng, { at, dur: 0.004, tau: 0.001, gain: gain * 0.5, type: 'highpass', freq: 4000, q: 0.7 });
}

export const windowBreak: Recipe = (rng, sr) => {
  const out = buffer(1.8, sr);
  // Estalo do impacto e o painel vibrando antes de ceder.
  burst(out, sr, rng, { at: 0.005, dur: 0.012, tau: 0.0025, gain: 1, type: 'highpass', freq: 2500, q: 0.7 });
  modes(out, sr, 0.005, materialModes(rng, 'vidro', rng.range(1.6, 2.4)), 0.35, rng);
  thump(out, sr, 0.005, 160, 90, 0.05, 0.25);
  // Estilhaço: chiado claro que morre rápido.
  burst(out, sr, rng, { at: 0.012, dur: 0.3, tau: 0.07, gain: 0.7, type: 'bandpass', freq: rng.vary(5200, 0.15), q: 0.5 });
  // Cacos caindo: começam juntos e vão rareando; alguns quicam.
  const n = rng.int(38, 70);
  for (let i = 0; i < n; i++) {
    const at = 0.02 + Math.min(1.3, -Math.log(1 - rng.next() * 0.98) * rng.range(0.14, 0.22));
    const g = rng.range(0.15, 0.45) * Math.exp(-at * 1.6);
    shard(out, sr, rng, at, g);
    if (rng.chance(0.3)) shard(out, sr, rng, at + rng.range(0.03, 0.09), g * 0.4);
  }
  return trim(finish(out, sr, 0.9), sr);
};

/** Vidro temperado (carro): estoura e esfarela em pedrinhas. */
export const carGlass: Recipe = (rng, sr) => {
  const out = buffer(1.2, sr);
  burst(out, sr, rng, { at: 0.004, dur: 0.01, tau: 0.002, gain: 1, type: 'highpass', freq: 2000, q: 0.7 });
  burst(out, sr, rng, { at: 0.01, dur: 0.25, tau: 0.06, gain: 0.55, type: 'bandpass', freq: 6200, q: 0.6 });
  const n = rng.int(160, 260);
  for (let i = 0; i < n; i++) {
    const at = 0.01 + Math.pow(rng.next(), 2.2) * 0.6;
    grain(out, sr, rng, at, rng.range(0.0006, 0.0022), rng.range(3500, 11000), 3, rng.range(0.1, 0.35) * Math.exp(-at * 3));
  }
  for (let i = 0; i < 25; i++) shard(out, sr, rng, 0.02 + Math.pow(rng.next(), 1.5) * 0.7, rng.range(0.05, 0.15));
  return trim(finish(out, sr, 0.9), sr);
};

/** Pancada no vidro que não quebra: o painel vibra e chacoalha na moldura. */
export const glassKnock: Recipe = (rng, sr) => {
  const out = buffer(0.7, sr);
  burst(out, sr, rng, { at: 0.005, dur: 0.03, tau: 0.008, gain: 0.8, type: 'lowpass', freq: 900, q: 0.7 });
  modes(out, sr, 0.005, materialModes(rng, 'vidro', rng.range(3, 4.5), 0.2), 0.6, rng);
  for (let i = 0; i < 3; i++) modes(out, sr, 0.02 + rng.range(0, 0.06), [{ f: rng.range(1800, 3200), a: 1, d: 0.01 }], 0.1, rng);
  return trim(finish(out, sr, 0.85), sr);
};
