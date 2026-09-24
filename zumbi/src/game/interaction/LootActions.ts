/**
 * Transferências entre o mundo e o jogador: pegar do recipiente aberto (uma
 * pilha ou tudo), guardar nele e largar no chão. Puro, sem Phaser.
 * USAR itens (comer, beber, vestir, tratar...) fica em interaction/ItemUse.ts.
 */
import { hashString } from '../core/Random';
import type { Tone } from '../items/condition';
import { itemDef } from '../items/ItemCatalog';
import type { ItemContainer } from '../items/ItemContainer';
import type { PlayerInventory } from '../items/PlayerInventory';
import type { WorldState } from '../sim/WorldState';

export interface ActionResult {
  ok: boolean;
  message?: string;
  tone?: Tone;
}

export class LootActions {
  constructor(
    private readonly state: WorldState,
    private readonly inventory: PlayerInventory,
  ) {}

  /** Move uma pilha (ou parte) entre recipientes; o que não couber volta. */
  private move(src: ItemContainer, index: number, count: number, put: (defId: string, n: number, st: ItemContainer['stacks'][number]['st']) => number): number {
    const out = src.take(index, count);
    if (!out) return 0;
    const added = put(out.defId, out.count, out.st);
    if (added < out.count) src.add(out.defId, out.count - added, out.st);
    return added;
  }

  /** Pega do recipiente do mundo. */
  take(containerId: string, index: number, count = Infinity): ActionResult {
    const c = this.state.loot.peek(containerId);
    const s = c?.stacks[index];
    if (!c || !s) return { ok: false };
    const def = itemDef(s.defId);
    const n = this.move(c, index, Math.min(count, s.count), (id, k, st) => this.inventory.add(id, k, st));
    if (n <= 0) return { ok: false, message: 'Pesado demais para carregar.', tone: 'warn' };
    this.state.containerChanged(containerId);
    return { ok: true, message: `+${n > 1 ? `${n} ` : ''}${def?.name ?? s.defId}`, tone: 'ok' };
  }

  takeAll(containerId: string): ActionResult {
    const c = this.state.loot.peek(containerId);
    if (!c || c.isEmpty) return { ok: false };
    let moved = 0;
    let left = false;
    for (let i = 0; i < c.stacks.length; ) {
      const before = c.stacks.length;
      const s = c.stacks[i]!;
      const n = this.move(c, i, s.count, (id, k, st) => this.inventory.add(id, k, st));
      moved += n;
      // Se a pilha sumiu, o índice atual já é a próxima; se sobrou, pula.
      if (c.stacks.length === before) {
        i++;
        left = true;
      }
    }
    if (moved > 0) this.state.containerChanged(containerId);
    if (moved === 0) return { ok: false, message: 'Pesado demais para carregar.', tone: 'warn' };
    return { ok: true, message: left ? `Pegou ${moved} itens (o resto não coube).` : `Pegou ${moved} itens.`, tone: left ? 'warn' : 'ok' };
  }

  /** Guarda no recipiente aberto. */
  store(containerId: string, from: ItemContainer, index: number, count = Infinity): ActionResult {
    const c = this.state.loot.peek(containerId);
    const s = from.stacks[index];
    if (!c || !s) return { ok: false };
    const n = this.move(from, index, Math.min(count, s.count), (id, k, st) => c.add(id, k, st));
    if (n <= 0) return { ok: false, message: 'Não cabe aí.', tone: 'warn' };
    this.state.containerChanged(containerId);
    this.inventory.changed();
    return { ok: true, message: `Guardou ${n > 1 ? `${n} ` : ''}${itemDef(s.defId)?.name ?? ''}`.trim(), tone: 'info' };
  }

  /** Larga uma pilha aos pés (com um desvio fixo, para não empilhar tudo no mesmo ponto). */
  drop(from: ItemContainer, index: number, count: number, x: number, y: number): ActionResult {
    const out = this.inventory.take(from, index, count);
    if (!out) return { ok: false };
    const h = hashString(`${out.defId}:${this.state.itemCount}:${Math.round(x)},${Math.round(y)}`);
    const a = ((h % 360) * Math.PI) / 180;
    const r = 4 + (h % 7);
    this.state.dropItem(out.defId, out.count, x + Math.cos(a) * r, y + Math.sin(a) * r, out.st);
    const def = itemDef(out.defId);
    return { ok: true, message: `Largou ${out.count > 1 ? `${out.count} ` : ''}${def?.name ?? 'item'}`, tone: 'info' };
  }

  /** Larga algo que já saiu do inventário (item da mão, resto de ação) aos pés. */
  dropLoose(defId: string, count: number, st: ItemContainer['stacks'][number]['st'], x: number, y: number): void {
    const h = hashString(`${defId}:${this.state.itemCount}:${Math.round(x)},${Math.round(y)}`);
    const a = ((h % 360) * Math.PI) / 180;
    const r = 4 + (h % 7);
    this.state.dropItem(defId, count, x + Math.cos(a) * r, y + Math.sin(a) * r, st);
  }
}
