/**
 * Ajuste fino do personagem. Tudo em pixels de mundo e segundos.
 * Referência: 1 tile = 64px ≈ 1,3 m.
 */
export const PLAYER_TUNING = {
  /** Tamanho em que o sprite aparece no mundo (px). Assets novos são escalados para isso. */
  displaySize: 72,
  /** Raio do corpo de colisão (px de mundo). Menor que o desenho: passa por portas sem enroscar. */
  bodyRadius: 15,

  walkSpeed: 185,
  runSpeed: 300,
  /** Aceleração ao ganhar velocidade (px/s²). */
  accel: 1500,
  /** Desaceleração ao soltar/virar (px/s²). Maior que accel = para com firmeza, sem "patinar". */
  decel: 2100,
  /** Velocidade máxima de giro do tronco (rad/s). */
  turnRate: 13,
  /** Giro das pernas (rad/s) — um pouco mais lento, dá peso ao passo. */
  legsTurnRate: 10,

  /** Distância percorrida por ciclo completo de passada (2 passos), em px. Sincroniza animação e velocidade. */
  strideLength: 104,

  /** Joystick: abaixo desta intensidade o personagem anda devagar (ainda analógico). */
  minAnalogSpeedFactor: 0.25,
} as const;

export const STAMINA_TUNING = {
  max: 100,
  /** Gasto por segundo correndo. */
  drainPerSecond: 20,
  /** Recuperação por segundo parado/andando. */
  regenPerSecond: 15,
  /** Espera (s) depois de parar de correr antes de começar a recuperar. */
  regenDelay: 0.9,
  /** Ao zerar, só volta a correr quando recuperar esta fração. Evita "piscar" corre/anda. */
  exhaustedRecoverFraction: 0.3,
} as const;

export const HEALTH_TUNING = {
  max: 100,
} as const;

export const INVENTORY_TUNING = {
  /** Quanto dá para levar nas mãos e bolsos, sem mochila (kg). */
  carryCapacityKg: 8,
} as const;
