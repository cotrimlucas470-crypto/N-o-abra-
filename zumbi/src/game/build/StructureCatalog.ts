/**
 * Catálogo do que o jogador pode montar no mundo. Só DADOS.
 * O que cada peça custa está nas receitas (crafting/Recipes.ts, com
 * `structure`); aqui fica o que ela É: tamanho, se bloqueia passagem e
 * visão, resistência, onde pode ficar e o que faz (fogo, água, guardar...).
 */

export type StructureKind = 'fogo' | 'parede' | 'porta' | 'janela' | 'piso' | 'movel' | 'canteiro' | 'agua';

export interface FireSpec {
  /** Máximo de lenha (minutos de queima). */
  maxFuel: number;
  /** Até onde o calor chega (px) e o raio da luz. */
  heatRange: number;
  lightRadius: number;
  /** Serve de forno (assar pão, pizza, bolo). */
  oven?: boolean;
}

export interface StructureDef {
  name: string;
  kind: StructureKind;
  /** Tamanho (px) no giro 0: largura (x) e altura (y). */
  w: number;
  h: number;
  /** Bloqueia passagem (física e navegação dos zumbis). */
  solid: boolean;
  /** Bloqueia visão. */
  opaque?: boolean;
  hp: number;
  /** Onde pode ser montada. */
  indoor: boolean;
  outdoor: boolean;
  fire?: FireSpec;
  /** O que volta ao desmontar com a ferramenta certa. */
  salvage?: readonly { id: string; n: number }[];
  /** Ferramenta (etiqueta) para desmontar; sem ela, só destruindo. */
  dismantleTool?: string;
}

export const STRUCTURE_DEFS = {
  fogueira: {
    name: 'Fogueira',
    kind: 'fogo',
    w: 44,
    h: 44,
    solid: false,
    hp: 30,
    indoor: false,
    outdoor: true,
    fire: { maxFuel: 600, heatRange: 230, lightRadius: 300 },
  },
} as const satisfies Record<string, StructureDef>;

export type StructureType = keyof typeof STRUCTURE_DEFS;

export function isStructureType(t: unknown): t is StructureType {
  return typeof t === 'string' && Object.prototype.hasOwnProperty.call(STRUCTURE_DEFS, t);
}

export function structureDef(t: StructureType): StructureDef {
  return STRUCTURE_DEFS[t];
}
