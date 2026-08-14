/**
 * RNG do subsistema — §0 regra 6: todo RNG deriva de daySeed + encounterId.
 *
 * O gerador é o mesmo do SANITY, e isso é proposital: dois geradores seriam
 * duas verdades sobre o mesmo dia, e o replay de um bug que atravessa os dois
 * subsistemas deixaria de fechar.
 *
 * §9 escreve `new SeededRNG(seed ^ day)`. A forma de classe não tem canal, e
 * sem canal os sorteios se correlacionam: mudar quantas vezes a ecologia
 * puxou mudaria o resultado do encontro. `canal()` mantém a mesma semente
 * declarada no documento e acrescenta o nome do fluxo.
 */

import { makeRng, type Rng } from '../sanity/rng.ts';
import type { WeightedOutcome } from './types.ts';

export type { Rng };

/** Canal de encontro — §0 regra 6, literal. */
export function rngDoEncontro(daySeed: number, encounterId: string): Rng {
  return makeRng(daySeed, `enc:${encounterId}`);
}

/** Canal de ecologia — §9 usa `seed ^ day` como semente. */
export function rngDaEcologia(seed: number, day: number): Rng {
  return makeRng((seed ^ day) >>> 0, `ecologia:${day}`);
}

export function rngDoTick(daySeed: number, instanceId: string, tick: number): Rng {
  return makeRng(daySeed, `tick:${instanceId}:${tick}`);
}

/** `rng.sample` de §9: N elementos distintos. Nunca pede mais do que existe. */
export function sample<T>(rng: Rng, items: readonly T[], count: number): T[] {
  const n = Math.max(0, Math.min(count, items.length));
  return rng.shuffle(items).slice(0, n);
}

/** `roll` de §7: tabela de pesos que somam 1. */
export function roll(table: readonly WeightedOutcome[], rng: Rng): string {
  const escolhido = rng.weighted(table, (o) => o.r);
  return escolhido.out;
}

/** Rolagem de 1 a 100 — a rolagem única de §8. */
export function d100(rng: Rng): number {
  return rng.int(100) + 1;
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
