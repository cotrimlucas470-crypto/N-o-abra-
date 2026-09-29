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
export function floorSpots(placed: PlacedBuilding, gen: GenResult, rooms: readonly string[], count: number, taken: readonly (readonly [number, number])[] = [], gap = 1.1): [number, number][] {
  const floors = gen.tpl.floors;
  const boxes = gen.tpl.props
    .filter((p) => PROP_DEFS[p.type].collider.shape !== 'none')
    .map((p) => {
      const [w, h] = propSize(p.type, p.angle ?? 0);
      return { x: p.at[0] - w / 2, y: p.at[1] - h / 2, w, h };
    });
  // Portas (vãos das paredes e da rua): item no caminho da porta atrapalha abrir e passar.
  const doors: [number, number][] = gen.tpl.doors.map((d) => [d.at[0], d.at[1]]);
  for (const w of gen.tpl.walls) {
    const horizontal = w.a[1] === w.b[1];
    const dir = horizontal ? Math.sign(w.b[0] - w.a[0]) : Math.sign(w.b[1] - w.a[1]);
    for (const o of w.openings ?? []) {
      if (o.type !== 'door') continue;
      const mid = (horizontal ? w.a[0] : w.a[1]) + dir * (o.at + o.len / 2);
      doors.push(horizontal ? [mid, w.a[1]] : [w.a[0], mid]);
    }
  }
  const reach = bodyReach(gen, boxes);
  // Cômodos pedidos primeiro; se não couber, os outros (o item nunca fica de fora).
  const order = [...rooms.map((n) => floors.find((q) => q.room === n)).filter((q) => !!q), ...floors];
  const out: [number, number][] = [];
  for (const [doorGap, propGap] of [[1.6, 0.5], [1.0, 0.4]] as const) {
    for (const f of order) {
      if (out.length >= count) break;
      const [rx, ry, rw, rh] = f!.rect;
      const cands: [number, number, number][] = [];
      for (let y = ry + 0.5; y <= ry + rh - 0.5; y += 0.25) {
        for (let x = rx + 0.5; x <= rx + rw - 0.5; x += 0.25) {
          if (boxes.some((b) => distToRect(b, x, y) < propGap)) continue;
          // O corpo chega até ali a partir da porta da rua (não é canto preso atrás de móvel).
          if (!reach(x, y)) continue;
          if (doors.some(([dx, dy]) => Math.hypot(dx - x, dy - y) < doorGap)) continue;
          // Longe de onde se nasce: acordar sem nada "ao alcance".
          if (gen.spawn && Math.hypot(x - gen.spawn[0], y - gen.spawn[1]) < 2) continue;
          cands.push([x, y, Math.hypot(x - (rx + rw / 2), y - (ry + rh / 2))]);
        }
      }
      cands.sort((a, b) => a[2] - b[2]);
      for (const [x, y] of cands) {
        if (out.length >= count) break;
        if (out.some(([ox, oy]) => Math.hypot(ox - x, oy - y) < gap)) continue;
        // Longe dos itens que outras chamadas já puseram (coordenadas do setor).
        const [mx, my] = placed.toMap(x, y);
        if (taken.some(([tx, ty]) => Math.hypot(tx - mx, ty - my) < gap)) continue;
        out.push([x, y]);
      }
    }
    if (out.length >= count) break;
  }
  return out.map(([x, y]) => {
    const [mx, my] = placed.toMap(x, y);
    return [Math.round(mx * 100) / 100, Math.round(my * 100) / 100];
  });
}

/**
 * Por onde o corpo do jogador anda dentro do prédio (tiles locais), a partir
 * das portas da rua: grade de 1/4 de tile, paredes (janela conta como parede)
 * e móveis como caixas do tamanho do desenho (um pouco maiores que o real).
 */
function bodyReach(gen: GenResult, boxes: readonly { x: number; y: number; w: number; h: number }[]): (x: number, y: number) => boolean {
  const C = 0.25;
  const R = 0.26;
  const { w: W, h: H } = gen.tpl;
  const cols = Math.ceil(W / C);
  const rows = Math.ceil(H / C);
  // Trechos de parede (sem os vãos de porta).
  const segs: { x: number; y: number; w: number; h: number }[] = [];
  for (const wl of gen.tpl.walls) {
    const horizontal = wl.a[1] === wl.b[1];
    const a = horizontal ? wl.a[0] : wl.a[1];
    const b = horizontal ? wl.b[0] : wl.b[1];
    const dir = Math.sign(b - a) || 1;
    const doors = (wl.openings ?? []).filter((o) => o.type === 'door').map((o) => [a + dir * o.at, a + dir * (o.at + o.len)].sort((p, q) => p - q) as [number, number]);
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    let cur = lo;
    for (const [d0, d1] of doors.sort((p, q) => p[0] - q[0])) {
      if (d0 > cur) segs.push(horizontal ? { x: cur, y: wl.a[1] - 0.11, w: d0 - cur, h: 0.22 } : { x: wl.a[0] - 0.11, y: cur, w: 0.22, h: d0 - cur });
      cur = Math.max(cur, d1);
    }
    if (hi > cur) segs.push(horizontal ? { x: cur, y: wl.a[1] - 0.11, w: hi - cur, h: 0.22 } : { x: wl.a[0] - 0.11, y: cur, w: 0.22, h: hi - cur });
  }
  const solids = [...segs, ...boxes];
  const free = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = (i + 0.5) * C;
      const y = (j + 0.5) * C;
      if (!solids.some((q) => distToRect(q, x, y) < R)) free[j * cols + i] = 1;
    }
  }
  const seen = new Uint8Array(cols * rows);
  const stack: number[] = [];
  for (const d of gen.tpl.doors) {
    // Um passo para dentro da porta da rua.
    const [dx, dy] = d.side === 'n' ? [0, 0.4] : d.side === 's' ? [0, -0.4] : d.side === 'w' ? [0.4, 0] : [-0.4, 0];
    const i = Math.floor((d.at[0] + dx) / C);
    const j = Math.floor((d.at[1] + dy) / C);
    if (i < 0 || j < 0 || i >= cols || j >= rows || !free[j * cols + i] || seen[j * cols + i]) continue;
    seen[j * cols + i] = 1;
    stack.push(j * cols + i);
  }
  while (stack.length) {
    const k = stack.pop()!;
    const i = k % cols;
    const j = (k - i) / cols;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
      const q = nj * cols + ni;
      if (!free[q] || seen[q]) continue;
      seen[q] = 1;
      stack.push(q);
    }
  }
  return (x, y) => {
    const i = Math.floor(x / C);
    const j = Math.floor(y / C);
    return i >= 0 && j >= 0 && i < cols && j < rows && seen[j * cols + i] === 1;
  };
}
