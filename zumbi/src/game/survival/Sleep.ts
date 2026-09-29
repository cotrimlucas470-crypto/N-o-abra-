/**
 * DORMIR e DESCANSAR como ações com tempo.
 *
 * - Dormir: até descansar (cansaço ~0), no máximo 12 h; com relógio dá para
 *   pôr o alarme (acorda na hora). Cama descansa melhor que sofá, que
 *   descansa melhor que o chão. Cobertor esquenta. O relógio acelera muito
 *   (8 h passam em ~13 s) — e o mundo continua: fome, sede, ferida, chuva.
 * - Fome/sede extremas ou frio forte acordam antes.
 * - Descansar sentado recupera o fôlego rápido e tira um pouco do cansaço.
 */
import { NEEDS_TUNING, SLEEP_TUNING } from '../config/SurvivalTuning';
import type { TimedActionSpec } from '../sim/Actions';
import type { GameClock } from '../sim/GameClock';
import type { Survivor } from './Survivor';

export type SleepPlace = 'cama' | 'sofa' | 'chao';

export const SLEEP_QUALITY: Record<SleepPlace, number> = { cama: 1, sofa: 0.8, chao: 0.55 };
/** Travesseiro junto: o sono rende mais (descansa em menos horas). */
export const PILLOW_BONUS = 1.15;
const PLACE_LABEL: Record<SleepPlace, string> = { cama: 'na cama', sofa: 'no sofá', chao: 'no chão' };

export interface SleepInfo {
  quality: number;
  blanket: boolean;
  /** Dormindo na moradia. */
  home?: boolean;
}

export interface SleepOptions {
  place: SleepPlace;
  blanket: boolean;
  /** Tem travesseiro na bolsa. */
  pillow?: boolean;
  /** Acordar neste minuto do dia (alarme do relógio). */
  wakeAt?: number;
  /** Dormir tantas horas (1–10, escolha do jogador). */
  hours?: number;
  /** Na moradia (dorme melhor). */
  home?: boolean;
}

/** O que atrapalha o sono agora (puro): o fator multiplica a recuperação e os motivos vão para a tela. */
export interface SleepComfortInput {
  feltTemp: number;
  blanket: boolean;
  hunger: number;
  thirst: number;
  pain: number;
  bleeding: boolean;
  /** Em casa (moradia): dorme mais tranquilo. */
  home?: boolean;
}

export function sleepComfort(i: SleepComfortInput): { factor: number; reasons: string[] } {
  const T = SLEEP_TUNING;
  let f = 1;
  const why: string[] = [];
  const felt = i.feltTemp + (i.blanket ? T.blanketC : 0);
  if (felt < T.coldHard) (f *= 0.65), why.push('frio');
  else if (felt < T.cold) (f *= 0.85), why.push('frio');
  else if (felt > T.hot) (f *= 0.8), why.push('calor');
  if (i.hunger >= T.hunger) (f *= 0.85), why.push('fome');
  if (i.thirst >= T.thirst) (f *= 0.85), why.push('sede');
  if (i.pain > T.pain) (f *= 0.8), why.push('dor');
  if (i.bleeding) (f *= 0.8), why.push('sangrando');
  if (i.home) f *= T.homeBonus;
  return { factor: Math.max(0.3, Math.min(1.25, f)), reasons: why };
}

/** Energia prevista depois de dormir `hours` (0..100, 100 = descansado). */
export function restAfter(fatigue: number, hours: number, quality: number): number {
  const left = Math.max(0, fatigue - NEEDS_TUNING.sleepRecoveryPerHour * quality * hours);
  return Math.round(100 - left);
}

/** Minutos até o próximo `minuteOfDay` a partir de agora. */
export function minutesUntil(clock: GameClock, minuteOfDay: number): number {
  const now = clock.minuteOfDay;
  let d = minuteOfDay - now;
  if (d <= 0) d += 1440;
  return d;
}

export function sleepAction(survivor: Survivor, clock: GameClock, opts: SleepOptions, onEnd: (info: SleepInfo | null) => void): TimedActionSpec {
  const b = survivor.body;
  // Horas escolhidas (1–10) ou o alarme; sem nada, até descansar (máx. 12 h).
  const chosen = opts.hours !== undefined ? Math.max(1, Math.min(10, Math.round(opts.hours))) * 60 : null;
  const max = chosen ?? (opts.wakeAt !== undefined ? Math.min(12 * 60, minutesUntil(clock, opts.wakeAt)) : 12 * 60);
  const startFatigue = b.fatigue;
  let reason = '';
  return {
    id: 'dormir',
    label: `Dormindo ${PLACE_LABEL[opts.place]}`,
    minutes: max,
    // ~36 minutos de jogo por segundo real.
    realSeconds: Math.max(3, max / 36),
    interruptible: false,
    until: () => {
      if (chosen === null && opts.wakeAt === undefined && b.fatigue <= 1) return true;
      if (b.hunger >= 92) return (reason = 'A fome acordou você.'), true;
      if (b.thirst >= 92) return (reason = 'A sede acordou você.'), true;
      if (b.temp < 35.2) return (reason = 'Acordou tremendo de frio.'), true;
      return false;
    },
    done: () => {
      onEnd(null);
      if (opts.place === 'chao') b.cheer(-5);
      else if (opts.place === 'cama') b.cheer(4);
      if (opts.pillow) b.comfort(2, 85);
      const rested = Math.round(startFatigue - b.fatigue);
      const energy = Math.round(100 - b.fatigue);
      return reason ? { ok: true, message: `${reason} Energia ${energy}%.`, tone: 'warn' } : { ok: true, message: rested > 0 ? `Acordou. Energia ${energy}%.` : 'Acordou.', tone: 'ok' };
    },
    cancelled: () => {
      onEnd(null);
      return { ok: true, message: 'Acordou.', tone: 'info' };
    },
  };
}

/** Sentar e descansar: fôlego volta rápido; tira um pouco do cansaço. */
export function restAction(survivor: Survivor, refillStamina: (fraction: number) => void, where: string): TimedActionSpec {
  const b = survivor.body;
  return {
    id: 'descansar',
    label: `Descansando ${where}`,
    minutes: 30,
    realSeconds: 5,
    tick: (m) => {
      b.fatigue = Math.max(0, b.fatigue - m * (4 / 60));
      refillStamina(m / 30);
    },
    done: () => ({ ok: true, message: 'Descansou um pouco.', tone: 'ok' }),
  };
}
