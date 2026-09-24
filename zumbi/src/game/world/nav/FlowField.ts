/**
 * CAMPO DE FLUXO: distância de cada célula (numa janela em volta de um alvo)
 * até o alvo, pela grade de navegação. Uma conta serve para TODOS os zumbis
 * que perseguem o mesmo alvo — em vez de um A* por zumbi, cada um só desce
 * o "morro" das distâncias. Obstáculo quebrável (porta, janela, barricada)
 * entra com custo extra: o grupo vai até ele e bate.
 *
 * Dijkstra com heap binário, buffers reaproveitados; janela limitada.
 */
import type { NavGrid } from './NavGrid';

const SQRT2 = Math.SQRT2;
const DIRS: readonly (readonly [number, number, number])[] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2],
];

export class FlowField {
  /** Janela: canto (células) e lado. */
  x0 = 0;
  y0 = 0;
  readonly side: number;
  private readonly dist: Float32Array;
  private heap: number[] = [];
  private heapF: number[] = [];
  /** Alvo atual (px) e se a conta está válida. */
  tx = 0;
  ty = 0;
  ready = false;

  constructor(
    private readonly grid: NavGrid,
    /** Raio da janela em células. */
    readonly radius = 40,
    /** Custo extra de atravessar obstáculo quebrável. */
    private readonly softCost = 14,
  ) {
    this.side = radius * 2 + 1;
    this.dist = new Float32Array(this.side * this.side);
  }

  /** Recalcula a partir do alvo (px). */
  build(tx: number, ty: number): void {
    const g = this.grid;
    const side = this.side;
    this.tx = tx;
    this.ty = ty;
    const t = g.cellOf(tx, ty);
    const start = g.nearestWalkable(t.cx, t.cy, 3);
    this.dist.fill(Infinity);
    this.ready = false;
    if (!start) return;
    this.x0 = start.cx - this.radius;
    this.y0 = start.cy - this.radius;
    const s = (start.cy - this.y0) * side + (start.cx - this.x0);
    this.dist[s] = 0;
    this.heap.length = 0;
    this.heapF.length = 0;
    this.push(s, 0);
    while (this.heap.length) {
      const f = this.heapF[0]!;
      const cur = this.pop();
      if (f > this.dist[cur]!) continue;
      const lx = cur % side;
      const ly = (cur / side) | 0;
      const cx = lx + this.x0;
      const cy = ly + this.y0;
      // Sai de célula quebrável só em linha reta (igual ao A*).
      for (const [dx, dy, cost] of DIRS) {
        const nlx = lx + dx;
        const nly = ly + dy;
        if (nlx < 0 || nly < 0 || nlx >= side || nly >= side) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        let extra = 0;
        if (g.isBlocked(nx, ny)) {
          if (!g.isSoftOnly(nx, ny) || (dx !== 0 && dy !== 0)) continue;
          extra = this.softCost;
        }
        if (dx !== 0 && dy !== 0 && (g.isBlocked(cx + dx, cy) || g.isBlocked(cx, cy + dy))) continue;
        const ni = nly * side + nlx;
        const nd = f + cost + extra;
        if (nd < this.dist[ni]!) {
          this.dist[ni] = nd;
          this.push(ni, nd);
        }
      }
    }
    this.ready = true;
  }

  /** Distância (em células) do ponto até o alvo; Infinity fora da janela ou sem caminho. */
  distAt(x: number, y: number): number {
    const c = this.grid.cellOf(x, y);
    return this.distCell(c.cx, c.cy);
  }

  private distCell(cx: number, cy: number): number {
    const lx = cx - this.x0;
    const ly = cy - this.y0;
    if (lx < 0 || ly < 0 || lx >= this.side || ly >= this.side) return Infinity;
    return this.dist[ly * this.side + lx]!;
  }

  /**
   * Próximo ponto (centro da célula vizinha mais perto do alvo), ou null
   * (fora da janela / sem caminho / já na célula do alvo).
   */
  next(x: number, y: number): { x: number; y: number; soft: boolean } | null {
    if (!this.ready) return null;
    const g = this.grid;
    const c = g.cellOf(x, y);
    const here = this.distCell(c.cx, c.cy);
    if (here === Infinity || here === 0) return null;
    let best = here;
    let bx = 0;
    let by = 0;
    for (const [dx, dy] of DIRS) {
      const d = this.distCell(c.cx + dx, c.cy + dy);
      if (d < best) {
        best = d;
        bx = dx;
        by = dy;
      }
    }
    if (best >= here) return null;
    const p = g.centerOf(c.cx + bx, c.cy + by);
    return { x: p.x, y: p.y, soft: g.isSoftOnly(c.cx + bx, c.cy + by) };
  }

  // ---------------------------------------------------------- heap binário (mínimo)

  private push(node: number, f: number): void {
    const h = this.heap;
    const hf = this.heapF;
    h.push(node);
    hf.push(f);
    let i = h.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (hf[p]! <= f) break;
      h[i] = h[p]!;
      hf[i] = hf[p]!;
      i = p;
    }
    h[i] = node;
    hf[i] = f;
  }

  private pop(): number {
    const h = this.heap;
    const hf = this.heapF;
    const top = h[0]!;
    const lastN = h.pop()!;
    const lastF = hf.pop()!;
    if (h.length > 0) {
      let i = 0;
      const n = h.length;
      for (;;) {
        const l = i * 2 + 1;
        if (l >= n) break;
        const r = l + 1;
        const c = r < n && hf[r]! < hf[l]! ? r : l;
        if (hf[c]! >= lastF) break;
        h[i] = h[c]!;
        hf[i] = hf[c]!;
        i = c;
      }
      h[i] = lastN;
      hf[i] = lastF;
    }
    return top;
  }
}
