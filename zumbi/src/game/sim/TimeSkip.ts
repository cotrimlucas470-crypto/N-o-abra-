/**
 * PASSAR VÁRIOS DIAS (puro): o relógio anda em passos de 1 hora e, em cada
 * passo, tudo o que depende do tempo anda junto — clima do momento (o mesmo
 * que teria feito), chão (neve acumula/derrete, poças, gelo), mundo (horta,
 * coletor, fogueira, gerador — pelo gancho), corpo (fome, sede, sono à
 * noite, ferimentos, frio) com comer/beber do que houver, e o perigo
 * (zumbi chegando interrompe). O que já é calculado na leitura (comida
 * estragando, frutas, validade de remédio, loot) acompanha sozinho.
 *
 * Não mexe na tela: devolve um relatório para a cena mostrar.
 */
import { SKIP_TUNING as K } from '../config/ClimateTuning';
import type { Survivor } from '../survival/Survivor';
import type { GameClock } from './GameClock';
import type { Ground } from './Ground';
import type { Weather, WeatherSample } from './Weather';

export interface SkipBody {
  survivor: Survivor;
  /** Vida agora (para parar antes de ficar grave). */
  health(): number;
  /** Qualidade do sono (cama, travesseiro) e cobertor. */
  sleep: { quality: number; blanket: boolean };
  /** Come uma porção do que houver; false = acabou. */
  eat(): boolean;
  /** Bebe uma dose; false = acabou. */
  drink(): boolean;
}

export interface SkipHooks {
  /** Um passo do mundo (horta, fogo, gerador). Devolve um motivo para parar, ou null. */
  world?(now: number, w: WeatherSample): string | null;
  /** Corpo do sobrevivente (sem = só o mundo, como no debug). */
  body?: SkipBody;
  /** Perigo neste passo (zumbi chegando): motivo para parar, ou null. */
  danger?(now: number, hours: number): string | null;
}

export interface SkipReport {
  from: number;
  to: number;
  /** Por que parou antes (null = passou tudo). */
  stopped: string | null;
  meals: number;
  drinks: number;
  minTemp: number;
  maxTemp: number;
  rainHours: number;
  snowHours: number;
  stormHours: number;
}

/** Hora do dia em que se dorme nos dias passados. */
function sleepingAt(minutes: number): boolean {
  const h = (((minutes % 1440) + 1440) % 1440) / 60;
  return h >= K.sleepFrom || h < K.wakeAt;
}

export function skipTime(clock: GameClock, weather: Weather, ground: Ground, minutes: number, hooks: SkipHooks = {}): SkipReport {
  const r: SkipReport = { from: clock.minutes, to: clock.minutes, stopped: null, meals: 0, drinks: 0, minTemp: Infinity, maxTemp: -Infinity, rainHours: 0, snowHours: 0, stormHours: 0 };
  const end = clock.minutes + Math.max(0, minutes);
  let hours = 0;
  while (clock.minutes < end - 1e-6 && !r.stopped) {
    const step = Math.min(K.stepMinutes, end - clock.minutes);
    const mid = clock.minutes + step / 2;
    const w = weather.at(mid);
    r.minTemp = Math.min(r.minTemp, w.temp);
    r.maxTemp = Math.max(r.maxTemp, w.temp);
    if (w.rain > 0) r.rainHours += step / 60;
    if (w.snow > 0) r.snowHours += step / 60;
    if (w.sky === 'tempestade') r.stormHours += step / 60;
    clock.advance(step);
    hours += step / 60;
    ground.integrate(clock.minutes);
    r.stopped = hooks.world?.(clock.minutes, w) ?? null;
    const b = hooks.body;
    if (b && !r.stopped) {
      const sleeping = sleepingAt(mid);
      b.survivor.update(step, { weather: w, sheltered: true, activity: 'idle', fireHeat: 0, sleep: sleeping ? b.sleep : null });
      const body = b.survivor.body;
      // Come e bebe quando aperta (no máximo umas porções por hora).
      for (let i = 0; i < 3 && body.hunger >= K.eatAt; i++) {
        if (!b.eat()) break;
        r.meals++;
      }
      for (let i = 0; i < 3 && body.thirst >= K.drinkAt; i++) {
        if (!b.drink()) break;
        r.drinks++;
      }
      if (body.hunger >= 90) r.stopped = 'Acabou a comida.';
      else if (body.thirst >= 90) r.stopped = 'Acabou a água.';
      else if (body.temp < 35.3) r.stopped = 'O frio acordou você: o corpo está esfriando demais.';
      else if (b.health() < 30) r.stopped = 'Você está fraco demais para continuar parado.';
    }
    if (!r.stopped) r.stopped = hooks.danger?.(clock.minutes, hours) ?? null;
  }
  r.to = clock.minutes;
  if (r.minTemp === Infinity) r.minTemp = r.maxTemp = weather.at(clock.minutes).temp;
  return r;
}
