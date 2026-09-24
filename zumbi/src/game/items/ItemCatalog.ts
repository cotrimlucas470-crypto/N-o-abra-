/**
 * Catálogo de itens: junta as categorias (items/catalog/*.ts) numa tabela só,
 * confere ids repetidos e oferece as consultas que os sistemas usam.
 *
 * Item novo = uma entrada no arquivo da categoria (com ícone) — nenhum sistema
 * precisa mudar. Receitas, loot e construção procuram por ETIQUETA (`tags`)
 * sempre que possível ("martelar", "madeira"), não por id.
 */
import { AMMO, FIREARMS, MELEE } from './catalog/weapons';
import { BAGS, CLOTHING } from './catalog/clothing';
import { DRINKS } from './catalog/drinks';
import { FOOD } from './catalog/food';
import { CONSTRUCTION, MATERIALS } from './catalog/materials';
import { MEDICAL } from './catalog/medical';
import { ELECTRONICS, HOUSEHOLD, NATURE, READING, VALUABLES } from './catalog/misc';
import { TOOLS } from './catalog/tools';
import type { ItemCategory, ItemDef } from './ItemTypes';

export type { ItemCategory, ItemDef } from './ItemTypes';

const ALL: ItemDef[] = [
  ...FOOD,
  ...DRINKS,
  ...TOOLS,
  ...MATERIALS,
  ...CONSTRUCTION,
  ...MEDICAL,
  ...MELEE,
  ...FIREARMS,
  ...AMMO,
  ...CLOTHING,
  ...BAGS,
  ...ELECTRONICS,
  ...NATURE,
  ...HOUSEHOLD,
  ...READING,
  ...VALUABLES,
];

function index(list: ItemDef[]): Record<string, ItemDef> {
  const out: Record<string, ItemDef> = {};
  for (const d of list) {
    if (out[d.id]) throw new Error(`Item repetido no catálogo: ${d.id}`);
    out[d.id] = d;
  }
  return out;
}

export const ITEM_DEFS: Readonly<Record<string, ItemDef>> = index(ALL);

const byTag = new Map<string, ItemDef[]>();
for (const d of ALL) {
  for (const t of d.tags) {
    let l = byTag.get(t);
    if (!l) byTag.set(t, (l = []));
    l.push(d);
  }
}

export function itemDef(id: string): ItemDef | null {
  return ITEM_DEFS[id] ?? null;
}

export function allItemIds(): string[] {
  return Object.keys(ITEM_DEFS);
}

export function allItems(): readonly ItemDef[] {
  return ALL;
}

export function itemsWithTag(tag: string): readonly ItemDef[] {
  return byTag.get(tag) ?? [];
}

export function itemsInCategory(cat: ItemCategory): ItemDef[] {
  return ALL.filter((d) => d.category === cat);
}

export function hasTag(id: string, tag: string): boolean {
  return ITEM_DEFS[id]?.tags.includes(tag) ?? false;
}

/** Peso formatado para a interface ("0,55 kg"). */
export function formatKg(kg: number): string {
  const v = Math.round(kg * 100) / 100;
  return `${v.toFixed(v < 10 ? 2 : 1).replace('.', ',')} kg`;
}
