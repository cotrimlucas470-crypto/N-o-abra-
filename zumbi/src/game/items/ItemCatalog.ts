/**
 * Catálogo de itens: uma entrada = um tipo de item. Só DADOS.
 *
 * - `weight`: kg por unidade. O peso é o que limita o que se carrega
 *   (a fase de inventário acrescenta mochilas, roupas com bolsos e cansaço por carga).
 * - `stack`: quantas unidades formam uma pilha (1 = cada unidade ocupa uma linha).
 * - `icon`: id do sprite (desenho procedural em assets/procedural/items.ts;
 *   um PNG em assets/overrides.json substitui sem mexer aqui).
 * - `tags`: o que o item É, para os sistemas futuros consultarem sem conhecer
 *   o item pelo nome (ex.: crafting pede "martelo", não o item `martelo`).
 *
 * Item novo = entrada aqui + desenho do ícone. Nenhum sistema precisa mudar.
 */
export type ItemCategory = 'comida' | 'bebida' | 'medicina' | 'ferramenta' | 'arma' | 'material' | 'luz' | 'diversos';

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  weight: number;
  stack: number;
  icon: string;
  description: string;
  tags: readonly string[];
}

type Entry = Omit<ItemDef, 'id' | 'icon'> & { icon?: string };

const DEFS = {
  agua: { name: "Garrafa d'água", category: 'bebida', weight: 0.55, stack: 4, description: 'Meio litro. Lacrada.', tags: ['bebida', 'agua'] },
  refrigerante: { name: 'Lata de refrigerante', category: 'bebida', weight: 0.36, stack: 6, description: 'Morna, mas ainda tem gás.', tags: ['bebida'] },
  feijao: { name: 'Lata de feijão', category: 'comida', weight: 0.45, stack: 6, description: 'Precisa de abridor ou de uma faca.', tags: ['comida', 'enlatado'] },
  biscoito: { name: 'Pacote de biscoito', category: 'comida', weight: 0.2, stack: 6, description: 'Seco e salgado.', tags: ['comida'] },
  atadura: { name: 'Atadura', category: 'medicina', weight: 0.05, stack: 10, description: 'Rolo de gaze limpa.', tags: ['curativo'] },
  analgesico: { name: 'Analgésicos', category: 'medicina', weight: 0.08, stack: 5, description: 'Cartela com poucos comprimidos.', tags: ['remedio', 'dor'] },
  lanterna: { name: 'Lanterna', category: 'luz', weight: 0.35, stack: 1, description: 'Precisa de pilhas.', tags: ['luz'] },
  pilhas: { name: 'Pilhas', category: 'material', weight: 0.03, stack: 12, description: 'Tamanho AA.', tags: ['energia'] },
  martelo: { name: 'Martelo', category: 'ferramenta', weight: 0.8, stack: 1, description: 'Para construir. Ou para outra coisa.', tags: ['martelo', 'arma-contundente'] },
  chaveFenda: { name: 'Chave de fenda', category: 'ferramenta', weight: 0.2, stack: 1, description: 'Desmonta quase tudo.', tags: ['chave-fenda'] },
  peDeCabra: { name: 'Pé de cabra', category: 'ferramenta', weight: 2.0, stack: 1, description: 'Abre o que está fechado. Pesado.', tags: ['alavanca', 'arma-contundente'] },
  faca: { name: 'Faca de cozinha', category: 'arma', weight: 0.3, stack: 1, description: 'Corta. Não foi feita para brigar.', tags: ['faca', 'arma-cortante'] },
  pregos: { name: 'Pregos', category: 'material', weight: 0.01, stack: 60, description: 'Um punhado.', tags: ['pregos'] },
  tabua: { name: 'Tábua', category: 'material', weight: 1.5, stack: 4, description: 'Madeira de construção.', tags: ['madeira'] },
  fita: { name: 'Fita adesiva', category: 'material', weight: 0.15, stack: 3, description: 'Serve para quase tudo.', tags: ['fita'] },
} satisfies Record<string, Entry>;

export type ItemId = keyof typeof DEFS;

export const ITEM_DEFS: Readonly<Record<string, ItemDef>> = Object.fromEntries(
  Object.entries(DEFS).map(([id, e]) => [id, { id, icon: `item.${id}`, ...(e as Entry) } as ItemDef]),
);

export function itemDef(id: string): ItemDef | null {
  return ITEM_DEFS[id] ?? null;
}

export function allItemIds(): string[] {
  return Object.keys(ITEM_DEFS);
}

/** Peso formatado para a interface ("0,55 kg"). */
export function formatKg(kg: number): string {
  const v = Math.round(kg * 100) / 100;
  return `${v.toFixed(v < 10 ? 2 : 1).replace('.', ',')} kg`;
}
