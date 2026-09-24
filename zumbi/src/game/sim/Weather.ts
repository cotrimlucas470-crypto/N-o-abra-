/**
 * Clima do jogo: céu, chuva, neblina, vento e temperatura em qualquer
 * momento. Puro e DETERMINÍSTICO: sai da semente do mundo + do tempo, então
 * não precisa ir para o save, é igual depois de carregar e dá para prever
 * o de amanhã (o rádio usa isso).
 *
 * Como funciona: ruído suave no tempo (valores sorteados por hora/dia e
 * interpolados) dá frentes de nuvem que chegam e vão embora; acima de um
 * limiar que depende do mês, as nuvens viram chuva. A temperatura é a média
 * do mês + a curva do dia (mínima de madrugada, máxima às 15 h) + a anomalia
 * do dia (frente fria, veranico) − o efeito das nuvens e da chuva.
 *
 * Clima de cidade do sudeste/sul do Brasil, um pouco mais frio: no inverno
 * as noites ficam perto dos 6–9 °C, o suficiente para roupa importar.
 */
import { hash2 } from '../core/Random';
import { clamp } from '../core/math';
import type { Calendar } from './Calendar';

export interface ClimateSettings {
  /** Soma (°C) em todas as temperaturas. */
  temperatureOffset: number;
  /** Multiplica a frequência de chuva (0 = nunca chove). */
  rainMultiplier: number;
}

export const DEFAULT_CLIMATE: ClimateSettings = { temperatureOffset: 0, rainMultiplier: 1 };

/** Média mensal (°C), amplitude do dia (°C) e chance de dia chuvoso, de janeiro a dezembro. */
const MONTHLY = {
  mean: [24.5, 24.8, 23.6, 20.8, 17.6, 15.4, 14.6, 16.2, 17.6, 19.8, 21.6, 23.4],
  range: [8.5, 8.5, 8.5, 9.5, 10.5, 11, 11.5, 11.5, 10.5, 9.5, 9, 8.5],
  rain: [0.55, 0.5, 0.45, 0.32, 0.25, 0.2, 0.16, 0.18, 0.28, 0.38, 0.45, 0.52],
} as const;

export type Sky = 'limpo' | 'poucas-nuvens' | 'nublado' | 'chuva-fraca' | 'chuva' | 'tempestade' | 'neblina';

export const SKY_LABEL: Record<Sky, string> = {
  limpo: 'Céu limpo',
  'poucas-nuvens': 'Poucas nuvens',
  nublado: 'Nublado',
  'chuva-fraca': 'Garoa',
  chuva: 'Chuva',
  tempestade: 'Tempestade',
  neblina: 'Neblina',
};

export interface WeatherSample {
  /** Temperatura do ar (°C). */
  temp: number;
  /** Nuvens 0..1. */
  cloud: number;
  /** Intensidade da chuva 0..1 (0 = seco). */
  rain: number;
  /** Neblina 0..1. */
  fog: number;
  /** Vento 0..1 (esfria mais quem está molhado). */
  wind: number;
  sky: Sky;
}

const MIN_PER_HOUR = 60;
const MIN_PER_DAY = 1440;

/** Ruído suave 1D: valores por nó inteiro, interpolação suave. */
function smooth(seed: number, channel: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash2(i, channel, seed);
  const b = hash2(i + 1, channel, seed);
  const t = f * f * (3 - 2 * f);
  return a + (b - a) * t;
}

export class Weather {
  constructor(
    private readonly seed: number,
    private readonly calendar: Calendar,
    private readonly settings: ClimateSettings = DEFAULT_CLIMATE,
  ) {}

  /** Clima no minuto de jogo `minutes` (mesma contagem do GameClock). */
  at(minutes: number): WeatherSample {
    const day = Math.floor(minutes / MIN_PER_DAY);
    const hour = (minutes - day * MIN_PER_DAY) / MIN_PER_HOUR;
    const date = this.calendar.dateOf(day);
    const m = date.month - 1;
    // Transição suave entre meses (dia 15 = valor do mês).
    const blend = (arr: readonly number[]) => {
      const pos = m + (date.day - 15) / 30;
      const lo = Math.floor(pos);
      const t = pos - lo;
      const a = arr[((lo % 12) + 12) % 12]!;
      const b = arr[(((lo + 1) % 12) + 12) % 12]!;
      return a + (b - a) * t;
    };
    const mean = blend(MONTHLY.mean);
    const range = blend(MONTHLY.range);
    const rainChance = clamp(blend(MONTHLY.rain) * this.settings.rainMultiplier, 0, 0.95);

    const hours = minutes / MIN_PER_HOUR;
    // Frentes: variação lenta (~1,5 dia) + detalhe de algumas horas.
    const w = smooth(this.seed, 11, hours / 36) * 0.62 + smooth(this.seed, 12, hours / 5) * 0.38;
    const cloud = clamp(w * 1.3 - 0.22 + (rainChance - 0.3) * 0.3, 0, 1);
    // Chuva: só no topo das frentes. O limiar sai da distribuição do ruído para
    // chover em ~42% das horas dos "dias chuvosos" do mês (janeiro ~23% das horas, julho ~7%).
    const threshold = 0.81 - 0.315 * rainChance;
    const showers = smooth(this.seed, 13, hours / 2.2);
    let rain = rainChance <= 0 ? 0 : clamp(((w - threshold) / (1 - threshold)) * (0.7 + showers * 0.8), 0, 1);
    if (rain < 0.04) rain = 0;
    const wind = clamp(smooth(this.seed, 14, hours / 9) * 0.8 + rain * 0.3, 0, 1);

    // Temperatura: curva do dia (mínima ~4 h, máxima ~15 h), achatada por nuvens.
    const daily = Math.cos(((hour - 15) / 24) * Math.PI * 2);
    const anomaly = (smooth(this.seed, 15, minutes / MIN_PER_DAY / 2.5) - 0.5) * 8;
    const flatten = 1 - cloud * 0.45;
    const temp = mean + anomaly + daily * (range / 2) * flatten - rain * 2.5 + this.settings.temperatureOffset;

    // Neblina: madrugada/manhã úmida, sem vento, sem chuva.
    const morning = hour >= 3 && hour <= 9.5 ? 1 - Math.abs(hour - 6.25) / 3.25 : 0;
    const humid = smooth(this.seed, 16, minutes / MIN_PER_DAY);
    const fog = rain > 0 ? 0 : clamp(morning * (humid - 0.55) * 3.2 * (1 - wind), 0, 1);

    let sky: Sky;
    if (rain >= 0.72 && wind > 0.55) sky = 'tempestade';
    else if (rain >= 0.3) sky = 'chuva';
    else if (rain > 0) sky = 'chuva-fraca';
    else if (fog > 0.35) sky = 'neblina';
    else if (cloud > 0.62) sky = 'nublado';
    else if (cloud > 0.32) sky = 'poucas-nuvens';
    else sky = 'limpo';
    return { temp: Math.round(temp * 10) / 10, cloud, rain, fog, wind, sky };
  }

  /** Resumo de um dia inteiro (mínima, máxima, se chove e o céu mais comum) — para a previsão. */
  daySummary(day: number): { min: number; max: number; rainHours: number; sky: Sky } {
    let min = Infinity;
    let max = -Infinity;
    let rainHours = 0;
    const count = new Map<Sky, number>();
    for (let h = 0; h < 24; h++) {
      const s = this.at(day * MIN_PER_DAY + h * MIN_PER_HOUR + 30);
      min = Math.min(min, s.temp);
      max = Math.max(max, s.temp);
      if (s.rain > 0) rainHours++;
      count.set(s.sky, (count.get(s.sky) ?? 0) + (s.rain > 0 ? 2 : 1));
    }
    let sky: Sky = 'limpo';
    let best = -1;
    for (const [k, v] of count) {
      if (v > best) {
        best = v;
        sky = k;
      }
    }
    return { min: Math.round(min), max: Math.round(max), rainHours, sky };
  }

  /** Chuva acumulada (horas "equivalentes" de chuva forte) nas últimas `hours` horas: umidade do chão, horta, coletor. */
  rainfall(minutes: number, hours: number): number {
    let sum = 0;
    for (let h = 0; h < hours; h++) sum += this.at(minutes - h * MIN_PER_HOUR).rain;
    return sum;
  }
}

/**
 * Luz do sol 0..1 pela hora (0 = noite fechada). Nascer ~5h30–7h,
 * pôr ~17h30–19h; nuvens escurecem um pouco o dia.
 */
export function daylight(minuteOfDay: number, cloud = 0): number {
  const h = minuteOfDay / 60;
  let l: number;
  if (h < 5.3 || h > 19.2) l = 0;
  else if (h < 7) l = (h - 5.3) / 1.7;
  else if (h > 17.5) l = (19.2 - h) / 1.7;
  else l = 1;
  l = l * l * (3 - 2 * l);
  return clamp(l * (1 - cloud * 0.25), 0, 1);
}
