/**
 * AMBIENTE E CLIMA: laços sem emenda (chuva, vento, grilos, fogo, gerador,
 * motor) e sons soltos (trovão, pássaros, corvo, estalo de fogo, alarme).
 * O volume, o abafado e o giro são mexidos ao vivo pelo diretor (Ambience).
 */
import { Biquad, Brown, burst, buffer, chain, finish, grain, loopify, modes, normalize, Pink, type Rng, soft, TAU, thump, trim, voice } from '../dsp';

type Recipe = (rng: Rng, sr: number) => Float32Array;

// ---------------------------------------------------------------- chuva

/**
 * Chuva lá fora. `heavy` 0 = garoa (gotas soltas, quase sem chiado);
 * 1 = temporal (chiado denso e gotas por cima). Cada gota é um estalinho
 * numa faixa sorteada; algumas caem em poça e fazem "plic" (bolha que sobe
 * de tom, o som típico de água).
 */
export function rain(heavy: number): Recipe {
  return (rng, sr) => {
    const sec = 6;
    const out = buffer(sec + 0.5, sr);
    const drops = Math.round((heavy > 0.5 ? 900 : 140) * sec);
    for (let i = 0; i < drops; i++) {
      const at = rng.range(0, sec + 0.45);
      const g = Math.pow(rng.next(), 3) * (heavy > 0.5 ? 0.18 : 0.35);
      grain(out, sr, rng, at, rng.range(0.0015, 0.005), rng.range(1200, heavy > 0.5 ? 7000 : 5000), rng.range(1.5, 4), g);
    }
    // Plic: bolha na poça (tom subindo, 1–3 kHz).
    const plinks = Math.round((heavy > 0.5 ? 25 : 12) * sec);
    for (let i = 0; i < plinks; i++) {
      const at = Math.round(rng.range(0, sec + 0.4) * sr);
      const f0 = rng.range(900, 2600);
      const n = Math.round(rng.range(0.008, 0.02) * sr);
      const g = rng.range(0.03, 0.12);
      let ph = 0;
      for (let k = 0; k < n && at + k < out.length; k++) {
        const t = k / n;
        ph += (TAU * f0 * (1 + t * 0.6)) / sr;
        out[at + k] = out[at + k]! + Math.sin(ph) * Math.exp(-t * 5) * Math.min(1, k / 20) * g;
      }
    }
    // Chiado: a chuva batendo em tudo ao mesmo tempo.
    const pink = new Pink(rng);
    const hp = new Biquad(sr, 'highpass', heavy > 0.5 ? 500 : 900, 0.6);
    const lp = new Biquad(sr, 'lowpass', heavy > 0.5 ? 9000 : 7000, 0.6);
    const hiss = heavy > 0.5 ? 0.55 : 0.12;
    for (let i = 0; i < out.length; i++) out[i] = out[i]! + lp.process(hp.process(pink.next())) * hiss;
    // Ronco baixo da chuva ao longe (só no temporal).
    if (heavy > 0.5) {
      const br = new Brown(rng);
      const lp2 = new Biquad(sr, 'lowpass', 220, 0.7);
      for (let i = 0; i < out.length; i++) out[i] = out[i]! + lp2.process(br.next()) * 0.25;
    }
    return loopify(normalize(out, sr, 0.7), sr, 0.45);
  };
}

/** Chuva ouvida de dentro de casa: batucada surda no telhado/janela e pingos na calha. */
export const roofRain: Recipe = (rng, sr) => {
  const sec = 6;
  const out = buffer(sec + 0.5, sr);
  // Gotas no telhado: baques curtos e graves, muitos.
  for (let i = 0; i < 1400 * sec; i++) grain(out, sr, rng, rng.range(0, sec + 0.45), rng.range(0.003, 0.009), rng.range(180, 900), rng.range(1, 2.5), Math.pow(rng.next(), 2) * 0.12);
  // Janela: estalinhos agudos, poucos.
  for (let i = 0; i < 60 * sec; i++) grain(out, sr, rng, rng.range(0, sec + 0.45), 0.0015, rng.range(2500, 5000), 3, rng.range(0.02, 0.07));
  // Calha: pingos com tom (água caindo em água), em ritmo quase regular.
  let t = rng.range(0, 0.3);
  const every = rng.range(0.35, 0.8);
  const f = rng.range(700, 1400);
  while (t < sec + 0.4) {
    modes(out, sr, t, [{ f: f * rng.range(0.95, 1.08), a: 1, d: 0.06 }, { f: f * 2.3, a: 0.3, d: 0.03 }], rng.range(0.05, 0.12), rng);
    t += every * rng.range(0.8, 1.25);
  }
  const br = new Brown(rng);
  const lp = new Biquad(sr, 'lowpass', 300, 0.7);
  for (let i = 0; i < out.length; i++) out[i] = out[i]! + lp.process(br.next()) * 0.35;
  return loopify(normalize(out, sr, 0.7), sr, 0.45);
};

// ---------------------------------------------------------------- vento

/** Vento: ruído grave com a faixa passeando (as rajadas de verdade o diretor faz ao vivo). */
export const wind: Recipe = (rng, sr) => {
  const sec = 8;
  const out = buffer(sec + 0.6, sr);
  const br = new Brown(rng);
  const pink = new Pink(rng);
  const bp = new Biquad(sr, 'bandpass', 300, 0.8);
  const bp2 = new Biquad(sr, 'bandpass', 900, 1.2);
  const p1 = rng.range(0, TAU);
  const p2 = rng.range(0, TAU);
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    // Duas ondas lentas fora de fase: o vento "respira".
    const m = 0.5 + 0.3 * Math.sin((TAU * t) / 3.7 + p1) + 0.2 * Math.sin((TAU * t) / 1.9 + p2);
    if ((i & 63) === 0) {
      bp.set('bandpass', 180 + 420 * m, 0.8);
      bp2.set('bandpass', 600 + 900 * m, 1.4);
    }
    out[i] = bp.process(br.next()) * (0.6 + 0.5 * m) + bp2.process(pink.next()) * 0.35 * m;
  }
  return loopify(normalize(out, sr, 0.7), sr, 0.6);
};

/** Assobio do vento forte (frestas, fios): faixa estreita que sobe e desce. */
export const windWhistle: Recipe = (rng, sr) => {
  const sec = 7;
  const out = buffer(sec + 0.6, sr);
  const pink = new Pink(rng);
  const f0 = rng.range(650, 1000);
  const a = new Biquad(sr, 'bandpass', f0, 30);
  const b = new Biquad(sr, 'bandpass', f0 * 1.5, 25);
  const p = rng.range(0, TAU);
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    const m = Math.sin((TAU * t) / 2.3 + p) * 0.5 + Math.sin((TAU * t) / 0.9) * 0.15;
    if ((i & 63) === 0) {
      a.set('bandpass', f0 * (1 + 0.12 * m), 30);
      b.set('bandpass', f0 * 1.5 * (1 + 0.1 * m), 25);
    }
    const x = pink.next();
    const env = Math.max(0, 0.4 + m);
    out[i] = (a.process(x) + b.process(x) * 0.5) * env;
  }
  return loopify(normalize(out, sr, 0.6), sr, 0.6);
};

// ---------------------------------------------------------------- trovão

/**
 * Trovão. Perto: rasgo (vários estalos seguidos, o raio "rasgando" o ar),
 * estrondo e o ronco rolando. Longe: só o ronco, grave e comprido, rolando
 * em ondas (o som chega de trechos diferentes do raio).
 */
export function thunder(near: boolean): Recipe {
  return (rng, sr) => {
    const dur = near ? rng.range(4.5, 6.5) : rng.range(4, 7);
    const out = buffer(dur + 0.3, sr);
    // Ondas de ronco: cada uma é ruído marrom com envelope suave.
    const rumble = buffer(dur + 0.3, sr);
    const waves = rng.int(3, 7);
    const br = new Brown(rng);
    const lp = new Biquad(sr, 'lowpass', near ? 320 : 170, 0.7);
    const mid = new Biquad(sr, 'bandpass', near ? 520 : 300, 1);
    const centers = Array.from({ length: waves }, () => ({ c: rng.range(near ? 0.2 : 0.1, dur * 0.75), w: rng.range(0.25, 0.9), a: rng.range(0.4, 1) }));
    for (let i = 0; i < rumble.length; i++) {
      const t = i / sr;
      let env = 0;
      for (const c of centers) {
        const x = (t - c.c) / c.w;
        env += c.a * (x < 0 ? Math.exp(-x * x * 6) : Math.exp(-x * 1.6));
      }
      env *= Math.min(1, t / (near ? 0.05 : 0.4));
      const b = br.next();
      rumble[i] = (lp.process(b) * 1.2 + mid.process(b) * (near ? 0.35 : 0.12)) * env;
    }
    // Saturação dá o "peso"; o passa-baixa depois tira o chiado que ela cria.
    normalize(rumble, sr, 1);
    soft(rumble, near ? 2.2 : 1.6);
    chain(rumble, new Biquad(sr, 'lowpass', near ? 900 : 450, 0.6), new Biquad(sr, 'lowpass', near ? 1400 : 700, 0.6));
    for (let i = 0; i < out.length; i++) out[i] = rumble[i]! * (near ? 0.8 : 1);
    if (near) {
      // Rasgo: estalos em sequência (o raio abrindo caminho) e o estrondo.
      const rip = rng.range(0.12, 0.3);
      for (let i = 0; i < 40; i++) burst(out, sr, rng, { at: 0.01 + Math.pow(rng.next(), 1.5) * rip, dur: 0.012, tau: 0.003, gain: rng.range(0.3, 0.8), type: 'bandpass', freq: rng.range(900, 3000), q: 0.7 });
      burst(out, sr, rng, { at: 0.01, dur: 0.6, tau: 0.15, gain: 0.9, type: 'lowpass', freq: 1400, q: 0.5 });
      thump(out, sr, 0.03, 70, 30, 0.9, 1.1);
    }
    return trim(finish(out, sr, near ? 0.95 : 0.85), sr);
  };
}

// ---------------------------------------------------------------- bichos

/** Nota assobiada com glissando e um pouco de harmônico (voz de pássaro). */
function whistle(out: Float32Array, sr: number, at: number, dur: number, f0: number, f1: number, gain: number, vib = 0): void {
  const s = Math.round(at * sr);
  const n = Math.round(dur * sr);
  let ph = 0;
  for (let i = 0; i < n && s + i < out.length; i++) {
    const t = i / n;
    const f = f0 * Math.pow(f1 / f0, t) * (1 + vib * Math.sin(TAU * 38 * (i / sr)));
    ph += (TAU * f) / sr;
    const env = Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 1.5;
    out[s + i] = out[s + i]! + (Math.sin(ph) + 0.12 * Math.sin(2 * ph)) * env * gain;
  }
}

/**
 * Pássaro: um de quatro "jeitos" de cantar (sorteado pela semente), cada um
 * com notas e ritmo próprios: piado repetido, frase melodiosa, trinado ou
 * chamado de duas notas.
 */
export const bird: Recipe = (rng, sr) => {
  const out = buffer(2.6, sr);
  const kind = rng.int(0, 3);
  let t = 0.02;
  if (kind === 0) {
    const f = rng.range(4200, 6500);
    for (let i = 0; i < rng.int(3, 6); i++) {
      whistle(out, sr, t, rng.range(0.04, 0.07), f, f * rng.range(0.6, 0.75), rng.range(0.6, 1));
      t += rng.range(0.12, 0.2);
    }
  } else if (kind === 1) {
    const base = rng.range(1900, 3000);
    for (let i = 0; i < rng.int(4, 7); i++) {
      const a = base * rng.range(0.85, 1.35);
      whistle(out, sr, t, rng.range(0.08, 0.2), a, a * rng.range(0.8, 1.25), rng.range(0.6, 1), rng.range(0.008, 0.035));
      t += rng.range(0.14, 0.28);
    }
  } else if (kind === 2) {
    const f = rng.range(3800, 5500);
    const n = rng.int(10, 22);
    const rate = rng.range(0.035, 0.055);
    for (let i = 0; i < n; i++) whistle(out, sr, t + i * rate, rate * 0.8, f * (1 + 0.1 * (i / n)), f * 0.92, 0.7 * (0.6 + 0.4 * Math.sin((Math.PI * i) / n)));
  } else {
    const hi = rng.range(2600, 3600);
    whistle(out, sr, t, 0.16, hi, hi * 1.05, 0.9, 0.01);
    whistle(out, sr, t + 0.22, 0.28, hi * 0.72, hi * 0.9, 0.9, 0.02);
    if (rng.chance(0.5)) whistle(out, sr, t + 0.62, 0.22, hi * 0.8, hi * 0.66, 0.7);
  }
  new Biquad(sr, 'highpass', 1200, 0.7).run(out);
  return trim(finish(out, sr, 0.6), sr);
};

/** Grilos à noite: coro de vários, cada um com seu tom e seu ritmo (laço). */
export const crickets: Recipe = (rng, sr) => {
  const sec = 6;
  const out = buffer(sec + 0.5, sr);
  const n = rng.int(5, 9);
  for (let c = 0; c < n; c++) {
    const f = rng.range(3900, 5400);
    const pulses = rng.int(2, 4);
    const period = rng.range(0.4, 0.9);
    const g = rng.range(0.15, 1) * (c === 0 ? 1.4 : 1);
    let t = rng.range(0, period);
    while (t < sec + 0.4) {
      for (let p = 0; p < pulses; p++) {
        const s = Math.round((t + p * 0.028) * sr);
        const len = Math.round(0.016 * sr);
        for (let i = 0; i < len && s + i < out.length; i++) {
          const env = Math.sin((Math.PI * i) / len);
          out[s + i] = out[s + i]! + Math.sin((TAU * f * i) / sr) * env * g * 0.3;
        }
      }
      t += period * rng.range(0.93, 1.07);
    }
  }
  return loopify(normalize(out, sr, 0.5), sr, 0.4);
};

/** Corvo: grasnados roucos (voz com ar e aspereza), dois a quatro seguidos. */
export const crow: Recipe = (rng, sr) => {
  const n = rng.int(2, 4);
  const out = buffer(n * 0.5 + 0.4, sr);
  const f = rng.range(420, 620);
  for (let i = 0; i < n; i++) {
    voice(out, sr, rng, {
      at: 0.02 + i * rng.range(0.38, 0.5),
      dur: rng.range(0.24, 0.36),
      gain: 0.8,
      f0: (t) => f * (1.1 - 0.25 * t),
      formants: () => [
        { f: 1000, q: 3, a: 1 },
        { f: 1700, q: 4, a: 0.7 },
        { f: 2700, q: 5, a: 0.4 },
      ],
      env: (t) => Math.min(1, t * 12) * Math.pow(1 - t, 0.6),
      breath: 0.5,
      jitter: 1.2,
      shimmer: 0.6,
      fry: 0.8,
    });
  }
  soft(out, 1.8);
  return trim(finish(out, sr, 0.7), sr);
};

// ---------------------------------------------------------------- fogo

/** Chama: ronco grave que oscila e um chiado de gás baixinho (laço). */
export const fireRoar: Recipe = (rng, sr) => {
  const sec = 5;
  const out = buffer(sec + 0.5, sr);
  const br = new Brown(rng);
  const pink = new Pink(rng);
  const lp = new Biquad(sr, 'lowpass', 380, 0.6);
  const hs = new Biquad(sr, 'bandpass', 3500, 0.7);
  let m = 0.5;
  for (let i = 0; i < out.length; i++) {
    if ((i & 255) === 0) m += (rng.next() - 0.5) * 0.12;
    m = Math.max(0.2, Math.min(1, m));
    out[i] = lp.process(br.next()) * (0.6 + 0.6 * m) + hs.process(pink.next()) * 0.06;
  }
  // Estalinhos miúdos por baixo (os grandes vêm à parte).
  for (let i = 0; i < 40 * sec; i++) grain(out, sr, rng, rng.range(0, sec + 0.45), rng.range(0.0006, 0.0015), rng.range(2500, 6000), 1.5, rng.range(0.03, 0.12));
  return loopify(normalize(out, sr, 0.6), sr, 0.4);
};

/** Estalo da lenha: um a seis estouros secos e, às vezes, a seiva chiando. */
export const fireCrackle: Recipe = (rng, sr) => {
  const out = buffer(0.8, sr);
  const n = rng.int(1, 6);
  for (let i = 0; i < n; i++) {
    const at = 0.005 + Math.pow(rng.next(), 2) * 0.35;
    burst(out, sr, rng, { at, dur: 0.006, tau: rng.range(0.0005, 0.0015), gain: rng.range(0.4, 1), type: 'highpass', freq: rng.range(1200, 3500), q: 0.6 });
    if (rng.chance(0.4)) thump(out, sr, at, 300, 150, 0.02, 0.2);
  }
  if (rng.chance(0.3)) burst(out, sr, rng, { at: rng.range(0.05, 0.3), dur: 0.35, tau: 0.12, gain: 0.12, attack: 0.03, type: 'bandpass', freq: rng.range(4000, 7000), q: 1.5 });
  return trim(finish(out, sr, 0.8), sr);
};

// ---------------------------------------------------------------- máquinas

/**
 * Gerador portátil (um cilindro, ~3600 giros): explosão a cada duas voltas
 * pelo abafador, válvulas batendo, ventoinha e o zumbido do alternador (laço).
 */
export const generator: Recipe = (rng, sr) => {
  const fire = rng.range(27, 31);
  const cycles = Math.round(fire * 3);
  const sec = cycles / fire;
  const out = buffer(sec + 0.3, sr);
  const muffler = new Biquad(sr, 'bandpass', rng.range(140, 220), 2.5);
  const body = new Biquad(sr, 'lowpass', 700, 0.7);
  let ph = 0;
  let amp = 1;
  for (let i = 0; i < out.length; i++) {
    ph += fire / sr;
    if (ph >= 1) {
      ph -= 1;
      amp = rng.range(0.85, 1.1);
    }
    const pulse = Math.exp(-ph * 14) * amp;
    out[i] = muffler.process(pulse) * 2.2 + body.process(pulse) * 0.8;
  }
  // Válvulas: tique metálico a cada ciclo.
  for (let c = 0; c < cycles + 6; c++) modes(out, sr, c / fire + 0.013, [{ f: rng.range(2800, 3400), a: 1, d: 0.012 }], 0.05, rng);
  // Ventoinha e alternador.
  const pink = new Pink(rng);
  const fan = new Biquad(sr, 'bandpass', 1200, 0.8);
  const hum = rng.range(380, 460);
  for (let i = 0; i < out.length; i++) out[i] = out[i]! + fan.process(pink.next()) * 0.08 + Math.sin((TAU * hum * i) / sr) * 0.02;
  soft(out, 1.4);
  return loopify(normalize(out, sr, 0.7), sr, 0.3);
};

/**
 * Motor do carro a 1000 giros (4 cilindros: duas explosões por volta). O
 * diretor acelera o laço pelo giro. Cada cilindro soa um pouco diferente e o
 * escapamento ressoa.
 */
export const carEngine: Recipe = (rng, sr) => {
  const fire = (1000 / 60) * 2;
  const cycles = 48;
  const sec = cycles / fire;
  const out = buffer(sec + 0.25, sr);
  const cyl = [rng.range(0.85, 1.1), rng.range(0.85, 1.1), rng.range(0.85, 1.1), rng.range(0.85, 1.1)];
  const exhaust = new Biquad(sr, 'bandpass', rng.range(90, 130), 1.8);
  const exhaust2 = new Biquad(sr, 'bandpass', rng.range(240, 320), 2.5);
  const low = new Biquad(sr, 'lowpass', 900, 0.7);
  let ph = 0;
  let k = 0;
  for (let i = 0; i < out.length; i++) {
    ph += fire / sr;
    if (ph >= 1) {
      ph -= 1;
      k = (k + 1) % 4;
    }
    const pulse = Math.exp(-ph * 9) * cyl[k]!;
    out[i] = exhaust.process(pulse) * 2 + exhaust2.process(pulse) * 0.7 + low.process(pulse) * 0.5;
  }
  // Mecânica: correia e injeção (ruído fino no ritmo).
  const pink = new Pink(rng);
  const mech = new Biquad(sr, 'bandpass', 2200, 0.9);
  for (let i = 0; i < out.length; i++) {
    const r = ((i / sr) * fire) % 1;
    out[i] = out[i]! + mech.process(pink.next()) * (0.04 + 0.05 * Math.exp(-r * 6));
  }
  soft(out, 1.5);
  return loopify(normalize(out, sr, 0.7), sr, 0.12);
};

/**
 * Alarme de carro (1,5 s, o tempo entre dois toques no jogo). A semente
 * escolhe o padrão: dois tons alternados, sirene subindo, bipes rápidos ou
 * gorjeio. Timbre de corneta (pulso estreito + ressonância).
 */
export const carAlarm: Recipe = (rng, sr) => {
  const dur = 1.5;
  const out = buffer(dur, sr);
  const kind = rng.int(0, 3);
  const base = rng.range(600, 900);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / sr;
    let f = base;
    let on = 1;
    if (kind === 0) f = Math.floor(t / 0.25) % 2 ? base * 1.33 : base;
    else if (kind === 1) f = base * (1 + 1.2 * ((t % 0.5) / 0.5));
    else if (kind === 2) {
      f = base * 1.4;
      on = (t % 0.125) < 0.07 ? 1 : 0;
    } else f = base * (1.2 + 0.35 * Math.sin(TAU * 7 * t));
    ph += f / sr;
    const x = (ph % 1) < 0.25 ? 1 : -0.33;
    out[i] = x * on * 0.4;
  }
  chain(out, new Biquad(sr, 'peak', 2400, 1.2, 7), new Biquad(sr, 'highpass', 300, 0.7), new Biquad(sr, 'lowpass', 5500, 0.7));
  soft(out, 1.4);
  return finish(out, sr, 0.75);
};
