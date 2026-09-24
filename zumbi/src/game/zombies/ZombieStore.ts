/**
 * REGISTRO dos zumbis do mundo (vivos e corpos). Puro, sem Phaser.
 *
 * - Índice espacial em células de 128 px (vizinhança rápida para separação,
 *   ruído, visão de grupo, combate), atualizado quando alguém muda de célula.
 * - Save: cada zumbi guarda semente + arquétipo (a aparência nasce igual) e
 *   o que mudou: posição, estado, partes do corpo, casa, memória, morte.
 *   Ninguém é criado depois da geração inicial; corpos ficam onde caíram.
 */
import { ARCHETYPES } from './Archetypes';
import type { ZombieDifficulty } from './Difficulty';
import { createZombie } from './ZombieFactory';
import { applySave, saveZombie, type Zombie, type ZombieSave } from './Zombie';
import type { PopulationSpawn } from './Population';

const CELL = 128;

export interface ZombieStoreSave {
  v: 1;
  /** Dias desde o colapso usados na geração (aparência). */
  cd: number;
  list: ZombieSave[];
}

export class ZombieStore {
  readonly all: Zombie[] = [];
  private readonly byId = new Map<string, Zombie>();
  /** célula → zumbis (vivos e mortos). */
  private readonly cells = new Map<number, Zombie[]>();
  private readonly cellOf = new Map<Zombie, number>();
  private readonly cols: number;

  constructor(
    readonly widthPx: number,
    readonly heightPx: number,
  ) {
    this.cols = Math.ceil(widthPx / CELL) + 2;
  }

  get size(): number {
    return this.all.length;
  }

  aliveCount(): number {
    let n = 0;
    for (const z of this.all) if (!z.dead) n++;
    return n;
  }

  get(id: string): Zombie | null {
    return this.byId.get(id) ?? null;
  }

  private key(x: number, y: number): number {
    const cx = Math.max(-1, Math.min(this.cols - 2, Math.floor(x / CELL))) + 1;
    const cy = Math.floor(Math.max(-CELL, y) / CELL) + 1;
    return cy * this.cols + cx;
  }

  add(z: Zombie): void {
    if (this.byId.has(z.id)) return;
    this.all.push(z);
    this.byId.set(z.id, z);
    this.place(z);
  }

  /** Tira do mundo (corpo queimado/removido). */
  remove(id: string): void {
    const z = this.byId.get(id);
    if (!z) return;
    this.byId.delete(id);
    const i = this.all.indexOf(z);
    if (i >= 0) this.all.splice(i, 1);
    const k = this.cellOf.get(z);
    if (k !== undefined) {
      const list = this.cells.get(k);
      if (list) list.splice(list.indexOf(z), 1);
      this.cellOf.delete(z);
    }
  }

  private place(z: Zombie): void {
    const k = this.key(z.x, z.y);
    let list = this.cells.get(k);
    if (!list) {
      list = [];
      this.cells.set(k, list);
    }
    list.push(z);
    this.cellOf.set(z, k);
  }

  /** Avise depois de mover: troca de célula se precisar. */
  moved(z: Zombie): void {
    const k = this.key(z.x, z.y);
    const old = this.cellOf.get(z);
    if (old === k) return;
    if (old !== undefined) {
      const list = this.cells.get(old);
      if (list) {
        const i = list.indexOf(z);
        if (i >= 0) list.splice(i, 1);
      }
    }
    this.place(z);
  }

  /** Zumbis (vivos e mortos) a até `r` px. */
  near(x: number, y: number, r: number, out: Zombie[] = []): Zombie[] {
    out.length = 0;
    const r2 = r * r;
    const cx0 = Math.floor((x - r) / CELL);
    const cx1 = Math.floor((x + r) / CELL);
    const cy0 = Math.floor((y - r) / CELL);
    const cy1 = Math.floor((y + r) / CELL);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const list = this.cells.get(this.key(cx * CELL + 1, cy * CELL + 1));
        if (!list) continue;
        for (const z of list) if ((z.x - x) ** 2 + (z.y - y) ** 2 <= r2) out.push(z);
      }
    }
    return out;
  }

  /** Só os vivos. */
  aliveNear(x: number, y: number, r: number, out: Zombie[] = []): Zombie[] {
    this.near(x, y, r, out);
    let j = 0;
    for (let i = 0; i < out.length; i++) if (!out[i]!.dead) out[j++] = out[i]!;
    out.length = j;
    return out;
  }

  // ---------------------------------------------------------------- criação e save

  /** Cria a população inicial. */
  populate(spawns: readonly PopulationSpawn[], diff: ZombieDifficulty): void {
    for (const s of spawns) {
      const z = createZombie(s, diff);
      if (s.corpse) {
        z.dead = true;
        z.oldCorpse = true;
        z.deadAt = -1;
        z.corpseAngle = z.facing;
        z.mind.state = 'DEAD';
        z.parts.cabeca = 0;
      }
      this.add(z);
    }
  }

  serialize(collapseDays: number): ZombieStoreSave {
    return { v: 1, cd: collapseDays, list: this.all.map(saveZombie) };
  }

  /** Recria todos a partir do save (semente + mudanças). */
  restore(save: ZombieStoreSave, diff: ZombieDifficulty, now: number): boolean {
    if (!save || save.v !== 1 || !Array.isArray(save.list)) return false;
    for (const s of save.list) {
      if (!s || typeof s.i !== 'string' || !Number.isFinite(s.sd) || !ARCHETYPES[s.a]) continue;
      const z = createZombie({ id: s.i, seed: s.sd, arch: s.a, x: s.x, y: s.y, collapseDays: save.cd ?? 0 }, diff);
      applySave(z, s, now);
      this.add(z);
    }
    return true;
  }
}
