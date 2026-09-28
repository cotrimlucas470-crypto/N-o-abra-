/**
 * PROVISÕES para passar dias no abrigo (puro): quanto a comida e a água que
 * você tem (bolsa + armários já abertos do abrigo) seguram, e o que comer
 * primeiro (o que estraga antes). Só conta o que é seguro: nada podre, cru,
 * contaminado, nem lata sem abridor.
 */
import { SKIP_TUNING as K } from '../config/ClimateTuning';
import { NEEDS_TUNING as N } from '../config/SurvivalTuning';
import { doses, drinkEffect, foodEffect, freshness } from '../items/condition';
import type { ItemState } from '../items/condition';
import type { ItemDef } from '../items/ItemTypes';

export interface Supply {
  def: ItemDef;
  st?: ItemState;
  count: number;
}

/** Fome e sede de um dia parado no abrigo (dormindo à noite). */
export function dailyNeed(rates = { hunger: 1, thirst: 1 }): { hunger: number; thirst: number } {
  const sleepH = 24 - K.sleepFrom + K.wakeAt;
  const awake = 24 - sleepH;
  return {
    hunger: N.hungerPerHour * rates.hunger * (awake + sleepH * N.sleepHunger),
    thirst: N.thirstPerHour * rates.thirst * (awake + sleepH * N.sleepThirst),
  };
}

/** Quanto de fome uma unidade tira (0 = não serve: fará mal, ou falta abridor). */
export function foodValue(s: Supply, now: number, hasTag: (t: string) => boolean): number {
  const f = s.def.food;
  if (!f || (f.needs && !hasTag(f.needs))) return 0;
  const e = foodEffect(s.def, s.st, now);
  return e && e.health >= 0 && e.hunger > 0 ? e.hunger : 0;
}

/** Quanto de sede o que sobrou numa unidade tira (todas as doses). */
export function drinkValue(s: Supply): number {
  const e = drinkEffect(s.def, s.st);
  return e && e.health >= 0 && e.thirst > 0 ? e.thirst * doses(s.def, s.st) : 0;
}

/** Dias que a comida e a água seguram (a partir de agora, com fome/sede atuais). */
export function provisionDays(list: readonly Supply[], now: number, hasTag: (t: string) => boolean, current: { hunger: number; thirst: number }, rates?: { hunger: number; thirst: number }): { food: number; water: number } {
  let food = 0;
  let water = 0;
  for (const s of list) {
    food += foodValue(s, now, hasTag) * s.count;
    water += drinkValue(s) * s.count;
  }
  const need = dailyNeed(rates);
  // Começa com a fome/sede de agora; pode terminar com fome "de sempre" (até o limite de comer).
  return {
    food: Math.max(0, (food + K.eatAt - current.hunger) / need.hunger),
    water: Math.max(0, (water + K.drinkAt - current.thirst) / need.thirst),
  };
}

/** Ordem de comer: primeiro o que estraga (fresco/passado), depois o que dura. */
export function eatOrder(s: Supply, now: number): number {
  const fr = freshness(s.def, s.st, now);
  return fr === 'passado' ? 0 : fr === 'fresco' ? 1 : 2;
}
