/**
 * Achar e desgastar ferramenta (puro), para quem monta, desmonta e derruba.
 * Primeiro a da mão; depois bolsos e mochila.
 */
import { condition, isBroken, type ItemState } from '../items/condition';
import type { ItemDef } from '../items/ItemTypes';
import type { PlayerInventory } from '../items/PlayerInventory';

export interface ToolHandle {
  def: ItemDef;
  st: ItemState | undefined;
  inHand: boolean;
  /** Gasta `uses` usos da durabilidade; devolve aviso se quebrou. */
  wear(uses?: number): string | null;
}

export function findTool(inv: PlayerInventory, tags: readonly string[], handOnly = false): ToolHandle | null {
  const h = inv.hand;
  const hd = inv.handDef;
  const fits = (d: ItemDef, st: ItemState | undefined) => d.tags.some((t) => tags.includes(t)) && !isBroken(d, st);
  const wearWith = (d: ItemDef, st: ItemState | undefined, apply: (st: ItemState) => void) => (uses = 1) => {
    const dur = d.tool?.durability ?? d.melee?.durability;
    if (!dur || d.condition !== 'durable') return null;
    const c = Math.max(0, condition(st) - uses / dur);
    apply({ ...(st ?? {}), c });
    return c <= 0 ? `${d.name} quebrou.` : null;
  };
  if (h && hd && fits(hd, h.st)) return { def: hd, st: h.st, inHand: true, wear: wearWith(hd, h.st, (st) => inv.updateHand(st)) };
  if (handOnly) return null;
  for (const s of inv.stacks()) {
    if (!fits(s.def, s.stack.st)) continue;
    const c = s.container;
    const stack = s.stack;
    return {
      def: s.def,
      st: stack.st,
      inHand: false,
      wear: wearWith(s.def, stack.st, (st) => {
        const i = c.stacks.indexOf(stack);
        if (i >= 0) c.updateOne(i, st);
        inv.changed();
      }),
    };
  }
  return null;
}

/** Põe no inventário; o que não couber vai para `drop`. Devolve o texto do que rendeu. */
export function giveItems(inv: PlayerInventory, items: readonly { id: string; n: number }[], drop: (defId: string, count: number) => void, nameOf: (id: string) => string): string {
  const got: string[] = [];
  let fell = false;
  for (const it of items) {
    if (it.n <= 0) continue;
    const n = inv.add(it.id, it.n);
    if (n < it.n) {
      drop(it.id, it.n - n);
      fell = true;
    }
    got.push(`${it.n} ${nameOf(it.id).toLowerCase()}`);
  }
  return got.join(', ') + (fell ? ' (parte ficou no chão)' : '');
}
