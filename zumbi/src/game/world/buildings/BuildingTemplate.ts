/**
 * Modelo de construção em coordenadas LOCAIS de tile (0,0 = canto
 * superior esquerdo das paredes externas). O MapBuilder gira/espelha
 * e posiciona no mapa. Um modelo = uma planta reaproveitável.
 */
import type { DecalType } from '../DecalCatalog';
import type { BuildingKind, GroundId, RoofStyle, WallKind } from '../MapTypes';
import type { Opening } from '../MapBuilder';
import type { PropType } from '../PropCatalog';

export type Rotation = 0 | 90 | 180 | 270;

export interface TemplateWall {
  a: readonly [number, number];
  b: readonly [number, number];
  kind?: WallKind;
  openings?: Opening[];
}

export interface BuildingTemplate {
  kind: BuildingKind;
  name: string;
  w: number;
  h: number;
  roof: RoofStyle;
  floors: { rect: readonly [number, number, number, number]; ground: GroundId; room: string }[];
  walls: TemplateWall[];
  props: { type: PropType; at: readonly [number, number]; angle?: number; variant?: number }[];
  decals?: { type: DecalType; at: readonly [number, number]; angle?: number; scale?: number; alpha?: number }[];
  /** Centro de cada porta externa + lado da fachada. */
  doors: { at: readonly [number, number]; side: 'n' | 's' | 'e' | 'w' }[];
}

export const door = (at: number, len: number): Opening => ({ at, len, type: 'door' });
export const win = (at: number, len: number): Opening => ({ at, len, type: 'window' });
