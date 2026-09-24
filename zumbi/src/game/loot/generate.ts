/**
 * GERAÇÃO de loot: sorteia o conteúdo de um recipiente a partir da tabela,
 * com raridade, quantidade e ESTADO inicial coerentes com o lugar.
 *
 * Determinístico: o mesmo recipiente (id) na mesma cidade (semente) sai sempre
 * igual — por isso o conteúdo só precisa ir para o save depois que alguém
 * mexe nele. Nada é gerado de novo com o tempo: loot é finito.
 */
import type { SandboxSettings } from '../config/Sandbox';
import { Random } from '../core/Random';
import { normalizeState, type ItemState } from '../items/condition';
import { itemDef, itemsWithTag } from '../items/ItemCatalog';
import { ItemContainer, type ItemStack } from '../items/ItemContainer';
import { RARITY_INFO, type ItemDef } from '../items/ItemTypes';
import type { LootEntry, LootTable, Wear } from './LootTypes';

export type LootSettings = SandboxSettings['loot'];

export const DEFAULT_LOOT: LootSettings = { abundance: 1, rareMultiplier: 1, alreadyLooted: 0, collapseAgeDays: 0, floorItems: 1 };

/** Peso de um item conforme a raridade (e o ajuste de raros da partida). */
export function rarityWeight(def: ItemDef, s: LootSettings): number {
  const w = RARITY_INFO[def.rarity].weight;
  return def.rarity === 'comum' ? w : w * s.rareMultiplier;
}

function entryWeight(e: LootEntry, s: LootSettings): number {
  if (e.item) {
    const def = itemDef(e.item);
    return def && !def.craftOnly ? e.w * rarityWeight(def, s) : 0;
  }
  // Etiqueta: a média das raridades dos itens com ela (a escolha interna também pondera).
  const list = itemsWithTag(e.tag ?? '').filter((d) => !d.craftOnly);
  if (!list.length) return 0;
  return (e.w * list.reduce((sum, d) => sum + rarityWeight(d, s), 0)) / list.length;
}

function pickFromTag(tag: string, rng: Random, s: LootSettings): ItemDef | null {
  const list = itemsWithTag(tag).filter((d) => !d.craftOnly);
  if (!list.length) return null;
  return rng.weighted(list.map((d) => [d, rarityWeight(d, s)] as const));
}

/** Arredondamento sorteado: 2,3 vira 2 (70%) ou 3 (30%). */
function roundRandom(v: number, rng: Random): number {
  const f = Math.floor(v);
  return f + (rng.chance(v - f) ? 1 : 0);
}

export interface GenerateOptions {
  capacity: number;
  settings?: LootSettings;
}

/** Sorteia o conteúdo de um recipiente. */
export function generateLoot(table: LootTable, rng: Random, opts: GenerateOptions): ItemStack[] {
  const s = opts.settings ?? DEFAULT_LOOT;
  const box = new ItemContainer('gerado', 'gerado', opts.capacity);
  const empty = 1 - (1 - table.empty) * (1 - s.alreadyLooted);
  if (rng.chance(empty)) return [];
  const rolls = roundRandom(rng.int(table.rolls[0], table.rolls[1]) * s.abundance, rng);
  if (rolls <= 0) return [];
  const weighted = table.entries.map((e) => [e, entryWeight(e, s)] as const).filter(([, w]) => w > 0);
  if (!weighted.length) return [];
  for (let r = 0; r < rolls; r++) {
    const e = rng.weighted(weighted);
    const def = e.item ? itemDef(e.item) : pickFromTag(e.tag!, rng, s);
    if (!def) continue;
    const n = e.n ? rng.int(e.n[0], e.n[1]) : 1;
    // Cada unidade pode vir num estado (a pilha de 3 laranjas veio junta: mesmo estado).
    const st = rollState(def, table.wear, rng, s, table.stockAge);
    if (box.add(def.id, n, st) === 0 && box.weight >= box.capacity * 0.98) break;
  }
  return box.stacks.map((x) => ({ ...x }));
}

const u = (rng: Random, a: number, b: number) => rng.range(a, b);

/**
 * Estado inicial de um item encontrado, conforme o LUGAR (desgaste do
 * recipiente) e há quanto tempo o mundo parou.
 */
export function rollState(def: ItemDef, wear: Wear, rng: Random, s: LootSettings, stockAge?: readonly [number, number]): ItemState | undefined {
  const st: ItemState = {};
  const k = def.condition;
  let f = 0;
  if (k === 'durable' || k === 'clothing' || k === 'device') {
    const c =
      wear === 'novo'
        ? rng.chance(0.85)
          ? 1
          : u(rng, 0.8, 1)
        : wear === 'casa'
          ? u(rng, 0.45, 1)
          : wear === 'trabalho'
            ? u(rng, 0.3, 0.95)
            : wear === 'veiculo'
              ? u(rng, 0.35, 0.95)
              : wear === 'rua'
                ? u(rng, 0.15, 0.7)
                : u(rng, 0.05, 0.5);
    st.c = c;
    const outside = wear === 'rua' || wear === 'lixo';
    if (def.metal && (outside ? rng.chance(0.35) : wear === 'trabalho' ? rng.chance(0.1) : rng.chance(0.03))) f |= 4; // enferrujado
    if (wear === 'lixo' ? rng.chance(0.6) : wear === 'trabalho' || wear === 'rua' ? rng.chance(0.25) : wear === 'casa' && k === 'clothing' ? rng.chance(0.12) : false) f |= 1; // sujo
    if (k === 'clothing') {
      if (outside && rng.chance(0.3)) f |= 16; // rasgado
      if (wear === 'rua' && rng.chance(0.2)) f |= 2; // molhado
    }
  }
  if (k === 'battery' || k === 'device') {
    const base = wear === 'novo' ? 1 : wear === 'lixo' ? u(rng, 0, 0.25) : rng.chance(0.15) ? 0 : u(rng, 0.1, 1);
    // Pilha perde um pouco de carga parada (bem pouco por dia).
    st.ch = Math.max(0, base - s.collapseAgeDays * 0.002);
  }
  if (k === 'perishable') {
    const [a, b] = stockAge ?? [0, 3];
    st.born = -s.collapseAgeDays - u(rng, a, b);
  }
  if (k === 'drink') {
    const max = def.drink?.doses ?? 1;
    if (wear === 'lixo') {
      if (max > 1) {
        st.open = 1;
        st.dose = rng.int(0, Math.max(0, Math.floor(max / 2)));
      }
      if (rng.chance(0.3)) f |= 8;
    } else if (wear === 'casa' && max > 1 && rng.chance(0.12)) {
      st.open = 1;
      st.dose = rng.int(1, max - 1);
    }
  }
  if (k === 'medicine') {
    const shelf = def.med?.shelfLifeDays;
    if (shelf) st.exp = Math.round(-s.collapseAgeDays + u(rng, -0.15 * shelf, 0.9 * shelf));
    const max = def.med?.doses;
    if (max && max > 1 && wear !== 'novo' && rng.chance(0.35)) st.dose = rng.int(1, max - 1);
  }
  if (f) st.f = f;
  return normalizeState(def, st);
}
