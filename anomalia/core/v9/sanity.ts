/**
 * SANIDADE V9 — percepção corrompida.
 *
 * A diferença para o V7 não é de número, é de lugar: lá a sanidade era um
 * medidor que o jogo consultava; aqui ela é o vidro por onde tudo passa.
 * Nada chega ao jogador sem atravessar `perceive()`.
 *
 * Os quatro medidores são ocultos de propósito. `sanity` é a verdade,
 * `stressBuffer` é o escudo que gasta primeiro, `paranoia` enviesa a
 * leitura, e `realityDebt` é a conta que a mentira acumula e cobra em cena.
 */

import type { SanityState, Stage, StageRow, Scar } from './types.ts';
import { clamp } from '../anomaly/rng.ts';
import type { Rng } from '../anomaly/rng.ts';

/* O documento escreve `rng: () => number`. O core inteiro já passa o Rng
   com canal — que é a regra de determinismo do §0 — então aqui ele entra
   como está e `rng()` do documento vira `rng.next()`. Trocar isso por uma
   função solta seria abrir uma segunda verdade sobre o mesmo dia. */

export const RUPTURA_ROW: StageRow = ['RUPTURA', 0, 1.00, 0.90];

export const STAGES: readonly StageRow[] = [
  // stage, min, illusionChance, uiLieChance
  ['LUCIDO',    90, 0.00, 0.00],
  ['TENSO',     70, 0.08, 0.02],
  ['FISSURADO', 45, 0.22, 0.12],
  ['RACHADO',   20, 0.40, 0.28],
  ['DESFEITO',   1, 0.65, 0.50],
  ['RUPTURA',    0, 1.00, 0.90],
] as const;

export function estadoInicial(): SanityState {
  return {
    sanity: 100, stressBuffer: 30, paranoia: 0,
    realityDebt: 0, withdrawal: 0, scars: [], nightsLow: 0,
  };
}

/**
 * A sanidade efetiva desconta a dívida e a abstinência.
 *
 * É por isso que curar a barra pode não devolver a lucidez: quem passou a
 * semana no amarelo carrega 35 de withdrawal, e 35 × 0,2 são 7 pontos que
 * a dose seguinte não compra de volta.
 */
export function sanidadeEfetiva(s: SanityState): number {
  return s.sanity - s.realityDebt * 0.3 - s.withdrawal * 0.2;
}

export function stageOf(s: SanityState): StageRow {
  const eff = sanidadeEfetiva(s);
  return STAGES.find(([, min]) => eff >= min) ?? RUPTURA_ROW;
}

export function stageName(s: SanityState): Stage {
  return stageOf(s)[0];
}

/**
 * Perder sanidade.
 *
 * O escudo absorve primeiro e só o que sobra morde a verdade — mas a
 * paranoia sobe com o golpe inteiro, absorvido ou não. É a diferença entre
 * aguentar o susto e não ter sentido ele.
 */
export function applyLoss(s: SanityState, amount: number, tag: string): void {
  if (amount <= 0) return;
  const absorbed = Math.min(s.stressBuffer, amount);
  s.stressBuffer = clamp(s.stressBuffer - absorbed, 0, 30);
  s.sanity = clamp(s.sanity - (amount - absorbed), 0, 100);
  s.paranoia = clamp(s.paranoia + amount * 0.4, 0, 100);
  if (tag === 'ANOMALY_CONTACT') {
    s.realityDebt = clamp(s.realityDebt + amount * 0.6, 0, 100);
  }
}

// ---------- o filtro ----------

/**
 * O número mente para o lado que a paranoia empurra.
 *
 * O deslocamento é proporcional ao próprio valor (30%), então 4 latas viram
 * 3 ou 5 e 40 latas viram 28 ou 52: o erro cresce junto com o que está em
 * jogo, e é sempre plausível. Mentira que não é plausível não engana.
 */
export function corrupt<T>(v: T, paranoia: number, rng: Rng): T {
  if (typeof v === 'number') {
    const dir = rng.next() < 0.5 ? -1 : 1;
    const drift = (paranoia / 100) * dir * Math.ceil(Math.abs(v) * 0.3);
    return (v + drift) as unknown as T;
  }
  return v;
}

export interface Percebido<T> {
  valor: T;
  /** o que aconteceu — pro jogo saber se deve mostrar tell, não pro jogador */
  tipo: 'VERDADE' | 'UI_MENTE' | 'ILUSAO';
}

/**
 * Tudo passa por aqui.
 *
 * A ordem importa: a mentira de interface é checada antes da ilusão porque
 * ela é a mais barata de produzir e a mais difícil de perceber — um número
 * errado não tem tell nenhum, enquanto uma alucinação sempre deixa rastro.
 */
export function perceive<T>(
  truth: T,
  s: SanityState,
  rng: Rng,
  hallucinate?: (t: T, s: SanityState, rng: Rng) => T,
): Percebido<T> {
  const [, , illusion, uiLie] = stageOf(s);
  if (rng.next() < uiLie) return { valor: corrupt(truth, s.paranoia, rng), tipo: 'UI_MENTE' };
  if (rng.next() < illusion && hallucinate) {
    return { valor: hallucinate(truth, s, rng), tipo: 'ILUSAO' };
  }
  return { valor: truth, tipo: 'VERDADE' };
}

// ---------- remédios ----------

export interface MedDef {
  heal: number;
  tolCost: number;
  side: string;
}

export const MEDS = {
  CALMANTE:    { heal: 18, tolCost: 12, side: 'sono_pesado' },        // dorme, não ouve batidas
  ESTIMULANTE: { heal: -5, tolCost: 20, side: 'paranoia_up' },        // energia, mente pior
  CHA_RAIZ:    { heal:  8, tolCost:  3, side: 'nenhum' },
  AMARELO:     { heal: 40, tolCost: 35, side: 'ilusao_garantida' },   // o remédio que mente
} as const satisfies Record<string, MedDef>;

export type MedId = keyof typeof MEDS;

/**
 * Tomar remédio.
 *
 * Cada dose vale menos que a anterior porque `withdrawal` divide o efeito, e
 * cada dose empurra `withdrawal` pra cima. O amarelo é o extremo do desenho:
 * cura 40 de uma vez e cobra 35 de tolerância, então quem se acostuma com
 * ele chega no ponto em que a dose inteira não levanta 15 — e aí o corpo
 * ainda começa a somar dívida sozinho.
 */
export function takeMed(s: SanityState, id: MedId): string {
  const m = MEDS[id];
  const eff = m.heal * (1 - s.withdrawal / 130);
  s.sanity = clamp(s.sanity + eff, 0, 100);
  s.withdrawal = clamp(s.withdrawal + m.tolCost, 0, 100);
  if (s.withdrawal > 70) s.realityDebt = clamp(s.realityDebt + 10, 0, 100);
  if (m.side === 'paranoia_up') s.paranoia = clamp(s.paranoia + 12, 0, 100);
  return m.side;
}

// ---------- sequelas ----------

export const NOITES_PARA_SEQUELA = 3;
export const LIMIAR_DE_SEQUELA = 20;

const ORDEM_DAS_SEQUELAS: readonly Scar[] = ['TREMOR', 'SURDEZ_PARCIAL', 'CEGUEIRA_NOTURNA'];

/**
 * Passar a noite.
 *
 * A sequela não vem de um susto, vem de ficar. Três noites abaixo de 20 e
 * alguma coisa trava pra sempre — e "pra sempre" é literal: nada no V9
 * remove uma sequela. A contagem zera se você passar uma noite acima.
 */
export function passarNoite(s: SanityState): Scar | null {
  if (sanidadeEfetiva(s) < LIMIAR_DE_SEQUELA) {
    s.nightsLow += 1;
  } else {
    s.nightsLow = 0;
    return null;
  }
  if (s.nightsLow < NOITES_PARA_SEQUELA) return null;
  const nova = ORDEM_DAS_SEQUELAS.find((x) => !s.scars.includes(x));
  if (!nova) return null;
  s.scars.push(nova);
  s.nightsLow = 0;
  return nova;
}
