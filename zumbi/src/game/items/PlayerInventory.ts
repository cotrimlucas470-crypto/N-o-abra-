/**
 * O que o jogador carrega. Hoje: um recipiente "no corpo" (mãos e bolsos)
 * limitado por peso. A fase de inventário acrescenta mochila, roupas com
 * bolsos, item na mão e cansaço por carga — por isso já é uma lista de
 * recipientes, não um só.
 */
import { INVENTORY_TUNING } from '../config/PlayerTuning';
import type { ItemState } from './condition';
import { ItemContainer, type ItemContainerSave } from './ItemContainer';

export interface PlayerInventorySave {
  version: 1;
  containers: ItemContainerSave[];
}

export class PlayerInventory {
  readonly carried: ItemContainer;
  private readonly listeners = new Set<() => void>();

  constructor(capacity: number = INVENTORY_TUNING.carryCapacityKg) {
    this.carried = new ItemContainer('corpo', 'Mãos e bolsos', capacity);
  }

  get containers(): ItemContainer[] {
    return [this.carried];
  }

  get weight(): number {
    return this.containers.reduce((s, c) => s + c.weight, 0);
  }

  get capacity(): number {
    return this.containers.reduce((s, c) => s + c.capacity, 0);
  }

  /** Guarda onde couber; devolve quantas unidades entraram. */
  add(defId: string, count: number, st?: ItemState): number {
    let left = count;
    for (const c of this.containers) {
      if (left <= 0) break;
      left -= c.add(defId, left, st);
    }
    const added = count - left;
    if (added > 0) this.changed();
    return added;
  }

  take(container: ItemContainer, index: number, count: number) {
    const out = container.take(index, count);
    if (out) this.changed();
    return out;
  }

  /** Avisa a interface quando o conteúdo muda. Devolve a função para cancelar. */
  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private changed(): void {
    for (const fn of [...this.listeners]) fn();
  }

  serialize(): PlayerInventorySave {
    return { version: 1, containers: this.containers.map((c) => c.serialize()) };
  }

  restore(save: PlayerInventorySave): void {
    if (!save || save.version !== 1) return;
    for (const c of this.containers) {
      const s = save.containers.find((x) => x.id === c.id);
      if (s) c.restore(s);
    }
    this.changed();
  }
}
