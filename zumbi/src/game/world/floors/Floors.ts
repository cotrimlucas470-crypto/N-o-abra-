/**
 * Consulta dos ANDARES em jogo (pura): em que "espaço" um ponto está
 * (0 = cidade/térreo, n = um andar), o mesmo ponto em outro andar do prédio,
 * a escada mais perto. Cada andar mora em chunks só dele na faixa, então
 * "qual espaço" é uma consulta direta pelo chunk.
 *
 * Espaços diferentes não se enxergam nem se ouvem direto: o som passa pela
 * escada/laje (ver `bridge`).
 */
import { chunkKeyAt } from '../../sim/ChunkGrid';
import type { FloorData, MapData, StairPlacement } from '../MapTypes';

export class Floors {
  readonly list: readonly FloorData[];
  readonly stairs: readonly StairPlacement[];
  /** Fim da cidade (px): abaixo disso só há a faixa dos andares. */
  readonly cityHeightPx: number;
  private readonly byChunk = new Map<number, number>();
  private readonly byBuilding = new Map<string, FloorData[]>();
  private readonly stairsOf = new Map<string, StairPlacement[]>();

  constructor(map: MapData) {
    this.list = map.floors ?? [];
    this.stairs = map.stairs ?? [];
    this.cityHeightPx = (map.cityHeightTiles ?? map.heightTiles) * map.tileSize;
    this.list.forEach((f, i) => {
      const b = f.bounds;
      for (let y = b.y; y < b.y + b.h + 1024; y += 1024) {
        for (let x = b.x; x < b.x + b.w + 1024; x += 1024) {
          const k = chunkKeyAt(Math.min(x, b.x + b.w - 1), Math.min(y, b.y + b.h - 1));
          this.byChunk.set(k, i);
        }
      }
      const l = this.byBuilding.get(f.building) ?? [];
      l[f.level] = f;
      this.byBuilding.set(f.building, l);
    });
    for (const s of this.stairs) {
      const l = this.stairsOf.get(s.building) ?? [];
      l[s.level] = s;
      this.stairsOf.set(s.building, l);
    }
  }

  get any(): boolean {
    return this.list.length > 0;
  }

  /** 0 = cidade; i+1 = andar `list[i]`; -1 = vão vazio da faixa. */
  spaceAt(x: number, y: number): number {
    if (y < this.cityHeightPx) return 0;
    const i = this.byChunk.get(chunkKeyAt(x, y));
    return i === undefined ? -1 : i + 1;
  }

  floorAt(x: number, y: number): FloorData | null {
    const s = this.spaceAt(x, y);
    return s > 0 ? this.list[s - 1]! : null;
  }

  levelAt(x: number, y: number): number {
    return this.floorAt(x, y)?.level ?? 0;
  }

  floorOf(building: string, level: number): FloorData | null {
    return this.byBuilding.get(building)?.[level] ?? null;
  }

  /** Andar mais alto do prédio (0 = só térreo). */
  top(building: string): number {
    return (this.byBuilding.get(building)?.length ?? 1) - 1;
  }

  stair(building: string, level: number): StairPlacement | null {
    return this.stairsOf.get(building)?.[level] ?? null;
  }

  /** Posição "real" (no térreo da cidade) de um ponto de qualquer andar. */
  toReal(x: number, y: number): { x: number; y: number } {
    const f = this.floorAt(x, y);
    return f ? { x: x - f.dx, y: y - f.dy } : { x, y };
  }

  /** O mesmo ponto no andar `level` do prédio (0 = térreo). */
  project(x: number, y: number, building: string, level: number): { x: number; y: number } | null {
    const r = this.toReal(x, y);
    if (level === 0) return r;
    const f = this.floorOf(building, level);
    return f ? { x: r.x + f.dx, y: r.y + f.dy } : null;
  }

  /** Escadas cujo vão está a até `r` px do ponto. */
  stairsNear(x: number, y: number, r: number): StairPlacement[] {
    const out: StairPlacement[] = [];
    for (const s of this.stairs) {
      const dx = Math.max(s.x - x, 0, x - (s.x + s.w));
      const dy = Math.max(s.y - y, 0, y - (s.y + s.h));
      if (dx * dx + dy * dy <= r * r) out.push(s);
    }
    return out;
  }

  /** Prédio (id do térreo) que tem este ponto num andar, ou null. */
  buildingAt(x: number, y: number): string | null {
    return this.floorAt(x, y)?.building ?? null;
  }
}
