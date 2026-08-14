/**
 * Orquestração.
 *
 * Junta os módulos numa passagem de período e numa passagem de dia. É o
 * único lugar que o jogo precisa chamar; nada aqui toca em apresentação
 * (§0 regra 7).
 *
 * Ordem de um período, e o porquê dela:
 *   1. vence o que estava adiado      (o alívio tardio de §3.2 cobra antes)
 *   2. abstinência                     (o corpo cobra antes do mundo)
 *   3. exposição passiva               (§3.1)
 *   4. insônia                         (§3.1, depende de já ter contado horas)
 *   5. recalcula teto e estágio        (tudo acima muda o estágio)
 *   6. sorteia ilusão e voz            (já com o estágio novo)
 *   7. ruptura por dívida              (a mentira cobra o preço — §1)
 */

import type {
  ActiveIllusion, ActiveVoice, SanityState, MentalSequela,
} from './types.ts';
import { clamp, refresh, type CapConditions } from './state.ts';
import { applyExposure, applyLoss, flushPending } from './loss.ts';
import { tickWithdrawal, suppressesInsomnia } from './drugs.ts';
import { talvezIlusao } from './illusions.ts';
import { talvezVoz, type VoiceContext } from './nightVoices.ts';
import { makeRng } from './rng.ts';

export interface PeriodInput {
  /** ids do catálogo de exposição ativos neste período */
  exposicao?: readonly string[];
  /** horas que passaram acordado neste período */
  horasAcordado?: number;
  ehNoite?: boolean;
  mortos?: readonly string[];
  moradores?: readonly string[];
  condicoes?: CapConditions;
}

export interface PeriodResult {
  perdaTotal: number;
  ilusao: ActiveIllusion | null;
  voz: ActiveVoice | null;
  ruptura: RupturaEvent | null;
  sequelaNova: MentalSequela | null;
}

export interface RupturaEvent {
  motivo: 'DIVIDA_DE_REALIDADE';
  texto: string;
  custoSanidade: number;
}

/** A partir daqui a dívida cobra. §1: realityDebt decide QUANDO. */
export const LIMIAR_RUPTURA = 60;

const SEQUELAS: readonly MentalSequela[] = [
  'TREMOR', 'HIPERVIGILANCIA', 'MUTISMO',
  'COMPULSAO', 'ECO', 'AGORAFOBIA', 'NEGACAO',
];

/** Teto de sequelas: sem isso a run vira lista de defeitos — regra 5. */
export const MAX_SEQUELAS = 3;

export function advancePeriod(s: SanityState, input: PeriodInput = {}): PeriodResult {
  const cond = input.condicoes ?? {};
  s.tick += 1;
  s.period += 1;

  let perdaTotal = 0;

  perdaTotal += flushPending(s, cond);
  perdaTotal += tickWithdrawal(s, cond);
  perdaTotal += applyExposure(s, input.exposicao ?? [], cond);

  // insônia — §3.1. O estimulante adia a conta, não a apaga.
  s.hoursAwake += input.horasAcordado ?? 0;
  if (!suppressesInsomnia(s)) {
    if (s.hoursAwake >= 48) { applyLoss(s, 12, 'Insônia (48h)'); perdaTotal += 12; }
    else if (s.hoursAwake >= 24) { applyLoss(s, 5, 'Insônia (24h sem dormir)'); perdaTotal += 5; }
  }

  refresh(s, cond);

  const ilusao = talvezIlusao(s);
  const voz = talvezVoz(s, {
    ehNoite: input.ehNoite ?? false,
    ...(input.mortos !== undefined ? { mortos: input.mortos } : {}),
    ...(input.moradores !== undefined ? { moradores: input.moradores } : {}),
  } satisfies VoiceContext);

  const { ruptura, sequelaNova } = talvezRuptura(s, cond);

  refresh(s, cond);
  return { perdaTotal, ilusao, voz, ruptura, sequelaNova };
}

/**
 * A dívida cobrando. Zera a dívida — o preço foi pago — e pode deixar
 * sequela. Nunca mata: §0 regra 1.
 */
export function talvezRuptura(
  s: SanityState,
  cond: CapConditions = {},
): { ruptura: RupturaEvent | null; sequelaNova: MentalSequela | null } {
  if (s.realityDebt < LIMIAR_RUPTURA) return { ruptura: null, sequelaNova: null };

  const rng = makeRng(s.daySeed, `ruptura:${s.day}:${s.period}`);
  const custo = 10;
  s.realityDebt = 0;
  applyLoss(s, custo, 'Ruptura por dívida de realidade');

  let sequelaNova: MentalSequela | null = null;
  const livres = SEQUELAS.filter((k) => !s.sequelae.includes(k));
  if (s.sequelae.length < MAX_SEQUELAS && livres.length > 0 && rng.chance(0.35)) {
    sequelaNova = rng.pick(livres);
    s.sequelae.push(sequelaNova);
  }

  refresh(s, cond);
  return {
    ruptura: {
      motivo: 'DIVIDA_DE_REALIDADE',
      texto: 'Tudo que você deixou passar sem conferir volta de uma vez só.',
      custoSanidade: custo,
    },
    sequelaNova,
  };
}

export interface DayInput {
  /** semente do dia seguinte; se omitida, deriva da atual de forma estável */
  daySeed?: number;
  condicoes?: CapConditions;
}

export function advanceDay(s: SanityState, input: DayInput = {}): void {
  const cond = input.condicoes ?? {};
  s.day += 1;
  s.period = 0;
  s.tick += 1;
  s.daySeed = input.daySeed ?? ((s.daySeed * 1664525 + 1013904223) >>> 0);
  s.onceUsed = s.onceUsed.filter((id) => id !== '__nunca__'); // UNICO_RUN persiste
  refresh(s, cond);
}

/** Leitura para a camada de apresentação. Nunca devolve o número (§1). */
export interface SanityReadout {
  stage: SanityState['stage'];
  uiLie: number;
  noise: number;
  stamina: number;
  lootRead: number;
  temIlusaoNoAr: boolean;
  sequelae: readonly MentalSequela[];
}

export function readout(s: SanityState): SanityReadout {
  const ef = STAGE_EF(s);
  return {
    stage: s.stage,
    uiLie: ef.uiLie,
    noise: ef.noise,
    stamina: ef.stamina,
    lootRead: ef.lootRead,
    temIlusaoNoAr: s.activeIllusion !== null,
    sequelae: s.sequelae,
  };
}

import { effectsFor } from './state.ts';
import { uiLieMultiplier, noiseDelta } from './drugs.ts';

function STAGE_EF(s: SanityState) {
  const base = effectsFor(s.sanity);
  return {
    ...base,
    uiLie: clamp(base.uiLie * uiLieMultiplier(s), 0, 1),
    noise: base.noise + noiseDelta(s),
  };
}
