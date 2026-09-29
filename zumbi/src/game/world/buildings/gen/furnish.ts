/**
 * MOBILIADOR (puro, determinístico pelo gerador aleatório): aplica as regras
 * do cômodo (rooms.ts) num retângulo, sem nunca tapar a passagem entre as
 * portas (grade com caminho reservado, ver space.ts) nem pôr móvel alto na
 * frente de janela. No fim, o que ficou sem acesso sai.
 */
import type { Random } from '../../../core/Random';
import { PROP_DEFS, type PropType } from '../../PropCatalog';
import { M, RoomGrid, overlaps, propSize, type LRect } from './space';
import type { FurnRule, RoomDef } from './rooms';

export interface Placed {
  type: PropType;
  at: [number, number];
  angle: number;
  box: LRect;
}

/** Trecho de janela na borda do cômodo (tiles locais do prédio). */
export interface Span {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface FurnishRoom {
  rect: LRect;
  def: RoomDef;
  /** Pontos de porta (na borda do cômodo) e outros pontos que precisam ficar livres. */
  doors: readonly (readonly [number, number])[];
  keepFree?: readonly (readonly [number, number, number])[];
  windows: readonly Span[];
  /** Área proibida extra (vão da escada). */
  keepOut?: readonly LRect[];
  /** Móveis que já estão no cômodo (segunda passada): ocupam e contam na passagem. */
  existing?: readonly Placed[];
  /** Riqueza 0..2 e quanto do que a regra pede entra (conservação). */
  wealth: number;
  keep: number;
  /** Saqueado/abandonado: coisas largadas tortas. Conservado: arrumado. */
  messy?: boolean;
}

/** Móveis que viram obstáculo (não os de chão, tipo tapete e palete). */
const solid = (t: PropType) => PROP_DEFS[t].layer !== 'floor';
/** Alto: não fica na frente de janela. */
const tall = (t: PropType) => PROP_DEFS[t].shadowHeight >= 0.8;

const ROUND = (v: number) => Math.round(v * 1000) / 1000;

/** Grandes ou fixos demais para ficar "torto" no saque (carro, cama, balcão, prateleira). */
export const NO_TILT = new Set<PropType>([
  'car', 'carWreck', 'bedDouble', 'kitchenCounter', 'storeShelf', 'displayFridge', 'checkout', 'workbench', 'toolShelf', 'wardrobe', 'bathtub',
  'gondola', 'palletRack', 'bakeryCounter', 'barCounter', 'shopCounter', 'lathe', 'pew', 'altar', 'bunkBed', 'locker', 'treadmill', 'blackboard',
  'bookshelf', 'shower', 'rug', 'toilet', 'bathSink', 'laundrySink', 'stove', 'fridge', 'freezer', 'medCabinet',
]);

/** Tamanho (tiles) da caixa que contém o objeto girado num ângulo qualquer. */
function rotatedSize(type: PropType, angle: number): [number, number] {
  const q = Math.round(angle / 90) * 90;
  if (Math.abs(angle - q) < 0.5) return propSize(type, q);
  const [w, h] = propSize(type, 0);
  const a = (angle * Math.PI) / 180;
  const c = Math.abs(Math.cos(a));
  const s = Math.abs(Math.sin(a));
  return [w * c + h * s, w * s + h * c];
}

export function furnishRoom(r: FurnishRoom, rng: Random): Placed[] {
  const room = r.rect;
  const grid = new RoomGrid(room);
  // Passagem: zona de cada porta e caminho entre as portas.
  for (const [x, y] of r.doors) grid.reserveDisc(x, y, 0.6);
  for (const [x, y, rad] of r.keepFree ?? []) grid.reserveDisc(x, y, rad);
  // Cômodo pequeno: caminho reservado entre as portas (móvel fica fora da linha de passagem).
  // Salão/galpão grande: fileiras de prateleira não combinam com um caminho em diagonal; ali
  // vale a conferência a cada móvel (as portas continuam ligadas entre si).
  const big = room.w * room.h >= 28;
  if (!big) for (let i = 1; i < r.doors.length; i++) grid.reservePath(r.doors[0]![0], r.doors[0]![1], r.doors[i]![0], r.doors[i]![1], 0.3);
  const out: Placed[] = [];
  for (const p of r.existing ?? []) if (solid(p.type)) grid.block(p.box);
  // Sólidos e o que é de chão (tapete, palete) em listas separadas: móvel pode ficar em cima de tapete.
  const placed: LRect[] = [...(r.keepOut ?? []), ...(r.existing ?? []).filter((p) => solid(p.type)).map((p) => p.box)];
  const flat: LRect[] = [...(r.keepOut ?? []), ...(r.existing ?? []).filter((p) => !solid(p.type)).map((p) => p.box)];

  const fits = (type: PropType, box: LRect, side: number): boolean => {
    // Margem da parede (meia espessura ≈ 0,11 tile): nada entra nela.
    const e = M - 0.01;
    if (box.x < room.x + e || box.y < room.y + e || box.x + box.w > room.x + room.w - e || box.y + box.h > room.y + room.h - e) return false;
    const floor = !solid(type);
    for (const p of floor ? flat : placed) if (overlaps(p, box, floor ? -0.25 : 0.05)) return false;
    // Nem tapete em cima da porta.
    for (const [dx, dy] of r.doors) {
      const d = Math.hypot(Math.max(box.x - dx, 0, dx - (box.x + box.w)), Math.max(box.y - dy, 0, dy - (box.y + box.h)));
      if (d < (floor ? 0.5 : 0.9)) return false;
    }
    if (!floor && grid.hitsReserved(box)) return false;
    if (side >= 0 && tall(type) && facesWindow(box, side, r.windows)) return false;
    return true;
  };
  /**
   * Com este móvel, tudo que já está no cômodo continua alcançável a partir
   * das portas? Se não, desfaz: melhor um móvel a menos que um armário
   * encurralado (conferir na hora deixa o próximo móvel achar outro lugar).
   */
  // Célula de cada porta: fica livre (a zona da porta é reservada), então calcula uma vez.
  const doorCells = grid.startCells(r.doors);
  const keepsAccess = (box: LRect): boolean => {
    const before = grid.snapshot();
    grid.block(box);
    // A partir de UMA porta: todas as outras precisam ser alcançadas (senão o cômodo vira dois).
    const reach = grid.reachFrom(doorCells.slice(0, 1));
    const ok =
      doorCells.every((c) => reach[c] === 1) &&
      grid.accessible(box, reach) &&
      out.every((p) => !solid(p.type) || grid.accessible(p.box, reach)) &&
      (r.existing ?? []).every((p) => !solid(p.type) || grid.accessible(p.box, reach));
    if (!ok) grid.restore(before);
    return ok;
  };
  const place = (type: PropType, cx: number, cy: number, angle: number): Placed | null => {
    // Caixa do objeto girado (torto ocupa mais): é ela que conta para parede, vizinhos e passagem.
    const [w, h] = rotatedSize(type, angle);
    const box = { x: cx - w / 2, y: cy - h / 2, w, h };
    const side = sideOfAngle(angle);
    if (!fits(type, box, side)) return null;
    if (solid(type) && !keepsAccess(box)) return null;
    (solid(type) ? placed : flat).push(box);
    const p: Placed = { type, at: [ROUND(cx), ROUND(cy)], angle, box };
    out.push(p);
    return p;
  };
  const put = (type: PropType, cx: number, cy: number, angle: number): Placed | null => {
    // Prédio saqueado/abandonado: parte dos móveis fora do lugar (tortos), se couber assim.
    if (r.messy && !NO_TILT.has(type) && rng.chance(0.25)) {
      const p = place(type, cx, cy, angle + rng.range(-18, 18));
      if (p) return p;
    }
    return place(type, cx, cy, angle);
  };
  /** Encostado na parede `side` (0 topo, 1 direita, 2 baixo, 3 esquerda), a `t` (0..1) do comprimento. */
  const onWall = (type: PropType, side: number, t: number): Placed | null => {
    const angle = [0, 90, 180, -90][side]!;
    const [w, h] = propSize(type, angle);
    const along = side % 2 === 0 ? room.w : room.h;
    const span = side % 2 === 0 ? w : h;
    if (span > along - 2 * M) return null;
    const pos = M + span / 2 + t * Math.max(0, along - span - 2 * M);
    if (side === 0) return put(type, room.x + pos, room.y + M + h / 2, angle);
    if (side === 2) return put(type, room.x + pos, room.y + room.h - M - h / 2, angle);
    if (side === 1) return put(type, room.x + room.w - M - w / 2, room.y + pos, angle);
    return put(type, room.x + M + w / 2, room.y + pos, angle);
  };
  const lastOf = (types?: readonly PropType[]) => {
    for (let i = out.length - 1; i >= 0; i--) if (!types || types.includes(out[i]!.type)) return out[i]!;
    return null;
  };

  const tryRule = (rule: FurnRule, type: PropType): boolean => {
    const tries = rule.a === 'scatter' ? 14 : 24;
    switch (rule.a) {
      case 'wall':
      case 'corner':
      case 'front':
      case 'back':
        for (let k = 0; k < tries; k++) {
          const side = rule.a === 'front' ? 2 : rule.a === 'back' ? 0 : rng.int(0, 3);
          const t = rule.a === 'corner' ? (rng.chance(0.5) ? rng.range(0, 0.08) : rng.range(0.92, 1)) : rng.next();
          if (onWall(type, side, t)) return true;
        }
        return false;
      case 'center':
        for (let k = 0; k < tries; k++) {
          const angle = room.w >= room.h ? 0 : 90;
          const a2 = type === 'car' || type === 'carWreck' ? (room.w >= room.h ? 0 : 90) + rng.range(-6, 6) : angle;
          const [w, h] = propSize(type, Math.round(a2 / 90) * 90);
          if (w > room.w - 0.6 || h > room.h - 0.6) return false;
          const cx = room.x + room.w / 2 + (rng.next() - 0.5) * Math.max(0, room.w - w - 1.2);
          const cy = room.y + room.h / 2 + (rng.next() - 0.5) * Math.max(0, room.h - h - 1.2);
          if (put(type, cx, cy, a2)) return true;
        }
        return false;
      case 'beside': {
        const base = lastOf(rule.of);
        if (!base) return false;
        const b = base.box;
        const [w, h] = propSize(type, base.angle);
        const vertical = base.angle === 0 || base.angle === 180;
        const opts: [number, number][] = vertical
          ? [
              [b.x - w / 2 - 0.08, base.angle === 0 ? b.y + h / 2 : b.y + b.h - h / 2],
              [b.x + b.w + w / 2 + 0.08, base.angle === 0 ? b.y + h / 2 : b.y + b.h - h / 2],
            ]
          : [
              [base.angle === 90 ? b.x + b.w - w / 2 : b.x + w / 2, b.y - h / 2 - 0.08],
              [base.angle === 90 ? b.x + b.w - w / 2 : b.x + w / 2, b.y + b.h + h / 2 + 0.08],
            ];
        for (const [x, y] of rng.chance(0.5) ? opts : opts.reverse()) if (put(type, x, y, base.angle)) return true;
        return false;
      }
      case 'around': {
        const base = lastOf(rule.of);
        if (!base) return false;
        const b = base.box;
        const [w, h] = propSize(type, 0);
        const spots: [number, number, number][] = [
          [b.x + b.w * 0.3, b.y - h / 2 + 0.1, 180],
          [b.x + b.w * 0.7, b.y - h / 2 + 0.1, 180],
          [b.x + b.w * 0.3, b.y + b.h + h / 2 - 0.1, 0],
          [b.x + b.w * 0.7, b.y + b.h + h / 2 - 0.1, 0],
          [b.x - w / 2 + 0.1, b.y + b.h / 2, 90],
          [b.x + b.w + w / 2 - 0.1, b.y + b.h / 2, -90],
        ];
        for (let k = spots.length - 1; k > 0; k--) {
          const j = rng.int(0, k);
          [spots[k], spots[j]] = [spots[j]!, spots[k]!];
        }
        for (const [x, y, a] of spots) {
          // A cadeira pode encostar na mesa (é o lugar dela).
          const box = { x: x - w / 2, y: y - h / 2, w, h };
          if (placed.some((p) => p !== b && overlaps(p, box, 0.02))) continue;
          if (box.x < room.x + 0.1 || box.y < room.y + 0.1 || box.x + box.w > room.x + room.w - 0.1 || box.y + box.h > room.y + room.h - 0.1) continue;
          if (grid.hitsReserved(box)) continue;
          if (!keepsAccess(box)) continue;
          placed.push(box);
          out.push({ type, at: [ROUND(x), ROUND(y)], angle: a + rng.range(-12, 12), box });
          return true;
        }
        return false;
      }
      case 'scatter':
        for (let k = 0; k < tries; k++) {
          const [w, h] = propSize(type, 0);
          if (w > room.w - 0.5 || h > room.h - 0.5) return false;
          const cx = room.x + 0.25 + w / 2 + rng.next() * (room.w - w - 0.5);
          const cy = room.y + 0.25 + h / 2 + rng.next() * (room.h - h - 0.5);
          const j = (rule.jitter ?? 0) * (r.messy ? 1 : 0.25);
          if (put(type, cx, cy, j ? rng.range(-j, j) : 0)) return true;
        }
        return false;
      default:
        return false;
    }
  };

  for (const rule of r.def.rules) {
    const [wlo, whi] = rule.w ?? [0, 2];
    if (r.wealth < wlo || r.wealth > whi) continue;
    if (rule.p !== undefined && !rng.chance(rule.p)) continue;
    if (rule.a === 'rows' || rule.a === 'grid') {
      fillRows(rule, room, rng, put);
      continue;
    }
    const [lo, hi] = rule.n ?? [1, 1];
    // Riqueza puxa para cima; conservação ruim tira.
    const want = (rng.int(lo, hi) + (r.wealth === 2 && hi > 1 && rng.chance(0.5) ? 1 : 0)) * r.keep;
    const n = Math.floor(want) + (rng.next() < want % 1 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const type = typeof rule.t === 'string' ? (rule.t as PropType) : rng.pick(rule.t as readonly PropType[]);
      tryRule(rule, type);
    }
  }

  // Paredes livres: o típico do cômodo encostado (armário, prateleira), pela área.
  if (r.def.fill) {
    const want = ((room.w * room.h) / r.def.fill.per) * r.keep;
    const n = Math.floor(want) + (rng.next() < want % 1 ? 1 : 0);
    for (let i = 0; i < n; i++) tryRule({ t: r.def.fill.t, a: 'wall' }, rng.pick(r.def.fill.t));
  }

  // Miudezas pela área do cômodo (onde couber).
  if (r.def.clutter) {
    const want = ((room.w * room.h) / r.def.clutter.per) * r.keep;
    const n = Math.floor(want) + (rng.next() < want % 1 ? 1 : 0);
    for (let i = 0; i < n; i++) tryRule({ t: r.def.clutter.t, a: 'scatter', jitter: 35 }, rng.pick(r.def.clutter.t));
  }

  // O que ficou encurralado (sem lugar para chegar) sai.
  const reach = grid.reachFrom(doorCells.slice(0, 1));
  const ok = out.filter((p) => !solid(p.type) || grid.accessible(p.box, reach));
  // Tapete e palete por baixo: vão primeiro (desenho).
  ok.sort((a, b) => Number(solid(a.type)) - Number(solid(b.type)));
  return ok;
}

/** Fileiras/grade: preenche o miolo com o tipo, deixando corredores. */
function fillRows(rule: FurnRule, room: LRect, rng: Random, put: (t: PropType, x: number, y: number, a: number) => Placed | null): void {
  const types = typeof rule.t === 'string' ? [rule.t as PropType] : (rule.t as readonly PropType[]);
  const type = rng.pick(types);
  const gap = rule.gap ?? 1.5;
  // Deitado ao longo do lado maior.
  const horizontal = room.w >= room.h;
  const angle = horizontal ? 0 : 90;
  const [w, h] = propSize(type, angle);
  const len = horizontal ? w : h;
  const depth = horizontal ? h : w;
  const across = horizontal ? room.h : room.w;
  const along = horizontal ? room.w : room.h;
  // Deixa ~1,4 tile livre nas pontas (entrada das fileiras) e na parede.
  const margin = 1.35;
  const usable = along - 2 * margin;
  if (usable < len) return;
  const perRow = rule.a === 'grid' ? Math.max(1, Math.floor((usable + gap) / (len + gap))) : Math.max(1, Math.floor((usable + 1.4) / (len + 1.4)));
  const step = depth + gap;
  const first = 1.2 + depth / 2;
  for (let c = first; c <= across - 1.2 - depth / 2 + 1e-6; c += step) {
    const segGap = rule.a === 'grid' ? gap : 1.4;
    const total = perRow * len + (perRow - 1) * segGap;
    const start = (along - total) / 2 + len / 2;
    for (let i = 0; i < perRow; i++) {
      const a = start + i * (len + segGap);
      if (horizontal) put(type, room.x + a, room.y + c, angle);
      else put(type, room.x + c, room.y + a, angle);
    }
    if (rule.a === 'rows' && rng.chance(0.15)) c += 0.4;
  }
}

function sideOfAngle(angle: number): number {
  const a = ((Math.round(angle) % 360) + 360) % 360;
  return a === 0 ? 0 : a === 90 ? 1 : a === 180 ? 2 : a === 270 ? 3 : -1;
}

/** O móvel encostado nesta parede cobre alguma janela? */
function facesWindow(box: LRect, side: number, windows: readonly Span[]): boolean {
  for (const s of windows) {
    const horiz = s.y0 === s.y1;
    if (side % 2 === 0 && horiz) {
      const wallY = side === 0 ? box.y : box.y + box.h;
      if (Math.abs(s.y0 - wallY) > 0.6) continue;
      if (box.x < Math.max(s.x0, s.x1) && box.x + box.w > Math.min(s.x0, s.x1)) return true;
    } else if (side % 2 === 1 && !horiz) {
      const wallX = side === 3 ? box.x : box.x + box.w;
      if (Math.abs(s.x0 - wallX) > 0.6) continue;
      if (box.y < Math.max(s.y0, s.y1) && box.y + box.h > Math.min(s.y0, s.y1)) return true;
    }
  }
  return false;
}
