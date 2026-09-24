/**
 * Grade de visão: o que bloqueia a vista (paredes, cercas; na Fase 2,
 * portas fechadas). Janelas NÃO bloqueiam. Células de 16 px.
 *
 * `hasLineOfSight` percorre as células atravessadas pela linha (DDA de
 * Amanatides & Woo) — exato para a grade e barato: ~40 passos para 600 px.
 * Base da visão dos zumbis (Fase 5) e, no futuro, de luz e som através de paredes.
 */
import type { MapData, Rect, WallKind } from '../MapTypes';

export const SIGHT_CELL = 16;
const EPS = 0.5;

/** Tipos de parede que bloqueiam a vista. */
const OPAQUE: Record<WallKind, boolean> = { wall: true, fence: true, window: false };

export class SightGrid {
  readonly cols: number;
  readonly rows: number;
  private readonly counts: Uint16Array;

  constructor(
    readonly widthPx: number,
    readonly heightPx: number,
    readonly cell = SIGHT_CELL,
  ) {
    this.cols = Math.ceil(widthPx / cell);
    this.rows = Math.ceil(heightPx / cell);
    this.counts = new Uint16Array(this.cols * this.rows);
  }

  static fromMap(map: MapData, cell = SIGHT_CELL): SightGrid {
    const g = new SightGrid(map.widthTiles * map.tileSize, map.heightTiles * map.tileSize, cell);
    for (const w of map.walls) if (OPAQUE[w.kind]) g.addBlocker(w);
    return g;
  }

  addBlocker(r: Rect): void {
    this.apply(r, 1);
  }

  removeBlocker(r: Rect): void {
    this.apply(r, -1);
  }

  private apply(r: Rect, delta: number): void {
    const c = this.cell;
    const cx0 = Math.max(0, Math.floor((r.x + EPS) / c));
    const cy0 = Math.max(0, Math.floor((r.y + EPS) / c));
    const cx1 = Math.min(this.cols - 1, Math.floor((r.x + r.w - EPS) / c));
    const cy1 = Math.min(this.rows - 1, Math.floor((r.y + r.h - EPS) / c));
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const i = cy * this.cols + cx;
        const v = this.counts[i]! + delta;
        this.counts[i] = v < 0 ? 0 : v;
      }
    }
  }

  isOpaque(cx: number, cy: number): boolean {
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return true;
    return this.counts[cy * this.cols + cx]! > 0;
  }

  /**
   * Há linha de visão livre de A até B? A célula de A é ignorada (quem olha
   * pode estar encostado numa parede). Opcionalmente devolve onde bateu.
   */
  hasLineOfSight(ax: number, ay: number, bx: number, by: number, hit?: { x: number; y: number }): boolean {
    const c = this.cell;
    let cx = Math.floor(ax / c);
    let cy = Math.floor(ay / c);
    const tx = Math.floor(bx / c);
    const ty = Math.floor(by / c);
    const dx = bx - ax;
    const dy = by - ay;
    const stepX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    const stepY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    const tDeltaX = stepX !== 0 ? Math.abs(c / dx) : Infinity;
    const tDeltaY = stepY !== 0 ? Math.abs(c / dy) : Infinity;
    let tMaxX = stepX > 0 ? ((cx + 1) * c - ax) / dx : stepX < 0 ? (cx * c - ax) / dx : Infinity;
    let tMaxY = stepY > 0 ? ((cy + 1) * c - ay) / dy : stepY < 0 ? (cy * c - ay) / dy : Infinity;
    let guard = this.cols + this.rows + 4;
    while ((cx !== tx || cy !== ty) && guard-- > 0) {
      let t: number;
      if (tMaxX < tMaxY) {
        t = tMaxX;
        tMaxX += tDeltaX;
        cx += stepX;
      } else {
        t = tMaxY;
        tMaxY += tDeltaY;
        cy += stepY;
      }
      if (this.isOpaque(cx, cy)) {
        if (hit) {
          hit.x = ax + dx * t;
          hit.y = ay + dy * t;
        }
        return false;
      }
    }
    return true;
  }
}
