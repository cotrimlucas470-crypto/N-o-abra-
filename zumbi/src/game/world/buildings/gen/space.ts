/**
 * Espaço dentro de um cômodo (puro): retângulos em tiles locais, tamanho dos
 * objetos girados e a GRADE do cômodo que garante passagem.
 *
 * Em vez de testar a passagem a cada móvel (caro numa cidade inteira), o
 * gerador RESERVA antes o caminho entre as portas do cômodo (e a zona em
 * volta de cada porta): móvel nenhum pode cair ali. No fim, uma única
 * inundação a partir das portas diz o que ficou sem acesso (armário
 * encurralado sai).
 */
import { PROP_DEFS, type PropType } from '../../PropCatalog';

export interface LRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Margem entre a linha da parede e o móvel encostado (tiles). */
export const M = 0.13;
/** Raio do corpo (tiles): folga que o caminho precisa. */
export const BODY = 0.3;
/** Resolução da grade do cômodo (tiles). */
export const CELL = 0.25;

export function overlaps(a: LRect, b: LRect, pad = 0): boolean {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}

export function contains(r: LRect, x: number, y: number, pad = 0): boolean {
  return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
}

/** Tamanho (tiles) do objeto no giro (0/90/180/-90). */
export function propSize(type: PropType, angle: number): [number, number] {
  const d = PROP_DEFS[type];
  const w = d.width / 64;
  const h = d.height / 64;
  return Math.abs(angle) % 180 === 90 ? [h, w] : [w, h];
}

/** Distância de um ponto à borda de um retângulo (0 dentro). */
export function distToRect(r: LRect, x: number, y: number): number {
  const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
  const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/**
 * Grade de um cômodo: células livres para o corpo, reservadas (caminho) e
 * a inundação de acesso.
 */
export class RoomGrid {
  readonly cols: number;
  readonly rows: number;
  /** 1 = um corpo cabe com o centro aqui (longe da parede e dos móveis). */
  private readonly free: Uint8Array;
  /** 1 = reservado para passagem: nenhum móvel sólido encosta. */
  private readonly reserved: Uint8Array;

  constructor(readonly room: LRect) {
    this.cols = Math.max(1, Math.round(room.w / CELL));
    this.rows = Math.max(1, Math.round(room.h / CELL));
    this.free = new Uint8Array(this.cols * this.rows);
    this.reserved = new Uint8Array(this.cols * this.rows);
    const edge = M + BODY * 0.7;
    for (let j = 0; j < this.rows; j++) {
      for (let i = 0; i < this.cols; i++) {
        const [x, y] = this.center(i, j);
        if (x < room.x + edge || x > room.x + room.w - edge || y < room.y + edge || y > room.y + room.h - edge) continue;
        this.free[j * this.cols + i] = 1;
      }
    }
  }

  center(i: number, j: number): [number, number] {
    return [this.room.x + (i + 0.5) * CELL, this.room.y + (j + 0.5) * CELL];
  }

  /** Célula livre mais perto de um ponto (porta na borda), ou -1. */
  cellNear(x: number, y: number, maxDist = 1): number {
    let best = -1;
    let bd = maxDist * maxDist;
    for (let j = 0; j < this.rows; j++) {
      for (let i = 0; i < this.cols; i++) {
        if (!this.free[j * this.cols + i]) continue;
        const [cx, cy] = this.center(i, j);
        const d = (cx - x) ** 2 + (cy - y) ** 2;
        if (d < bd) {
          bd = d;
          best = j * this.cols + i;
        }
      }
    }
    return best;
  }

  /** Marca como ocupado o que o móvel tira do corpo (folga BODY). */
  block(box: LRect): void {
    const r = BODY;
    const i0 = Math.max(0, Math.floor((box.x - r - this.room.x) / CELL));
    const i1 = Math.min(this.cols - 1, Math.ceil((box.x + box.w + r - this.room.x) / CELL));
    const j0 = Math.max(0, Math.floor((box.y - r - this.room.y) / CELL));
    const j1 = Math.min(this.rows - 1, Math.ceil((box.y + box.h + r - this.room.y) / CELL));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const [x, y] = this.center(i, j);
        if (distToRect(box, x, y) < r) this.free[j * this.cols + i] = 0;
      }
    }
  }

  /** O móvel encostaria no que está reservado? */
  hitsReserved(box: LRect): boolean {
    const i0 = Math.max(0, Math.floor((box.x - BODY - this.room.x) / CELL));
    const i1 = Math.min(this.cols - 1, Math.ceil((box.x + box.w + BODY - this.room.x) / CELL));
    const j0 = Math.max(0, Math.floor((box.y - BODY - this.room.y) / CELL));
    const j1 = Math.min(this.rows - 1, Math.ceil((box.y + box.h + BODY - this.room.y) / CELL));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        if (!this.reserved[j * this.cols + i]) continue;
        const [x, y] = this.center(i, j);
        if (distToRect(box, x, y) < BODY) return true;
      }
    }
    return false;
  }

  /** Reserva um disco (zona da porta, ponto que precisa ficar livre). */
  reserveDisc(x: number, y: number, r: number): void {
    for (let j = 0; j < this.rows; j++) {
      for (let i = 0; i < this.cols; i++) {
        const [cx, cy] = this.center(i, j);
        if ((cx - x) ** 2 + (cy - y) ** 2 <= r * r) this.reserved[j * this.cols + i] = 1;
      }
    }
  }

  /**
   * Reserva o caminho (largo) entre dois pontos, pelas células livres (BFS).
   * Devolve false se não há caminho (cômodo estreito demais).
   */
  reservePath(ax: number, ay: number, bx: number, by: number, width = 0.42): boolean {
    const a = this.cellNear(ax, ay);
    const b = this.cellNear(bx, by);
    if (a < 0 || b < 0) return false;
    const prev = new Int32Array(this.cols * this.rows).fill(-2);
    prev[a] = -1;
    const queue = [a];
    for (let q = 0; q < queue.length; q++) {
      const c = queue[q]!;
      if (c === b) break;
      const i = c % this.cols;
      const j = (c - i) / this.cols;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= this.cols || nj >= this.rows) continue;
        const n = nj * this.cols + ni;
        if (!this.free[n] || prev[n] !== -2) continue;
        prev[n] = c;
        queue.push(n);
      }
    }
    if (prev[b] === -2) return false;
    const rc = Math.ceil(width / CELL);
    for (let c = b; c !== -1; c = prev[c]!) {
      const i = c % this.cols;
      const j = (c - i) / this.cols;
      for (let dj = -rc; dj <= rc; dj++) {
        for (let di = -rc; di <= rc; di++) {
          if (di * di + dj * dj > rc * rc) continue;
          const ni = i + di;
          const nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= this.cols || nj >= this.rows) continue;
          this.reserved[nj * this.cols + ni] = 1;
        }
      }
    }
    return true;
  }

  /** Inundação a partir dos pontos (portas): 1 = o corpo chega. */
  reach(from: readonly (readonly [number, number])[]): Uint8Array {
    const seen = new Uint8Array(this.cols * this.rows);
    const stack: number[] = [];
    for (const [x, y] of from) {
      const c = this.cellNear(x, y);
      if (c >= 0 && !seen[c]) {
        seen[c] = 1;
        stack.push(c);
      }
    }
    while (stack.length) {
      const c = stack.pop()!;
      const i = c % this.cols;
      const j = (c - i) / this.cols;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const ni = i + di;
        const nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= this.cols || nj >= this.rows) continue;
        const n = nj * this.cols + ni;
        if (!this.free[n] || seen[n]) continue;
        seen[n] = 1;
        stack.push(n);
      }
    }
    return seen;
  }

  /** Dá para chegar encostado neste móvel (alguma célula alcançada a até ~0,55 tile)? */
  accessible(box: LRect, reach: Uint8Array): boolean {
    const r = BODY + 0.3;
    const i0 = Math.max(0, Math.floor((box.x - r - this.room.x) / CELL));
    const i1 = Math.min(this.cols - 1, Math.ceil((box.x + box.w + r - this.room.x) / CELL));
    const j0 = Math.max(0, Math.floor((box.y - r - this.room.y) / CELL));
    const j1 = Math.min(this.rows - 1, Math.ceil((box.y + box.h + r - this.room.y) / CELL));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        if (!reach[j * this.cols + i]) continue;
        const [x, y] = this.center(i, j);
        if (distToRect(box, x, y) <= r) return true;
      }
    }
    return false;
  }
}
