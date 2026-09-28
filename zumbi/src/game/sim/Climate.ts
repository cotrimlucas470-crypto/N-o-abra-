/**
 * CLIMA DO ANO (puro): o que cada época tende a ser — temperatura média,
 * amplitude do dia, chance de frente de chuva, tempestade, neblina, vento,
 * duração do dia e a cara da vegetação. Nada muda de um dia para o outro:
 * tudo sai de curvas CONTÍNUAS no dia do ano (âncoras + interpolação suave),
 * e cada estação dá sinais nos 30 dias antes de começar (`approach`).
 *
 * O dia a dia (frentes, chuva, neve) fica no Weather, que usa estas
 * tendências como probabilidade — a estação muda as chances, não sorteia o dia.
 *
 * Cidade fictícia do sul, de serra: verão quente e úmido, inverno com neve.
 * Estações do hemisfério sul (inverno de junho a setembro), iguais ao Calendar.
 */
import { clamp } from '../core/math';
import type { Season } from './Calendar';

/** Primeiro dia (do ano, 0 = 1º de janeiro, ano não bissexto) de cada estação. */
export const SEASON_START: Record<Season, number> = { outono: 79, inverno: 171, primavera: 265, verao: 354 };
const ORDER: readonly Season[] = ['verao', 'outono', 'inverno', 'primavera'];
const YEAR = 365;
/** Dias antes do início oficial em que a estação começa a dar sinais. */
export const APPROACH_DAYS = 30;

/** Âncoras [dia do ano, valor]: o valor entre âncoras é interpolado suavemente (ano circular). */
type Anchors = readonly (readonly [number, number])[];

const doy = (month: number, day: number) => Math.floor(Date.UTC(2029, month - 1, day) / 86_400_000) - Math.floor(Date.UTC(2029, 0, 1) / 86_400_000);

/** Temperatura média do dia (°C): o fundo do inverno em julho, o pico do verão no fim de janeiro. */
const MEAN: Anchors = [
  [doy(1, 25), 24.5],
  [doy(3, 21), 17],
  [doy(5, 1), 9.5],
  [doy(6, 21), -1],
  [doy(7, 22), -3.5],
  [doy(8, 25), -1],
  [doy(9, 23), 5],
  [doy(11, 1), 13],
  [doy(12, 21), 21.5],
];
/** Amplitude do dia (°C entre madrugada e tarde, céu limpo). */
const RANGE: Anchors = [
  [doy(1, 15), 9.5],
  [doy(4, 15), 9],
  [doy(7, 15), 8.5],
  [doy(10, 15), 10.5],
];
/** Chance de frente de chuva/neve (0..1) — quanto chove na época. */
const PRECIP: Anchors = [
  [doy(1, 15), 0.55],
  [doy(4, 15), 0.4],
  [doy(7, 15), 0.45],
  [doy(10, 15), 0.48],
];
/** Tendência a tempestade (convecção): verão alto, inverno quase nada. */
const STORM: Anchors = [
  [doy(1, 20), 0.8],
  [doy(4, 1), 0.35],
  [doy(7, 1), 0.06],
  [doy(10, 1), 0.4],
  [doy(12, 1), 0.7],
];
/** Tendência a neblina (manhãs úmidas de outono e inverno). */
const FOG: Anchors = [
  [doy(1, 15), 0.15],
  [doy(4, 25), 0.6],
  [doy(7, 15), 0.45],
  [doy(10, 15), 0.3],
];
/** Vento de fundo (0..1). */
const WIND: Anchors = [
  [doy(1, 15), 0.3],
  [doy(4, 15), 0.45],
  [doy(7, 15), 0.55],
  [doy(10, 1), 0.5],
];
/** Folhas: cor de outono (0 = verde, 1 = marrom) e quanto a copa ainda tem (1 = cheia). */
const LEAF_COLOR: Anchors = [
  [doy(3, 15), 0],
  [doy(4, 20), 0.45],
  [doy(5, 20), 1],
  [doy(8, 20), 1],
  [doy(9, 25), 0.35],
  [doy(10, 20), 0],
];
const LEAF_COVER: Anchors = [
  [doy(4, 10), 1],
  [doy(5, 10), 0.85],
  [doy(6, 5), 0.5],
  [doy(6, 25), 0.35],
  [doy(8, 25), 0.35],
  [doy(9, 25), 0.6],
  [doy(10, 25), 0.95],
  [doy(11, 15), 1],
];

/**
 * Fase da GRAMA no ano (0..6, circular: 6 = 0): 0 verde de verão, 1 seca,
 * 2 amarelando, 3 marrom, 4 morta no inverno, 5 rebrotando na primavera.
 */
const GRASS: Anchors = [
  [doy(1, 10), 0],
  [doy(2, 20), 1],
  [doy(3, 30), 2],
  [doy(5, 5), 3],
  [doy(6, 12), 4],
  [doy(9, 5), 4],
  [doy(10, 8), 5],
  [doy(12, 20), 5.9],
];

function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/** Valor das âncoras no dia `d` (fração de dia; ano circular). */
export function anchorValue(a: Anchors, d: number): number {
  const x = ((d % YEAR) + YEAR) % YEAR;
  for (let i = 0; i < a.length; i++) {
    const [d0, v0] = a[i]!;
    const [d1raw, v1] = a[(i + 1) % a.length]!;
    const d1 = i + 1 < a.length ? d1raw : d1raw + YEAR;
    const xx = x < d0 ? x + YEAR : x;
    if (xx >= d0 && xx < d1) return v0 + (v1 - v0) * smoothstep((xx - d0) / (d1 - d0));
  }
  return a[0]![1];
}

/** Fase da grama no dia `d` (0..6, circular). */
export function grassStage(d: number): number {
  const x = ((d % YEAR) + YEAR) % YEAR;
  const a = GRASS;
  for (let i = 0; i < a.length; i++) {
    const [d0, v0] = a[i]!;
    const last = i + 1 >= a.length;
    const [d1raw, v1raw] = a[(i + 1) % a.length]!;
    const d1 = last ? d1raw + YEAR : d1raw;
    // No fim do ano volta ao verde: a fase continua subindo até 6 (= 0).
    const v1 = last ? v1raw + 6 : v1raw;
    const xx = x < d0 ? x + YEAR : x;
    if (xx >= d0 && xx < d1) return (v0 + (v1 - v0) * smoothstep((xx - d0) / (d1 - d0))) % 6;
  }
  return 0;
}

/** Estação oficial num dia do ano (igual a `seasonOf`, pelo dia). */
export function seasonAtDay(d: number): Season {
  const x = ((Math.floor(d) % YEAR) + YEAR) % YEAR;
  if (x >= SEASON_START.verao || x < SEASON_START.outono) return 'verao';
  if (x < SEASON_START.inverno) return 'outono';
  if (x < SEASON_START.primavera) return 'inverno';
  return 'primavera';
}

/** Dias (fração) até o início da estação `s` (0..365). */
export function daysUntil(s: Season, d: number): number {
  return (((SEASON_START[s] - d) % YEAR) + YEAR) % YEAR;
}

export interface SeasonalState {
  /** Estação oficial (do calendário). */
  season: Season;
  /** A próxima estação e quantos dias faltam. */
  next: Season;
  daysToNext: number;
  /**
   * Quanto a próxima estação já se faz sentir (0..1): 0 até 30 dias antes,
   * sobe devagar no começo e depressa perto do início oficial (1).
   */
  approach: number;
  /** "Inverno" contínuo 0..1: chega antes do inverno, dura o inverno e sai devagar na primavera. */
  winter: number;
  /** Idem para o verão. */
  summer: number;
  mean: number;
  range: number;
  precip: number;
  storm: number;
  fog: number;
  wind: number;
  /** Horas de sol (10,2 h no inverno, 14,2 h no verão). */
  dayHours: number;
  leafColor: number;
  leafCover: number;
  /** Fase da grama (0..6): verde → seca → amarela → marrom → morta → rebrotando. */
  grass: number;
}

/** Curva de aproximação: 30 dias antes quase nada, 7 dias antes ~2/3, véspera ~95%. */
export function approachCurve(daysBefore: number): number {
  if (daysBefore >= APPROACH_DAYS) return 0;
  const t = 1 - Math.max(0, daysBefore) / APPROACH_DAYS;
  return Math.pow(t, 1.6);
}

/** Estado sazonal num dia do ano com fração (ex.: 171,5 = meio-dia de 21 de junho). */
export function seasonal(d: number): SeasonalState {
  const season = seasonAtDay(d);
  const next = ORDER[(ORDER.indexOf(season) + 1) % 4]!;
  const daysToNext = daysUntil(next, d);
  const approach = approachCurve(daysToNext);
  // Inverno contínuo: sobe nos 30 dias antes de 21/jun, fica em 1 e cai nos 30 dias antes da primavera.
  const into = (s: Season, prev: Season) => {
    if (season === s) {
      const toEnd = daysUntil(ORDER[(ORDER.indexOf(s) + 1) % 4]!, d);
      return 1 - approachCurve(toEnd);
    }
    if (season === prev) return approachCurve(daysUntil(s, d));
    return 0;
  };
  const x = ((d % YEAR) + YEAR) % YEAR;
  return {
    season,
    next,
    daysToNext,
    approach,
    winter: into('inverno', 'outono'),
    summer: into('verao', 'primavera'),
    mean: anchorValue(MEAN, x),
    range: anchorValue(RANGE, x),
    precip: anchorValue(PRECIP, x),
    storm: anchorValue(STORM, x),
    fog: anchorValue(FOG, x),
    wind: anchorValue(WIND, x),
    dayHours: 12.2 + 2 * Math.cos(((x - SEASON_START.verao) / YEAR) * Math.PI * 2),
    leafColor: anchorValue(LEAF_COLOR, x),
    leafCover: anchorValue(LEAF_COVER, x),
    grass: grassStage(x),
  };
}

/** O que dizer da época (HUD/aba TEMPO): "O inverno está chegando" etc. */
export function seasonHint(s: SeasonalState): string | null {
  if (s.approach <= 0.02) return null;
  const name: Record<Season, string> = { inverno: 'o inverno', primavera: 'a primavera', verao: 'o verão', outono: 'o outono' };
  const d = Math.ceil(s.daysToNext);
  if (d <= 1) return `Amanhã começa ${name[s.next]}.`;
  if (s.approach > 0.55) return `Falta pouco para ${name[s.next]} (${d} dias).`;
  return `${cap(name[s.next])} se aproxima (${d} dias).`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
