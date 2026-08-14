/**
 * Fármacos.
 *
 * drugState/drugs.ts constam de §0 e §1 como entregáveis, mas a seção que os
 * descreve veio depois do corte em §3.3. Todo este módulo é projetado, sob
 * duas amarras do documento:
 *   §0 regra 1 — nada aqui mata o jogador direto; o preço é percepção.
 *   §0 regra 5 — nada aqui pode travar a run: a abstinência sempre termina.
 *
 * Desenho: o alívio é real e imediato, a tolerância corrói o alívio, e a
 * dependência transforma a ausência em perda passiva. O ansiolítico é o caso
 * mais cruel de propósito: ele reduz a chance de ilusão sem reduzir a
 * mentira da UI, ou seja, você para de ver as ilusões e continua sendo
 * enganado pelos números.
 */

import drugData from '../../data/sanity/drugs.json' with { type: 'json' };
import type { DrugDef, DrugId, SanityState } from './types.ts';
import { clamp, refresh, type CapConditions } from './state.ts';
import { applyGain } from './gain.ts';

export const DRUGS: ReadonlyMap<DrugId, DrugDef> = new Map(
  (drugData.farmacos as DrugDef[]).map((d) => [d.id, d]),
);

/** Fator de eficácia restante: 100 de tolerância = nada de efeito. */
export function efficacy(s: SanityState, id: DrugId): number {
  const t = s.drugState[id];
  return clamp(1 - t.tolerance / 100, 0, 1);
}

export function isActive(s: SanityState, id: DrugId): boolean {
  const t = s.drugState[id];
  return s.period >= t.onsetAtPeriod && s.period < t.activeUntilPeriod;
}

export function inWithdrawal(s: SanityState, id: DrugId): boolean {
  const t = s.drugState[id];
  return t.dependent && !isActive(s, id) && s.period < t.withdrawalUntilPeriod;
}

export interface DoseResult {
  ok: boolean;
  motivo?: 'DESCONHECIDO';
  sanityGanha: number;
  eficacia: number;
  ficouDependente: boolean;
}

export function takeDose(s: SanityState, id: DrugId, cond: CapConditions = {}): DoseResult {
  const def = DRUGS.get(id);
  if (!def) return { ok: false, motivo: 'DESCONHECIDO', sanityGanha: 0, eficacia: 0, ficouDependente: false };

  const track = s.drugState[id];
  const eff = efficacy(s, id);
  const antes = s.sanity;

  track.doses += 1;
  track.onsetAtPeriod = s.period + def.onset;
  track.activeUntilPeriod = track.onsetAtPeriod + def.duration;
  track.tolerance = clamp(track.tolerance + def.toleranceStep, 0, 100);

  const jaEra = track.dependent;
  if (track.doses >= def.dependenciaEm) track.dependent = true;
  // a abstinência é sempre finita — regra 5
  track.withdrawalUntilPeriod = track.activeUntilPeriod + def.withdrawal.duracao;

  applyGain(s, def.sanityImediata * eff, `${def.rotulo} (dose)`);
  s.stressBuffer = clamp(s.stressBuffer + def.bufferImediato * eff, 0, 20);
  if (def.paranoiaDelta) s.paranoia += def.paranoiaDelta * eff;

  refresh(s, cond);
  return {
    ok: true,
    sanityGanha: s.sanity - antes,
    eficacia: eff,
    ficouDependente: !jaEra && track.dependent,
  };
}

/** Multiplicador de chance de ilusão vindo dos fármacos ativos e da abstinência. */
export function illusionMultiplier(s: SanityState): number {
  let mult = 1;
  for (const [id, def] of DRUGS) {
    if (isActive(s, id)) {
      const eff = efficacy(s, id);
      mult *= 1 + (def.illusionMult - 1) * eff;   // tolerância corrói também o alívio
    } else if (inWithdrawal(s, id)) {
      mult *= def.withdrawal.illusionMult;
    }
  }
  return mult;
}

/** Multiplicador de mentira da UI. O ansiolítico não mexe nele de propósito. */
export function uiLieMultiplier(s: SanityState): number {
  let mult = 1;
  for (const [id, def] of DRUGS) {
    if (isActive(s, id)) mult *= 1 + (def.uiLieMult - 1) * efficacy(s, id);
  }
  return mult;
}

export function noiseDelta(s: SanityState): number {
  let extra = 0;
  for (const [id, def] of DRUGS) {
    if (isActive(s, id) && def.noiseDelta) extra += def.noiseDelta * efficacy(s, id);
  }
  return extra;
}

export function suppressesInsomnia(s: SanityState): boolean {
  for (const [id, def] of DRUGS) if (def.insoniaSuprimida && isActive(s, id)) return true;
  return false;
}

/** Cobrança da abstinência, uma vez por período. */
export function tickWithdrawal(s: SanityState, cond: CapConditions = {}): number {
  let total = 0;
  for (const [id, def] of DRUGS) {
    if (!inWithdrawal(s, id)) continue;
    const w = def.withdrawal;
    s.sanity = clamp(s.sanity - w.sanityPorPeriodo, 0, s.softCap);
    s.paranoia += w.paranoiaPorPeriodo;
    s.log.push({
      tick: s.tick, delta: -w.sanityPorPeriodo,
      cause: `Abstinência: ${def.rotulo}`, absorbed: 0,
    });
    total += w.sanityPorPeriodo;
  }
  // a tolerância cede devagar quando não se usa
  for (const id of DRUGS.keys()) {
    if (!isActive(s, id)) {
      s.drugState[id].tolerance = clamp(s.drugState[id].tolerance - 2, 0, 100);
    }
  }
  if (total > 0) refresh(s, cond);
  return total;
}
