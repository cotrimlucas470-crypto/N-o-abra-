/**
 * CARROS (sons curtos): buzina, batida, pneu estourando, motor de arranque
 * girando, motor pegando, atropelo. O ronco contínuo do motor é ao vivo
 * (Ambience), porque muda com a velocidade.
 */
import { Biquad, burst, buffer, chain, finish, grain, type Rng, soft, thump, trim, TAU } from '../dsp';
import { windowBreak } from './glass';
import { hit } from './materials';

type Recipe = (rng: Rng, sr: number) => Float32Array;

/** Buzina: duas cornetas eletromagnéticas desafinadas (tom de carro de verdade), com a caixa ressoando. */
export const horn: Recipe = (rng, sr) => {
  const dur = rng.range(0.45, 0.8);
  const out = buffer(dur + 0.1, sr);
  const f1 = rng.range(380, 440);
  const f2 = f1 * rng.range(1.22, 1.27);
  let p1 = 0;
  let p2 = 0;
  const n = Math.round(dur * sr);
  for (let i = 0; i < n; i++) {
    p1 += f1 / sr;
    p2 += f2 / sr;
    // Onda de pulso estreita (diafragma batendo) = timbre metálico da buzina.
    const s1 = (p1 % 1) < 0.3 ? 1 : -0.4;
    const s2 = (p2 % 1) < 0.3 ? 1 : -0.4;
    const env = Math.min(1, i / (0.015 * sr)) * Math.min(1, (n - i) / (0.03 * sr));
    out[i] = (s1 + s2) * 0.3 * env;
  }
  // Corneta: realça 2–3 kHz, tira o grave de caixa e o áspero demais.
  chain(out, new Biquad(sr, 'peak', rng.range(2200, 2900), 1.2, 8), new Biquad(sr, 'highpass', 250, 0.7), new Biquad(sr, 'lowpass', 6000, 0.7));
  soft(out, 1.5);
  return trim(finish(out, sr, 0.8), sr);
};

/** Batida de carro: lataria amassando, vidro, plástico, baque. */
export const crash: Recipe = (rng, sr) => {
  const out = buffer(1.8, sr);
  thump(out, sr, 0.01, 80, 35, 0.3, 1);
  burst(out, sr, rng, { at: 0.01, dur: 0.4, tau: 0.1, gain: 0.8, type: 'lowpass', freq: 700, q: 0.7 });
  for (let i = 0; i < 18; i++) hit(out, sr, rng, { at: 0.01 + Math.pow(rng.next(), 2) * 0.4, m: rng.pick(['lataria', 'lataria', 'metal', 'plastico'] as const), gain: rng.range(0.2, 0.6), size: rng.range(0.6, 2), hard: 0.8 });
  if (rng.chance(0.5)) {
    const g = windowBreak(rng, sr);
    for (let i = 0; i < g.length && i + Math.round(0.03 * sr) < out.length; i++) out[i + Math.round(0.03 * sr)] = out[i + Math.round(0.03 * sr)]! + g[i]! * 0.35;
  }
  return trim(finish(out, sr, 0.95), sr);
};

/** Pneu estourando: estouro seco e o ar saindo. */
export const tireBlow: Recipe = (rng, sr) => {
  const out = buffer(1.4, sr);
  burst(out, sr, rng, { at: 0.004, dur: 0.02, tau: 0.004, gain: 1, type: 'lowpass', freq: 3000, q: 0.5 });
  thump(out, sr, 0.004, 140, 60, 0.1, 0.9);
  soft(out, 2);
  burst(out, sr, rng, { at: 0.02, dur: 1.1, tau: 0.35, gain: 0.3, type: 'bandpass', freq: 2500, freqEnd: 1200, q: 0.6 });
  return trim(finish(out, sr, 0.95), sr);
};

/** Motor de arranque girando sem pegar ("rrr-rrr-rrr"). */
export const starter: Recipe = (rng, sr) => {
  const dur = rng.range(0.9, 1.4);
  const out = buffer(dur + 0.2, sr);
  const n = Math.round(dur * sr);
  const rate = rng.range(4.5, 6.5);
  let ph = 0;
  let whine = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    ph += rate / sr;
    // Cada compressão do pistão freia o motor de arranque: pulsos.
    const pulse = Math.pow(0.5 + 0.5 * Math.sin(TAU * ph), 3);
    whine += (TAU * (260 + 60 * pulse)) / sr;
    out[i] = (rng.noise() * 0.35 + Math.sin(whine) * 0.25) * (0.4 + 0.6 * pulse) * Math.min(1, t * 20) * Math.min(1, (dur - t) * 15);
  }
  new Biquad(sr, 'lowpass', 2400, 0.7).run(out);
  burst(out, sr, rng, { at: 0, dur, tau: 1, gain: 0.3, type: 'lowpass', freq: 180, q: 0.8, color: 'brown', attack: 0.05 });
  return trim(finish(out, sr, 0.7), sr);
};

/** Motor pegando: arranque curto e a explosão da partida subindo de giro. */
export const engineStart: Recipe = (rng, sr) => {
  const out = buffer(2, sr);
  const s = starter(rng, sr);
  const k = Math.min(s.length, Math.round(0.5 * sr));
  for (let i = 0; i < k; i++) out[i] = out[i]! + s[i]! * 0.6;
  const t0 = 0.45;
  const n = Math.round(1.3 * sr);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    // Giro sobe (acelerada da partida) e assenta na lenta.
    const rpm = 700 + 1400 * Math.exp(-Math.pow((t - 0.25) / 0.2, 2)) + 200 * Math.exp(-t * 3);
    ph += ((rpm / 60) * 2) / sr;
    const p = ph % 1;
    const fire = Math.exp(-p * 18);
    const o = Math.round(t0 * sr) + i;
    if (o < out.length) out[o] = out[o]! + (fire * 0.8 + rng.noise() * 0.12 * fire) * Math.min(1, t * 12) * (1 - Math.max(0, t - 1.1) * 5);
  }
  soft(out, 1.8);
  return trim(finish(out, sr, 0.85), sr);
};

/** Carro batendo num zumbi: baque surdo no para-choque e o corpo. */
export const runOver: Recipe = (rng, sr) => {
  const out = buffer(0.9, sr);
  thump(out, sr, 0.005, 90, 40, 0.2, 1);
  hit(out, sr, rng, { at: 0.005, m: 'lataria', gain: 0.6, size: 1.6, hard: 0.3, damp: 0.6 });
  for (let i = 0; i < 8; i++) grain(out, sr, rng, 0.01 + rng.range(0, 0.08), rng.range(0.004, 0.01), rng.range(300, 1100), 3, rng.range(0.08, 0.2));
  thump(out, sr, rng.range(0.15, 0.3), 70, 40, 0.15, 0.5);
  return trim(finish(out, sr, 0.9), sr);
};
