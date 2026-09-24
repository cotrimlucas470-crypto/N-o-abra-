/**
 * Números do RUÍDO. Alcance em px de mundo ao ar livre (1 tile = 64 px ≈ 1,3 m).
 * Parede e porta fechada abafam; o zumbi ouve um LUGAR aproximado, nunca o jogador.
 */
import type { NoiseKind } from '../sim/Noise';

/** Alcance típico de cada tipo de som (quem emite pode mandar o próprio). */
export const NOISE_RADIUS: Record<NoiseKind, number> = {
  passo: 110,
  furtivo: 26,
  corrida: 340,
  queda: 280,
  porta: 260,
  macaneta: 140,
  vidro: 900,
  golpe: 260,
  impacto: 420,
  tiro: 2400,
  alarme: 1500,
  motor: 700,
  buzina: 1600,
  batida: 1100,
  construcao: 420,
  demolicao: 760,
  gerador: 900,
  grito: 520,
  zumbi: 300,
  radio: 380,
  outro: 300,
};

export const NOISE_TUNING = {
  /** Cada parede (ou porta fechada) no caminho tira esta fração do que sobrou do alcance. */
  wallDamp: 0.45,
  /** E também um tanto fixo (px): parede grossa não deixa passar sussurro. */
  wallFlat: 60,
  /** Janela fechada abafa menos que parede. */
  windowDamp: 0.2,
  /** Erro de quem ouve: fração da distância (longe/abafado = palpite pior). */
  errorPerDistance: 0.18,
  errorPerWall: 90,
  /** Quanto tempo o som fica "no ar" para quem está longe (s de simulação). */
  memorySeconds: 2.5,
  /** Chuva forte encobre sons fracos (fração do alcance perdida com chuva 1). */
  rainMask: 0.3,
  /** Vento idem. */
  windMask: 0.15,
} as const;
