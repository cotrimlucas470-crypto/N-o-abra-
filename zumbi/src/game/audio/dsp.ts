/**
 * Síntese de som (lógica pura, sem navegador: testável). Tudo gera
 * `Float32Array` mono na taxa pedida.
 *
 * Os sons do jogo são FÍSICOS, não gravados: um golpe é uma excitação curta
 * (ruído) batendo em ressonâncias do material (modos: madeira grave e curta,
 * metal agudo e longo, vidro bem agudo); uma pisada na neve é um monte de
 * "grãos" de ruído se esmagando; uma voz é um pulso da garganta passando
 * pelas ressonâncias da boca (formantes). Cada variação sorteia tamanho,
 * força, material e tempo dentro do que faz sentido — por isso o mesmo som
 * nunca sai igual.
 */

/** Sorteio com semente (mulberry32): a mesma semente dá o mesmo som. */
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0 || 1;
  }
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }
  int(a: number, b: number): number {
    return Math.floor(this.range(a, b + 1));
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)]!;
  }
  /** Ruído branco -1..1. */
  noise(): number {
    return this.next() * 2 - 1;
  }
  /** Multiplica por ±`spread` (0,1 = ±10%). */
  vary(v: number, spread: number): number {
    return v * (1 + (this.next() * 2 - 1) * spread);
  }
}

export const TAU = Math.PI * 2;

export function buffer(seconds: number, sr: number): Float32Array {
  return new Float32Array(Math.max(1, Math.ceil(seconds * sr)));
}

// ---------------------------------------------------------------- filtros

/** Filtro biquad (fórmulas do "Audio EQ Cookbook"), forma transposta. */
export class Biquad {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private z1 = 0;
  private z2 = 0;

  constructor(
    readonly sr: number,
    type: BiquadType = 'lowpass',
    freq = 1000,
    q = 0.707,
    gainDb = 0,
  ) {
    this.set(type, freq, q, gainDb);
  }

  set(type: BiquadType, freq: number, q = 0.707, gainDb = 0): this {
    const f = Math.min(Math.max(freq, 10), this.sr * 0.45);
    const w = (TAU * f) / this.sr;
    const cw = Math.cos(w);
    const sw = Math.sin(w);
    const alpha = sw / (2 * Math.max(q, 0.05));
    const A = Math.pow(10, gainDb / 40);
    let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
    switch (type) {
      case 'lowpass':
        b0 = (1 - cw) / 2;
        b1 = 1 - cw;
        b2 = (1 - cw) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cw;
        a2 = 1 - alpha;
        break;
      case 'highpass':
        b0 = (1 + cw) / 2;
        b1 = -(1 + cw);
        b2 = (1 + cw) / 2;
        a0 = 1 + alpha;
        a1 = -2 * cw;
        a2 = 1 - alpha;
        break;
      case 'bandpass':
        // Pico de 0 dB no centro.
        b0 = alpha;
        b1 = 0;
        b2 = -alpha;
        a0 = 1 + alpha;
        a1 = -2 * cw;
        a2 = 1 - alpha;
        break;
      case 'peak':
        b0 = 1 + alpha * A;
        b1 = -2 * cw;
        b2 = 1 - alpha * A;
        a0 = 1 + alpha / A;
        a1 = -2 * cw;
        a2 = 1 - alpha / A;
        break;
      case 'lowshelf': {
        const sq = 2 * Math.sqrt(A) * alpha;
        b0 = A * (A + 1 - (A - 1) * cw + sq);
        b1 = 2 * A * (A - 1 - (A + 1) * cw);
        b2 = A * (A + 1 - (A - 1) * cw - sq);
        a0 = A + 1 + (A - 1) * cw + sq;
        a1 = -2 * (A - 1 + (A + 1) * cw);
        a2 = A + 1 + (A - 1) * cw - sq;
        break;
      }
      case 'highshelf': {
        const sq = 2 * Math.sqrt(A) * alpha;
        b0 = A * (A + 1 + (A - 1) * cw + sq);
        b1 = -2 * A * (A - 1 + (A + 1) * cw);
        b2 = A * (A + 1 + (A - 1) * cw - sq);
        a0 = A + 1 - (A - 1) * cw + sq;
        a1 = 2 * (A - 1 - (A + 1) * cw);
        a2 = A + 1 - (A - 1) * cw - sq;
        break;
      }
    }
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
    return this;
  }

  process(x: number): number {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }

  /** Filtra um trecho no lugar. */
  run(buf: Float32Array, start = 0, end = buf.length): Float32Array {
    for (let i = Math.max(0, start); i < Math.min(end, buf.length); i++) buf[i] = this.process(buf[i]!);
    return buf;
  }

  reset(): this {
    this.z1 = 0;
    this.z2 = 0;
    return this;
  }
}

export type BiquadType = 'lowpass' | 'highpass' | 'bandpass' | 'peak' | 'lowshelf' | 'highshelf';

/** Filtra `buf` inteiro por uma cadeia (cada filtro por vez). */
export function chain(buf: Float32Array, ...filters: Biquad[]): Float32Array {
  for (const f of filters) f.run(buf);
  return buf;
}

// ---------------------------------------------------------------- ruído

/** Ruído rosa (Paul Kellet): mais natural que o branco (vento, chuva, sopro). */
export class Pink {
  private b = [0, 0, 0, 0, 0, 0, 0];
  constructor(private readonly rng: Rng) {}
  next(): number {
    const w = this.rng.noise();
    const b = this.b;
    b[0] = 0.99886 * b[0]! + w * 0.0555179;
    b[1] = 0.99332 * b[1]! + w * 0.0750759;
    b[2] = 0.969 * b[2]! + w * 0.153852;
    b[3] = 0.8665 * b[3]! + w * 0.3104856;
    b[4] = 0.55 * b[4]! + w * 0.5329522;
    b[5] = -0.7616 * b[5]! - w * 0.016898;
    const out = b[0]! + b[1]! + b[2]! + b[3]! + b[4]! + b[5]! + b[6]! + w * 0.5362;
    b[6] = w * 0.115926;
    return out * 0.11;
  }
}

/** Ruído marrom (grave, "ronco"): trovão, estrondo, motor. */
export class Brown {
  private last = 0;
  constructor(private readonly rng: Rng) {}
  next(): number {
    this.last = (this.last + 0.02 * this.rng.noise()) / 1.02;
    return this.last * 3.5;
  }
}

// ---------------------------------------------------------------- blocos

/** Soma `src` em `out` a partir de `at` (amostras), com ganho. */
export function addAt(out: Float32Array, src: Float32Array, at: number, gain = 1): void {
  const s = Math.max(0, Math.round(at));
  const n = Math.min(src.length, out.length - s);
  for (let i = 0; i < n; i++) out[s + i] = out[s + i]! + src[i]! * gain;
}

/**
 * Rajada de ruído filtrada com envelope (ataque, queda exponencial): a peça
 * básica de passos, golpes, estalos e respingos.
 */
export function burst(
  out: Float32Array,
  sr: number,
  rng: Rng,
  o: {
    at: number;
    dur: number;
    gain: number;
    attack?: number;
    /** Constante de queda (s). */
    tau?: number;
    type?: BiquadType;
    freq?: number;
    q?: number;
    /** Frequência final (varredura linear em log). */
    freqEnd?: number;
    color?: 'white' | 'pink' | 'brown';
  },
): void {
  const start = Math.round(o.at * sr);
  const n = Math.round(o.dur * sr);
  const f = new Biquad(sr, o.type ?? 'bandpass', o.freq ?? 2000, o.q ?? 0.8);
  const pink = o.color === 'pink' ? new Pink(rng) : null;
  const brown = o.color === 'brown' ? new Brown(rng) : null;
  const attack = Math.max(1, Math.round((o.attack ?? 0.001) * sr));
  const tau = o.tau ?? o.dur / 4;
  const f0 = o.freq ?? 2000;
  const f1 = o.freqEnd;
  for (let i = 0; i < n && start + i < out.length; i++) {
    if (f1 !== undefined && (i & 31) === 0) f.set(o.type ?? 'bandpass', f0 * Math.pow(f1 / f0, i / n), o.q ?? 0.8);
    const t = i / sr;
    const env = (i < attack ? i / attack : 1) * Math.exp(-t / tau);
    const x = pink ? pink.next() : brown ? brown.next() : rng.noise();
    if (start + i >= 0) out[start + i] = out[start + i]! + f.process(x) * env * o.gain;
  }
}

/** Um modo de ressonância: frequência (Hz), amplitude e queda (s até ~-60 dB). */
export interface Mode {
  f: number;
  a: number;
  d: number;
}

/** Soma senoides amortecidas (modos de vibração de um material batido). */
export function modes(out: Float32Array, sr: number, at: number, list: readonly Mode[], gain: number, rng?: Rng): void {
  const start = Math.round(at * sr);
  for (const m of list) {
    if (m.f >= sr * 0.45 || m.a <= 0) continue;
    const n = Math.min(out.length - start, Math.round(m.d * sr * 1.2));
    const w = (TAU * m.f) / sr;
    // Oscilador recursivo (barato): s[n] = 2cos(w)s[n-1] - s[n-2].
    const k = 2 * Math.cos(w);
    const ph = rng ? rng.range(0, TAU) : 0;
    let s1 = Math.sin(ph - w);
    let s2 = Math.sin(ph - 2 * w);
    const decay = Math.exp(-6.9 / (m.d * sr));
    let env = m.a * gain;
    for (let i = 0; i < n; i++) {
      const s0 = k * s1 - s2;
      s2 = s1;
      s1 = s0;
      if (start + i >= 0) out[start + i] = out[start + i]! + s0 * env;
      env *= decay;
    }
  }
}

/**
 * Grão: um estalinho de ruído bem curto numa faixa (esmagar neve, cascalho,
 * grama, cacos pequenos). Muitos grãos juntos = crocância.
 */
export function grain(out: Float32Array, sr: number, rng: Rng, at: number, dur: number, freq: number, q: number, gain: number): void {
  const start = Math.round(at * sr);
  const n = Math.max(2, Math.round(dur * sr));
  const f = new Biquad(sr, 'bandpass', freq, q);
  for (let i = 0; i < n && start + i < out.length; i++) {
    // Janela de Hann: grão sem clique.
    const env = 0.5 - 0.5 * Math.cos((TAU * i) / (n - 1));
    if (start + i >= 0) out[start + i] = out[start + i]! + f.process(rng.noise()) * env * gain;
  }
}

/** Baque grave: senoide que desce de tom (corpo, chão, estrondo). */
export function thump(out: Float32Array, sr: number, at: number, f0: number, f1: number, dur: number, gain: number): void {
  const start = Math.round(at * sr);
  const n = Math.round(dur * sr);
  let ph = 0;
  for (let i = 0; i < n && start + i < out.length; i++) {
    const t = i / n;
    const f = f0 * Math.pow(f1 / f0, t);
    ph += (TAU * f) / sr;
    const env = Math.min(1, i / (0.002 * sr)) * Math.exp(-t * 5);
    if (start + i >= 0) out[start + i] = out[start + i]! + Math.sin(ph) * env * gain;
  }
}

/**
 * Rangido por atrito ("stick-slip"): trancos rápidos com ritmo variando,
 * passando por ressonâncias — dobradiça, madeira do assoalho, galho.
 */
export function creak(
  out: Float32Array,
  sr: number,
  rng: Rng,
  o: { at: number; dur: number; gain: number; rate0: number; rate1: number; res: readonly { f: number; q: number; a: number }[] },
): void {
  const start = Math.round(o.at * sr);
  const n = Math.round(o.dur * sr);
  const exc = new Float32Array(n);
  let next = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    // Ritmo do tranco sobe e desce (a mão empurra a porta de forma irregular).
    const rate = o.rate0 + (o.rate1 - o.rate0) * t + Math.sin(t * 7 + o.rate0) * o.rate0 * 0.25;
    if (i >= next) {
      exc[i] = rng.range(0.6, 1);
      next = i + Math.max(2, Math.round((sr / Math.max(8, rate)) * rng.range(0.8, 1.2)));
    }
  }
  const env = (i: number) => {
    const t = i / n;
    return Math.min(1, t * 8) * Math.min(1, (1 - t) * 5) * (0.7 + 0.3 * Math.sin(t * 11 + o.rate1));
  };
  const tmp = new Float32Array(n);
  for (const r of o.res) {
    const f = new Biquad(sr, 'bandpass', r.f, r.q);
    for (let i = 0; i < n; i++) tmp[i] = tmp[i]! + f.process(exc[i]!) * r.a;
  }
  for (let i = 0; i < n && start + i < out.length; i++) out[start + i] = out[start + i]! + tmp[i]! * env(i) * o.gain;
}

/**
 * Voz pelo modelo fonte-filtro: pulso da garganta (com tremor e soprosidade)
 * passando pelas ressonâncias da boca (formantes que andam no tempo).
 */
export function voice(
  out: Float32Array,
  sr: number,
  rng: Rng,
  o: {
    at: number;
    dur: number;
    gain: number;
    /** Altura (Hz) ao longo do tempo 0..1. */
    f0: (t: number) => number;
    /** Formantes ao longo do tempo: frequência, largura (Q) e peso. */
    formants: (t: number) => readonly { f: number; q: number; a: number }[];
    /** Envelope de volume 0..1 ao longo do tempo. */
    env: (t: number) => number;
    /** Sopro/ar (0..1), tremor de altura e de volume, voz rouca (fry). */
    breath: number;
    jitter: number;
    shimmer: number;
    fry: number;
  },
): void {
  const start = Math.round(o.at * sr);
  const n = Math.round(o.dur * sr);
  const src = new Float32Array(n);
  const air = new Float32Array(n);
  let ph = 0;
  let amp = 1;
  let period = 0;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    let f0 = o.f0(t) * (1 + (rng.next() - 0.5) * o.jitter * 0.1);
    // Voz rouca: períodos irregulares e mais longos de vez em quando.
    if (o.fry > 0 && rng.chance(o.fry * 0.002)) period = rng.range(0.01, 0.03) * sr;
    if (period > 0) {
      period--;
      f0 *= 0.45;
    }
    ph += f0 / sr;
    if (ph >= 1) {
      ph -= 1;
      amp = 1 + (rng.next() - 0.5) * o.shimmer;
    }
    // Pulso de Rosenberg: abre devagar, fecha rápido, fica fechado.
    const p = ph;
    const g = p < 0.4 ? 0.5 * (1 - Math.cos((Math.PI * p) / 0.4)) : p < 0.6 ? Math.cos((Math.PI * (p - 0.4)) / 0.4) : 0;
    const d = g - prev;
    prev = g;
    src[i] = d * 8 * amp;
    // Ar: mais forte quando a glote abre.
    air[i] = rng.noise() * (0.3 + g) * o.breath;
  }
  const tmp = new Float32Array(n);
  let fs = o.formants(0);
  let filters = fs.map((f) => new Biquad(sr, 'bandpass', f.f, f.q));
  for (let i = 0; i < n; i++) {
    if ((i & 63) === 0) {
      fs = o.formants(i / n);
      if (fs.length !== filters.length) filters = fs.map((f) => new Biquad(sr, 'bandpass', f.f, f.q));
      else fs.forEach((f, k) => filters[k]!.set('bandpass', f.f, f.q));
    }
    const x = src[i]! + air[i]!;
    let y = 0;
    for (let k = 0; k < filters.length; k++) y += filters[k]!.process(x) * fs[k]!.a;
    tmp[i] = y * o.env(i / n);
  }
  for (let i = 0; i < n && start + i < out.length; i++) out[start + i] = out[start + i]! + tmp[i]! * o.gain;
}

// ---------------------------------------------------------------- acabamento

/** Saturação suave (estouro de tiro, motor): corpo sem estourar digital. */
export function soft(buf: Float32Array, drive: number): Float32Array {
  const k = Math.tanh(drive);
  for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i]! * drive) / k;
  return buf;
}

/** Tira o nível contínuo e o grave inútil (< 25 Hz), normaliza o pico e suaviza o fim. */
export function finish(buf: Float32Array, sr: number, peak = 0.9): Float32Array {
  new Biquad(sr, 'highpass', 25, 0.7).run(buf);
  let m = 0;
  for (let i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i]!));
  const k = m > 1e-6 ? peak / m : 0;
  const fade = Math.min(buf.length, Math.round(0.006 * sr));
  for (let i = 0; i < buf.length; i++) {
    let v = buf[i]! * k;
    const fromEnd = buf.length - 1 - i;
    if (fromEnd < fade) v *= fromEnd / fade;
    if (i < 8) v *= i / 8;
    buf[i] = v;
  }
  return buf;
}

/** Corta o silêncio do fim (economiza memória). */
export function trim(buf: Float32Array, sr: number, floor = 0.0015): Float32Array {
  let end = buf.length;
  while (end > 1 && Math.abs(buf[end - 1]!) < floor) end--;
  end = Math.min(buf.length, end + Math.round(0.01 * sr));
  return end < buf.length ? buf.slice(0, end) : buf;
}

/**
 * Resposta de sala para a reverberação (estéreo): primeiras reflexões nas
 * paredes/prédios e cauda de ruído que morre mais rápido nos agudos.
 */
export function impulseResponse(
  sr: number,
  seed: number,
  o: { seconds: number; decay: number; hfDecay: number; early: readonly { t: number; g: number }[]; predelay: number },
): [Float32Array, Float32Array] {
  const out: [Float32Array, Float32Array] = [buffer(o.seconds, sr), buffer(o.seconds, sr)];
  out.forEach((ch, c) => {
    const rng = new Rng(seed + c * 7919);
    const lp = new Biquad(sr, 'lowpass', 9000, 0.6);
    const pd = Math.round(o.predelay * sr);
    for (let i = pd; i < ch.length; i++) {
      const t = (i - pd) / sr;
      // Agudos morrem antes: filtro que fecha com o tempo.
      if ((i & 127) === 0) lp.set('lowpass', 9000 * Math.exp(-t / o.hfDecay) + 400, 0.6);
      ch[i] = lp.process(rng.noise()) * Math.exp((-6.9 * t) / o.decay) * 0.5;
    }
    for (const e of o.early) {
      const at = Math.round((e.t + o.predelay * 0.3) * sr * rng.range(0.94, 1.06));
      if (at < ch.length) {
        ch[at] = ch[at]! + e.g * (c === 0 ? 1 : 0.85) * (rng.chance(0.5) ? 1 : -1);
        if (at + 1 < ch.length) ch[at + 1] = ch[at + 1]! + e.g * 0.5;
      }
    }
  });
  return out;
}
