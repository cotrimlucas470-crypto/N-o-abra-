/**
 * PREPARAR EXPEDIÇÃO (puro): antes de sair, quanto a viagem custa de
 * verdade. Distância pelo caminho (ida e volta), tempo no relógio do jogo
 * (andando, com a carga de agora), a hora da volta (escurece antes?), o
 * que a fome/sede/sono vão estar quando voltar e se a água e a comida
 * levadas cobrem, peso, munição, temperatura/chuva e o estado do corpo.
 * Tudo com as mesmas contas do corpo (`needRates`), nada inventado.
 */
import { EXPEDITION_TUNING as T } from '../config/HomeTuning';
import { NEEDS_TUNING as N } from '../config/SurvivalTuning';
import type { WeatherSample } from '../sim/Weather';
import { daylight } from '../sim/Weather';
import { needRates, type BodyContext } from '../survival/Body';
import { drinkValue, foodValue, type Supply } from '../survival/Provisions';
import { meters, metersLabel } from '../world/PlayerMarks';
import type { SummaryRow } from './Home';

export interface ExpeditionInput {
  from: { x: number; y: number };
  to: { x: number; y: number; name: string };
  /** Para onde volta (moradia); null = volta aonde está agora. */
  back: { x: number; y: number } | null;
  /** Só a ida (voltar para casa): sem volta nem tempo no destino. */
  oneWay?: boolean;
  /** Velocidade andando (px/s reais) e minutos de jogo por segundo real. */
  walkPx: number;
  gameMinPerSec: number;
  minuteOfDay: number;
  dayHours: number;
  body: { hunger: number; thirst: number; fatigue: number; wet: number; sickness: number; temp: number };
  /** Contexto do corpo LÁ FORA (sem telhado), já com a carga. */
  ctx: BodyContext;
  weatherNow: WeatherSample;
  /** Clima na hora prevista da volta. */
  weatherBack: WeatherSample;
  carried: readonly Supply[];
  now: number;
  hasTag(tag: string): boolean;
  weight: number;
  capacity: number;
  gun: { name: string; loaded: number; capacity: number; spare: number } | null;
  melee: string | null;
  light: boolean;
  health: { bleeding: boolean; infection: boolean; pain: number; limp: boolean };
}

export interface ExpeditionPlan {
  /** Metros: ida e total (ida + volta). */
  out: number;
  total: number;
  /** Minutos de jogo: ida, no destino e total. */
  minutesOut: number;
  minutesTotal: number;
  returnAt: number;
  darkOnReturn: boolean;
  hungerEnd: number;
  thirstEnd: number;
  fatigueEnd: number;
  waterHours: number;
  foodHours: number;
  rows: SummaryRow[];
  warnings: string[];
  verdict: { tone: 'ok' | 'warn' | 'bad'; text: string };
}

export function hoursLabel(min: number): string {
  if (min < 55) return `${Math.max(5, Math.round(min / 5) * 5)} min`;
  const h = min / 60;
  return h < 10 ? `${h.toFixed(1).replace('.', ',').replace(',0', '')} h` : `${Math.round(h)} h`;
}

export function clockLabel(minuteOfDay: number): string {
  const m = ((Math.round(minuteOfDay) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function planExpedition(i: ExpeditionInput): ExpeditionPlan {
  const back = i.back ?? i.from;
  const out = meters(i.from.x, i.from.y, i.to.x, i.to.y) * T.routeFactor;
  const ret = i.oneWay ? 0 : meters(i.to.x, i.to.y, back.x, back.y) * T.routeFactor;
  const total = out + ret;
  // Metros → px → segundos reais andando → minutos do relógio do jogo.
  const toMin = (m: number) => ((m / 1.3) * 64 / Math.max(1, i.walkPx)) * i.gameMinPerSec;
  const minutesOut = toMin(out);
  const minutesTotal = i.oneWay ? minutesOut : minutesOut + T.stayMinutes + toMin(ret);
  const hours = minutesTotal / 60;
  const returnAt = i.minuteOfDay + minutesTotal;

  const r = needRates({ ...i.ctx, activity: 'walk', sleeping: false, sheltered: false }, i.body.temp, i.body.wet, i.body.sickness);
  const perH = { hunger: N.hungerPerHour * r.hunger, thirst: N.thirstPerHour * r.thirst, fatigue: N.fatiguePerHour * r.fatigue };
  const hungerEnd = i.body.hunger + perH.hunger * hours;
  const thirstEnd = i.body.thirst + perH.thirst * hours;
  const fatigueEnd = i.body.fatigue + perH.fatigue * hours;

  let water = 0;
  let food = 0;
  for (const s of i.carried) {
    water += drinkValue(s) * s.count;
    food += foodValue(s, i.now, i.hasTag) * s.count;
  }
  const waterHours = water / Math.max(0.01, perH.thirst);
  const foodHours = food / Math.max(0.01, perH.hunger);
  // Horas até ficar com sede/fome "de verdade" sem comer nada.
  const freeThirst = Math.max(0, (T.thirstWarn - i.body.thirst) / Math.max(0.01, perH.thirst));
  const freeHunger = Math.max(0, (T.hungerWarn - i.body.hunger) / Math.max(0.01, perH.hunger));
  const waterOk = freeThirst + waterHours >= hours;
  const foodOk = freeHunger + foodHours >= hours;

  const darkAt = (m: number, w: WeatherSample) => daylight(((m % 1440) + 1440) % 1440, w.cloud, i.dayHours) < T.darkBelow;
  const darkNow = darkAt(i.minuteOfDay, i.weatherNow);
  const darkOnReturn = darkAt(returnAt, i.weatherBack) || darkAt(i.minuteOfDay + minutesOut, i.weatherBack);

  const warnings: string[] = [];
  const rows: SummaryRow[] = [];
  const pct = (v: number) => `${Math.round(Math.max(0, Math.min(100, v)))}%`;

  rows.push({ label: 'Destino', value: i.to.name, tone: 'info' });
  rows.push({ label: 'Distância', value: i.oneWay ? metersLabel(out) : `${metersLabel(out)} ida · ${metersLabel(total)} ida e volta`, tone: 'info' });
  const timeTone: SummaryRow['tone'] = darkOnReturn ? (i.light ? 'warn' : 'bad') : 'ok';
  rows.push({ label: 'Tempo', value: i.oneWay ? `${hoursLabel(minutesOut)} · chega ${clockLabel(returnAt)}` : `ida ${hoursLabel(minutesOut)} · total ${hoursLabel(minutesTotal)} · volta ${clockLabel(returnAt)}`, tone: timeTone });
  if (darkOnReturn && !darkNow) warnings.push(i.light ? 'Vai escurecer antes de voltar: a lanterna chama atenção.' : 'Vai escurecer antes de voltar e você não tem luz.');
  else if (darkNow) warnings.push(i.light ? 'Está escuro: ande devagar e use a lanterna com cuidado.' : 'Está escuro e você não tem lanterna.');

  rows.push({ label: 'Água', value: water > 0 ? `leva p/ ${hoursLabel(waterHours * 60)} · sede na volta ${pct(Math.max(0, thirstEnd - water))}` : `nenhuma · sede na volta ${pct(thirstEnd)}`, tone: waterOk ? 'ok' : water > 0 ? 'warn' : 'bad' });
  if (!waterOk) warnings.push('Leve mais água: vai voltar com sede.');
  rows.push({ label: 'Comida', value: food > 0 ? `leva p/ ${hoursLabel(foodHours * 60)} · fome na volta ${pct(Math.max(0, hungerEnd - food))}` : `nenhuma · fome na volta ${pct(hungerEnd)}`, tone: foodOk ? 'ok' : food > 0 ? 'warn' : 'bad' });
  if (!foodOk) warnings.push('Coma antes ou leve comida.');

  const energyNow = 100 - i.body.fatigue;
  const energyEnd = 100 - fatigueEnd;
  rows.push({ label: 'Energia', value: `${pct(energyNow)} agora → ${pct(energyEnd)} na volta`, tone: fatigueEnd >= 90 ? 'bad' : fatigueEnd >= T.fatigueWarn ? 'warn' : 'ok' });
  if (fatigueEnd >= T.fatigueWarn) warnings.push('Vai voltar exausto: durma antes de sair.');

  const load = i.weight / Math.max(1, i.capacity);
  rows.push({ label: 'Peso', value: `${i.weight.toFixed(1).replace('.', ',')} / ${Math.round(i.capacity)} kg`, tone: load > 1 ? 'bad' : load > T.loadWarn ? 'warn' : 'ok' });
  if (load > T.loadWarn) warnings.push('Muito peso: cansa, dá sede e sobra pouco espaço para o que achar.');

  if (i.gun) {
    const n = i.gun.loaded + i.gun.spare;
    rows.push({ label: 'Munição', value: `${i.gun.name}: ${i.gun.loaded}/${i.gun.capacity} + ${i.gun.spare} reserva`, tone: n >= i.gun.capacity * 2 ? 'ok' : n > 0 ? 'warn' : 'bad' });
    if (n === 0) warnings.push('Arma sem munição: leve uma arma branca.');
  } else rows.push({ label: 'Munição', value: i.melee ? `sem arma de fogo · ${i.melee}` : 'desarmado', tone: i.melee ? 'info' : 'bad' });
  if (!i.gun && !i.melee) warnings.push('Desarmado: pegue algo para se defender.');

  const w0 = i.weatherNow;
  const w1 = i.weatherBack;
  const wet = Math.max(w0.rain, w1.rain) > 0.25;
  const cold = Math.min(w0.temp, w1.temp) < T.coldAir;
  const hot = Math.max(w0.temp, w1.temp) > T.hotAir;
  rows.push({ label: 'Temperatura', value: `${Math.round(w0.temp)}°C agora · ${Math.round(w1.temp)}°C na volta${wet ? ' · chuva' : w1.snow > 0.2 ? ' · neve' : ''}`, tone: (cold && i.ctx.insulation < 0.9) || (wet && !i.ctx.raincoat) ? 'warn' : 'ok' });
  if (cold && i.ctx.insulation < 0.9) warnings.push('Vai esfriar: vista um agasalho.');
  if (wet && !i.ctx.raincoat) warnings.push('Chuva no caminho: roupa molhada esfria rápido.');
  if (hot) warnings.push('Calor forte: a sede aumenta muito.');

  const cond: string[] = [];
  if (i.health.bleeding) cond.push('sangrando');
  if (i.health.infection) cond.push('infecção');
  if (i.health.limp) cond.push('mancando');
  if (i.health.pain >= 40) cond.push('dor');
  if (i.body.sickness > 0.3) cond.push('enjoado');
  if (i.body.wet > 0.5) cond.push('molhado');
  rows.push({ label: 'Condições', value: cond.length ? cond.join(', ') : 'bem', tone: i.health.bleeding || i.health.infection ? 'bad' : cond.length ? 'warn' : 'ok' });
  if (i.health.bleeding) warnings.unshift('Sangrando: faça um curativo antes de sair.');

  const bad = rows.filter((r) => r.tone === 'bad').length;
  const warn = rows.filter((r) => r.tone === 'warn').length;
  const verdict = bad
    ? { tone: 'bad' as const, text: 'Arriscado: resolva os pontos em vermelho antes de sair.' }
    : warn
      ? { tone: 'warn' as const, text: 'Dá para ir, com cuidado.' }
      : { tone: 'ok' as const, text: 'Pronto para sair.' };
  return { out, total, minutesOut, minutesTotal, returnAt, darkOnReturn, hungerEnd, thirstEnd, fatigueEnd, waterHours, foodHours, rows, warnings, verdict };
}
