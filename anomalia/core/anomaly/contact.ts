/**
 * Tabela de contato — §8. Contato não é combate: é UMA rolagem.
 *
 * A tabela CT_LACERANTE é a de §8, transcrita em data/anomalies/contact.json.
 * As outras seis seguem a mesma forma e estão marcadas como projetadas no
 * cabeçalho do arquivo de dados.
 *
 * §0 regra 1 continua valendo aqui, e vale nos dois sentidos: a anomalia não
 * morre porque não existe onde escrever isso, e a faixa de MORTE é do
 * jogador. A rolagem decide o que você perde, não quanto dano ela levou.
 */

import type {
  AnomalyMemory, ContactRow, ContactTable, ContactResultId,
} from './types.ts';
import type { SanityState } from '../sanity/types.ts';
import type { CapConditions } from '../sanity/state.ts';
import { applyLoss } from '../sanity/loss.ts';
import { refresh } from '../sanity/state.ts';
import { CONTACT_BY_ID } from './catalog.ts';
import { BONUS_MARCADO, DIAS_MARCADO } from './perception.ts';
import { d100, type Rng } from './rng.ts';

export interface ContactOutcome {
  rolagem: number;
  result: ContactResultId;
  linha: ContactRow;
  texto: string;
  perdaDeLoot: number;
  sanidade: number;
  arma: 'PERDIDA' | 'DANIFICADA' | null;
  ferimento: string | null;
  marcado: boolean;
  hpLock: number;
  epilogo: string | null;
  morreu: boolean;
}

export function tabela(id: string): ContactTable {
  const t = CONTACT_BY_ID.get(id);
  if (!t) throw new Error(`tabela de contato desconhecida: ${id}`);
  return t;
}

export function linhaDaRolagem(t: ContactTable, valor: number): ContactRow {
  for (const linha of t.roll) {
    const [lo, hi] = linha.range;
    if (valor >= lo && valor <= hi) return linha;
  }
  throw new Error(`${t.id}: rolagem ${valor} não caiu em nenhuma faixa`);
}

export function resolveContact(tableId: string, rng: Rng): ContactOutcome {
  const t = tabela(tableId);
  const rolagem = d100(rng);
  const linha = linhaDaRolagem(t, rolagem);

  return {
    rolagem,
    result: linha.result,
    linha,
    texto: linha.text,
    perdaDeLoot: linha.loot ?? 0,
    sanidade: linha.sanity ?? 0,
    arma: linha.blade ?? null,
    ferimento: linha.wound ?? null,
    marcado: linha.mark === true,
    hpLock: linha.hpLock ?? 0,
    epilogo: linha.epilogue ?? null,
    morreu: linha.result === 'MORTE',
  };
}

/**
 * Cobra o contato na cabeça. Passa por `applyLoss` do V7, o que faz o
 * stressBuffer amortecer — encontrar uma anomalia com a cabeça descansada
 * custa menos do que encontrar a mesma anomalia no fim de um dia ruim.
 */
export function aplicarContatoNaSanidade(
  s: SanityState,
  out: ContactOutcome,
  cond: CapConditions = {},
): void {
  if (out.sanidade < 0) applyLoss(s, -out.sanidade, `Contato: ${out.result}`);
  refresh(s, cond);
}

/** §8 — a marca dura 3 dias e vale +25 em toda detecção daquela anomalia. */
export function marcar(mem: AnomalyMemory, day: number): void {
  mem.markedUntilDay = day + DIAS_MARCADO;
}

export function estaMarcado(mem: AnomalyMemory, day: number): boolean {
  return day <= mem.markedUntilDay;
}

export function biasDaMarca(mem: AnomalyMemory, day: number): number {
  return estaMarcado(mem, day) ? BONUS_MARCADO : 0;
}

/**
 * §8 — a marca sai com banho completo e troca de roupa no abrigo, e custa
 * água e tecido. É a única saída, e ela é comprável: regra 5 de §0 do V7 vale
 * aqui também, nada pode ser espiral sem volta.
 */
export const CUSTO_DE_LIMPAR_MARCA = { agua: 2, tecido: 1, minutos: 40 };

export function limparMarca(mem: AnomalyMemory): void {
  mem.markedUntilDay = -1;
}
