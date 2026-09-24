/**
 * Preenche um quarteirão conforme o tipo de zona, reaproveitando as plantas:
 *
 *  - residencial: casas lado a lado de frente para a avenida, entradas de
 *    carro, quintais nos fundos;
 *  - comercial: mercadinho e lojas (farmácia, lanchonete, roupas) com calçada
 *    larga, estacionamento no que sobra e pátio de serviço nos fundos;
 *  - industrial: galpões e oficinas com pátio de cascalho e sucata;
 *  - parque: gramado, caminhos, árvores e bancos.
 *
 * Tudo sorteado com o gerador do setor (mesma semente = mesmo quarteirão).
 * Portas nunca ficam bloqueadas: nada de decoração perto de porta — e o teste
 * de integridade da cidade confere cada cômodo.
 */
import type { Random } from '../../core/Random';
import { Ground, type GroundId, type RoofStyle } from '../MapTypes';
import type { PropType } from '../PropCatalog';
import type { BuildingTemplate } from '../buildings/BuildingTemplate';
import { CORNER_STORE, GARAGE, HOUSE_SMALL, HOUSE_TINY, WAREHOUSE, shopTemplate } from '../buildings/templates';
import type { SectorBuilder } from './SectorBuilder';
import type { BlockArea } from './SectorLayout';

export type BlockZone = 'residential' | 'commercial' | 'industrial' | 'park';

interface Candidate {
  tpl: BuildingTemplate;
  weight: number;
  roofs?: RoofStyle[];
}

interface Placed {
  x: number;
  y: number;
  w: number;
  h: number;
  doors: { x: number; y: number }[];
}

/** Pontos (portas) e retângulos (construções) que a decoração deve evitar. */
class Keepout {
  private points: { x: number; y: number; r: number }[] = [];
  private rects: { x0: number; y0: number; x1: number; y1: number }[] = [];

  addPoint(x: number, y: number, r: number): void {
    this.points.push({ x, y, r });
  }

  addRect(x0: number, y0: number, x1: number, y1: number): void {
    this.rects.push({ x0, y0, x1, y1 });
  }

  /** Um objeto de "raio" r (tiles) caberia em (x, y)? */
  free(x: number, y: number, r: number): boolean {
    for (const p of this.points) if ((x - p.x) ** 2 + (y - p.y) ** 2 < (r + p.r) ** 2) return false;
    for (const q of this.rects) if (x + r > q.x0 && x - r < q.x1 && y + r > q.y0 && y - r < q.y1) return false;
    return true;
  }
}

export function fillBlock(b: SectorBuilder, area: BlockArea, zone: BlockZone, idPrefix: string): void {
  switch (zone) {
    case 'residential':
      return residential(b, area, idPrefix);
    case 'commercial':
      return commercial(b, area, idPrefix);
    case 'industrial':
      return industrial(b, area, idPrefix);
    case 'park':
      return park(b, area);
  }
}

// ---------------------------------------------------------------- fileira de fachadas

function pick<T extends { weight: number }>(rng: Random, items: T[]): T | null {
  if (items.length === 0) return null;
  return rng.weighted(items.map((c) => [c, c.weight] as const));
}

/**
 * Coloca construções lado a lado ao longo da fachada do quarteirão.
 * Retorna o que foi colocado e até onde (x) a fileira foi.
 */
function placeRow(
  b: SectorBuilder,
  area: BlockArea,
  candidates: Candidate[],
  opts: { setback: number; gap: [number, number]; idPrefix: string; keep: Keepout; pathGround: GroundId; flip: boolean; maxX?: number },
): { placed: Placed[]; endX: number } {
  const rng = b.rng;
  const placed: Placed[] = [];
  const limit = opts.maxX ?? area.x1 - 1;
  let x = area.x0 + rng.int(1, 2);
  let n = 0;
  for (;;) {
    const fits = candidates.filter((c) => x + c.tpl.w <= limit);
    const c = pick(rng, fits);
    if (!c) break;
    const t = c.tpl;
    const y = area.front === 's' ? area.y1 - opts.setback - t.h : area.y0 + opts.setback;
    const rot = t.front === area.front ? 0 : 180;
    const flipX = opts.flip && rng.chance(0.5);
    const roof = c.roofs ? rng.pick(c.roofs) : undefined;
    const pb = b.building(t, x, y, { id: `${opts.idPrefix}-${n++}`, rot, flipX, ...(roof ? { roof } : {}) });
    // caminho da porta principal até a calçada
    const main = pb.doors.find((d) => d.side === area.front) ?? pb.doors[0];
    if (main) {
      const px = Math.round(main.x - 1);
      if (area.front === 's') b.fill(px, main.y, 2, area.y1 - main.y, opts.pathGround);
      else b.fill(px, area.y0, 2, main.y - area.y0, opts.pathGround);
    }
    for (const d of pb.doors) opts.keep.addPoint(d.x, d.y, 1.8);
    opts.keep.addRect(x - 0.3, y - 0.3, x + t.w + 0.3, y + t.h + 0.3);
    placed.push({ x, y, w: t.w, h: t.h, doors: pb.doors });
    x += t.w + rng.int(opts.gap[0], opts.gap[1]);
  }
  return { placed, endX: x };
}

/** Faixa de fundos (entre a fileira e o fundo do quarteirão). */
function backBand(area: BlockArea, rowDepth: number, setback: number): { x0: number; y0: number; x1: number; y1: number } {
  return area.front === 's'
    ? { x0: area.x0, y0: area.y0, x1: area.x1, y1: area.y1 - setback - rowDepth }
    : { x0: area.x0, y0: area.y0 + setback + rowDepth, x1: area.x1, y1: area.y1 };
}

/** Espalha objetos numa área, respeitando distância mínima e áreas proibidas. */
function scatterProps(
  b: SectorBuilder,
  band: { x0: number; y0: number; x1: number; y1: number },
  keep: Keepout,
  items: { type: PropType; r: number; weight: number; angle?: boolean }[],
  count: number,
  margin = 1,
): void {
  const rng = b.rng;
  let placed = 0;
  const maxR = Math.max(...items.map((i) => i.r));
  if (band.x1 - band.x0 < 2 * (margin + maxR) || band.y1 - band.y0 < 2 * (margin + maxR)) return;
  for (let tries = 0; tries < count * 12 && placed < count; tries++) {
    const it = rng.weighted(items.map((i) => [i, i.weight] as const));
    const x = rng.range(band.x0 + margin + it.r, band.x1 - margin - it.r);
    const y = rng.range(band.y0 + margin + it.r, band.y1 - margin - it.r);
    if (!(x < band.x1 && y < band.y1) || !keep.free(x, y, it.r)) continue;
    b.prop(it.type, x, y, it.angle ? rng.range(0, 360) : 0);
    keep.addPoint(x, y, it.r);
    placed++;
  }
}

// ---------------------------------------------------------------- residencial

function residential(b: SectorBuilder, area: BlockArea, idPrefix: string): void {
  const rng = b.rng;
  const keep = new Keepout();
  const setback = 2;
  const { placed } = placeRow(
    b,
    area,
    [
      { tpl: HOUSE_SMALL, weight: 5, roofs: ['shingle-a', 'shingle-b'] },
      { tpl: HOUSE_TINY, weight: 3, roofs: ['shingle-a', 'shingle-b'] },
    ],
    { setback, gap: [3, 5], idPrefix, keep, pathGround: Ground.Concrete, flip: true },
  );

  // Entradas de carro no vão entre casas (às vezes com carro).
  for (let i = 0; i < placed.length - 1; i++) {
    const a = placed[i]!;
    const next = placed[i + 1]!;
    const gapX0 = a.x + a.w;
    const gapW = next.x - gapX0;
    if (gapW < 3 || !rng.chance(0.55)) continue;
    const dx = gapX0 + gapW / 2;
    const [y0, y1] = area.front === 's' ? [a.y + 1, area.y1] : [area.y0, a.y + a.h - 1];
    b.fill(Math.round(dx - 1), y0, 2, y1 - y0, Ground.Concrete);
    if (rng.chance(0.6)) {
      const cy = (y0 + y1) / 2 + (area.front === 's' ? 1 : -1);
      b.prop(rng.chance(0.15) ? 'carWreck' : 'car', dx, cy, (area.front === 's' ? 90 : -90) + rng.range(-4, 4));
      keep.addRect(dx - 0.8, cy - 1.6, dx + 0.8, cy + 1.6);
    }
  }

  // Quintais
  const band = backBand(area, 8, setback);
  if (rng.chance(0.4)) {
    const gx = rng.range(band.x0 + 2, band.x1 - 8);
    const gy = area.front === 's' ? band.y0 + 1 : band.y1 - 4;
    b.fill(Math.round(gx), Math.round(gy), 5, 3, Ground.Dirt);
    keep.addRect(gx, gy, gx + 5, gy + 3);
  }
  scatterProps(
    b,
    band,
    keep,
    [
      { type: 'treeLarge', r: 1.2, weight: 2 },
      { type: 'treeSmall', r: 0.9, weight: 2 },
      { type: 'bush', r: 0.6, weight: 3 },
      { type: 'trashCan', r: 0.4, weight: 1 },
      { type: 'tire', r: 0.4, weight: 1 },
      { type: 'crate', r: 0.5, weight: 0.5, angle: true },
    ],
    rng.int(5, 9),
  );
  b.scatterDecals(['leaves'], 6, band.x0, band.y0, band.x1 - band.x0, band.y1 - band.y0, [0.7, 1.2], [0.5, 0.9]);

  // Cercas curtas entre quintais (com folga: não fecham passagem).
  for (let i = 0; i < placed.length - 1; i++) {
    const a = placed[i]!;
    const fx = a.x + a.w + 1.5;
    if (area.front === 's') b.wall(fx, band.y0, fx, band.y0 + Math.max(0, band.y1 - band.y0 - 3), 'fence');
    else b.wall(fx, band.y0 + 3, fx, band.y1, 'fence');
  }
}

// ---------------------------------------------------------------- comercial

function commercial(b: SectorBuilder, area: BlockArea, idPrefix: string): void {
  const rng = b.rng;
  const keep = new Keepout();
  const setback = 2;
  // calçada larga na frente das lojas
  const [fy0, fy1] = area.front === 's' ? [area.y1 - setback, area.y1] : [area.y0, area.y0 + setback];
  b.fill(area.x0, fy0, area.x1 - area.x0, fy1 - fy0, Ground.Concrete);

  const { placed, endX } = placeRow(
    b,
    area,
    [
      { tpl: CORNER_STORE, weight: 2 },
      { tpl: shopTemplate('pharmacy'), weight: 2 },
      { tpl: shopTemplate('restaurant'), weight: 2 },
      { tpl: shopTemplate('clothing'), weight: 2 },
    ],
    { setback, gap: [2, 3], idPrefix, keep, pathGround: Ground.Concrete, flip: true, maxX: area.x1 - 1 },
  );

  // Estacionamento no que sobrou da fachada
  const lotX0 = Math.ceil(endX);
  const lotW = area.x1 - 1 - lotX0;
  if (lotW >= 8) {
    const depth = 9;
    const [ly0, ly1] = area.front === 's' ? [area.y1 - depth, area.y1] : [area.y0, area.y0 + depth];
    b.fill(lotX0, ly0, lotW, depth, Ground.Parking);
    const rowY = area.front === 's' ? ly0 + 1.1 : ly1 - 1.1;
    b.marking('stall', lotX0 + 0.5, rowY + (area.front === 's' ? 0.9 : -0.9), lotX0 + lotW - 0.5, rowY + (area.front === 's' ? 0.9 : -0.9), 120);
    const stalls = Math.floor((lotW - 1) / 2.25);
    for (let i = 0; i < stalls; i++) {
      if (!rng.chance(0.55)) continue;
      const x = lotX0 + 0.5 + 2.25 * (i + 0.5);
      b.prop(rng.chance(0.2) ? 'carWreck' : 'car', x, rowY + (area.front === 's' ? 1 : -1), (area.front === 's' ? 90 : -90) + rng.range(-6, 6));
    }
    if (rng.chance(0.6)) b.prop('cart', lotX0 + rng.range(2, lotW - 2), (ly0 + ly1) / 2 + (area.front === 's' ? 2 : -2), rng.range(0, 360));
    b.scatterDecals(['oil', 'paper'], 5, lotX0, ly0, lotW, depth);
    keep.addRect(lotX0, ly0, lotX0 + lotW, ly1);
  }

  // Pátio de serviço nos fundos
  const rowDepth = Math.max(0, ...placed.map((p) => p.h));
  const band = backBand(area, rowDepth, setback);
  if (band.y1 - band.y0 >= 3) {
    b.fill(band.x0, band.y0, band.x1 - band.x0, band.y1 - band.y0, Ground.Concrete);
    scatterProps(
      b,
      band,
      keep,
      [
        { type: 'dumpster', r: 1.1, weight: 2 },
        { type: 'trashBags', r: 0.6, weight: 3, angle: true },
        { type: 'boxes', r: 0.7, weight: 2, angle: true },
        { type: 'pallet', r: 0.7, weight: 1, angle: true },
      ],
      rng.int(4, 7),
    );
    b.scatterDecals(['oil', 'paper', 'crack'], 6, band.x0, band.y0, band.x1 - band.x0, band.y1 - band.y0);
  }
  b.scatterDecals(['paper'], 5, area.x0, fy0, area.x1 - area.x0, fy1 - fy0);
}

// ---------------------------------------------------------------- industrial

function industrial(b: SectorBuilder, area: BlockArea, idPrefix: string): void {
  const rng = b.rng;
  const keep = new Keepout();
  const setback = 3;
  const [fy0, fy1] = area.front === 's' ? [area.y1 - setback, area.y1] : [area.y0, area.y0 + setback];
  b.fill(area.x0, fy0, area.x1 - area.x0, fy1 - fy0, Ground.Concrete);
  const { placed } = placeRow(
    b,
    area,
    [
      { tpl: WAREHOUSE, weight: 3 },
      { tpl: GARAGE, weight: 2 },
    ],
    { setback, gap: [2, 4], idPrefix, keep, pathGround: Ground.Concrete, flip: true },
  );
  const rowDepth = Math.max(0, ...placed.map((p) => p.h));
  const band = backBand(area, rowDepth, setback);
  if (band.y1 - band.y0 >= 3) {
    b.fill(band.x0, band.y0, band.x1 - band.x0, band.y1 - band.y0, Ground.Gravel);
    scatterProps(
      b,
      band,
      keep,
      [
        { type: 'drum', r: 0.4, weight: 3 },
        { type: 'tireStack', r: 0.45, weight: 2 },
        { type: 'tire', r: 0.35, weight: 2 },
        { type: 'pallet', r: 0.7, weight: 2, angle: true },
        { type: 'crate', r: 0.5, weight: 2, angle: true },
        { type: 'carWreck', r: 1.6, weight: band.y1 - band.y0 >= 5 ? 1.5 : 0, angle: true },
      ],
      rng.int(6, 11),
    );
    b.scatterDecals(['oil', 'debris'], 8, band.x0, band.y0, band.x1 - band.x0, band.y1 - band.y0, [0.7, 1.1], [0.6, 0.9]);
  }
  b.scatterDecals(['oil', 'crack'], 4, area.x0, fy0, area.x1 - area.x0, fy1 - fy0);
}

// ---------------------------------------------------------------- parque

function park(b: SectorBuilder, area: BlockArea): void {
  const rng = b.rng;
  const keep = new Keepout();
  const w = area.x1 - area.x0;
  const h = area.y1 - area.y0;
  b.fill(area.x0, area.y0, w, h, Ground.GrassDark);
  const midX = Math.round(area.x0 + w * rng.range(0.4, 0.6));
  const midY = Math.round(area.y0 + h * rng.range(0.4, 0.6));
  b.fill(area.x0, midY, w, 1, Ground.Gravel);
  b.fill(midX, area.y0, 1, h, Ground.Gravel);
  b.fill(midX - 1, midY - 1, 3, 3, Ground.Gravel);
  keep.addRect(area.x0, midY - 0.6, area.x1, midY + 1.6);
  keep.addRect(midX - 0.6, area.y0, midX + 1.6, area.y1);

  // bancos virados para os caminhos
  const benches: [number, number, number][] = [
    [midX - 3, midY - 0.9, 0],
    [midX + 4, midY + 1.9, 180],
    [midX - 0.9, midY - 4, 90],
    [midX + 1.9, midY + 4, -90],
  ];
  for (const [x, y, a] of benches) {
    if (!rng.chance(0.75)) continue;
    b.prop('bench', x, y, a);
    keep.addPoint(x, y, 1);
  }
  b.prop('trashCan', midX - 1.6, midY + 2.2);
  keep.addPoint(midX - 1.6, midY + 2.2, 0.4);
  scatterProps(
    b,
    { x0: area.x0, y0: area.y0, x1: area.x1, y1: area.y1 },
    keep,
    [
      { type: 'treeLarge', r: 1.6, weight: 3 },
      { type: 'treeSmall', r: 1.1, weight: 2 },
      { type: 'bush', r: 0.7, weight: 2 },
    ],
    rng.int(9, 14),
    0.8,
  );
  b.scatterDecals(['leaves'], 18, area.x0, area.y0, w, h, [0.8, 1.3], [0.55, 0.95]);
  b.scatterDecals(['paper'], 4, area.x0, area.y0, w, h);
}
