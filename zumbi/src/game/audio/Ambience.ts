/**
 * AMBIENTE AO VIVO: chuva (lá fora ou no telhado), vento com rajadas e
 * assobio, trovão ao longe, bichos pela hora e estação (pássaros de dia,
 * grilos em noite quente, corvos no frio), fogo perto, gerador ligado e o
 * motor do carro subindo de giro pelas marchas.
 *
 * Só lê o estado do jogo (clima, relógio, onde o jogador está) e mexe nos
 * laços do motor de áudio. Nada aqui muda o jogo.
 */
import { AMBIENCE_TUNING as A } from '../config/AudioTuning';
import type { AudioEngine, LoopVoice, PlayOptions } from './AudioEngine';
import type { Placement } from './spatial';

export interface AmbienceState {
  rain: number;
  snow: number;
  wind: number;
  /** Trovoada 0..1 (ronco ao longe de vez em quando). */
  thunder: number;
  temp: number;
  minuteOfDay: number;
  /** Horas de sol do dia (estação). */
  dayHours: number;
  /** "Inverno" e "verão" contínuos 0..1. */
  winter: number;
  summer: number;
  /** Debaixo de teto (a chuva vira batucada no telhado). */
  sheltered: boolean;
  /** Tempo acelerado (dormindo, ação demorada): sem bicho nem estalo. */
  busy: boolean;
  fires: readonly { x: number; y: number; power: number }[];
  generators: readonly { x: number; y: number }[];
  /** Dirigindo: velocidade (km/h), motor morto e rumo (rad, para a derrapagem). */
  engine: { kmh: number; stalled: boolean; heading?: number } | null;
  /** O prédio onde o jogador está tem energia (geladeira zumbindo). */
  powered?: boolean;
}

export interface AmbienceHooks {
  /** Posição do jogador. */
  listener(): { x: number; y: number };
  /** Onde o som em (x, y) fica para quem ouve (distância, parede). */
  place(id: string, x: number, y: number): Placement | null;
  /** Toca um som solto num ponto (com parede e distância). */
  at(id: string, x: number, y: number, o?: PlayOptions): void;
  /** Toca um som solto sem posição. */
  near(id: string, o?: PlayOptions): void;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export class Ambience {
  private readonly loops = new Map<string, LoopVoice>();
  private tick = 0;
  private gust = 0.5;
  private gustTarget = 0.5;
  private gustT = 0;
  private birdT = 3;
  private crowT = 20;
  private thunderT = 8;
  private crackleT = 0.5;
  private kmh = 0;
  private load = 0;
  private heading: number | null = null;
  private gear = 0;
  private skidT = 0;
  private creakT = 30;
  private dogT = 60;

  constructor(
    private readonly engine: AudioEngine,
    private readonly hooks: AmbienceHooks,
    private readonly rnd: () => number = Math.random,
  ) {}

  stop(): void {
    for (const l of this.loops.values()) l.stop(0.3);
    this.loops.clear();
  }

  update(dt: number, st: AmbienceState): void {
    this.gustStep(dt);
    this.events(dt, st);
    this.tick -= dt;
    if (this.tick > 0) return;
    this.tick = A.updateEvery;
    this.weather(st);
    this.critters(st);
    this.fire(st);
    this.generator(st);
    this.car(st);
  }

  // ---------------------------------------------------------------- laços

  /** Liga, ajusta ou desliga um laço (volume 0 = desliga com fade). */
  private slot(key: string, id: string, gain: number, o: { rate?: number; cutoff?: number; pan?: number; wet?: number; room?: 'rua' | 'comodo' } = {}, tau = A.updateEvery * 1.5): void {
    let v = this.loops.get(key);
    if (v && !v.alive) {
      this.loops.delete(key);
      v = undefined;
    }
    if (gain < 0.004) {
      if (v) {
        v.stop(0.8);
        this.loops.delete(key);
      }
      return;
    }
    if (!v) {
      const nv = this.engine.loop(id, { ...o, gain: 0 });
      if (!nv) return;
      this.loops.set(key, nv);
      v = nv;
    }
    v.set({ gain, ...(o.rate !== undefined ? { rate: o.rate } : {}), ...(o.cutoff !== undefined ? { cutoff: o.cutoff } : {}), ...(o.pan !== undefined ? { pan: o.pan } : {}), ...(o.wet !== undefined ? { wet: o.wet } : {}) }, tau);
  }

  /** Rajadas: alvo novo a cada 1–4 s, o vento corre atrás devagar. */
  private gustStep(dt: number): void {
    this.gustT -= dt;
    if (this.gustT <= 0) {
      this.gustT = 1 + this.rnd() * 3;
      this.gustTarget = Math.pow(this.rnd(), 0.7);
    }
    this.gust += (this.gustTarget - this.gust) * Math.min(1, dt * 0.9);
  }

  private weather(st: AmbienceState): void {
    const r = st.rain;
    const heavy = smoothstep(0.3, 0.7, r);
    const inside = st.sheltered;
    // Lá fora: garoa e temporal se misturam pela força; debaixo do teto, só o de fora abafado.
    const out = inside ? A.rainThroughRoof : 1;
    const cut = inside ? 900 : 20000;
    // Entrar/sair de casa: a chuva muda em ~meio segundo (porta abrindo), não num corte.
    const tau = A.transition;
    this.slot('chuvaFraca', 'amb.chuvaFraca', r * (1 - heavy) * A.rainLight * out, { cutoff: cut }, tau);
    this.slot('chuvaForte', 'amb.chuvaForte', r * heavy * A.rainHeavy * out, { cutoff: cut }, tau);
    this.slot('telhado', 'amb.chuvaTelhado', inside && !st.engine ? Math.sqrt(r) * A.roof : 0, {}, tau);
    // Dentro do carro: chuva batendo no teto fino (mais aguda que a de casa).
    this.slot('chuvaCarro', 'amb.chuvaTelhado', st.engine && r > 0.03 ? Math.sqrt(r) * A.carRain : 0, { rate: 1.18, cutoff: 6000 }, tau);
    // Ar parado de dentro de casa e, com energia, a geladeira.
    this.slot('casa', 'amb.casa', inside && !st.engine ? A.roomTone : 0, {}, tau);
    this.slot('geladeira', 'amb.geladeira', inside && st.powered ? A.fridge : 0, {}, tau);
    // Vento: volume e brilho seguem a rajada; dentro de casa, abafado.
    const w = Math.max(st.wind, st.snow * 0.3);
    const g = Math.pow(w, 1.3) * (0.3 + 0.7 * this.gust);
    this.slot('vento', 'amb.vento', g * A.wind * (inside ? 0.35 : 1), { cutoff: inside ? 500 : 400 + 2600 * w * this.gust }, A.transition * 0.6);
    const whistle = smoothstep(0.55, 0.9, w) * this.gust;
    this.slot('assobio', 'amb.ventoAssobio', whistle * A.whistle * (inside ? 0.7 : 1), { rate: 0.94 + 0.12 * this.gust });
  }

  private critters(st: AmbienceState): void {
    const half = st.dayHours * 30;
    const m = st.minuteOfDay;
    const night = m < 720 - half - 20 || m > 720 + half + 30;
    const warm = smoothstep(12, 20, st.temp) * (1 - st.winter);
    const quiet = 1 - smoothstep(0.1, 0.4, st.rain);
    // Dentro de casa ainda se ouve pela janela: mais baixo, sem cortar o agudo (o canto é todo agudo).
    const g = night ? warm * quiet * A.crickets * (st.sheltered ? 0.35 : 1) : 0;
    this.slot('grilos', 'amb.grilos', g, { cutoff: st.sheltered ? 7000 : 20000 });
    // Cigarras: tarde quente de verão, sem chuva.
    const hot = smoothstep(24, 31, st.temp) * smoothstep(0.2, 0.6, st.summer);
    const cig = !night && m > 600 && m < 1080 ? hot * quiet * A.cicadas * (st.sheltered ? 0.3 : 1) : 0;
    this.slot('cigarras', 'amb.cigarras', cig, { cutoff: st.sheltered ? 6000 : 20000 }, A.transition);
  }

  private fire(st: AmbienceState): void {
    const l = this.hooks.listener();
    let best: { x: number; y: number; power: number; d: number } | null = null;
    for (const f of st.fires) {
      const d = Math.hypot(f.x - l.x, f.y - l.y);
      if (!best || d < best.d) best = { ...f, d };
    }
    const p = best ? this.hooks.place('amb.fogo', best.x, best.y) : null;
    this.slot('fogo', 'amb.fogo', p && best ? p.gain * A.fire * (0.5 + 0.5 * best.power) : 0, p ? { pan: p.pan, cutoff: p.cutoff } : {});
  }

  private generator(st: AmbienceState): void {
    const l = this.hooks.listener();
    let best: { x: number; y: number; d: number } | null = null;
    for (const s of st.generators) {
      const d = Math.hypot(s.x - l.x, s.y - l.y);
      if (!best || d < best.d) best = { ...s, d };
    }
    const p = best ? this.hooks.place('amb.gerador', best.x, best.y) : null;
    this.slot('gerador', 'amb.gerador', p ? p.gain * A.generator : 0, p ? { pan: p.pan, cutoff: p.cutoff, wet: p.wet * 0.5 } : {});
  }

  /**
   * Motor: giro sobe em cada marcha e cai na troca (como um carro de
   * verdade); acelerando, o som fica mais cheio e mais aberto.
   */
  private car(st: AmbienceState): void {
    const e = st.engine;
    const kmh = e ? Math.abs(e.kmh) : 0;
    // Rodagem: pneu no chão e vento na lataria crescem com a velocidade; molhado chia mais.
    const roll = Math.min(1, kmh / 70);
    this.slot('rodagem', 'amb.rodagem', e ? roll * A.road * (1 + st.rain * 0.4) : 0, { cutoff: 250 + kmh * 35 + st.rain * 2500, rate: 0.85 + roll * 0.3 });
    if (!e || e.stalled) {
      this.slot('motor', 'amb.motor', 0);
      this.kmh = 0;
      this.heading = null;
      this.gear = 0;
      return;
    }
    const accel = (kmh - this.kmh) / A.updateEvery;
    this.kmh = kmh;
    this.load += (Math.max(0, Math.min(1, accel / 12)) - this.load) * 0.35;
    const rpm = engineRpm(kmh);
    this.slot('motor', 'amb.motor', A.engine * (0.55 + 0.45 * this.load), { rate: rpm / 1000, cutoff: 900 + 3200 * this.load + rpm * 0.4 });
    // Troca de marcha: o câmbio encaixando.
    const gear = gearOf(kmh);
    if (gear > this.gear && this.gear > 0) this.hooks.near('carro.marcha', { gain: 0.8 });
    this.gear = gear;
    // Pneu cantando: curva fechada rápida ou freada forte.
    this.skidT -= A.updateEvery;
    if (e.heading !== undefined) {
      if (this.heading !== null && this.skidT <= 0) {
        let d = e.heading - this.heading;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        const lateral = (Math.abs(d) / A.updateEvery) * kmh;
        if (lateral > A.skidLateral || (accel < -A.skidBrake && kmh > 20)) {
          this.skidT = 0.9;
          this.hooks.near('carro.derrapar', { gain: Math.min(1, 0.5 + lateral / (A.skidLateral * 3)) });
        }
      }
      this.heading = e.heading;
    }
  }

  // ---------------------------------------------------------------- sons soltos

  private events(dt: number, st: AmbienceState): void {
    const l = this.hooks.listener();
    // Trovão ao longe (sem raio à vista): ronco de vez em quando.
    if (st.thunder > 0.05) {
      this.thunderT -= dt;
      if (this.thunderT <= 0) {
        this.thunderT = A.thunderEvery * (0.5 + this.rnd()) / Math.max(0.2, st.thunder);
        this.hooks.near('clima.trovao', { gain: 0.35 + 0.5 * st.thunder, pan: (this.rnd() * 2 - 1) * 0.6, cutoff: st.sheltered ? 500 : 1400, rate: 0.85 + this.rnd() * 0.2 });
      }
    }
    if (st.busy) return;
    // Casa rangendo de vez em quando (mais com vento).
    if (st.sheltered && !st.engine) {
      this.creakT -= dt * (1 + st.wind * 2);
      if (this.creakT <= 0) {
        this.creakT = 40 + this.rnd() * 90;
        this.hooks.near('amb.rangido', { pan: (this.rnd() * 2 - 1) * 0.7, gain: 0.5 + this.rnd() * 0.5 });
      }
    }
    const half = st.dayHours * 30;
    const m = st.minuteOfDay;
    const sunrise = 720 - half;
    const sunset = 720 + half;
    const day = m > sunrise - 20 && m < sunset + 10;
    const calm = 1 - smoothstep(0.15, 0.4, st.rain);
    const windy = 1 - smoothstep(0.5, 0.85, st.wind) * 0.8;
    // Pássaros: de manhã cedo é o coro; no inverno quase nenhum.
    if (day && st.temp > 0) {
      const dawn = m < sunrise + 100 ? 2.5 : m > sunset - 60 ? 1.5 : 1;
      const rate = A.birdsPerSec * dawn * (1 - 0.85 * st.winter) * calm * windy;
      this.birdT -= dt * rate;
      if (this.birdT <= 0) {
        this.birdT = -Math.log(1 - this.rnd() * 0.98);
        this.around('bicho.passaro', l, 260, 900);
      }
      const crows = A.crowsPerSec * (0.3 + st.winter) * calm;
      this.crowT -= dt * crows;
      if (this.crowT <= 0) {
        this.crowT = -Math.log(1 - this.rnd() * 0.98);
        this.around('bicho.corvo', l, 500, 1400);
      }
    }
    // Cachorro latindo longe, de noite (raro).
    if (!day && st.rain < 0.3) {
      this.dogT -= dt;
      if (this.dogT <= 0) {
        this.dogT = 70 + this.rnd() * 160;
        this.around('bicho.cachorro', l, 1400, 2400);
      }
    }
    // Estalos da lenha, no fogo mais perto.
    const f = st.fires.reduce<{ x: number; y: number; power: number } | null>((b, x) => (!b || Math.hypot(x.x - l.x, x.y - l.y) < Math.hypot(b.x - l.x, b.y - l.y) ? x : b), null);
    if (f && Math.hypot(f.x - l.x, f.y - l.y) < 480) {
      this.crackleT -= dt * (A.cracklesPerSec * (0.4 + f.power));
      if (this.crackleT <= 0) {
        this.crackleT = -Math.log(1 - this.rnd() * 0.98);
        this.hooks.at('fogo.estalo', f.x + (this.rnd() - 0.5) * 20, f.y + (this.rnd() - 0.5) * 20);
      }
    }
  }

  /** Bicho num ponto sorteado em volta (a parede abafa se estiver dentro de casa). */
  private around(id: string, l: { x: number; y: number }, r0: number, r1: number): void {
    const a = this.rnd() * Math.PI * 2;
    const d = r0 + this.rnd() * (r1 - r0);
    this.hooks.at(id, l.x + Math.cos(a) * d, l.y + Math.sin(a) * d);
  }
}

/** Marcha engatada pela velocidade (1 = primeira). */
export function gearOf(kmh: number): number {
  const g = A.gears;
  let i = 0;
  while (i < g.length - 1 && kmh >= g[i + 1]!) i++;
  return kmh < 3 ? 0 : i + 1;
}

/** Giro do motor pela velocidade: sobe em cada marcha, cai na troca (puro, testável). */
export function engineRpm(kmh: number): number {
  const gears = A.gears;
  const v = Math.max(0, kmh);
  if (v < 3) return A.idleRpm;
  let i = 0;
  while (i < gears.length - 1 && v >= gears[i + 1]!) i++;
  const lo = gears[i]!;
  const hi = gears[i + 1] ?? lo + 60;
  const t = Math.min(1, (v - lo) / (hi - lo));
  return Math.min(A.maxRpm, A.shiftLow + (A.shiftHigh - A.shiftLow) * t);
}
