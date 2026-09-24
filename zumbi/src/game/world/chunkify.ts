/**
 * Prepara um MapData para ser carregado em chunks: corta faixas e paredes
 * longas (uma cerca de 4 km, uma faixa de avenida) em pedaços que cabem
 * num chunk, guardando o deslocamento do desenho para não haver emenda.
 *
 * Paredes de construção (≤ 1 chunk) não são cortadas: o contorno desenhado
 * delas mostraria a emenda. Elas vão para o chunk do seu centro, e o anel de
 * carga (vizinhos sempre carregados) garante que aparecem a tempo.
 */
import { CHUNK_PX } from '../sim/ChunkGrid';
import type { MapData, MarkingPlacement, WallPiece } from './MapTypes';

/** Divide o intervalo [a, b) nas fronteiras de chunk. */
function cuts(a: number, b: number): [number, number][] {
  const out: [number, number][] = [];
  let s = a;
  while (s < b - 1e-6) {
    const next = Math.min(b, (Math.floor(s / CHUNK_PX) + 1) * CHUNK_PX);
    out.push([s, next]);
    s = next;
  }
  return out;
}

export function splitMarking(m: MarkingPlacement): MarkingPlacement[] {
  const start = (m.vertical ? m.y : m.x) - m.length / 2;
  const end = start + m.length;
  if (m.length <= CHUNK_PX && Math.floor(start / CHUNK_PX) === Math.floor((end - 1e-6) / CHUNK_PX)) return [m];
  const base = m.offset ?? 0;
  return cuts(start, end).map(([a, b]) => {
    const c = (a + b) / 2;
    return {
      ...m,
      x: m.vertical ? m.x : c,
      y: m.vertical ? c : m.y,
      length: b - a,
      offset: base + (a - start),
    };
  });
}

export function splitWall(w: WallPiece): WallPiece[] {
  const vertical = w.h > w.w;
  const len = vertical ? w.h : w.w;
  if (len <= CHUNK_PX && w.kind !== 'fence') return [w];
  const start = vertical ? w.y : w.x;
  const pieces = cuts(start, start + len);
  if (pieces.length === 1) return [w];
  const base = w.offset ?? 0;
  return pieces.map(([a, b]) =>
    vertical ? { ...w, y: a, h: b - a, offset: base + (a - start) } : { ...w, x: a, w: b - a, offset: base + (a - start) },
  );
}

export function chunkifyMap(map: MapData): MapData {
  return {
    ...map,
    markings: map.markings.flatMap(splitMarking),
    walls: map.walls.flatMap(splitWall),
  };
}
