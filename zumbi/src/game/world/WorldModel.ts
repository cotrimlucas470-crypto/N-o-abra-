/**
 * O mundo como DADO (sem Phaser): mapa, índice por chunk, grades de
 * navegação e de visão. É o que a IA, o som, o loot e o save consultam.
 * O WorldRenderer só desenha o que este modelo diz.
 */
import { chunkifyMap } from './chunkify';
import { ChunkIndex } from './ChunkIndex';
import type { MapData } from './MapTypes';
import { NavGrid } from './nav/NavGrid';
import { SightGrid } from './nav/SightGrid';

export class WorldModel {
  readonly map: MapData;
  readonly index: ChunkIndex;
  readonly nav: NavGrid;
  readonly sight: SightGrid;
  readonly widthPx: number;
  readonly heightPx: number;

  constructor(raw: MapData) {
    this.map = chunkifyMap(raw);
    this.index = new ChunkIndex(this.map);
    this.nav = NavGrid.fromMap(this.map);
    this.sight = SightGrid.fromMap(this.map);
    this.widthPx = this.map.widthTiles * this.map.tileSize;
    this.heightPx = this.map.heightTiles * this.map.tileSize;
  }

  regionAt(x: number, y: number) {
    return this.map.regions.find((r) => x >= r.rect.x && x < r.rect.x + r.rect.w && y >= r.rect.y && y < r.rect.y + r.rect.h) ?? null;
  }
}
