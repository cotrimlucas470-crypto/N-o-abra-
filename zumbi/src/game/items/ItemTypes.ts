/**
 * Tipos do catálogo de itens. Só DADOS (sem Phaser, sem regra).
 *
 * Um item tem identidade (id, nome, categoria, subcategoria), física (peso,
 * volume, pilha), raridade, um PERFIL DE CONDIÇÃO (que estados fazem sentido
 * para ele: comida estraga, ferramenta desgasta, pilha descarrega...) e
 * propriedades do seu tipo (calorias, dano, calibre, capacidade da mochila...).
 */

export type ItemCategory =
  | 'comida'
  | 'bebida'
  | 'ferramenta'
  | 'material'
  | 'medicina'
  | 'arma-branca'
  | 'arma-de-fogo'
  | 'municao'
  | 'roupa'
  | 'mochila'
  | 'eletronico'
  | 'natureza'
  | 'construcao'
  | 'domestico'
  | 'leitura'
  | 'valor';

export const CATEGORY_INFO: Record<ItemCategory, { label: string; color: string }> = {
  comida: { label: 'Comida', color: '#d9a441' },
  bebida: { label: 'Bebida', color: '#5fa8d3' },
  ferramenta: { label: 'Ferramenta', color: '#b0b6bc' },
  material: { label: 'Material', color: '#a88a64' },
  medicina: { label: 'Medicina', color: '#e36b6b' },
  'arma-branca': { label: 'Arma branca', color: '#c9c3b5' },
  'arma-de-fogo': { label: 'Arma de fogo', color: '#8c8f93' },
  municao: { label: 'Munição', color: '#c9a24a' },
  roupa: { label: 'Roupa', color: '#8fa8c8' },
  mochila: { label: 'Mochila', color: '#9a7b5a' },
  eletronico: { label: 'Eletrônico', color: '#7fc4a5' },
  natureza: { label: 'Natureza', color: '#7ab35c' },
  construcao: { label: 'Construção', color: '#b58a6a' },
  domestico: { label: 'Doméstico', color: '#c2b49a' },
  leitura: { label: 'Leitura', color: '#d8cfb8' },
  valor: { label: 'Valor', color: '#e7c65a' },
};

export type Rarity = 'comum' | 'incomum' | 'raro' | 'muito-raro' | 'rarissimo';

export const RARITY_INFO: Record<Rarity, { label: string; weight: number; color: string }> = {
  comum: { label: 'Comum', weight: 1, color: '#c9c7bf' },
  incomum: { label: 'Incomum', weight: 0.5, color: '#8fcf7a' },
  raro: { label: 'Raro', weight: 0.22, color: '#6fb1e8' },
  'muito-raro': { label: 'Muito raro', weight: 0.08, color: '#c08ae8' },
  rarissimo: { label: 'Raríssimo', weight: 0.025, color: '#f0b54a' },
};

/**
 * Que estados fazem sentido para o item (ver items/condition.ts):
 * - none: não muda (prego, pedra, lata fechada);
 * - durable: condição 0..1 (novo → quebrado); metal pode enferrujar;
 * - clothing: condição + sujo, molhado, rasgado;
 * - perishable: estraga com o tempo (fresco → passado → estragado → podre);
 * - drink: lacrada/aberta, doses restantes, contaminada;
 * - medicine: validade (vencido perde efeito);
 * - battery: carga;
 * - device: condição + carga (aparelho a pilha).
 */
export type ConditionKind = 'none' | 'durable' | 'clothing' | 'perishable' | 'drink' | 'medicine' | 'battery' | 'device';

/** Como desenhar o ícone (assets/procedural/itemIcons.ts). `f` = família do desenho. */
export interface IconSpec {
  f: string;
  /** Cor principal e secundária. */
  c?: string;
  c2?: string;
  /** Variação dentro da família (ex.: tool: 'hammer' | 'saw'). */
  k?: string;
  big?: boolean;
}

export interface FoodProps {
  kcal: number;
  /** Quanto mata a fome (0–100) e a sede (negativo = dá sede). */
  hunger: number;
  thirst: number;
  /** Dias até passar, estragar e apodrecer (só perecíveis). */
  spoil?: readonly [fresh: number, stale: number, rotten: number];
  /** Tag de ferramenta necessária para abrir/comer (ex.: 'abridor'). */
  needs?: string;
  /** Cru: comer assim faz mal. */
  raw?: boolean;
  /** Veneno/intoxicação garantida (cogumelo venenoso). */
  toxic?: boolean;
}

export interface DrinkProps {
  thirst: number;
  kcal?: number;
  /** Doses num recipiente cheio. */
  doses: number;
  /** Álcool: acalma, desidrata. */
  alcohol?: boolean;
}

export interface MedProps {
  /** Vida recuperada ao usar. */
  heal?: number;
  /** Estanca sangramento / desinfeta / alivia dor (etapa de ferimentos). */
  bandage?: boolean;
  disinfect?: boolean;
  pain?: number;
  antibiotic?: boolean;
  /** Dias de validade a partir da fabricação (vencido perde metade do efeito). */
  shelfLifeDays?: number;
  /** Usos por unidade (frasco de álcool = várias aplicações). */
  doses?: number;
}

export interface ToolProps {
  /** O que a ferramenta faz (crafting/construção pedem por aqui). */
  uses: readonly string[];
  /** Usos até quebrar, com condição 1. */
  durability: number;
}

export interface MeleeProps {
  damage: number;
  /** Golpes por segundo (relativo). */
  speed: number;
  reach: number;
  durability: number;
  kind: 'corte' | 'impacto' | 'perfuracao';
}

export interface FirearmProps {
  caliber: string;
  capacity: number;
  damage: number;
  range: number;
  /** Raio do barulho do disparo (px). */
  noise: number;
  /** Chance base de falhar com a arma nova. */
  jam: number;
  /** Usa carregador (id do item) ou é municiada direto. */
  magazine?: string;
}

export interface AmmoProps {
  caliber: string;
  /** Cartuchos por unidade (caixa com 50 → cada unidade = 1 cartucho; o item "caixa" guarda o total). */
  rounds: number;
}

export type WearSlot = 'cabeca' | 'tronco' | 'tronco-externo' | 'pernas' | 'pes' | 'maos' | 'rosto' | 'pescoco';

export interface WearProps {
  slot: WearSlot;
  /** Isolamento térmico (0–1) e proteção contra mordida/arranhão (0–1). */
  insulation: number;
  bite: number;
  scratch: number;
  /** Bolsos: capacidade extra (kg) quando vestida. */
  pockets?: number;
}

export interface BagProps {
  /** Capacidade (kg) quando equipada. */
  capacity: number;
  /** Fração do peso do conteúdo que "some" com a mochila bem ajustada. */
  reduction: number;
}

export interface PowerProps {
  /** Horas de uso com carga cheia (aparelhos) ou horas que a pilha fornece. */
  hours: number;
  /** Aparelho que precisa de pilha/bateria. */
  needs?: string;
}

export interface SeedProps {
  crop: string;
  /** Dias até colher. */
  growDays: number;
}

export interface ReadProps {
  /** Minutos de leitura; habilidade que ensina (etapas futuras). */
  minutes: number;
  skill?: string;
}

export interface ItemProps {
  food?: FoodProps;
  drink?: DrinkProps;
  med?: MedProps;
  tool?: ToolProps;
  melee?: MeleeProps;
  gun?: FirearmProps;
  ammo?: AmmoProps;
  wear?: WearProps;
  bag?: BagProps;
  power?: PowerProps;
  seed?: SeedProps;
  read?: ReadProps;
  /** Valor de troca (NPCs, etapa 24). */
  value?: number;
}

export interface ItemDef extends ItemProps {
  id: string;
  name: string;
  category: ItemCategory;
  sub: string;
  /** kg por unidade. */
  weight: number;
  /** Litros por unidade (ocupação; mochilas com volume entram na etapa de inventário). */
  volume: number;
  stack: number;
  rarity: Rarity;
  condition: ConditionKind;
  /** Id do sprite (`item.<id>`). */
  icon: string;
  iconSpec: IconSpec;
  description: string;
  tags: readonly string[];
  /** Só existe por fabricação (não aparece em loot). */
  craftOnly?: boolean;
  /** Metal: pode enferrujar. */
  metal?: boolean;
}
