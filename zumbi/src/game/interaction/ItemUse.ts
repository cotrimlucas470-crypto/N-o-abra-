/**
 * Registro das ações de item. Monta a lista do que dá para fazer com o item
 * selecionado (para os botões do painel) e executa a escolhida.
 * Cada etapa registra suas ações (básicas, medicina, armas, leitura...).
 */
import { itemDef } from '../items/ItemCatalog';
import type { ItemContainer } from '../items/ItemContainer';
import type { PlayerInventory } from '../items/PlayerInventory';
import type { WorldState } from '../sim/WorldState';
import type { Survivor } from '../survival/Survivor';
import { BASIC_ACTIONS } from './itemActions/basic';
import { MEDICAL_ACTIONS } from './itemActions/medical';
import { fail, type ItemActionContext, type ItemActionDef, type ItemHooks, type ItemResult, type ItemWhere } from './itemActions/types';

export interface ItemActionView {
  id: string;
  label: string;
  /** false = aparece apagado; tocar mostra o motivo. */
  enabled: boolean;
  reason?: string;
}

export interface ItemUseEnv {
  inventory: PlayerInventory;
  survivor: Survivor;
  state: WorldState;
  now: () => number;
  openContainerId: () => string | null;
  position: () => { x: number; y: number };
  hooks: ItemHooks;
}

export class ItemUse {
  private readonly defs: ItemActionDef[] = [];

  constructor(private readonly env: ItemUseEnv) {
    this.register(BASIC_ACTIONS);
    this.register(MEDICAL_ACTIONS);
  }

  register(list: readonly ItemActionDef[]): void {
    this.defs.push(...list);
    this.defs.sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
  }

  /** Monta o contexto do item em `loc` (null se não há item lá). */
  context(loc: ItemWhere): ItemActionContext | null {
    const e = this.env;
    const inv = e.inventory;
    let defId: string | null = null;
    let st;
    let count = 1;
    let container: ItemContainer | null = null;
    if (loc.where === 'inv') {
      container = inv.container(loc.containerId);
      const s = container?.stacks[loc.index];
      if (!s) return null;
      defId = s.defId;
      st = s.st;
      count = s.count;
    } else if (loc.where === 'loot') {
      const id = e.openContainerId();
      const s = id ? e.state.loot.peek(id)?.stacks[loc.index] : undefined;
      if (!s) return null;
      defId = s.defId;
      st = s.st;
      count = s.count;
    } else if (loc.where === 'hand') {
      defId = inv.hand?.defId ?? null;
      st = inv.hand?.st;
    } else if (loc.where === 'worn') {
      const w = inv.wornIn(loc.slot);
      defId = w?.defId ?? null;
      st = w?.st;
    } else if (loc.where === 'bag') {
      defId = inv.bag?.defId ?? null;
      st = inv.bag?.st;
    }
    const def = defId ? itemDef(defId) : null;
    if (!def) return null;
    const p = e.position();
    return { def, st, count, loc, container, inventory: inv, survivor: e.survivor, state: e.state, now: e.now(), openContainerId: e.openContainerId(), x: p.x, y: p.y, hooks: e.hooks };
  }

  actionsFor(loc: ItemWhere): ItemActionView[] {
    const c = this.context(loc);
    if (!c) return [];
    const out: ItemActionView[] = [];
    for (const d of this.defs) {
      if (!d.when(c)) continue;
      const can = d.can ? d.can(c) : true;
      const label = typeof d.label === 'function' ? d.label(c) : d.label;
      out.push(can === true ? { id: d.id, label, enabled: true } : { id: d.id, label, enabled: false, reason: can });
    }
    return out;
  }

  run(id: string, loc: ItemWhere): ItemResult {
    const c = this.context(loc);
    if (!c) return fail('O item não está mais aí.');
    const d = this.defs.find((x) => x.id === id && x.when(c));
    if (!d) return fail('Não dá para fazer isso agora.');
    const can = d.can ? d.can(c) : true;
    if (can !== true) return fail(can);
    return d.run(c);
  }
}
