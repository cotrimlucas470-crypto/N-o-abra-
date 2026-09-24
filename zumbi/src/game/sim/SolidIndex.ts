/**
 * ÍNDICE DE SÓLIDOS (puro): a geometria EXATA de colisão do mundo, igual à
 * que o jogador sente na física — paredes (com os vãos abertos), objetos do
 * mapa que não foram removidos, portas fechadas e construções sólidas —
 * guardada em células de 1 tile para consulta rápida.
 *
 * Serve para quem se move FORA da física do Phaser: zumbis (em qualquer
 * distância, carregado ou não) e o carro dirigido. Montado sob demanda por
 * chunk e refeito quando algo muda ali (porta abre, parede cai, móvel quebra,
 * construção nasce).
 */
import { CHUNK_PX, chunkKey, chunkOf } from './ChunkGrid';
import type { WorldState } from './WorldState';
import { circleHitsSolid, propSolids, type Solid } from '../world/collision';
import { doorGapRect } from '../world/doors';
import { solidOf } from '../build/StructureGeometry';
import { STRUCTURE_DEFS } from '../build/StructureCatalog';

const CELL = 64;
const PER = CHUNK_PX / CELL;

/** Sólido com a origem (para saber em que se bateu). */
export interface TaggedSolid {
  s: Solid;
  kind: 'wall' | 'window' | 'prop' | 'door' | 'structure';
  id: string;
}

export class SolidIndex {
  /** chunk → células (PER×PER) com os sólidos que as tocam. */
  private readonly chunks = new Map<number, TaggedSolid[][]>();
  private readonly cols: number;
  private readonly rows: number;

  constructor(private readonly state: WorldState) {
    this.cols = Math.ceil(state.model.widthPx / CHUNK_PX);
    this.rows = Math.ceil(state.model.heightPx / CHUNK_PX);
    state.onChange((c) => {
      if (c.type === 'door') this.invalidateAt(c.door.x, c.door.y);
      else if (c.type === 'prop' && c.removed) this.invalidateAt(c.x, c.y);
      else if (c.type === 'wall') this.invalidateAt(c.x, c.y, 2);
    });
    state.structures.onChange(({ s }) => {
      if (STRUCTURE_DEFS[s.type].solid) this.invalidateAt(s.x, s.y);
    });
  }

  /** Esquece os chunks em volta de um ponto (serão remontados na próxima consulta). */
  invalidateAt(x: number, y: number, span = 1): void {
    const { cx, cy } = chunkOf(x, y);
    for (let dy = -span; dy <= span; dy++) for (let dx = -span; dx <= span; dx++) this.chunks.delete(chunkKey(cx + dx, cy + dy));
  }

  private build(cx: number, cy: number): TaggedSolid[][] {
    const cells: TaggedSolid[][] = Array.from({ length: PER * PER }, () => []);
    const ox = cx * CHUNK_PX;
    const oy = cy * CHUNK_PX;
    const put = (t: TaggedSolid) => {
      const s = t.s;
      const [x0, y0, x1, y1] = s.kind === 'rect' ? [s.x, s.y, s.x + s.w, s.y + s.h] : [s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r];
      const i0 = Math.max(0, Math.floor((x0 - ox) / CELL));
      const j0 = Math.max(0, Math.floor((y0 - oy) / CELL));
      const i1 = Math.min(PER - 1, Math.floor((x1 - ox) / CELL));
      const j1 = Math.min(PER - 1, Math.floor((y1 - oy) / CELL));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) cells[j * PER + i]!.push(t);
    };
    const st = this.state;
    const model = st.model;
    const map = model.map;
    // Conteúdo do mapa pertence ao chunk do CENTRO: olha os vizinhos também.
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const c = model.index.get(chunkKey(cx + dx, cy + dy));
        if (!c) continue;
        for (const i of c.walls) {
          const w = map.walls[i]!;
          const kind = w.kind === 'window' ? 'window' : 'wall';
          for (const p of st.wallPieces(i)) put({ s: { kind: 'rect', x: p.x, y: p.y, w: p.w, h: p.h }, kind, id: String(i) });
        }
        for (const i of c.props) {
          const p = map.props[i]!;
          if (st.isPropRemoved(p.id)) continue;
          for (const s of propSolids(p)) put({ s, kind: 'prop', id: p.id });
        }
        for (const i of c.doors) {
          const d = map.doors[i]!;
          const ds = st.doorState(d.id);
          if (!ds || ds.open) continue;
          put({ s: { kind: 'rect', ...doorGapRect(d) }, kind: 'door', id: d.id });
        }
      }
    }
    for (const s of st.structures.near(ox + CHUNK_PX / 2, oy + CHUNK_PX / 2, CHUNK_PX)) {
      if (!STRUCTURE_DEFS[s.type].solid) continue;
      const sol = solidOf(s);
      if (sol) put({ s: sol, kind: 'structure', id: s.id });
    }
    return cells;
  }

  private cellsOf(cx: number, cy: number): TaggedSolid[][] | null {
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return null;
    const k = chunkKey(cx, cy);
    let c = this.chunks.get(k);
    if (!c) {
      c = this.build(cx, cy);
      this.chunks.set(k, c);
    }
    return c;
  }

  /** Sólidos que tocam o quadrado (x±r, y±r). Pode repetir (quem usa não se importa). */
  query(x: number, y: number, r: number, out: TaggedSolid[] = []): TaggedSolid[] {
    out.length = 0;
    const gx0 = Math.floor((x - r) / CELL);
    const gy0 = Math.floor((y - r) / CELL);
    const gx1 = Math.floor((x + r) / CELL);
    const gy1 = Math.floor((y + r) / CELL);
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const cx = Math.floor(gx / PER);
        const cy = Math.floor(gy / PER);
        const cells = this.cellsOf(cx, cy);
        if (!cells) continue;
        const list = cells[(gy - cy * PER) * PER + (gx - cx * PER)]!;
        for (const t of list) out.push(t);
      }
    }
    return out;
  }

  /** Um círculo cabe aqui? */
  free(x: number, y: number, r: number): boolean {
    for (const t of this.query(x, y, r, this.scratch)) if (circleHitsSolid(x, y, r, t.s)) return false;
    return true;
  }

  private readonly scratch: TaggedSolid[] = [];

  /**
   * Empurra um círculo para fora dos sólidos (2 passadas). Devolve em que
   * bateu por último (ou null) e a posição corrigida em `p`.
   */
  resolve(p: { x: number; y: number }, r: number): TaggedSolid | null {
    let hit: TaggedSolid | null = null;
    for (let pass = 0; pass < 2; pass++) {
      let moved = false;
      for (const t of this.query(p.x, p.y, r + 2, this.scratch)) {
        const s = t.s;
        if (s.kind === 'rect') {
          const nx = Math.max(s.x, Math.min(p.x, s.x + s.w));
          const ny = Math.max(s.y, Math.min(p.y, s.y + s.h));
          let dx = p.x - nx;
          let dy = p.y - ny;
          let d2 = dx * dx + dy * dy;
          if (d2 >= r * r) continue;
          if (d2 < 1e-6) {
            // Centro dentro do retângulo: sai pelo lado mais perto.
            const l = p.x - s.x;
            const rt = s.x + s.w - p.x;
            const tp = p.y - s.y;
            const bt = s.y + s.h - p.y;
            const m = Math.min(l, rt, tp, bt);
            if (m === l) p.x = s.x - r;
            else if (m === rt) p.x = s.x + s.w + r;
            else if (m === tp) p.y = s.y - r;
            else p.y = s.y + s.h + r;
          } else {
            const d = Math.sqrt(d2);
            dx /= d;
            dy /= d;
            p.x = nx + dx * r;
            p.y = ny + dy * r;
          }
          d2 = 0;
          hit = t;
          moved = true;
        } else {
          const dx = p.x - s.x;
          const dy = p.y - s.y;
          const rr = r + s.r;
          const d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr) continue;
          const d = Math.sqrt(d2) || 1e-3;
          p.x = s.x + (dx / d) * rr;
          p.y = s.y + (dy / d) * rr;
          hit = t;
          moved = true;
        }
      }
      if (!moved) break;
    }
    return hit;
  }
}
