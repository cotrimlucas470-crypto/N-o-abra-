/**
 * ANOMALIAS V9 — regras, não monstros.
 *
 * A diferença central: detecção deixa de ser linha de visão e vira acúmulo.
 * Você não é visto — você é somado. Cada coisa que você faz deixa rastro, e
 * o rastro entra numa conta que só sobe enquanto você estiver produzindo
 * mais do que ela esquece.
 *
 * Isso muda o que é jogável: não existe "sair do campo de visão". Existe
 * parar de emitir, e esperar o `decay` comer o que já entrou.
 */

import type {
  AnomalyDef, PlayerTrace, PlayerState, ContactResult, SanityState,
} from './types.ts';
import { clamp } from '../anomaly/rng.ts';
import type { Rng } from '../anomaly/rng.ts';
import { stageOf } from './sanity.ts';

/**
 * Um tique de acúmulo.
 *
 * O ponto cego é absoluto: rastro que cai em `blindTo` não entra na conta,
 * por mais forte que seja. É por isso que ele nunca é dito ao jogador — a
 * descoberta de que a coisa do porão não escuta metal vale mais do que
 * qualquer arma que o jogo pudesse dar.
 */
export function tick(a: AnomalyDef, heat: number, traces: readonly PlayerTrace[]): number {
  let gain = 0;
  for (const t of traces) {
    if (a.blindTo.includes(t.kind)) continue;
    gain += t.power * (a.senses[t.kind] ?? 0);
  }
  return Math.max(0, heat + gain - a.decay);
}

export function vaiEncostar(a: AnomalyDef, heat: number): boolean {
  return heat >= a.threshold;
}

/**
 * O que o jogador está emitindo agora.
 *
 * Note que PRESENCA nunca é zero: parar de se mexer, apagar a lanterna e
 * largar tudo que é de ferro ainda deixa 3. Não existe desaparecer — existe
 * demorar mais pra ser somado.
 */
export function emitTraces(p: PlayerState): PlayerTrace[] {
  return [
    { kind: 'SOM'      as const, power: p.moveSpeed * 2 + (p.radioOn ? 6 : 0) },
    { kind: 'ODOR'     as const, power: (p.bleeding ? 9 : 0) + p.daysUnwashed },
    { kind: 'VISUAL'   as const, power: p.flashlightOn ? 8 : 0 },
    { kind: 'METAL'    as const, power: p.inventory.reduce((n, i) => n + i.metalNoise, 0) },
    { kind: 'PRESENCA' as const, power: p.marked ? 12 : 3 },
  ].filter((t) => t.power > 0);
}

// ---------- contato ----------

export const TETO_DE_APRENDIZADO = 0.45;
export const PASSO_DE_APRENDIZADO = 0.15;

/**
 * Contato: uma rolagem, sem combate.
 *
 * A lâmina não mata nada — ela entra como `delaySec`, que compra segundos
 * de fuga. E a memória é o que faz a casa endurecer: a mesma tática pela
 * quarta vez já perdeu os 45 pontos percentuais inteiros que ela podia
 * perder, e o que sobra é a rolagem crua.
 */
export function contact(
  a: AnomalyDef,
  p: PlayerState,
  tactic: string,
  rng: Rng,
): ContactResult {
  const used = a.memory[tactic] ?? 0;
  const learned = Math.min(TETO_DE_APRENDIZADO, used * PASSO_DE_APRENDIZADO);
  const delay = p.weapon ? p.weapon.delaySec : 0;
  const escape = clamp(0.55 + delay * 0.05 - learned - p.overload * 0.1, 0.05, 0.9);

  a.memory[tactic] = used + 1;
  const r = rng.next();
  if (r < escape)        return { out: 'FUGA', cost: 'ferimento_leve' };
  if (r < escape + 0.25) return { out: 'FUGA_CARA', cost: 'perdeu_mochila', marked: true };
  if (r < escape + 0.35) return { out: 'MARCADO', marked: true };
  return { out: 'MORTE' };
}

// ---------- o cruzamento ----------

export interface Encontro {
  def: AnomalyDef;
  fake: boolean;
}

/**
 * Quando não há nada lá, a cabeça constrói.
 *
 * O fantasma vem com os mesmos avisos da coisa real, e é isso que torna a
 * Checagem de Realidade uma decisão: gastar 8 segundos e 4 de estresse pra
 * saber, ou agir sem saber. Um jogo que marcasse o falso na tela não teria
 * feito nada.
 */
export function spawnEncounter(
  s: SanityState,
  real: AnomalyDef | null,
  rng: Rng,
  pickGhost: () => AnomalyDef,
): Encontro | null {
  const [, , illusion] = stageOf(s);
  if (!real && rng.next() < illusion * 0.6) {
    return { def: pickGhost(), fake: true };
  }
  return real ? { def: real, fake: false } : null;
}

export const CHECAGEM = {
  segundos: 8,
  estresse: 4,
  acerto: 0.8,
} as const;

export interface ResultadoDaChecagem {
  respondeu: 'REAL' | 'FALSO';
  correto: boolean;
  segundos: number;
  estresse: number;
}

/**
 * Checagem de Realidade: 80% de acerto.
 *
 * Os 20% restantes não devolvem "não sei" — devolvem a resposta errada com
 * a mesma cara de certeza. Uma checagem que avisasse quando falhou seria
 * uma checagem de 100%.
 */
export function checarRealidade(e: Encontro, rng: Rng): ResultadoDaChecagem {
  const correto = rng.next() < CHECAGEM.acerto;
  const verdade: 'REAL' | 'FALSO' = e.fake ? 'FALSO' : 'REAL';
  const outra: 'REAL' | 'FALSO' = e.fake ? 'REAL' : 'FALSO';
  return {
    respondeu: correto ? verdade : outra,
    correto,
    segundos: CHECAGEM.segundos,
    estresse: CHECAGEM.estresse,
  };
}
