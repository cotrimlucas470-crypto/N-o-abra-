/**
 * GERADOR DE PRÉDIO (puro, determinístico pela chave): arquétipo + tamanho →
 * modelo de construção (BuildingTemplate) que o MapBuilder monta como
 * qualquer planta. Riqueza e estado de conservação mudam móveis, chão e
 * decoração; a semente de cada prédio é a chave dele, então prédios do
 * mesmo arquétipo nunca saem iguais.
 */
import { Random, hashString } from '../../../core/Random';
import type { DecalType } from '../../DecalCatalog';
import type { BuildingKind, GroundId } from '../../MapTypes';
import type { PropType } from '../../PropCatalog';
import type { BuildingTemplate } from '../BuildingTemplate';
import { ARCHETYPES, type Archetype, type ArchetypeId, type Condition } from './archetypes';
import { furnishRoom, type Placed, type Span } from './furnish';
import { makePlan, type Plan } from './layout';
import { openForNav } from './navcheck';
import { ROOMS, type FurnRule, type RoomDef, type RoomKind } from './rooms';
import { contains, type LRect } from './space';

export interface GenOptions {
  /** Pontos (tiles locais) que ficam livres: onde o jogador nasce. */
  keepFree?: readonly (readonly [number, number, number])[];
  wealth?: number;
  condition?: Condition;
  /** Tipo forçado (o prédio de partida continua "shelter" por dentro). */
  kind?: BuildingKind;
  /** Deixa livre o meio do cômodo de entrada (onde o jogador nasce) e devolve o ponto. */
  spawn?: boolean;
  /** Móveis a mais (regras) no primeiro cômodo onde couberem. */
  extra?: readonly FurnRule[];
}

export interface GenResult {
  tpl: BuildingTemplate;
  wealth: number;
  condition: Condition;
  arch: ArchetypeId;
  /** Ponto livre para nascer (tiles locais), se pedido. */
  spawn?: [number, number];
}

/** Conservação padrão da cidade depois do colapso. */
const CONDITION_WEIGHTS: Record<Condition, number> = { conservado: 3, abandonado: 2.5, saqueado: 3, incendiado: 0.5, ocupado: 0.8 };

/** Quanto do que as regras pedem fica (saqueado leva, incendiado some). */
const KEEP: Record<Condition, number> = { conservado: 1, abandonado: 0.85, saqueado: 0.8, incendiado: 0.45, ocupado: 1 };

const DECALS: Record<Condition, readonly DecalType[]> = {
  conservado: ['paper'],
  abandonado: ['dirt', 'leaves', 'crack', 'debris'],
  saqueado: ['paper', 'glass', 'debris', 'litter'],
  incendiado: ['debris', 'oil', 'crack', 'dirt'],
  ocupado: ['paper', 'litter', 'dirt'],
};

/** Extras de quem mora/ocupa: colchão na sala, caixas, lixo acumulado. */
const OCCUPIED_EXTRA: RoomDef = {
  ground: [0, 0, 0] as unknown as RoomDef['ground'],
  rules: [
    { t: 'bedSingle', a: 'wall', p: 0.6 },
    { t: ['crate', 'boxes', 'box'], a: 'scatter', n: [1, 3], jitter: 20 },
    { t: 'trashBags', a: 'scatter', n: [1, 2], jitter: 40 },
  ],
};
/** Saque: caixas reviradas e coisas largadas no chão. */
const LOOTED_EXTRA: RoomDef = {
  ground: [0, 0, 0] as unknown as RoomDef['ground'],
  rules: [{ t: ['box', 'boxes', 'trashBags'], a: 'scatter', n: [1, 2], jitter: 60 }],
};

export function archetype(id: ArchetypeId): Archetype {
  return ARCHETYPES[id];
}

export function generateBuilding(archId: ArchetypeId, W: number, H: number, key: string, opts: GenOptions = {}): GenResult {
  const arch: Archetype = ARCHETYPES[archId];
  const rng = new Random(hashString(`predio:${key}`));
  const wealth = opts.wealth ?? rng.int(arch.wealth[0], arch.wealth[1]);
  const weights = { ...CONDITION_WEIGHTS, ...(arch.condition ?? {}) };
  const condition = opts.condition ?? rng.weighted(Object.entries(weights) as [Condition, number][]);

  let plan: Plan | null = null;
  for (let k = 0; k < 10 && !plan; k++) plan = makePlan(arch.recipe(W, H, wealth, rng), W, H, rng, { entrance: arch.entrance, wealth, ...(arch.openPlan !== undefined ? { openPlan: arch.openPlan } : {}) });
  if (!plan) plan = makePlan({ style: 'bands', front: [arch.kind === 'house' || arch.kind === 'apartment' ? 'Sala' : 'Salão'], back: [], depth: [1, 1] }, W, H, rng, { entrance: arch.entrance, wealth })!;

  // Vão livre para a escada (se o prédio puder ganhar andar): num cômodo de passagem, encostado.
  const nook = arch.floors && W >= 8 && H >= 7 ? stairNook(plan, rng) : null;

  const props: Placed[] = [];
  const keep = KEEP[condition];
  const free = [...(opts.keepFree ?? [])];
  let spawn: [number, number] | undefined;
  if (opts.spawn) {
    const r = plan.rooms[0]!;
    spawn = [Math.round((r.x + r.w / 2) * 100) / 100, Math.round((r.y + r.h / 2) * 100) / 100];
    free.push([spawn[0], spawn[1], 0.9]);
  }
  plan.rooms.forEach((room, i) => {
    const doors = plan!.doors.filter((d) => d.a === i || d.b === i).map((d) => [d.x, d.y] as const);
    const windows = plan!.windows.filter((s) => onBorder(room, s));
    const keepFree = free.filter(([x, y]) => contains(room, x, y));
    const base = { rect: room, doors, windows, keepFree, wealth, keep, ...(nook && contains(room, nook.x + nook.w / 2, nook.y + nook.h / 2) ? { keepOut: [nook] } : {}) };
    const def: RoomDef = arch.furnish?.[room.kind] ?? ROOMS[room.kind];
    const placed = furnishRoom({ ...base, def }, rng);
    // Extras do estado (ocupado / saqueado) no que sobrou de espaço.
    const extra = condition === 'ocupado' && (room.hub || room.kind === 'Sala') ? OCCUPIED_EXTRA : condition === 'saqueado' && rng.chance(0.6) ? LOOTED_EXTRA : null;
    if (extra) {
      const more = furnishRoom({ ...base, def: extra, keepOut: [...(base.keepOut ?? []), ...placed.map((p) => p.box)] }, rng);
      placed.push(...more);
    }
    // Saque/incêndio: parte dos móveis fora do lugar (tortos) — sem entrar na parede.
    if (condition === 'saqueado' || condition === 'incendiado') {
      for (const p of placed) {
        if (BIG.has(p.type) || !rng.chance(0.25)) continue;
        const turn = rng.range(-18, 18);
        if (fitsTurned(p, turn, room)) p.angle += turn;
      }
    }
    props.push(...placed);
  });
  // Pedidos extras (ex.: caixotes de quem morava na casa de partida): primeiro cômodo que comporta.
  if (opts.extra?.length) {
    for (const [i, room] of plan.rooms.entries()) {
      if (room.kind === 'Banheiro') continue;
      const doors = plan.doors.filter((d) => d.a === i || d.b === i).map((d) => [d.x, d.y] as const);
      const inRoom = props.filter((p) => contains(room, p.at[0], p.at[1]));
      const more = furnishRoom({ rect: room, def: { ground: ROOMS.Sala.ground, rules: opts.extra }, doors, windows: [], keepFree: free.filter(([x, y]) => contains(room, x, y)), keepOut: inRoom.map((p) => p.box), wealth, keep: 1 }, rng);
      if (!more.length) continue;
      props.push(...more);
      break;
    }
  }

  // Decoração (decalques): pelo estado de conservação e por acaso (sangue).
  const decals: NonNullable<BuildingTemplate['decals']> = [];
  const pool = DECALS[condition];
  const n = Math.round((W * H) / (condition === 'conservado' ? 40 : 14));
  for (let i = 0; i < n; i++) {
    const room = rng.pick(plan.rooms);
    decals.push({ type: rng.pick(pool), at: [room.x + rng.range(0.4, room.w - 0.4), room.y + rng.range(0.4, room.h - 0.4)], scale: rng.range(0.7, 1.2), alpha: rng.range(0.5, 0.95) });
  }
  if (rng.chance(condition === 'saqueado' ? 0.45 : 0.18)) {
    const room = rng.pick(plan.rooms);
    for (let i = rng.int(1, 3); i > 0; i--) decals.push({ type: rng.chance(0.5) ? 'blood' : 'bloodTrail', at: [room.x + rng.range(0.5, room.w - 0.5), room.y + rng.range(0.5, room.h - 0.5)], scale: rng.range(0.6, 1.1), alpha: rng.range(0.6, 0.9) });
  }

  const floors = plan.rooms.map((r) => ({
    rect: [r.x, r.y, r.w, r.h] as const,
    ground: groundFor(arch.furnish?.[r.kind] ?? ROOMS[r.kind], wealth, condition),
    room: r.kind as string,
  }));
  const raw: BuildingTemplate = {
    kind: opts.kind ?? arch.kind,
    name: arch.names[Math.min(2, wealth)] ?? arch.names[0],
    w: W,
    h: H,
    roof: rng.pick(arch.roofs),
    front: 's',
    floors,
    walls: plan.walls,
    props: props.map((p) => ({ type: p.type, at: p.at, angle: Math.round(p.angle * 10) / 10 })),
    decals,
    doors: plan.exterior,
  };
  // A grade dos zumbis é mais grossa que a do jogador: tira o móvel que fecha passagem para ela.
  const tpl = openForNav(raw, [...plan.doors.map((d) => [d.x, d.y] as const), ...plan.exterior.map((d) => d.at)]);
  return { tpl, wealth, condition, arch: archId, ...(spawn ? { spawn } : {}) };
}

/** Grandes demais para "ficar torto" no saque (carro, cama, balcão). */
const BIG = new Set<PropType>(['car', 'carWreck', 'bedDouble', 'kitchenCounter', 'storeShelf', 'displayFridge', 'checkout', 'workbench', 'toolShelf', 'wardrobe', 'bathtub']);

function groundFor(def: RoomDef, wealth: number, _condition: Condition): GroundId {
  return def.ground[Math.max(0, Math.min(2, wealth))]!;
}

/** Girado `turn` graus, o móvel ainda cabe no cômodo (sem tocar parede)? */
function fitsTurned(p: Placed, turn: number, room: LRect): boolean {
  const a = (Math.abs(turn) * Math.PI) / 180;
  const w = p.box.w * Math.cos(a) + p.box.h * Math.sin(a);
  const h = p.box.w * Math.sin(a) + p.box.h * Math.cos(a);
  const cx = p.box.x + p.box.w / 2;
  const cy = p.box.y + p.box.h / 2;
  return cx - w / 2 > room.x + 0.14 && cx + w / 2 < room.x + room.w - 0.14 && cy - h / 2 > room.y + 0.14 && cy + h / 2 < room.y + room.h - 0.14;
}

/** A janela está na borda deste cômodo? */
function onBorder(room: LRect, s: Span): boolean {
  const mx = (s.x0 + s.x1) / 2;
  const my = (s.y0 + s.y1) / 2;
  return contains(room, mx, my, 0.05);
}

/** Vão da escada (1,1 × 2,3 tiles + folga) encostado numa parede de um cômodo de passagem. */
function stairNook(plan: Plan, rng: Random): LRect | null {
  const hubs = plan.rooms.filter((r) => r.hub || r.kind === 'Sala' || r.kind === 'Corredor' || r.kind === 'Recepção');
  for (const room of hubs) {
    const doors = plan.doors.filter((d) => contains(room, d.x, d.y, 0.05));
    for (let k = 0; k < 8; k++) {
      const vertical = rng.chance(0.5);
      const w = vertical ? 1.5 : 2.7;
      const h = vertical ? 2.7 : 1.5;
      if (room.w < w + 1.4 || room.h < h + 1.4) continue;
      const x = rng.chance(0.5) ? room.x + 0.1 : room.x + room.w - w - 0.1;
      const y = rng.chance(0.5) ? room.y + 0.1 : room.y + room.h - h - 0.1;
      const r = { x, y, w, h };
      if (doors.some((d) => Math.hypot(Math.max(r.x - d.x, 0, d.x - (r.x + r.w)), Math.max(r.y - d.y, 0, d.y - (r.y + r.h))) < 1.3)) continue;
      return r;
    }
  }
  return null;
}

export type { RoomKind };
