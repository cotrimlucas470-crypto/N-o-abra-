/**
 * Recipiente de itens (bolsos, mochila, armário, geladeira, porta-malas...).
 * Puro, sem Phaser.
 *
 * Limite por PESO (kg), como na vida real: não há "casas" de inventário.
 * Pilhas respeitam o `stack` de cada item e só juntam itens no MESMO estado
 * (duas garrafas lacradas juntam; uma lacrada e uma pela metade, não).
 * Tudo serializável para o save.
 */
import { normalizeState, sameState, unitWeight, type ItemState } from './condition';
import { itemDef } from './ItemCatalog';

export interface ItemStack {
  defId: string;
  count: number;
  /** Estado (condição, validade, doses...). Ausente = novo. */
  st?: ItemState;
}

export interface ItemContainerSave {
  id: string;
  stacks: ItemStack[];
}

/** Pesos são somados em gramas inteiras: nada de 0,1 + 0,2 = 0,30000000000000004 na interface. */
const grams = (kg: number) => Math.round(kg * 1000);

export class ItemContainer {
  readonly stacks: ItemStack[] = [];

  constructor(
    readonly id: string,
    readonly name: string,
    /** Capacidade em kg. */
    public capacity: number,
  ) {}

  /** Peso atual (kg). */
  get weight(): number {
    let g = 0;
    for (const s of this.stacks) {
      const def = itemDef(s.defId);
      if (def) g += grams(unitWeight(def, s.st)) * s.count;
    }
    return g / 1000;
  }

  get isEmpty(): boolean {
    return this.stacks.length === 0;
  }

  /** Quantas unidades deste item (neste estado) ainda cabem (pelo peso). */
  room(defId: string, st?: ItemState): number {
    const def = itemDef(defId);
    if (!def) return 0;
    const unit = grams(unitWeight(def, st));
    const free = grams(this.capacity) - grams(this.weight);
    if (unit <= 0) return Number.MAX_SAFE_INTEGER;
    return Math.max(0, Math.floor(free / unit));
  }

  /** Acrescenta até `count` unidades; devolve quantas entraram. */
  add(defId: string, count: number, st?: ItemState): number {
    const def = itemDef(defId);
    if (!def || count <= 0) return 0;
    const norm = normalizeState(def, st);
    let left = Math.min(count, this.room(defId, norm));
    const added = left;
    // Completa pilhas iguais (mesmo item, mesmo estado) antes de abrir novas.
    for (const s of this.stacks) {
      if (left <= 0) break;
      if (s.defId !== defId || s.count >= def.stack || !sameState(def, s.st, norm)) continue;
      const n = Math.min(left, def.stack - s.count);
      s.count += n;
      left -= n;
    }
    while (left > 0) {
      const n = Math.min(left, def.stack);
      this.stacks.push(norm ? { defId, count: n, st: { ...norm } } : { defId, count: n });
      left -= n;
    }
    return added;
  }

  /** Retira `count` unidades da pilha `index`; devolve o que saiu (ou null). */
  take(index: number, count: number): ItemStack | null {
    const s = this.stacks[index];
    if (!s || count <= 0) return null;
    const n = Math.min(count, s.count);
    s.count -= n;
    if (s.count <= 0) this.stacks.splice(index, 1);
    return s.st ? { defId: s.defId, count: n, st: { ...s.st } } : { defId: s.defId, count: n };
  }

  /** Troca o estado de UMA unidade da pilha (abrir garrafa, gastar dose...). Devolve o novo índice. */
  updateOne(index: number, st: ItemState | undefined): number {
    const s = this.stacks[index];
    if (!s) return -1;
    const def = itemDef(s.defId);
    if (!def) return -1;
    const one = this.take(index, 1);
    if (!one) return -1;
    const norm = normalizeState(def, st);
    // Volta para a mesma posição se a pilha continuar existindo; senão, entra onde couber.
    const target = this.stacks.findIndex((x) => x.defId === one.defId && x.count < def.stack && sameState(def, x.st, norm));
    if (target >= 0) {
      this.stacks[target]!.count++;
      return target;
    }
    const at = Math.min(index, this.stacks.length);
    this.stacks.splice(at, 0, norm ? { defId: one.defId, count: 1, st: { ...norm } } : { defId: one.defId, count: 1 });
    return at;
  }

  /** Total de unidades de um item (todas as pilhas). */
  countOf(defId: string): number {
    let n = 0;
    for (const s of this.stacks) if (s.defId === defId) n += s.count;
    return n;
  }

  serialize(): ItemContainerSave {
    return { id: this.id, stacks: this.stacks.map((s) => (s.st ? { defId: s.defId, count: s.count, st: { ...s.st } } : { defId: s.defId, count: s.count })) };
  }

  /** Restaura o conteúdo. Item que não existe mais no catálogo é ignorado (save antigo não quebra). */
  restore(save: ItemContainerSave): void {
    this.stacks.length = 0;
    for (const s of save.stacks ?? []) {
      const def = itemDef(s.defId);
      if (!def || !Number.isInteger(s.count) || s.count <= 0) continue;
      const st = normalizeState(def, s.st);
      this.stacks.push(st ? { defId: s.defId, count: s.count, st } : { defId: s.defId, count: s.count });
    }
  }
}
