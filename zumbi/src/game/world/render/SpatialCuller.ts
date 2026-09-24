/**
 * Esconde objetos fora da tela (e um pouco além) para a GPU/CPU não
 * trabalharem à toa. Grade espacial: só olha as células perto da câmera,
 * então escala para mapas bem maiores (várias regiões) sem custo extra.
 */
export interface Cullable {
  setVisible(v: boolean): unknown;
}

export interface CullEntry {
  obj: Cullable;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface ViewRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class SpatialCuller {
  private cells = new Map<number, CullEntry[]>();
  private shown = new Set<CullEntry>();
  private last = { x: Number.NaN, y: Number.NaN, w: 0, h: 0 };
  private total = 0;

  constructor(
    private readonly cellSize = 512,
    /** Folga além da borda da tela (px): objetos aparecem antes de entrar em cena. */
    private readonly margin = 192,
  ) {}

  /** Registra um objeto pela sua caixa (px de mundo). Começa escondido até o primeiro update. */
  add(obj: Cullable, x0: number, y0: number, x1: number, y1: number): CullEntry {
    const e: CullEntry = { obj, x0: Math.min(x0, x1), y0: Math.min(y0, y1), x1: Math.max(x0, x1), y1: Math.max(y0, y1) };
    const cs = this.cellSize;
    for (let cy = Math.floor(e.y0 / cs); cy <= Math.floor(e.y1 / cs); cy++) {
      for (let cx = Math.floor(e.x0 / cs); cx <= Math.floor(e.x1 / cs); cx++) {
        const k = key(cx, cy);
        let list = this.cells.get(k);
        if (!list) {
          list = [];
          this.cells.set(k, list);
        }
        list.push(e);
      }
    }
    obj.setVisible(false);
    this.total++;
    // Objeto novo dentro da área visível aparece já no próximo update.
    this.last.x = Number.NaN;
    return e;
  }

  /** Tira um objeto do recorte (ele será destruído junto com o chunk). */
  remove(e: CullEntry): void {
    const cs = this.cellSize;
    for (let cy = Math.floor(e.y0 / cs); cy <= Math.floor(e.y1 / cs); cy++) {
      for (let cx = Math.floor(e.x0 / cs); cx <= Math.floor(e.x1 / cs); cx++) {
        const k = key(cx, cy);
        const list = this.cells.get(k);
        if (!list) continue;
        const i = list.indexOf(e);
        if (i >= 0) {
          list[i] = list[list.length - 1]!;
          list.pop();
        }
        if (list.length === 0) this.cells.delete(k);
      }
    }
    this.shown.delete(e);
    this.total--;
  }

  /** Registra pelo centro + meia-dimensão (objetos girados: use o raio que cobre a diagonal). */
  addCentered(obj: Cullable, x: number, y: number, halfW: number, halfH: number): CullEntry {
    return this.add(obj, x - halfW, y - halfH, x + halfW, y + halfH);
  }

  update(view: ViewRect, force = false): void {
    const l = this.last;
    if (!force && Math.abs(view.x - l.x) < 24 && Math.abs(view.y - l.y) < 24 && view.width === l.w && view.height === l.h) return;
    this.last = { x: view.x, y: view.y, w: view.width, h: view.height };

    const m = this.margin;
    const vx0 = view.x - m;
    const vy0 = view.y - m;
    const vx1 = view.x + view.width + m;
    const vy1 = view.y + view.height + m;
    const cs = this.cellSize;
    const next = new Set<CullEntry>();
    for (let cy = Math.floor(vy0 / cs); cy <= Math.floor(vy1 / cs); cy++) {
      for (let cx = Math.floor(vx0 / cs); cx <= Math.floor(vx1 / cs); cx++) {
        const list = this.cells.get(key(cx, cy));
        if (!list) continue;
        for (const e of list) {
          if (e.x1 >= vx0 && e.x0 <= vx1 && e.y1 >= vy0 && e.y0 <= vy1) next.add(e);
        }
      }
    }
    for (const e of this.shown) if (!next.has(e)) e.obj.setVisible(false);
    for (const e of next) if (!this.shown.has(e)) e.obj.setVisible(true);
    this.shown = next;
  }

  stats(): { total: number; visible: number } {
    return { total: this.total, visible: this.shown.size };
  }
}

function key(cx: number, cy: number): number {
  // Mapas de até ~32 mil células por eixo: suficiente para muitas regiões.
  return (cy + 16384) * 32768 + (cx + 16384);
}
