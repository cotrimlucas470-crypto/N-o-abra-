/**
 * Índice do conteúdo ESTÁTICO do mapa por chunk (posições nos arrays do
 * MapData). Cada item pertence ao chunk do seu centro. Conteúdo dinâmico
 * (itens no chão, zumbis, cadáveres) terá o próprio registro por chunk
 * (Fase 2 e 5), com a mesma chave.
 */
import { chunkKey, chunkKeyAt, keyToChunk } from '../sim/ChunkGrid';
import type { BuildingData, MapData } from './MapTypes';

export interface ChunkContent {
  props: number[];
  decals: number[];
  walls: number[];
  markings: number[];
  buildings: number[];
  doors: number[];
  /** Itens colocados no mapa (os largados em jogo ficam no WorldState, com a mesma chave). */
  items: number[];
}

export class ChunkIndex {
  private readonly chunks = new Map<number, ChunkContent>();

  constructor(private readonly map: MapData) {
    const w = map.widthTiles * map.tileSize;
    const h = map.heightTiles * map.tileSize;
    const at = (x: number, y: number) => {
      // Objeto com o centro um pouco fora do mapa (árvore na borda) vai para o
      // chunk de borda mais próximo — senão nunca seria carregado.
      const k = chunkKeyAt(Math.min(Math.max(x, 0), w - 1), Math.min(Math.max(y, 0), h - 1));
      let c = this.chunks.get(k);
      if (!c) {
        c = { props: [], decals: [], walls: [], markings: [], buildings: [], doors: [], items: [] };
        this.chunks.set(k, c);
      }
      return c;
    };
    map.props.forEach((p, i) => at(p.x, p.y).props.push(i));
    map.decals.forEach((d, i) => at(d.x, d.y).decals.push(i));
    map.walls.forEach((w, i) => at(w.x + w.w / 2, w.y + w.h / 2).walls.push(i));
    map.markings.forEach((m, i) => at(m.x, m.y).markings.push(i));
    map.buildings.forEach((b, i) => at(b.bounds.x + b.bounds.w / 2, b.bounds.y + b.bounds.h / 2).buildings.push(i));
    map.doors.forEach((d, i) => at(d.x, d.y).doors.push(i));
    map.items.forEach((it, i) => at(it.x, it.y).items.push(i));
  }

  get(key: number): ChunkContent | undefined {
    return this.chunks.get(key);
  }

  get size(): number {
    return this.chunks.size;
  }

  /** Construções cujo centro está no chunk do ponto ou nos 8 vizinhos. */
  buildingsNear(x: number, y: number): BuildingData[] {
    const { cx, cy } = keyToChunk(chunkKeyAt(x, y));
    const out: BuildingData[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const c = this.chunks.get(chunkKey(cx + dx, cy + dy));
        if (c) for (const i of c.buildings) out.push(this.map.buildings[i]!);
      }
    }
    return out;
  }
}
