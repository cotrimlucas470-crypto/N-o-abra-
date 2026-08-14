/**
 * Recuperação.
 *
 * O documento fixa uma regra de ganho (§1: stressBuffer regenera 2 por hora
 * dormindo) e declara gain.ts como entregável; o catálogo em si veio depois
 * do corte em §3.3 e está marcado como projetado em data/sanity/gains.json.
 *
 * Regra de desenho seguida aqui: sanidade sobe devagar e sempre esbarra no
 * softCap. Curar a cabeça sem tratar a causa não devolve o topo.
 */

import gainData from '../../data/sanity/gains.json' with { type: 'json' };
import type { GainDef, SanityState } from './types.ts';
import { clamp, refresh, type CapConditions } from './state.ts';

export const BUFFER_POR_HORA_DORMINDO: number = gainData.bufferPorHoraDormindo;

export const GAINS: ReadonlyMap<string, GainDef> = new Map(
  (gainData.ganhos as GainDef[]).map((g) => [g.id, g]),
);

export function applyGain(s: SanityState, amount: number, cause: string): void {
  if (amount <= 0) return;
  const antes = s.sanity;
  s.sanity = clamp(s.sanity + amount, 0, s.softCap);
  const real = s.sanity - antes;          // o teto pode ter comido parte
  s.log.push({ tick: s.tick, delta: real, cause, absorbed: 0 });
}

export function applyCatalogGain(
  s: SanityState,
  id: string,
  cond: CapConditions = {},
): { applied: boolean; sanityGanha: number } {
  const def = GAINS.get(id);
  if (!def) return { applied: false, sanityGanha: 0 };

  const antes = s.sanity;
  applyGain(s, def.sanity, def.rotulo);
  s.stressBuffer = clamp(s.stressBuffer + def.buffer, 0, 20);
  if (def.debtRelief) s.realityDebt = clamp(s.realityDebt - def.debtRelief, 0, 100);
  refresh(s, cond);
  return { applied: true, sanityGanha: s.sanity - antes };
}

/** §1: 2 por hora dormindo. Zera o contador de insônia. */
export function sleep(
  s: SanityState,
  hours: number,
  seguro: boolean,
  cond: CapConditions = {},
): { sanityGanha: number; bufferGanho: number } {
  const bufferAntes = s.stressBuffer;
  s.stressBuffer = clamp(
    s.stressBuffer + BUFFER_POR_HORA_DORMINDO * Math.max(0, hours), 0, 20,
  );
  s.hoursAwake = 0;

  const antes = s.sanity;
  if (hours >= 6 && seguro) applyCatalogGain(s, 'NOITE_INTEIRA', cond);
  else if (hours >= 3) applyCatalogGain(s, 'NOITE_PICADA', cond);

  refresh(s, cond);
  return { sanityGanha: s.sanity - antes, bufferGanho: s.stressBuffer - bufferAntes };
}
