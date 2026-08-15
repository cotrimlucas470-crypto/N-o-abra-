/**
 * Tipos do V9.
 *
 * O V7/V8 já tinha sanidade, rastro e memória — em outra forma. O V9 não os
 * substitui: ele é a camada em que a sanidade deixa de ser barra e vira
 * filtro, e em que a anomalia deixa de te ver e passa a te somar.
 *
 * Os nomes e os números aqui são os do documento, sem tradução, pra que o
 * que está escrito lá seja o que roda.
 */

export type Stage =
  | 'LUCIDO' | 'TENSO' | 'FISSURADO'
  | 'RACHADO' | 'DESFEITO' | 'RUPTURA';

/** Sequelas do V9: travas permanentes, não estados. */
export type Scar = 'TREMOR' | 'SURDEZ_PARCIAL' | 'CEGUEIRA_NOTURNA';

export interface SanityState {
  sanity: number;        // 0..100 (oculto)
  stressBuffer: number;  // 0..30 absorve antes da sanity
  paranoia: number;      // 0..100 vies de leitura
  realityDebt: number;   // 0..100 cobra em cena
  withdrawal: number;    // 0..100 abstinencia
  scars: Scar[];         // sequelas permanentes
  nightsLow: number;
}

/** [stage, min, illusionChance, uiLieChance] */
export type StageRow = readonly [Stage, number, number, number];

export type TraceKind = 'SOM' | 'ODOR' | 'VISUAL' | 'METAL' | 'PRESENCA';

export interface PlayerTrace {
  kind: TraceKind;
  power: number;
}

export interface AnomalyDef {
  id: string;
  nickname: string;
  /** peso por sentido — o que ela escuta melhor */
  senses: Partial<Record<TraceKind, number>>;
  /** o ponto cego. Nunca é dito ao jogador. */
  blindTo: TraceKind[];
  /** acúmulo necessário pro contato */
  threshold: number;
  /** esquecimento por tick */
  decay: number;
  /** tática -> vezes usada */
  memory: Record<string, number>;
}

export interface CarriedItem {
  id: string;
  metalNoise: number;
}

export interface WeaponDef {
  id: string;
  /** segundos que a lâmina compra. Não mata: atrasa. */
  delaySec: number;
}

export interface PlayerState {
  moveSpeed: number;       // 0 parado, 1 andando, 2 correndo
  radioOn: boolean;
  bleeding: boolean;
  daysUnwashed: number;
  flashlightOn: boolean;
  inventory: CarriedItem[];
  marked: boolean;
  weapon: WeaponDef | null;
  /** 0..1 — sobrecarga da mochila (§14) */
  overload: number;
}

export type ContactOut = 'FUGA' | 'FUGA_CARA' | 'MARCADO' | 'MORTE';

export interface ContactResult {
  out: ContactOut;
  cost?: string;
  marked?: boolean;
}
