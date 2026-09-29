/**
 * Prédios gerados dentro de um setor: escolhe o tamanho, gera a planta
 * (arquétipo + chave única) e monta virado para a rua. A chave junta o id
 * do prédio e um sorteio do gerador do setor: mesma cidade = mesmo prédio;
 * outra semente = outro prédio.
 */
import type { PlacedBuilding } from '../MapBuilder';
import type { RoofStyle } from '../MapTypes';
import { ARCHETYPES, type ArchetypeId } from '../buildings/gen/archetypes';
import { generateBuilding, type GenOptions, type GenResult } from '../buildings/gen/generate';
import { PROP_DEFS } from '../PropCatalog';
import { distToRect, propSize } from '../buildings/gen/space';
import type { SectorBuilder } from './SectorBuilder';

export interface GenPlacement {
  arch: ArchetypeId;
  /** Canto superior esquerdo (tiles locais do setor) e tamanho já girado. */
  x: number;
  y: number;
  W: number;
  H: number;
  id: string;
  /** Lado da rua (fachada): norte ou sul. */
  front: 'n' | 's';
  flipX?: boolean;
  roof?: RoofStyle;
  gen?: GenOptions;
}

export function placeGenerated(b: SectorBuilder, p: GenPlacement): { placed: PlacedBuilding; gen: GenResult } {
  const salt = b.rng.int(0, 1 << 30);
  const gen = generateBuilding(p.arch, p.W, p.H, `${p.id}:${salt}`, p.gen);
  const placed = b.building(gen.tpl, p.x, p.y, { id: p.id, rot: p.front === 's' ? 0 : 180, ...(p.flipX ? { flipX: true } : {}), ...(p.roof ? { roof: p.roof } : {}) });
  return { placed, gen };
}

/** Sorteia um tamanho do arquétipo que caiba (largura e fundo máximos). */
export function sizeFor(b: SectorBuilder, arch: ArchetypeId, maxW: number, maxH: number): { W: number; H: number } | null {
  const a = ARCHETYPES[arch];
  const wHi = Math.min(a.w[1], Math.floor(maxW));
  const hHi = Math.min(a.h[1], Math.floor(maxH));
  if (wHi < a.w[0] || hHi < a.h[0]) return null;
  return { W: b.rng.int(a.w[0], wHi), H: b.rng.int(a.h[0], hHi) };
}

/**
 * Pontos livres de chão (tiles do setor) num cômodo do prédio gerado, do
 * meio para fora: onde deixar um item solto sem cair dentro de móvel. O
 * primeiro cômodo cujo nome está em `rooms` (senão, qualquer um).
 */
export function floorSpots(placed: PlacedBuilding, gen: GenResult, rooms: readonly string[], count: number, gap = 1.1): [number, number][] {
  const floors = gen.tpl.floors;
  const f = rooms.map((n) => floors.find((q) => q.room === n)).find((q) => q) ?? floors[0]!;
  const [rx, ry, rw, rh] = f.rect;
  const boxes = gen.tpl.props
    .filter((p) => PROP_DEFS[p.type].collider.shape !== 'none')
    .map((p) => {
      const [w, h] = propSize(p.type, p.angle ?? 0);
      return { x: p.at[0] - w / 2, y: p.at[1] - h / 2, w, h };
    });
  const cands: [number, number, number][] = [];
  for (let y = ry + 0.5; y <= ry + rh - 0.5; y += 0.25) {
    for (let x = rx + 0.5; x <= rx + rw - 0.5; x += 0.25) {
      if (boxes.some((b) => distToRect(b, x, y) < 0.5)) continue;
      // Longe de onde se nasce: acordar sem nada "ao alcance".
      if (gen.spawn && Math.hypot(x - gen.spawn[0], y - gen.spawn[1]) < 2) continue;
      cands.push([x, y, Math.hypot(x - (rx + rw / 2), y - (ry + rh / 2))]);
    }
  }
  cands.sort((a, b) => a[2] - b[2]);
  const out: [number, number][] = [];
  for (const [x, y] of cands) {
    if (out.length >= count) break;
    if (out.some(([ox, oy]) => Math.hypot(ox - x, oy - y) < gap)) continue;
    out.push([x, y]);
  }
  return out.map(([x, y]) => {
    const [mx, my] = placed.toMap(x, y);
    return [Math.round(mx * 100) / 100, Math.round(my * 100) / 100];
  });
}
