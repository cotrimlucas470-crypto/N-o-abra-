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
import type { TimedActionSpec } from '../sim/Actions';
import type { GameClock } from '../sim/GameClock';
import type { Survivor } from './Survivor';

export type SleepPlace = 'cama' | 'sofa' | 'chao';

export const SLEEP_QUALITY: Record<SleepPlace, number> = { cama: 1, sofa: 0.8, chao: 0.55 };
const PLACE_LABEL: Record<SleepPlace, string> = { cama: 'na cama', sofa: 'no sofá', chao: 'no chão' };

export interface SleepInfo {
  quality: number;
  blanket: boolean;
}

export interface SleepOptions {
  place: SleepPlace;
  blanket: boolean;
  /** Acordar neste minuto do dia (alarme do relógio). */
  wakeAt?: number;
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
  const max = opts.wakeAt !== undefined ? Math.min(12 * 60, minutesUntil(clock, opts.wakeAt)) : 12 * 60;
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
      if (opts.wakeAt === undefined && b.fatigue <= 1) return true;
      if (b.hunger >= 92) return (reason = 'A fome acordou você.'), true;
      if (b.thirst >= 92) return (reason = 'A sede acordou você.'), true;
      if (b.temp < 35.2) return (reason = 'Acordou tremendo de frio.'), true;
      return false;
    },
    done: () => {
      onEnd(null);
      if (opts.place === 'chao') b.cheer(-5);
      else if (opts.place === 'cama') b.cheer(4);
      const rested = Math.round(startFatigue - b.fatigue);
      return reason ? { ok: true, message: reason, tone: 'warn' } : { ok: true, message: `Acordou. ${rested > 0 ? 'Descansou.' : ''}`.trim(), tone: 'ok' };
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
