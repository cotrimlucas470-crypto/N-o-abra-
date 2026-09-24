/**
 * Números de fabricação, fogo e água. Ajuste aqui, não nos sistemas.
 */

export const FIRE_TUNING = {
  fuel: {
    /** Minutos de queima por kg de madeira (lenha 1,2 kg ≈ 1 h; tora 6 kg ≈ 5 h). */
    woodPerKg: 50,
    /** Papel, capim, folhas: pegam rápido e acabam logo. */
    tinder: 6,
    /** Pano e roupa velha. */
    cloth: 10,
  },
  /** Chance de pegar fogo: com isca (papel, capim), com acelerante (álcool, gasolina) e só com lenha. */
  lightChance: { tinder: 0.9, accelerant: 1, bare: 0.3 },
  /** Minutos que leva para acender. */
  lightMinutes: 3,
  /** Chuva (0..1) × este fator = quanto mais rápido a lenha acaba no fogo descoberto. */
  rainBurn: 3,
  /** Chuva a partir disto apaga fogo com menos de `weakFuel` minutos de lenha. */
  rainPutOut: 0.55,
  weakFuel: 25,
  /** Pisar no fogo: raio (px) e chance por segundo de queimar o pé. */
  burnRadius: 18,
  burnChancePerSec: 0.45,
  /** Luz: só os fogos a esta distância do jogador entram no desenho. */
  lightRange: 1100,
} as const;

export const WATER_TUNING = {
  /** Beber da torneira: minutos de jogo por "gole" de 10 pontos de sede. */
  tapMinutesPer10: 1,
  /** Encher um recipiente leva este tempo (min). */
  fillMinutes: 1,
  /** A caixa da descarga guarda esta quantidade de doses (≈ 3 garrafas). */
  toiletTankDoses: 6,
  /** Banheira cheia antes do corte: doses. */
  bathtubDoses: 60,
} as const;

export const CRAFT_TUNING = {
  /** Distância (px) para usar fogueira, fogão e bancada como estação. */
  stationReach: 110,
  /** Tempo mínimo de qualquer receita (min). */
  minMinutes: 1,
  /** Consertos: quanto cada um devolve de condição. */
  repair: { tape: 0.2, glue: 0.3, sew: 0.35, sharpen: 0.2, maxTape: 0.85, maxGlue: 0.95 },
  /** Fita gasta por conserto (fração do rolo) e cloro por garrafa tratada. */
  tapeUse: 0.2,
  bleachUse: 0.05,
} as const;
