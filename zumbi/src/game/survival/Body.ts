/**
 * O CORPO do sobrevivente: fome, sede, cansaço (sono), temperatura corporal,
 * molhado, doença (comida/água ruim) e ânimo. Lógica pura, avançada em
 * MINUTOS DE JOGO (o relógio acelera quando você dorme ou faz algo demorado,
 * e tudo continua coerente).
 *
 * Nada aqui mexe na vida diretamente: `update` devolve quanto a vida mudou
 * (inanição, desidratação, hipotermia, doença; ou recuperação natural) e
 * quem chama aplica. Os EFEITOS no movimento/fôlego/ações ficam em Effects.ts.
 */
import { HEALTH_DRAIN, NEEDS_TUNING, STATE_LEVELS, THERMAL_TUNING, WET_TUNING } from '../config/SurvivalTuning';
import { clamp } from '../core/math';
import type { ConsumeEffect, Tone } from '../items/condition';

export interface BodySnapshot {
  hunger: number;
  thirst: number;
  fatigue: number;
  temp: number;
  wet: number;
  sickness: number;
  morale: number;
}

export type Activity = 'idle' | 'walk' | 'run';

/** O que o mundo diz ao corpo neste intervalo. */
export interface BodyContext {
  /** Temperatura do ar (°C). */
  airTemp: number;
  /** Debaixo de telhado (casa, cobertura). */
  sheltered: boolean;
  /** Chuva 0..1 e vento 0..1 lá fora. */
  rain: number;
  wind: number;
  /** Soma do isolamento das roupas vestidas (≈0–2,5). */
  insulation: number;
  /** Veste algo impermeável (capa de chuva). */
  raincoat: boolean;
  activity: Activity;
  sleeping: boolean;
  /** Dormindo coberto (cobertor na cama). */
  blanket: boolean;
  /** Recuperação do sono (cama 1, sofá 0,8, chão 0,6). */
  sleepQuality: number;
  /** Calor de fogo perto (0..1). */
  fireHeat: number;
  /** Febre (infecção): °C a mais no "termostato". */
  fever: number;
  /** Ferida aberta sangrando ou infecção: não recupera vida sozinho. */
  woundsBlockRegen: boolean;
  /** Dor 0..100 (tira ânimo). */
  pain: number;
}

export const DEFAULT_CONTEXT: BodyContext = {
  airTemp: 22,
  sheltered: true,
  rain: 0,
  wind: 0,
  insulation: 0.6,
  raincoat: false,
  activity: 'idle',
  sleeping: false,
  blanket: false,
  sleepQuality: 1,
  fireHeat: 0,
  fever: 0,
  woundsBlockRegen: false,
  pain: 0,
};

export interface BodyRates {
  /** Multiplicadores do sandbox. */
  hunger: number;
  thirst: number;
  fatigue: number;
}

export interface BodyState {
  id: string;
  label: string;
  /** 1 = leve, 2 = médio, 3 = grave. */
  level: 1 | 2 | 3;
  tone: Tone;
}

/** Temperatura "sentida" (°C) — o que decide se o corpo esfria ou esquenta. */
export function feltTemperature(ctx: BodyContext, wet: number): number {
  const t = THERMAL_TUNING;
  let air = ctx.airTemp;
  if (ctx.sheltered && air < t.indoorTarget) air += (t.indoorTarget - air) * t.indoorBlend;
  let felt = air + ctx.insulation * t.insulationC + ctx.fireHeat * t.fireC;
  if (ctx.activity === 'walk') felt += t.walkC;
  else if (ctx.activity === 'run') felt += t.runC;
  const wind = ctx.sheltered ? 0 : ctx.wind;
  felt -= wet * t.wetC * (1 + wind) + wind * t.windC;
  if (ctx.sleeping) felt += ctx.blanket ? t.blanketC : t.sleepC;
  return felt;
}

export class Body {
  hunger = 10;
  thirst = 10;
  fatigue = 15;
  temp: number = THERMAL_TUNING.normal;
  wet = 0;
  sickness = 0;
  morale = 70;

  constructor(private readonly rates: BodyRates = { hunger: 1, thirst: 1, fatigue: 1 }) {}

  /**
   * Avança `minutes` minutos de jogo. Devolve a variação de vida (negativa =
   * perdendo). Intervalos longos (dormir) são feitos em passos de 10 min.
   */
  update(minutes: number, ctx: BodyContext): number {
    let health = 0;
    let left = minutes;
    while (left > 0) {
      const step = Math.min(10, left);
      health += this.step(step / 60, ctx);
      left -= step;
    }
    return health;
  }

  private step(h: number, ctx: BodyContext): number {
    const n = NEEDS_TUNING;
    const run = ctx.activity === 'run';
    const cold = this.temp < STATE_LEVELS.coldTemp[0];
    const hot = this.temp > STATE_LEVELS.hotTemp[0];
    // Necessidades
    this.hunger += n.hungerPerHour * this.rates.hunger * h * (ctx.sleeping ? n.sleepHunger : run ? n.sprintHunger : 1) * (cold ? n.coldHunger : 1);
    this.thirst += n.thirstPerHour * this.rates.thirst * h * (ctx.sleeping ? n.sleepThirst : run ? n.sprintThirst : 1) * (hot ? n.heatThirst : 1) * (this.sickness > 0.3 ? 1.3 : 1);
    if (ctx.sleeping) this.fatigue -= n.sleepRecoveryPerHour * ctx.sleepQuality * h;
    else this.fatigue += n.fatiguePerHour * this.rates.fatigue * h * (run ? n.sprintFatigue : 1);
    this.hunger = clamp(this.hunger, 0, 100);
    this.thirst = clamp(this.thirst, 0, 100);
    this.fatigue = clamp(this.fatigue, 0, 100);

    // Molhado: chuva lá fora molha (capa segura quase tudo); abrigo, fogo e calor secam.
    const w = WET_TUNING;
    const rainIn = ctx.sheltered ? 0 : ctx.rain * w.rainPerHour * (ctx.raincoat ? w.raincoat : 1);
    const felt0 = feltTemperature(ctx, this.wet);
    const dry = w.dryPerHour * (ctx.sheltered ? w.dryShelter : 1) * (1 + ctx.fireHeat * w.dryFire) * (felt0 > 26 ? 1.5 : 1);
    this.wet = clamp(this.wet + (rainIn - (rainIn > 0 ? 0 : dry)) * h, 0, 1);

    // Temperatura do corpo: termorregulação + frio/calor sentido + febre.
    const t = THERMAL_TUNING;
    const felt = feltTemperature(ctx, this.wet);
    let drive = 0;
    if (felt < t.comfortLow) drive = -t.coldDrive * (t.comfortLow - felt);
    else if (felt > t.comfortHigh) drive = t.heatDrive * (felt - t.comfortHigh);
    drive += ctx.fever * t.regulation;
    this.temp += ((t.normal - this.temp) * t.regulation + drive) * h;
    this.temp = clamp(this.temp, 30, 43);

    // Doença alimentar passa sozinha.
    this.sickness = clamp(this.sickness - n.sicknessDecayPerHour * h, 0, 1);

    // Vida: extremos tiram; bem cuidado recupera.
    const d = HEALTH_DRAIN;
    let health = 0;
    if (this.hunger >= 95) health -= d.starving * h;
    if (this.thirst >= 95) health -= d.dehydrated * h;
    if (this.temp < 35) health -= d.hypothermia * h * Math.min(2, 35 - this.temp + 0.5);
    if (this.temp > 39.5) health -= d.hyperthermia * h * Math.min(2, this.temp - 39.5 + 0.5);
    if (this.sickness > 0.25) health -= d.sickness * this.sickness * h;
    const fine = this.hunger < 70 && this.thirst < 70 && this.sickness < 0.25 && this.temp > 35.5 && this.temp < 38.8 && !ctx.woundsBlockRegen;
    if (fine) health += (ctx.sleeping ? d.regenSleeping : d.regen) * h;

    // Ânimo: vai devagar até o que as condições permitem.
    const target = this.moraleTarget(ctx);
    const rate = this.morale > target ? 4 : 7;
    this.morale += clamp(target - this.morale, -rate * h, rate * h);
    this.morale = clamp(this.morale, 0, 100);
    return health;
  }

  private moraleTarget(ctx: BodyContext): number {
    let m = 65;
    if (this.hunger < 30 && this.thirst < 30) m += 10;
    if (this.hunger > 55) m -= 12;
    if (this.thirst > 50) m -= 12;
    if (this.wet > 0.5) m -= 10;
    if (this.temp < 36 || this.temp > 38) m -= 14;
    if (this.sickness > 0.3) m -= 12;
    if (this.fatigue > 75) m -= 8;
    m -= ctx.pain * 0.3;
    return clamp(m, 5, 90);
  }

  /** Aplica o que foi comido/bebido (a doença entra aqui e tira vida com o tempo). */
  consume(e: ConsumeEffect): void {
    this.hunger = clamp(this.hunger - e.hunger, 0, 100);
    this.thirst = clamp(this.thirst - e.thirst, 0, 100);
    if (e.sickness > 0) this.sickness = clamp(this.sickness + e.sickness * 0.7, 0, 1);
    // Comer bem com fome levanta o ânimo; comida estragada derruba.
    if (e.sickness > 0) this.morale = clamp(this.morale - 8, 0, 100);
    else if (e.hunger >= 15) this.morale = clamp(this.morale + 3, 0, 100);
  }

  /** Ânimo sobe/desce na hora (livro, foto, música no rádio...). Acima do alvo, volta devagar. */
  cheer(amount: number): void {
    this.morale = clamp(this.morale + amount, 0, 100);
  }

  /** Estados que aparecem na tela (só os que importam agora). */
  states(): BodyState[] {
    const L = STATE_LEVELS;
    const out: BodyState[] = [];
    const lvl = (v: number, th: readonly number[], rising = true): 0 | 1 | 2 | 3 => {
      const cmp = (x: number, t: number) => (rising ? x >= t : x <= t);
      return cmp(v, th[2]!) ? 3 : cmp(v, th[1]!) ? 2 : cmp(v, th[0]!) ? 1 : 0;
    };
    const push = (id: string, level: number, labels: readonly [string, string, string]) => {
      if (level > 0) out.push({ id, label: labels[level - 1]!, level: level as 1 | 2 | 3, tone: level === 1 ? 'info' : level === 2 ? 'warn' : 'bad' });
    };
    push('fome', lvl(this.hunger, L.hunger), ['Com fome', 'Fome', 'Faminto']);
    push('sede', lvl(this.thirst, L.thirst), ['Com sede', 'Sede', 'Desidratado']);
    push('sono', lvl(this.fatigue, L.fatigue), ['Cansado', 'Muito cansado', 'Exausto']);
    push('frio', lvl(this.temp, L.coldTemp, false), ['Com frio', 'Frio intenso', 'Hipotermia']);
    push('calor', lvl(this.temp, L.hotTemp), ['Com calor', 'Calor intenso', 'Hipertermia']);
    push('molhado', lvl(this.wet, L.wet), ['Úmido', 'Molhado', 'Encharcado']);
    push('doente', lvl(this.sickness, L.sickness), ['Enjoado', 'Doente', 'Intoxicado']);
    push('animo', lvl(this.morale, L.morale, false), ['Desanimado', 'Triste', 'Deprimido']);
    return out;
  }

  snapshot(): BodySnapshot {
    return { hunger: this.hunger, thirst: this.thirst, fatigue: this.fatigue, temp: this.temp, wet: this.wet, sickness: this.sickness, morale: this.morale };
  }

  restore(s: Partial<BodySnapshot> | undefined): void {
    if (!s) return;
    const n = (v: unknown, def: number, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : def);
    this.hunger = n(s.hunger, this.hunger, 0, 100);
    this.thirst = n(s.thirst, this.thirst, 0, 100);
    this.fatigue = n(s.fatigue, this.fatigue, 0, 100);
    this.temp = n(s.temp, this.temp, 30, 43);
    this.wet = n(s.wet, this.wet, 0, 1);
    this.sickness = n(s.sickness, this.sickness, 0, 1);
    this.morale = n(s.morale, this.morale, 0, 100);
  }
}
