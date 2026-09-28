/**
 * Números do chão que guarda o clima (neve, poças, gelo) e do "passar dias".
 * Unidades por HORA de jogo.
 */
export const GROUND_TUNING = {
  /** Neve caindo (intensidade 1) → cm por hora no chão frio. */
  snowCmPerHour: 1.8,
  /** Fração que assenta antes do inverno (sobe até 1 com o índice de inverno). */
  earlyStick: 0.3,
  /** Compactação: fração da altura perdida por hora. */
  settlePerHour: 0.0015,
  /** Chão ainda quente derrete os primeiros flocos: fração que fica = clamp((stickTemp − solo) / 2). */
  stickTemp: 1.6,
  stickMin: 0.12,
  /** Cobertura visual: 1 − e^(−cm / coverCm). 1 cm ≈ 0,28; 3 cm ≈ 0,63; 8 cm ≈ 0,93. */
  coverCm: 3,
  maxCm: 60,
  /** Derretimento (cm/h): por °C acima de zero, chuva, sol e solo morno. */
  meltPerDegree: 0.11,
  meltRain: 1.1,
  meltSun: 0.07,
  meltSoil: 0.05,
  /** Solo acompanha o ar devagar (h). */
  soilLagHours: 20,
  /** Chão molhado: chuva molha, derretimento molha um pouco; seca com calor, vento e sol. */
  wetPerRain: 1.3,
  wetPerMeltCm: 0.12,
  dryBase: 0.045,
  dryPerDegree: 0.006,
  dryWind: 0.05,
  drySun: 0.07,
  /** Gelo: poça congela com solo abaixo de zero; derrete acima de 0,5 °C. */
  freezeRate: 0.35,
  thawPerDegree: 0.1,
  /** Passo máximo de integração (min de jogo). */
  stepMinutes: 15,
  /** Partida nova: o chão "viveu" estes dias antes (neve do inverno já está lá). */
  spinUpDays: 21,
} as const;

/** Neve funda atrapalha andar (fração de velocidade perdida com a cobertura cheia). */
export const SNOW_SLOW = { player: 0.16, zombie: 0.14 } as const;

/** Passar dias no abrigo. */
export const SKIP_TUNING = {
  choices: [5, 8, 12] as readonly number[],
  /** Passo da simulação (min de jogo). */
  stepMinutes: 60,
  /** Come/bebe quando passa disso. */
  eatAt: 55,
  drinkAt: 50,
  /** Horário de dormir e acordar nos dias passados. */
  sleepFrom: 22,
  wakeAt: 7,
  /** Zumbi perto do abrigo (px) interrompe; chance por hora de um errante chegar, por zumbi num raio de 1500 px. */
  dangerRadius: 700,
  wanderRadius: 1500,
  wanderChancePerZombieHour: 0.0012,
} as const;
