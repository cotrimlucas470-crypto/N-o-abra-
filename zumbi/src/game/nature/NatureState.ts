/**
 * Estado dos recursos naturais (puro): quanto cada árvore/montinho tem AGORA.
 *
 * Não há "tick" varrendo o mapa: a quantidade é calculada quando alguém olha,
 * a partir da última colheita e do tempo que passou (dias de jogo). Custa zero
 * para árvores longe do jogador e dá o mesmo resultado para quem volta depois.
 * Estado inicial sorteado por semente + id (umas árvores já foram colhidas).
 */
import type { SandboxSettings } from '../config/Sandbox';
import { hashString } from '../core/Random';
import type { HarvestDef } from './NatureCatalog';

export type NatureSettings = SandboxSettings['nature'];
export const DEFAULT_NATURE: NatureSettings = { fruitRegrowDays: 3, density: 1 };

export interface NatureSave {
  /** id → [quantidade na última colheita, dia da última colheita]. */
  harvested: Record<string, [number, number]>;
}

export class NatureState {
  private readonly touched = new Map<string, { n: number; t: number }>();

  constructor(
    private readonly seed: number,
    private readonly settings: NatureSettings = DEFAULT_NATURE,
  ) {}

  /** Dias para repor uma unidade (null = não repõe). */
  regrowDays(def: HarvestDef): number | null {
    return def.regrow === null ? null : def.regrow * this.settings.fruitRegrowDays;
  }

  private initial(id: string, def: HarvestDef): number {
    const r = hashString(`${this.seed}:natureza:${id}`) / 4294967296;
    // 30% a 100% do máximo: umas carregadas, outras já beliscadas.
    return Math.round(def.max * (0.3 + 0.7 * r));
  }

  count(id: string, def: HarvestDef, now: number): number {
    const t = this.touched.get(id);
    if (!t) return this.initial(id, def);
    const days = this.regrowDays(def);
    if (days === null || days <= 0) return t.n;
    return Math.min(def.max, t.n + Math.floor(Math.max(0, now - t.t) / days));
  }

  /** Colhe até `amount`; devolve quanto saiu. */
  harvest(id: string, def: HarvestDef, now: number, amount: number): number {
    const have = this.count(id, def, now);
    const take = Math.max(0, Math.min(have, amount));
    if (take <= 0) return 0;
    const prev = this.touched.get(id);
    const days = this.regrowDays(def);
    // Guarda o progresso parcial da próxima unidade (colher não "zera o relógio").
    let t = now;
    if (prev && days && days > 0) {
      const regrown = Math.floor(Math.max(0, now - prev.t) / days);
      t = prev.t + regrown * days;
      if (have >= def.max) t = now;
    }
    this.touched.set(id, { n: have - take, t });
    return take;
  }

  /** Dias até a próxima unidade (para o aviso "voltam em ~2 dias"). */
  nextIn(id: string, def: HarvestDef, now: number): number | null {
    const days = this.regrowDays(def);
    if (days === null) return null;
    const t = this.touched.get(id);
    if (!t) return days;
    return Math.max(0, days - ((now - t.t) % days));
  }

  serialize(): NatureSave {
    const harvested: NatureSave['harvested'] = {};
    for (const [id, v] of this.touched) harvested[id] = [v.n, Math.round(v.t * 1000) / 1000];
    return { harvested };
  }

  restore(save: NatureSave | undefined): void {
    if (!save) return;
    for (const [id, [n, t]] of Object.entries(save.harvested ?? {})) {
      if (Number.isFinite(n) && Number.isFinite(t)) this.touched.set(id, { n: Math.max(0, Math.round(n)), t });
    }
  }
}
