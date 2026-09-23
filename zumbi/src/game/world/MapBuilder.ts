/**
 * Ferramenta para montar mapas em código, em unidades de TILE
 * (frações permitidas para objetos e vãos). Produz um MapData puro.
 *
 * Mapas futuros podem vir de JSON/Tiled — o resto do jogo só conhece MapData.
 */
import { TILE } from '../config/GameConfig';
import { Random } from '../core/Random';
import type { DecalType } from './DecalCatalog';
import type {
  BuildingData,
  DecalPlacement,
  GroundId,
  MapData,
  MarkingKind,
  MarkingPlacement,
  PropPlacement,
  Rect,
  RegionData,
  RoofStyle,
  WallKind,
  WallPiece,
} from './MapTypes';
import { PROP_DEFS, type PropType } from './PropCatalog';
import type { BuildingTemplate, Rotation, TemplateWall } from './buildings/BuildingTemplate';

/** Espessura de parede por tipo (px). */
export const WALL_THICKNESS: Record<WallKind, number> = {
  wall: 14,
  window: 10,
  fence: 8,
};

export interface Opening {
  /** Distância (tiles) desde o ponto inicial da parede. */
  at: number;
  len: number;
  type: 'door' | 'window';
}

export interface PlacedBuilding {
  data: BuildingData;
  /** Portas externas em coordenadas de tile. */
  doors: { x: number; y: number; side: 'n' | 's' | 'e' | 'w' }[];
  /** Converte coordenada local do modelo para tile do mapa. */
  toMap(x: number, y: number): [number, number];
}

export class MapBuilder {
  readonly rng: Random;
  private readonly ground: Uint8Array;
  private readonly markings: MarkingPlacement[] = [];
  private readonly walls: WallPiece[] = [];
  private readonly props: PropPlacement[] = [];
  private readonly decals: DecalPlacement[] = [];
  private readonly buildings: BuildingData[] = [];
  private readonly regions: RegionData[] = [];
  private spawn = { x: 0, y: 0 };

  constructor(
    private readonly id: string,
    private readonly name: string,
    readonly width: number,
    readonly height: number,
    private readonly seed: number,
    base: GroundId,
  ) {
    this.rng = new Random(seed);
    this.ground = new Uint8Array(width * height).fill(base);
  }

  // ------------------------------------------------------------ chão

  fill(x: number, y: number, w: number, h: number, g: GroundId): this {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.ceil(x + w));
    const y1 = Math.min(this.height, Math.ceil(y + h));
    for (let ty = y0; ty < y1; ty++) {
      for (let tx = x0; tx < x1; tx++) this.ground[ty * this.width + tx] = g;
    }
    return this;
  }

  groundAt(tx: number, ty: number): GroundId | undefined {
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return undefined;
    return this.ground[ty * this.width + tx] as GroundId;
  }

  /** Faixa pintada entre dois pontos (tiles), horizontal ou vertical. */
  marking(kind: MarkingKind, x1: number, y1: number, x2: number, y2: number, thickness: number): this {
    const vertical = x1 === x2;
    const length = (vertical ? Math.abs(y2 - y1) : Math.abs(x2 - x1)) * TILE;
    this.markings.push({
      kind,
      x: ((x1 + x2) / 2) * TILE,
      y: ((y1 + y2) / 2) * TILE,
      length,
      thickness,
      vertical,
    });
    return this;
  }

  // ------------------------------------------------------------ paredes

  /**
   * Parede reta (horizontal ou vertical) de (x1,y1) até (x2,y2), em tiles.
   * `openings` abre portas (vão livre) e janelas (vidro), medidos a partir de (x1,y1).
   */
  wall(x1: number, y1: number, x2: number, y2: number, kind: WallKind = 'wall', openings: Opening[] = []): this {
    const horizontal = y1 === y2;
    if (!horizontal && x1 !== x2) throw new Error(`Parede diagonal não suportada: (${x1},${y1})-(${x2},${y2})`);
    const a = horizontal ? x1 : y1;
    const b = horizontal ? x2 : y2;
    const length = Math.abs(b - a);
    // Normaliza para sempre andar do menor para o maior.
    const start = Math.min(a, b);
    const end = Math.max(a, b);
    const ops = openings
      .map((o) => (a <= b ? o : { ...o, at: length - o.at - o.len }))
      .sort((p, q) => p.at - q.at);

    const fixed = horizontal ? y1 : x1;
    const th = WALL_THICKNESS[kind];
    const pushPiece = (from: number, to: number, pieceKind: WallKind, extendStart: boolean, extendEnd: boolean) => {
      if (to - from <= 1e-6) return;
      const t = WALL_THICKNESS[pieceKind];
      const p0 = from * TILE - (extendStart ? th / 2 : 0);
      const p1 = to * TILE + (extendEnd ? th / 2 : 0);
      const c = fixed * TILE;
      this.walls.push(
        horizontal
          ? { kind: pieceKind, x: p0, y: c - t / 2, w: p1 - p0, h: t }
          : { kind: pieceKind, x: c - t / 2, y: p0, w: t, h: p1 - p0 },
      );
    };

    let cursor = start;
    for (const o of ops) {
      const oStart = start + o.at;
      const oEnd = oStart + o.len;
      if (o.at < -1e-6 || oEnd > end + 1e-6) throw new Error(`Abertura fora da parede em (${x1},${y1})-(${x2},${y2})`);
      pushPiece(cursor, oStart, kind, cursor === start, false);
      if (o.type === 'window') pushPiece(oStart, oEnd, 'window', false, false);
      cursor = oEnd;
    }
    pushPiece(cursor, end, kind, cursor === start, true);
    return this;
  }

  /** Contorno retangular de cerca/muro (sem aberturas), em tiles. */
  outline(x: number, y: number, w: number, h: number, kind: WallKind = 'fence'): this {
    this.wall(x, y, x + w, y, kind);
    this.wall(x, y + h, x + w, y + h, kind);
    this.wall(x, y, x, y + h, kind);
    this.wall(x + w, y, x + w, y + h, kind);
    return this;
  }

  // ------------------------------------------------------------ objetos

  /** Objeto centrado em (tx, ty) tiles. angle em graus (horário). */
  prop(type: PropType, tx: number, ty: number, angle = 0, variant?: number, flipX = false): this {
    const def = PROP_DEFS[type];
    const v = variant ?? this.rng.int(0, def.sprites.length - 1);
    this.props.push({
      type,
      x: tx * TILE,
      y: ty * TILE,
      angle,
      variant: Math.min(v, def.sprites.length - 1),
      ...(flipX ? { flipX: true } : {}),
    });
    return this;
  }

  decal(type: DecalType, tx: number, ty: number, angle?: number, scale = 1, alpha = 1): this {
    this.decals.push({
      type,
      x: tx * TILE,
      y: ty * TILE,
      angle: angle ?? this.rng.range(0, 360),
      scale,
      alpha,
    });
    return this;
  }

  /** Espalha decalques aleatórios dentro de um retângulo (tiles). */
  scatterDecals(types: readonly DecalType[], count: number, x: number, y: number, w: number, h: number, scale: [number, number] = [0.8, 1.2], alpha: [number, number] = [0.7, 1]): this {
    for (let i = 0; i < count; i++) {
      this.decal(
        this.rng.pick(types),
        this.rng.range(x, x + w),
        this.rng.range(y, y + h),
        undefined,
        this.rng.range(scale[0], scale[1]),
        this.rng.range(alpha[0], alpha[1]),
      );
    }
    return this;
  }

  region(id: string, name: string, x: number, y: number, w: number, h: number): this {
    this.regions.push({ id, name, rect: { x: x * TILE, y: y * TILE, w: w * TILE, h: h * TILE } });
    return this;
  }

  setSpawn(tx: number, ty: number): this {
    this.spawn = { x: tx * TILE, y: ty * TILE };
    return this;
  }

  // ------------------------------------------------------------ construções

  /**
   * Coloca uma construção a partir de um modelo, com canto superior
   * esquerdo em (tx, ty) e rotação horária de 0/90/180/270 graus.
   * `flipX` espelha o modelo antes de girar.
   */
  building(
    tpl: BuildingTemplate,
    tx: number,
    ty: number,
    opts: { id: string; rot?: Rotation; flipX?: boolean; name?: string; roof?: RoofStyle },
  ): PlacedBuilding {
    const rot = opts.rot ?? 0;
    const flip = opts.flipX ?? false;
    const rotated = rot === 90 || rot === 270;
    const outW = rotated ? tpl.h : tpl.w;
    const outH = rotated ? tpl.w : tpl.h;

    const local = (x: number, y: number): [number, number] => {
      const fx = flip ? tpl.w - x : x;
      switch (rot) {
        case 0:
          return [fx, y];
        case 90:
          return [tpl.h - y, fx];
        case 180:
          return [tpl.w - fx, tpl.h - y];
        case 270:
          return [y, tpl.w - fx];
      }
    };
    const toMap = (x: number, y: number): [number, number] => {
      const [lx, ly] = local(x, y);
      return [tx + lx, ty + ly];
    };
    const rectToMap = (r: readonly [number, number, number, number]): Rect => {
      const [ax, ay] = toMap(r[0], r[1]);
      const [bx, by] = toMap(r[0] + r[2], r[1] + r[3]);
      return { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) };
    };
    const angleToMap = (deg: number): number => (flip ? -deg : deg) + rot;

    // pisos
    const rooms = tpl.floors.map((f) => {
      const r = rectToMap(f.rect);
      this.fill(r.x, r.y, r.w, r.h, f.ground);
      return { name: f.room, rect: { x: r.x * TILE, y: r.y * TILE, w: r.w * TILE, h: r.h * TILE } };
    });

    // paredes
    for (const w of tpl.walls) this.templateWall(w, toMap);

    // móveis
    for (const p of tpl.props) {
      const [px, py] = toMap(p.at[0], p.at[1]);
      this.prop(p.type, px, py, angleToMap(p.angle ?? 0), p.variant, flip);
    }
    for (const d of tpl.decals ?? []) {
      const [dx, dy] = toMap(d.at[0], d.at[1]);
      this.decal(d.type, dx, dy, d.angle === undefined ? undefined : angleToMap(d.angle), d.scale ?? 1, d.alpha ?? 1);
    }

    // portas externas
    const doors = tpl.doors.map((d) => {
      const [x, y] = toMap(d.at[0], d.at[1]);
      return { x, y, side: rotateSide(d.side, rot, flip) };
    });
    for (const d of doors) {
      const off = 0.42;
      const [dx, dy] = d.side === 'n' ? [0, -off] : d.side === 's' ? [0, off] : d.side === 'w' ? [-off, 0] : [off, 0];
      this.decal('doormat', d.x + dx, d.y + dy, d.side === 'n' || d.side === 's' ? 0 : 90, 1, 0.95);
    }

    const bounds = rectToMap([0, 0, tpl.w, tpl.h]);
    const data: BuildingData = {
      id: opts.id,
      kind: tpl.kind,
      name: opts.name ?? tpl.name,
      bounds: { x: bounds.x * TILE, y: bounds.y * TILE, w: outW * TILE, h: outH * TILE },
      roof: opts.roof ?? tpl.roof,
      rooms,
      doors: doors.map((d) => ({ x: d.x * TILE, y: d.y * TILE })),
    };
    this.buildings.push(data);
    return { data, doors, toMap };
  }

  private templateWall(w: TemplateWall, toMap: (x: number, y: number) => [number, number]): void {
    const [ax, ay] = toMap(w.a[0], w.a[1]);
    const [bx, by] = toMap(w.b[0], w.b[1]);
    // Rotação/espelho preservam distâncias ao longo da parede: as aberturas continuam
    // medidas a partir de `a`, mesmo que `a` agora esteja "depois" de `b`.
    this.wall(round4(ax), round4(ay), round4(bx), round4(by), w.kind ?? 'wall', w.openings ?? []);
  }

  build(): MapData {
    return {
      id: this.id,
      name: this.name,
      seed: this.seed,
      widthTiles: this.width,
      heightTiles: this.height,
      tileSize: TILE,
      ground: this.ground,
      markings: this.markings,
      walls: this.walls,
      props: this.props,
      decals: this.decals,
      buildings: this.buildings,
      regions: this.regions,
      spawn: this.spawn,
    };
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

type Side = 'n' | 's' | 'e' | 'w';

function rotateSide(side: Side, rot: Rotation, flip: boolean): Side {
  let s: Side = side;
  if (flip) s = s === 'e' ? 'w' : s === 'w' ? 'e' : s;
  const order: Side[] = ['n', 'e', 's', 'w'];
  const idx = order.indexOf(s);
  return order[(idx + rot / 90) % 4] as Side;
}
