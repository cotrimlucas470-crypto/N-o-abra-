/**
 * Formato compacto das entradas do catálogo. Cada categoria tem valores
 * padrão (pilha, condição, raridade); a entrada só diz o que foge do padrão.
 */
import type { ConditionKind, IconSpec, ItemCategory, ItemDef, ItemProps, Rarity } from '../ItemTypes';

export interface ItemEntry extends ItemProps {
  id: string;
  name: string;
  sub: string;
  kg: number;
  /** Litros; sem valor, estimado pelo peso. */
  vol?: number;
  stack?: number;
  rar?: Rarity;
  cond?: ConditionKind;
  icon: IconSpec;
  desc: string;
  tags?: readonly string[];
  craftOnly?: boolean;
  metal?: boolean;
}

export interface CategoryDefaults {
  stack: number;
  cond: ConditionKind;
  rar?: Rarity;
  /** Etiquetas que todo item da categoria recebe. */
  tags?: readonly string[];
}

export function category(cat: ItemCategory, d: CategoryDefaults, entries: readonly ItemEntry[]): ItemDef[] {
  return entries.map((e) => {
    const { id, name, sub, kg, vol, stack, rar, cond, icon, desc, tags, craftOnly, metal, ...props } = e;
    const def: ItemDef = {
      ...props,
      id,
      name,
      category: cat,
      sub,
      weight: kg,
      volume: vol ?? Math.round(Math.max(0.05, kg * 1.1) * 100) / 100,
      stack: stack ?? d.stack,
      rarity: rar ?? d.rar ?? 'comum',
      condition: cond ?? d.cond,
      icon: `item.${id}`,
      iconSpec: icon,
      description: desc,
      tags: [...new Set([...(d.tags ?? []), ...(tags ?? [])])],
    };
    if (craftOnly) def.craftOnly = true;
    if (metal) def.metal = true;
    return def;
  });
}
