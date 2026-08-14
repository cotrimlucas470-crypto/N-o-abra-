/**
 * Ilusões.
 *
 * O documento não traz o catálogo (cortou em §3.3), mas traz as regras que o
 * governam, e elas estão todas aplicadas aqui:
 *   §0 regra 2 — nada no texto diz que é ilusão. `text` é o que o jogador lê,
 *                e ele é idêntico quer a coisa seja real ou não.
 *   §0 regra 4 — toda ilusão tem um tell verificável. `assertCatalogSano()`
 *                falha se alguma entrar sem tell: ilusão sem tell é bug.
 *   §0 regra 5 — pity: depois de N rodadas secas, a próxima é garantida.
 *   §1        — sanity decide QUANTO o mundo mente (chance por estágio);
 *                paranoia decide O TOM (hostil vs. melancólica).
 */

import illusionData from '../../data/sanity/illusions.json' with { type: 'json' };
import type {
  ActiveIllusion, IllusionDef, IllusionTone, SanityStage, SanityState,
} from './types.ts';
import { STAGES, clamp, refresh, stageFor, type CapConditions } from './state.ts';
import { illusionMultiplier } from './drugs.ts';
import { makeRng } from './rng.ts';

export const ILLUSIONS: readonly IllusionDef[] = illusionData.ilusoes as IllusionDef[];

/** Rodadas secas até a próxima ilusão ser garantida — regra 5. */
export const PITY_LIMITE = 12;

const ORDEM: readonly SanityStage[] =
  ['LUCIDO', 'TENSO', 'FISSURADO', 'RACHADO', 'DESFEITO', 'RUPTURA'];

function rank(stage: SanityStage): number {
  return ORDEM.indexOf(stage);
}

/** Regra 4 como teste executável: nenhuma ilusão pode entrar sem tell. */
export function assertCatalogSano(): void {
  for (const i of ILLUSIONS) {
    if (!i.tell || i.tell.trim().length < 12) {
      throw new Error(`Ilusão sem tell utilizável: ${i.id} (regra 4 de §0)`);
    }
    if (!i.canBeReal && i.whenReal !== null) {
      throw new Error(`Ilusão ${i.id}: canBeReal=false mas tem whenReal`);
    }
    if (i.canBeReal && !i.whenReal) {
      throw new Error(`Ilusão ${i.id}: canBeReal=true exige whenReal`);
    }
    if (rank(i.minStage) < 0) throw new Error(`Ilusão ${i.id}: minStage inválido`);
  }
}

export function elegiveis(stage: SanityStage): readonly IllusionDef[] {
  const r = rank(stage);
  return ILLUSIONS.filter((i) => rank(i.minStage) <= r);
}

/** Chance efetiva do período, já com fármacos e pity. */
export function chanceDoPeriodo(s: SanityState): number {
  const base = stageFor(s.sanity).illusionChance;
  const comDroga = base * illusionMultiplier(s);
  if (s.illusionPity >= PITY_LIMITE) return 1;
  return clamp(comDroga, 0, 0.95);
}

/**
 * §1: paranoia decide o tom. Em 0 de paranoia o melancólico domina;
 * em 100 o hostil domina. Nunca é absoluto — os dois seguem possíveis.
 */
export function pesoDoTom(s: SanityState, tone: IllusionTone): number {
  const p = clamp(s.paranoia, 0, 100) / 100;
  return tone === 'HOSTIL' ? 0.2 + 0.8 * p : 0.2 + 0.8 * (1 - p);
}

/**
 * A ilusão é real? Quanto pior a cabeça, menor a chance de haver algo ali —
 * o sentido apodrece junto com quem sente. Ilusões com canBeReal=false nunca
 * são reais.
 */
export function chanceDeSerReal(s: SanityState, def: IllusionDef): number {
  if (!def.canBeReal) return 0;
  const ilusao = stageFor(s.sanity).illusionChance;
  return clamp(0.62 - ilusao, 0.06, 0.62);
}

export function talvezIlusao(s: SanityState): ActiveIllusion | null {
  const rng = makeRng(s.daySeed, `ilusao:${s.day}:${s.period}`);
  if (!rng.chance(chanceDoPeriodo(s))) {
    s.illusionPity += 1;
    return null;
  }

  let pool = elegiveis(s.stage);
  if (pool.length === 0 && s.illusionPity >= PITY_LIMITE) {
    // A pity não pode ser beco sem saída (regra 5): se o estágio atual não
    // tem nada elegível, cai para o degrau mais baixo do catálogo em vez de
    // acumular seca para sempre.
    const menor = Math.min(...ILLUSIONS.map((i) => rank(i.minStage)));
    pool = ILLUSIONS.filter((i) => rank(i.minStage) === menor);
  }
  if (pool.length === 0) { s.illusionPity += 1; return null; }

  const def = rng.weighted(pool, (i) => pesoDoTom(s, i.tone));
  const isReal = rng.chance(chanceDeSerReal(s, def));

  s.illusionPity = 0;
  const active: ActiveIllusion = {
    def, isReal, raisedAtPeriod: s.period, text: def.text,
  };
  s.activeIllusion = active;
  return active;
}

export interface ResolveResult {
  text: string;
  sanityDelta: number;
  debtDelta: number;
}

/** O jogador foi verificar. O custo é dele; a informação também. */
export function verificar(s: SanityState, cond: CapConditions = {}): ResolveResult | null {
  const active = s.activeIllusion;
  if (!active) return null;
  s.activeIllusion = null;

  const antesSan = s.sanity, antesDebt = s.realityDebt;

  if (active.isReal) {
    s.realityDebt = clamp(s.realityDebt - 4, 0, 100);
  } else {
    // saber que era mentira custa, mas custa menos do que ficar sem saber
    s.sanity = clamp(s.sanity - Math.round(active.def.ignoreSanity * 0.6), 0, s.softCap);
    s.realityDebt = clamp(s.realityDebt - 6, 0, 100);
    s.log.push({
      tick: s.tick, delta: s.sanity - antesSan,
      cause: `Verificou: ${active.def.id}`, absorbed: 0,
    });
  }
  if (!s.seenTells.includes(active.def.id)) s.seenTells.push(active.def.id);

  refresh(s, cond);
  return {
    text: active.isReal ? (active.def.whenReal ?? '') : active.def.whenFalse,
    sanityDelta: s.sanity - antesSan,
    debtDelta: s.realityDebt - antesDebt,
  };
}

/** O jogador deixou passar. A dúvida vira dívida. */
export function ignorar(s: SanityState, cond: CapConditions = {}): ResolveResult | null {
  const active = s.activeIllusion;
  if (!active) return null;
  s.activeIllusion = null;

  const antesSan = s.sanity, antesDebt = s.realityDebt;
  s.sanity = clamp(s.sanity - active.def.ignoreSanity, 0, s.softCap);
  s.realityDebt = clamp(s.realityDebt + active.def.ignoreDebt, 0, 100);
  s.log.push({
    tick: s.tick, delta: s.sanity - antesSan,
    cause: `Ignorou: ${active.def.id}`, absorbed: 0,
  });

  refresh(s, cond);
  return {
    text: active.def.onIgnore,
    sanityDelta: s.sanity - antesSan,
    debtDelta: s.realityDebt - antesDebt,
  };
}
