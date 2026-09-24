/**
 * Catálogo do que o jogador pode montar no mundo. Só DADOS.
 * O que cada peça custa está nas receitas (crafting/Recipes.ts, com
 * `structure`); aqui fica o que ela É: onde encaixa, tamanho, se bloqueia
 * passagem e visão, resistência e o que faz (fogo, água, guardar, sentar,
 * dormir, plantar, cobrir da chuva...).
 *
 * Encaixe:
 * - `edge`: na borda do tile em que o jogador está, do lado para onde olha
 *   (parede, porta, janela, cerca) — dá para fechar um cômodo andando por dentro;
 * - `tile`: ocupa tiles inteiros à frente do jogador (móvel, piso, telhado, canteiro);
 * - `free`: no ponto à frente, sem grade (fogueira).
 */
import type { SleepPlace } from '../survival/Sleep';

export type StructureKind = 'fogo' | 'parede' | 'porta' | 'janela' | 'piso' | 'telhado' | 'movel' | 'canteiro' | 'agua' | 'barricada';

/** Camada: duas peças da mesma camada não dividem o mesmo lugar. */
export type StructureLayer = 'edge' | 'floor' | 'roof' | 'object';

export type Material = 'madeira' | 'tijolo' | 'metal' | 'pedra' | 'tecido' | 'terra';

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
  place: 'edge' | 'tile' | 'free';
  layer: StructureLayer;
  /** `tile`: tiles ocupados (largura × altura no giro 0). `free`: tamanho em px. */
  tiles?: readonly [number, number];
  w: number;
  h: number;
  /** Bloqueia passagem (física e navegação dos zumbis). */
  solid: boolean;
  /** Bloqueia visão. */
  opaque?: boolean;
  /** Margem (px) do corpo sólido dentro do tile (móvel menor que o tile). */
  inset?: number;
  hp: number;
  material: Material;
  /** Onde pode ser montada. */
  indoor: boolean;
  outdoor: boolean;
  /** Cobre da chuva (telhado): quem está embaixo fica abrigado. */
  cover?: boolean;
  fire?: FireSpec;
  /** Guarda coisas. */
  container?: { name: string; capacity: number; verb?: string };
  /** Nome masculino ("o fogão", "no canteiro"). */
  masc?: boolean;
  /** Senta, descansa ou dorme. */
  seat?: { sleep?: SleepPlace; name: string };
  /** Estação de trabalho (receitas que pedem bancada). */
  station?: 'bancada';
  /** Junta chuva (doses no máximo). */
  water?: { max: number };
  /** Canteiro de horta. */
  farm?: boolean;
  /** O que volta ao desmontar com a ferramenta certa. */
  salvage?: readonly { id: string; n: number }[];
  /** Ferramenta (etiquetas) para desmontar; sem ela, só derrubando. */
  dismantleTools?: readonly string[];
  dismantleMinutes?: number;
  /** Cores do desenho (principal, detalhe). */
  color: number;
  color2?: number;
}

const T = 64;
const WOOD = ['martelar', 'alavanca'] as const;

const DEFS = {
  fogueira: {
    name: 'Fogueira', kind: 'fogo', place: 'free', layer: 'object', w: 44, h: 44, solid: false, hp: 30, material: 'pedra',
    indoor: false, outdoor: true, fire: { maxFuel: 600, heatRange: 230, lightRadius: 300 }, color: 0x6f6f68,
  },
  // ---------------------------------------------------------------- paredes e aberturas (borda do tile)
  paredeMadeira: {
    name: 'Parede de madeira', kind: 'parede', place: 'edge', layer: 'edge', w: T, h: 12, solid: true, opaque: true, hp: 300, material: 'madeira',
    indoor: true, outdoor: true, salvage: [{ id: 'tabua', n: 2 }, { id: 'pregos', n: 3 }], dismantleTools: WOOD, dismantleMinutes: 15, color: 0x9a7048, color2: 0x6a4a2c,
  },
  paredeTijolo: {
    name: 'Parede de tijolo', kind: 'parede', place: 'edge', layer: 'edge', w: T, h: 14, solid: true, opaque: true, hp: 900, material: 'tijolo',
    indoor: true, outdoor: true, salvage: [{ id: 'tijolo', n: 3 }], dismantleTools: ['derrubar-parede'], dismantleMinutes: 30, color: 0xa8543a, color2: 0xd8c8b0,
  },
  paredeMetal: {
    name: 'Parede de chapa', kind: 'parede', place: 'edge', layer: 'edge', w: T, h: 10, solid: true, opaque: true, hp: 1200, material: 'metal',
    indoor: true, outdoor: true, salvage: [{ id: 'chapaMetal', n: 1 }, { id: 'parafusos', n: 5 }], dismantleTools: ['parafusar'], dismantleMinutes: 20, color: 0x8a9096, color2: 0x5a6066,
  },
  cercaMadeira: {
    name: 'Cerca de madeira', kind: 'parede', place: 'edge', layer: 'edge', w: T, h: 8, solid: true, opaque: false, hp: 150, material: 'madeira',
    indoor: false, outdoor: true, salvage: [{ id: 'tabua', n: 1 }, { id: 'pregos', n: 2 }], dismantleTools: WOOD, dismantleMinutes: 8, color: 0xb38652, color2: 0x7a5232,
  },
  portaMadeira: {
    name: 'Porta de madeira', kind: 'porta', place: 'edge', layer: 'edge', w: T, h: 12, solid: true, opaque: true, hp: 250, material: 'madeira',
    indoor: true, outdoor: true, salvage: [{ id: 'tabua', n: 2 }, { id: 'dobradica', n: 2 }, { id: 'pregos', n: 2 }], dismantleTools: WOOD, dismantleMinutes: 15, color: 0x8a5a32, color2: 0xc8a24a,
  },
  janelaMadeira: {
    name: 'Janela', kind: 'janela', place: 'edge', layer: 'edge', w: T, h: 10, solid: true, opaque: false, hp: 120, material: 'madeira',
    indoor: true, outdoor: true, salvage: [{ id: 'tabua', n: 1 }, { id: 'pregos', n: 2 }], dismantleTools: WOOD, dismantleMinutes: 10, color: 0x9a7048, color2: 0xbfe0e8,
  },
  /** Tábuas pregadas numa janela ou porta do mapa (tamanho vem da abertura). */
  tabuasPregadas: {
    name: 'Tábuas pregadas', kind: 'barricada', place: 'free', layer: 'object', w: T, h: 16, solid: true, opaque: true, hp: 260, material: 'madeira',
    indoor: true, outdoor: true, salvage: [{ id: 'tabua', n: 1 }, { id: 'pregos', n: 2 }], dismantleTools: WOOD, dismantleMinutes: 6, color: 0xa87a4a, color2: 0x6a4a2c,
  },
  // ---------------------------------------------------------------- chão e cobertura
  piso: {
    masc: true, name: 'Piso de madeira', kind: 'piso', place: 'tile', layer: 'floor', tiles: [1, 1], w: T, h: T, solid: false, hp: 100, material: 'madeira',
    indoor: true, outdoor: true, salvage: [{ id: 'tabua', n: 1 }], dismantleTools: WOOD, dismantleMinutes: 8, color: 0xa8784a, color2: 0x7a5232,
  },
  telhado: {
    masc: true, name: 'Telhado', kind: 'telhado', place: 'tile', layer: 'roof', tiles: [1, 1], w: T, h: T, solid: false, hp: 150, material: 'madeira',
    indoor: false, outdoor: true, cover: true, salvage: [{ id: 'tabua', n: 2 }], dismantleTools: WOOD, dismantleMinutes: 12, color: 0x7a5a3a, color2: 0xc8643a,
  },
  // ---------------------------------------------------------------- móveis
  camaMadeira: {
    name: 'Cama', kind: 'movel', place: 'tile', layer: 'object', tiles: [1, 2], w: T, h: 2 * T, solid: true, inset: 6, hp: 80, material: 'madeira',
    indoor: true, outdoor: true, seat: { sleep: 'cama', name: 'cama' }, salvage: [{ id: 'tabua', n: 2 }, { id: 'pregos', n: 4 }], dismantleTools: WOOD, dismantleMinutes: 20, color: 0x8a5a32, color2: 0xe8e0f0,
  },
  cadeiraMadeira: {
    name: 'Cadeira', kind: 'movel', place: 'tile', layer: 'object', tiles: [1, 1], w: T, h: T, solid: true, inset: 16, hp: 30, material: 'madeira',
    indoor: true, outdoor: true, seat: { name: 'cadeira' }, salvage: [{ id: 'tabua', n: 1 }, { id: 'pregos', n: 2 }], dismantleTools: WOOD, dismantleMinutes: 8, color: 0x9a6a3a, color2: 0x6a4a2c,
  },
  mesaMadeira: {
    name: 'Mesa', kind: 'movel', place: 'tile', layer: 'object', tiles: [2, 1], w: 2 * T, h: T, solid: true, inset: 8, hp: 60, material: 'madeira',
    indoor: true, outdoor: true, container: { name: 'Em cima da mesa', capacity: 25, verb: 'OLHAR' }, salvage: [{ id: 'tabua', n: 2 }, { id: 'pregos', n: 3 }], dismantleTools: WOOD, dismantleMinutes: 15, color: 0xa8784a, color2: 0x7a5232,
  },
  bancadaMadeira: {
    name: 'Bancada de trabalho', kind: 'movel', place: 'tile', layer: 'object', tiles: [2, 1], w: 2 * T, h: T, solid: true, inset: 6, hp: 90, material: 'madeira',
    indoor: true, outdoor: true, station: 'bancada', container: { name: 'Gaveta da bancada', capacity: 20 }, salvage: [{ id: 'tabua', n: 3 }, { id: 'pregos', n: 5 }], dismantleTools: WOOD, dismantleMinutes: 20, color: 0x8a6a42, color2: 0x5a5a5a,
  },
  caixote: {
    masc: true, name: 'Caixote', kind: 'movel', place: 'tile', layer: 'object', tiles: [1, 1], w: T, h: T, solid: true, inset: 8, hp: 50, material: 'madeira',
    indoor: true, outdoor: true, container: { name: 'Caixote', capacity: 40 }, salvage: [{ id: 'tabua', n: 1 }, { id: 'pregos', n: 3 }], dismantleTools: WOOD, dismantleMinutes: 10, color: 0xb38652, color2: 0x7a5232,
  },
  estante: {
    name: 'Estante', kind: 'movel', place: 'tile', layer: 'object', tiles: [2, 1], w: 2 * T, h: T, solid: true, inset: 12, hp: 70, material: 'madeira',
    indoor: true, outdoor: true, container: { name: 'Estante', capacity: 60, verb: 'OLHAR' }, salvage: [{ id: 'tabua', n: 2 }, { id: 'pregos', n: 4 }], dismantleTools: WOOD, dismantleMinutes: 15, color: 0x8a5a32, color2: 0xc8a06a,
  },
  fogaoLenha: {
    masc: true, name: 'Fogão a lenha', kind: 'fogo', place: 'tile', layer: 'object', tiles: [1, 1], w: T, h: T, solid: true, inset: 4, hp: 400, material: 'tijolo',
    indoor: true, outdoor: true, fire: { maxFuel: 720, heatRange: 300, lightRadius: 170, oven: true }, salvage: [{ id: 'tijolo', n: 4 }, { id: 'chapaMetal', n: 1 }], dismantleTools: ['derrubar-parede', 'martelar'], dismantleMinutes: 25, color: 0x9a4a32, color2: 0x2a2a2a,
  },
  coletorChuva: {
    masc: true, name: 'Coletor de chuva', kind: 'agua', place: 'tile', layer: 'object', tiles: [1, 1], w: T, h: T, solid: true, inset: 10, hp: 60, material: 'madeira',
    indoor: false, outdoor: true, water: { max: 40 }, salvage: [{ id: 'balde', n: 1 }, { id: 'lona', n: 1 }], dismantleTools: WOOD, dismantleMinutes: 8, color: 0x3a6ab0, color2: 0x8fc3dc,
  },
  canteiro: {
    masc: true, name: 'Canteiro', kind: 'canteiro', place: 'tile', layer: 'floor', tiles: [1, 1], w: T, h: T, solid: false, hp: 40, material: 'terra',
    indoor: false, outdoor: true, farm: true, dismantleTools: ['cavar', 'arar'], dismantleMinutes: 5, color: 0x5a3a24, color2: 0x7ab35c,
  },
} as const satisfies Record<string, StructureDef>;

export type StructureType = keyof typeof DEFS;

export const STRUCTURE_DEFS: Readonly<Record<StructureType, StructureDef>> = DEFS;

export function isStructureType(t: unknown): t is StructureType {
  return typeof t === 'string' && Object.prototype.hasOwnProperty.call(STRUCTURE_DEFS, t);
}

export function structureDef(t: StructureType): StructureDef {
  return STRUCTURE_DEFS[t];
}

export const TILE_PX = T;
