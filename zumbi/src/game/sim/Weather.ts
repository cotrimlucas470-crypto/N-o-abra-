/**
 * Clima do jogo: céu, chuva, NEVE, neblina, vento, umidade, trovoada e
 * temperatura em qualquer momento. Puro e DETERMINÍSTICO: sai da semente do
 * mundo + do tempo — igual depois de carregar, igual pulando dias (o avanço
 * de vários dias calcula o mesmo clima que teria passado), e dá para prever
 * o de amanhã (o rádio usa isso). O que ACUMULA (neve no chão, poças, gelo)
 * fica no Ground, que vai para o save.
 *
 * Como funciona:
 * - A época (Climate.ts) dá as tendências: média, amplitude, chance de frente,
 *   tempestade, neblina, vento. Muda devagar ao longo do ano.
 * - FRENTES: a cada 6 h de jogo pode nascer uma frente (chance da época ×
 *   um ciclo lento de "tempo instável", então dias ruins vêm em sequência).
 *   Cada frente tem aproximação (nuvens engrossando, vento subindo, trovão
 *   distante nas tempestades, primeiras gotas meia hora antes), o evento, a
 *   dissipação (chuva fina, nuvens abrindo) e deixa o ar mais frio depois.
 * - A temperatura decide se cai chuva, chuva com neve ou neve.
 */
import { hash2 } from '../core/Random';
import { clamp } from '../core/math';
import type { Calendar } from './Calendar';
import { seasonal, type SeasonalState } from './Climate';

export interface ClimateSettings {
  /** Soma (°C) em todas as temperaturas. */
  temperatureOffset: number;
  /** Multiplica a frequência de chuva (0 = nunca chove). */
  rainMultiplier: number;
}

export const DEFAULT_CLIMATE: ClimateSettings = { temperatureOffset: 0, rainMultiplier: 1 };

export type Sky =
  | 'limpo'
  | 'poucas-nuvens'
  | 'nublado'
  | 'chuva-fraca'
  | 'chuva'
  | 'tempestade'
  | 'neblina'
  | 'chuva-com-neve'
  | 'neve-fraca'
  | 'neve'
  | 'nevasca';

export const SKY_LABEL: Record<Sky, string> = {
  limpo: 'Céu limpo',
  'poucas-nuvens': 'Poucas nuvens',
  nublado: 'Nublado',
  'chuva-fraca': 'Garoa',
  chuva: 'Chuva',
  tempestade: 'Tempestade',
  neblina: 'Neblina',
  'chuva-com-neve': 'Chuva com neve',
  'neve-fraca': 'Neve fraca',
  neve: 'Neve',
  nevasca: 'Nevasca',
};

export interface WeatherSample {
  /** Temperatura do ar (°C). */
  temp: number;
  /** Nuvens 0..1. */
  cloud: number;
  /** Chuva (líquida) 0..1. */
  rain: number;
  /** Neve caindo 0..1. */
  snow: number;
  /** Precipitação total 0..1 (chuva + neve). */
  precip: number;
  /** Neblina 0..1. */
  fog: number;
  /** Vento 0..1 (esfria mais quem está molhado). */
  wind: number;
  /** Umidade do ar 0..1. */
  humidity: number;
  /** Trovoada 0..1 (0 = nada; baixo = trovão distante; alto = raios perto). */
  thunder: number;
  /** Frente chegando (0..1): o tempo está virando nas próximas horas. */
  front: number;
  sky: Sky;
}

const MIN_PER_HOUR = 60;
const MIN_PER_DAY = 1440;
/** Uma frente pode nascer a cada tantas horas. */
const SLOT_H = 6;

function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/** Ruído suave 1D: valores por nó inteiro, interpolação suave. */
function smooth(seed: number, channel: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash2(i, channel, seed);
  const b = hash2(i + 1, channel, seed);
  const t = f * f * (3 - 2 * f);
  return a + (b - a) * t;
}

/** Uma frente (chuva/neve) ou tempestade. Horas de jogo desde o dia 0. */
interface Front {
  start: number;
  /** Duração do evento (h). */
  dur: number;
  /** Aproximação e dissipação (h). */
  build: number;
  fade: number;
  /** Intensidade 0..1. */
  power: number;
  storm: boolean;
}

export class Weather {
  /** Frentes já sorteadas (o mesmo bloco é consultado muitas vezes seguidas). */
  private readonly fronts = new Map<number, Front | null>();

  constructor(
    private readonly seed: number,
    private readonly calendar: Calendar,
    private readonly settings: ClimateSettings = DEFAULT_CLIMATE,
  ) {}

  /** Época no minuto (dia do ano com fração). */
  seasonAt(minutes: number): SeasonalState {
    const day = Math.floor(minutes / MIN_PER_DAY);
    return seasonal(this.calendar.dateOf(day).dayOfYear + (minutes - day * MIN_PER_DAY) / MIN_PER_DAY);
  }

  /** Frente que nasce no bloco `k` (ou null): sorteio fixo pela semente. */
  private front(k: number): Front | null {
    const hit = this.fronts.get(k);
    if (hit !== undefined) return hit;
    const f = this.rollFront(k);
    if (this.fronts.size > 512) this.fronts.clear();
    this.fronts.set(k, f);
    return f;
  }

  private rollFront(k: number): Front | null {
    const t0 = k * SLOT_H;
    const s = this.seasonAt(t0 * MIN_PER_HOUR);
    const mult = this.settings.rainMultiplier;
    if (mult <= 0) return null;
    // Tempo instável vem em ondas de alguns dias (dias ruins em sequência).
    const unsettled = smooth(this.seed, 21, t0 / 60);
    const chance = clamp(s.precip * 0.34 * (0.35 + 1.3 * unsettled) * mult, 0, 0.9);
    if (hash2(k, 22, this.seed) >= chance) return null;
    const u = (c: number) => hash2(k, c, this.seed);
    const start = t0 + u(23) * SLOT_H;
    const hour = ((start % 24) + 24) % 24;
    // Tempestade: convecção da época, mais à tarde.
    const afternoon = hour >= 12 && hour <= 20 ? 1.4 : 0.7;
    const storm = u(24) < s.storm * 0.45 * afternoon;
    const power = storm ? 0.72 + u(25) * 0.28 : 0.2 + Math.pow(u(25), 0.9) * 0.7;
    const dur = storm ? 1.5 + u(26) * 4 : 3 + Math.pow(u(26), 1.4) * 15;
    return { start, dur, build: storm ? 6 : 4 + u(27) * 3, fade: storm ? 3 : 2 + u(28) * 3, power, storm };
  }

  /** Clima no minuto de jogo `minutes` (mesma contagem do GameClock). */
  at(minutes: number): WeatherSample {
    const day = Math.floor(minutes / MIN_PER_DAY);
    const hour = (minutes - day * MIN_PER_DAY) / MIN_PER_HOUR;
    const hours = minutes / MIN_PER_HOUR;
    const s = this.seasonAt(minutes);

    // Fundo: nuvens passageiras e vento, sem chuva.
    const w = smooth(this.seed, 11, hours / 30) * 0.6 + smooth(this.seed, 12, hours / 5) * 0.4;
    let cloud = clamp(w * 1.05 - 0.38 + s.precip * 0.25, 0, 0.62);
    let wind = clamp(smooth(this.seed, 14, hours / 9) * 0.55 + s.wind * 0.45 - 0.12, 0, 1);
    let precip = 0;
    let thunder = 0;
    let frontNear = 0;
    let chill = 0;
    let windAdd = 0;

    // Frentes que alcançam este momento (nascem até ~30 h antes ou ~7 h depois).
    const k0 = Math.floor((hours - 30) / SLOT_H);
    const k1 = Math.floor((hours + 8) / SLOT_H);
    for (let k = k0; k <= k1; k++) {
      const f = this.front(k);
      if (!f) continue;
      const r = hours - f.start;
      if (r < -f.build) continue;
      const P = f.power;
      const e = f.dur;
      // Envelopes contínuos (sem degrau entre as fases):
      // aproximação → evento → dissipação → nuvens abrindo.
      let c: number;
      let p = 0;
      let v: number;
      let th = 0;
      if (r < 0) {
        const q = smoothstep((r + f.build) / f.build);
        c = q;
        v = q;
        if (r > -0.5) p = 0.3 * ((r + 0.5) / 0.5);
        if (f.storm && r > -2) th = 0.5 * ((r + 2) / 2);
      } else if (r < e) {
        const ramp = Math.min(1, e * 0.25);
        const w = clamp(r / 0.5, 0, 1) * clamp((e - r) / 0.5, 0, 1);
        const gust = 1 + (smooth(this.seed, 13 + (k & 7), hours / 1.3) - 0.5) * 0.56 * w;
        c = 1;
        v = 1;
        p = (0.3 + 0.7 * clamp(r / ramp, 0, 1)) * gust;
        if (f.storm) th = 0.5 + (0.25 + 0.25 * P) * clamp(r / 0.5, 0, 1) * clamp((e * 0.8 - r) / (e * 0.2), 0, 1);
      } else if (r < e + f.fade) {
        const q = (r - e) / f.fade;
        c = 1 - 0.5 * q;
        v = 1 - q;
        p = Math.pow(1 - q, 1.5);
        if (f.storm) th = 0.5 * (1 - q);
      } else if (r < e + f.fade + 5) {
        c = 0.5 * (1 - (r - e - f.fade) / 5);
        v = 0;
      } else {
        c = 0;
        v = 0;
      }
      cloud = Math.max(cloud, c * (0.6 + 0.35 * P + (f.storm ? 0.05 : 0)));
      windAdd = Math.max(windAdd, v * P * (f.storm ? 0.55 : 0.32));
      precip = Math.max(precip, clamp(p * P, 0, 1));
      thunder = Math.max(thunder, th);
      if (r < e + f.fade) frontNear = Math.max(frontNear, r < 0 ? smoothstep((r + f.build) / f.build) * (0.5 + 0.5 * P) : 1 - Math.max(0, r - e) / f.fade);
      // Ar frio atrás da frente: some em ~12 h.
      if (r > 0) chill = Math.max(chill, P * 2.4 * Math.exp(-Math.max(0, r - e) / 12) * clamp(r / 2, 0, 1));
    }
    wind = clamp(wind + windAdd, 0, 1);

    // Temperatura: curva do dia (mínima ~5 h, máxima ~15 h) achatada por nuvens,
    // anomalia de alguns dias (frente fria, veranico) e o frio que a chuva traz.
    const daily = Math.cos(((hour - 15) / 24) * Math.PI * 2);
    const anomaly = (smooth(this.seed, 15, minutes / MIN_PER_DAY / 2.5) - 0.5) * 9;
    const flatten = 1 - cloud * 0.45;
    const temp = s.mean + anomaly + daily * (s.range / 2) * flatten - precip * 2 - chill + this.settings.temperatureOffset;

    // Neve ou chuva pela temperatura (entre −1,2 e 1,2 °C: chuva com neve). A
    // neve de antes do inverno é rara E fraca (flocos soltos); cresce com a época.
    const snowFrac = clamp((1.2 - temp) / 2.4, 0, 1);
    let rain = precip * (1 - snowFrac);
    let snow = precip * snowFrac * (0.2 + 0.8 * s.winter);
    if (rain < 0.04) rain = 0;
    if (snow < 0.04) snow = 0;
    precip = rain + snow;

    // Umidade e neblina: manhã úmida sem vento, mais no outono/inverno, e depois de chover.
    const humid = smooth(this.seed, 16, minutes / MIN_PER_DAY);
    const humidity = clamp(0.35 + s.fog * 0.25 + humid * 0.25 + precip * 0.35 + cloud * 0.1, 0, 1);
    const morning = hour >= 3 && hour <= 10 ? 1 - Math.abs(hour - 6.5) / 3.5 : 0;
    const fog = precip > 0.2 ? 0 : clamp(morning * (humid + s.fog * 0.45 - 0.72) * 3.2 * (1 - wind), 0, 1);

    let sky: Sky;
    if (thunder >= 0.5 && rain >= 0.35) sky = 'tempestade';
    else if (snow >= 0.6 && wind > 0.55) sky = 'nevasca';
    else if (snow >= 0.3) sky = 'neve';
    else if (snow > 0 && rain > 0.05) sky = 'chuva-com-neve';
    else if (snow > 0) sky = 'neve-fraca';
    else if (rain >= 0.3) sky = 'chuva';
    else if (rain > 0) sky = 'chuva-fraca';
    else if (fog > 0.35) sky = 'neblina';
    else if (cloud > 0.62) sky = 'nublado';
    else if (cloud > 0.32) sky = 'poucas-nuvens';
    else sky = 'limpo';
    return { temp: Math.round(temp * 10) / 10, cloud, rain, snow, precip, fog, wind, humidity, thunder, front: clamp(frontNear, 0, 1), sky };
  }

  /** Resumo de um dia inteiro (mínima, máxima, horas de chuva/neve e o céu mais comum) — para a previsão. */
  daySummary(day: number): { min: number; max: number; rainHours: number; snowHours: number; sky: Sky } {
    let min = Infinity;
    let max = -Infinity;
    let rainHours = 0;
    let snowHours = 0;
    const count = new Map<Sky, number>();
    for (let h = 0; h < 24; h++) {
      const s = this.at(day * MIN_PER_DAY + h * MIN_PER_HOUR + 30);
      min = Math.min(min, s.temp);
      max = Math.max(max, s.temp);
      if (s.rain > 0) rainHours++;
      if (s.snow > 0) snowHours++;
      count.set(s.sky, (count.get(s.sky) ?? 0) + (s.precip > 0 ? 2 : 1));
    }
    let sky: Sky = 'limpo';
    let best = -1;
    for (const [k, v] of count) {
      if (v > best) {
        best = v;
        sky = k;
      }
    }
    return { min: Math.round(min), max: Math.round(max), rainHours, snowHours, sky };
  }

  /** Chuva acumulada (horas "equivalentes" de chuva forte) nas últimas `hours` horas: umidade do chão, horta, coletor. */
  rainfall(minutes: number, hours: number): number {
    let sum = 0;
    for (let h = 0; h < hours; h++) sum += this.at(minutes - h * MIN_PER_HOUR).rain;
    return sum;
  }
}

/**
 * Luz do sol 0..1 pela hora (0 = noite fechada). `dayHours` = horas de sol
 * da época (inverno ~10 h, verão ~14 h); nuvens escurecem um pouco o dia.
 */
export function daylight(minuteOfDay: number, cloud = 0, dayHours = 12.6): number {
  const h = minuteOfDay / 60;
  const noon = 12.3;
  const rise = noon - dayHours / 2;
  const set = noon + dayHours / 2;
  const tw = 1.7;
  let l: number;
  if (h < rise - tw / 2 || h > set + tw / 2) l = 0;
  else if (h < rise + tw / 2) l = (h - (rise - tw / 2)) / tw;
  else if (h > set - tw / 2) l = (set + tw / 2 - h) / tw;
  else l = 1;
  l = l * l * (3 - 2 * l);
  return clamp(l * (1 - cloud * 0.25), 0, 1);
}
