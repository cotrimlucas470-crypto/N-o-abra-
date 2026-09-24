/**
 * Apoio aos testes: por onde o CORPO do jogador consegue andar (mesma
 * geometria de colisão da física) e o que dá para alcançar a partir de um ponto.
 */
import { PLAYER_TUNING } from '../../src/game/config/PlayerTuning';
import { TILE } from '../../src/game/config/GameConfig';
import { circleHitsSolid, type Solid } from '../../src/game/world/collision';
import type { MapData } from '../../src/game/world/MapTypes';

const R = PLAYER_TUNING.bodyRadius;

/** Grade de células onde o CENTRO do jogador cabe sem encostar em nada. */
export function walkableGrid(map: MapData, solids: Solid[], CELL: number): { cols: number; rows: number; free: Uint8Array } {
  const cols = Math.floor((map.widthTiles * TILE) / CELL);
  const rows = Math.floor((map.heightTiles * TILE) / CELL);
  const free = new Uint8Array(cols * rows).fill(1);
  // Índice espacial simples para não testar todos os sólidos por célula.
  const bucket = new Map<number, Solid[]>();
  const B = 128;
  const key = (bx: number, by: number) => by * 10000 + bx;
  for (const s of solids) {
    const [x0, y0, x1, y1] =
      s.kind === 'rect' ? [s.x, s.y, s.x + s.w, s.y + s.h] : [s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r];
    for (let by = Math.floor((y0 - R) / B); by <= Math.floor((y1 + R) / B); by++) {
      for (let bx = Math.floor((x0 - R) / B); bx <= Math.floor((x1 + R) / B); bx++) {
        const k = key(bx, by);
        if (!bucket.has(k)) bucket.set(k, []);
        bucket.get(k)!.push(s);
      }
    }
  }
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const x = cx * CELL + CELL / 2;
      const y = cy * CELL + CELL / 2;
      if (x < R || y < R || x > map.widthTiles * TILE - R || y > map.heightTiles * TILE - R) {
        free[cy * cols + cx] = 0;
        continue;
      }
      const list = bucket.get(key(Math.floor(x / B), Math.floor(y / B))) ?? [];
      if (list.some((s) => circleHitsSolid(x, y, R, s))) free[cy * cols + cx] = 0;
    }
  }
  return { cols, rows, free };
}

export function flood(grid: ReturnType<typeof walkableGrid>, sx: number, sy: number, CELL: number): Uint8Array {
  const { cols, rows, free } = grid;
  const seen = new Uint8Array(cols * rows);
  const start = Math.floor(sy / CELL) * cols + Math.floor(sx / CELL);
  if (!free[start]) return seen;
  const queue = [start];
  seen[start] = 1;
  while (queue.length) {
    const i = queue.pop()!;
    const cx = i % cols;
    const cy = (i / cols) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const j = ny * cols + nx;
      if (!seen[j] && free[j]) {
        seen[j] = 1;
        queue.push(j);
      }
    }
  }
  return seen;
}

