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
  /**
   * Deslocamento da textura ao longo do comprimento (px). Peças de uma cerca
   * longa cortada em chunks continuam o desenho sem "emenda".
   */
  offset?: number;
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
  /** Deslocamento do desenho ao longo do comprimento (px), para pedaços cortados em chunks. */
  offset?: number;
}

export interface PropPlacement {
  /**
   * Id estável, derivado do conteúdo (tipo + posição), não da ordem de criação:
   * o save (Fase 2+) guarda mudanças por id, então reorganizar o gerador não
   * embaralha o mundo salvo.
   */
  id: string;
  type: PropType;
  x: number;
  y: number;
  /** Graus, sentido horário (0 = orientação natural do desenho). */
  angle: number;
  /** Índice da variação visual (cor do carro etc.). */
  variant: number;
  /** Espelhado horizontalmente (construções espelhadas). */
  flipX?: boolean;
  /**
   * Camada de ambiente (vegetação, pedras, lixo espalhados depois do traçado).
   * Não faz parte do "mapa expandido" congelado: dá para ajustar a densidade.
   */
  ambient?: true;
}

export interface DecalPlacement {
  type: DecalType;
  x: number;
  y: number;
  angle: number;
  scale: number;
  alpha: number;
  /** Camada de ambiente (ver PropPlacement.ambient). */
  ambient?: true;
}

/** Montinho de recurso natural no chão (galhos, pedras, cogumelos): coleta e, às vezes, volta. */
export type ResourceType = 'galhos' | 'pedras' | 'cogumelos' | 'cogumelosVenenosos';

export interface ResourcePlacement {
  id: string;
  type: ResourceType;
  x: number;
  y: number;
}

/** Tipo da construção — define identidade e, na Fase 4, as tabelas de loot. */
export type BuildingKind = 'house' | 'store' | 'garage' | 'shelter' | 'pharmacy' | 'restaurant' | 'clothing' | 'warehouse';
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

/**
 * Porta num vão de parede. O vão já existe no mapa (parede com abertura);
 * a porta é o que pode fechá-lo. Abrir/fechar/trancar é ESTADO do mundo
 * (sim/WorldState.ts), não do mapa: o mapa diz só onde a porta está.
 */
export type DoorStyle = 'single' | 'double' | 'rolling';
export type DoorMaterial = 'wood' | 'glass' | 'metal';

export interface DoorPlacement {
  /** Id estável (`porta@x,y`, centro do vão em px). O save guarda o estado por id. */
  id: string;
  /** Centro do vão (px). */
  x: number;
  y: number;
  /** Largura do vão ao longo da parede (px). */
  length: number;
  /** Espessura da parede onde está (px). */
  thickness: number;
  /** true = parede vertical (a porta fecha passagem leste-oeste). */
  vertical: boolean;
  style: DoorStyle;
  material: DoorMaterial;
  buildingId: string | null;
  /** Porta da rua (no contorno da construção) ou entre cômodos. */
  exterior: boolean;
  /**
   * Para que lado a folha abre, perpendicular à parede: +1 = para +y (parede
   * horizontal) ou +x (parede vertical); -1 = o contrário. Portas da rua abrem
   * para dentro.
   */
  swing: 1 | -1;
}

/** Item colocado no mapa pelo autor (setor feito à mão). Loot gerado vem na fase de loot. */
export interface ItemPlacement {
  /** Id estável (`item:tipo@x,y`). Pegar o item fica registrado no estado do mundo. */
  id: string;
  defId: string;
  count: number;
  x: number;
  y: number;
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
  doors: DoorPlacement[];
  items: ItemPlacement[];
  /** Recursos naturais coletáveis (camada de ambiente). */
  resources: ResourcePlacement[];
  regions: RegionData[];
  spawn: { x: number; y: number };
}
