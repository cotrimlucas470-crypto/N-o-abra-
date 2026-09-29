/**
 * O CORPO DO JOGADOR e a mochila: dor, fôlego, coração, comer, beber, zíper,
 * pegar coisa do chão. Soam "de dentro" (sem distância) e baixos.
 */
import { Biquad, burst, buffer, finish, grain, modes, Pink, type Rng, TAU, thump, trim, voice } from '../dsp';

type Recipe = (rng: Rng, sr: number) => Float32Array;

/** Dor: gemido curto de quem levou o golpe ("uh!", "ah!", arfada). */
export const pain: Recipe = (rng, sr) => {
  const dur = rng.range(0.18, 0.45);
  const out = buffer(dur + 0.2, sr);
  const f = rng.range(125, 190);
  const open = rng.range(0.3, 0.9);
  voice(out, sr, rng, {
    at: 0.01,
    dur,
    gain: 0.9,
    f0: (t) => f * (1.15 - 0.3 * t),
    formants: () => [
      { f: 400 + 400 * open, q: 5, a: 1 },
      { f: 1000 + 400 * open, q: 6, a: 0.6 },
      { f: 2600, q: 8, a: 0.25 },
    ],
    env: (t) => Math.min(1, t * 25) * Math.pow(1 - t, 1.2),
    breath: 0.45,
    jitter: 1.2,
    shimmer: 0.4,
    fry: 0.3,
  });
  new Biquad(sr, 'highpass', 90, 0.7).run(out);
  return trim(finish(out, sr, 0.8), sr);
};

/** Fôlego: puxar o ar (agudo, subindo) e soltar (mais grave, caindo), com um pouco de voz no esforço. */
export const breath: Recipe = (rng, sr) => {
  const out = buffer(1.2, sr);
  const inD = rng.range(0.28, 0.4);
  const outD = rng.range(0.32, 0.48);
  burst(out, sr, rng, { at: 0.01, dur: inD, tau: 1, attack: inD * 0.7, gain: 0.5, type: 'bandpass', freq: rng.range(1500, 2200), freqEnd: rng.range(2200, 2900), q: 1.4, color: 'pink' });
  const t2 = 0.01 + inD + rng.range(0.03, 0.08);
  burst(out, sr, rng, { at: t2, dur: outD, tau: outD / 2.5, gain: 0.55, attack: 0.03, type: 'bandpass', freq: rng.range(900, 1300), freqEnd: rng.range(600, 800), q: 1.2, color: 'pink' });
  const vf = rng.range(110, 150);
  if (rng.chance(0.4))
    voice(out, sr, rng, {
      at: t2,
      dur: outD * 0.7,
      gain: 0.12,
      f0: () => vf,
      formants: () => [
        { f: 600, q: 4, a: 1 },
        { f: 1100, q: 5, a: 0.5 },
      ],
      env: (t) => Math.min(1, t * 10) * (1 - t),
      breath: 0.8,
      jitter: 1,
      shimmer: 0.4,
      fry: 0.4,
    });
  return trim(finish(out, sr, 0.6), sr);
};

/** Coração: "tum-tum" grave, ouvido por dentro. */
export const heartbeat: Recipe = (rng, sr) => {
  const out = buffer(0.6, sr);
  thump(out, sr, 0.005, rng.range(52, 60), 38, 0.11, 1);
  thump(out, sr, rng.range(0.24, 0.3), rng.range(62, 72), 42, 0.08, 0.65);
  new Biquad(sr, 'lowpass', 160, 0.7).run(out);
  return trim(finish(out, sr, 0.8), sr);
};

/** Comer: mordidas crocantes/molhadas, mastigar e engolir. */
export const eat: Recipe = (rng, sr) => {
  const chews = rng.int(3, 5);
  const out = buffer(chews * 0.32 + 0.6, sr);
  const crunchy = rng.chance(0.5);
  let t = 0.02;
  for (let i = 0; i < chews; i++) {
    const n = crunchy ? rng.int(6, 14) : rng.int(2, 5);
    for (let k = 0; k < n; k++) grain(out, sr, rng, t + rng.range(0, 0.06), rng.range(0.002, 0.006), rng.range(1200, 4200), 2, rng.range(0.1, 0.3) * (crunchy ? 1 : 0.5));
    burst(out, sr, rng, { at: t, dur: 0.12, tau: 0.04, gain: 0.35, type: 'lowpass', freq: rng.range(350, 600), q: 0.8 });
    t += rng.range(0.24, 0.34);
  }
  // Engolir: baque curto na garganta.
  thump(out, sr, t + 0.08, 160, 80, 0.07, 0.5);
  burst(out, sr, rng, { at: t + 0.08, dur: 0.08, tau: 0.03, gain: 0.25, type: 'bandpass', freq: 500, q: 1.5 });
  return trim(finish(out, sr, 0.7), sr);
};

/** Beber: goles ("glup") e o líquido mexendo. */
export const drink: Recipe = (rng, sr) => {
  const gulps = rng.int(2, 4);
  const out = buffer(gulps * 0.45 + 0.4, sr);
  let t = 0.05;
  const pink = new Pink(rng);
  const slosh = new Biquad(sr, 'bandpass', rng.range(900, 1500), 1.5);
  for (let i = 0; i < out.length; i++) {
    const a = 0.5 + 0.5 * Math.sin((TAU * 7 * i) / sr + Math.sin((TAU * 1.3 * i) / sr) * 3);
    out[i] = slosh.process(pink.next()) * 0.05 * a;
  }
  for (let i = 0; i < gulps; i++) {
    thump(out, sr, t, rng.range(170, 230), rng.range(80, 110), 0.08, 0.7);
    burst(out, sr, rng, { at: t + 0.005, dur: 0.06, tau: 0.02, gain: 0.35, type: 'bandpass', freq: rng.range(450, 800), q: 2 });
    t += rng.range(0.38, 0.5);
  }
  return trim(finish(out, sr, 0.7), sr);
};

/** Zíper da mochila: os dentes passando rápido (trem de estalinhos). */
export const zipper: Recipe = (rng, sr) => {
  const dur = rng.range(0.28, 0.5);
  const out = buffer(dur + 0.1, sr);
  const rate0 = rng.range(60, 90);
  const rate1 = rng.range(110, 170);
  let t = 0.005;
  while (t < dur) {
    const k = t / dur;
    grain(out, sr, rng, t, 0.0025, rng.range(2500, 5500), 2.5, 0.3 + 0.2 * Math.sin(Math.PI * k));
    t += 1 / (rate0 + (rate1 - rate0) * Math.sin(Math.PI * k));
  }
  burst(out, sr, rng, { at: 0.005, dur, tau: 1, gain: 0.08, type: 'bandpass', freq: 3000, q: 0.8, color: 'pink' });
  return trim(finish(out, sr, 0.6), sr);
};

/** Pegar do chão: roupa mexendo e a coisinha batendo (plástico, metal ou madeira). */
export const pickup: Recipe = (rng, sr) => {
  const out = buffer(0.5, sr);
  burst(out, sr, rng, { at: 0.005, dur: 0.18, tau: 0.07, gain: 0.3, attack: 0.03, type: 'bandpass', freq: rng.range(1800, 3200), q: 0.8, color: 'pink' });
  const f = rng.range(900, 3200);
  modes(out, sr, rng.range(0.06, 0.12), [{ f, a: 1, d: rng.range(0.03, 0.12) }, { f: f * rng.range(2.1, 2.9), a: 0.4, d: 0.04 }], 0.25, rng);
  return trim(finish(out, sr, 0.55), sr);
};
