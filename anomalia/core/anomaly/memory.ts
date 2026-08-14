/**
 * Memória — §11. Ela aprende.
 *
 * O bloco de §11 devolve ora uma lista de sentidos, ora um objeto com
 * `persistence`. Isso não fecha em tipo nenhum, e a razão de não fechar é que
 * são dois efeitos diferentes: mexer no peso de um estímulo e mexer em quanto
 * tempo ela insiste. `Adaptation` carrega os dois, e `adapt` devolve sempre a
 * mesma coisa.
 *
 * A regra que o documento sublinha e que está implementada literalmente:
 * **isso nunca é dito ao jogador.** Não existe função aqui que produza texto.
 * Ele só percebe que o truque parou de funcionar.
 */

import type {
  Adaptation, AnomalyDef, AnomalyMemory, SenseProfile, Stimulus,
} from './types.ts';
import { clamp } from './rng.ts';

/** §11: adaptação sobe +8 por fuga repetida com a mesma tática. */
export const PASSO_DE_ADAPTACAO = 8;

/** §11: acima de 60, o peso do estímulo que contraria a tática sobe +0.3. */
export const LIMIAR_DE_ADAPTACAO = 60;
export const GANHO_DE_PESO = 0.3;

export function criarMemoria(anomalyId: string): AnomalyMemory {
  return {
    anomalyId,
    playerEscapes: {},
    adaptation: 0,
    markedUntilDay: -1,
    perdasPorLocal: {},
  };
}

export function topKey(escapes: Record<string, number>): string | null {
  let melhor: string | null = null;
  let max = 0;
  for (const [k, v] of Object.entries(escapes)) {
    if (v > max) { max = v; melhor = k; }
  }
  return melhor;
}

/**
 * Uma fuga bem-sucedida. Repetir a mesma tática é o que ensina; variar não.
 */
export function registrarFuga(mem: AnomalyMemory, optionId: string): void {
  const antes = topKey(mem.playerEscapes);
  mem.playerEscapes[optionId] = (mem.playerEscapes[optionId] ?? 0) + 1;
  if (antes === optionId) {
    mem.adaptation = clamp(mem.adaptation + PASSO_DE_ADAPTACAO, 0, 100);
  }
}

function boost(stimulus: Stimulus, delta: number): Adaptation {
  return { senseBoosts: [{ stimulus, delta }], persistenceDelta: 0 };
}

export function adapt(mem: AnomalyMemory): Adaptation {
  const favorite = topKey(mem.playerEscapes);
  // se o jogador sempre fica imóvel, ela passa a pesar CHEIRO
  if (favorite === 'OPT_IMOVEL')  return boost('CHEIRO', 0.3);
  if (favorite === 'OPT_CORRER')  return boost('SOM', 0.25);
  if (favorite === 'OPT_TRANCAR') return { senseBoosts: [], persistenceDelta: 6 };
  return { senseBoosts: [], persistenceDelta: 0 };
}

/**
 * A adaptação aplicada à definição. Devolve cópia: o catálogo é imutável e
 * duas instâncias da mesma anomalia em locais diferentes podem ter aprendido
 * coisas diferentes.
 *
 * O ganho de peso só entra acima do limiar de §11. Abaixo dele a anomalia
 * está aprendendo e ainda não mudou de comportamento — que é o que faz o
 * truque funcionar por um tempo antes de parar.
 */
export function aplicarAdaptacao(def: AnomalyDef, mem: AnomalyMemory): AnomalyDef {
  if (mem.adaptation < LIMIAR_DE_ADAPTACAO) return def;

  const efeito = adapt(mem);
  const senses: SenseProfile[] = def.senses.map((s) => ({ ...s }));

  for (const b of efeito.senseBoosts) {
    if (def.blindTo.includes(b.stimulus)) continue;   // cega é cega
    const alvo = senses.find((s) => s.stimulus === b.stimulus);
    if (alvo) {
      alvo.weight = clamp(alvo.weight + GANHO_DE_PESO, 0, 1);
    } else {
      // ela não tinha esse sentido e passa a ter, fraco e de perto
      senses.push({
        stimulus: b.stimulus,
        weight: clamp(GANHO_DE_PESO, 0, 1),
        threshold: 25,
        range: 18,
        decay: 0.7,
      });
    }
  }

  return {
    ...def,
    senses,
    persistence: def.persistence + efeito.persistenceDelta,
  };
}

/** §9 — perdeu o jogador 3 vezes no mesmo local: migra no dia seguinte. */
export const PERDAS_ATE_MIGRAR = 3;

export function registrarPerda(mem: AnomalyMemory, locationId: string): void {
  mem.perdasPorLocal[locationId] = (mem.perdasPorLocal[locationId] ?? 0) + 1;
}

export function vaiMigrarAmanha(mem: AnomalyMemory, locationId: string): boolean {
  return (mem.perdasPorLocal[locationId] ?? 0) >= PERDAS_ATE_MIGRAR;
}
