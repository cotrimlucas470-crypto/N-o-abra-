/**
 * MapBuilder "visto de dentro de um setor": mesmas operações, em tiles
 * LOCAIS do setor (0..72 × 0..56). O gerador de cada setor não precisa saber
 * onde ele fica na cidade. Portas devolvidas também vêm em coordenadas locais.
 */
import type { Random } from '../../core/Random';
import type { DecalType } from '../DecalCatalog';
import { MapBuilder, type Opening, type PlacedBuilding } from '../MapBuilder';
import type { GroundId, MarkingKind, RoofStyle, WallKind } from '../MapTypes';
import type { PropType } from '../PropCatalog';
import type { BuildingTemplate, Rotation } from '../buildings/BuildingTemplate';

export class SectorBuilder {
  constructor(
    readonly b: MapBuilder,
    /** Canto do setor na cidade (tiles). */
    readonly ox: number,
    readonly oy: number,
    /** Id do setor (prefixo de ids de construções). */
    readonly id: string,
    rng: Random,
  ) {
    b.rng = rng;
  }

  get rng(): Random {
    return this.b.rng;
  }

  fill(x: number, y: number, w: number, h: number, g: GroundId): this {
    this.b.fill(x + this.ox, y + this.oy, w, h, g);
    return this;
  }

  groundAt(tx: number, ty: number): GroundId | undefined {
    return this.b.groundAt(tx + this.ox, ty + this.oy);
  }

  marking(kind: MarkingKind, x1: number, y1: number, x2: number, y2: number, thickness: number): this {
    this.b.marking(kind, x1 + this.ox, y1 + this.oy, x2 + this.ox, y2 + this.oy, thickness);
    return this;
  }

  wall(x1: number, y1: number, x2: number, y2: number, kind: WallKind = 'wall', openings: Opening[] = []): this {
    this.b.wall(x1 + this.ox, y1 + this.oy, x2 + this.ox, y2 + this.oy, kind, openings);
    return this;
  }

  prop(type: PropType, tx: number, ty: number, angle = 0, variant?: number, flipX = false): this {
    this.b.prop(type, tx + this.ox, ty + this.oy, angle, variant, flipX);
    return this;
  }

  decal(type: DecalType, tx: number, ty: number, angle?: number, scale = 1, alpha = 1): this {
    this.b.decal(type, tx + this.ox, ty + this.oy, angle, scale, alpha);
    return this;
  }

  scatterDecals(types: readonly DecalType[], count: number, x: number, y: number, w: number, h: number, scale?: [number, number], alpha?: [number, number]): this {
    this.b.scatterDecals(types, count, x + this.ox, y + this.oy, w, h, scale, alpha);
    return this;
  }

  region(id: string, name: string, x: number, y: number, w: number, h: number): this {
    this.b.region(id, name, x + this.ox, y + this.oy, w, h);
    return this;
  }

  item(defId: string, tx: number, ty: number, count = 1): this {
    this.b.item(defId, tx + this.ox, ty + this.oy, count);
    return this;
  }

  setSpawn(tx: number, ty: number): this {
    this.b.setSpawn(tx + this.ox, ty + this.oy);
    return this;
  }

  building(
    tpl: BuildingTemplate,
    tx: number,
    ty: number,
    opts: { id: string; rot?: Rotation; flipX?: boolean; name?: string; roof?: RoofStyle },
  ): PlacedBuilding {
    const placed = this.b.building(tpl, tx + this.ox, ty + this.oy, opts);
    return {
      data: placed.data,
      doors: placed.doors.map((d) => ({ ...d, x: d.x - this.ox, y: d.y - this.oy })),
      toMap: (x, y) => {
        const [mx, my] = placed.toMap(x, y);
        return [mx - this.ox, my - this.oy];
      },
    };
  }
}
