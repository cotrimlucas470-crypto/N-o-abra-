/**
 * PLANTA DE UM ANDAR DE CIMA (pura, determinística pela semente): recebe o
 * tamanho do prédio (tiles), o uso (casa, apartamento, escritório) e o vão
 * da escada — que é o MESMO em todos os andares — e devolve um modelo de
 * construção (BuildingTemplate) que o MapBuilder monta como qualquer outro.
 *
 * - paredes externas com janelas (uma por trecho de cômodo);
 * - uma divisória no meio (se couber) e divisórias verticais em cada metade,
 *   nunca cortando o vão da escada; toda divisória tem porta;
 * - móveis encostados nas paredes conforme o cômodo, sem tapar porta nem a
 *   escada, e sem fechar a passagem (conferido por inundação na grade).
 */
import type { Random } from '../../core/Random';
import { door, win, type BuildingTemplate, type TemplateWall } from '../buildings/BuildingTemplate';
import { Ground, type BuildingKind, type GroundId } from '../MapTypes';
import { PROP_DEFS } from '../PropCatalog';
import { furnishRoom, type Placed, type Span } from '../buildings/gen/furnish';
import { openForNav } from '../buildings/gen/navcheck';
import { ROOMS, type RoomKind } from '../buildings/gen/rooms';

/** Retângulo em tiles, local ao prédio (0,0 = canto das paredes externas). */
export interface LocalRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type FloorUse = 'casa' | 'apartamento' | 'escritorio';

interface Room extends LocalRect {
  name: string;
  hall: boolean;
}

const ROOM_GROUND: Record<string, GroundId> = {
  Quarto: Ground.Carpet,
  Banheiro: Ground.TileFloor,
  Cozinha: Ground.TileFloor,
  Sala: Ground.WoodFloor,
  Corredor: Ground.WoodFloor,
  Escritório: Ground.WoodFloor,
  Depósito: Ground.Concrete,
};

const NAMES: Record<FloorUse, readonly string[]> = {
  casa: ['Quarto', 'Banheiro', 'Quarto', 'Escritório', 'Quarto', 'Sala'],
  apartamento: ['Sala', 'Quarto', 'Banheiro', 'Cozinha', 'Quarto', 'Quarto'],
  escritorio: ['Escritório', 'Banheiro', 'Escritório', 'Depósito', 'Cozinha', 'Escritório'],
};

/** Tipo de construção do andar (decide o loot dos armários e mesas). */
export function floorKind(use: FloorUse): BuildingKind {
  return use === 'escritorio' ? 'garage' : 'house';
}

function crosses(v: number, lo: number, hi: number, pad: number): boolean {
  return v > lo - pad && v < hi + pad;
}

/** Cortes num intervalo [0, len]: pedaços de ~4 a 6 tiles, evitando a faixa proibida. */
function splits(len: number, rng: Random, bad: ((v: number) => boolean) | null): number[] {
  const out: number[] = [];
  let x = 0;
  while (len - x > 7.5) {
    const want = x + rng.int(4, 6);
    let pick = -1;
    for (const d of [0, 1, -1, 2, -2]) {
      const v = want + d;
      if (v - x < 3 || len - v < 3) continue;
      if (bad && bad(v)) continue;
      pick = v;
      break;
    }
    if (pick < 0) break;
    out.push(pick);
    x = pick;
  }
  return out;
}

/** Janelas centradas em cada trecho (entre junções) da parede externa. */
function windows(len: number, junctions: number[], rng: Random, small: (a: number, b: number) => boolean): ReturnType<typeof win>[] {
  const cuts = [0, ...junctions.filter((j) => j > 0.5 && j < len - 0.5).sort((a, b) => a - b), len];
  const out: ReturnType<typeof win>[] = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i]!;
    const b = cuts[i + 1]!;
    const seg = b - a;
    if (seg < 2.2) continue;
    const w = small(a, b) ? 1 : Math.min(2, seg - 1.4);
    if (w < 0.9) continue;
    const at = a + (seg - w) / 2 + (rng.next() - 0.5) * Math.max(0, seg - w - 1.4) * 0.5;
    out.push(win(Math.round(at * 100) / 100, Math.round(w * 100) / 100));
  }
  return out;
}

/**
 * Monta a planta. `stair` = vão da escada (tiles locais). `W` e `H` = medidas
 * das paredes externas do prédio.
 */
export function floorPlan(W: number, H: number, use: FloorUse, stair: LocalRect, rng: Random, name: string): BuildingTemplate {
  const sy0 = stair.y;
  const sy1 = stair.y + stair.h;
  const sx0 = stair.x;
  const sx1 = stair.x + stair.w;
  // Divisória horizontal (se couber), sem cortar a escada.
  let yS = -1;
  if (H >= 7) {
    const cands: number[] = [];
    for (let y = 3; y <= H - 3; y++) if (!crosses(y, sy0, sy1, 0.45)) cands.push(y);
    if (cands.length) {
      cands.sort((a, b) => Math.abs(a - H / 2) - Math.abs(b - H / 2));
      yS = cands[Math.min(cands.length - 1, rng.int(0, 1))]!;
    }
  }
  const bands: [number, number][] = yS > 0 ? [[0, yS], [yS, H]] : [[0, H]];
  const walls: TemplateWall[] = [];
  const rooms: Room[] = [];
  const doorsAt: [number, number][] = [];
  const bandSplits: number[][] = [];
  for (const [y0, y1] of bands) {
    const stairHere = sy1 > y0 && sy0 < y1;
    const xs = splits(W, rng, stairHere ? (v) => crosses(v, sx0, sx1, 0.45) : null);
    bandSplits.push(xs);
    const edges = [0, ...xs, W];
    for (let i = 0; i < edges.length - 1; i++) {
      const r: Room = { x: edges[i]!, y: y0, w: edges[i + 1]! - edges[i]!, h: y1 - y0, name: '', hall: false };
      const cx = (sx0 + sx1) / 2;
      const cy = (sy0 + sy1) / 2;
      r.hall = cx > r.x && cx < r.x + r.w && cy > r.y && cy < r.y + r.h;
      rooms.push(r);
    }
    // Divisórias verticais desta faixa: cada uma com porta.
    for (const x of xs) {
      const len = y1 - y0;
      const dl = 1.15;
      let at = 0.6 + rng.next() * Math.max(0, len - dl - 1.2);
      // Porta longe da escada.
      if (stairHere && Math.abs(x - (x < sx0 ? sx0 : sx1)) < 1.6) {
        const mid = y0 + at + dl / 2;
        if (mid > sy0 - 1 && mid < sy1 + 1) at = sy0 - y0 > len - (sy1 - y0) ? Math.max(0.3, sy0 - y0 - dl - 1) : Math.min(len - dl - 0.3, sy1 - y0 + 1);
      }
      at = Math.max(0.3, Math.min(len - dl - 0.3, at));
      walls.push({ a: [x, y0], b: [x, y1], openings: [door(Math.round(at * 100) / 100, dl)] });
      doorsAt.push([x, y0 + at + dl / 2]);
    }
  }
  // Divisória horizontal: portas entre as metades (pelo menos uma).
  if (yS > 0) {
    const top = rooms.filter((r) => r.y + r.h === yS);
    const bottom = rooms.filter((r) => r.y === yS);
    const junctions = [...bandSplits[0]!, ...bandSplits[1]!];
    const openings: ReturnType<typeof door>[] = [];
    const want = Math.max(1, Math.min(top.length, 1 + rng.int(0, top.length)));
    const order = [...top].sort((a, b) => Number(b.hall) - Number(a.hall) || rng.next() - 0.5);
    for (const t of order) {
      if (openings.length >= want) break;
      for (const b of bottom) {
        const lo = Math.max(t.x, b.x) + 0.55;
        const hi = Math.min(t.x + t.w, b.x + b.w) - 0.55;
        const dl = 1.2;
        if (hi - lo < dl) continue;
        let at = lo + rng.next() * (hi - lo - dl);
        // Nada de porta encostada na escada.
        if (Math.min(Math.abs(yS - sy0), Math.abs(yS - sy1)) < 1.4 && at + dl > sx0 - 1 && at < sx1 + 1) {
          const alt = [lo, hi - dl].find((p) => p + dl <= sx0 - 1 || p >= sx1 + 1);
          if (alt === undefined) continue;
          at = alt;
        }
        if (junctions.some((j) => j > at - 0.4 && j < at + dl + 0.4)) continue;
        if (openings.some((o) => Math.abs(o.at - at) < dl + 0.6)) continue;
        openings.push(door(Math.round(at * 100) / 100, dl));
        doorsAt.push([at + dl / 2, yS]);
        break;
      }
    }
    // Sem lugar para porta (raro): passagem larga no meio da faixa sem junção.
    if (!openings.length) {
      const at = Math.max(0.5, Math.min(W - 2.5, W / 2 - 1));
      openings.push(door(at, 2));
    }
    walls.push({ a: [0, yS], b: [W, yS], openings });
  }
  // Nomes: o menor vira banheiro; o da escada é sala (grande) ou corredor.
  const pool = [...NAMES[use]];
  const bySize = [...rooms].sort((a, b) => a.w * a.h - b.w * b.h);
  const bath = bySize.find((r) => !r.hall && rooms.length > 1);
  if (bath) {
    bath.name = 'Banheiro';
    pool.splice(pool.indexOf('Banheiro'), 1);
  }
  // O da escada primeiro (tira o nome dele da lista), depois o resto.
  for (const r of [...rooms].sort((a, b) => Number(b.hall) - Number(a.hall))) {
    if (r.name) continue;
    if (r.hall) {
      r.name = r.w * r.h >= 24 && use !== 'escritorio' ? 'Sala' : use === 'escritorio' ? 'Escritório' : 'Corredor';
      const i = pool.indexOf(r.name);
      if (i >= 0) pool.splice(i, 1);
      continue;
    }
    r.name = pool.length ? pool.shift()! : use === 'escritorio' ? 'Escritório' : 'Quarto';
  }
  // Paredes externas com janela (banheiro: janela pequena).
  const roomAt = (x: number, y: number) => rooms.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  const smallOn = (fix: 'x' | 'y', v: number) => (a: number, b: number) => {
    const m = (a + b) / 2;
    return roomAt(fix === 'y' ? m : v, fix === 'y' ? v : m)?.name === 'Banheiro';
  };
  const topJ = bandSplits[0] ?? [];
  const botJ = bandSplits[bandSplits.length - 1] ?? [];
  const sideJ = yS > 0 ? [yS] : [];
  walls.push({ a: [0, 0], b: [W, 0], openings: windows(W, topJ, rng, smallOn('y', 0.1)) });
  walls.push({ a: [0, H], b: [W, H], openings: windows(W, botJ, rng, smallOn('y', H - 0.1)) });
  walls.push({ a: [0, 0], b: [0, H], openings: windows(H, sideJ, rng, smallOn('x', 0.1)) });
  walls.push({ a: [W, 0], b: [W, H], openings: windows(H, sideJ, rng, smallOn('x', W - 0.1)) });

  const props = furnish(rooms, stair, doorsAt, windowSpans(walls), rng);
  const tpl: BuildingTemplate = {
    kind: floorKind(use),
    name,
    w: W,
    h: H,
    roof: 'flat',
    front: 's',
    floors: rooms.map((r) => ({ rect: [r.x, r.y, r.w, r.h] as const, ground: ROOM_GROUND[r.name] ?? Ground.WoodFloor, room: r.name })),
    walls,
    props: props.map((p) => ({ type: p.type, at: p.at, angle: p.angle })),
    doors: [],
  };
  // Zumbi sobe pela escada: todo cômodo alcançável a partir dela na grade deles.
  return openForNav(tpl, doorsAt, [stair.x + stair.w / 2, stair.y + stair.h / 2]);
}

// ------------------------------------------------------------------ móveis

/**
 * Mesmo mobiliador dos prédios do térreo (regras por cômodo, passagem
 * reservada entre as portas e até a escada): andar de cima sem cômodo vazio.
 */
function furnish(rooms: Room[], stair: LocalRect, doorsAt: [number, number][], windows: Span[], rng: Random): Placed[] {
  const out: Placed[] = [];
  const stairKeep: LocalRect = { x: stair.x - 0.7, y: stair.y - 0.7, w: stair.w + 1.4, h: stair.h + 1.4 };
  const wealth = rng.int(0, 2);
  for (const room of rooms) {
    const doors: (readonly [number, number])[] = doorsAt.filter(([x, y]) => x >= room.x - 0.05 && x <= room.x + room.w + 0.05 && y >= room.y - 0.05 && y <= room.y + room.h + 0.05);
    // A escada é a "porta" do andar: o caminho até ela fica livre.
    if (room.hall) doors.unshift([stair.x + stair.w / 2, stair.y + stair.h / 2]);
    const def = ROOMS[(room.name in ROOMS ? room.name : 'Quarto') as RoomKind];
    const inside = windows.filter((w) => {
      const mx = (w.x0 + w.x1) / 2;
      const my = (w.y0 + w.y1) / 2;
      return mx >= room.x - 0.05 && mx <= room.x + room.w + 0.05 && my >= room.y - 0.05 && my <= room.y + room.h + 0.05;
    });
    out.push(...furnishRoom({ rect: room, def, doors, windows: inside, keepOut: [stairKeep], wealth, keep: 1 }, rng));
  }
  // Tapete por baixo: vai primeiro na lista (desenho).
  out.sort((a, b) => Number(PROP_DEFS[b.type].layer === 'floor') - Number(PROP_DEFS[a.type].layer === 'floor'));
  return out;
}

/** Trechos de janela das paredes (tiles locais). */
function windowSpans(walls: readonly TemplateWall[]): Span[] {
  const out: Span[] = [];
  for (const w of walls) {
    const horizontal = w.a[1] === w.b[1];
    const len = horizontal ? Math.abs(w.b[0] - w.a[0]) : Math.abs(w.b[1] - w.a[1]);
    const dir = horizontal ? Math.sign(w.b[0] - w.a[0]) : Math.sign(w.b[1] - w.a[1]);
    for (const o of w.openings ?? []) {
      if (o.type !== 'window' || o.at + o.len > len + 1e-6) continue;
      const p0 = (horizontal ? w.a[0] : w.a[1]) + dir * o.at;
      const p1 = p0 + dir * o.len;
      out.push(horizontal ? { x0: Math.min(p0, p1), y0: w.a[1], x1: Math.max(p0, p1), y1: w.a[1] } : { x0: w.a[0], y0: Math.min(p0, p1), x1: w.a[0], y1: Math.max(p0, p1) });
    }
  }
  return out;
}
