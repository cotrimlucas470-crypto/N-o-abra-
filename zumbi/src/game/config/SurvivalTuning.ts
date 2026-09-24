/**
 * Números da sobrevivência (corpo, temperatura, sono). Por HORA DE JOGO,
 * salvo indicação. Os multiplicadores gerais ficam no Sandbox (`survival`).
 */
export const NEEDS_TUNING = {
  /** 0 → 100 em ~36 h sem comer. */
  hungerPerHour: 100 / 36,
  /** 0 → 100 em ~24 h sem beber. */
  thirstPerHour: 100 / 24,
  /** 0 → 100 em ~18 h acordado. */
  fatiguePerHour: 100 / 18,
  /** Dormindo numa cama: ~8 h zeram o cansaço. */
  sleepRecoveryPerHour: 100 / 7.5,
  /** Correndo gasta mais. */
  sprintHunger: 1.6,
  sprintThirst: 2,
  sprintFatigue: 1.6,
  /** Dormindo gasta menos. */
  sleepHunger: 0.45,
  sleepThirst: 0.5,
  /** Corpo com frio queima mais; com calor, sua. */
  coldHunger: 1.3,
  heatThirst: 1.8,
  /** Doença alimentar some sozinha em ~14 h. */
  sicknessDecayPerHour: 1 / 14,
} as const;

export const HEALTH_DRAIN = {
  /** Perda de vida por hora nos extremos. */
  starving: 3,
  dehydrated: 6,
  hypothermia: 5,
  hyperthermia: 4,
  sickness: 4,
  /** Recuperação natural por hora (bem alimentado, sem ferida aberta). */
  regen: 1.2,
  regenSleeping: 3,
} as const;

export const THERMAL_TUNING = {
  normal: 37,
  /** Termorregulação: puxa de volta a 37 °C (fração por hora). */
  regulation: 0.35,
  /** Faixa de conforto da temperatura "sentida". */
  comfortLow: 20,
  comfortHigh: 30,
  coldDrive: 0.09,
  heatDrive: 0.07,
  /** Cada ponto de isolamento vale este tanto de °C sentidos. */
  insulationC: 11,
  /** Dentro de casa: o ar vai metade do caminho até 18 °C (paredes seguram calor). */
  indoorTarget: 18,
  indoorBlend: 0.45,
  /** Fogo perto (0..1 → °C). */
  fireC: 14,
  /** Atividade: andando, correndo. */
  walkC: 2,
  runC: 5,
  /** Molhado esfria (°C por unidade de molhado), pior com vento. */
  wetC: 7,
  windC: 3,
  /** Dormindo sem cobertor sente mais frio; com cobertor, mais quente. */
  sleepC: -3,
  blanketC: 7,
} as const;

export const WET_TUNING = {
  /** Chuva forte encharca em ~1 h. */
  rainPerHour: 1.1,
  /** Seca em ~4 h ao ar; mais rápido abrigado, com fogo ou calor. */
  dryPerHour: 0.25,
  dryShelter: 2,
  dryFire: 4,
  /** Capa de chuva deixa passar só isto. */
  raincoat: 0.15,
} as const;

/** Faixas dos estados (texto na tela). */
export const STATE_LEVELS = {
  hunger: [30, 55, 80],
  thirst: [25, 50, 75],
  fatigue: [50, 75, 90],
  wet: [0.15, 0.5, 0.85],
  sickness: [0.1, 0.4, 0.7],
  coldTemp: [36.5, 35.8, 35],
  hotTemp: [37.6, 38.3, 39.3],
  morale: [40, 25, 12],
} as const;
