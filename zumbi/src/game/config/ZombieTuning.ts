/**
 * Números BASE dos zumbis (antes da dificuldade). Unidades: px de mundo
 * (1 tile = 64 px ≈ 1,3 m) e segundos de simulação. A dificuldade
 * (zombies/Difficulty.ts) multiplica estes números; a IA só lê o resultado.
 */

export const ZOMBIE_TUNING = {
  /** Raio do corpo (colisão) e alcance do braço. */
  bodyRadius: 15,
  reachMin: 36,
  reachMax: 52,

  // ------------------------------------------------ movimento
  /** Andar arrastado: px/s (o jogador anda a 185). */
  shambleMin: 48,
  shambleMax: 92,
  /** Os raros que correm (recentes, inteiros). */
  sprintMin: 165,
  sprintMax: 235,
  /** Rastejando (perna destruída). */
  crawlSpeed: 22,
  /** Giro (rad/s). */
  turnRate: 5.5,

  // ------------------------------------------------ percepção
  /** Alcance da visão com luz do dia (px) antes dos fatores individuais. */
  visionRange: 700,
  /** Meio-ângulo do cone central e da visão periférica (rad). */
  fovHalf: 1.05,
  peripheralHalf: 1.9,
  /** Periferia enxerga devagar. */
  peripheralRate: 0.4,
  /** Colado atrás: sente mesmo sem ver (px). */
  touchRange: 70,
  /** Ganho da "certeza" por segundo com o jogador bem à vista, e perda sem ver. */
  detectRate: 2.4,
  detectDecay: 0.35,
  /** A partir daqui fica alerta (vira para olhar); em 1, persegue. */
  alertAt: 0.35,
  /** Luz: no breu total a visão cai para esta fração. */
  darkVision: 0.22,
  /** Postura do jogador. */
  sneakVisibility: 0.5,
  runVisibility: 1.3,
  stillVisibility: 0.75,
  vehicleVisibility: 1.5,

  // ------------------------------------------------ memória e busca (s)
  memoryMin: 14,
  memoryMax: 55,
  searchMin: 12,
  searchMax: 40,
  /** Raio da busca em volta do último ponto (px). */
  searchRadius: 260,

  // ------------------------------------------------ ataque
  /** Preparação do golpe (s): dá para ver e desviar. */
  windupMin: 0.35,
  windupMax: 0.8,
  attackCooldown: 1.1,
  /** Agarrão: segura por este tempo antes de morder (s). */
  biteDelayMin: 0.9,
  biteDelayMax: 1.7,
  /** Jogador agarrado anda nesta fração da velocidade. */
  grabbedSlow: 0.22,
  /** Derrubado (s). */
  knockdownMin: 1.8,
  knockdownMax: 3.0,

  // ------------------------------------------------ corpo (resistência de cada parte, "pontos" antes da resistência individual)
  partHp: { cabeca: 26, pescoco: 20, tronco: 70, bracoE: 32, bracoD: 32, maoE: 14, maoD: 14, pernaE: 36, pernaD: 36, peE: 16, peD: 16 },

  // ------------------------------------------------ ambiente
  /** Dano por segundo de um zumbi médio batendo (antes do material). */
  bangDps: 5,
  /** Cada zumbi a mais no mesmo alvo soma este bônus (pressão do grupo). */
  groupPressure: 0.18,
  /** Chance por segundo de empurrar uma porta destrancada que abre para o lado dele (× coordenação). */
  pushDoorChance: 0.55,
  /** Pular janela quebrada (s, antes da coordenação). */
  climbTime: 2.6,
  /** Gemido: intervalo (s) perseguindo e parado. */
  moanChase: 4,
  moanIdle: 22,

  // ------------------------------------------------ simulação por distância (px)
  lodFull: 1150,
  lodNear: 2600,
  /** Longe: cada zumbi é atualizado a cada tantos segundos. */
  farTick: 2.5,
  /** Rotas A* por quadro (perto) e orçamento de células. */
  pathsPerFrame: 3,
  pathBudget: 3500,
  /** Raio sem zumbi em volta do ponto de partida (px). */
  spawnSafeRadius: 900,
} as const;
