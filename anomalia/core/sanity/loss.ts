/**
 * Perdas de sanidade.
 *
 * `applyLoss` é o corpo dado em §3.1 do documento, com duas coisas que o
 * trecho original deixava implícitas e que sem elas o motor não fecha:
 *   - `now()` e `clamp` não vinham definidos; aqui o relógio é o tick do
 *     próprio estado, para manter o log determinístico junto com o daySeed.
 *   - o documento clampa em `[0, softCap]`, o que impede que uma perda leve
 *     a sanidade abaixo de 0; mantido igual.
 *
 * Os catálogos vêm de data/sanity/losses.json (§3.1 e §3.2 transcritos;
 * §3.3 chegou cortada e está marcada como projetada no próprio arquivo).
 */

import lossData from '../../data/sanity/losses.json' with { type: 'json' };
import type { LossContext, LossDef, SanityState } from './types.ts';
import { clamp, refresh, type CapConditions } from './state.ts';

function index(defs: LossDef[]): ReadonlyMap<string, LossDef> {
  const m = new Map<string, LossDef>();
  for (const d of defs) m.set(d.id, d);
  return m;
}

export const LOSSES: ReadonlyMap<string, LossDef> = index([
  ...(lossData.exposicao as LossDef[]),
  ...(lossData.encontro as LossDef[]),
  ...(lossData.abrigoEVinculo as LossDef[]),
]);

/** §3.1 — toda perda passa primeiro pelo stressBuffer. */
export function applyLoss(s: SanityState, amount: number, cause: string): void {
  if (amount <= 0) return;
  const absorbed = Math.min(s.stressBuffer, amount);
  s.stressBuffer -= absorbed;
  const real = amount - absorbed;
  s.sanity = clamp(s.sanity - real, 0, s.softCap);
  s.log.push({ tick: s.tick, delta: -real, cause, absorbed });
}

/** Resolve os modificadores que o documento escreve em texto na tabela §3.2. */
function applyModifier(def: LossDef, s: SanityState, ctx: LossContext): number {
  switch (def.modifier) {
    case 'HIPERVIGILANCIA_META':
      return s.sequelae.includes('HIPERVIGILANCIA') ? def.amount * 0.5 : def.amount;
    case 'SOZINHO_VEZ_MEIO':
      return ctx.sozinho ? def.amount * 1.5 : def.amount;
    default:
      return def.amount;
  }
}

export interface LossReport {
  applied: boolean;
  reason?: 'DESCONHECIDA' | 'JA_GASTA_NA_RUN' | 'ADIADA';
  amount: number;
}

/**
 * Aplica uma entrada do catálogo pelo id.
 * Cadence UNICO_RUN só entra uma vez; delayPeriods empurra para depois.
 */
export function applyCatalogLoss(
  s: SanityState,
  id: string,
  ctx: LossContext = {},
  cond: CapConditions = {},
): LossReport {
  const def = LOSSES.get(id);
  if (!def) return { applied: false, reason: 'DESCONHECIDA', amount: 0 };

  if (def.cadence === 'UNICO_RUN') {
    if (s.onceUsed.includes(def.id)) {
      return { applied: false, reason: 'JA_GASTA_NA_RUN', amount: 0 };
    }
    s.onceUsed.push(def.id);
  }

  const amount = applyModifier(def, s, ctx);

  if (def.delayPeriods && def.delayPeriods > 0) {
    s.pending.push({
      id: def.id,
      amount,
      cause: def.rotulo,
      duePeriod: s.period + def.delayPeriods,
    });
    // paranoia e dúvida do documento entram junto com a perda, não antes
    return { applied: false, reason: 'ADIADA', amount };
  }

  applyLoss(s, amount, def.rotulo);
  if (def.paranoia) s.paranoia += def.paranoia;
  if (def.realityDebt) s.realityDebt += def.realityDebt;
  refresh(s, cond);
  return { applied: true, amount };
}

/** Descarrega o que venceu. Chamado pelo engine na virada de período. */
export function flushPending(s: SanityState, cond: CapConditions = {}): number {
  if (s.pending.length === 0) return 0;
  const due = s.pending.filter((p) => p.duePeriod <= s.period);
  if (due.length === 0) return 0;
  s.pending = s.pending.filter((p) => p.duePeriod > s.period);

  let total = 0;
  for (const p of due) {
    applyLoss(s, p.amount, p.cause);
    const def = LOSSES.get(p.id);
    if (def?.paranoia) s.paranoia += def.paranoia;
    if (def?.realityDebt) s.realityDebt += def.realityDebt;
    total += p.amount;
  }
  refresh(s, cond);
  return total;
}

/** Condições passivas ativas neste período — ids do catálogo de exposição. */
export function applyExposure(
  s: SanityState,
  activeIds: readonly string[],
  cond: CapConditions = {},
): number {
  let total = 0;
  for (const id of activeIds) {
    const r = applyCatalogLoss(s, id, {}, cond);
    if (r.applied) total += r.amount;
  }
  return total;
}
