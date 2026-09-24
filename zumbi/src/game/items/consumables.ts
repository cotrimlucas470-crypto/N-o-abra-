/**
 * Gastar consumíveis medidos e o que sobra deles: a garrafa vazia depois da
 * última dose, o galão vazio depois da gasolina, a caneca depois do café.
 * Também o isqueiro/fósforo (uma "chama" por uso). Puro.
 */
import { charge, isBroken } from './condition';
import { itemDef } from './ItemCatalog';
import type { ItemDef } from './ItemTypes';
import type { PlayerInventory } from './PlayerInventory';

/** Recipiente que sobra quando o conteúdo acaba (ou null: some junto). */
export function emptyAfter(def: ItemDef): string | null {
  if (def.id === 'combustivel') return 'galaoVazio';
  if (def.id === 'baldeAgua') return 'balde';
  if (def.iconSpec.f === 'dish' && def.iconSpec.k === 'mug' && def.drink) return 'caneca';
  if (def.condition !== 'drink' || def.iconSpec.f !== 'bottle') return null;
  const k = def.iconSpec.k;
  if (k === 'glass') return 'garrafaVidro';
  if (k === 'jug' || k === 'oil' || k === 'thermos' || k === 'milk') return null;
  return 'garrafaPet';
}

/** Usos de uma ferramenta nova até quebrar/acabar. */
export function toolUses(def: ItemDef): number {
  return def.tool?.durability ?? def.melee?.durability ?? 100;
}

/**
 * Risca um fósforo / aciona o isqueiro (mão ou bolsos). Devolve o nome do
 * que foi usado, ou null se não há chama.
 */
export function useLighter(inv: PlayerInventory): string | null {
  const hd = inv.handDef;
  const h = inv.hand;
  if (hd && h && hd.tags.includes('acender') && !isBroken(hd, h.st) && charge(hd, h.st) > 0.01) {
    inv.updateHand({ ...(h.st ?? {}), ch: Math.max(0, charge(hd, h.st) - 1 / toolUses(hd)) });
    return hd.name;
  }
  for (const s of inv.stacks()) {
    if (!s.def.tags.includes('acender') || isBroken(s.def, s.stack.st) || charge(s.def, s.stack.st) <= 0.01) continue;
    s.container.updateOne(s.index, { ...(s.stack.st ?? {}), ch: Math.max(0, charge(s.def, s.stack.st) - 1 / toolUses(s.def)) });
    inv.changed();
    return s.def.name;
  }
  return null;
}

/** Tem chama (isqueiro com gás, fósforo)? */
export function hasLighter(inv: PlayerInventory): boolean {
  const hd = inv.handDef;
  if (hd?.tags.includes('acender') && charge(hd, inv.hand?.st) > 0.01) return true;
  for (const s of inv.stacks()) if (s.def.tags.includes('acender') && !isBroken(s.def, s.stack.st) && charge(s.def, s.stack.st) > 0.01) return true;
  return false;
}

/** Nome do item (ou o id, se sumiu do catálogo). */
export function itemName(id: string): string {
  return itemDef(id)?.name ?? id;
}
