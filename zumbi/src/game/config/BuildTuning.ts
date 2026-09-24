/**
 * Números de construção, demolição e horta. Ajuste aqui.
 */

export const BUILD_TUNING = {
  /** Barulho (raio px) de martelar, serrar e de derrubar parede. */
  hammerNoise: 380,
  demolishNoise: 750,
  /** Cansaço (0–100) que derrubar uma parede do mapa custa. */
  demolishFatigue: 8,
  /** Minutos para derrubar parede e cerca do mapa. */
  demolishWallMinutes: 45,
  demolishFenceMinutes: 15,
  /** O que sai de um trecho de parede/cerca derrubado. */
  wallRubble: [{ id: 'tijolo', n: 3 }],
  fenceRubble: [{ id: 'tabua', n: 1 }],
  /** Derrubar sem desmontar (marreta/machado) devolve esta fração dos materiais. */
  smashSalvage: 0.4,
} as const;

export const FARM_TUNING = {
  /** Chuva a partir disto molha a horta. */
  rainWaters: 0.2,
  /** Dias sem água: para de crescer; morre. */
  dryStopDays: 2,
  dryDieDays: 5,
  /** Frio: abaixo de coldSlow cresce devagar; abaixo de coldStop, para. */
  coldSlow: 12,
  coldStop: 5,
  /** Adubo: cresce mais rápido. */
  fertBoost: 1.3,
  /** Passou do ponto (fração do tempo de maturar) e apodreceu no pé. */
  overripe: 1.3,
  rotAfter: 1.8,
  /** Chuva enche o coletor: doses por hora com chuva 1. */
  collectorPerHour: 10,
} as const;
