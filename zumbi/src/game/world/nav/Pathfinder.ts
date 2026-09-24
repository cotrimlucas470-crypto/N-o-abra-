/**
 * A* na grade de navegação, pensado para muitos agentes no celular:
 *  - buffers reaproveitados (nenhuma alocação grande por busca);
 *  - limite de células expandidas por busca (orçamento);
 *  - sem caminho completo dentro do orçamento → devolve rota PARCIAL até a
 *    célula mais próxima do alvo (o zumbi se aproxima e tenta de novo);
 *  - rota encurtada por linha reta caminhável (sem zigue-zague de grade).
 */
import type { NavGrid } from './NavGrid';

export interface PathOptions {
  /** Máximo de células expandidas (padrão 6000 ≈ poucos ms). */
  maxExpanded?: number;
  /** Encurtar a rota com linhas retas (padrão true). */
  smooth?: boolean;
  /** Raio do corpo, para o encurtamento não raspar paredes. */
  agentRadius?: number;
}

export interface PathResult {
  /** Chegou exatamente ao alvo (ou à célula livre mais próxima dele). */
  found: boolean;
  /** Rota parcial: parou no orçamento e devolveu o melhor trecho. */
  partial: boolean;
  /** Pontos (px, centros de célula), do início (exclusivo) ao fim. */
  points: { x: number; y: number }[];
  expanded: number;
}

const SQRT2 = Math.SQRT2;
const DIRS: readonly (readonly [number, number, number])[] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2],
];

export class Pathfinder {
  private readonly g: Float32Array;
  private readonly parent: Int32Array;
  private readonly stamp: Uint32Array;
  private readonly closed: Uint32Array;
  private search = 0;
  private heap: number[] = [];
  private heapF: number[] = [];

  constructor(private readonly grid: NavGrid) {
    const n = grid.cols * grid.rows;
    this.g = new Float32Array(n);
    this.parent = new Int32Array(n);
    this.stamp = new Uint32Array(n);
    this.closed = new Uint32Array(n);
  }

  find(sx: number, sy: number, tx: number, ty: number, opts: PathOptions = {}): PathResult {
    const grid = this.grid;
    const cols = grid.cols;
    const maxExpanded = opts.maxExpanded ?? 6000;
    const empty = (found: boolean): PathResult => ({ found, partial: false, points: [], expanded: 0 });

    const s0 = grid.cellOf(sx, sy);
    const t0 = grid.cellOf(tx, ty);
    const s = grid.nearestWalkable(s0.cx, s0.cy, 2);
    const t = grid.nearestWalkable(t0.cx, t0.cy, 3);
    if (!s || !t) return empty(false);
    const start = s.cy * cols + s.cx;
    const goal = t.cy * cols + t.cx;
    if (start === goal) return empty(true);

    this.search++;
    if (this.search === 0xffffffff) {
      this.stamp.fill(0);
      this.closed.fill(0);
      this.search = 1;
    }
    const id = this.search;
    this.heap.length = 0;
    this.heapF.length = 0;

    const h = (i: number) => {
      const dx = Math.abs((i % cols) - t.cx);
      const dy = Math.abs(((i / cols) | 0) - t.cy);
      return dx + dy + (SQRT2 - 2) * Math.min(dx, dy);
    };

    this.stamp[start] = id;
    this.g[start] = 0;
    this.parent[start] = -1;
    this.push(start, h(start));
    let best = start;
    let bestH = h(start);
    let expanded = 0;

    while (this.heap.length > 0) {
      const cur = this.pop();
      if (this.closed[cur] === id) continue;
      this.closed[cur] = id;
      if (cur === goal) return this.build(cur, true, false, expanded, sx, sy, opts);
      if (++expanded > maxExpanded) break;
      const ccx = cur % cols;
      const ccy = (cur / cols) | 0;
      const gc = this.g[cur]!;
      for (const [dx, dy, cost] of DIRS) {
        const nx = ccx + dx;
        const ny = ccy + dy;
        if (grid.isBlocked(nx, ny)) continue;
        // diagonal só com as duas vizinhas ortogonais livres (não corta quina)
        if (dx !== 0 && dy !== 0 && (grid.isBlocked(ccx + dx, ccy) || grid.isBlocked(ccx, ccy + dy))) continue;
        const ni = ny * cols + nx;
        if (this.closed[ni] === id) continue;
        const ng = gc + cost;
        if (this.stamp[ni] === id && ng >= this.g[ni]!) continue;
        this.stamp[ni] = id;
        this.g[ni] = ng;
        this.parent[ni] = cur;
        const hn = h(ni);
        this.push(ni, ng + hn * 1.001);
        if (hn < bestH) {
          bestH = hn;
          best = ni;
        }
      }
    }
    // Orçamento estourado ou alvo inalcançável: melhor aproximação.
    if (best === start) return { found: false, partial: false, points: [], expanded };
    return this.build(best, false, true, expanded, sx, sy, opts);
  }

  private build(end: number, found: boolean, partial: boolean, expanded: number, sx: number, sy: number, opts: PathOptions): PathResult {
    const cols = this.grid.cols;
    const cells: number[] = [];
    for (let i = end; i !== -1; i = this.parent[i]!) cells.push(i);
    cells.reverse();
    let points = cells.slice(1).map((i) => this.grid.centerOf(i % cols, (i / cols) | 0));
    if (opts.smooth !== false) points = this.smooth(sx, sy, points, opts.agentRadius ?? 14);
    return { found, partial, points, expanded };
  }

  /** Remove pontos intermediários quando dá para ir em linha reta. */
  private smooth(sx: number, sy: number, pts: { x: number; y: number }[], radius: number): { x: number; y: number }[] {
    if (pts.length <= 1) return pts;
    const out: { x: number; y: number }[] = [];
    let ax = sx;
    let ay = sy;
    let i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !this.grid.lineWalkable(ax, ay, pts[j]!.x, pts[j]!.y, radius)) j--;
      const p = pts[j]!;
      out.push(p);
      ax = p.x;
      ay = p.y;
      i = j + 1;
    }
    return out;
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
