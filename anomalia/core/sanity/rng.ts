/**
 * RNG determinístico por dia — §0 regra 6.
 *
 * Todo sorteio do subsistema passa por aqui. Um `daySeed` reproduz o dia
 * inteiro, o que permite reabrir um bug relatado e assistir ao mesmo dia
 * acontecer de novo.
 *
 * Os canais existem para que subsistemas não se correlacionem: se ilusões e
 * vozes puxassem do mesmo fluxo, mudar a ordem de chamada de um mudaria o
 * resultado do outro, e o replay de um bug de vozes quebraria ao mexer em
 * ilusões. Cada canal tem seu próprio fluxo a partir do mesmo dia.
 */

export interface Rng {
  /** Próximo float em [0, 1). */
  next(): number;
  /** Inteiro em [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** true com probabilidade p. p <= 0 nunca, p >= 1 sempre. */
  chance(p: number): boolean;
  /** Um elemento qualquer. Lança se o array estiver vazio. */
  pick<T>(items: readonly T[]): T;
  /** Sorteio ponderado. Pesos <= 0 ficam de fora. Lança se nada for elegível. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T;
  /** Cópia embaralhada, sem tocar no original. */
  shuffle<T>(items: readonly T[]): T[];
}

/** FNV-1a de 32 bits — mistura o nome do canal na semente. */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: pequeno, rápido e com período suficiente para um dia de jogo. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(daySeed: number, channel: string): Rng {
  const next = mulberry32((daySeed ^ hashString(channel)) >>> 0);

  const rng: Rng = {
    next,
    int(maxExclusive) {
      if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) return 0;
      return Math.floor(next() * maxExclusive);
    },
    chance(p) {
      if (p <= 0) return false;
      if (p >= 1) return true;
      return next() < p;
    },
    pick(items) {
      if (items.length === 0) throw new Error('rng.pick: lista vazia');
      // noUncheckedIndexedAccess: o índice é sempre válido pelo guard acima
      return items[rng.int(items.length)] as (typeof items)[number];
    },
    weighted(items, weight) {
      let total = 0;
      for (const item of items) {
        const w = weight(item);
        if (w > 0) total += w;
      }
      if (total <= 0) throw new Error('rng.weighted: nenhum item com peso positivo');
      let roll = next() * total;
      for (const item of items) {
        const w = weight(item);
        if (w <= 0) continue;
        roll -= w;
        if (roll <= 0) return item;
      }
      // só chega aqui por erro de ponto flutuante na última fatia
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i] as T_of<typeof items>;
        if (weight(item) > 0) return item;
      }
      throw new Error('rng.weighted: inalcançável');
    },
    shuffle(items) {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        const a = out[i] as T_of<typeof out>;
        const b = out[j] as T_of<typeof out>;
        out[i] = b;
        out[j] = a;
      }
      return out;
    },
  };
  return rng;
}

/** Auxiliar de tipo: elemento de um array readonly. */
type T_of<A> = A extends readonly (infer U)[] ? U : never;
