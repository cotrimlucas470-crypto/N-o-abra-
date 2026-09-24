/**
 * Ajustes do mundo interativo (portas, itens, alcance de interação).
 * Distâncias em px de mundo (1 tile = 64 px ≈ 1,3 m).
 */
import type { DoorMaterial, DoorStyle } from '../world/MapTypes';

export const DOOR_TUNING = {
  /**
   * Chance de uma porta começar aberta (cidade abandonada às pressas).
   * Sorteio determinístico por semente + id: a mesma cidade tem sempre as
   * mesmas portas abertas até o jogador mexer nelas.
   */
  startOpenChance: { exterior: 0.25, interior: 0.55, rolling: 0.3 },
  /**
   * Chance de uma porta da rua FECHADA começar trancada, por tipo de construção.
   * Dá para entrar com a chave certa, arrombando, derrubando ou pela janela.
   */
  startLockedChance: { house: 0.22, store: 0.35, pharmacy: 0.45, restaurant: 0.3, clothing: 0.35, garage: 0.3, warehouse: 0.4 } as Readonly<Record<string, number>>,
  /** Construções que começam com todas as portas fechadas (a base do jogador). */
  alwaysClosedKinds: ['shelter'] as readonly string[],
  /** Tempo da animação de abrir/fechar (s). */
  swingSeconds: 0.2,
  rollSeconds: 0.45,
  /** Raio do barulho ao abrir/fechar (px). Base do sistema de ruído. */
  noiseRadius: {
    single: 320,
    double: 360,
    rolling: 900,
  } as Record<DoorStyle, number>,
  /** Multiplicador do barulho por material. */
  noiseMaterial: { wood: 1, glass: 0.9, metal: 1.3 } as Record<DoorMaterial, number>,
  /** Barulho de forçar a maçaneta de uma porta trancada. */
  lockedRattleRadius: 220,
} as const;

export const INTERACTION_TUNING = {
  /** Distância máxima do corpo do jogador até o vão da porta (px). */
  doorReach: 46,
  /** Distância máxima do centro do jogador até o item (px). */
  itemReach: 64,
  /** Peso do "está na minha frente" na escolha do alvo (px equivalentes). */
  facingBonus: 22,
  /** Quantas vezes por segundo o alvo é recalculado. */
  scanHz: 12,
} as const;
