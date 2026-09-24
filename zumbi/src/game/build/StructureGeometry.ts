/**
 * Geometria das construções (puro): tamanho girado, área, corpo sólido,
 * bloqueio de visão e ONDE a peça encaixa a partir da posição e da direção
 * do jogador (borda do tile, tiles à frente ou ponto livre).
 */
import type { Rect } from '../world/MapTypes';
import type { Solid } from '../world/collision';
import { STRUCTURE_DEFS, TILE_PX, type StructureDef, type StructureType } from './StructureCatalog';
import type { Structure } from './Structures';

export interface Placement {
  x: number;
  y: number;
  rot: number;
}

/** Tamanho (px) já girado. */
export function sizeOf(type: StructureType, rot: number, len?: number): { w: number; h: number } {
  const d: StructureDef = STRUCTURE_DEFS[type];
  let w: number = len ?? d.w;
  let h: number = d.h;
  if (d.place === 'tile' && d.tiles) {
    w = d.tiles[0] * TILE_PX;
    h = d.tiles[1] * TILE_PX;
  }
  return rot % 2 === 1 ? { w: h, h: w } : { w, h };
}

export function rectAt(type: StructureType, x: number, y: number, rot: number, len?: number): Rect {
  const { w, h } = sizeOf(type, rot, len);
  return { x: x - w / 2, y: y - h / 2, w, h };
}

export function rectOf(s: Structure): Rect {
  return rectAt(s.type, s.x, s.y, s.rot, s.len);
}

/** Corpo sólido (ou null: porta aberta, piso, fogueira...). */
export function solidOf(s: Structure): Solid | null {
  const d: StructureDef = STRUCTURE_DEFS[s.type];
  if (!d.solid || (d.kind === 'porta' && s.open)) return null;
  const r = rectOf(s);
  const k = d.inset ?? 0;
  return { kind: 'rect', x: r.x + k, y: r.y + k, w: Math.max(4, r.w - 2 * k), h: Math.max(4, r.h - 2 * k) };
}

/** Área que bloqueia a visão (ou null). */
export function sightOf(s: Structure): Rect | null {
  const d: StructureDef = STRUCTURE_DEFS[s.type];
  if (!d.opaque || (d.kind === 'porta' && s.open)) return null;
  return rectOf(s);
}

export function rectsOverlap(a: Rect, b: Rect, slack = 1): boolean {
  return a.x + slack < b.x + b.w && b.x + slack < a.x + a.w && a.y + slack < b.y + b.h && b.y + slack < a.y + a.h;
}

export function pointIn(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

/**
 * Onde a peça encaixa com o jogador em (px, py) olhando para `facing`.
 * `rot` só vale para peças de tile (o jogador gira com o botão GIRAR).
 */
export function placementFor(type: StructureType, px: number, py: number, facing: number, rot = 0): Placement {
  const d: StructureDef = STRUCTURE_DEFS[type];
  const dx = Math.cos(facing);
  const dy = Math.sin(facing);
  const tx = Math.floor(px / TILE_PX);
  const ty = Math.floor(py / TILE_PX);
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  if (d.place === 'edge') {
    // Olhando para leste/oeste: parede em pé na borda leste/oeste do tile.
    if (horizontal) return { x: (tx + (dx > 0 ? 1 : 0)) * TILE_PX, y: ty * TILE_PX + TILE_PX / 2, rot: 1 };
    return { x: tx * TILE_PX + TILE_PX / 2, y: (ty + (dy > 0 ? 1 : 0)) * TILE_PX, rot: 0 };
  }
  if (d.place === 'tile') {
    const [bw, bh] = d.tiles ?? [1, 1];
    const fw = rot % 2 ? bh : bw;
    const fh = rot % 2 ? bw : bh;
    let x0: number;
    let y0: number;
    if (horizontal) {
      x0 = dx > 0 ? tx + 1 : tx - fw;
      y0 = ty - Math.floor((fh - 1) / 2);
    } else {
      y0 = dy > 0 ? ty + 1 : ty - fh;
      x0 = tx - Math.floor((fw - 1) / 2);
    }
    return { x: (x0 + fw / 2) * TILE_PX, y: (y0 + fh / 2) * TILE_PX, rot: rot % 4 };
  }
  const dist = 26 + Math.max(d.w, d.h) / 2;
  return { x: px + dx * dist, y: py + dy * dist, rot: 0 };
}
