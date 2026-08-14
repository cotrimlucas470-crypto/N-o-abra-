/**
 * Verificação de realidade.
 *
 * realityCheck.ts é entregável de §0; a seção veio depois do corte.
 *
 * A amarra que vem do documento é forte e está respeitada: §0 regra 2 diz
 * que a verificação é ação do jogador, nunca aviso do jogo. Então este
 * módulo não decide nada sozinho — ele só resolve uma verificação pedida.
 *
 * Cada método casa com um canal de tell. Usar o método certo para o canal
 * certo encontra o tell; usar o errado gasta o tempo e não conclui nada.
 * É isso que transforma "prestar atenção" em habilidade em vez de sorte.
 */

import type {
  CheckMethod, CheckResult, SanityState, TellChannel,
} from './types.ts';
import { clamp, refresh, stageFor, type CapConditions } from './state.ts';
import { makeRng } from './rng.ts';

/** Que método enxerga que canal. */
const METODO_PARA_CANAL: Record<CheckMethod, readonly TellChannel[]> = {
  CONTAR:    ['CONTAGEM', 'TEMPO'],
  TOCAR:     ['VISUAL', 'CHEIRO'],
  COMPARAR:  ['TEMPO', 'VISUAL'],
  PERGUNTAR: ['SOM', 'CONTAGEM'],
};

export const CUSTO_BASE: Record<CheckMethod, { minutes: number; noise: number }> = {
  CONTAR:    { minutes: 5,  noise: 0 },
  TOCAR:     { minutes: 5,  noise: 2 },
  COMPARAR:  { minutes: 10, noise: 0 },
  PERGUNTAR: { minutes: 5,  noise: 4 },
};

/**
 * Chance de captar o tell com o método certo. Cai com o estágio — a mesma
 * ideia do resto do sistema: o instrumento de medir é feito da coisa medida.
 * Nunca vai a zero, senão RUPTURA viraria beco sem saída (regra 5).
 */
export function chanceDeCaptar(s: SanityState, casa: boolean): number {
  if (!casa) return 0.05;
  const confiabilidade = stageFor(s.sanity).uiReliability;
  return clamp(0.35 + 0.6 * confiabilidade, 0.35, 0.95);
}

export function verificarRealidade(
  s: SanityState,
  method: CheckMethod,
  cond: CapConditions = {},
): CheckResult {
  const active = s.activeIllusion;
  const custo = CUSTO_BASE[method];
  const rng = makeRng(s.daySeed, `check:${s.day}:${s.period}:${s.lastCheckTick}`);
  s.lastCheckTick += 1;

  // Sem nada no ar, verificar ainda vale: acalma e tira um pouco da dívida.
  if (!active) {
    s.realityDebt = clamp(s.realityDebt - 3, 0, 100);
    refresh(s, cond);
    return {
      method, conclusive: false, tellFound: false,
      text: 'Você confere e não tem nada pra conferir. Isso também é uma resposta.',
      debtRelief: 3, sanityDelta: 0, minutes: custo.minutes, noise: custo.noise,
    };
  }

  const casa = METODO_PARA_CANAL[method].includes(active.def.tellChannel);
  const achou = rng.chance(chanceDeCaptar(s, casa));

  const antes = s.sanity;
  let debtRelief = 0;

  if (achou) {
    debtRelief = 10;
    s.realityDebt = clamp(s.realityDebt - debtRelief, 0, 100);
    if (!s.seenTells.includes(active.def.id)) s.seenTells.push(active.def.id);
    // encontrar o próprio tell devolve chão
    s.sanity = clamp(s.sanity + 2, 0, s.softCap);
  } else {
    debtRelief = 2;
    s.realityDebt = clamp(s.realityDebt - debtRelief, 0, 100);
  }

  s.log.push({
    tick: s.tick, delta: s.sanity - antes,
    cause: `Checagem ${method}${achou ? ' (achou o tell)' : ''}`, absorbed: 0,
  });
  refresh(s, cond);

  return {
    method,
    conclusive: achou,
    tellFound: achou,
    text: achou
      ? active.def.tell
      : 'Você olha com atenção e não fecha nada. Continua sem saber.',
    debtRelief,
    sanityDelta: s.sanity - antes,
    minutes: custo.minutes,
    noise: custo.noise,
  };
}

/** Que métodos fazem sentido para o canal — para a UI oferecer sem entregar. */
export function metodosQueEnxergam(canal: TellChannel): CheckMethod[] {
  return (Object.keys(METODO_PARA_CANAL) as CheckMethod[])
    .filter((m) => METODO_PARA_CANAL[m].includes(canal));
}
