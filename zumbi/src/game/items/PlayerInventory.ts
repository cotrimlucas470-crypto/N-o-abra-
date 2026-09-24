/**
 * O que o jogador carrega: "mãos e bolsos" (sempre), a mochila/bolsa vestida
 * (opcional), as ROUPAS vestidas (uma por parte do corpo) e o item NA MÃO
 * (arma, ferramenta, lanterna). Puro, sem Phaser.
 *
 * - Bolsos das roupas vestidas aumentam o espaço de "mãos e bolsos".
 * - Roupa vestida pesa menos (30%): o corpo carrega melhor o que veste.
 * - A mochila bem ajustada "tira" parte do peso do que está dentro dela
 *   (`bag.reduction`), o que alivia o cansaço por carga.
 */
import { INVENTORY_TUNING } from '../config/PlayerTuning';
import { condition, isBroken, normalizeState, unitWeight, wearFactors, type ItemState } from './condition';
import { itemDef } from './ItemCatalog';
import { ItemContainer, type ItemContainerSave, type ItemStack } from './ItemContainer';
import type { ItemDef, WearSlot } from './ItemTypes';

export interface EquippedItem {
  defId: string;
  st?: ItemState;
}

export interface PlayerInventorySave {
  version: 1;
  containers: ItemContainerSave[];
  /** Mochila equipada (o conteúdo vai em `containers`, id "mochila"). */
  bag?: { defId: string; st?: ItemState };
  worn?: Partial<Record<WearSlot, EquippedItem>>;
  hand?: EquippedItem;
}

export const BAG_ID = 'mochila';
/** Peso que a roupa vestida "pesa" (fração). */
const WORN_WEIGHT = 0.3;

export const WEAR_SLOTS: readonly WearSlot[] = ['cabeca', 'rosto', 'pescoco', 'tronco', 'tronco-externo', 'maos', 'pernas', 'pes'];

export const SLOT_LABEL: Record<WearSlot, string> = {
  cabeca: 'Cabeça',
  rosto: 'Rosto',
  pescoco: 'Pescoço',
  tronco: 'Tronco',
  'tronco-externo': 'Agasalho',
  maos: 'Mãos',
  pernas: 'Pernas',
  pes: 'Pés',
};

const copy = (e: EquippedItem): EquippedItem => (e.st ? { defId: e.defId, st: { ...e.st } } : { defId: e.defId });

export class PlayerInventory {
  readonly carried: ItemContainer;
  private bagSlot: { defId: string; st?: ItemState; container: ItemContainer } | null = null;
  private readonly wornSlots = new Map<WearSlot, EquippedItem>();
  private handSlot: EquippedItem | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly baseCapacity: number = INVENTORY_TUNING.carryCapacityKg) {
    this.carried = new ItemContainer('corpo', 'Mãos e bolsos', baseCapacity);
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

  // ---------------------------------------------------------------- peso

  /** Peso total carregado (mochila, roupa vestida e item na mão contam). */
  get weight(): number {
    let w = this.containers.reduce((s, c) => s + c.weight, 0) + this.equipWeight();
    if (this.bagSlot) w += this.defWeight(this.bagSlot.defId, this.bagSlot.st);
    return Math.round(w * 1000) / 1000;
  }

  /**
   * Peso que o corpo SENTE (cansaço, velocidade): a mochila bem ajustada
   * alivia parte do que está dentro; mochila rasgada/gasta alivia menos.
   */
  get effectiveLoad(): number {
    let w = this.carried.weight + this.equipWeight();
    const b = this.bagSlot;
    if (b) {
      const def = itemDef(b.defId);
      const red = (def?.bag?.reduction ?? 0) * (0.5 + 0.5 * condition(b.st));
      w += b.container.weight * (1 - red) + this.defWeight(b.defId, b.st);
    }
    return w;
  }

  get capacity(): number {
    return this.containers.reduce((s, c) => s + c.capacity, 0);
  }

  private defWeight(defId: string, st?: ItemState): number {
    const d = itemDef(defId);
    return d ? unitWeight(d, st) : 0;
  }

  private equipWeight(): number {
    let w = 0;
    for (const e of this.wornSlots.values()) w += this.defWeight(e.defId, e.st) * WORN_WEIGHT;
    if (this.handSlot) w += this.defWeight(this.handSlot.defId, this.handSlot.st);
    return w;
  }

  /** Bolsos das roupas aumentam "mãos e bolsos". */
  private refreshCapacity(): void {
    let pockets = 0;
    for (const e of this.wornSlots.values()) {
      const d = itemDef(e.defId);
      if (d?.wear?.pockets && !isBroken(d, e.st)) pockets += d.wear.pockets;
    }
    this.carried.capacity = this.baseCapacity + pockets;
  }

  // ---------------------------------------------------------------- guardar e tirar

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

  /** Move uma pilha entre os bolsos e a mochila. Devolve quantas unidades passaram. */
  moveBetween(from: ItemContainer, index: number, to: ItemContainer, count = Infinity): number {
    const s = from.stacks[index];
    if (!s || from === to) return 0;
    const n = Math.min(count, s.count, to.room(s.defId, s.st));
    if (n <= 0) return 0;
    const out = from.take(index, n)!;
    to.add(out.defId, out.count, out.st);
    this.changed();
    return n;
  }

  // ---------------------------------------------------------------- mochila

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

  // ---------------------------------------------------------------- roupas

  get worn(): ReadonlyMap<WearSlot, EquippedItem> {
    return this.wornSlots;
  }

  wornIn(slot: WearSlot): EquippedItem | null {
    return this.wornSlots.get(slot) ?? null;
  }

  /** Veste uma roupa (troca a que estiver na mesma parte do corpo). */
  wear(from: ItemContainer, index: number): string | null {
    const s = from.stacks[index];
    const def = s ? itemDef(s.defId) : null;
    if (!s || !def?.wear) return 'Isso não se veste.';
    const slot = def.wear.slot;
    const old = this.wornSlots.get(slot);
    const one = from.take(index, 1)!;
    if (old) {
      // A roupa que sai vai para onde a nova estava (ou qualquer lugar com espaço).
      if (from.add(old.defId, 1, old.st) === 0 && this.add(old.defId, 1, old.st) === 0) {
        from.add(one.defId, 1, one.st);
        return 'Sem espaço para a roupa que você tiraria.';
      }
    }
    const st = normalizeState(def, one.st);
    this.wornSlots.set(slot, st ? { defId: def.id, st } : { defId: def.id });
    this.refreshCapacity();
    this.changed();
    return null;
  }

  /** Tira a roupa de uma parte do corpo; vai para os bolsos/mochila. */
  takeOff(slot: WearSlot): string | null {
    const e = this.wornSlots.get(slot);
    if (!e) return 'Nada vestido aí.';
    const def = itemDef(e.defId);
    // Os bolsos da roupa somem: o que não couber mais, fica impossível. Confere antes.
    const pockets = def?.wear?.pockets ?? 0;
    if (pockets > 0 && this.carried.weight > this.carried.capacity - pockets + 1e-6) return 'Esvazie os bolsos dessa roupa antes.';
    this.wornSlots.delete(slot);
    this.refreshCapacity();
    if (this.add(e.defId, 1, e.st) === 0) {
      this.wornSlots.set(slot, e);
      this.refreshCapacity();
      return 'Sem espaço para guardar a roupa.';
    }
    this.changed();
    return null;
  }

  /** Muda o estado de uma roupa vestida (molhou, rasgou, sujou de sangue). */
  updateWorn(slot: WearSlot, st: ItemState | undefined): void {
    const e = this.wornSlots.get(slot);
    const def = e ? itemDef(e.defId) : null;
    if (!e || !def) return;
    const n = normalizeState(def, st);
    this.wornSlots.set(slot, n ? { defId: e.defId, st: n } : { defId: e.defId });
    this.refreshCapacity();
  }

  /** Veste direto (roupa inicial do personagem; restauração). */
  putOn(defId: string, st?: ItemState): boolean {
    const def = itemDef(defId);
    if (!def?.wear) return false;
    const n = normalizeState(def, st);
    this.wornSlots.set(def.wear.slot, n ? { defId, st: n } : { defId });
    this.refreshCapacity();
    this.changed();
    return true;
  }

  /** Isolamento térmico total das roupas vestidas (molhada/rasgada rende menos). */
  insulation(): number {
    let sum = 0;
    for (const e of this.wornSlots.values()) {
      const d = itemDef(e.defId);
      if (d) sum += wearFactors(d, e.st).insulation;
    }
    return sum;
  }

  /** Proteção (mordida, arranhão) da roupa numa parte do corpo. Várias camadas somam, sem passar de 95%. */
  protection(slots: readonly WearSlot[]): { bite: number; scratch: number } {
    let bite = 0;
    let scratch = 0;
    for (const slot of slots) {
      const e = this.wornSlots.get(slot);
      const d = e ? itemDef(e.defId) : null;
      if (!e || !d) continue;
      const f = wearFactors(d, e.st);
      bite = 1 - (1 - bite) * (1 - f.bite);
      scratch = 1 - (1 - scratch) * (1 - f.scratch);
    }
    return { bite: Math.min(0.95, bite), scratch: Math.min(0.95, scratch) };
  }

  /** Veste algo com a etiqueta (ex.: 'impermeavel'). */
  wearsTag(tag: string): boolean {
    for (const e of this.wornSlots.values()) if (itemDef(e.defId)?.tags.includes(tag)) return true;
    return false;
  }

  // ---------------------------------------------------------------- mão

  get hand(): Readonly<EquippedItem> | null {
    return this.handSlot;
  }

  get handDef(): ItemDef | null {
    return this.handSlot ? itemDef(this.handSlot.defId) : null;
  }

  /** Segura um item (arma, ferramenta, lanterna). O que estava na mão volta para onde ele estava. */
  equipHand(from: ItemContainer, index: number): string | null {
    const s = from.stacks[index];
    const def = s ? itemDef(s.defId) : null;
    if (!s || !def) return 'Item inválido.';
    const old = this.handSlot;
    const one = from.take(index, 1)!;
    if (old && from.add(old.defId, 1, old.st) === 0 && this.add(old.defId, 1, old.st) === 0) {
      from.add(one.defId, 1, one.st);
      return 'Sem espaço para guardar o que está na mão.';
    }
    const st = normalizeState(def, one.st);
    this.handSlot = st ? { defId: def.id, st } : { defId: def.id };
    this.changed();
    return null;
  }

  unequipHand(): string | null {
    const h = this.handSlot;
    if (!h) return 'Mãos vazias.';
    this.handSlot = null;
    if (this.add(h.defId, 1, h.st) === 0) {
      this.handSlot = h;
      return 'Sem espaço para guardar.';
    }
    this.changed();
    return null;
  }

  /** Muda o estado do item na mão (desgaste, munição, carga). null = o item acabou/quebrou e some. */
  updateHand(st: ItemState | undefined | null): void {
    const h = this.handSlot;
    if (!h) return;
    if (st === null) {
      this.handSlot = null;
    } else {
      const def = itemDef(h.defId);
      const n = def ? normalizeState(def, st) : undefined;
      this.handSlot = n ? { defId: h.defId, st: n } : { defId: h.defId };
    }
    this.changed();
  }

  // ---------------------------------------------------------------- consultas

  /** Todas as pilhas carregadas (bolsos + mochila), com onde estão. */
  *stacks(): Generator<{ container: ItemContainer; index: number; stack: ItemStack; def: ItemDef }> {
    for (const c of this.containers) {
      for (let i = 0; i < c.stacks.length; i++) {
        const s = c.stacks[i]!;
        const def = itemDef(s.defId);
        if (def) yield { container: c, index: i, stack: s, def };
      }
    }
  }

  /** Tem algo (não quebrado) com a etiqueta — na mão, vestido ou guardado? */
  hasTag(tag: string): boolean {
    const hd = this.handDef;
    if (hd?.tags.includes(tag) && !isBroken(hd, this.handSlot?.st)) return true;
    for (const e of this.wornSlots.values()) {
      const d = itemDef(e.defId);
      if (d?.tags.includes(tag) && !isBroken(d, e.st)) return true;
    }
    for (const { stack, def } of this.stacks()) if (def.tags.includes(tag) && !isBroken(def, stack.st)) return true;
    return false;
  }

  countOf(defId: string): number {
    return this.containers.reduce((n, c) => n + c.countOf(defId), 0);
  }

  // ---------------------------------------------------------------- avisos e save

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
    if (this.wornSlots.size) {
      save.worn = {};
      for (const [slot, e] of this.wornSlots) save.worn[slot] = copy(e);
    }
    if (this.handSlot) save.hand = copy(this.handSlot);
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
    this.wornSlots.clear();
    for (const [slot, e] of Object.entries(save.worn ?? {}) as [WearSlot, EquippedItem][]) {
      const d = e ? itemDef(e.defId) : null;
      if (!d?.wear || d.wear.slot !== slot) continue;
      const st = normalizeState(d, e.st);
      this.wornSlots.set(slot, st ? { defId: d.id, st } : { defId: d.id });
    }
    this.handSlot = null;
    const hd = save.hand ? itemDef(save.hand.defId) : null;
    if (save.hand && hd) {
      const st = normalizeState(hd, save.hand.st);
      this.handSlot = st ? { defId: hd.id, st } : { defId: hd.id };
    }
    this.refreshCapacity();
    for (const c of this.containers) {
      const s = save.containers.find((x) => x.id === c.id);
      if (s) c.restore(s);
    }
    this.changed();
  }
}
