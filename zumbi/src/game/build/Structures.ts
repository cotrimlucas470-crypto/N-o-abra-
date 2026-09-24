/**
 * ESTRUTURAS construídas pelo jogador (fogueira, parede, móvel, canteiro...).
 * Puro, sem Phaser. Diferente dos objetos do mapa, estas nascem e somem em
 * jogo, então o save guarda a lista inteira (é pequena: o que o jogador fez).
 *
 * Indexadas por chunk (mesma chave do ChunkIndex): o desenho só cria as dos
 * chunks carregados e as consultas olham só a vizinhança.
 */
import { chunkKeyAt } from '../sim/ChunkGrid';
import { STRUCTURE_DEFS, isStructureType, type StructureType } from './StructureCatalog';

export interface Structure {
  id: string;
  type: StructureType;
  /** Centro, em px de mundo. */
  x: number;
  y: number;
  /** Giro em quartos de volta (0..3). */
  rot: number;
  /** Resistência que sobrou. */
  hp: number;
  /** Fogo: aceso, minutos de lenha que sobravam no minuto `at` do relógio. */
  lit?: 1;
  fuel?: number;
  at?: number;
  /** Coletor/balde: doses de água e se está suja. */
  water?: number;
  dirty?: 1;
  /** Porta construída: aberta/trancada. */
  open?: 1;
  locked?: 1;
  /** Canteiro: o que foi plantado, quando, última rega (minutos do relógio) e adubo. */
  crop?: { seed: string; planted: number; growth: number; watered: number; fert?: 1; dead?: 1 };
  /** Material usado (parede de madeira, tijolo, metal): muda desenho e resistência. */
  mat?: string;
  /** Comprimento próprio (tábuas pregadas do tamanho da janela/porta). */
  len?: number;
  /** Onde foi pregada (janela ou porta do mapa). */
  on?: string;
  /** Minuto do relógio da última conta (água, horta). */
  tickAt?: number;
}

export interface StructuresSave {
  next: number;
  list: Structure[];
}

export type StructureChange = { s: Structure; removed: boolean };

export class Structures {
  private readonly all = new Map<string, Structure>();
  private readonly byChunk = new Map<number, Set<string>>();
  private readonly listeners = new Set<(c: StructureChange) => void>();
  private next = 1;

  constructor(
    private readonly widthPx: number,
    private readonly heightPx: number,
  ) {}

  get count(): number {
    return this.all.size;
  }

  private chunkFor(x: number, y: number): number {
    return chunkKeyAt(Math.min(Math.max(x, 0), this.widthPx - 1), Math.min(Math.max(y, 0), this.heightPx - 1));
  }

  add(type: StructureType, x: number, y: number, rot = 0, extra: Partial<Structure> = {}): Structure {
    const def = STRUCTURE_DEFS[type];
    const s: Structure = { ...extra, id: `e${this.next++}`, type, x: Math.round(x), y: Math.round(y), rot: ((Math.round(rot) % 4) + 4) % 4, hp: extra.hp ?? def.hp };
    this.insert(s);
    this.emit({ s, removed: false });
    return s;
  }

  private insert(s: Structure): void {
    this.all.set(s.id, s);
    const k = this.chunkFor(s.x, s.y);
    let set = this.byChunk.get(k);
    if (!set) this.byChunk.set(k, (set = new Set()));
    set.add(s.id);
  }

  remove(id: string): Structure | null {
    const s = this.all.get(id);
    if (!s) return null;
    this.all.delete(id);
    this.byChunk.get(this.chunkFor(s.x, s.y))?.delete(id);
    this.emit({ s, removed: true });
    return s;
  }

  get(id: string): Structure | null {
    return this.all.get(id) ?? null;
  }

  /** Avisa quem desenha que a estrutura mudou (acendeu, abriu, cresceu). */
  changed(s: Structure): void {
    if (this.all.has(s.id)) this.emit({ s, removed: false });
  }

  inChunk(key: number): Structure[] {
    const set = this.byChunk.get(key);
    if (!set) return [];
    const out: Structure[] = [];
    for (const id of set) {
      const s = this.all.get(id);
      if (s) out.push(s);
    }
    return out;
  }

  /** Estruturas com centro a até `r` px (r ≤ 1 chunk, mais o tamanho da peça). */
  near(x: number, y: number, r: number): Structure[] {
    const out: Structure[] = [];
    const seen = new Set<number>();
    const pad = r + 160;
    for (const [dx, dy] of [[-pad, -pad], [pad, -pad], [-pad, pad], [pad, pad], [0, 0], [0, -pad], [0, pad], [-pad, 0], [pad, 0]] as const) {
      const k = this.chunkFor(x + dx, y + dy);
      if (seen.has(k)) continue;
      seen.add(k);
      for (const id of this.byChunk.get(k) ?? []) {
        const s = this.all.get(id)!;
        if ((s.x - x) ** 2 + (s.y - y) ** 2 <= r * r) out.push(s);
      }
    }
    return out;
  }

  *list(type?: StructureType): Generator<Structure> {
    for (const s of this.all.values()) if (!type || s.type === type) yield s;
  }

  onChange(fn: (c: StructureChange) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(c: StructureChange): void {
    for (const fn of [...this.listeners]) fn(c);
  }

  serialize(): StructuresSave {
    return { next: this.next, list: [...this.all.values()].map((s) => structuredClone(s)) };
  }

  /** Restaura. Tipo que não existe mais é ignorado (save antigo não quebra). */
  restore(save: StructuresSave | undefined): void {
    if (!save) return;
    for (const s of save.list ?? []) {
      if (!s || !isStructureType(s.type) || !Number.isFinite(s.x) || !Number.isFinite(s.y) || this.all.has(s.id)) continue;
      this.insert({ ...s, rot: ((Math.round(s.rot ?? 0) % 4) + 4) % 4, hp: Number.isFinite(s.hp) ? s.hp : STRUCTURE_DEFS[s.type].hp });
      this.emit({ s: this.all.get(s.id)!, removed: false });
    }
    this.next = Math.max(this.next, Math.round(save.next ?? 1));
  }
}
