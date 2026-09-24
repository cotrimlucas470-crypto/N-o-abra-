/**
 * REGIÃO 1 — Zona Residencial, Setor 1 (setor inicial, no centro da cidade).
 *
 * Um cruzamento entre a Avenida (leste-oeste) e a Rua (norte-sul)
 * divide quatro quarteirões:
 *   NO: o Abrigo do jogador e uma casa, com quintais atrás.
 *   NE: praça arborizada e uma casa.
 *   SO: estacionamento e o Mercadinho.
 *   SE: Oficina, uma casa e um ferro-velho.
 *
 * Coordenadas em tiles LOCAIS do setor (ver SectorLayout.ts). A malha de
 * ruas vem de SectorRoads.ts, igual à dos outros setores.
 */
import { Ground, type MapData } from '../MapTypes';
import { CORNER_STORE, GARAGE, HOUSE_SMALL, SHELTER } from '../buildings/templates';
import type { PlacedBuilding } from '../MapBuilder';
import { buildCity } from './CityGenerator';
import type { SectorBuilder } from './SectorBuilder';
import { AV_Y, ROAD, SECTOR_H, SECTOR_W, ST_X } from './SectorLayout';

export const STARTER_DISTRICT_SEED = 1337;

const W = SECTOR_W;
const H = SECTOR_H;

/** O setor inicial sozinho, como um mapa de 1×1 setor (usado em testes e no preset "cidade pequena"). */
export function buildStarterDistrict(seed = STARTER_DISTRICT_SEED): MapData {
  return buildCity({ seed, sectorsX: 1, sectorsY: 1 });
}

/** Conteúdo do setor inicial (a malha de ruas e as cercas de fundo já foram feitas). */
export function buildStarterSector(b: SectorBuilder): void {
  northWest(b);
  northEast(b);
  southWest(b);
  southEast(b);
  streetLife(b);
  b.region('setor-1', 'Zona Residencial · Setor 1', 0, 0, W, H);
}

// ---------------------------------------------------------------- quarteirões

/** Caminho de concreto da porta (tile) até a calçada, na direção da fachada. */
function pathFromDoor(b: SectorBuilder, placed: PlacedBuilding, doorIndex: number, toEdge: number, width = 2): void {
  const d = placed.doors[doorIndex];
  if (!d) return;
  const x0 = Math.round(d.x - width / 2);
  const y0 = Math.round(d.y - width / 2);
  if (d.side === 's') b.fill(x0, d.y, width, toEdge - d.y, Ground.Concrete);
  else if (d.side === 'n') b.fill(x0, toEdge, width, d.y - toEdge, Ground.Concrete);
  else if (d.side === 'e') b.fill(d.x, y0, toEdge - d.x, width, Ground.Concrete);
  else b.fill(toEdge, y0, d.x - toEdge, width, Ground.Concrete);
}

function northWest(b: SectorBuilder): void {
  // Quintais: cerca divisória, horta, árvores
  b.wall(16, 2, 16, 11.2, 'fence');
  b.fill(4, 3, 6, 3, Ground.Dirt);
  b.decal('dirt', 7, 4.5, 0, 1.3, 0.6);
  b.prop('treeLarge', 12.5, 4.5);
  b.prop('treeSmall', 2.5, 8.5);
  b.prop('bush', 5, 9.3);
  b.prop('bush', 9.5, 9.6);
  b.prop('tire', 14, 8.8);
  b.prop('treeLarge', 21, 5);
  b.prop('treeSmall', 28.5, 8.2);
  b.prop('bush', 25, 3.2);
  b.prop('crate', 18.2, 9.5, 12);
  b.prop('drum', 19.3, 10.3);
  b.scatterDecals(['leaves'], 8, 1, 2, 30, 9, [0.7, 1.2], [0.5, 0.9]);

  // Casa + garagem aberta (entrada de carro)
  const house = b.building(HOUSE_SMALL, 3, 12, { id: 'casa-no', roof: 'shingle-a' });
  pathFromDoor(b, house, 0, AV_Y - 2);
  b.fill(14, 14, 2, 10, Ground.Concrete);
  b.prop('car', 15, 18.2, 90, 0);
  b.decal('oil', 15, 21.3, 30, 0.8, 0.7);

  // Abrigo do jogador
  const shelter = b.building(SHELTER, 19, 13, { id: 'abrigo', roof: 'shingle-b' });
  pathFromDoor(b, shelter, 0, AV_Y - 2);
  b.prop('drum', 18.3, 21.9);
  b.prop('crate', 29, 21.4, -8);
  b.decal('bloodTrail', 26, 22.6, 200, 1, 0.75);
  b.decal('blood', 27.6, 22.2, undefined, 0.7, 0.8);

  // Cerca-viva na frente, com vãos nos caminhos
  for (const x of [1, 3, 5]) b.prop('hedge', x + 0.2, AV_Y - 2.65);
  for (const x of [10.5, 12.5]) b.prop('hedge', x, AV_Y - 2.65);
  b.prop('hedge', 17.8, AV_Y - 2.65);
  b.prop('hedge', 26.5, AV_Y - 2.65);
  b.prop('hedge', 28.6, AV_Y - 2.65);

  b.setSpawn(19 + 4.25, 13 + 6.4);
}

function northEast(b: SectorBuilder): void {
  // Praça
  b.fill(43, 3, 14, 20, Ground.GrassDark);
  b.fill(43, 12, 14, 1, Ground.Gravel);
  b.fill(49, 3, 1, 20, Ground.Gravel);
  b.fill(48, 11, 3, 3, Ground.Gravel);
  for (const [x, y] of [[45, 5.5], [54.5, 6], [45.5, 18], [54, 19], [52.5, 15.5], [46.5, 9.5]] as const) {
    b.prop('treeLarge', x, y);
  }
  b.prop('treeSmall', 51.8, 4.2);
  b.prop('bench', 47.4, 13.9, 0);
  b.prop('bench', 51.6, 10.9, 180);
  b.prop('bench', 50.9, 7, 90);
  b.prop('trashCan', 48.2, 10.6);
  b.prop('bush', 44, 21.5);
  b.prop('bush', 56, 3.9);
  b.prop('bush', 55.8, 12.9);
  b.scatterDecals(['leaves'], 16, 43, 3, 14, 20, [0.8, 1.3], [0.55, 0.95]);
  b.scatterDecals(['paper'], 5, 43, 3, 14, 20);
  // Carro que invadiu a praça
  b.prop('carWreck', 55, 16.6, 62);
  b.decal('skid', 57.5, 20.5, 60, 1, 0.6);
  b.decal('debris', 55.9, 18.6);

  // Casa espelhada
  const house = b.building(HOUSE_SMALL, 59, 13, { id: 'casa-ne', flipX: true, roof: 'shingle-b' });
  pathFromDoor(b, house, 0, AV_Y - 2);
  b.prop('treeLarge', 62, 6);
  b.prop('treeSmall', 68.5, 9.5);
  b.prop('bush', 59.5, 10.2);
  b.prop('trashBags', 69.5, 22.4);
  b.prop('trashBags', 58.2, 22.6, 40);
  b.wall(58, 2, 58, 11.4, 'fence');
  b.scatterDecals(['leaves'], 6, 58, 2, 13, 9, [0.7, 1.1], [0.5, 0.9]);
}

function southWest(b: SectorBuilder): void {
  // Estacionamento do mercado
  b.fill(3, 35, 27, 7, Ground.Parking);
  b.fill(8, 42, 16, 1, Ground.Concrete);
  b.marking('stall', 3.5, 35.9, 29.5, 35.9, 120);
  b.marking('stall', 3.5, 41.1, 29.5, 41.1, 120);
  const stallW = 144 / 64;
  const topRow = [0, 2, 3, 6, 8, 10];
  const bottomRow = [1, 4, 7, 9];
  for (const i of topRow) {
    const x = 3.5 + stallW * (i + 0.5);
    b.prop(i === 6 ? 'carWreck' : 'car', x, 36.1, 90 + b.rng.range(-6, 6));
  }
  for (const i of bottomRow) {
    const x = 3.5 + stallW * (i + 0.5);
    b.prop('car', x, 40.9, -90 + b.rng.range(-6, 6));
  }
  b.prop('cart', 12.6, 38.4, 35);
  b.prop('cart', 22.8, 39.2, -70);
  b.prop('van', 26.5, 38.4, 8);
  b.scatterDecals(['oil'], 7, 3, 35, 27, 7, [0.6, 1], [0.5, 0.85]);
  b.scatterDecals(['paper'], 6, 3, 35, 27, 7);
  b.decal('blood', 18.5, 38.7, undefined, 1.1, 0.85);
  b.decal('bloodTrail', 20.3, 39.1, 15, 1, 0.8);

  // Mercadinho
  const store = b.building(CORNER_STORE, 9, 43, { id: 'mercadinho' });
  void store;
  b.prop('dumpster', 25.6, 51.2, 90);
  b.prop('trashBags', 24.6, 53.2);
  b.prop('trashBags', 26.6, 53.6, 60);
  b.prop('boxes', 21.2, 54.2, 10);
  b.fill(18, 53, 8, 2, Ground.Concrete);

  // Laterais
  b.prop('treeLarge', 4, 46);
  b.prop('treeSmall', 5.6, 51.5);
  b.prop('bush', 3.4, 50);
  b.prop('bush', 7, 44.2);
  b.prop('treeLarge', 28.5, 45.5);
  b.prop('carWreck', 28.4, 50.4, 95);
  b.decal('debris', 29.8, 48.4);
  b.scatterDecals(['leaves'], 8, 1, 43, 31, 11, [0.7, 1.1], [0.5, 0.9]);
}

function southEast(b: SectorBuilder): void {
  // Oficina com pátio
  const garage = b.building(GARAGE, 44, 36, { id: 'oficina' });
  b.fill(44, 34, 7, 2, Ground.Concrete);
  pathFromDoor(b, garage, 1, 58);
  b.prop('tireStack', 51.6, 35.1);
  b.prop('drum', 43.3, 35.2);
  b.decal('oil', 47, 34.8, undefined, 1, 0.7);

  // Casa virada para a avenida (girada 180°)
  const house = b.building(HOUSE_SMALL, 59, 36, { id: 'casa-se', rot: 180, roof: 'shingle-a' });
  pathFromDoor(b, house, 0, AV_Y + ROAD + 2);
  b.prop('bush', 60, 34.8);
  b.prop('bush', 68.8, 34.9);
  b.prop('treeSmall', 70.6, 40);

  // Ferro-velho nos fundos
  b.fill(43, 47, 28, 8, Ground.Gravel);
  b.wall(43, 46.5, 55, 46.5, 'fence');
  b.wall(58, 46.5, 71, 46.5, 'fence');
  b.prop('carWreck', 46.5, 49.6, 20);
  b.prop('carWreck', 51.5, 52.6, -12);
  b.prop('car', 62, 49.8, 170, 4);
  b.prop('carWreck', 67.6, 52.4, 80);
  b.prop('tireStack', 44.2, 53.6);
  b.prop('tireStack', 45.3, 54.3);
  b.prop('tire', 55.8, 49.3);
  b.prop('drum', 58.5, 53.8);
  b.prop('drum', 59.3, 54.4);
  b.prop('pallet', 64.8, 53.6, 10);
  b.prop('crate', 64.8, 53.6, 25);
  b.prop('boxes', 69.6, 48.2);
  b.scatterDecals(['oil', 'debris'], 10, 43, 47, 28, 8, [0.7, 1.1], [0.6, 0.9]);
}

// ---------------------------------------------------------------- abandono

function streetLife(b: SectorBuilder): void {
  const cy = AV_Y + 3;
  // Avenida
  b.prop('car', 12, cy - 1.4, 180, 1);
  b.prop('carWreck', 22, cy + 1.3, 10);
  b.prop('van', 27, cy - 1.5, -5);
  b.prop('car', 48, cy + 1.4, 0, 2);
  b.prop('car', 56, cy - 1.3, 160, 3);
  b.prop('car', 62.5, cy + 1.5, 185, 0);
  b.prop('barricade', 44.6, AV_Y + 1.3, 90);
  b.prop('barricade', 44.8, AV_Y + 3.7, 90);
  b.prop('cone', 43.6, AV_Y + 5.3);
  b.prop('cone', 43.4, AV_Y + 0.6);

  // Cruzamento: batida
  b.prop('car', ST_X + 2.6, cy - 0.6, 28, 0);
  b.prop('car', ST_X + 4.2, cy + 1.4, 115, 2);
  b.decal('glass', ST_X + 3.4, cy + 0.4);
  b.decal('skid', ST_X - 1.5, cy - 1.1, 12, 1, 0.55);
  b.decal('blood', ST_X + 1.4, cy + 1.6, undefined, 1, 0.85);

  // Rua
  b.prop('car', ST_X + 1.5, 8, 90, 3);
  b.prop('carWreck', ST_X + 4.5, 17, 80);
  b.prop('car', ST_X + 1.4, 40, -95, 4);
  b.prop('van', ST_X + 4.6, 47.5, 90);
  b.prop('cone', ST_X + 3, 21.5);
  b.prop('cone', ST_X + 3.6, 22.2);

  // Sujeira geral nas vias
  b.scatterDecals(['crack'], 18, 0, AV_Y, W, ROAD, [0.8, 1.3], [0.45, 0.8]);
  b.scatterDecals(['crack'], 14, ST_X, 0, ROAD, H, [0.8, 1.3], [0.45, 0.8]);
  b.scatterDecals(['paper', 'leaves'], 22, 0, AV_Y - 2, W, ROAD + 4, [0.7, 1.1], [0.6, 1]);
  b.scatterDecals(['paper', 'leaves'], 16, ST_X - 2, 0, ROAD + 4, H, [0.7, 1.1], [0.6, 1]);
  b.scatterDecals(['blood'], 3, 0, AV_Y, W, ROAD, [0.7, 1.1], [0.6, 0.85]);
  b.prop('trashBags', 30.8, AV_Y - 1.5, 20);
  b.prop('trashBags', 41.4, 20, -30);
  b.prop('trashBags', 33, 44, 70);
}
