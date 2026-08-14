/**
 * §12 — o cruzamento entre sanidade (V7) e anomalia (V8), inteiro.
 *
 * A tabela de §12 está aqui campo por campo. Ficou num módulo só porque as
 * seis linhas dela mexem em quatro lugares diferentes (aviso, distância
 * exibida, tela de encontro, existência da anomalia), e espalhá-las seria
 * perder de vista que são uma coisa: quanto pior a cabeça, menos a leitura
 * do mundo vale.
 *
 * A anomalia falsa é o caso extremo. Aparência idêntica, telegraph idêntico,
 * encontro idêntico. Gastar recurso com ela perde o recurso de verdade;
 * passar direto devolve 6 de sanidade. A única forma de separar antes é a
 * Checagem de Realidade do V7, que custa 4 minutos e 2 de sanidade.
 */

import type { SanityStage, SanityState } from '../sanity/types.ts';
import { clamp, refresh, type CapConditions } from '../sanity/state.ts';
import type { Rng } from './rng.ts';

export const ORDEM_DE_ESTAGIO: readonly SanityStage[] =
  ['LUCIDO', 'TENSO', 'FISSURADO', 'RACHADO', 'DESFEITO', 'RUPTURA'];

export function rankDeEstagio(stage: SanityStage): number {
  return ORDEM_DE_ESTAGIO.indexOf(stage);
}

/** Coluna "% falso" da tabela de §12. */
export const MENTIRA_POR_ESTAGIO: Record<SanityStage, number> = {
  LUCIDO: 0,
  TENSO: 0.08,
  FISSURADO: 0.18,
  RACHADO: 0.30,
  DESFEITO: 0.45,
  RUPTURA: 0.45,
};

/** §12: "Distância exibida erra ±2", de Fissurado para baixo. */
export const ERRO_DE_DISTANCIA: Record<SanityStage, number> = {
  LUCIDO: 0, TENSO: 0, FISSURADO: 2, RACHADO: 2, DESFEITO: 2, RUPTURA: 2,
};

/** §12: "Opção fantasma na tela de encontro", de Rachado para baixo. */
export function permitePhantom(stage: SanityStage): boolean {
  return rankDeEstagio(stage) >= rankDeEstagio('RACHADO');
}

/** §12: "Anomalias inexistentes com telegraph completo", de Desfeito para baixo. */
export function permiteAnomaliaFalsa(stage: SanityStage): boolean {
  return rankDeEstagio(stage) >= rankDeEstagio('DESFEITO');
}

/** §12: "Encontro com anomalia que é o jogador. Sem opção de fuga." */
export function ehRuptura(stage: SanityStage): boolean {
  return stage === 'RUPTURA';
}

export function erroDeDistancia(stage: SanityStage, rng: Rng): number {
  const e = ERRO_DE_DISTANCIA[stage];
  if (e === 0) return 0;
  return rng.int(2 * e + 1) - e;
}

/** §12 — passar direto por uma anomalia falsa devolve 6 de sanidade. */
export const GANHO_POR_IGNORAR_FALSA = 6;

export function ignorouAnomaliaFalsa(s: SanityState, cond: CapConditions = {}): number {
  const antes = s.sanity;
  s.sanity = clamp(s.sanity + GANHO_POR_IGNORAR_FALSA, 0, s.softCap);
  s.log.push({
    tick: s.tick,
    delta: s.sanity - antes,
    cause: 'Passou direto por uma anomalia que não estava lá',
    absorbed: 0,
  });
  refresh(s, cond);
  return s.sanity - antes;
}

/** §12 — a Checagem de Realidade do V7 custa 4 minutos e 2 de sanidade. */
export const CUSTO_DA_CHECAGEM = { minutos: 4, sanidade: 2 };
