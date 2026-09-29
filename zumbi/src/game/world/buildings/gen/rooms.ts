/**
 * CÔMODOS (dados): o chão de cada tipo de cômodo e as REGRAS de mobília.
 * Uma regra diz o quê (tipo ou lista para sortear), ONDE (encostado na
 * parede, no canto, no meio, em fileiras, ao lado de outro, em volta de
 * uma mesa, espalhado), quantos, com que chance e para que riqueza.
 * Assim uma oficina parece oficina, um mercado tem corredores e a casa
 * rica tem mais (e melhores) coisas que a pobre — sem planta fixa.
 *
 * O nome do cômodo aparece para o jogador e decide o loot (loot/rules.ts).
 */
import { Ground, type GroundId } from '../../MapTypes';
import type { PropType } from '../../PropCatalog';

export type Anchor =
  /** Encostado numa parede qualquer (costas na parede). */
  | 'wall'
  /** Encostado, perto de um canto. */
  | 'corner'
  /** Encostado na parede da frente (rua) ou na do fundo. */
  | 'front'
  | 'back'
  /** No meio do cômodo. */
  | 'center'
  /** Fileiras paralelas com corredor entre elas (prateleiras, porta-paletes). */
  | 'rows'
  /** Grade (carteiras, bancos de igreja, mesas de refeitório). */
  | 'grid'
  /** Ao lado do último móvel de `of` (criado-mudo ao lado da cama). */
  | 'beside'
  /** Em volta do último móvel de `of` (cadeiras em volta da mesa). */
  | 'around'
  /** Espalhado onde couber (caixas, lixo, pneus). */
  | 'scatter';

export interface FurnRule {
  t: PropType | readonly PropType[];
  a: Anchor;
  /** Quantidade (mín, máx). Padrão 1. */
  n?: readonly [number, number];
  /** Chance da regra valer. Padrão 1. */
  p?: number;
  /** Riqueza em que vale (0 pobre, 1 médio, 2 rico). */
  w?: readonly [number, number];
  /** beside/around: em relação a qual móvel. */
  of?: readonly PropType[];
  /** rows/grid: corredor entre fileiras (tiles). */
  gap?: number;
  /** Gira um pouco (lixo, caixa largada). */
  jitter?: number;
}

export interface RoomDef {
  /** Chão por riqueza [pobre, médio, rico]. */
  ground: readonly [GroundId, GroundId, GroundId];
  rules: readonly FurnRule[];
  /**
   * Miudezas espalhadas no que sobrar (caixas, lixo, cadeiras largadas):
   * uma a cada `per` tiles² do cômodo. Dá densidade sem tapar passagem.
   */
  clutter?: { t: readonly PropType[]; per: number };
  /** Cômodo pequeno de serviço: janela pequena (ou nenhuma). */
  smallWindow?: boolean;
  noWindow?: boolean;
}

const G = Ground;
const same = (g: GroundId): readonly [GroundId, GroundId, GroundId] => [g, g, g];

export const ROOMS = {
  Sala: {
    ground: [G.Concrete, G.WoodFloor, G.WoodFloor],
    clutter: { t: ['box', 'boxes', 'chair', 'trashBags', 'crate'], per: 4.2 },
    rules: [
      { t: 'rug', a: 'center', p: 0.7, w: [1, 2] },
      { t: 'sofa', a: 'wall', p: 0.9 },
      { t: 'coffeeTable', a: 'center', p: 0.7 },
      { t: 'tvStand', a: 'wall', p: 0.85 },
      { t: 'armchair', a: 'wall', n: [0, 2] },
      { t: 'armchair', a: 'corner', p: 0.5, w: [2, 2] },
      { t: 'cabinet', a: 'wall', n: [1, 2] },
      { t: ['nightstand', 'cabinet'], a: 'corner', p: 0.5 },
      { t: ['box', 'boxes'], a: 'scatter', n: [0, 2], jitter: 25 },
    ],
  },
  'Sala de jantar': {
    ground: [G.WoodFloor, G.WoodFloor, G.Carpet],
    clutter: { t: ['chair', 'box'], per: 6.3 },
    rules: [
      { t: 'rug', a: 'center', p: 0.6 },
      { t: 'diningTable', a: 'center' },
      { t: 'chair', a: 'around', of: ['diningTable'], n: [4, 6] },
      { t: 'cabinet', a: 'wall', n: [1, 3] },
      { t: 'tvStand', a: 'wall', p: 0.4 },
    ],
  },
  Cozinha: {
    ground: same(G.TileFloor),
    clutter: { t: ['box', 'trashBags', 'trashCan', 'crate'], per: 3.5 },
    rules: [
      { t: 'fridge', a: 'corner', p: 0.95 },
      { t: 'stove', a: 'wall', p: 0.95 },
      { t: 'kitchenCounter', a: 'wall', n: [1, 2] },
      { t: 'cabinet', a: 'wall', n: [1, 3] },
      { t: 'diningTable', a: 'center', p: 0.55 },
      { t: 'chair', a: 'around', of: ['diningTable'], n: [2, 4] },
      { t: 'trashCan', a: 'corner', p: 0.6 },
      { t: ['box', 'trashBags'], a: 'scatter', n: [0, 2], jitter: 30 },
    ],
  },
  Quarto: {
    ground: [G.Concrete, G.WoodFloor, G.Carpet],
    clutter: { t: ['box', 'boxes', 'crate', 'chair'], per: 3.5 },
    rules: [
      { t: 'rug', a: 'center', p: 0.5, w: [1, 2] },
      { t: 'bedSingle', a: 'wall', w: [0, 0] },
      { t: ['bedDouble', 'bedSingle'], a: 'wall', w: [1, 1] },
      { t: 'bedDouble', a: 'wall', w: [2, 2] },
      { t: 'nightstand', a: 'beside', of: ['bedDouble', 'bedSingle'], n: [1, 2] },
      { t: 'wardrobe', a: 'wall', p: 0.9 },
      { t: 'cabinet', a: 'wall', n: [0, 2] },
      { t: 'desk', a: 'wall', p: 0.45 },
      { t: 'chair', a: 'beside', of: ['desk'], p: 0.8 },
      { t: ['box', 'boxes', 'crate'], a: 'scatter', n: [0, 2], jitter: 25 },
    ],
  },
  'Quarto de criança': {
    ground: [G.WoodFloor, G.Carpet, G.Carpet],
    clutter: { t: ['box', 'boxes', 'crate'], per: 2.8 },
    rules: [
      { t: 'rug', a: 'center', p: 0.8 },
      { t: 'bedSingle', a: 'wall', n: [1, 2] },
      { t: 'nightstand', a: 'beside', of: ['bedSingle'], p: 0.7 },
      { t: 'wardrobe', a: 'wall', p: 0.8 },
      { t: 'desk', a: 'wall', p: 0.5 },
      { t: ['box', 'boxes'], a: 'scatter', n: [1, 3], jitter: 30 },
    ],
  },
  Banheiro: {
    ground: same(G.TileFloor),
    smallWindow: true,
    clutter: { t: ['box'], per: 7.0 },
    rules: [
      { t: 'toilet', a: 'corner' },
      { t: 'bathSink', a: 'wall' },
      { t: 'bathtub', a: 'wall', p: 0.55, w: [1, 2] },
      { t: 'cabinet', a: 'wall', p: 0.55 },
    ],
  },
  'Área de serviço': {
    ground: same(G.Concrete),
    smallWindow: true,
    clutter: { t: ['box', 'boxes', 'trashBags', 'drum'], per: 2.4 },
    rules: [
      { t: 'bathSink', a: 'wall', p: 0.7 },
      { t: 'cabinet', a: 'wall', n: [1, 2] },
      { t: ['boxes', 'box', 'trashBags'], a: 'scatter', n: [1, 3], jitter: 30 },
      { t: 'drum', a: 'corner', p: 0.3 },
    ],
  },
  Escritório: {
    ground: [G.WoodFloor, G.WoodFloor, G.Carpet],
    clutter: { t: ['boxes', 'box', 'chair', 'trashCan'], per: 3.5 },
    rules: [
      { t: 'desk', a: 'wall', n: [1, 2] },
      { t: 'chair', a: 'beside', of: ['desk'], n: [1, 2] },
      { t: 'cabinet', a: 'wall', n: [1, 3] },
      { t: 'toolShelf', a: 'wall', p: 0.3 },
      { t: ['boxes', 'box'], a: 'scatter', n: [1, 3], jitter: 20 },
      { t: 'trashCan', a: 'corner', p: 0.5 },
    ],
  },
  Corredor: {
    ground: [G.Concrete, G.WoodFloor, G.WoodFloor],
    clutter: { t: ['box', 'trashBags'], per: 5.6 },
    rules: [
      { t: 'rug', a: 'center', p: 0.75 },
      { t: 'cabinet', a: 'wall', n: [0, 2] },
      { t: ['box', 'trashBags'], a: 'scatter', n: [0, 1], jitter: 30 },
    ],
  },
  Garagem: {
    ground: same(G.GarageFloor),
    noWindow: true,
    clutter: { t: ['tire', 'drum', 'boxes', 'crate', 'box', 'tireStack'], per: 2.4 },
    rules: [
      { t: ['car', 'carWreck'], a: 'center', p: 0.55 },
      { t: 'workbench', a: 'wall', p: 0.6 },
      { t: 'toolShelf', a: 'wall', n: [1, 2] },
      { t: ['tireStack', 'tire', 'drum'], a: 'scatter', n: [1, 3], jitter: 20 },
      { t: ['boxes', 'crate', 'box'], a: 'scatter', n: [1, 3], jitter: 20 },
    ],
  },
  Despensa: {
    ground: same(G.Concrete),
    noWindow: true,
    clutter: { t: ['box', 'boxes', 'crate'], per: 1.8 },
    rules: [
      { t: 'cabinet', a: 'wall', n: [2, 3] },
      { t: 'storeShelf', a: 'wall', p: 0.4 },
      { t: ['boxes', 'box', 'crate'], a: 'scatter', n: [1, 3], jitter: 15 },
    ],
  },
  // ---------------------------------------------------------------- comércio
  Salão: {
    ground: [G.TileFloor, G.TileFloor, G.TileFloor],
    clutter: { t: ['box', 'boxes', 'cart', 'crate'], per: 5.6 },
    rules: [
      { t: 'checkout', a: 'front', n: [1, 2] },
      { t: 'storeShelf', a: 'rows', gap: 1.5 },
      { t: 'displayFridge', a: 'back', n: [1, 2], p: 0.8 },
      { t: 'cabinet', a: 'wall', n: [0, 2] },
      { t: ['cart', 'box', 'boxes'], a: 'scatter', n: [1, 4], jitter: 40 },
    ],
  },
  Estoque: {
    ground: same(G.Concrete),
    noWindow: true,
    clutter: { t: ['box', 'boxes', 'crate', 'pallet', 'drum'], per: 2.0 },
    rules: [
      { t: ['storeShelf', 'toolShelf'], a: 'rows', gap: 1.3 },
      { t: ['boxes', 'crate', 'box'], a: 'scatter', n: [2, 5], jitter: 20 },
      { t: 'pallet', a: 'scatter', n: [0, 2] },
      { t: 'cabinet', a: 'wall', p: 0.5 },
    ],
  },
  Depósito: {
    ground: same(G.Concrete),
    smallWindow: true,
    clutter: { t: ['box', 'boxes', 'crate', 'drum', 'tire', 'pallet'], per: 2.0 },
    rules: [
      { t: 'toolShelf', a: 'wall', n: [1, 2] },
      { t: ['boxes', 'crate', 'box', 'drum'], a: 'scatter', n: [2, 5], jitter: 20 },
      { t: 'pallet', a: 'scatter', n: [0, 1] },
      { t: 'cabinet', a: 'wall', p: 0.5 },
    ],
  },
  // ---------------------------------------------------------------- trabalho
  Oficina: {
    ground: same(G.GarageFloor),
    clutter: { t: ['tire', 'tireStack', 'drum', 'crate', 'boxes', 'box'], per: 3.1 },
    rules: [
      { t: ['car', 'carWreck'], a: 'center', n: [0, 2] },
      { t: 'workbench', a: 'wall', n: [1, 3] },
      { t: 'toolShelf', a: 'wall', n: [1, 3] },
      { t: 'cabinet', a: 'wall', n: [0, 2] },
      { t: ['tireStack', 'tire', 'drum'], a: 'scatter', n: [2, 5], jitter: 25 },
      { t: ['crate', 'boxes', 'box'], a: 'scatter', n: [1, 3], jitter: 20 },
    ],
  },
  Galpão: {
    ground: same(G.GarageFloor),
    clutter: { t: ['crate', 'boxes', 'pallet', 'drum', 'cart', 'box'], per: 2.8 },
    rules: [
      { t: ['storeShelf', 'toolShelf'], a: 'rows', gap: 1.8 },
      { t: 'pallet', a: 'scatter', n: [2, 5] },
      { t: ['crate', 'boxes'], a: 'scatter', n: [3, 7], jitter: 15 },
      { t: ['drum', 'cart', 'tireStack'], a: 'scatter', n: [1, 4], jitter: 20 },
    ],
  },
  Vestiário: {
    ground: same(G.TileFloor),
    smallWindow: true,
    clutter: { t: ['box', 'trashBags'], per: 4.9 },
    rules: [
      { t: 'cabinet', a: 'wall', n: [2, 4] },
      { t: 'bench', a: 'center', p: 0.7 },
      { t: 'bathSink', a: 'wall', p: 0.6 },
    ],
  },
  Refeitório: {
    ground: same(G.TileFloor),
    clutter: { t: ['chair', 'trashCan', 'box'], per: 6.3 },
    rules: [
      { t: 'diningTable', a: 'grid', gap: 1.4 },
      { t: 'chair', a: 'around', of: ['diningTable'], n: [2, 6] },
      { t: 'kitchenCounter', a: 'wall', p: 0.8 },
      { t: 'fridge', a: 'corner', p: 0.7 },
      { t: 'trashCan', a: 'corner', p: 0.7 },
    ],
  },
  'Cozinha industrial': {
    ground: same(G.TileFloor),
    clutter: { t: ['box', 'boxes', 'trashBags', 'crate'], per: 3.5 },
    rules: [
      { t: 'stove', a: 'wall', n: [1, 3] },
      { t: 'kitchenCounter', a: 'wall', n: [1, 3] },
      { t: 'fridge', a: 'corner', n: [1, 2] },
      { t: 'cabinet', a: 'wall', n: [1, 3] },
      { t: ['boxes', 'box', 'trashBags'], a: 'scatter', n: [1, 3], jitter: 25 },
    ],
  },
  Recepção: {
    ground: same(G.TileFloor),
    clutter: { t: ['chair', 'box', 'trashCan'], per: 4.9 },
    rules: [
      { t: 'checkout', a: 'wall', p: 0.8 },
      { t: 'desk', a: 'wall', p: 0.5 },
      { t: 'chair', a: 'wall', n: [2, 5] },
      { t: 'cabinet', a: 'corner', n: [1, 2] },
      { t: 'trashCan', a: 'corner', p: 0.6 },
    ],
  },
  // ---------------------------------------------------------------- serviços
  Nave: {
    ground: [G.Concrete, G.WoodFloor, G.TileFloor],
    clutter: { t: ['box', 'chair'], per: 8.4 },
    rules: [
      { t: 'bench', a: 'grid', gap: 1.1 },
      { t: 'desk', a: 'back', p: 0.8 },
      { t: 'cabinet', a: 'corner', n: [1, 2] },
      { t: 'rug', a: 'center', p: 0.4, w: [1, 2] },
    ],
  },
  'Sala de aula': {
    ground: [G.Concrete, G.TileFloor, G.WoodFloor],
    clutter: { t: ['box', 'boxes', 'chair'], per: 6.3 },
    rules: [
      { t: 'desk', a: 'back', p: 0.9 },
      { t: 'chair', a: 'grid', gap: 0.9 },
      { t: 'cabinet', a: 'corner', n: [1, 2] },
      { t: 'toolShelf', a: 'wall', p: 0.4 },
      { t: ['box', 'boxes'], a: 'scatter', n: [0, 2], jitter: 25 },
    ],
  },
  Consultório: {
    ground: same(G.TileFloor),
    clutter: { t: ['box', 'boxes'], per: 4.9 },
    rules: [
      { t: 'bedSingle', a: 'wall' },
      { t: 'desk', a: 'wall' },
      { t: 'chair', a: 'beside', of: ['desk'], n: [1, 2] },
      { t: 'cabinet', a: 'wall', n: [1, 3] },
      { t: 'bathSink', a: 'wall', p: 0.6 },
    ],
  },
  Enfermaria: {
    ground: same(G.TileFloor),
    clutter: { t: ['box', 'boxes', 'trashCan'], per: 4.9 },
    rules: [
      { t: 'bedSingle', a: 'grid', gap: 1.2 },
      { t: 'cabinet', a: 'wall', n: [1, 3] },
      { t: 'nightstand', a: 'wall', n: [1, 2] },
    ],
  },
} as const satisfies Record<string, RoomDef>;

export type RoomKind = keyof typeof ROOMS;

export function roomDef(kind: RoomKind): RoomDef {
  return ROOMS[kind];
}
