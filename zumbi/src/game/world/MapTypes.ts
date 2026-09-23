/**
 * Formato de dados de um mapa. É só DADO (sem Phaser): pode vir de um
 * gerador em código (hoje), de um arquivo JSON/Tiled (futuro) ou do save.
 *
 * Unidades: tudo em pixels de mundo, exceto `ground` (1 valor por tile).
 */
import type { PropType } from './PropCatalog';
import type { DecalType } from './DecalCatalog';

/** Tipos de chão. O número é a LINHA no tileset (ver assets/procedural/tiles.ts). */
export const Ground = {
  Grass: 0,
  GrassDark: 1,
  Dirt: 2,
  Gravel: 3,
  Asphalt: 4,
  Sidewalk: 5,
  Concrete: 6,
  Parking: 7,
  WoodFloor: 8,
  TileFloor: 9,
  Carpet: 10,
  GarageFloor: 11,
} as const;
export type GroundId = (typeof Ground)[keyof typeof Ground];
export const GROUND_COUNT = 12;
/** Variações visuais por tipo de chão (colunas do tileset). */
export const GROUND_VARIANTS = 4;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type WallKind = 'wall' | 'window' | 'fence';

export interface WallPiece extends Rect {
  kind: WallKind;
}

/** Faixas pintadas no chão, desenhadas como textura repetida (TileSprite). */
export type MarkingKind = 'lane-dash' | 'lane-double' | 'crosswalk' | 'curb' | 'stall';

export interface MarkingPlacement {
  kind: MarkingKind;
  /** Centro, em px. */
  x: number;
  y: number;
  /** Comprimento ao longo da direção da faixa e espessura. */
  length: number;
  thickness: number;
  /** true = faixa corre na vertical (gira 90°). */
  vertical: boolean;
}

export interface PropPlacement {
  type: PropType;
  x: number;
  y: number;
  /** Graus, sentido horário (0 = orientação natural do desenho). */
  angle: number;
  /** Índice da variação visual (cor do carro etc.). */
  variant: number;
  /** Espelhado horizontalmente (construções espelhadas). */
  flipX?: boolean;
}

export interface DecalPlacement {
  type: DecalType;
  x: number;
  y: number;
  angle: number;
  scale: number;
  alpha: number;
}

export type BuildingKind = 'house' | 'store' | 'garage' | 'shelter';
export type RoofStyle = 'shingle-a' | 'shingle-b' | 'flat';

export interface RoomData {
  name: string;
  rect: Rect;
}

export interface BuildingData {
  id: string;
  kind: BuildingKind;
  name: string;
  /** Contorno externo (linha central das paredes externas). */
  bounds: Rect;
  roof: RoofStyle;
  rooms: RoomData[];
  /** Portas externas (centro do vão), para a IA e para testes de acesso. */
  doors: { x: number; y: number }[];
}

export interface RegionData {
  id: string;
  name: string;
  rect: Rect;
}

export interface MapData {
  id: string;
  name: string;
  seed: number;
  widthTiles: number;
  heightTiles: number;
  tileSize: number;
  /** ground[y * widthTiles + x] = GroundId */
  ground: Uint8Array;
  markings: MarkingPlacement[];
  walls: WallPiece[];
  props: PropPlacement[];
  decals: DecalPlacement[];
  buildings: BuildingData[];
  regions: RegionData[];
  spawn: { x: number; y: number };
}
