/**
 * Números da sobrevivência (corpo, temperatura, sono). Por HORA DE JOGO,
 * salvo indicação. Os multiplicadores gerais ficam no Sandbox (`survival`).
 */
export const NEEDS_TUNING = {
  /**
   * Ritmos BEM mais lentos que antes (o dia do jogo dura 15 min reais): dá
   * para passar dias em expedição com uma mochila razoável.
   * Parado: fome 0 → 100 em ~6 dias; sede em ~3 dias; cansaço em ~40 h.
   */
  hungerPerHour: 100 / 144,
  thirstPerHour: 100 / 72,
  fatiguePerHour: 100 / 40,
  /** Dormindo numa cama: ~7,5 h zeram o cansaço (proporcional às horas). */
  sleepRecoveryPerHour: 100 / 7.5,
  /** Quanto cada atividade gasta (multiplica o ritmo parado). */
  activity: {
    idle: { hunger: 1, thirst: 1, fatigue: 1 },
    walk: { hunger: 1.25, thirst: 1.4, fatigue: 1.2 },
    run: { hunger: 1.8, thirst: 2.4, fatigue: 1.7 },
    fight: { hunger: 1.6, thirst: 2.2, fatigue: 1.6 },
  },
  /** Dormindo gasta menos. */
  sleepHunger: 0.5,
  sleepThirst: 0.45,
  /** Carga acima de metade da capacidade: gasta mais (no limite da capacidade, estes acréscimos). */
  loadFrom: 0.5,
  loadHunger: 0.4,
  loadThirst: 0.6,
  loadFatigue: 0.5,
  /** Calor sentido (roupa quente conta) acima disto faz suar: +% de sede por °C, até o teto. */
  sweatFrom: 26,
  sweatPerC: 0.07,
  sweatMax: 1.2,
  /** Corpo quente (febre/calor) ainda sua mais. */
  heatThirst: 1.4,
  /** Frio: o corpo queima mais para se esquentar. */
  coldFeltFrom: 12,
  coldHunger: 1.4,
  /** Comer/beber além do necessário guarda um pouco (até -reserva): "bem alimentado/hidratado". */
  reserve: 20,
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

/**
 * Faixas dos estados (texto na tela). Fome, sede e sono têm 4 estágios
 * graduais (começando → forte → problema → crítico); o HUD só mostra do 2º em diante.
 */
export const STATE_LEVELS = {
  hunger: [35, 60, 80, 93],
  thirst: [30, 55, 75, 90],
  fatigue: [55, 72, 85, 95],
  wet: [0.25, 0.55, 0.85],
  sickness: [0.1, 0.4, 0.7],
  coldTemp: [36.3, 35.8, 35],
  hotTemp: [37.7, 38.3, 39.3],
  morale: [35, 22, 12],
} as const;

/** Qualidade do sono (Sleep.sleepComfort): o que atrapalha e quanto. */
export const SLEEP_TUNING = {
  /** Temperatura sentida (°C, já com a roupa): frio, frio forte, calor. */
  cold: 16,
  coldHard: 10,
  hot: 30,
  /** Cobertor soma tantos °C. */
  blanketC: 7,
  hunger: 60,
  thirst: 55,
  pain: 30,
  /** Dormir na moradia rende um pouco mais (lugar conhecido). */
  homeBonus: 1.1,
  /** Barulho ouvido com esta força acorda (0..1). */
  wakeNoise: 0.35,
  /** Depois de dormir, não dá para dormir de novo antes disso (cansaço mínimo). */
  minFatigue: 25,
} as const;
