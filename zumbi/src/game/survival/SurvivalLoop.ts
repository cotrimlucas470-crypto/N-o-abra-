/**
 * Laço da sobrevivência, chamado pela cena a cada quadro (puro, sem Phaser):
 *
 *   ação em andamento (andar cancela) → velocidade do relógio → relógio anda →
 *   clima do momento → abrigo → corpo/ferimentos/roupas/aparelhos →
 *   ação avança/termina → efeitos no movimento e no fôlego.
 *
 * A cena só passa o que o jogador está fazendo e mostra o resultado.
 */
import type { ActionOutcome, ActionRunner, TimedActionSpec } from '../sim/Actions';
import type { Calendar } from '../sim/Calendar';
import type { GameClock } from '../sim/GameClock';
import type { Weather, WeatherSample } from '../sim/Weather';
import { isSheltered, type ExtraCover } from '../world/shelter';
import type { WorldModel } from '../world/WorldModel';
import type { Activity } from './Body';
import type { PhysicalEffects } from './Effects';
import { sleepAction, type SleepInfo, type SleepOptions, SLEEP_QUALITY } from './Sleep';
import type { Survivor } from './Survivor';

export interface PlayerFrame {
  x: number;
  y: number;
  /** O jogador está pedindo para andar (joystick/teclado). */
  moving: boolean;
  sprinting: boolean;
}

export interface SurvivalHooks {
  /** Resultado de ação (mensagem na tela). */
  outcome(o: ActionOutcome): void;
  /** Calor de fogo perto do ponto (0..1). Etapa de fogo preenche. */
  fireHeat?(x: number, y: number): number;
  /** Coberturas construídas. */
  extraCover?: ExtraCover;
}

export class SurvivalLoop {
  weather: WeatherSample;
  sheltered = true;
  /** Dia em que ouviu o boletim no rádio (libera a previsão). */
  radioDay = -1;
  private sleepInfo: SleepInfo | null = null;
  private weatherAt = -1;

  constructor(
    readonly clock: GameClock,
    readonly calendar: Calendar,
    readonly weatherModel: Weather,
    readonly survivor: Survivor,
    readonly runner: ActionRunner,
    private readonly model: WorldModel,
    private readonly hooks: SurvivalHooks,
  ) {
    this.weather = weatherModel.at(clock.minutes);
  }

  get sleeping(): boolean {
    return this.sleepInfo !== null;
  }

  /** Um quadro. Devolve os minutos de jogo que passaram. */
  frame(dtReal: number, p: PlayerFrame): number {
    const r = this.runner;
    if (p.moving && r.active) {
      const o = r.onMove();
      if (o) this.hooks.outcome(o);
    }
    const c = this.clock;
    c.timeScale = r.active ? c.userScale * r.timeScale(c.baseRate) : c.userScale;
    const minutes = c.update(dtReal);

    // Clima: recalcula a cada meio minuto de jogo (é barato, mas não precisa todo quadro).
    if (Math.abs(c.minutes - this.weatherAt) >= 0.5) {
      this.weatherAt = c.minutes;
      this.weather = this.weatherModel.at(c.minutes);
    }
    this.sheltered = isSheltered(this.model, p.x, p.y, this.hooks.extraCover);
    const activity: Activity = this.sleepInfo ? 'idle' : p.sprinting ? 'run' : p.moving ? 'walk' : 'idle';
    if (minutes > 0) {
      this.survivor.update(minutes, {
        weather: this.weather,
        sheltered: this.sheltered,
        activity,
        fireHeat: this.hooks.fireHeat?.(p.x, p.y) ?? 0,
        sleep: this.sleepInfo,
      });
      const o = r.advance(minutes);
      if (o) this.hooks.outcome(o);
    }
    return minutes;
  }

  get effects(): PhysicalEffects {
    return this.survivor.effects();
  }

  /** Começa uma ação com tempo (a anterior é cancelada). */
  start(spec: TimedActionSpec): void {
    const o = this.runner.start(spec);
    if (o) this.hooks.outcome(o);
  }

  /** Dormir (se der). Devolve o motivo de não conseguir, ou null. */
  sleep(opts: SleepOptions): string | null {
    const why = this.survivor.cantSleep();
    if (why) return why;
    this.sleepInfo = { quality: SLEEP_QUALITY[opts.place], blanket: opts.blanket };
    this.start(sleepAction(this.survivor, this.clock, opts, () => (this.sleepInfo = null)));
    return null;
  }

  /** Acordar / cancelar a ação atual (botão na tela). */
  cancelAction(): void {
    const o = this.runner.cancel();
    if (o) this.hooks.outcome(o);
    this.sleepInfo = null;
  }

  /** Data e hora para o HUD. */
  dateLabel(): string {
    return this.calendar.label(this.clock.dayIndex);
  }
}
