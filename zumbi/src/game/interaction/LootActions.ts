/**
 * Ações de item no painel: pegar do recipiente, guardar nele, largar no chão
 * e USAR (comer, beber, curar, vestir mochila). Puro, sem Phaser — a cena só
 * repassa os pedidos do HUD e mostra o resultado.
 *
 * Usar respeita o estado do item: comida estragada faz mal, lata precisa de
 * abridor ou faca, remédio vencido rende metade, bebida aberta guarda o que
 * sobrou e a garrafa vazia fica com você (serve para juntar água depois).
 */
import { hashString } from '../core/Random';
import { drinkEffect, foodEffect, isBroken, medHeal, doses, type Tone } from '../items/condition';
import { itemDef } from '../items/ItemCatalog';
import type { ItemContainer } from '../items/ItemContainer';
import type { ItemDef } from '../items/ItemTypes';
import type { PlayerInventory } from '../items/PlayerInventory';
import type { WorldState } from '../sim/WorldState';

export interface ActionResult {
  ok: boolean;
  message?: string;
  tone?: Tone;
}

export interface HealthTarget {
  health: number;
  readonly maxHealth: number;
  setHealth(v: number): void;
}

export type UseKind = 'comer' | 'beber' | 'curar' | 'equipar';

export const USE_LABEL: Record<UseKind, string> = { comer: 'COMER', beber: 'BEBER', curar: 'USAR', equipar: 'VESTIR' };

/** O que dá para fazer com um item (null = nada, por enquanto). */
export function useKind(def: ItemDef): UseKind | null {
  if (def.bag) return 'equipar';
  if (def.drink) return 'beber';
  if (def.food) return 'comer';
  if (def.med?.heal) return 'curar';
  return null;
}

/** Garrafa que sobra quando a bebida acaba. */
function emptyBottleOf(def: ItemDef): string | null {
  if (def.iconSpec.f !== 'bottle') return null;
  const k = def.iconSpec.k;
  if (k === 'glass') return 'garrafaVidro';
  if (k === 'jug' || k === 'oil' || k === 'thermos' || k === 'milk') return null;
  return 'garrafaPet';
}

export class LootActions {
  constructor(
    private readonly state: WorldState,
    private readonly inventory: PlayerInventory,
    private readonly stats: HealthTarget,
    private readonly now: () => number,
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

  /** Tem alguma ferramenta com essa etiqueta (e não quebrada)? */
  private hasTool(tag: string): boolean {
    for (const c of this.inventory.containers) {
      for (const s of c.stacks) {
        const d = itemDef(s.defId);
        if (d?.tags.includes(tag) && !isBroken(d, s.st)) return true;
      }
    }
    return false;
  }

  use(from: ItemContainer, index: number): ActionResult {
    const s = from.stacks[index];
    const def = s ? itemDef(s.defId) : null;
    if (!s || !def) return { ok: false };
    const kind = useKind(def);
    const now = this.now();
    switch (kind) {
      case 'equipar': {
        const err = this.inventory.equipBag(from, index);
        return err ? { ok: false, message: err, tone: 'warn' } : { ok: true, message: `Vestiu: ${def.name} (+${def.bag!.capacity} kg)`, tone: 'ok' };
      }
      case 'beber': {
        const eff = drinkEffect(def, s.st)!;
        const left = doses(def, s.st) - 1;
        if (left <= 0) {
          from.take(index, 1);
          const empty = emptyBottleOf(def);
          if (empty) from.add(empty, 1);
        } else {
          from.updateOne(index, { ...(s.st ?? {}), open: 1, dose: left });
        }
        this.applyHealth(eff.health);
        this.inventory.changed();
        return { ok: true, message: eff.message, tone: eff.tone };
      }
      case 'comer': {
        const needs = def.food?.needs;
        if (needs && !this.hasTool(needs)) return { ok: false, message: 'Precisa de abridor, faca ou canivete.', tone: 'warn' };
        const eff = foodEffect(def, s.st, now)!;
        from.take(index, 1);
        this.applyHealth(eff.health);
        this.inventory.changed();
        return { ok: true, message: eff.message, tone: eff.tone };
      }
      case 'curar': {
        if (this.stats.health >= this.stats.maxHealth) return { ok: false, message: 'Você não está ferido.', tone: 'info' };
        const heal = medHeal(def, s.st, now);
        const max = def.med?.doses;
        if (max && max > 1) {
          const left = doses(def, s.st) - 1;
          if (left <= 0) from.take(index, 1);
          else from.updateOne(index, { ...(s.st ?? {}), dose: left });
        } else from.take(index, 1);
        this.applyHealth(heal);
        this.inventory.changed();
        return { ok: true, message: heal > 0 ? `+${heal} de vida` : 'Não fez efeito.', tone: heal > 0 ? 'ok' : 'warn' };
      }
      default:
        return { ok: false, message: 'Ainda não dá para usar isso.', tone: 'info' };
    }
  }

  private applyHealth(delta: number): void {
    if (delta) this.stats.setHealth(this.stats.health + delta);
  }
}
