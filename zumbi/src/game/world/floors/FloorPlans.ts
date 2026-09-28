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
import { PROP_DEFS, type PropType } from '../PropCatalog';

/** Retângulo em tiles, local ao prédio (0,0 = canto das paredes externas). */
export interface LocalRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type FloorUse = 'casa' | 'apartamento' | 'escritorio';

/** Margem entre a linha da parede e o móvel encostado (tiles). */
const M = 0.13;
/** Raio do corpo (tiles) na conferência da passagem. */
const BODY = 0.3;
const CELL = 0.25;

interface Room extends LocalRect {
  name: string;
  hall: boolean;
}

interface Placed {
  type: PropType;
  at: [number, number];
  angle: number;
  box: LocalRect;
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

/** Móveis por cômodo (em ordem de importância; os primeiros quase sempre entram). */
const FURNITURE: Record<string, readonly (PropType | readonly PropType[])[]> = {
  Quarto: [['bedDouble', 'bedSingle'], 'wardrobe', 'nightstand', ['desk', 'cabinet'], 'rug'],
  Banheiro: ['toilet', 'bathSink', 'bathtub', 'cabinet'],
  Cozinha: ['fridge', 'stove', 'kitchenCounter', 'cabinet', 'diningTable'],
  Sala: ['sofa', 'tvStand', 'armchair', 'coffeeTable', 'cabinet', 'rug'],
  Corredor: ['cabinet'],
  Escritório: ['desk', 'desk', 'cabinet', 'boxes', 'desk', 'chair'],
  Depósito: ['boxes', 'crate', 'box', 'toolShelf', 'crate', 'boxes'],
};

/** No meio do cômodo (não encostam). */
const CENTER = new Set<PropType>(['rug', 'coffeeTable', 'diningTable', 'chair']);

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

function overlaps(a: LocalRect, b: LocalRect, pad = 0): boolean {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
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

  const props = furnish(rooms, stair, doorsAt, rng);
  return {
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
}

// ------------------------------------------------------------------ móveis

function size(type: PropType, angle: number): [number, number] {
  const d = PROP_DEFS[type];
  const w = d.width / 64;
  const h = d.height / 64;
  return Math.abs(angle) === 90 ? [h, w] : [w, h];
}

/** Grade do cômodo: a passagem entre portas (e a escada) continua aberta? */
function passable(room: Room, blocks: LocalRect[], goals: [number, number][]): boolean {
  const cols = Math.max(1, Math.round(room.w / CELL));
  const rows = Math.max(1, Math.round(room.h / CELL));
  const free = new Uint8Array(cols * rows);
  const edge = M + BODY * 0.7;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x = room.x + (i + 0.5) * CELL;
      const y = room.y + (j + 0.5) * CELL;
      if (x < room.x + edge || x > room.x + room.w - edge || y < room.y + edge || y > room.y + room.h - edge) continue;
      let ok = true;
      for (const b of blocks) {
        const dx = Math.max(b.x - x, 0, x - (b.x + b.w));
        const dy = Math.max(b.y - y, 0, y - (b.y + b.h));
        if (dx * dx + dy * dy < BODY * BODY) {
          ok = false;
          break;
        }
      }
      if (ok) free[j * cols + i] = 1;
    }
  }
  const cellOf = ([x, y]: [number, number]) => {
    // O alvo (porta na borda) cai na célula livre mais perto.
    let best = -1;
    let bd = Infinity;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        if (!free[j * cols + i]) continue;
        const d = (room.x + (i + 0.5) * CELL - x) ** 2 + (room.y + (j + 0.5) * CELL - y) ** 2;
        if (d < bd) {
          bd = d;
          best = j * cols + i;
        }
      }
    }
    return bd <= 1.0 ? best : -1;
  };
  const cells = goals.map(cellOf);
  if (cells.some((c) => c < 0)) return false;
  if (cells.length < 2) return true;
  const seen = new Uint8Array(cols * rows);
  const stack = [cells[0]!];
  seen[cells[0]!] = 1;
  while (stack.length) {
    const c = stack.pop()!;
    const i = c % cols;
    const j = (c - i) / cols;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
      const n = nj * cols + ni;
      if (!free[n] || seen[n]) continue;
      seen[n] = 1;
      stack.push(n);
    }
  }
  return cells.every((c) => seen[c]);
}

function furnish(rooms: Room[], stair: LocalRect, doorsAt: [number, number][], rng: Random): Placed[] {
  const out: Placed[] = [];
  const stairKeep: LocalRect = { x: stair.x - 0.7, y: stair.y - 0.7, w: stair.w + 1.4, h: stair.h + 1.4 };
  for (const room of rooms) {
    const list = FURNITURE[room.name] ?? [];
    // Portas deste cômodo (pontos na borda) e a escada: precisam continuar alcançáveis.
    const goals: [number, number][] = doorsAt.filter(([x, y]) => x >= room.x - 0.05 && x <= room.x + room.w + 0.05 && y >= room.y - 0.05 && y <= room.y + room.h + 0.05);
    if (room.hall) goals.push([stair.x + stair.w / 2, stair.y + stair.h / 2]);
    const blocks: LocalRect[] = room.hall ? [stair] : [];
    const placed: LocalRect[] = [];
    const budget = Math.max(1, Math.floor((room.w * room.h) / 5));
    let count = 0;
    for (const entry of list) {
      if (count >= budget) break;
      const type = typeof entry === 'string' ? entry : rng.pick(entry as readonly PropType[]);
      const floorOnly = PROP_DEFS[type].layer === 'floor';
      let done = false;
      for (let tries = 0; tries < 14 && !done; tries++) {
        let angle = 0;
        let cx: number;
        let cy: number;
        if (CENTER.has(type)) {
          const [w, h] = size(type, 0);
          if (w > room.w - 1.2 || h > room.h - 1.2) break;
          cx = room.x + room.w / 2 + (rng.next() - 0.5) * Math.max(0, room.w - w - 1.4);
          cy = room.y + room.h / 2 + (rng.next() - 0.5) * Math.max(0, room.h - h - 1.4);
        } else {
          const side = rng.int(0, 3);
          angle = [0, 90, 180, -90][side]!;
          const [w, h] = size(type, angle);
          // Encostado: sobra passagem na frente.
          const depth = side % 2 === 0 ? h : w;
          const across = side % 2 === 0 ? room.h : room.w;
          if (across - depth < 1.3) continue;
          const along = side % 2 === 0 ? room.w : room.h;
          const span = side % 2 === 0 ? w : h;
          if (span > along - 2 * M) continue;
          const t = M + span / 2 + rng.next() * Math.max(0, along - span - 2 * M);
          if (side === 0) [cx, cy] = [room.x + t, room.y + M + h / 2];
          else if (side === 2) [cx, cy] = [room.x + t, room.y + room.h - M - h / 2];
          else if (side === 1) [cx, cy] = [room.x + room.w - M - w / 2, room.y + t];
          else [cx, cy] = [room.x + M + w / 2, room.y + t];
        }
        const [w, h] = size(type, angle);
        const box = { x: cx - w / 2, y: cy - h / 2, w, h };
        if (box.x < room.x + 0.05 || box.y < room.y + 0.05 || box.x + box.w > room.x + room.w - 0.05 || box.y + box.h > room.y + room.h - 0.05) continue;
        if (overlaps(box, stairKeep)) continue;
        if (placed.some((p) => overlaps(p, box, floorOnly ? -0.2 : 0.06))) continue;
        // Nem tapete tapa porta.
        if (doorsAt.some(([dx, dy]) => Math.hypot(Math.max(box.x - dx, 0, dx - (box.x + box.w)), Math.max(box.y - dy, 0, dy - (box.y + box.h))) < 1.25)) continue;
        if (!floorOnly && !passable(room, [...blocks, box], goals)) continue;
        placed.push(box);
        if (!floorOnly) blocks.push(box);
        out.push({ type, at: [Math.round(cx * 1000) / 1000, Math.round(cy * 1000) / 1000], angle, box });
        count++;
        done = true;
      }
    }
  }
  // Tapete por baixo: vai primeiro na lista (desenho).
  out.sort((a, b) => Number(PROP_DEFS[b.type].layer === 'floor') - Number(PROP_DEFS[a.type].layer === 'floor'));
  return out;
}
