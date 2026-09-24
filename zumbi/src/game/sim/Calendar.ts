/**
 * Calendário do jogo: transforma "dia N desde o começo" numa data de verdade
 * (dia do mês, mês, dia da semana, estação). Puro, sem Phaser.
 *
 * O ano não aparece na tela (o mundo acabou; o ano importa pouco), mas existe
 * por dentro para os meses terem o tamanho certo e as semanas baterem.
 * Estações do hemisfério sul: o inverno vai de junho a setembro.
 */
export interface CalendarStart {
  /** Mês em que a partida começa (1–12). */
  month: number;
  /** Dia do mês (1–31, ajustado ao tamanho do mês). */
  day: number;
}

export type Season = 'verao' | 'outono' | 'inverno' | 'primavera';

export const SEASON_LABEL: Record<Season, string> = { verao: 'Verão', outono: 'Outono', inverno: 'Inverno', primavera: 'Primavera' };

export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'] as const;
export const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;

export interface GameDate {
  /** Dia do mês (1–31). */
  day: number;
  /** Mês (1–12). */
  month: number;
  year: number;
  /** 0 = domingo. */
  weekday: number;
  season: Season;
  /** Dia do ano (0–364/365). */
  dayOfYear: number;
}

/** Ano interno (não aparece): não bissexto, começa numa segunda-feira. */
const BASE_YEAR = 2029;
const DAY_MS = 86_400_000;

function utcDay(year: number, month: number, day: number): number {
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function seasonOf(month: number, day: number): Season {
  const md = month * 100 + day;
  if (md >= 1221 || md < 321) return 'verao';
  if (md < 621) return 'outono';
  if (md < 923) return 'inverno';
  return 'primavera';
}

export class Calendar {
  private readonly startUtc: number;

  constructor(start: CalendarStart) {
    const month = Math.min(12, Math.max(1, Math.round(start.month)));
    const day = Math.min(daysInMonth(BASE_YEAR, month), Math.max(1, Math.round(start.day)));
    this.startUtc = utcDay(BASE_YEAR, month, day);
  }

  /** Data do dia `index` (0 = primeiro dia da partida). */
  dateOf(index: number): GameDate {
    const d = new Date((this.startUtc + Math.floor(index)) * DAY_MS);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    return {
      day,
      month,
      year,
      weekday: d.getUTCDay(),
      season: seasonOf(month, day),
      dayOfYear: this.startUtc + Math.floor(index) - utcDay(year, 1, 1),
    };
  }

  /** "sexta, 3 de maio" */
  label(index: number): string {
    const g = this.dateOf(index);
    return `${WEEKDAYS[g.weekday]}, ${g.day} de ${MONTHS[g.month - 1]}`;
  }

  /** "3 mai" (curto, para o HUD) */
  shortLabel(index: number): string {
    const g = this.dateOf(index);
    return `${g.day} ${MONTHS[g.month - 1]!.slice(0, 3)}`;
  }
}

/** Período do dia pelo minuto (0–1439). */
export function periodOf(minuteOfDay: number): string {
  const h = minuteOfDay / 60;
  if (h < 5) return 'Madrugada';
  if (h < 12) return 'Manhã';
  if (h < 18) return 'Tarde';
  return 'Noite';
}
