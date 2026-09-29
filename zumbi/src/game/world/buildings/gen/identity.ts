/**
 * IDENTIDADE de cada lugar: o mesmo tipo de cômodo mobiliado do jeito do
 * negócio. O salão do supermercado tem gôndolas duplas e freezers; o da
 * loja de roupas, araras e manequins; o da lavanderia, fileira de máquinas.
 * O que não está aqui usa a regra geral do cômodo (rooms.ts).
 */
import { Ground } from '../../MapTypes';
import type { ArchetypeId } from './archetypes';
import type { RoomDef, RoomKind } from './rooms';

const G = Ground;
const TILE3 = [G.TileFloor, G.TileFloor, G.TileFloor] as const;
const CONCRETE3 = [G.Concrete, G.Concrete, G.Concrete] as const;
const GARAGE3 = [G.GarageFloor, G.GarageFloor, G.GarageFloor] as const;

type Identity = Partial<Record<RoomKind, RoomDef>>;

export const IDENTITY: Partial<Record<ArchetypeId, Identity>> = {
  supermercado: {
    Salão: {
      ground: TILE3,
      clutter: { t: ['box', 'cart'], per: 30 },
      rules: [
        { t: 'checkout', a: 'front', n: [2, 3] },
        { t: 'gondola', a: 'rows', gap: 1.6 },
        { t: 'displayFridge', a: 'back', n: [1, 3] },
        { t: 'storeShelf', a: 'wall', n: [2, 4] },
        { t: 'freezer', a: 'wall', n: [1, 2] },
        { t: 'vending', a: 'front', p: 0.5 },
        { t: 'cart', a: 'scatter', n: [1, 3], jitter: 40 },
      ],
    },
  },
  mercadinho: {
    Salão: {
      ground: TILE3,
      clutter: { t: ['box', 'boxes'], per: 12 },
      rules: [
        { t: 'checkout', a: 'front' },
        { t: ['storeShelf', 'gondola'], a: 'rows', gap: 1.4 },
        { t: 'displayFridge', a: 'back', n: [1, 2] },
        { t: 'storeShelf', a: 'wall', n: [1, 2] },
        { t: 'freezer', a: 'wall', p: 0.6 },
        { t: ['boxes', 'crate'], a: 'corner', n: [1, 2] },
      ],
    },
  },
  conveniencia: {
    Salão: {
      ground: TILE3,
      clutter: { t: ['box', 'boxes'], per: 5 },
      rules: [
        { t: 'checkout', a: 'front' },
        { t: 'gondola', a: 'rows', gap: 1.4 },
        { t: 'displayFridge', a: 'back', n: [1, 2] },
        { t: 'vending', a: 'wall', p: 0.8 },
        { t: 'freezer', a: 'wall', p: 0.5 },
        { t: 'trashCan', a: 'corner', p: 0.6 },
      ],
    },
  },
  farmacia: {
    Salão: {
      ground: TILE3,
      clutter: { t: ['box', 'boxes'], per: 6 },
      rules: [
        { t: 'shopCounter', a: 'back', p: 0.9 },
        { t: 'checkout', a: 'front', p: 0.7 },
        { t: 'storeShelf', a: 'rows', gap: 1.4 },
        { t: 'medCabinet', a: 'back', n: [1, 2] },
        { t: 'displayFridge', a: 'wall', p: 0.3 },
        { t: 'plantPot', a: 'corner', p: 0.3 },
      ],
    },
    Estoque: {
      ground: CONCRETE3,
      clutter: { t: ['box', 'boxes'], per: 2 },
      rules: [
        { t: ['storeShelf', 'medCabinet'], a: 'rows', gap: 1.2 },
        { t: 'medCabinet', a: 'wall', n: [1, 2] },
        { t: ['boxes', 'box'], a: 'scatter', n: [2, 4], jitter: 20 },
      ],
    },
  },
  lanchonete: {
    'Sala de jantar': {
      ground: TILE3,
      clutter: { t: ['chair', 'box', 'trashCan'], per: 3.5 },
      rules: [
        { t: 'barCounter', a: 'back', p: 0.9 },
        { t: 'displayFridge', a: 'wall', p: 0.7 },
        { t: 'diningTable', a: 'grid', gap: 1.3 },
        { t: 'chair', a: 'around', of: ['diningTable'], n: [2, 4] },
        { t: 'vending', a: 'wall', p: 0.3 },
        { t: 'trashCan', a: 'corner', p: 0.7 },
      ],
    },
  },
  restaurante: {
    'Sala de jantar': {
      ground: [G.TileFloor, G.WoodFloor, G.WoodFloor],
      clutter: { t: ['chair', 'plantPot'], per: 3.5 },
      rules: [
        { t: 'diningTable', a: 'grid', gap: 1.5 },
        { t: 'chair', a: 'around', of: ['diningTable'], n: [3, 6] },
        { t: 'barCounter', a: 'back', p: 0.5 },
        { t: 'displayFridge', a: 'wall', p: 0.5 },
        { t: 'plantPot', a: 'corner', n: [1, 2], w: [1, 2] },
        { t: 'cabinet', a: 'wall', p: 0.5 },
      ],
    },
  },
  bar: {
    'Sala de jantar': {
      ground: [G.Concrete, G.TileFloor, G.TileFloor],
      clutter: { t: ['chair', 'crate', 'trashBags'], per: 3 },
      rules: [
        { t: 'barCounter', a: 'back' },
        { t: 'displayFridge', a: 'wall', p: 0.8 },
        { t: 'diningTable', a: 'grid', gap: 1.6 },
        { t: 'chair', a: 'around', of: ['diningTable'], n: [2, 4] },
        { t: 'vending', a: 'wall', p: 0.25 },
        { t: ['crate', 'trashBags'], a: 'scatter', n: [1, 3], jitter: 30 },
      ],
    },
  },
  padaria: {
    Salão: {
      ground: TILE3,
      clutter: { t: ['box', 'chair'], per: 5 },
      rules: [
        { t: 'bakeryCounter', a: 'back', n: [1, 2] },
        { t: 'displayFridge', a: 'wall', n: [1, 2] },
        { t: 'storeShelf', a: 'wall', p: 0.6 },
        { t: 'checkout', a: 'front', p: 0.7 },
        { t: 'diningTable', a: 'center', p: 0.4 },
        { t: 'chair', a: 'around', of: ['diningTable'], n: [2, 3] },
      ],
    },
  },
  lojaRoupas: {
    Salão: {
      ground: [G.TileFloor, G.WoodFloor, G.Carpet],
      clutter: { t: ['box', 'boxes'], per: 6 },
      rules: [
        { t: 'clothesRack', a: 'rows', gap: 1.3 },
        { t: 'mannequin', a: 'front', n: [1, 3] },
        { t: 'shopCounter', a: 'back', p: 0.9 },
        { t: 'shoeRack', a: 'wall', n: [1, 2] },
        { t: 'dresser', a: 'wall', p: 0.4 },
        { t: 'plantPot', a: 'corner', p: 0.4 },
      ],
    },
    Estoque: {
      ground: CONCRETE3,
      clutter: { t: ['box', 'boxes'], per: 1.8 },
      rules: [
        { t: 'clothesRack', a: 'rows', gap: 1.2 },
        { t: ['boxes', 'box'], a: 'scatter', n: [2, 5], jitter: 25 },
      ],
    },
  },
  ferragem: {
    Salão: {
      ground: CONCRETE3,
      clutter: { t: ['crate', 'boxes'], per: 10 },
      rules: [
        { t: 'shopCounter', a: 'front', p: 0.9 },
        { t: 'toolShelf', a: 'rows', gap: 1.4 },
        { t: 'palletRack', a: 'back', p: 0.5 },
        { t: 'toolShelf', a: 'wall', n: [1, 2] },
        { t: 'toolbox', a: 'wall', n: [1, 2] },
        { t: ['drum', 'crate', 'tireStack'], a: 'wall', n: [1, 3] },
      ],
    },
    Depósito: {
      ground: CONCRETE3,
      clutter: { t: ['crate', 'boxes'], per: 5 },
      rules: [
        { t: 'palletRack', a: 'rows', gap: 1.5 },
        { t: 'pallet', a: 'wall', n: [1, 3] },
        { t: ['crate', 'boxes', 'drum'], a: 'wall', n: [2, 4] },
      ],
    },
  },
  lavanderia: {
    Salão: {
      ground: TILE3,
      clutter: { t: ['box', 'trashBags', 'chair'], per: 5 },
      rules: [
        { t: 'washer', a: 'wall', n: [3, 6] },
        { t: 'laundrySink', a: 'wall', p: 0.6 },
        { t: 'ironingBoard', a: 'wall', n: [1, 2] },
        { t: 'clothesRack', a: 'wall', n: [1, 2] },
        { t: 'shopCounter', a: 'front', p: 0.8 },
        { t: 'chair', a: 'wall', n: [1, 3] },
      ],
    },
    'Área de serviço': {
      ground: CONCRETE3,
      clutter: { t: ['box', 'boxes', 'trashBags'], per: 2.4 },
      rules: [
        { t: 'washer', a: 'wall', n: [1, 3] },
        { t: 'laundrySink', a: 'wall', p: 0.8 },
        { t: 'clothesRack', a: 'wall', p: 0.6 },
        { t: 'cabinet', a: 'wall', p: 0.5 },
      ],
    },
  },
  academia: {
    Salão: {
      ground: [G.Concrete, G.Carpet, G.Carpet],
      clutter: { t: ['box', 'trashCan'], per: 8 },
      rules: [
        { t: 'treadmill', a: 'rows', gap: 0.9 },
        { t: 'weightBench', a: 'wall', n: [1, 3] },
        { t: 'dumbbellRack', a: 'wall', n: [1, 2] },
        { t: 'bench', a: 'center', p: 0.4 },
        { t: 'plantPot', a: 'corner', p: 0.4 },
      ],
    },
    Vestiário: {
      ground: TILE3,
      clutter: { t: ['box', 'trashCan'], per: 5 },
      rules: [
        { t: 'locker', a: 'wall', n: [2, 5] },
        { t: 'bench', a: 'center', p: 0.8 },
        { t: 'shower', a: 'corner', n: [1, 2] },
        { t: 'bathSink', a: 'wall', p: 0.5 },
      ],
    },
  },
  oficina: {
    Oficina: {
      ground: GARAGE3,
      clutter: { t: ['tire', 'drum', 'box'], per: 7 },
      rules: [
        { t: ['car', 'carWreck'], a: 'center', n: [1, 2] },
        { t: 'workbench', a: 'wall', n: [1, 2] },
        { t: 'toolShelf', a: 'wall', n: [1, 2] },
        { t: 'toolbox', a: 'wall', n: [1, 2] },
        { t: 'compressor', a: 'corner', p: 0.8 },
        { t: 'locker', a: 'wall', p: 0.3 },
        { t: ['tireStack', 'drum'], a: 'wall', n: [2, 4] },
        { t: 'tire', a: 'scatter', n: [0, 2], jitter: 25 },
      ],
    },
  },
  borracharia: {
    Oficina: {
      ground: GARAGE3,
      clutter: { t: ['tire'], per: 5 },
      rules: [
        { t: 'tireStack', a: 'wall', n: [4, 7] },
        { t: 'compressor', a: 'corner' },
        { t: 'workbench', a: 'wall', p: 0.7 },
        { t: 'toolbox', a: 'wall', p: 0.6 },
        { t: ['car', 'carWreck'], a: 'center', p: 0.3 },
        { t: 'tire', a: 'wall', n: [2, 4] },
      ],
    },
  },
  serralheria: {
    Oficina: {
      ground: GARAGE3,
      clutter: { t: ['crate', 'drum', 'boxes'], per: 7 },
      rules: [
        { t: 'lathe', a: 'wall', n: [1, 2] },
        { t: 'welder', a: 'wall', n: [1, 2] },
        { t: 'compressor', a: 'corner', p: 0.7 },
        { t: 'workbench', a: 'wall', n: [2, 3] },
        { t: 'toolShelf', a: 'wall', n: [1, 2] },
        { t: 'palletRack', a: 'wall', p: 0.3 },
        { t: ['drum', 'crate'], a: 'wall', n: [2, 4] },
        { t: 'pallet', a: 'wall', n: [0, 2] },
      ],
    },
  },
  galpao: {
    Galpão: {
      ground: GARAGE3,
      clutter: { t: ['crate', 'boxes'], per: 25 },
      rules: [
        { t: 'palletRack', a: 'rows', gap: 2 },
        { t: 'pallet', a: 'wall', n: [3, 6] },
        { t: ['crate', 'boxes'], a: 'wall', n: [3, 6] },
        { t: 'drum', a: 'corner', n: [1, 3] },
        { t: 'cart', a: 'scatter', n: [0, 2], jitter: 30 },
      ],
    },
  },
  escritorio: {
    Escritório: {
      ground: [G.WoodFloor, G.Carpet, G.Carpet],
      clutter: { t: ['chair', 'boxes', 'trashCan', 'plantPot'], per: 3 },
      rules: [
        { t: 'desk', a: 'grid', gap: 1.2 },
        { t: 'fileCabinet', a: 'wall', n: [1, 3] },
        { t: 'bookshelf', a: 'wall', p: 0.6 },
        { t: 'plantPot', a: 'corner', n: [1, 2] },
        { t: 'cabinet', a: 'wall', p: 0.5 },
        { t: 'trashCan', a: 'corner', p: 0.6 },
      ],
    },
  },
};
