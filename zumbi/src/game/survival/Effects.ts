/**
 * EFEITOS do estado físico: junta corpo (fome, sede, sono, temperatura,
 * ânimo), carga (peso) e ferimentos em números que os sistemas usam —
 * velocidade, fôlego, rapidez das ações, força do golpe, mira.
 * Puro: recebe os estados, devolve multiplicadores. Um lugar só para
 * balancear "o quanto cada coisa atrapalha".
 */
import { clamp } from '../core/math';
import type { Body } from './Body';

export interface PhysicalEffects {
  walk: number;
  run: number;
  canSprint: boolean;
  staminaDrain: number;
  staminaRegen: number;
  /** Rapidez das ações com tempo (fabricar, tratar, construir): >1 = mais lento. */
  actionTime: number;
  /** Força e precisão do golpe. */
  melee: number;
  /** Tremor da mira (0 = firme). */
  aimShake: number;
  /** Chance de tropeçar correndo (por segundo). */
  tripChance: number;
}

/** O que os ferimentos pedem (etapa de ferimentos preenche). */
export interface InjuryEffects {
  /** 0..1 por perna/pé (1 = inutilizada). */
  legs: number;
  /** 0..1 por braço/mão. */
  arms: number;
  /** 0..100 (depois dos analgésicos). */
  pain: number;
  /** Fratura na perna: não corre. */
  legFracture: boolean;
}

export const NO_INJURY: InjuryEffects = { legs: 0, arms: 0, pain: 0, legFracture: false };

/**
 * `load` = peso sentido (kg) e `capacity` = capacidade total (kg).
 * Acima de 70% da capacidade começa a pesar; no limite, bem mais lento.
 */
export function physicalEffects(body: Body, load: number, capacity: number, injury: InjuryEffects = NO_INJURY): PhysicalEffects {
  let walk = 1;
  let run = 1;
  let canSprint = true;
  let drain = 1;
  let regen = 1;
  let action = 1;
  let melee = 1;
  let aim = 0;
  let trip = 0;

  // Sono
  if (body.fatigue >= 90) {
    walk *= 0.82;
    run *= 0.8;
    canSprint = false;
    regen *= 0.5;
    action *= 1.35;
    melee *= 0.75;
    aim += 0.25;
  } else if (body.fatigue >= 75) {
    walk *= 0.92;
    run *= 0.9;
    regen *= 0.7;
    action *= 1.15;
    melee *= 0.88;
    aim += 0.12;
  } else if (body.fatigue >= 50) {
    regen *= 0.88;
  }
  // Fome e sede
  if (body.hunger >= 80) {
    regen *= 0.65;
    melee *= 0.85;
  } else if (body.hunger >= 55) regen *= 0.85;
  if (body.thirst >= 75) {
    regen *= 0.6;
    drain *= 1.25;
    action *= 1.1;
  } else if (body.thirst >= 50) regen *= 0.85;
  // Temperatura
  if (body.temp < 35) {
    walk *= 0.8;
    run *= 0.75;
    action *= 1.4;
    melee *= 0.75;
    aim += 0.35;
  } else if (body.temp < 35.8) {
    walk *= 0.93;
    action *= 1.15;
    aim += 0.15;
  }
  if (body.temp > 39.3) {
    walk *= 0.85;
    drain *= 1.4;
    regen *= 0.6;
  } else if (body.temp > 38.3) {
    drain *= 1.15;
    regen *= 0.85;
  }
  if (body.sickness > 0.4) {
    regen *= 0.75;
    melee *= 0.85;
  }
  if (body.morale < 25) {
    regen *= 0.85;
    action *= 1.1;
  }

  // Carga
  const ratio = capacity > 0 ? load / capacity : 0;
  if (ratio > 0.7) {
    const over = clamp((ratio - 0.7) / 0.3, 0, 1.5);
    walk *= 1 - 0.22 * over;
    run *= 1 - 0.3 * over;
    drain *= 1 + 0.8 * over;
    trip += 0.004 * over;
  }

  // Ferimentos
  if (injury.legs > 0) {
    walk *= 1 - 0.45 * injury.legs;
    run *= 1 - 0.6 * injury.legs;
    drain *= 1 + 0.5 * injury.legs;
    if (injury.legs > 0.55) canSprint = false;
  }
  if (injury.legFracture) canSprint = false;
  if (injury.arms > 0) {
    action *= 1 + 0.6 * injury.arms;
    melee *= 1 - 0.5 * injury.arms;
    aim += 0.4 * injury.arms;
  }
  if (injury.pain > 20) {
    const p = (injury.pain - 20) / 80;
    regen *= 1 - 0.35 * p;
    action *= 1 + 0.25 * p;
    aim += 0.2 * p;
  }
  // Exausto e pesado demais: tropeça.
  if (body.fatigue >= 85) trip += 0.003;

  return {
    walk: clamp(walk, 0.3, 1),
    run: clamp(run, 0.3, 1),
    canSprint,
    staminaDrain: drain,
    staminaRegen: clamp(regen, 0.15, 1),
    actionTime: clamp(action, 1, 3),
    melee: clamp(melee, 0.2, 1),
    aimShake: clamp(aim, 0, 1),
    tripChance: trip,
  };
}
