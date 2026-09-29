/**
 * MORADIA E MARCADORES do jogador (puro, vai no save):
 * - a moradia é onde o jogador escolheu morar (qualquer ponto; trocar ou
 *   remover a qualquer hora). Nada de base obrigatória;
 * - marcadores com nome e categoria (esconderijo, perigo, comida...);
 * - o alvo selecionado (bússola na tela: direção e distância);
 * - as áreas já exploradas (o mapa escurece o resto), em células de
 *   EXPLORE_CELL tiles, guardadas como bits.
 */
import { MAP_TUNING as T } from '../config/MapTuning';

export type MarkCat = 'moradia' | 'esconderijo' | 'marcador' | 'casaSegura' | 'perigo' | 'comida' | 'carro' | 'hospital' | 'retorno';

export const MARK_CATS: readonly { id: MarkCat; label: string; color: number }[] = [
  { id: 'marcador', label: 'Marcador', color: 0xe0a84a },
  { id: 'esconderijo', label: 'Esconderijo', color: 0xb98a5a },
  { id: 'casaSegura', label: 'Casa segura', color: 0x7fbf7a },
  { id: 'perigo', label: 'Área perigosa', color: 0xd0453a },
  { id: 'comida', label: 'Estoque de comida', color: 0x9ccf6a },
  { id: 'carro', label: 'Carro', color: 0x8fb3d9 },
  { id: 'hospital', label: 'Hospital', color: 0xf0f0f0 },
  { id: 'retorno', label: 'Voltar aqui', color: 0xc9a0e0 },
];

export interface Mark {
  id: number;
  x: number;
  y: number;
  name: string;
  cat: MarkCat;
}

export interface PlayerMarksSave {
  home: { x: number; y: number; name: string } | null;
  marks: Mark[];
  /** 0 = moradia; >0 = marcador; null = nenhum. */
  target: number | null;
  next: number;
  /** Bits das células exploradas (base64). */
  explored: string;
}

/** Distância em metros (1 tile = 64 px ≈ 1,3 m). */
export function meters(ax: number, ay: number, bx: number, by: number): number {
  return (Math.hypot(bx - ax, by - ay) / 64) * 1.3;
}

export function metersLabel(m: number): string {
  return m < 1000 ? `${Math.round(m / 5) * 5} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

/** Rumo (N, NE, L...) de A para B (y cresce para o sul). */
export function compass(ax: number, ay: number, bx: number, by: number): string {
  const a = Math.atan2(by - ay, bx - ax);
  const names = ['L', 'SE', 'S', 'SO', 'O', 'NO', 'N', 'NE'];
  return names[((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8]!;
}

export class PlayerMarks {
  home: { x: number; y: number; name: string } | null = null;
  marks: Mark[] = [];
  target: number | null = null;
  private next = 1;
  readonly cols: number;
  readonly rows: number;
  private readonly bits: Uint8Array;
  /** Mudou o explorado desde a última leitura (o mapa redesenha a névoa). */
  exploredVersion = 0;

  constructor(
    widthTiles: number,
    heightTiles: number,
    private readonly tileSize = 64,
  ) {
    this.cols = Math.ceil(widthTiles / T.exploreCell);
    this.rows = Math.ceil(heightTiles / T.exploreCell);
    this.bits = new Uint8Array(Math.ceil((this.cols * this.rows) / 8));
  }

  // ---------------------------------------------------------------- moradia e marcadores

  setHome(x: number, y: number, name = 'Moradia'): void {
    this.home = { x, y, name };
    if (this.target === null) this.target = 0;
  }

  clearHome(): void {
    this.home = null;
    if (this.target === 0) this.target = null;
  }

  add(x: number, y: number, name: string, cat: MarkCat): Mark {
    const m: Mark = { id: this.next++, x, y, name: name.trim().slice(0, T.nameMax) || 'Marcador', cat };
    this.marks.push(m);
    return m;
  }

  edit(id: number, o: { name?: string; cat?: MarkCat }): boolean {
    const m = this.marks.find((x) => x.id === id);
    if (!m) return false;
    if (o.name !== undefined) m.name = o.name.trim().slice(0, T.nameMax) || m.name;
    if (o.cat) m.cat = o.cat;
    return true;
  }

  remove(id: number): boolean {
    const i = this.marks.findIndex((x) => x.id === id);
    if (i < 0) return false;
    this.marks.splice(i, 1);
    if (this.target === id) this.target = this.home ? 0 : null;
    return true;
  }

  /** Marcador (ou moradia) mais perto de um ponto, dentro de `r` px. */
  near(x: number, y: number, r: number): { kind: 'home' } | { kind: 'mark'; mark: Mark } | null {
    let best: { kind: 'home' } | { kind: 'mark'; mark: Mark } | null = null;
    let bd = r;
    if (this.home) {
      const d = Math.hypot(this.home.x - x, this.home.y - y);
      if (d <= bd) {
        bd = d;
        best = { kind: 'home' };
      }
    }
    for (const m of this.marks) {
      const d = Math.hypot(m.x - x, m.y - y);
      if (d <= bd) {
        bd = d;
        best = { kind: 'mark', mark: m };
      }
    }
    return best;
  }

  /** O alvo da bússola: moradia (0), um marcador ou nada. */
  targetPoint(): { x: number; y: number; name: string; cat: MarkCat } | null {
    if (this.target === 0) return this.home ? { ...this.home, cat: 'moradia' } : null;
    const m = this.marks.find((x) => x.id === this.target);
    return m ? { x: m.x, y: m.y, name: m.name, cat: m.cat } : null;
  }

  // ---------------------------------------------------------------- explorado

  /** Marca como visto o que está num raio (px) em volta. Devolve se mudou algo. */
  explore(x: number, y: number, radius: number): boolean {
    const cellPx = T.exploreCell * this.tileSize;
    const r = Math.ceil(radius / cellPx);
    const cx = Math.floor(x / cellPx);
    const cy = Math.floor(y / cellPx);
    let changed = false;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r + 1) continue;
        const gx = cx + dx;
        const gy = cy + dy;
        if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) continue;
        const i = gy * this.cols + gx;
        const b = 1 << (i & 7);
        if (!(this.bits[i >> 3]! & b)) {
          this.bits[i >> 3] = this.bits[i >> 3]! | b;
          changed = true;
        }
      }
    }
    if (changed) this.exploredVersion++;
    return changed;
  }

  explored(gx: number, gy: number): boolean {
    if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) return false;
    const i = gy * this.cols + gx;
    return (this.bits[i >> 3]! & (1 << (i & 7))) !== 0;
  }

  /** Fração explorada da cidade (0..1). */
  get exploredFraction(): number {
    let n = 0;
    for (let i = 0; i < this.cols * this.rows; i++) if (this.bits[i >> 3]! & (1 << (i & 7))) n++;
    return n / (this.cols * this.rows);
  }

  // ---------------------------------------------------------------- save

  serialize(): PlayerMarksSave {
    let bin = '';
    for (const b of this.bits) bin += String.fromCharCode(b);
    return { home: this.home ? { ...this.home } : null, marks: this.marks.map((m) => ({ ...m })), target: this.target, next: this.next, explored: btoa(bin) };
  }

  restore(s: Partial<PlayerMarksSave> | undefined): void {
    if (!s) return;
    const ok = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
    this.home = s.home && ok(s.home.x) && ok(s.home.y) ? { x: s.home.x, y: s.home.y, name: String(s.home.name ?? 'Moradia') } : null;
    this.marks = Array.isArray(s.marks) ? s.marks.filter((m) => m && ok(m.x) && ok(m.y) && ok(m.id)).map((m) => ({ id: m.id, x: m.x, y: m.y, name: String(m.name).slice(0, T.nameMax), cat: MARK_CATS.some((c) => c.id === m.cat) ? m.cat : 'marcador' })) : [];
    this.next = ok(s.next) ? Math.max(s.next!, ...this.marks.map((m) => m.id + 1), 1) : Math.max(1, ...this.marks.map((m) => m.id + 1));
    this.target = s.target === null || s.target === undefined ? null : s.target === 0 ? (this.home ? 0 : null) : this.marks.some((m) => m.id === s.target) ? s.target : null;
    if (typeof s.explored === 'string') {
      try {
        const bin = atob(s.explored);
        for (let i = 0; i < Math.min(bin.length, this.bits.length); i++) this.bits[i] = bin.charCodeAt(i);
        this.exploredVersion++;
      } catch {
        /* save antigo ou corrompido: começa sem explorado */
      }
    }
  }
}
