/**
 * Partes do corpo e TIPOS de ferimento (só dados). As regras de sangramento,
 * infecção, dor e cura ficam em Health.ts; os tratamentos em Treatments.ts.
 *
 * Números por HORA de jogo e com gravidade 1 (a gravidade real 0..1 escala).
 */
import type { WearSlot } from '../items/ItemTypes';

export type BodyPart = 'cabeca' | 'pescoco' | 'tronco' | 'bracoE' | 'bracoD' | 'maoE' | 'maoD' | 'pernaE' | 'pernaD' | 'peE' | 'peD';

export const BODY_PARTS: readonly BodyPart[] = ['cabeca', 'pescoco', 'tronco', 'bracoE', 'bracoD', 'maoE', 'maoD', 'pernaE', 'pernaD', 'peE', 'peD'];

export interface PartInfo {
  label: string;
  /** "no braço esquerdo" */
  where: string;
  /** Roupa que cobre a parte (proteção contra corte/mordida). */
  slots: readonly WearSlot[];
  group: 'cabeca' | 'tronco' | 'braco' | 'perna';
}

export const PART_INFO: Record<BodyPart, PartInfo> = {
  cabeca: { label: 'Cabeça', where: 'na cabeça', slots: ['cabeca', 'rosto'], group: 'cabeca' },
  pescoco: { label: 'Pescoço', where: 'no pescoço', slots: ['pescoco'], group: 'cabeca' },
  tronco: { label: 'Tronco', where: 'no tronco', slots: ['tronco', 'tronco-externo'], group: 'tronco' },
  bracoE: { label: 'Braço esquerdo', where: 'no braço esquerdo', slots: ['tronco', 'tronco-externo'], group: 'braco' },
  bracoD: { label: 'Braço direito', where: 'no braço direito', slots: ['tronco', 'tronco-externo'], group: 'braco' },
  maoE: { label: 'Mão esquerda', where: 'na mão esquerda', slots: ['maos'], group: 'braco' },
  maoD: { label: 'Mão direita', where: 'na mão direita', slots: ['maos'], group: 'braco' },
  pernaE: { label: 'Perna esquerda', where: 'na perna esquerda', slots: ['pernas'], group: 'perna' },
  pernaD: { label: 'Perna direita', where: 'na perna direita', slots: ['pernas'], group: 'perna' },
  peE: { label: 'Pé esquerdo', where: 'no pé esquerdo', slots: ['pes'], group: 'perna' },
  peD: { label: 'Pé direito', where: 'no pé direito', slots: ['pes'], group: 'perna' },
};

export type WoundKind = 'arranhao' | 'corte' | 'laceracao' | 'perfuracao' | 'mordida' | 'fratura' | 'entorse' | 'queimadura' | 'contusao' | 'estilhaco';

export interface WoundInfo {
  label: string;
  /** Vida perdida por hora sangrando (gravidade 1, sem atadura). */
  bleedHp: number;
  /** Sangramento inicial (0..1) com gravidade 1. */
  bleed: number;
  /** Estanca sozinho (fração do sangramento por hora) — ferida grande não estanca. */
  clot: number;
  /** Dor (0..100) com gravidade 1. */
  pain: number;
  /** Horas para sarar bem tratado. */
  healHours: number;
  /** Sujeira que vira infecção por hora, sem tratar (1 = infecciona em ~1 h). */
  contamination: number;
  /** Atrapalha a parte do corpo (perna manca, mão fraca) com gravidade 1. */
  impair: number;
  /** Precisa disso para sarar direito. */
  needs?: 'sutura' | 'tala' | 'retirar' | 'pomada';
}

export const WOUND_INFO: Record<WoundKind, WoundInfo> = {
  arranhao: { label: 'Arranhão', bleedHp: 1.5, bleed: 0.4, clot: 0.8, pain: 10, healHours: 30, contamination: 0.04, impair: 0.05 },
  corte: { label: 'Corte', bleedHp: 6, bleed: 0.8, clot: 0.35, pain: 22, healHours: 80, contamination: 0.06, impair: 0.2 },
  laceracao: { label: 'Corte fundo', bleedHp: 14, bleed: 1, clot: 0.04, pain: 40, healHours: 170, contamination: 0.08, impair: 0.4, needs: 'sutura' },
  perfuracao: { label: 'Perfuração', bleedHp: 9, bleed: 0.9, clot: 0.15, pain: 38, healHours: 130, contamination: 0.1, impair: 0.35 },
  mordida: { label: 'Mordida', bleedHp: 8, bleed: 0.9, clot: 0.15, pain: 45, healHours: 170, contamination: 0.2, impair: 0.35 },
  fratura: { label: 'Fratura', bleedHp: 0, bleed: 0, clot: 1, pain: 65, healHours: 21 * 24, contamination: 0, impair: 0.85, needs: 'tala' },
  entorse: { label: 'Entorse', bleedHp: 0, bleed: 0, clot: 1, pain: 30, healHours: 4 * 24, contamination: 0, impair: 0.5 },
  queimadura: { label: 'Queimadura', bleedHp: 0, bleed: 0, clot: 1, pain: 45, healHours: 7 * 24, contamination: 0.07, impair: 0.3, needs: 'pomada' },
  contusao: { label: 'Contusão', bleedHp: 0, bleed: 0, clot: 1, pain: 18, healHours: 40, contamination: 0, impair: 0.2 },
  estilhaco: { label: 'Caco alojado', bleedHp: 4, bleed: 0.5, clot: 0.2, pain: 30, healHours: 60, contamination: 0.15, impair: 0.4, needs: 'retirar' },
};

/** Ferida aberta: sangra, suja, infecciona, aceita atadura e desinfetante. */
export function isOpen(kind: WoundKind): boolean {
  return WOUND_INFO[kind].bleed > 0 || kind === 'queimadura';
}
