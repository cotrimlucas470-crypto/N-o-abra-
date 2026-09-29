/**
 * ZUMBIS: voz pelo modelo fonte-filtro (pulso da glote + formantes da boca),
 * com a garganta estragada: voz rouca e quebrada (fry), ar demais, tremor, e
 * líquido na garganta (gorgolejo). Cada semente é uma garganta diferente; o
 * diretor dá a cada zumbi as suas variações e a sua altura, sempre as mesmas.
 */
import { Biquad, burst, buffer, finish, grain, modes, type Rng, soft, thump, trim, voice } from '../dsp';

type Recipe = (rng: Rng, sr: number) => Float32Array;

export type ZombieVoice = 'gemido' | 'rosnado' | 'ataque' | 'morte';

/** Gorgolejo: bolhas graves irregulares (sangue/saliva na garganta). */
function gurgle(out: Float32Array, sr: number, rng: Rng, at: number, dur: number, perSec: number, gain: number): void {
  const n = Math.round(dur * perSec);
  for (let i = 0; i < n; i++) grain(out, sr, rng, at + rng.range(0, dur), rng.range(0.008, 0.025), rng.range(160, 520), rng.range(2, 5), gain * rng.range(0.4, 1));
}

/** Formantes de uma vogal (boca mais ou menos aberta), com o tamanho da garganta. */
function vowel(open: number, size: number): { f: number; q: number; a: number }[] {
  const k = 1 / size;
  return [
    { f: (380 + 380 * open) * k, q: 5, a: 1 },
    { f: (800 + 500 * open) * k, q: 6, a: 0.65 },
    { f: 2450 * k, q: 8, a: 0.3 },
    { f: 3300 * k, q: 9, a: 0.12 },
  ];
}

export function zombieVoice(kind: ZombieVoice): Recipe {
  return (rng, sr) => {
    const size = rng.range(0.9, 1.15);
    const base = rng.range(80, 135) / size;
    const drift = rng.range(-0.18, 0.05);
    const wob = rng.range(0.5, 1.2);
    let dur: number;
    let f0: (t: number) => number;
    let open: (t: number) => number;
    let env: (t: number) => number;
    let breath: number;
    let fry: number;
    let jitter: number;
    if (kind === 'gemido') {
      // Gemido: "uhhh" longo e oscilante, sem pressa.
      dur = rng.range(1.1, 2.2);
      f0 = (t) => base * (1 + drift * t) * (1 + 0.07 * Math.sin(6.28 * wob * t * dur));
      open = (t) => 0.2 + 0.25 * Math.sin(3.14 * t);
      env = (t) => Math.min(1, t * 5) * Math.pow(1 - t, 0.7) * (0.8 + 0.2 * Math.sin(6.28 * 3 * t));
      breath = 0.4;
      fry = 0.7;
      jitter = 1.6;
    } else if (kind === 'rosnado') {
      // Rosnado de quem viu a presa: boca aberta, garganta rasgando, tremendo rápido.
      dur = rng.range(0.6, 1.2);
      const b2 = base * rng.range(1.2, 1.45);
      f0 = (t) => b2 * (1 + 0.15 * Math.sin(3.14 * t)) * (1 + drift * 0.5 * t);
      open = () => 0.75;
      const flutter = rng.range(18, 30);
      env = (t) => Math.min(1, t * 14) * Math.pow(1 - t, 0.5) * (0.7 + 0.3 * Math.sin(6.28 * flutter * t * dur));
      breath = 0.65;
      fry = 1.6;
      jitter = 3;
    } else if (kind === 'ataque') {
      // Bote: bufada rouca subindo, curta.
      dur = rng.range(0.32, 0.55);
      const b2 = base * rng.range(1.5, 1.9);
      f0 = (t) => b2 * (1 + 0.35 * t);
      open = (t) => 0.6 + 0.4 * t;
      env = (t) => Math.min(1, t * 20) * Math.pow(1 - t, 0.8);
      breath = 1.1;
      fry = 1.2;
      jitter = 3.5;
    } else {
      // Morte: a voz cai e se afoga, último ar saindo.
      dur = rng.range(1.1, 1.7);
      f0 = (t) => base * (1.15 - 0.6 * t);
      open = (t) => 0.6 - 0.45 * t;
      env = (t) => Math.min(1, t * 10) * Math.pow(1 - t, 1.3);
      breath = 0.8;
      fry = 2;
      jitter = 2.5;
    }
    const out = buffer(dur + 0.5, sr);
    // Às vezes puxa o ar antes (chiado de dentro para fora).
    let at = 0.01;
    if (kind !== 'ataque' && rng.chance(0.35)) {
      burst(out, sr, rng, { at, dur: 0.3, tau: 1, attack: 0.25, gain: 0.18, type: 'bandpass', freq: rng.range(1400, 2600), q: 1.2, color: 'pink' });
      at += 0.28;
    }
    voice(out, sr, rng, { at, dur, gain: 0.9, f0, formants: (t) => vowel(open(t), size), env, breath, jitter, shimmer: 0.7, fry });
    gurgle(out, sr, rng, at, dur, kind === 'morte' ? 28 : kind === 'gemido' ? 12 : 6, kind === 'morte' ? 0.35 : 0.18);
    if (kind === 'ataque') burst(out, sr, rng, { at, dur: dur * 0.8, tau: dur / 3, gain: 0.25, type: 'bandpass', freq: rng.range(3500, 5500), q: 1.2 });
    soft(out, kind === 'gemido' ? 1.4 : 2.2);
    new Biquad(sr, 'highpass', 70, 0.7).run(out);
    // Som de garganta, não de chiado: gemido e morte bem escuros, rosnado um pouco mais aberto.
    if (kind !== 'ataque') new Biquad(sr, 'lowpass', kind === 'rosnado' ? 4500 : 2700, 0.6).run(out);
    return trim(finish(out, sr, 0.85), sr);
  };
}

/** Mordida: dentes batendo, carne rasgando (tremido), o molhado e o grunhido abafado. */
export const zombieBite: Recipe = (rng, sr) => {
  const out = buffer(0.9, sr);
  modes(out, sr, 0.01, [{ f: rng.range(2200, 3200), a: 1, d: 0.02 }, { f: rng.range(4200, 5200), a: 0.5, d: 0.012 }], 0.35, rng);
  thump(out, sr, 0.012, 140, 70, 0.06, 0.6);
  const tears = rng.int(3, 5);
  for (let i = 0; i < tears; i++) {
    const at = 0.05 + i * rng.range(0.05, 0.09);
    burst(out, sr, rng, { at, dur: 0.07, tau: 0.02, gain: rng.range(0.4, 0.8), type: 'bandpass', freq: rng.range(900, 2400), q: 1.1 });
    grain(out, sr, rng, at + 0.01, 0.02, rng.range(300, 700), 3, 0.3);
  }
  for (let i = 0; i < 10; i++) grain(out, sr, rng, rng.range(0.05, 0.45), rng.range(0.01, 0.03), rng.range(200, 600), 4, rng.range(0.1, 0.3));
  const bf = rng.range(90, 120);
  voice(out, sr, rng, {
    at: 0.08,
    dur: 0.45,
    gain: 0.35,
    f0: () => bf,
    formants: () => [
      { f: 350, q: 4, a: 1 },
      { f: 700, q: 5, a: 0.4 },
    ],
    env: (t) => Math.min(1, t * 8) * (1 - t),
    breath: 0.5,
    jitter: 3,
    shimmer: 0.8,
    fry: 2,
  });
  return trim(finish(out, sr, 0.9), sr);
};

/** Agarrão: mão na roupa (pano puxado), tapa no corpo e um grunhido. */
export const zombieGrab: Recipe = (rng, sr) => {
  const out = buffer(0.7, sr);
  burst(out, sr, rng, { at: 0.005, dur: 0.18, tau: 0.06, gain: 0.6, attack: 0.01, type: 'bandpass', freq: rng.range(2000, 3800), q: 0.8, color: 'pink' });
  thump(out, sr, 0.01, 120, 60, 0.07, 0.5);
  burst(out, sr, rng, { at: 0.01, dur: 0.04, tau: 0.01, gain: 0.5, type: 'lowpass', freq: 900, q: 0.8 });
  const gf = rng.range(110, 150);
  voice(out, sr, rng, {
    at: 0.06,
    dur: rng.range(0.3, 0.45),
    gain: 0.5,
    f0: (t) => gf * (1 + 0.2 * t),
    formants: () => vowel(0.6, 1),
    env: (t) => Math.min(1, t * 12) * (1 - t),
    breath: 0.8,
    jitter: 3,
    shimmer: 0.7,
    fry: 1.5,
  });
  return trim(finish(out, sr, 0.85), sr);
};

/** Passo de zumbi: pé arrastando (raspa) e o calcanhar mole caindo. */
export const zombieStep: Recipe = (rng, sr) => {
  const out = buffer(0.5, sr);
  const drag = rng.range(0.12, 0.28);
  if (rng.chance(0.65)) thump(out, sr, 0.005, rng.range(80, 110), 55, 0.07, 0.5);
  burst(out, sr, rng, { at: 0.02, dur: drag, tau: 1, attack: drag * 0.6, gain: 0.35, type: 'bandpass', freq: rng.range(700, 1500), freqEnd: rng.range(500, 900), q: 0.9, color: 'pink' });
  for (let i = 0; i < 8; i++) grain(out, sr, rng, 0.02 + rng.range(0, drag), 0.002, rng.range(1500, 4000), 2, rng.range(0.04, 0.12));
  return trim(finish(out, sr, 0.7), sr);
};

/** Rastejante: o corpo arrastando no chão e a mão batendo à frente. */
export const zombieCrawl: Recipe = (rng, sr) => {
  const out = buffer(0.9, sr);
  thump(out, sr, 0.01, 110, 60, 0.06, 0.6);
  burst(out, sr, rng, { at: 0.01, dur: 0.04, tau: 0.01, gain: 0.5, type: 'lowpass', freq: 1200, q: 0.7 });
  burst(out, sr, rng, { at: 0.08, dur: rng.range(0.4, 0.6), tau: 1, attack: 0.2, gain: 0.45, type: 'bandpass', freq: rng.range(400, 800), q: 0.8, color: 'brown' });
  burst(out, sr, rng, { at: 0.1, dur: 0.45, tau: 1, attack: 0.25, gain: 0.2, type: 'bandpass', freq: rng.range(1500, 2500), q: 0.8, color: 'pink' });
  return trim(finish(out, sr, 0.75), sr);
};
