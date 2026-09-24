/**
 * Grade de navegação: por onde um corpo (zumbi, NPC) consegue andar.
 * Pura, sem Phaser. Células de 32 px (meio tile).
 *
 * Cada célula guarda QUANTOS sólidos a ocupam (e não só sim/não): assim
 * dá para acrescentar e remover obstáculos em tempo de jogo — porta que
 * fecha, barricada construída, carro empurrado — sem reconstruir a grade.
 *
 * Garantia usada pela IA: o centro de uma célula livre fica a pelo menos
 * ~16 px de qualquer parede, então um corpo de raio ≤ 15 anda pelos centros
 * sem encostar. Diagonal só passa se as duas células vizinhas estiverem
 * livres (nada de "cortar quina" de parede).
 */
import type { MapData } from '../MapTypes';
import { mapSolids, type Solid } from '../collision';

export const NAV_CELL = 32;
/** Encostar (sobrepor menos que isto) não bloqueia a célula. */
const EPS = 1;

export class NavGrid {
  readonly cols: number;
  readonly rows: number;
  private readonly counts: Uint16Array;

  constructor(
    readonly widthPx: number,
    readonly heightPx: number,
    readonly cell = NAV_CELL,
  ) {
    this.cols = Math.ceil(widthPx / cell);
    this.rows = Math.ceil(heightPx / cell);
    this.counts = new Uint16Array(this.cols * this.rows);
  }

  static fromMap(map: MapData, cell = NAV_CELL): NavGrid {
    const g = new NavGrid(map.widthTiles * map.tileSize, map.heightTiles * map.tileSize, cell);
    for (const s of mapSolids(map)) g.addSolid(s);
    return g;
  }

  addSolid(s: Solid): void {
    this.apply(s, 1);
  }

  removeSolid(s: Solid): void {
    this.apply(s, -1);
  }

  private apply(s: Solid, delta: number): void {
    const c = this.cell;
    const [x0, y0, x1, y1] = s.kind === 'rect' ? [s.x, s.y, s.x + s.w, s.y + s.h] : [s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r];
    const cx0 = Math.max(0, Math.floor((x0 + EPS) / c));
    const cy0 = Math.max(0, Math.floor((y0 + EPS) / c));
    const cx1 = Math.min(this.cols - 1, Math.floor((x1 - EPS) / c));
    const cy1 = Math.min(this.rows - 1, Math.floor((y1 - EPS) / c));
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        if (s.kind === 'circle') {
          // círculo: só marca células que ele realmente atravessa
          const nx = Math.max(cx * c, Math.min(s.x, cx * c + c));
          const ny = Math.max(cy * c, Math.min(s.y, cy * c + c));
          const rr = s.r - EPS;
          if ((s.x - nx) ** 2 + (s.y - ny) ** 2 >= rr * rr) continue;
        }
        const i = cy * this.cols + cx;
        const v = this.counts[i]! + delta;
        this.counts[i] = v < 0 ? 0 : v;
      }
    }
  }

  inBounds(cx: number, cy: number): boolean {
    return cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows;
  }

  /** Fora do mapa conta como bloqueado. */
  isBlocked(cx: number, cy: number): boolean {
    if (!this.inBounds(cx, cy)) return true;
    return this.counts[cy * this.cols + cx]! > 0;
  }

  isBlockedIndex(i: number): boolean {
    return this.counts[i]! > 0;
  }

  isWalkableAt(x: number, y: number): boolean {
    return !this.isBlocked(Math.floor(x / this.cell), Math.floor(y / this.cell));
  }

  cellOf(x: number, y: number): { cx: number; cy: number } {
    return { cx: Math.floor(x / this.cell), cy: Math.floor(y / this.cell) };
  }

  centerOf(cx: number, cy: number): { x: number; y: number } {
    return { x: (cx + 0.5) * this.cell, y: (cy + 0.5) * this.cell };
  }

  /** Célula livre mais próxima (busca em anéis), ou null. */
  nearestWalkable(cx: number, cy: number, maxRadius = 4): { cx: number; cy: number } | null {
    if (!this.isBlocked(cx, cy)) return { cx, cy };
    for (let r = 1; r <= maxRadius; r++) {
      let best: { cx: number; cy: number } | null = null;
      let bestD = Infinity;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (this.isBlocked(cx + dx, cy + dy)) continue;
          const d = dx * dx + dy * dy;
          if (d < bestD) {
            bestD = d;
            best = { cx: cx + dx, cy: cy + dy };
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  /**
   * Um corpo de raio `radius` consegue ir em linha reta de A até B?
   * Amostra o segmento e as duas "bordas" do corpo a cada meia célula.
   * Usado para encurtar rotas (tirar zigue-zague de grade).
   */
  lineWalkable(ax: number, ay: number, bx: number, by: number, radius = 14): boolean {
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return this.isWalkableAt(ax, ay);
    const nx = -dy / len;
    const ny = dx / len;
    const steps = Math.ceil(len / (this.cell / 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = ax + dx * t;
      const y = ay + dy * t;
      if (!this.isWalkableAt(x, y)) return false;
      if (!this.isWalkableAt(x + nx * radius, y + ny * radius)) return false;
      if (!this.isWalkableAt(x - nx * radius, y - ny * radius)) return false;
    }
    return true;
  }

  /**
   * Todas as células alcançáveis a partir de uma célula (8 vizinhos, sem
   * cortar quina). Serve para testes de mapa e, na Fase 5, para saber se
   * um zumbi pode chegar a um lugar antes de gastar uma busca de rota.
   */
  reachableFrom(cx: number, cy: number): Uint8Array {
    const seen = new Uint8Array(this.cols * this.rows);
    if (this.isBlocked(cx, cy)) return seen;
    const stack = [cy * this.cols + cx];
    seen[stack[0]!] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      const x = i % this.cols;
      const y = (i / this.cols) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (this.isBlocked(nx, ny)) continue;
          if (dx !== 0 && dy !== 0 && (this.isBlocked(x + dx, y) || this.isBlocked(x, y + dy))) continue;
          const j = ny * this.cols + nx;
          if (seen[j]) continue;
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    return seen;
  }

  /** Quantas células estão bloqueadas (estatística/debug). */
  blockedCount(): number {
    let n = 0;
    for (const v of this.counts) if (v > 0) n++;
    return n;
  }
}
