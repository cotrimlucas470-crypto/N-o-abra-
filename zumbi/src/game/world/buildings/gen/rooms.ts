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
  /**
   * Completar as paredes livres com o que é típico do cômodo (armário,
   * prateleira, estante): um a cada `per` tiles² — densidade encostada, não no meio.
   */
  fill?: { t: readonly PropType[]; per: number };
  /** Cômodo pequeno de serviço: janela pequena (ou nenhuma). */
  smallWindow?: boolean;
  noWindow?: boolean;
}

const G = Ground;
const same = (g: GroundId): readonly [GroundId, GroundId, GroundId] => [g, g, g];

export const ROOMS = {
  Sala: {
    fill: { t: ['cabinet', 'wallShelf', 'plantPot', 'sideTable', 'bookshelf'], per: 4.2 },
    ground: [G.Concrete, G.WoodFloor, G.WoodFloor],
    clutter: { t: ['box', 'boxes', 'chair', 'trashBags', 'crate', 'plantPot'], per: 3.2 },
    rules: [
      { t: 'rug', a: 'center', p: 0.7, w: [1, 2] },
      { t: 'sofa', a: 'wall', p: 0.9 },
      { t: 'coffeeTable', a: 'center', p: 0.7 },
      { t: 'tvStand', a: 'wall', p: 0.85 },
      { t: 'armchair', a: 'wall', n: [0, 2] },
      { t: 'armchair', a: 'corner', p: 0.5, w: [2, 2] },
      { t: 'bookshelf', a: 'wall', p: 0.5, w: [1, 2] },
      { t: 'cabinet', a: 'wall', n: [1, 2] },
      { t: 'plantPot', a: 'corner', n: [0, 2], w: [1, 2] },
      { t: 'shoeRack', a: 'wall', p: 0.35 },
      { t: 'chest', a: 'wall', p: 0.25, w: [0, 1] },
      { t: 'sideTable', a: 'beside', of: ['sofa'], p: 0.5 },
      { t: 'floorLamp', a: 'corner', p: 0.5, w: [1, 2] },
      { t: 'wallShelf', a: 'wall', p: 0.35 },
      { t: 'coatRack', a: 'corner', p: 0.3 },
      { t: ['nightstand', 'cabinet'], a: 'corner', p: 0.5 },
      { t: ['box', 'boxes'], a: 'scatter', n: [0, 2], jitter: 25 },
    ],
  },
  'Sala de jantar': {
    fill: { t: ['cabinet', 'sideTable', 'plantPot', 'dresser'], per: 4.2 },
    ground: [G.WoodFloor, G.WoodFloor, G.Carpet],
    clutter: { t: ['chair', 'box', 'plantPot'], per: 4.5 },
    rules: [
      { t: 'rug', a: 'center', p: 0.6 },
      { t: 'diningTable', a: 'center' },
      { t: 'chair', a: 'around', of: ['diningTable'], n: [4, 6] },
      { t: 'dresser', a: 'wall', p: 0.5 },
      { t: 'cabinet', a: 'wall', n: [1, 3] },
      { t: 'plantPot', a: 'corner', p: 0.5 },
      { t: 'tvStand', a: 'wall', p: 0.4 },
      { t: 'sideTable', a: 'wall', p: 0.3 },
      { t: 'floorLamp', a: 'corner', p: 0.3, w: [1, 2] },
    ],
  },
  Cozinha: {
    fill: { t: ['cabinet', 'wallShelf', 'kitchenCounter', 'trashCan'], per: 2.8 },
    ground: same(G.TileFloor),
    clutter: { t: ['box', 'trashBags', 'trashCan', 'crate'], per: 2.8 },
    rules: [
      { t: 'fridge', a: 'corner', p: 0.95 },
      { t: 'stove', a: 'wall', p: 0.95 },
      { t: 'kitchenCounter', a: 'wall', n: [1, 2] },
      { t: 'cabinet', a: 'wall', n: [1, 3] },
      { t: 'freezer', a: 'wall', p: 0.25, w: [1, 2] },
      { t: 'stool', a: 'beside', of: ['kitchenCounter'], n: [0, 2] },
      { t: 'wallShelf', a: 'wall', p: 0.4 },
      { t: 'washer', a: 'wall', p: 0.2 },
      { t: 'diningTable', a: 'center', p: 0.55 },
      { t: 'chair', a: 'around', of: ['diningTable'], n: [2, 4] },
      { t: 'trashCan', a: 'corner', p: 0.6 },
      { t: ['box', 'trashBags'], a: 'scatter', n: [0, 2], jitter: 30 },
    ],
  },
  Quarto: {
    fill: { t: ['cabinet', 'wallShelf', 'dresser', 'laundryBasket', 'box'], per: 3.5 },
    ground: [G.Concrete, G.WoodFloor, G.Carpet],
    clutter: { t: ['box', 'boxes', 'crate', 'chair'], per: 3.0 },
    rules: [
      { t: 'rug', a: 'center', p: 0.5, w: [1, 2] },
      { t: 'bedSingle', a: 'wall', w: [0, 0] },
      { t: ['bedDouble', 'bedSingle'], a: 'wall', w: [1, 1] },
      { t: 'bedDouble', a: 'wall', w: [2, 2] },
      { t: 'nightstand', a: 'beside', of: ['bedDouble', 'bedSingle'], n: [1, 2] },
      { t: 'wardrobe', a: 'wall', p: 0.9 },
      { t: 'dresser', a: 'wall', p: 0.6 },
      { t: 'cabinet', a: 'wall', n: [0, 2] },
      { t: 'desk', a: 'wall', p: 0.45 },
      { t: 'chair', a: 'beside', of: ['desk'], p: 0.8 },
      { t: 'bookshelf', a: 'wall', p: 0.25 },
      { t: 'chest', a: 'wall', p: 0.25 },
      { t: 'shoeRack', a: 'wall', p: 0.3 },
      { t: 'ironingBoard', a: 'wall', p: 0.15 },
      { t: 'laundryBasket', a: 'corner', p: 0.45 },
      { t: 'floorLamp', a: 'corner', p: 0.35, w: [1, 2] },
      { t: 'wallShelf', a: 'wall', p: 0.3 },
      { t: 'coatRack', a: 'corner', p: 0.25 },
      { t: 'plantPot', a: 'corner', p: 0.3, w: [2, 2] },
      { t: ['box', 'boxes', 'crate'], a: 'scatter', n: [0, 2], jitter: 25 },
    ],
  },
  'Quarto de criança': {
    fill: { t: ['toyBox', 'wallShelf', 'bookshelf', 'box'], per: 3.5 },
    ground: [G.WoodFloor, G.Carpet, G.Carpet],
    clutter: { t: ['box', 'boxes', 'crate'], per: 2.6 },
    rules: [
      { t: 'rug', a: 'center', p: 0.8 },
      { t: 'bunkBed', a: 'wall', p: 0.45 },
      { t: 'bedSingle', a: 'wall', n: [1, 2] },
      { t: 'crib', a: 'wall', p: 0.2 },
      { t: 'nightstand', a: 'beside', of: ['bedSingle', 'bunkBed'], p: 0.7 },
      { t: 'wardrobe', a: 'wall', p: 0.7 },
      { t: 'dresser', a: 'wall', p: 0.4 },
      { t: 'bookshelf', a: 'wall', p: 0.5 },
      { t: 'chest', a: 'wall', p: 0.45 },
      { t: 'toyBox', a: 'wall', p: 0.7 },
      { t: 'wallShelf', a: 'wall', p: 0.4 },
      { t: 'desk', a: 'wall', p: 0.4 },
      { t: 'chair', a: 'beside', of: ['desk'], p: 0.7 },
      { t: ['box', 'boxes'], a: 'scatter', n: [1, 3], jitter: 30 },
    ],
  },
  Banheiro: {
    fill: { t: ['cabinet', 'wallShelf'], per: 4.2 },
    ground: same(G.TileFloor),
    smallWindow: true,
    clutter: { t: ['box', 'trashCan'], per: 7.0 },
    rules: [
      { t: 'toilet', a: 'corner' },
      { t: 'bathSink', a: 'wall' },
      { t: 'bathtub', a: 'wall', p: 0.4, w: [1, 2] },
      { t: 'shower', a: 'corner', p: 0.6 },
      { t: 'medCabinet', a: 'wall', p: 0.3 },
      { t: 'laundryBasket', a: 'corner', p: 0.35 },
      { t: 'wallShelf', a: 'wall', p: 0.25 },
      { t: 'cabinet', a: 'wall', p: 0.4 },
      { t: 'trashCan', a: 'corner', p: 0.4 },
    ],
  },
  'Área de serviço': {
    fill: { t: ['cabinet', 'wallShelf', 'laundryBasket'], per: 2.8 },
    ground: same(G.Concrete),
    smallWindow: true,
    clutter: { t: ['box', 'boxes', 'trashBags', 'drum'], per: 2.4 },
    rules: [
      { t: 'washer', a: 'wall', p: 0.85 },
      { t: 'laundrySink', a: 'wall', p: 0.8 },
      { t: 'ironingBoard', a: 'wall', p: 0.3 },
      { t: 'laundryBasket', a: 'corner', n: [1, 2] },
      { t: 'wallShelf', a: 'wall', p: 0.5 },
      { t: 'cabinet', a: 'wall', n: [1, 2] },
      { t: ['boxes', 'box', 'trashBags'], a: 'scatter', n: [1, 3], jitter: 30 },
      { t: 'drum', a: 'corner', p: 0.25 },
    ],
  },
  Escritório: {
    fill: { t: ['fileCabinet', 'cabinet', 'wallShelf', 'bookshelf'], per: 3.5 },
    ground: [G.WoodFloor, G.WoodFloor, G.Carpet],
    clutter: { t: ['boxes', 'box', 'chair', 'trashCan'], per: 3.0 },
    rules: [
      { t: 'desk', a: 'wall', n: [1, 2] },
      { t: 'chair', a: 'beside', of: ['desk'], n: [1, 2] },
      { t: 'fileCabinet', a: 'wall', n: [1, 2] },
      { t: 'bookshelf', a: 'wall', p: 0.6 },
      { t: 'cabinet', a: 'wall', n: [0, 2] },
      { t: 'plantPot', a: 'corner', p: 0.5, w: [1, 2] },
      { t: ['boxes', 'box'], a: 'scatter', n: [1, 3], jitter: 20 },
      { t: 'floorLamp', a: 'corner', p: 0.3 },
      { t: 'wallShelf', a: 'wall', p: 0.4 },
      { t: 'coatRack', a: 'corner', p: 0.3 },
      { t: 'trashCan', a: 'corner', p: 0.5 },
    ],
  },
  Corredor: {
    fill: { t: ['plantPot', 'shoeRack', 'sideTable', 'coatRack'], per: 3.5 },
    ground: [G.Concrete, G.WoodFloor, G.WoodFloor],
    clutter: { t: ['box', 'trashBags', 'plantPot'], per: 5.0 },
    rules: [
      { t: 'rug', a: 'center', p: 0.75 },
      { t: 'shoeRack', a: 'wall', p: 0.4 },
      { t: 'plantPot', a: 'corner', p: 0.4 },
      { t: 'coatRack', a: 'corner', p: 0.4 },
      { t: 'sideTable', a: 'wall', p: 0.3 },
      { t: 'cabinet', a: 'wall', n: [0, 1] },
      { t: 'bookshelf', a: 'wall', p: 0.3 },
      { t: ['box', 'trashBags'], a: 'scatter', n: [0, 1], jitter: 30 },
    ],
  },
  Garagem: {
    fill: { t: ['toolShelf', 'wallShelf', 'drum', 'tireStack', 'crate'], per: 2.8 },
    ground: same(G.GarageFloor),
    noWindow: true,
    clutter: { t: ['tire', 'drum', 'boxes', 'box'], per: 4 },
    rules: [
      // Encostado: sobra a passagem da porta da rua até a porta da casa.
      { t: ['car', 'carWreck'], a: 'wall', p: 0.6 },
      { t: 'workbench', a: 'wall', p: 0.6 },
      { t: 'toolShelf', a: 'wall', n: [1, 2] },
      { t: 'toolbox', a: 'wall', p: 0.5 },
      { t: 'compressor', a: 'corner', p: 0.25 },
      { t: 'wallShelf', a: 'wall', p: 0.5 },
      { t: 'stool', a: 'beside', of: ['workbench'], p: 0.4 },
      { t: 'freezer', a: 'wall', p: 0.2 },
      { t: ['tireStack', 'drum'], a: 'wall', n: [1, 2] },
      { t: ['boxes', 'crate'], a: 'corner', n: [1, 2] },
      { t: 'tire', a: 'scatter', n: [0, 2], jitter: 20 },
    ],
  },
  Despensa: {
    fill: { t: ['cabinet', 'storeShelf', 'wallShelf'], per: 2.1 },
    ground: same(G.Concrete),
    noWindow: true,
    clutter: { t: ['box', 'boxes', 'crate'], per: 1.6 },
    rules: [
      { t: 'cabinet', a: 'wall', n: [2, 3] },
      { t: 'storeShelf', a: 'wall', p: 0.4 },
      { t: 'freezer', a: 'wall', p: 0.3 },
      { t: ['boxes', 'box', 'crate'], a: 'scatter', n: [1, 3], jitter: 15 },
    ],
  },
  // ---------------------------------------------------------------- comércio
  Salão: {
    fill: { t: ['storeShelf', 'displayFridge'], per: 8.4 },
    ground: [G.TileFloor, G.TileFloor, G.TileFloor],
    clutter: { t: ['box', 'boxes', 'cart'], per: 14 },
    rules: [
      { t: 'checkout', a: 'front', n: [1, 2] },
      { t: 'storeShelf', a: 'rows', gap: 1.5 },
      { t: 'displayFridge', a: 'back', n: [1, 2], p: 0.8 },
      { t: 'storeShelf', a: 'wall', n: [1, 2] },
      { t: 'cabinet', a: 'wall', n: [0, 2] },
      { t: 'cart', a: 'scatter', n: [1, 2], jitter: 40 },
    ],
  },
  Estoque: {
    fill: { t: ['storeShelf', 'boxes', 'crate'], per: 2.8 },
    ground: same(G.Concrete),
    noWindow: true,
    clutter: { t: ['box', 'boxes', 'crate'], per: 4 },
    rules: [
      { t: ['storeShelf', 'toolShelf', 'palletRack'], a: 'rows', gap: 1.3 },
      { t: ['storeShelf', 'toolShelf'], a: 'wall', n: [1, 2] },
      { t: ['boxes', 'crate'], a: 'wall', n: [2, 4] },
      { t: 'pallet', a: 'wall', n: [0, 2] },
      { t: 'cabinet', a: 'wall', p: 0.5 },
    ],
  },
  Depósito: {
    fill: { t: ['toolShelf', 'crate', 'boxes', 'drum'], per: 2.8 },
    ground: same(G.Concrete),
    smallWindow: true,
    clutter: { t: ['box', 'boxes', 'crate', 'drum', 'tire'], per: 3.5 },
    rules: [
      { t: 'toolShelf', a: 'wall', n: [1, 2] },
      { t: 'palletRack', a: 'wall', p: 0.3 },
      { t: ['boxes', 'crate', 'drum'], a: 'wall', n: [2, 4] },
      { t: ['box', 'boxes'], a: 'corner', n: [1, 2] },
      { t: 'pallet', a: 'wall', n: [0, 1] },
      { t: 'cabinet', a: 'wall', p: 0.5 },
    ],
  },
  // ---------------------------------------------------------------- trabalho
  Oficina: {
    fill: { t: ['toolShelf', 'toolbox', 'drum', 'tireStack', 'wallShelf'], per: 3.5 },
    ground: same(G.GarageFloor),
    clutter: { t: ['tire', 'drum', 'box'], per: 6 },
    rules: [
      { t: ['car', 'carWreck'], a: 'center', n: [0, 2] },
      { t: 'workbench', a: 'wall', n: [1, 3] },
      { t: 'toolShelf', a: 'wall', n: [1, 3] },
      { t: 'toolbox', a: 'wall', n: [1, 2] },
      { t: 'compressor', a: 'corner', p: 0.6 },
      { t: 'welder', a: 'wall', p: 0.3 },
      { t: 'stool', a: 'beside', of: ['workbench'], p: 0.5 },
      { t: 'wallShelf', a: 'wall', p: 0.4 },
      { t: 'cabinet', a: 'wall', n: [0, 2] },
      { t: 'locker', a: 'wall', p: 0.3 },
      { t: ['tireStack', 'drum'], a: 'wall', n: [2, 4] },
      { t: ['crate', 'boxes'], a: 'corner', n: [1, 2] },
      { t: 'tire', a: 'scatter', n: [0, 2], jitter: 25 },
    ],
  },
  Galpão: {
    fill: { t: ['pallet', 'crate', 'boxes', 'drum'], per: 5.6 },
    ground: same(G.GarageFloor),
    clutter: { t: ['crate', 'boxes', 'pallet'], per: 10 },
    rules: [
      { t: ['palletRack', 'storeShelf', 'toolShelf'], a: 'rows', gap: 1.8 },
      { t: 'pallet', a: 'wall', n: [2, 5] },
      { t: ['crate', 'boxes'], a: 'wall', n: [2, 5] },
      { t: 'drum', a: 'corner', n: [1, 3] },
      { t: ['cart', 'tireStack'], a: 'scatter', n: [0, 2], jitter: 20 },
    ],
  },
  Vestiário: {
    fill: { t: ['locker', 'bench'], per: 3.5 },
    ground: same(G.TileFloor),
    smallWindow: true,
    clutter: { t: ['box', 'trashBags', 'trashCan'], per: 4.0 },
    rules: [
      { t: 'locker', a: 'wall', n: [2, 4] },
      { t: 'bench', a: 'center', p: 0.7 },
      { t: 'bathSink', a: 'wall', p: 0.6 },
      { t: 'shower', a: 'corner', p: 0.5 },
      { t: 'cabinet', a: 'wall', p: 0.3 },
    ],
  },
  Refeitório: {
    fill: { t: ['cabinet', 'vending', 'trashCan'], per: 5.6 },
    ground: same(G.TileFloor),
    clutter: { t: ['chair', 'trashCan', 'box'], per: 5.0 },
    rules: [
      { t: 'diningTable', a: 'grid', gap: 1.4 },
      { t: 'chair', a: 'around', of: ['diningTable'], n: [2, 6] },
      { t: 'kitchenCounter', a: 'wall', p: 0.8 },
      { t: 'fridge', a: 'corner', p: 0.7 },
      { t: 'vending', a: 'wall', p: 0.5 },
      { t: 'trashCan', a: 'corner', p: 0.7 },
    ],
  },
  'Cozinha industrial': {
    fill: { t: ['cabinet', 'storeShelf', 'kitchenCounter'], per: 3.5 },
    ground: same(G.TileFloor),
    clutter: { t: ['box', 'boxes', 'trashBags', 'crate'], per: 3.0 },
    rules: [
      { t: 'stove', a: 'wall', n: [1, 3] },
      { t: 'kitchenCounter', a: 'wall', n: [1, 3] },
      { t: 'fridge', a: 'corner', n: [1, 2] },
      { t: 'freezer', a: 'wall', p: 0.7 },
      { t: 'cabinet', a: 'wall', n: [1, 3] },
      { t: 'storeShelf', a: 'wall', p: 0.3 },
      { t: ['boxes', 'box', 'trashBags'], a: 'scatter', n: [1, 3], jitter: 25 },
    ],
  },
  Recepção: {
    fill: { t: ['chair', 'plantPot', 'fileCabinet'], per: 3.5 },
    ground: same(G.TileFloor),
    clutter: { t: ['chair', 'box', 'trashCan', 'plantPot'], per: 4.0 },
    rules: [
      { t: 'shopCounter', a: 'wall', p: 0.8 },
      { t: 'desk', a: 'wall', p: 0.4 },
      { t: 'chair', a: 'wall', n: [2, 5] },
      { t: 'plantPot', a: 'corner', n: [0, 2] },
      { t: 'fileCabinet', a: 'wall', p: 0.5 },
      { t: 'vending', a: 'wall', p: 0.3 },
      { t: 'coatRack', a: 'corner', p: 0.3 },
      { t: 'sideTable', a: 'wall', p: 0.3 },
      { t: 'cabinet', a: 'corner', n: [0, 1] },
      { t: 'trashCan', a: 'corner', p: 0.6 },
    ],
  },
  // ---------------------------------------------------------------- serviços
  Nave: {
    fill: { t: ['plantPot', 'cabinet'], per: 8.4 },
    ground: [G.Concrete, G.WoodFloor, G.TileFloor],
    clutter: { t: ['box', 'chair', 'plantPot'], per: 8.0 },
    rules: [
      { t: 'altar', a: 'back', p: 0.95 },
      { t: 'pew', a: 'grid', gap: 1.0 },
      { t: 'cabinet', a: 'corner', n: [1, 2] },
      { t: 'plantPot', a: 'corner', n: [0, 2] },
      { t: 'rug', a: 'center', p: 0.4, w: [1, 2] },
    ],
  },
  'Sala de aula': {
    fill: { t: ['bookshelf', 'cabinet', 'wallShelf'], per: 5.6 },
    ground: [G.Concrete, G.TileFloor, G.WoodFloor],
    clutter: { t: ['box', 'boxes', 'chair'], per: 6.0 },
    rules: [
      { t: 'blackboard', a: 'back', p: 0.95 },
      { t: 'desk', a: 'back', p: 0.9 },
      { t: 'schoolDesk', a: 'grid', gap: 0.8 },
      { t: 'bookshelf', a: 'wall', p: 0.5 },
      { t: 'cabinet', a: 'corner', n: [1, 2] },
      { t: ['box', 'boxes'], a: 'scatter', n: [0, 2], jitter: 25 },
    ],
  },
  Consultório: {
    fill: { t: ['cabinet', 'medCabinet', 'wallShelf'], per: 3.5 },
    ground: same(G.TileFloor),
    clutter: { t: ['box', 'boxes', 'trashCan'], per: 4.5 },
    rules: [
      { t: 'stretcher', a: 'wall' },
      { t: 'desk', a: 'wall' },
      { t: 'chair', a: 'beside', of: ['desk'], n: [1, 2] },
      { t: 'medCabinet', a: 'wall', n: [1, 2] },
      { t: 'cabinet', a: 'wall', n: [0, 2] },
      { t: 'fileCabinet', a: 'wall', p: 0.4 },
      { t: 'bathSink', a: 'wall', p: 0.6 },
      { t: 'wallShelf', a: 'wall', p: 0.4 },
    ],
  },
  Enfermaria: {
    fill: { t: ['cabinet', 'medCabinet', 'nightstand'], per: 4.2 },
    ground: same(G.TileFloor),
    clutter: { t: ['box', 'boxes', 'trashCan'], per: 4.5 },
    rules: [
      { t: ['stretcher', 'bedSingle'], a: 'grid', gap: 1.2 },
      { t: 'medCabinet', a: 'wall', n: [1, 2] },
      { t: 'cabinet', a: 'wall', n: [1, 2] },
      { t: 'nightstand', a: 'wall', n: [1, 2] },
      { t: 'trashCan', a: 'corner', p: 0.5 },
    ],
  },
} as const satisfies Record<string, RoomDef>;

export type RoomKind = keyof typeof ROOMS;

export function roomDef(kind: RoomKind): RoomDef {
  return ROOMS[kind];
}
