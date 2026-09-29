/**
 * PLANTA (puro): divide o retângulo do prédio em cômodos conforme o estilo
 * do arquétipo e liga tudo com portas.
 *
 * Estilos:
 * - `bands`: faixa da frente (sala/salão) + faixa do fundo (quartos,
 *   cozinha, banheiro), às vezes com corredor no meio do fundo;
 * - `hall`: um salão grande (oficina, galpão, igreja) + uma fileira de
 *   cômodos pequenos num lado (escritório, banheiro, vestiário, depósito);
 * - `corridor`: corredor da frente ao fundo com cômodos dos dois lados
 *   (escola, posto de saúde, escritórios, pensão), recepção na frente e às
 *   vezes um salão no fundo.
 *
 * Coordenadas em tiles locais (0,0 = canto das paredes externas), fachada
 * ao SUL (y = H). O MapBuilder gira para a rua.
 * Portas internas formam uma árvore a partir da entrada (todo cômodo tem
 * acesso), mais algumas passagens extras; banheiro tem uma porta só.
 */
import type { Random } from '../../../core/Random';
import type { Opening } from '../../MapBuilder';
import type { TemplateWall } from '../BuildingTemplate';
import { ROOMS, type RoomKind } from './rooms';
import type { LRect } from './space';
import type { Span } from './furnish';

export interface GRoom extends LRect {
  id: number;
  kind: RoomKind;
  /** Cômodo de passagem (corredor, salão principal). */
  hub: boolean;
}

export type DoorKind = 'single' | 'double' | 'rolling';

export interface EntranceSpec {
  main: DoorKind;
  /** Duas portas na fachada (lojas largas). */
  twin?: boolean;
  /** Chance de porta nos fundos e na lateral. */
  back?: number;
  side?: number;
  /** Portão de garagem (quando há cômodo Garagem na frente). */
  garage?: boolean;
}

export type LayoutRecipe =
  | { style: 'bands'; front: readonly RoomKind[]; back: readonly RoomKind[]; depth: readonly [number, number]; corridor?: number }
  | { style: 'hall'; main: RoomKind; strip: readonly RoomKind[]; side: 'back' | 'left' | 'right'; depth: readonly [number, number] }
  | { style: 'corridor'; rooms: readonly RoomKind[]; lobby?: RoomKind; backHall?: RoomKind; width: readonly [number, number] };

export interface Plan {
  W: number;
  H: number;
  rooms: GRoom[];
  walls: TemplateWall[];
  /** Portas: ponto no meio do vão e os cômodos dos dois lados (null = rua). */
  doors: { x: number; y: number; a: number; b: number | null }[];
  /** Portas externas para o modelo (tapete e caminho até a calçada). */
  exterior: { at: [number, number]; side: 'n' | 's' | 'e' | 'w' }[];
  windows: Span[];
}

const R2 = (v: number) => Math.round(v * 2) / 2;
const R100 = (v: number) => Math.round(v * 100) / 100;

/** Corta `total` em pedaços proporcionais aos pesos, cada um ≥ o seu mínimo (múltiplos de 0,5). */
export function cuts(total: number, weights: readonly number[], mins: readonly number[], rng: Random): number[] | null {
  const n = weights.length;
  if (n === 0) return [];
  const need = mins.reduce((a, b) => a + b, 0);
  if (total < need - 1e-6) return null;
  const sum = weights.reduce((a, b) => a + b, 0);
  const out: number[] = [];
  let acc = 0;
  let wAcc = 0;
  let restMin = need;
  for (let i = 0; i < n - 1; i++) {
    wAcc += weights[i]!;
    restMin -= mins[i]!;
    const ideal = (total * wAcc) / sum + (rng.next() - 0.5) * 0.8;
    const lo = acc + mins[i]!;
    const hi = total - restMin;
    const v = Math.max(lo, Math.min(hi, R2(ideal)));
    out.push(Math.min(hi, Math.max(lo, v)));
    acc = out[i]!;
  }
  return out;
}

/** O que sai primeiro quando não cabe tudo (o essencial fica: 1 quarto, banheiro, cozinha). */
const DROP_ORDER: readonly RoomKind[] = ['Quarto de criança', 'Área de serviço', 'Despensa', 'Sala de jantar', 'Escritório', 'Vestiário', 'Depósito', 'Refeitório', 'Estoque', 'Quarto', 'Banheiro', 'Cozinha'];

/** Tira cômodos até caberem no comprimento (mínimo de cada um). */
function fitKinds(kinds: readonly RoomKind[], total: number): RoomKind[] {
  const list = [...kinds];
  const need = () => list.reduce((a, k) => a + minOf(k), 0);
  while (list.length > 1 && need() > total) {
    let idx = -1;
    for (const k of DROP_ORDER) {
      // Não tira o último de um tipo essencial.
      const count = list.filter((x) => x === k).length;
      if (!count) continue;
      if ((k === 'Quarto' || k === 'Banheiro' || k === 'Cozinha' || k === 'Estoque') && count < 2) continue;
      idx = list.lastIndexOf(k);
      break;
    }
    if (idx < 0) idx = list.length - 1;
    list.splice(idx, 1);
  }
  return list;
}

/** Área relativa de cada tipo de cômodo (sala grande, banheiro pequeno). */
const WEIGHT: Partial<Record<RoomKind, number>> = {
  Banheiro: 0.45,
  Corredor: 0.5,
  'Área de serviço': 0.55,
  Despensa: 0.55,
  Vestiário: 0.7,
  Sala: 1.5,
  Salão: 2.2,
  Garagem: 1.2,
  Cozinha: 1.25,
  Quarto: 1.1,
  Recepção: 1,
};
const weightOf = (k: RoomKind) => WEIGHT[k] ?? 1;
const minOf = (k: RoomKind) => (k === 'Banheiro' || k === 'Despensa' || k === 'Área de serviço' ? 2.1 : k === 'Garagem' ? 3.5 : k === 'Quarto' || k === 'Cozinha' ? 2.8 : 2.6);

/** Divide uma faixa em cômodos lado a lado (ao longo de x ou de y). */
function splitStrip(area: LRect, all: readonly RoomKind[], alongX: boolean, rng: Random, start: number): GRoom[] | null {
  const total = alongX ? area.w : area.h;
  const kinds = fitKinds(all, total);
  const c = cuts(total, kinds.map(weightOf), kinds.map((k) => Math.min(minOf(k), total)), rng);
  if (!c) return null;
  const edges = [0, ...c, total];
  const out: GRoom[] = [];
  for (let i = 0; i < kinds.length; i++) {
    const a = edges[i]!;
    const b = edges[i + 1]!;
    out.push(
      alongX
        ? { id: start + i, kind: kinds[i]!, hub: false, x: area.x + a, y: area.y, w: b - a, h: area.h }
        : { id: start + i, kind: kinds[i]!, hub: false, x: area.x, y: area.y + a, w: area.w, h: b - a },
    );
  }
  return out;
}

/** Cômodos conforme a receita. O primeiro devolvido é a entrada. */
function partition(recipe: LayoutRecipe, W: number, H: number, rng: Random): GRoom[] | null {
  if (recipe.style === 'bands') {
    const fd = Math.max(3, Math.min(H - 2.5, R2(H * rng.range(recipe.depth[0], recipe.depth[1]))));
    const front = splitStrip({ x: 0, y: H - fd, w: W, h: fd }, recipe.front, true, rng, 0);
    if (!front) return null;
    front[0]!.hub = true;
    const backH = H - fd;
    if (backH < 2 || recipe.back.length === 0) {
      front[0]!.h += backH;
      front[0]!.y = 0;
      return front;
    }
    const back: GRoom[] = [];
    const cw = recipe.corridor;
    if (cw && recipe.back.length >= 3 && W >= 8) {
      const cx = R2(Math.max(2.5, Math.min(W - 2.5 - cw, W / 2 - cw / 2 + rng.range(-1.5, 1.5))));
      const left = recipe.back.filter((_, i) => i % 2 === 0);
      const right = recipe.back.filter((_, i) => i % 2 === 1);
      const l = splitStrip({ x: 0, y: 0, w: cx, h: backH }, left, false, rng, front.length + 1);
      const r = splitStrip({ x: cx + cw, y: 0, w: W - cx - cw, h: backH }, right, false, rng, front.length + 1 + left.length);
      if (l && r && cx >= 2 && W - cx - cw >= 2) {
        back.push({ id: front.length, kind: 'Corredor', hub: true, x: cx, y: 0, w: cw, h: backH }, ...l, ...r);
        return [...front, ...back];
      }
    }
    const b = splitStrip({ x: 0, y: 0, w: W, h: backH }, recipe.back, true, rng, front.length);
    if (!b) return null;
    return [...front, ...b];
  }
  if (recipe.style === 'hall') {
    const sd = R2(rng.range(recipe.depth[0], recipe.depth[1]));
    if (recipe.side === 'back') {
      const strip = splitStrip({ x: 0, y: 0, w: W, h: sd }, recipe.strip, true, rng, 1);
      if (!strip) return null;
      return [{ id: 0, kind: recipe.main, hub: true, x: 0, y: sd, w: W, h: H - sd }, ...strip];
    }
    // Fileira lateral de ponta a ponta; o salão também dá para a fachada (é a entrada).
    const left = recipe.side === 'left';
    const strip = splitStrip({ x: left ? 0 : W - sd, y: 0, w: sd, h: H }, recipe.strip, false, rng, 1);
    if (!strip) return null;
    return [{ id: 0, kind: recipe.main, hub: true, x: left ? sd : 0, y: 0, w: W - sd, h: H }, ...strip];
  }
  // corredor
  const cw = R2(rng.range(recipe.width[0], recipe.width[1]));
  const lobbyH = recipe.lobby ? R2(rng.range(3, 4)) : 0;
  const hallH = recipe.backHall ? R2(H * rng.range(0.28, 0.38)) : 0;
  const cx = R2(W / 2 - cw / 2 + rng.range(-1, 1));
  const y0 = hallH;
  const y1 = H - lobbyH;
  const out: GRoom[] = [];
  if (recipe.lobby) out.push({ id: 0, kind: recipe.lobby, hub: true, x: 0, y: y1, w: W, h: lobbyH });
  out.push({ id: out.length, kind: 'Corredor', hub: true, x: cx, y: y0, w: cw, h: y1 - y0 });
  const left = recipe.rooms.filter((_, i) => i % 2 === 0);
  const right = recipe.rooms.filter((_, i) => i % 2 === 1);
  const l = splitStrip({ x: 0, y: y0, w: cx, h: y1 - y0 }, left, false, rng, out.length);
  if (!l) return null;
  out.push(...l);
  const r = splitStrip({ x: cx + cw, y: y0, w: W - cx - cw, h: y1 - y0 }, right, false, rng, out.length);
  if (!r) return null;
  out.push(...r);
  if (recipe.backHall) out.push({ id: out.length, kind: recipe.backHall, hub: true, x: 0, y: 0, w: W, h: hallH });
  return out;
}

interface Edge {
  a: number;
  b: number;
  vertical: boolean;
  fixed: number;
  from: number;
  to: number;
}

function edgesOf(rooms: GRoom[]): Edge[] {
  const out: Edge[] = [];
  const eq = (u: number, v: number) => Math.abs(u - v) < 0.01;
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i]!;
      const b = rooms[j]!;
      if (eq(a.x + a.w, b.x) || eq(b.x + b.w, a.x)) {
        const from = Math.max(a.y, b.y);
        const to = Math.min(a.y + a.h, b.y + b.h);
        if (to - from > 0.05) out.push({ a: i, b: j, vertical: true, fixed: eq(a.x + a.w, b.x) ? b.x : a.x, from, to });
      } else if (eq(a.y + a.h, b.y) || eq(b.y + b.h, a.y)) {
        const from = Math.max(a.x, b.x);
        const to = Math.min(a.x + a.w, b.x + b.w);
        if (to - from > 0.05) out.push({ a: i, b: j, vertical: false, fixed: eq(a.y + a.h, b.y) ? b.y : a.y, from, to });
      }
    }
  }
  return out;
}

/** Quão bom é ligar `child` por `parent` (maior = melhor). */
function linkScore(parent: GRoom, child: GRoom): number {
  let s = parent.hub ? 5 : 1;
  if (parent.kind === 'Sala' || parent.kind === 'Salão') s += 2;
  if (child.kind === 'Banheiro' && (parent.kind === 'Corredor' || parent.kind === 'Sala' || parent.kind === 'Área de serviço' || parent.kind === 'Vestiário')) s += 3;
  if (child.kind === 'Cozinha' && (parent.kind === 'Sala' || parent.kind === 'Sala de jantar')) s += 3;
  if (child.kind === 'Área de serviço' && parent.kind === 'Cozinha') s += 4;
  if (child.kind === 'Garagem' && (parent.kind === 'Cozinha' || parent.kind === 'Sala')) s += 2;
  if ((child.kind === 'Estoque' || child.kind === 'Depósito') && (parent.kind === 'Salão' || parent.kind === 'Oficina' || parent.kind === 'Galpão')) s += 3;
  if (parent.kind === 'Banheiro') s -= 20;
  // Garagem, quarto e despensa são "fim de linha": só servem de passagem se não houver outro jeito.
  if (parent.kind === 'Garagem' || parent.kind === 'Despensa') s -= 8;
  if (parent.kind === 'Quarto' || parent.kind === 'Quarto de criança') s -= 4;
  return s;
}

/** Aberturas numa parede de comprimento `len` sem se encostar (e longe das pontas). */
function openingAt(len: number, dl: number, taken: readonly Opening[], rng: Random, edge = 0.35): number | null {
  for (let k = 0; k < 10; k++) {
    const at = edge + rng.next() * Math.max(0, len - dl - 2 * edge);
    if (at + dl > len - edge + 1e-6) return null;
    if (taken.some((o) => at < o.at + o.len + 0.4 && at + dl + 0.4 > o.at)) continue;
    return R100(at);
  }
  return null;
}

export interface PlanOptions {
  entrance: EntranceSpec;
  wealth: number;
  /** Chance de sala e cozinha virarem um ambiente só (passagem larga). */
  openPlan?: number;
}

export function makePlan(recipe: LayoutRecipe, W: number, H: number, rng: Random, opts: PlanOptions): Plan | null {
  const rooms = partition(recipe, W, H, rng);
  if (!rooms || rooms.some((r) => r.w < 1.6 || r.h < 1.6)) return null;
  const edges = edgesOf(rooms);
  const doors: Plan['doors'] = [];
  const openingsByEdge = new Map<Edge, Opening[]>();
  const dlInt = opts.wealth === 2 ? 1.2 : opts.wealth === 1 ? 1.1 : 1.0;

  // Árvore de portas a partir da entrada.
  const linked = new Set<number>([0]);
  const addDoor = (e: Edge, dl: number): boolean => {
    const len = e.to - e.from;
    const taken = openingsByEdge.get(e) ?? [];
    const at = openingAt(len, dl, taken, rng);
    if (at === null) return false;
    taken.push({ at, len: dl, type: 'door' });
    openingsByEdge.set(e, taken);
    const mid = e.from + at + dl / 2;
    doors.push({ x: e.vertical ? e.fixed : mid, y: e.vertical ? mid : e.fixed, a: e.a, b: e.b });
    return true;
  };
  while (linked.size < rooms.length) {
    let best: { e: Edge; score: number } | null = null;
    for (const e of edges) {
      const inA = linked.has(e.a);
      const inB = linked.has(e.b);
      if (inA === inB) continue;
      if (e.to - e.from < dlInt + 0.75) continue;
      const parent = rooms[inA ? e.a : e.b]!;
      const child = rooms[inA ? e.b : e.a]!;
      const score = linkScore(parent, child) + rng.next() * 0.5;
      if (!best || score > best.score) best = { e, score };
    }
    if (!best) break;
    const e = best.e;
    const child = linked.has(e.a) ? e.b : e.a;
    const parentKind = rooms[linked.has(e.a) ? e.a : e.b]!.kind;
    const childKind = rooms[child]!.kind;
    const open =
      opts.openPlan && rng.chance(opts.openPlan) && e.to - e.from >= 3.2 && ((parentKind === 'Sala' && (childKind === 'Cozinha' || childKind === 'Sala de jantar')) || (childKind === 'Sala' && parentKind === 'Sala de jantar'));
    if (!addDoor(e, open ? Math.min(2.4, e.to - e.from - 0.8) : dlInt)) {
      edges.splice(edges.indexOf(e), 1);
      continue;
    }
    linked.add(child);
  }
  // Cômodo que ficou sem ligação (parede curta demais): porta para a rua depois.
  const orphans = rooms.filter((_, i) => !linked.has(i));
  // Passagens extras (circulação em volta), nunca em cômodo "fim de linha" (banheiro, quarto, garagem, despensa).
  const deadEnd = (k: RoomKind) => k === 'Banheiro' || k === 'Garagem' || k === 'Despensa' || k === 'Quarto' || k === 'Quarto de criança';
  for (const e of edges) {
    if (openingsByEdge.has(e)) continue;
    const a = rooms[e.a]!;
    const b = rooms[e.b]!;
    if (deadEnd(a.kind) || deadEnd(b.kind)) continue;
    if (e.to - e.from < dlInt + 1.2 || !rng.chance(a.hub || b.hub ? 0.25 : 0.1)) continue;
    addDoor(e, dlInt);
  }

  // Paredes internas: cada trecho compartilhado vira parede (com as portas dele).
  const walls: TemplateWall[] = [];
  for (const e of edges) {
    const openings = (openingsByEdge.get(e) ?? []).map((o) => ({ ...o, at: R100(o.at), len: R100(o.len) }));
    walls.push(e.vertical ? { a: [e.fixed, e.from], b: [e.fixed, e.to], openings } : { a: [e.from, e.fixed], b: [e.to, e.fixed], openings });
  }

  // Paredes externas: portas de entrada e janelas por trecho de cômodo.
  const exterior: Plan['exterior'] = [];
  const windows: Span[] = [];
  type Side = 'n' | 's' | 'e' | 'w';
  const sides: Record<Side, { len: number; segs: { room: number; from: number; to: number }[]; openings: Opening[] }> = {
    n: { len: W, segs: [], openings: [] },
    s: { len: W, segs: [], openings: [] },
    w: { len: H, segs: [], openings: [] },
    e: { len: H, segs: [], openings: [] },
  };
  rooms.forEach((r, i) => {
    if (r.y < 0.01) sides.n.segs.push({ room: i, from: r.x, to: r.x + r.w });
    if (r.y + r.h > H - 0.01) sides.s.segs.push({ room: i, from: r.x, to: r.x + r.w });
    if (r.x < 0.01) sides.w.segs.push({ room: i, from: r.y, to: r.y + r.h });
    if (r.x + r.w > W - 0.01) sides.e.segs.push({ room: i, from: r.y, to: r.y + r.h });
  });
  const pointOn = (side: Side, t: number): [number, number] => (side === 'n' ? [t, 0] : side === 's' ? [t, H] : side === 'w' ? [0, t] : [W, t]);
  const extDoor = (side: Side, room: number, dl: number): boolean => {
    const seg = sides[side].segs.find((s) => s.room === room);
    if (!seg) return false;
    const len = seg.to - seg.from;
    if (len < dl + 0.7) return false;
    const local = sides[side].openings.filter((o) => o.at >= seg.from - 0.01 && o.at < seg.to).map((o) => ({ ...o, at: o.at - seg.from }));
    const at = openingAt(len, dl, local, rng, 0.35);
    if (at === null) return false;
    const abs = R100(seg.from + at);
    sides[side].openings.push({ at: abs, len: dl, type: 'door' });
    const [x, y] = pointOn(side, abs + dl / 2);
    // Sem arredondar: o centro precisa bater com o vão que o MapBuilder recorta.
    exterior.push({ at: [x, y], side });
    doors.push({ x, y, a: room, b: null });
    return true;
  };
  const ent = opts.entrance;
  const mainLen = ent.main === 'rolling' ? rng.range(3.2, 4.2) : ent.main === 'double' ? rng.range(2, 2.4) : rng.range(1.2, 1.5);
  const entranceRoom = rooms.findIndex((r) => r.y + r.h > H - 0.01 && r.hub) >= 0 ? rooms.findIndex((r) => r.y + r.h > H - 0.01 && r.hub) : 0;
  if (!extDoor('s', entranceRoom, R100(mainLen)) && !extDoor('s', entranceRoom, 1.2)) {
    // Sem lugar na fachada (raro): qualquer cômodo da frente.
    const alt = sides.s.segs.find((s) => s.to - s.from >= 2);
    if (alt) extDoor('s', alt.room, 1.2);
  }
  if (ent.main === 'rolling') extDoor('s', entranceRoom, 1.2);
  if (ent.twin && W >= 12) extDoor('s', entranceRoom, R100(mainLen));
  if (ent.garage) {
    const g = rooms.findIndex((r) => r.kind === 'Garagem' && r.y + r.h > H - 0.01);
    if (g >= 0) extDoor('s', g, R100(Math.min(rooms[g]!.w - 0.8, 3)));
  }
  if (ent.back && rng.chance(ent.back)) {
    // Porta dos fundos só em cômodo que aguenta passagem sem ficar inútil (largo o bastante).
    const cand = sides.n.segs.filter((s) => {
      const r = rooms[s.room]!;
      return ['Cozinha', 'Área de serviço', 'Estoque', 'Depósito', 'Oficina', 'Galpão', 'Corredor', 'Garagem', 'Refeitório', 'Cozinha industrial'].includes(r.kind) && (r.hub || (r.w >= 3.4 && r.h >= 3));
    });
    if (cand.length) extDoor('n', rng.pick(cand).room, 1.2);
  }
  if (ent.side && rng.chance(ent.side)) {
    const side: Side = rng.chance(0.5) ? 'e' : 'w';
    const cand = sides[side].segs.filter((s) => rooms[s.room]!.kind !== 'Banheiro');
    if (cand.length) extDoor(side, rng.pick(cand).room, 1.1);
  }
  // Cômodos órfãos: porta para fora (qualquer lado que tiverem).
  for (const o of orphans) {
    const i = rooms.indexOf(o);
    for (const side of ['n', 'e', 'w', 's'] as Side[]) if (extDoor(side, i, 1.1)) break;
  }
  // Janelas: uma (ou duas, se o trecho é longo) por trecho de cômodo.
  for (const side of ['n', 's', 'e', 'w'] as Side[]) {
    const S = sides[side];
    for (const seg of S.segs) {
      const def = ROOMS[rooms[seg.room]!.kind];
      if ('noWindow' in def && def.noWindow) continue;
      const len = seg.to - seg.from;
      const small = 'smallWindow' in def && def.smallWindow;
      const big = rooms[seg.room]!.kind === 'Salão' && side === 's';
      const count = small ? 1 : len >= 7 ? 2 : 1;
      const wl = small ? 0.9 : big ? Math.min(3, len / count - 1.2) : Math.min(2, len / count - 1.2);
      if (wl < 0.85 || len < 2) continue;
      for (let k = 0; k < count; k++) {
        const slot = len / count;
        const center = seg.from + slot * (k + 0.5) + (rng.next() - 0.5) * Math.max(0, slot - wl - 1.2) * 0.6;
        const at = R100(Math.max(seg.from + 0.35, Math.min(seg.to - 0.35 - wl, center - wl / 2)));
        if (S.openings.some((o) => at < o.at + o.len + 0.35 && at + wl + 0.35 > o.at)) continue;
        S.openings.push({ at, len: R100(wl), type: 'window' });
        const [x0, y0] = pointOn(side, at);
        const [x1, y1] = pointOn(side, at + wl);
        windows.push({ x0, y0, x1, y1 });
      }
    }
    S.openings.sort((a, b) => a.at - b.at);
  }
  walls.push({ a: [0, 0], b: [W, 0], openings: sides.n.openings });
  walls.push({ a: [0, H], b: [W, H], openings: sides.s.openings });
  walls.push({ a: [0, 0], b: [0, H], openings: sides.w.openings });
  walls.push({ a: [W, 0], b: [W, H], openings: sides.e.openings });
  return { W, H, rooms, walls, doors, exterior, windows };
}
