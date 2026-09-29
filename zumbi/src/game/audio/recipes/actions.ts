/**
 * AÇÕES, ITENS, SINTOMAS, CASA E ESTRADA: pano, rasgar, página, fritura,
 * ferramenta, água, combustível, afiar, fósforo, cavar, escalar, equipamento
 * chacoalhando, largar coisa, sacar arma; barriga, tosse, tremor, bocejo,
 * vômito, zumbido no ouvido; ar da casa, rangido, geladeira, cigarras,
 * cachorro ao longe; rodagem, derrapagem, troca de marcha.
 */
import { Biquad, Brown, burst, buffer, creak, finish, grain, loopify, modes, normalize, Pink, type Rng, TAU, thump, trim, voice } from '../dsp';
import { hit } from './materials';

type Recipe = (rng: Rng, sr: number) => Float32Array;

// ---------------------------------------------------------------- ações

/** Pano: mexer, dobrar, enrolar (atadura, roupa, costura). */
export const cloth: Recipe = (rng, sr) => {
  const out = buffer(0.8, sr);
  const n = rng.int(2, 4);
  for (let i = 0; i < n; i++) burst(out, sr, rng, { at: rng.range(0, 0.4), dur: rng.range(0.12, 0.25), tau: 0.08, attack: 0.04, gain: rng.range(0.3, 0.6), type: 'bandpass', freq: rng.range(1800, 4200), q: 0.7, color: 'pink' });
  return trim(finish(out, sr, 0.5), sr);
};

/** Rasgar tecido: fibras estourando em sequência rápida. */
export const tear: Recipe = (rng, sr) => {
  const dur = rng.range(0.3, 0.6);
  const out = buffer(dur + 0.1, sr);
  let t = 0.01;
  while (t < dur) {
    grain(out, sr, rng, t, rng.range(0.002, 0.005), rng.range(1500, 5000), 1.5, rng.range(0.2, 0.5));
    t += rng.range(0.003, 0.012);
  }
  burst(out, sr, rng, { at: 0.01, dur, tau: dur / 2, gain: 0.3, type: 'bandpass', freq: 2500, q: 0.6, color: 'pink' });
  return trim(finish(out, sr, 0.6), sr);
};

/** Virar página: o papel dobrando e o estalo seco. */
export const page: Recipe = (rng, sr) => {
  const out = buffer(0.6, sr);
  burst(out, sr, rng, { at: 0.01, dur: 0.25, tau: 1, attack: 0.18, gain: 0.35, type: 'bandpass', freq: rng.range(3000, 5500), q: 0.8, color: 'pink' });
  burst(out, sr, rng, { at: rng.range(0.2, 0.28), dur: 0.02, tau: 0.004, gain: 0.5, type: 'highpass', freq: 2500, q: 0.7 });
  return trim(finish(out, sr, 0.45), sr);
};

/** Cozinhando: chiado da fritura (bolhas estourando) e a colher na panela. */
export const cook: Recipe = (rng, sr) => {
  const out = buffer(1.6, sr);
  const pink = new Pink(rng);
  const hp = new Biquad(sr, 'bandpass', 5000, 0.6);
  for (let i = 0; i < out.length; i++) out[i] = hp.process(pink.next()) * 0.12;
  for (let i = 0; i < 90; i++) grain(out, sr, rng, rng.range(0, 1.55), rng.range(0.0008, 0.002), rng.range(3000, 8000), 2, rng.range(0.1, 0.35));
  if (rng.chance(0.6)) hit(out, sr, rng, { at: rng.range(0.3, 1), m: 'metal', gain: 0.35, size: 0.5, hard: 0.5, damp: 0.5 });
  return trim(finish(out, sr, 0.5), sr);
};

/** Ferramenta: chave catraca, tinido de metal, parafuso. */
export const tool: Recipe = (rng, sr) => {
  const out = buffer(0.9, sr);
  if (rng.chance(0.5)) {
    const n = rng.int(4, 8);
    for (let i = 0; i < n; i++) modes(out, sr, 0.01 + i * rng.range(0.035, 0.05), [{ f: rng.range(3000, 4200), a: 1, d: 0.01 }, { f: rng.range(6500, 8000), a: 0.4, d: 0.006 }], 0.3, rng);
  } else {
    hit(out, sr, rng, { at: 0.01, m: 'metal', gain: 0.6, size: rng.range(0.3, 0.6), hard: 0.8, damp: 0.3 });
    if (rng.chance(0.5)) hit(out, sr, rng, { at: rng.range(0.15, 0.4), m: 'metal', gain: 0.35, size: rng.range(0.3, 0.6), hard: 0.6, damp: 0.5 });
  }
  return trim(finish(out, sr, 0.55), sr);
};

/** Água: despejar/escorrer (bolhas e o jato). */
export const water: Recipe = (rng, sr) => {
  const dur = rng.range(0.8, 1.4);
  const out = buffer(dur + 0.2, sr);
  const pink = new Pink(rng);
  const bp = new Biquad(sr, 'bandpass', rng.range(700, 1200), 1.2);
  for (let i = 0; i < Math.round(dur * sr); i++) {
    const t = i / sr;
    out[i] = bp.process(pink.next()) * 0.35 * Math.min(1, t * 8) * Math.min(1, (dur - t) * 6);
  }
  for (let i = 0; i < 40 * dur; i++) {
    const at = Math.round(rng.range(0, dur) * sr);
    const f0 = rng.range(500, 1800);
    const n = Math.round(0.012 * sr);
    let ph = 0;
    for (let k = 0; k < n && at + k < out.length; k++) {
      ph += (TAU * f0 * (1 + (k / n) * 0.8)) / sr;
      out[at + k] = out[at + k]! + Math.sin(ph) * Math.exp((-5 * k) / n) * 0.12;
    }
  }
  return trim(finish(out, sr, 0.5), sr);
};

/** Combustível saindo do galão: "glug" grave em ritmo. */
export const glug: Recipe = (rng, sr) => {
  const out = buffer(1.4, sr);
  let t = 0.02;
  while (t < 1.2) {
    thump(out, sr, t, rng.range(150, 220), rng.range(90, 120), 0.07, 0.5);
    burst(out, sr, rng, { at: t, dur: 0.06, tau: 0.02, gain: 0.2, type: 'bandpass', freq: rng.range(500, 900), q: 2 });
    t += rng.range(0.16, 0.26);
  }
  return trim(finish(out, sr, 0.55), sr);
};

/** Afiar: lâmina raspando na pedra (ida). */
export const sharpen: Recipe = (rng, sr) => {
  const dur = rng.range(0.35, 0.55);
  const out = buffer(dur + 0.1, sr);
  burst(out, sr, rng, { at: 0.01, dur, tau: 1, attack: dur * 0.3, gain: 0.5, type: 'bandpass', freq: rng.range(3500, 6000), freqEnd: rng.range(5000, 7500), q: 2.5 });
  for (let i = 0; i < 25; i++) grain(out, sr, rng, rng.range(0.01, dur), 0.002, rng.range(4000, 9000), 3, 0.1);
  return trim(finish(out, sr, 0.5), sr);
};

/** Fósforo/isqueiro: risco, estalo e a chama pegando. */
export const match: Recipe = (rng, sr) => {
  const out = buffer(1.2, sr);
  burst(out, sr, rng, { at: 0.01, dur: 0.12, tau: 0.05, attack: 0.02, gain: 0.6, type: 'bandpass', freq: rng.range(2500, 4000), q: 1, color: 'pink' });
  burst(out, sr, rng, { at: 0.12, dur: 0.02, tau: 0.004, gain: 0.7, type: 'highpass', freq: 2000, q: 0.7 });
  const br = new Brown(rng);
  const lp = new Biquad(sr, 'lowpass', 600, 0.7);
  for (let i = Math.round(0.13 * sr); i < out.length; i++) {
    const t = i / sr - 0.13;
    out[i] = out[i]! + lp.process(br.next()) * 0.5 * Math.min(1, t * 10) * Math.exp(-t * 2.5);
  }
  return trim(finish(out, sr, 0.55), sr);
};

/** Cavar: pá entrando na terra e a terra caindo. */
export const dig: Recipe = (rng, sr) => {
  const out = buffer(1, sr);
  hit(out, sr, rng, { at: 0.01, m: 'metal', gain: 0.25, size: 0.8, hard: 0.4, damp: 0.7 });
  burst(out, sr, rng, { at: 0.01, dur: 0.15, tau: 0.05, gain: 0.6, type: 'lowpass', freq: 700, q: 0.7 });
  for (let i = 0; i < 20; i++) grain(out, sr, rng, rng.range(0.25, 0.6), rng.range(0.003, 0.01), rng.range(500, 2500), 1.5, rng.range(0.08, 0.2));
  return trim(finish(out, sr, 0.6), sr);
};

/** Escalar/pular a janela: roupa, mãos no batente e o corpo caindo do outro lado. */
export const climb: Recipe = (rng, sr) => {
  const out = buffer(1.1, sr);
  burst(out, sr, rng, { at: 0.01, dur: 0.3, tau: 0.1, attack: 0.05, gain: 0.4, type: 'bandpass', freq: 2500, q: 0.7, color: 'pink' });
  hit(out, sr, rng, { at: 0.08, m: 'madeira', gain: 0.35, size: 0.9, hard: 0.3, damp: 0.5 });
  thump(out, sr, rng.range(0.55, 0.75), 90, 50, 0.12, 0.8);
  burst(out, sr, rng, { at: 0.6, dur: 0.1, tau: 0.03, gain: 0.4, type: 'lowpass', freq: 600, q: 0.7 });
  return trim(finish(out, sr, 0.7), sr);
};

/** Equipamento chacoalhando na mochila (correndo carregado): tiras, fivelas, lata. */
export const gear: Recipe = (rng, sr) => {
  const out = buffer(0.4, sr);
  burst(out, sr, rng, { at: 0.005, dur: 0.12, tau: 0.04, gain: 0.35, type: 'bandpass', freq: rng.range(1500, 3000), q: 0.7, color: 'pink' });
  const n = rng.int(1, 3);
  for (let i = 0; i < n; i++) hit(out, sr, rng, { at: rng.range(0.005, 0.06), m: rng.pick(['metal', 'plastico', 'latao'] as const), gain: rng.range(0.15, 0.35), size: rng.range(0.2, 0.5), hard: 0.4, damp: 0.6 });
  return trim(finish(out, sr, 0.5), sr);
};

/** Largar no chão: coisa leve (bolsa, roupa) ou pesada (caixa, arma, ferramenta). */
export function drop(heavy: boolean): Recipe {
  return (rng, sr) => {
    const out = buffer(0.6, sr);
    if (heavy) {
      thump(out, sr, 0.005, rng.range(90, 130), 55, 0.1, 0.8);
      hit(out, sr, rng, { at: 0.005, m: rng.pick(['madeira', 'metal', 'plastico'] as const), gain: 0.5, size: rng.range(0.8, 1.5), hard: 0.5, damp: 0.5 });
    } else {
      burst(out, sr, rng, { at: 0.005, dur: 0.1, tau: 0.03, gain: 0.5, type: 'lowpass', freq: rng.range(900, 1500), q: 0.7, color: 'pink' });
      if (rng.chance(0.5)) hit(out, sr, rng, { at: rng.range(0.01, 0.04), m: rng.pick(['plastico', 'latao'] as const), gain: 0.2, size: 0.3, hard: 0.4, damp: 0.6 });
    }
    return trim(finish(out, sr, 0.6), sr);
  };
}

/** Sacar/guardar arma: couro/tecido e o metal encostando. */
export const draw: Recipe = (rng, sr) => {
  const out = buffer(0.5, sr);
  burst(out, sr, rng, { at: 0.005, dur: 0.15, tau: 0.05, attack: 0.02, gain: 0.35, type: 'bandpass', freq: rng.range(1200, 2500), q: 0.8, color: 'pink' });
  hit(out, sr, rng, { at: rng.range(0.08, 0.15), m: rng.chance(0.6) ? 'metal' : 'madeira', gain: 0.3, size: 0.4, hard: 0.5, damp: 0.5 });
  return trim(finish(out, sr, 0.5), sr);
};

// ---------------------------------------------------------------- sintomas

function throat(out: Float32Array, sr: number, rng: Rng, at: number, dur: number, f: number, open: number, gain: number, breath: number, fry: number): void {
  voice(out, sr, rng, {
    at,
    dur,
    gain,
    f0: (t) => f * (1.05 - 0.2 * t),
    formants: () => [
      { f: 400 + 400 * open, q: 5, a: 1 },
      { f: 1000 + 500 * open, q: 6, a: 0.5 },
      { f: 2600, q: 8, a: 0.2 },
    ],
    env: (t) => Math.min(1, t * 12) * Math.pow(1 - t, 1.1),
    breath,
    jitter: 1.2,
    shimmer: 0.5,
    fry,
  });
}

/** Barriga roncando: gorgolejo grave que sobe e desce. */
export const stomach: Recipe = (rng, sr) => {
  const dur = rng.range(0.8, 1.6);
  const out = buffer(dur + 0.2, sr);
  const f0 = rng.range(70, 140);
  let ph = 0;
  for (let i = 0; i < Math.round(dur * sr); i++) {
    const t = i / sr;
    const f = f0 * (1 + 0.5 * Math.sin((TAU * t) / dur) + 0.2 * Math.sin(TAU * 7 * t));
    ph += (TAU * f) / sr;
    const env = Math.sin((Math.PI * t) / dur) * (0.6 + 0.4 * Math.sin(TAU * rng.range(9, 14) * t));
    out[i] = (Math.sin(ph) + 0.4 * Math.sin(2 * ph)) * env * 0.5;
  }
  for (let i = 0; i < 12; i++) grain(out, sr, rng, rng.range(0, dur), rng.range(0.01, 0.03), rng.range(150, 400), 4, 0.25);
  new Biquad(sr, 'lowpass', 500, 0.7).run(out);
  return trim(finish(out, sr, 0.6), sr);
};

/** Tosse seca (garganta seca de sede, gripe): estouro de ar e voz rouca. */
export const cough: Recipe = (rng, sr) => {
  const n = rng.int(1, 3);
  const out = buffer(n * 0.4 + 0.3, sr);
  for (let i = 0; i < n; i++) {
    const at = 0.01 + i * rng.range(0.28, 0.4);
    burst(out, sr, rng, { at, dur: 0.18, tau: 0.05, gain: 0.8, type: 'bandpass', freq: rng.range(900, 1600), q: 0.8, color: 'pink' });
    throat(out, sr, rng, at, rng.range(0.12, 0.2), rng.range(140, 200), 0.7, 0.4, 1.2, 1.2);
  }
  return trim(finish(out, sr, 0.7), sr);
};

/** Tremendo de frio: dentes batendo e o ar tremido. */
export const shiver: Recipe = (rng, sr) => {
  const dur = rng.range(1, 1.6);
  const out = buffer(dur + 0.1, sr);
  let t = 0.01;
  const rate = rng.range(9, 13);
  while (t < dur) {
    modes(out, sr, t, [{ f: rng.range(2200, 3200), a: 1, d: 0.008 }], rng.range(0.15, 0.3), rng);
    t += (1 / rate) * rng.range(0.85, 1.15);
  }
  burst(out, sr, rng, { at: 0.05, dur: dur * 0.8, tau: 1, attack: 0.1, gain: 0.15, type: 'bandpass', freq: 1200, q: 1, color: 'pink' });
  return trim(finish(out, sr, 0.5), sr);
};

/** Bocejo: boca abrindo, ar longo e a voz caindo. */
export const yawn: Recipe = (rng, sr) => {
  const out = buffer(2, sr);
  const f = rng.range(150, 210);
  voice(out, sr, rng, {
    at: 0.05,
    dur: rng.range(1.2, 1.6),
    gain: 0.5,
    f0: (t) => f * (1.2 - 0.5 * t),
    formants: (t) => [
      { f: 350 + 500 * Math.sin(Math.PI * t), q: 5, a: 1 },
      { f: 900 + 400 * Math.sin(Math.PI * t), q: 6, a: 0.5 },
    ],
    env: (t) => Math.sin(Math.PI * t) ** 0.7,
    breath: 1.2,
    jitter: 1,
    shimmer: 0.4,
    fry: 0.4,
  });
  return trim(finish(out, sr, 0.45), sr);
};

/** Vômito: engulho, a golfada e o líquido no chão. */
export const vomit: Recipe = (rng, sr) => {
  const out = buffer(2, sr);
  throat(out, sr, rng, 0.02, 0.35, rng.range(110, 150), 0.4, 0.5, 1, 1.5);
  const t = rng.range(0.45, 0.6);
  throat(out, sr, rng, t, 0.5, rng.range(90, 120), 0.8, 0.7, 1.2, 2);
  burst(out, sr, rng, { at: t + 0.05, dur: 0.5, tau: 0.2, gain: 0.5, type: 'lowpass', freq: 1200, q: 0.7, color: 'pink' });
  for (let i = 0; i < 25; i++) grain(out, sr, rng, t + rng.range(0.2, 0.9), rng.range(0.005, 0.02), rng.range(300, 1500), 2, rng.range(0.1, 0.3));
  return trim(finish(out, sr, 0.65), sr);
};

/** Zumbido no ouvido depois de tiro perto (ainda mais em lugar fechado). */
export const tinnitus: Recipe = (rng, sr) => {
  const dur = rng.range(2.2, 3.2);
  const out = buffer(dur, sr);
  const f = rng.range(3800, 6500);
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    out[i] = Math.sin((TAU * f * i) / sr) * Math.min(1, t * 20) * Math.exp(-t * 1.4) * 0.5;
  }
  return finish(out, sr, 0.35);
};

// ---------------------------------------------------------------- casa e rua

/** Ar de dentro de casa: quase nada, um sopro grave e um zumbido de fundo (laço). */
export const roomTone: Recipe = (rng, sr) => {
  const sec = 6;
  const out = buffer(sec + 0.5, sr);
  const br = new Brown(rng);
  const pink = new Pink(rng);
  const lp = new Biquad(sr, 'lowpass', 180, 0.7);
  const air = new Biquad(sr, 'bandpass', 900, 0.6);
  for (let i = 0; i < out.length; i++) out[i] = lp.process(br.next()) * 0.8 + air.process(pink.next()) * 0.06;
  return loopify(normalize(out, sr, 0.5), sr, 0.5);
};

/** Casa rangendo (madeira assentando, vento no telhado). */
export const houseCreak: Recipe = (rng, sr) => {
  const out = buffer(1.4, sr);
  creak(out, sr, rng, {
    at: 0.02,
    dur: rng.range(0.3, 0.9),
    gain: 0.5,
    rate0: rng.range(10, 30),
    rate1: rng.range(25, 70),
    res: [
      { f: rng.range(180, 400), q: 8, a: 1 },
      { f: rng.range(600, 1100), q: 10, a: 0.5 },
    ],
  });
  if (rng.chance(0.4)) hit(out, sr, rng, { at: rng.range(0.4, 1), m: 'madeira', gain: 0.3, size: 2, hard: 0.2, damp: 0.6 });
  new Biquad(sr, 'lowpass', 1800, 0.7).run(out);
  return trim(finish(out, sr, 0.5), sr);
};

/** Geladeira ligada: compressor zumbindo (60 Hz e harmônicos) e o gás (laço). */
export const fridgeHum: Recipe = (rng, sr) => {
  const sec = 4;
  const out = buffer(sec + 0.3, sr);
  const f = rng.pick([50, 60]);
  const pink = new Pink(rng);
  const bp = new Biquad(sr, 'bandpass', 1400, 1);
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    out[i] = Math.sin(TAU * f * t) * 0.3 + Math.sin(TAU * 2 * f * t) * 0.5 + Math.sin(TAU * 3 * f * t) * 0.15 + bp.process(pink.next()) * 0.05;
  }
  return loopify(normalize(out, sr, 0.5), sr, 0.3);
};

/** Cigarras no calor: zumbido áspero que cresce e some em ondas (laço). */
export const cicadas: Recipe = (rng, sr) => {
  const sec = 7;
  const out = buffer(sec + 0.5, sr);
  const n = rng.int(3, 5);
  for (let c = 0; c < n; c++) {
    const f = rng.range(3800, 6500);
    const am = rng.range(90, 180);
    const period = rng.range(3, 6);
    const ph0 = rng.range(0, TAU);
    const g = rng.range(0.4, 1);
    for (let i = 0; i < out.length; i++) {
      const t = i / sr;
      const swell = Math.max(0, Math.sin((TAU * t) / period + ph0)) ** 1.5;
      const buzz = 0.5 + 0.5 * Math.sign(Math.sin(TAU * am * t));
      out[i] = out[i]! + Math.sin(TAU * f * t) * buzz * swell * g * 0.25;
    }
  }
  return loopify(normalize(out, sr, 0.5), sr, 0.5);
};

/** Cachorro ao longe: latidos (voz curta e forte), dois a quatro. */
export const dog: Recipe = (rng, sr) => {
  const n = rng.int(2, 4);
  const out = buffer(n * 0.5 + 0.4, sr);
  const f = rng.range(280, 480);
  const size = rng.range(0.8, 1.3);
  for (let i = 0; i < n; i++) {
    voice(out, sr, rng, {
      at: 0.02 + i * rng.range(0.3, 0.5),
      dur: rng.range(0.12, 0.2),
      gain: 0.8,
      f0: (t) => f * (1.2 - 0.4 * t),
      formants: () => [
        { f: 700 / size, q: 4, a: 1 },
        { f: 1500 / size, q: 5, a: 0.6 },
        { f: 2600 / size, q: 6, a: 0.3 },
      ],
      env: (t) => Math.min(1, t * 30) * Math.pow(1 - t, 0.8),
      breath: 0.6,
      jitter: 1.5,
      shimmer: 0.5,
      fry: 0.6,
    });
  }
  new Biquad(sr, 'lowpass', 2500, 0.7).run(out);
  return trim(finish(out, sr, 0.6), sr);
};

/** Rodagem: pneu no asfalto e o vento na lataria (laço; o diretor abre com a velocidade). */
export const road: Recipe = (rng, sr) => {
  const sec = 5;
  const out = buffer(sec + 0.4, sr);
  const br = new Brown(rng);
  const pink = new Pink(rng);
  const lp = new Biquad(sr, 'lowpass', 400, 0.7);
  const mid = new Biquad(sr, 'bandpass', 1100, 0.7);
  for (let i = 0; i < out.length; i++) out[i] = lp.process(br.next()) * 0.9 + mid.process(pink.next()) * 0.25;
  return loopify(normalize(out, sr, 0.6), sr, 0.4);
};

/** Pneu cantando (curva forte/freada): chiado agudo com a borracha vibrando. */
export const skid: Recipe = (rng, sr) => {
  const dur = rng.range(0.6, 1.1);
  const out = buffer(dur + 0.1, sr);
  const pink = new Pink(rng);
  const f0 = rng.range(900, 1400);
  const a = new Biquad(sr, 'bandpass', f0, 8);
  const b = new Biquad(sr, 'bandpass', f0 * 2.02, 10);
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    if ((i & 63) === 0) {
      const w = 1 + 0.04 * Math.sin(TAU * 7 * t);
      a.set('bandpass', f0 * w, 8);
      b.set('bandpass', f0 * 2.02 * w, 10);
    }
    const x = pink.next();
    out[i] = (a.process(x) + b.process(x) * 0.6) * Math.min(1, t * 15) * Math.min(1, (dur - t) * 5);
  }
  return trim(finish(out, sr, 0.6), sr);
};

/** Troca de marcha: embreagem e o câmbio encaixando (clunk seco). */
export const gearShift: Recipe = (rng, sr) => {
  const out = buffer(0.4, sr);
  hit(out, sr, rng, { at: 0.01, m: 'metal', gain: 0.4, size: 0.6, hard: 0.4, damp: 0.7 });
  thump(out, sr, 0.01, 110, 70, 0.05, 0.3);
  return trim(finish(out, sr, 0.5), sr);
};
