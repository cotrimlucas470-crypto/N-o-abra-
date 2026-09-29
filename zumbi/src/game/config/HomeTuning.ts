/**
 * Números da MORADIA e da PREPARAÇÃO DE EXPEDIÇÃO.
 */
export const HOME_TUNING = {
  /** Moradia fora de prédio (acampamento): raio que conta como "casa" (px). */
  campRadius: 300,
  /** Em casa (abrigado), o ânimo tende a subir até +isto: lugar conhecido e seguro. */
  morale: 8,
  /** Segurança (0..1): o que cada abertura para a rua vale. */
  safety: { boarded: 1, locked: 0.85, closed: 0.5, intactWindow: 0.45, open: 0.15, broken: 0 },
} as const;

export const EXPEDITION_TUNING = {
  /** Andar pela cidade não é em linha reta: ruas, cercas, desvios. */
  routeFactor: 1.35,
  /** Tempo no destino (vasculhar, pegar coisas), minutos de jogo. */
  stayMinutes: 60,
  /** Avisos: como chega (fome/sede/sono) e peso. */
  hungerWarn: 60,
  thirstWarn: 55,
  fatigueWarn: 72,
  loadWarn: 0.75,
  /** Luz do dia abaixo disso = escuro. */
  darkBelow: 0.25,
  /** Temperatura do ar que já pede agasalho (°C) / calor forte. */
  coldAir: 8,
  hotAir: 30,
} as const;
