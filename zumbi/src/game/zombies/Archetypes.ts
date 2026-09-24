/**
 * ARQUÉTIPOS de zumbi: quem a pessoa era. Define roupas (tipos e cores),
 * acessórios (boné, capacete, colete, avental, mochila...), faixa de idade,
 * porte e onde costuma estar. O indivíduo é sorteado DENTRO dessas faixas
 * (zombies/ZombieFactory.ts), com semente estável.
 *
 * Nada aqui é "tipo especial com mais vida": o policial é mais duro de
 * derrubar porque usa colete e o operário porque usa capacete; o corredor
 * é rápido porque morreu em forma e há pouco tempo.
 */
import type { BuildingKind } from '../world/MapTypes';

export type ArchId =
  | 'morador'
  | 'idoso'
  | 'cliente'
  | 'caixa'
  | 'farmaceutico'
  | 'cozinheiro'
  | 'garcom'
  | 'mecanico'
  | 'operario'
  | 'vendedora'
  | 'policial'
  | 'militar'
  | 'corredor'
  | 'moradorRua'
  | 'estudante'
  | 'executivo'
  | 'enfermeiro';

export type TopKind = 'camiseta' | 'regata' | 'camisa' | 'polo' | 'moletom' | 'jaqueta' | 'casaco' | 'jaleco' | 'doma' | 'macacao' | 'uniforme' | 'camuflado' | 'terno' | 'vestido' | 'cardiga' | 'pijama' | 'scrub';
export type BottomKind = 'calca' | 'bermuda' | 'saia' | 'short';
export type HatKind = 'bone' | 'capacete' | 'capaceteObra' | 'touca' | 'chapeu' | 'quepe' | 'toucaChef' | 'lenco';
export type VestKind = 'balistico' | 'refletivo' | 'garcom';

export interface Palette {
  top: readonly number[];
  bottom: readonly number[];
}

export interface Archetype {
  label: string;
  tops: readonly TopKind[];
  bottoms: readonly BottomKind[];
  colors: Palette;
  /** Chance de cada acessório. */
  hats?: readonly { kind: HatKind; chance: number; colors?: readonly number[] }[];
  vest?: { kind: VestKind; chance: number };
  apron?: { chance: number; colors: readonly number[] };
  backpack?: number;
  glasses?: number;
  /** Idade (anos) e chance de ser mulher. */
  age: readonly [number, number];
  female: number;
  /** Porte: 0 magro … 1 pesado. */
  build: readonly [number, number];
  /** Sujeira típica (graxa, rua). */
  dirt: readonly [number, number];
  /** Tendência a correr (multiplica a chance). */
  sprint: number;
  /** Proteção das roupas: cabeça, tronco, braços, pernas (0..1, contra golpe e bala). */
  armor?: { cabeca?: number; tronco?: number; bracos?: number; pernas?: number };
}

const CASUAL_TOPS = [0x3a5a8a, 0xc8342a, 0xe8e8e0, 0x2a2a2a, 0x6a8a4a, 0xe8c84a, 0x8a4a8a, 0x3a8ab0, 0xd88a4a, 0x6a6a72, 0xa83a5a, 0x4a4a8a];
const JEANS = [0x3a5a8a, 0x2a3a5a, 0x4a6a9a, 0x2a2a2a, 0x5a5a3a, 0x8a7a6a];

export const ARCHETYPES: Record<ArchId, Archetype> = {
  morador: {
    label: 'Morador',
    tops: ['camiseta', 'camiseta', 'regata', 'camisa', 'moletom', 'pijama', 'vestido'],
    bottoms: ['calca', 'bermuda', 'short', 'calca'],
    colors: { top: CASUAL_TOPS, bottom: JEANS },
    hats: [{ kind: 'bone', chance: 0.08 }],
    glasses: 0.12,
    age: [18, 75],
    female: 0.5,
    build: [0.1, 0.9],
    dirt: [0.1, 0.4],
    sprint: 1,
  },
  idoso: {
    label: 'Idoso',
    tops: ['cardiga', 'camisa', 'pijama', 'vestido'],
    bottoms: ['calca', 'saia', 'calca'],
    colors: { top: [0x8a7a6a, 0x6a5a4a, 0xb8a888, 0x5a6a7a, 0xa87a6a, 0x7a8a7a], bottom: [0x5a5a5a, 0x6a5a4a, 0x3a3a4a, 0x8a8070] },
    hats: [{ kind: 'chapeu', chance: 0.12, colors: [0x6a5a4a, 0xd8d0c0] }],
    glasses: 0.55,
    age: [66, 90],
    female: 0.55,
    build: [0.1, 0.7],
    dirt: [0.1, 0.3],
    sprint: 0.05,
  },
  cliente: {
    label: 'Cliente',
    tops: ['camiseta', 'camisa', 'jaqueta', 'moletom', 'vestido', 'polo'],
    bottoms: ['calca', 'bermuda', 'saia'],
    colors: { top: CASUAL_TOPS, bottom: JEANS },
    backpack: 0.12,
    glasses: 0.15,
    age: [18, 70],
    female: 0.55,
    build: [0.1, 0.9],
    dirt: [0.1, 0.35],
    sprint: 1,
  },
  caixa: {
    label: 'Funcionário do mercado',
    tops: ['polo'],
    bottoms: ['calca'],
    colors: { top: [0xc8342a, 0x2a6a3a, 0x2a4a8a], bottom: [0x2a2a2a, 0x3a3a4a] },
    apron: { chance: 0.7, colors: [0xc8342a, 0x2a6a3a, 0x3a3a3a] },
    hats: [{ kind: 'bone', chance: 0.3, colors: [0xc8342a, 0x2a6a3a] }],
    age: [18, 55],
    female: 0.5,
    build: [0.1, 0.8],
    dirt: [0.1, 0.3],
    sprint: 1.1,
  },
  farmaceutico: {
    label: 'Farmacêutico',
    tops: ['jaleco'],
    bottoms: ['calca'],
    colors: { top: [0xf2f2ee], bottom: [0x2a3a5a, 0x2a2a2a, 0x6a6a72] },
    glasses: 0.4,
    age: [24, 65],
    female: 0.6,
    build: [0.1, 0.7],
    dirt: [0.05, 0.25],
    sprint: 1,
  },
  cozinheiro: {
    label: 'Cozinheiro',
    tops: ['doma'],
    bottoms: ['calca'],
    colors: { top: [0xf2f2ee, 0xe8e8e0], bottom: [0x2a2a2a, 0x4a4a4a, 0x8a8a8a] },
    apron: { chance: 0.6, colors: [0xf2f2ee, 0x2a2a2a] },
    hats: [{ kind: 'toucaChef', chance: 0.55 }, { kind: 'lenco', chance: 0.2, colors: [0x2a2a2a, 0xc8342a] }],
    age: [20, 62],
    female: 0.35,
    build: [0.3, 1],
    dirt: [0.2, 0.5],
    sprint: 0.9,
  },
  garcom: {
    label: 'Garçom',
    tops: ['camisa'],
    bottoms: ['calca'],
    colors: { top: [0xf2f2ee, 0x2a2a2a], bottom: [0x1a1a1a] },
    vest: { kind: 'garcom', chance: 0.6 },
    age: [18, 50],
    female: 0.45,
    build: [0.1, 0.6],
    dirt: [0.05, 0.25],
    sprint: 1.2,
  },
  mecanico: {
    label: 'Mecânico',
    tops: ['macacao'],
    bottoms: ['calca'],
    colors: { top: [0x3a4a6a, 0x5a5a5a, 0x2a4a3a, 0x8a4a2a], bottom: [0x3a4a6a, 0x5a5a5a] },
    hats: [{ kind: 'bone', chance: 0.35, colors: [0x2a2a2a, 0xc8342a, 0x3a4a6a] }],
    age: [20, 65],
    female: 0.1,
    build: [0.4, 1],
    dirt: [0.5, 0.95],
    sprint: 1,
    armor: { bracos: 0.1, pernas: 0.1 },
  },
  operario: {
    label: 'Operário',
    tops: ['camiseta', 'camisa', 'uniforme'],
    bottoms: ['calca'],
    colors: { top: [0x3a5a8a, 0x6a6a5a, 0xd88a2a, 0x2a2a2a], bottom: [0x5a5a3a, 0x3a3a3a, 0x3a5a8a] },
    vest: { kind: 'refletivo', chance: 0.75 },
    hats: [{ kind: 'capaceteObra', chance: 0.6, colors: [0xe8c83a, 0xf2f2ee, 0xe8762a] }],
    age: [20, 62],
    female: 0.08,
    build: [0.5, 1],
    dirt: [0.4, 0.85],
    sprint: 1,
    armor: { cabeca: 0.35 },
  },
  vendedora: {
    label: 'Vendedora',
    tops: ['vestido', 'camisa', 'camiseta', 'jaqueta'],
    bottoms: ['saia', 'calca'],
    colors: { top: [0xe84a8a, 0xf2f2ee, 0x2a2a2a, 0x8a4ab0, 0xe8c84a, 0x3ab0a0], bottom: [0x2a2a2a, 0x3a5a8a, 0xc8a0a0] },
    glasses: 0.1,
    age: [18, 45],
    female: 0.85,
    build: [0.05, 0.5],
    dirt: [0.05, 0.25],
    sprint: 1.2,
  },
  policial: {
    label: 'Policial',
    tops: ['uniforme'],
    bottoms: ['calca'],
    colors: { top: [0x2a3a5a], bottom: [0x2a3a5a] },
    vest: { kind: 'balistico', chance: 0.85 },
    hats: [{ kind: 'quepe', chance: 0.4, colors: [0x2a3a5a] }],
    age: [22, 55],
    female: 0.2,
    build: [0.4, 0.95],
    dirt: [0.1, 0.4],
    sprint: 1.3,
    armor: { tronco: 0.55 },
  },
  militar: {
    label: 'Militar',
    tops: ['camuflado'],
    bottoms: ['calca'],
    colors: { top: [0x4a5a3a, 0x5a6a4a], bottom: [0x4a5a3a] },
    vest: { kind: 'balistico', chance: 0.9 },
    hats: [{ kind: 'capacete', chance: 0.8, colors: [0x4a5a3a] }],
    backpack: 0.5,
    age: [19, 40],
    female: 0.1,
    build: [0.5, 0.95],
    dirt: [0.3, 0.7],
    sprint: 1.8,
    armor: { cabeca: 0.6, tronco: 0.6 },
  },
  corredor: {
    label: 'Corredor',
    tops: ['regata', 'camiseta'],
    bottoms: ['short'],
    colors: { top: [0xe8e03a, 0x3ab0e8, 0xe84a4a, 0xf2f2ee, 0x2a2a2a], bottom: [0x2a2a2a, 0x3a3a5a] },
    hats: [{ kind: 'bone', chance: 0.2 }],
    age: [18, 45],
    female: 0.45,
    build: [0, 0.4],
    dirt: [0.05, 0.3],
    sprint: 3,
  },
  moradorRua: {
    label: 'Morador de rua',
    tops: ['casaco', 'moletom', 'jaqueta'],
    bottoms: ['calca'],
    colors: { top: [0x5a4a3a, 0x4a4a4a, 0x6a5a3a, 0x3a3a2a], bottom: [0x4a4a3a, 0x3a3a3a] },
    hats: [{ kind: 'touca', chance: 0.5, colors: [0x5a3a2a, 0x3a3a4a, 0x8a2a2a] }],
    backpack: 0.4,
    age: [25, 70],
    female: 0.2,
    build: [0, 0.4],
    dirt: [0.7, 1],
    sprint: 0.6,
  },
  estudante: {
    label: 'Estudante',
    tops: ['camiseta', 'moletom', 'jaqueta'],
    bottoms: ['calca', 'bermuda'],
    colors: { top: CASUAL_TOPS, bottom: JEANS },
    backpack: 0.75,
    hats: [{ kind: 'bone', chance: 0.15 }],
    glasses: 0.15,
    age: [17, 26],
    female: 0.5,
    build: [0, 0.6],
    dirt: [0.1, 0.35],
    sprint: 1.6,
  },
  executivo: {
    label: 'Executivo',
    tops: ['terno', 'camisa'],
    bottoms: ['calca', 'saia'],
    colors: { top: [0x2a2a2a, 0x3a3a4a, 0x4a4a5a, 0xf2f2ee], bottom: [0x2a2a2a, 0x3a3a4a] },
    glasses: 0.3,
    age: [25, 65],
    female: 0.4,
    build: [0.2, 0.9],
    dirt: [0.05, 0.25],
    sprint: 0.9,
  },
  enfermeiro: {
    label: 'Enfermeiro',
    tops: ['scrub'],
    bottoms: ['calca'],
    colors: { top: [0x3a8a8a, 0x3a6ab0, 0x7ab0c8], bottom: [0x3a8a8a, 0x3a6ab0] },
    hats: [{ kind: 'touca', chance: 0.2, colors: [0x3a8a8a] }],
    age: [22, 60],
    female: 0.7,
    build: [0.1, 0.7],
    dirt: [0.1, 0.4],
    sprint: 1.1,
  },
};

/** Quem costuma estar em cada tipo de prédio (peso). */
export const ARCH_BY_BUILDING: Record<BuildingKind, readonly (readonly [ArchId, number])[]> = {
  house: [['morador', 8], ['idoso', 2.5], ['estudante', 1]],
  store: [['cliente', 6], ['caixa', 3], ['idoso', 0.8], ['executivo', 0.5]],
  pharmacy: [['cliente', 4], ['farmaceutico', 3], ['idoso', 1.5], ['enfermeiro', 0.5]],
  restaurant: [['cliente', 4], ['cozinheiro', 2.5], ['garcom', 2.5]],
  clothing: [['cliente', 4], ['vendedora', 3], ['estudante', 1]],
  garage: [['mecanico', 6], ['cliente', 1]],
  warehouse: [['operario', 6], ['mecanico', 1]],
  shelter: [],
};

/** Na rua: gente de todo tipo (os uniformizados são raros). */
export const ARCH_STREET: readonly (readonly [ArchId, number])[] = [
  ['morador', 10],
  ['cliente', 5],
  ['estudante', 3],
  ['executivo', 2],
  ['corredor', 1.6],
  ['moradorRua', 1.6],
  ['idoso', 2],
  ['operario', 1],
  ['enfermeiro', 0.6],
  ['policial', 0.8],
  ['militar', 0.2],
];
