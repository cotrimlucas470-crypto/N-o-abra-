/**
 * Plantas das construções da Etapa 2. Coordenadas em tiles locais.
 * Espessura de parede ~0,11 tile de cada lado da linha — móveis
 * encostados usam isso como margem.
 *
 * Dica para criar uma nova: desenhe no papel com grade, defina pisos,
 * paredes (com portas/janelas) e móveis; rode `npm test` — o teste de
 * acessibilidade avisa se algum cômodo ficou trancado por um móvel.
 */
import { Ground } from '../MapTypes';
import { door, win, type BuildingTemplate } from './BuildingTemplate';

/** Casa térrea 10x8: sala, cozinha, quarto e banheiro. Porta ao sul. */
export const HOUSE_SMALL: BuildingTemplate = {
  kind: 'house',
  name: 'Casa',
  w: 10,
  h: 8,
  roof: 'shingle-a',
  floors: [
    { rect: [0, 3, 6, 5], ground: Ground.WoodFloor, room: 'Sala' },
    { rect: [6, 3, 4, 5], ground: Ground.TileFloor, room: 'Cozinha' },
    { rect: [0, 0, 6, 3], ground: Ground.Carpet, room: 'Quarto' },
    { rect: [6, 0, 4, 3], ground: Ground.TileFloor, room: 'Banheiro' },
  ],
  walls: [
    { a: [0, 0], b: [10, 0], openings: [win(1.5, 2), win(7.4, 1.4)] },
    { a: [0, 8], b: [10, 8], openings: [win(0.8, 1.6), door(3.9, 1.5), win(6.9, 2)] },
    { a: [0, 0], b: [0, 8], openings: [win(4.2, 2)] },
    { a: [10, 0], b: [10, 8], openings: [win(0.8, 1.2), win(4.4, 2)] },
    { a: [0, 3], b: [10, 3], openings: [door(4.4, 1.3), door(7.0, 1.3)] },
    { a: [6, 0], b: [6, 3] },
    { a: [6, 3], b: [6, 8], openings: [door(1.4, 2.0)] },
  ],
  props: [
    { type: 'rug', at: [2.7, 5.4] },
    { type: 'sofa', at: [2.6, 3.6] },
    { type: 'coffeeTable', at: [2.6, 5.0] },
    { type: 'tvStand', at: [2.6, 7.59], angle: 180 },
    { type: 'armchair', at: [0.6, 5.0], angle: -90 },
    { type: 'fridge', at: [9.44, 3.6], angle: 90 },
    { type: 'kitchenCounter', at: [9.53, 5.4], angle: 90 },
    { type: 'stove', at: [9.47, 7.3], angle: 90 },
    { type: 'diningTable', at: [7.6, 6.4] },
    { type: 'bedDouble', at: [1.25, 1.31] },
    { type: 'nightstand', at: [2.55, 0.43] },
    { type: 'wardrobe', at: [4.3, 0.47] },
    { type: 'bathtub', at: [8.55, 0.7] },
    { type: 'toilet', at: [6.5, 0.55] },
    { type: 'bathSink', at: [9.5, 2.3], angle: 90 },
  ],
  decals: [{ type: 'paper', at: [4.2, 6.2] }],
  doors: [{ at: [4.65, 8], side: 's' }],
};

/** Mercadinho 14x10: salão com prateleiras, caixa e estoque nos fundos. Porta dupla ao norte. */
export const CORNER_STORE: BuildingTemplate = {
  kind: 'store',
  name: 'Mercadinho',
  w: 14,
  h: 10,
  roof: 'flat',
  floors: [
    { rect: [0, 0, 14, 7], ground: Ground.TileFloor, room: 'Salão' },
    { rect: [0, 7, 14, 3], ground: Ground.Concrete, room: 'Estoque' },
  ],
  walls: [
    { a: [0, 0], b: [14, 0], openings: [win(0.8, 4.6), door(6, 2), win(8.6, 4.6)] },
    { a: [0, 10], b: [14, 10], openings: [door(11, 1.4)] },
    { a: [0, 0], b: [0, 10], openings: [win(2, 3)] },
    { a: [14, 0], b: [14, 10] },
    { a: [0, 7], b: [14, 7], openings: [door(1.2, 1.4)] },
  ],
  props: [
    { type: 'checkout', at: [3.2, 1.5] },
    { type: 'storeShelf', at: [3.6, 3.4] },
    { type: 'storeShelf', at: [9.9, 3.4] },
    { type: 'storeShelf', at: [3.6, 5.3] },
    { type: 'storeShelf', at: [9.9, 5.3] },
    { type: 'displayFridge', at: [13.44, 3.8], angle: 90 },
    { type: 'cart', at: [7.2, 1.4], angle: 20 },
    { type: 'boxes', at: [4.6, 7.62] },
    { type: 'boxes', at: [5.9, 7.62] },
    { type: 'crate', at: [7.2, 7.55] },
    { type: 'drum', at: [8.3, 7.5] },
    { type: 'pallet', at: [12.8, 8.5] },
    { type: 'box', at: [13.3, 7.5] },
  ],
  decals: [
    { type: 'glass', at: [2.2, 0.6] },
    { type: 'paper', at: [6.5, 4.4] },
    { type: 'paper', at: [8.2, 6.3] },
    { type: 'blood', at: [11.4, 6.2], scale: 0.8, alpha: 0.8 },
  ],
  doors: [
    { at: [7, 0], side: 'n' },
    { at: [11.7, 10], side: 's' },
  ],
};

/** Oficina 12x9: portão largo ao norte, porta lateral a leste, escritório. */
export const GARAGE: BuildingTemplate = {
  kind: 'garage',
  name: 'Oficina',
  w: 12,
  h: 9,
  roof: 'flat',
  floors: [
    { rect: [0, 0, 12, 9], ground: Ground.GarageFloor, room: 'Oficina' },
    { rect: [8, 5, 4, 4], ground: Ground.WoodFloor, room: 'Escritório' },
  ],
  walls: [
    { a: [0, 0], b: [12, 0], openings: [door(1.5, 4), win(8, 2.4)] },
    { a: [0, 9], b: [12, 9], openings: [win(3, 2)] },
    { a: [0, 0], b: [0, 9], openings: [win(3.5, 2)] },
    { a: [12, 0], b: [12, 9], openings: [door(1.6, 1.3)] },
    { a: [8, 5], b: [12, 5] },
    { a: [8, 5], b: [8, 9], openings: [door(1.2, 1.3)] },
  ],
  props: [
    { type: 'car', at: [3.5, 4.4], angle: 90, variant: 4 },
    { type: 'workbench', at: [3.5, 8.47], angle: 180 },
    { type: 'toolShelf', at: [6.8, 0.44] },
    { type: 'tireStack', at: [0.5, 7.7] },
    { type: 'tire', at: [1.15, 8.3] },
    { type: 'drum', at: [0.45, 0.55] },
    { type: 'drum', at: [1.1, 0.5] },
    { type: 'desk', at: [10.3, 8.4], angle: 180 },
    { type: 'chair', at: [10.3, 7.6] },
    { type: 'cabinet', at: [11.5, 5.5] },
  ],
  decals: [
    { type: 'oil', at: [3.4, 3.2] },
    { type: 'oil', at: [6.2, 6.5], scale: 0.7 },
    { type: 'oil', at: [1.6, 1.6], scale: 0.6 },
  ],
  doors: [
    { at: [3.5, 0], side: 'n' },
    { at: [12, 2.25], side: 'e' },
  ],
};

/** Abrigo 9x8: a base inicial do jogador. Porta ao sul, quartinho a nordeste. */
export const SHELTER: BuildingTemplate = {
  kind: 'shelter',
  name: 'Abrigo',
  w: 9,
  h: 8,
  roof: 'shingle-b',
  floors: [
    { rect: [0, 0, 9, 8], ground: Ground.WoodFloor, room: 'Sala' },
    { rect: [5, 0, 4, 4], ground: Ground.Carpet, room: 'Quarto' },
  ],
  walls: [
    { a: [0, 0], b: [9, 0], openings: [win(1.5, 1.5)] },
    { a: [0, 8], b: [9, 8], openings: [door(3.5, 1.5), win(6.5, 1.5)] },
    { a: [0, 0], b: [0, 8], openings: [win(3, 2)] },
    { a: [9, 0], b: [9, 8], openings: [win(5, 1.5)] },
    { a: [5, 0], b: [5, 4], openings: [door(2.4, 1.3)] },
    { a: [5, 4], b: [9, 4] },
  ],
  props: [
    { type: 'bedSingle', at: [8.2, 1.2] },
    { type: 'nightstand', at: [7.1, 0.43] },
    { type: 'rug', at: [2.6, 5.2], variant: 1 },
    { type: 'diningTable', at: [2.2, 2.2] },
    { type: 'workbench', at: [1.6, 7.47], angle: 180 },
    { type: 'crate', at: [6.2, 7.45] },
    { type: 'boxes', at: [7.8, 7.4] },
    { type: 'cabinet', at: [4.2, 0.45] },
    { type: 'drum', at: [0.5, 5.3] },
  ],
  doors: [{ at: [4.25, 8], side: 's' }],
};
