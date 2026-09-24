/**
 * Relógio do jogo. Base de tudo que depende de tempo: fome/sede (Fase 3),
 * memória e busca dos zumbis (5), sangramento/infecção (8), dia/noite e
 * clima (11), crescimento de plantas (13).
 *
 * Guarda o tempo em MINUTOS DE JOGO desde o dia 1, 00:00 (float).
 * Lógica pura: nenhum Phaser, fácil de salvar e testar.
 */
export interface ClockSnapshot {
  minutes: number;
}

export const MINUTES_PER_DAY = 24 * 60;

export class GameClock {
  /** Minutos de jogo desde dia 1, 00:00. */
  minutes: number;
  /** Multiplicador de velocidade (debug: acelerar o tempo; 0 = parado). */
  timeScale = 1;
  private readonly minutesPerRealSecond: number;

  constructor(opts: { dayLengthMinutes: number; startDay: number; startHour: number }) {
    this.minutesPerRealSecond = MINUTES_PER_DAY / (opts.dayLengthMinutes * 60);
    this.minutes = (opts.startDay - 1) * MINUTES_PER_DAY + opts.startHour * 60;
  }

  /** Avança pelo tempo real decorrido. Retorna quantos minutos de jogo passaram. */
  update(realSeconds: number): number {
    const d = realSeconds * this.minutesPerRealSecond * this.timeScale;
    this.minutes += d;
    return d;
  }

  /** Pula tempo (dormir, esperar; debug). */
  advance(gameMinutes: number): void {
    this.minutes += Math.max(0, gameMinutes);
  }

  /** Dia atual, começando em 1. */
  get day(): number {
    return Math.floor(this.minutes / MINUTES_PER_DAY) + 1;
  }

  /** Minuto dentro do dia (0..1439,99). */
  get minuteOfDay(): number {
    return this.minutes - (this.day - 1) * MINUTES_PER_DAY;
  }

  get hour(): number {
    return Math.floor(this.minuteOfDay / 60);
  }

  /** Fração do dia (0 = meia-noite, 0,5 = meio-dia). */
  get dayFraction(): number {
    return this.minuteOfDay / MINUTES_PER_DAY;
  }

  /** Quantos minutos de jogo passam por segundo real (com o timeScale atual). */
  get rate(): number {
    return this.minutesPerRealSecond * this.timeScale;
  }

  /** "08:05" */
  timeLabel(): string {
    const m = Math.floor(this.minuteOfDay);
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  }

  snapshot(): ClockSnapshot {
    return { minutes: this.minutes };
  }

  restore(s: ClockSnapshot): void {
    if (Number.isFinite(s.minutes) && s.minutes >= 0) this.minutes = s.minutes;
  }
}
