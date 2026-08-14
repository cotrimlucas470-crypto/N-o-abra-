/**
 * Estado, estágios e o teto condicional.
 *
 * A tabela de estágios é a de §2, lida de data/sanity/stages.json.
 *
 * O softCap está declarado em §1 apontando para "§6", que não chegou — o
 * documento veio cortado em §3.3. A implementação abaixo é projetada, sob a
 * leitura de que um teto condicional existe para que curar sintoma não
 * devolva sanidade que a causa ainda está segurando: enquanto houver
 * infecção, sequela ou âncora contaminada, o topo não volta a 100.
 */

import stagesData from '../../data/sanity/stages.json' with { type: 'json' };
import type {
  SanityStage, SanityState, StageDef, StageEffects, DrugState, Anchor,
} from './types.ts';

export const STAGES: readonly StageDef[] = (stagesData.estagios as StageDef[])
  .slice()
  .sort((a, b) => b.min - a.min);

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function stageFor(sanity: number): StageDef {
  const v = clamp(sanity, 0, 100);
  for (const s of STAGES) if (v >= s.min) return s;
  // STAGES nunca é vazio; o último é RUPTURA (min 0)
  return STAGES[STAGES.length - 1] as StageDef;
}

export function effectsFor(sanity: number): StageEffects {
  return stageFor(sanity).efeitos;
}

function emptyDrugState(): DrugState {
  const track = () => ({
    tolerance: 0, doses: 0, activeUntilPeriod: -1,
    onsetAtPeriod: -1, dependent: false, withdrawalUntilPeriod: -1,
  });
  return {
    ANSIOLITICO: track(), ESTIMULANTE: track(),
    ANALGESICO: track(), DESTILADO: track(),
  };
}

export interface CreateOptions {
  daySeed?: number;
  sanity?: number;
  anchors?: Anchor[];
}

export function createSanityState(opts: CreateOptions = {}): SanityState {
  const sanity = clamp(opts.sanity ?? 100, 0, 100);
  return {
    sanity,
    stressBuffer: 20,
    paranoia: 0,
    realityDebt: 0,
    stage: stageFor(sanity).id,
    softCap: 100,
    anchors: opts.anchors ?? [],
    sequelae: [],
    drugState: emptyDrugState(),
    illusionPity: 0,
    lastCheckTick: 0,
    log: [],
    daySeed: opts.daySeed ?? 1,
    day: 1,
    period: 0,
    tick: 0,
    pending: [],
    onceUsed: [],
    activeIllusion: null,
    seenTells: [],
    hoursAwake: 0,
  };
}

/**
 * Condições que seguram o teto. Cada uma é removível pelo jogador, senão
 * viraria espiral de morte — §0 regra 5.
 */
export interface CapConditions {
  infeccaoAtiva?: boolean;
  ferimentoAberto?: boolean;
  semAbrigo?: boolean;
}

export function computeSoftCap(s: SanityState, cond: CapConditions = {}): number {
  let cap = 100;
  cap -= 10 * s.sequelae.length;                                   // sequela não cura sozinha
  cap -= 8 * s.anchors.filter((a) => a.status === 'CONTAMINADA').length;
  cap -= 5 * s.anchors.filter((a) => a.status === 'DESTRUIDA').length;
  if (cond.infeccaoAtiva) cap -= 15;
  if (cond.ferimentoAberto) cap -= 5;
  if (cond.semAbrigo) cap -= 10;
  cap -= Math.floor(s.realityDebt / 10) * 2;                       // a dúvida acumulada pesa

  // Piso do teto: sem isso uma run ruim ficaria sem caminho de volta e o
  // jogador travaria em RUPTURA para sempre — §0 regra 5.
  return clamp(cap, 35, 100);
}

/** Reaplica teto e estágio. Chamar depois de qualquer mexida nos números. */
export function refresh(s: SanityState, cond: CapConditions = {}): SanityState {
  s.softCap = computeSoftCap(s, cond);
  s.sanity = clamp(s.sanity, 0, s.softCap);
  s.stressBuffer = clamp(s.stressBuffer, 0, 20);
  s.paranoia = clamp(s.paranoia, 0, 100);
  s.realityDebt = clamp(s.realityDebt, 0, 100);
  s.stage = stageFor(s.sanity).id;
  return s;
}

/** Só para leitura de UI: nome do estágio, nunca o número (§1). */
export function stageLabel(stage: SanityStage): string {
  switch (stage) {
    case 'LUCIDO': return 'inteiro';
    case 'TENSO': return 'tenso';
    case 'FISSURADO': return 'fissurado';
    case 'RACHADO': return 'rachado';
    case 'DESFEITO': return 'desfeito';
    case 'RUPTURA': return 'não está mais dirigindo isso';
  }
}
