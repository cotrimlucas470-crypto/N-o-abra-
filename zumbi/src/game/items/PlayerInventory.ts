/**
 * O que o jogador carrega: "mãos e bolsos" (sempre) + a mochila/bolsa
 * equipada (opcional), cada uma um recipiente limitado por peso.
 * A etapa de inventário acrescenta roupas com bolsos, item na mão e cansaço
 * por carga — por isso já é uma lista de recipientes, não um só.
 */
import { INVENTORY_TUNING } from '../config/PlayerTuning';
import { normalizeState, unitWeight, type ItemState } from './condition';
import { itemDef } from './ItemCatalog';
import { ItemContainer, type ItemContainerSave, type ItemStack } from './ItemContainer';

export interface PlayerInventorySave {
  version: 1;
  containers: ItemContainerSave[];
  /** Mochila equipada (o conteúdo vai em `containers`, id "mochila"). */
  bag?: { defId: string; st?: ItemState };
}

export const BAG_ID = 'mochila';

export class PlayerInventory {
  readonly carried: ItemContainer;
  private bagSlot: { defId: string; st?: ItemState; container: ItemContainer } | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(capacity: number = INVENTORY_TUNING.carryCapacityKg) {
    this.carried = new ItemContainer('corpo', 'Mãos e bolsos', capacity);
  }

  get bag(): Readonly<{ defId: string; st?: ItemState; container: ItemContainer }> | null {
    return this.bagSlot;
  }

  get containers(): ItemContainer[] {
    return this.bagSlot ? [this.carried, this.bagSlot.container] : [this.carried];
  }

  container(id: string): ItemContainer | null {
    return this.containers.find((c) => c.id === id) ?? null;
  }

  /** Peso total carregado (a própria mochila conta). */
  get weight(): number {
    const bagOwn = this.bagSlot ? (itemDef(this.bagSlot.defId) ? unitWeight(itemDef(this.bagSlot.defId)!, this.bagSlot.st) : 0) : 0;
    return this.containers.reduce((s, c) => s + c.weight, 0) + bagOwn;
  }

  get capacity(): number {
    return this.containers.reduce((s, c) => s + c.capacity, 0);
  }

  /** Guarda onde couber (bolsos primeiro, depois mochila); devolve quantas unidades entraram. */
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

  take(container: ItemContainer, index: number, count: number): ItemStack | null {
    const out = container.take(index, count);
    if (out) this.changed();
    return out;
  }

  /** Veste uma mochila/bolsa que está nos bolsos. */
  equipBag(from: ItemContainer, index: number): string | null {
    const s = from.stacks[index];
    const def = s ? itemDef(s.defId) : null;
    if (!s || !def?.bag) return 'Isso não é uma mochila.';
    if (this.bagSlot) return 'Tire a mochila atual primeiro.';
    const one = from.take(index, 1)!;
    const st = normalizeState(def, one.st);
    this.bagSlot = { defId: one.defId, ...(st ? { st } : {}), container: new ItemContainer(BAG_ID, def.name, def.bag.capacity) };
    this.changed();
    return null;
  }

  /** Tira a mochila (precisa estar vazia); ela volta para as mãos se couber. */
  unequipBag(): string | null {
    const b = this.bagSlot;
    if (!b) return 'Nenhuma mochila equipada.';
    if (!b.container.isEmpty) return 'Esvazie a mochila antes de tirar.';
    if (this.carried.add(b.defId, 1, b.st) === 0) return 'Sem espaço nas mãos para a mochila.';
    this.bagSlot = null;
    this.changed();
    return null;
  }

  /** Avisa a interface quando o conteúdo muda. Devolve a função para cancelar. */
  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Para quem mexe direto num recipiente (usar item, trocar estado). */
  changed(): void {
    for (const fn of [...this.listeners]) fn();
  }

  serialize(): PlayerInventorySave {
    const save: PlayerInventorySave = { version: 1, containers: this.containers.map((c) => c.serialize()) };
    if (this.bagSlot) save.bag = this.bagSlot.st ? { defId: this.bagSlot.defId, st: this.bagSlot.st } : { defId: this.bagSlot.defId };
    return save;
  }

  restore(save: PlayerInventorySave): void {
    if (!save || save.version !== 1) return;
    this.bagSlot = null;
    const bagDef = save.bag ? itemDef(save.bag.defId) : null;
    if (save.bag && bagDef?.bag) {
      const st = normalizeState(bagDef, save.bag.st);
      this.bagSlot = { defId: bagDef.id, ...(st ? { st } : {}), container: new ItemContainer(BAG_ID, bagDef.name, bagDef.bag.capacity) };
    }
    for (const c of this.containers) {
      const s = save.containers.find((x) => x.id === c.id);
      if (s) c.restore(s);
    }
    this.changed();
  }
}
