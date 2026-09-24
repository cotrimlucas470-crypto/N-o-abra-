/**
 * Recipiente de itens (bolsos, mochila, armário, porta-malas...). Puro, sem Phaser.
 *
 * Limite por PESO (kg), como na vida real: não há "casas" de inventário.
 * Pilhas respeitam o `stack` de cada item. Tudo serializável para o save.
 */
import { itemDef } from './ItemCatalog';

export interface ItemStack {
  defId: string;
  count: number;
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
    for (const s of this.stacks) g += grams(itemDef(s.defId)?.weight ?? 0) * s.count;
    return g / 1000;
  }

  get isEmpty(): boolean {
    return this.stacks.length === 0;
  }

  /** Quantas unidades deste item ainda cabem (pelo peso). */
  room(defId: string): number {
    const def = itemDef(defId);
    if (!def) return 0;
    const unit = grams(def.weight);
    const free = grams(this.capacity) - grams(this.weight);
    if (unit <= 0) return Number.MAX_SAFE_INTEGER;
    return Math.max(0, Math.floor(free / unit));
  }

  /** Acrescenta até `count` unidades; devolve quantas entraram. */
  add(defId: string, count: number): number {
    const def = itemDef(defId);
    if (!def || count <= 0) return 0;
    let left = Math.min(count, this.room(defId));
    const added = left;
    // Completa pilhas existentes antes de abrir novas.
    for (const s of this.stacks) {
      if (left <= 0) break;
      if (s.defId !== defId || s.count >= def.stack) continue;
      const n = Math.min(left, def.stack - s.count);
      s.count += n;
      left -= n;
    }
    while (left > 0) {
      const n = Math.min(left, def.stack);
      this.stacks.push({ defId, count: n });
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
    return { defId: s.defId, count: n };
  }

  /** Total de unidades de um item (todas as pilhas). */
  countOf(defId: string): number {
    let n = 0;
    for (const s of this.stacks) if (s.defId === defId) n += s.count;
    return n;
  }

  serialize(): ItemContainerSave {
    return { id: this.id, stacks: this.stacks.map((s) => ({ ...s })) };
  }

  /** Restaura o conteúdo. Item que não existe mais no catálogo é ignorado (save antigo não quebra). */
  restore(save: ItemContainerSave): void {
    this.stacks.length = 0;
    for (const s of save.stacks ?? []) {
      if (itemDef(s.defId) && Number.isInteger(s.count) && s.count > 0) this.stacks.push({ defId: s.defId, count: s.count });
    }
  }
}
