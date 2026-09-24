/**
 * Chunks: o mundo é dividido em quadrados de 16 × 16 tiles (1024 px).
 * Só os chunks perto do jogador existem como objetos do Phaser; o resto é
 * só dado. Zumbis (Fase 5) usam os mesmos chunks para decidir o nível de
 * simulação (completo perto, simplificado longe).
 */
import { TILE } from '../config/GameConfig';

export const CHUNK_TILES = 16;
export const CHUNK_PX = CHUNK_TILES * TILE;

/** Chave numérica única de um chunk (suporta até 32768 chunks por eixo). */
export function chunkKey(cx: number, cy: number): number {
  return (cy + 16384) * 32768 + (cx + 16384);
}

export function keyToChunk(key: number): { cx: number; cy: number } {
  return { cx: (key % 32768) - 16384, cy: Math.floor(key / 32768) - 16384 };
}

export function chunkOf(x: number, y: number): { cx: number; cy: number } {
  return { cx: Math.floor(x / CHUNK_PX), cy: Math.floor(y / CHUNK_PX) };
}

export function chunkKeyAt(x: number, y: number): number {
  return chunkKey(Math.floor(x / CHUNK_PX), Math.floor(y / CHUNK_PX));
}

/** Todos os chunks que tocam um retângulo (px), limitados ao mundo. */
export function chunksInRect(x0: number, y0: number, x1: number, y1: number, worldW: number, worldH: number): number[] {
  const maxCx = Math.ceil(worldW / CHUNK_PX) - 1;
  const maxCy = Math.ceil(worldH / CHUNK_PX) - 1;
  const cx0 = Math.max(0, Math.floor(x0 / CHUNK_PX));
  const cy0 = Math.max(0, Math.floor(y0 / CHUNK_PX));
  const cx1 = Math.min(maxCx, Math.floor(x1 / CHUNK_PX));
  const cy1 = Math.min(maxCy, Math.floor(y1 / CHUNK_PX));
  const out: number[] = [];
  for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) out.push(chunkKey(cx, cy));
  return out;
}

/** Distância em chunks (anel de Chebyshev) entre dois chunks. */
export function chunkRing(a: number, b: number): number {
  const p = keyToChunk(a);
  const q = keyToChunk(b);
  return Math.max(Math.abs(p.cx - q.cx), Math.abs(p.cy - q.cy));
}
