/**
 * AÇÕES COM TEMPO: enfaixar, fabricar, ler, dormir, construir, desmontar...
 * Uma por vez. O tempo do jogo passa de verdade (fome, sede, ferida, chuva
 * continuam), mas o relógio ACELERA enquanto a ação dura, para que no celular
 * ela leve só alguns segundos reais. Andar cancela (quando faz sentido).
 *
 * Puro: a cena só pergunta a velocidade do relógio (`timeScale`) e avisa
 * quantos minutos de jogo passaram (`advance`).
 */
import { clamp } from '../core/math';

export interface ActionOutcome {
  ok: boolean;
  message?: string;
  tone?: 'ok' | 'info' | 'warn' | 'bad';
}

export interface TimedActionSpec {
  /** Tipo (sono, leitura...). Serve para a interface e para testes. */
  id: string;
  /** "Enfaixando o braço esquerdo" */
  label: string;
  /** Duração em minutos de jogo. */
  minutes: number;
  /** Duração em segundos reais (padrão: 1–6 s conforme os minutos). */
  realSeconds?: number;
  /** Andar cancela? (padrão: sim) */
  interruptible?: boolean;
  /** A cada atualização, com os minutos de jogo que passaram (dormir, ler). */
  tick?: (gameMinutes: number) => void;
  /** Termina antes da hora (acordou descansado, alarme). */
  until?: () => boolean;
  /** Ao terminar. */
  done: () => ActionOutcome | void;
  /** Ao ser cancelada (andou, levou susto). */
  cancelled?: (progress: number) => ActionOutcome | void;
}

/** Segundos reais de uma ação de `minutes` minutos de jogo. */
export function defaultRealSeconds(minutes: number): number {
  return clamp(0.8 + minutes / 15, 1, 6);
}

export class ActionRunner {
  private spec: TimedActionSpec | null = null;
  private elapsed = 0;
  private real = 1;

  get active(): boolean {
    return this.spec !== null;
  }

  get current(): Readonly<TimedActionSpec> | null {
    return this.spec;
  }

  get progress(): number {
    return this.spec ? clamp(this.elapsed / Math.max(0.001, this.spec.minutes), 0, 1) : 0;
  }

  /** Começa (cancela a anterior, se houver). */
  start(spec: TimedActionSpec): ActionOutcome | void {
    let out: ActionOutcome | void = undefined;
    if (this.spec) out = this.cancel();
    this.spec = spec;
    this.elapsed = 0;
    this.real = spec.realSeconds ?? defaultRealSeconds(spec.minutes);
    return out;
  }

  /**
   * Velocidade do relógio para a ação durar `real` segundos.
   * `baseRate` = minutos de jogo por segundo real com timeScale 1.
   */
  timeScale(baseRate: number): number {
    if (!this.spec || baseRate <= 0) return 1;
    return Math.max(1, this.spec.minutes / this.real / baseRate);
  }

  /** O relógio andou `minutes`. Devolve o resultado se a ação terminou agora. */
  advance(minutes: number): ActionOutcome | null {
    const s = this.spec;
    if (!s || minutes <= 0) return null;
    const step = Math.min(minutes, s.minutes - this.elapsed);
    this.elapsed += step;
    s.tick?.(step);
    if (this.elapsed >= s.minutes - 1e-6 || s.until?.()) {
      this.spec = null;
      return s.done() ?? { ok: true };
    }
    return null;
  }

  /** O jogador andou: cancela se a ação deixa. */
  onMove(): ActionOutcome | null {
    if (!this.spec || this.spec.interruptible === false) return null;
    return this.cancel() ?? { ok: false };
  }

  cancel(): ActionOutcome | void {
    const s = this.spec;
    if (!s) return;
    const p = this.progress;
    this.spec = null;
    return s.cancelled?.(p) ?? { ok: false, message: 'Interrompido.', tone: 'info' };
  }
}
