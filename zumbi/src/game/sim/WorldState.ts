/**
 * ESTADO do mundo: o que muda durante a partida e vai para o save.
 * Puro, sem Phaser. O mapa (MapData) diz onde as coisas estão; este
 * módulo diz como elas estão agora: porta aberta/fechada/trancada, item
 * que foi pego, item largado no chão.
 *
 * - Porta fechada vira obstáculo na NavGrid (zumbi não passa) e, se não for
 *   de vidro, bloqueia a visão na SightGrid. Abrir remove os dois.
 * - Itens ficam por chunk (mesma chave do ChunkIndex): o desenho só cria os
 *   dos chunks carregados, e a IA/loot consultam só a vizinhança.
 * - O save guarda só o que difere do mapa gerado (portas mexidas, itens do
 *   mapa pegos) + os itens largados. Mapa determinístico + diferenças = mundo.
 *
 * Quem desenha (DoorViews/ItemViews) escuta `onChange`.
 */
import { DOOR_TUNING } from '../config/WorldTuning';
import { hashString } from '../core/Random';
import { itemDef } from '../items/ItemCatalog';
import { normalizeState, type ItemState } from '../items/condition';
import { doorGapRect } from '../world/doors';
import type { DoorPlacement, PropPlacement } from '../world/MapTypes';
import type { WorldModel } from '../world/WorldModel';
import { CHUNK_PX, chunkKey, chunkKeyAt, chunkOf } from './ChunkGrid';
import { DEFAULT_LOOT, type LootSettings } from '../loot/generate';
import { LootSystem, type LootSave } from '../loot/LootSystem';
import type { HarvestDef } from '../nature/NatureCatalog';
import { DEFAULT_NATURE, NatureState, type NatureSave, type NatureSettings } from '../nature/NatureState';

export interface DoorState {
  open: boolean;
  locked: boolean;
}

export interface WorldItem {
  id: string;
  defId: string;
  count: number;
  x: number;
  y: number;
  /** Estado do item (condição, validade...). Ausente = novo. */
  st?: ItemState;
}

export type WorldChange =
  | { type: 'door'; door: DoorPlacement; state: Readonly<DoorState> }
  | { type: 'items'; chunk: number }
  | { type: 'container'; id: string }
  | { type: 'nature'; id: string };

export interface WorldStateOptions {
  loot?: LootSettings;
  nature?: NatureSettings;
}

export interface WorldStateSave {
  /** 1 = só portas e itens; 2 = + recipientes (loot). Save antigo continua valendo. */
  version: 1 | 2;
  /** Portas que diferem do estado inicial: id → [aberta, trancada]. */
  doors: Record<string, [0 | 1, 0 | 1]>;
  /** Itens do mapa que mudaram: id → quantidade que sobrou (0 = pego). */
  mapItems: Record<string, number>;
  /** Itens que não vieram do mapa (largados pelo jogador etc.). */
  items: WorldItem[];
  nextItem: number;
  loot?: LootSave;
  nature?: NatureSave;
  /** Cacos de vidro em jogo e cacos do mapa já varridos. */
  glass?: { spots: { x: number; y: number }[]; cleared: string[] };
}

export class WorldState {
  private readonly doors: DoorState[];
  private readonly defaults: DoorState[];
  private readonly doorIndex = new Map<string, number>();
  private readonly items = new Map<number, Map<string, WorldItem>>();
  private readonly itemChunk = new Map<string, number>();
  /** Itens de base (colocados no mapa ou gerados no chão na criação): id → quantidade agora. */
  private readonly mapItemCount = new Map<string, number>();
  private readonly baseCount = new Map<string, number>();
  /** Recipientes do mapa e seu conteúdo (gerado ao abrir). */
  readonly loot: LootSystem;
  /** Árvores frutíferas e recursos do chão (quanto têm agora, quando repõem). */
  readonly nature: NatureState;
  private readonly listeners = new Set<(c: WorldChange) => void>();
  private nextItem = 1;

  constructor(
    readonly model: WorldModel,
    opts: WorldStateOptions = {},
  ) {
    const map = model.map;
    const kindOf = new Map(map.buildings.map((b) => [b.id, b.kind]));
    this.defaults = map.doors.map((d) => ({ open: startsOpen(d, map.seed, d.buildingId ? kindOf.get(d.buildingId) : undefined), locked: false }));
    this.doors = this.defaults.map((s) => ({ ...s }));
    map.doors.forEach((d, i) => {
      this.doorIndex.set(d.id, i);
      if (!this.doors[i]!.open) this.applyClosed(d, true);
    });
    this.loot = new LootSystem(model, map.seed, opts.loot ?? DEFAULT_LOOT);
    this.nature = new NatureState(map.seed, opts.nature ?? DEFAULT_NATURE);
    for (const it of [...map.items, ...this.loot.floorItems]) {
      if (!itemDef(it.defId)) continue;
      this.mapItemCount.set(it.id, it.count);
      this.baseCount.set(it.id, it.count);
      this.insertItem({ ...it });
    }
  }

  // ---------------------------------------------------------------- recipientes

  /** Abre um recipiente (gera o conteúdo na primeira vez). */
  openContainer(id: string) {
    const c = this.loot.open(id);
    if (c) this.emit({ type: 'container', id });
    return c;
  }

  /** Colhe de uma árvore/montinho; devolve quanto saiu. */
  harvest(id: string, def: HarvestDef, now: number, amount: number): number {
    const n = this.nature.harvest(id, def, now, amount);
    if (n > 0) this.emit({ type: 'nature', id });
    return n;
  }

  /** Avise depois de tirar/pôr algo: o recipiente passa a ser salvo. */
  containerChanged(id: string): void {
    this.loot.markTouched(id);
    this.emit({ type: 'container', id });
  }

  // ---------------------------------------------------------------- objetos do mapa

  /** Objetos do mapa a até `r` px do ponto (pela vizinhança de chunks). */
  propsNear(x: number, y: number, r: number): { prop: PropPlacement; distance: number }[] {
    const out: { prop: PropPlacement; distance: number }[] = [];
    const map = this.model.map;
    const { cx, cy } = chunkOf(x, y);
    const span = Math.max(1, Math.ceil(r / CHUNK_PX));
    for (let dy = -span; dy <= span; dy++) {
      for (let dx = -span; dx <= span; dx++) {
        for (const i of this.model.index.get(chunkKey(cx + dx, cy + dy))?.props ?? []) {
          const p = map.props[i]!;
          const d = Math.hypot(p.x - x, p.y - y);
          if (d <= r) out.push({ prop: p, distance: d });
        }
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- cacos de vidro

  /** Cacos espalhados em jogo (janela quebrada, garrafa): corta pé descalço. */
  private glassSpots: { x: number; y: number }[] = [];
  private readonly clearedGlass = new Set<string>();

  addGlass(x: number, y: number): void {
    this.glassSpots.push({ x: Math.round(x), y: Math.round(y) });
  }

  /** Tem caco a até `r` px? (decalque de vidro do mapa ou caco de jogo). */
  glassNear(x: number, y: number, r: number): { x: number; y: number; key: string } | null {
    for (const g of this.glassSpots) if (Math.hypot(g.x - x, g.y - y) <= r) return { ...g, key: `j:${g.x},${g.y}` };
    const map = this.model.map;
    for (const i of this.model.index.get(this.model.index.chunkOfPoint(x, y))?.decals ?? []) {
      const d = map.decals[i]!;
      if (d.type !== 'glass') continue;
      const key = `m:${Math.round(d.x)},${Math.round(d.y)}`;
      if (this.clearedGlass.has(key)) continue;
      if (Math.hypot(d.x - x, d.y - y) <= r + 18 * d.scale) return { x: d.x, y: d.y, key };
    }
    return null;
  }

  /** Varre/junta os cacos de um lugar. */
  clearGlass(key: string): void {
    if (key.startsWith('j:')) {
      const [x, y] = key.slice(2).split(',').map(Number);
      this.glassSpots = this.glassSpots.filter((g) => g.x !== x || g.y !== y);
    } else this.clearedGlass.add(key);
  }

  // ---------------------------------------------------------------- portas

  doorById(id: string): DoorPlacement | null {
    const i = this.doorIndex.get(id);
    return i === undefined ? null : this.model.map.doors[i]!;
  }

  doorState(id: string): Readonly<DoorState> | null {
    const i = this.doorIndex.get(id);
    return i === undefined ? null : this.doors[i]!;
  }

  /**
   * Abre ou fecha. Não confere quem está no vão (quem chama sabe dos corpos).
   * Devolve false se nada mudou (já estava assim, ou trancada ao tentar abrir).
   */
  setDoorOpen(id: string, open: boolean): boolean {
    const i = this.doorIndex.get(id);
    if (i === undefined) return false;
    const s = this.doors[i]!;
    if (s.open === open || (open && s.locked)) return false;
    s.open = open;
    const d = this.model.map.doors[i]!;
    this.applyClosed(d, !open);
    this.emit({ type: 'door', door: d, state: s });
    return true;
  }

  /** Trancar só vale para porta fechada. */
  setDoorLocked(id: string, locked: boolean): boolean {
    const i = this.doorIndex.get(id);
    if (i === undefined) return false;
    const s = this.doors[i]!;
    if (s.locked === locked || (locked && s.open)) return false;
    s.locked = locked;
    this.emit({ type: 'door', door: this.model.map.doors[i]!, state: s });
    return true;
  }

  /**
   * Alguma porta FECHADA corta o segmento A→B? Serve para o que a SightGrid
   * não pega: porta de vidro fechada deixa ver, mas não deixa passar a mão.
   * (Segmentos curtos: olha só os chunks das pontas e vizinhos.)
   */
  closedDoorBetween(ax: number, ay: number, bx: number, by: number): boolean {
    const map = this.model.map;
    const a = chunkOf(Math.min(ax, bx), Math.min(ay, by));
    const b = chunkOf(Math.max(ax, bx), Math.max(ay, by));
    for (let cy = a.cy - 1; cy <= b.cy + 1; cy++) {
      for (let cx = a.cx - 1; cx <= b.cx + 1; cx++) {
        for (const i of this.model.index.get(chunkKey(cx, cy))?.doors ?? []) {
          if (this.doors[i]!.open) continue;
          if (segmentHitsRect(ax, ay, bx, by, doorGapRect(map.doors[i]!))) return true;
        }
      }
    }
    return false;
  }

  /** Porta fechada: obstáculo para quem anda (NavGrid) e, se opaca, para quem olha (SightGrid). */
  private applyClosed(d: DoorPlacement, closed: boolean): void {
    const r = doorGapRect(d);
    const solid = { kind: 'rect' as const, ...r };
    if (closed) this.model.nav.addSolid(solid);
    else this.model.nav.removeSolid(solid);
    if (d.material === 'glass') return;
    if (closed) this.model.sight.addBlocker(r);
    else this.model.sight.removeBlocker(r);
  }

  // ---------------------------------------------------------------- itens

  private chunkFor(x: number, y: number): number {
    // Mesmo critério do ChunkIndex: item na borda vai para o chunk de borda.
    const w = this.model.widthPx;
    const h = this.model.heightPx;
    return chunkKeyAt(Math.min(Math.max(x, 0), w - 1), Math.min(Math.max(y, 0), h - 1));
  }

  private insertItem(it: WorldItem): void {
    const k = this.chunkFor(it.x, it.y);
    let m = this.items.get(k);
    if (!m) {
      m = new Map();
      this.items.set(k, m);
    }
    m.set(it.id, it);
    this.itemChunk.set(it.id, k);
  }

  itemsInChunk(key: number): WorldItem[] {
    const m = this.items.get(key);
    return m ? [...m.values()] : [];
  }

  itemById(id: string): WorldItem | null {
    const k = this.itemChunk.get(id);
    return k === undefined ? null : (this.items.get(k)?.get(id) ?? null);
  }

  /** Itens a até `r` px (r ≤ 1 chunk). */
  itemsNear(x: number, y: number, r: number): WorldItem[] {
    const out: WorldItem[] = [];
    const seen = new Set<number>();
    for (const [dx, dy] of [[-r, -r], [r, -r], [-r, r], [r, r], [0, 0]] as const) {
      const k = this.chunkFor(x + dx, y + dy);
      if (seen.has(k)) continue;
      seen.add(k);
      for (const it of this.items.get(k)?.values() ?? []) {
        if ((it.x - x) ** 2 + (it.y - y) ** 2 <= r * r) out.push(it);
      }
    }
    return out;
  }

  /** Retira até `count` unidades de um item do chão; devolve o que saiu. */
  takeItem(id: string, count = Infinity): { defId: string; count: number; st?: ItemState } | null {
    const k = this.itemChunk.get(id);
    if (k === undefined) return null;
    const m = this.items.get(k)!;
    const it = m.get(id)!;
    const n = Math.min(count, it.count);
    if (n <= 0) return null;
    it.count -= n;
    if (it.count <= 0) {
      m.delete(id);
      this.itemChunk.delete(id);
    }
    if (this.mapItemCount.has(id)) this.mapItemCount.set(id, it.count);
    this.emit({ type: 'items', chunk: k });
    return it.st ? { defId: it.defId, count: n, st: { ...it.st } } : { defId: it.defId, count: n };
  }

  /** Larga itens no chão. Nada aparece do nada: só entra no mundo o que alguém largou. */
  dropItem(defId: string, count: number, x: number, y: number, st?: ItemState): WorldItem | null {
    const def = itemDef(defId);
    if (!def || count <= 0) return null;
    const norm = normalizeState(def, st);
    const it: WorldItem = { id: `solto#${this.nextItem++}`, defId, count, x, y, ...(norm ? { st: norm } : {}) };
    this.insertItem(it);
    this.emit({ type: 'items', chunk: this.itemChunk.get(it.id)! });
    return it;
  }

  get itemCount(): number {
    return this.itemChunk.size;
  }

  // ---------------------------------------------------------------- eventos

  onChange(fn: (c: WorldChange) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(c: WorldChange): void {
    for (const fn of [...this.listeners]) fn(c);
  }

  // ---------------------------------------------------------------- save

  serialize(): WorldStateSave {
    const doors: WorldStateSave['doors'] = {};
    this.model.map.doors.forEach((d, i) => {
      const s = this.doors[i]!;
      const def = this.defaults[i]!;
      if (s.open !== def.open || s.locked !== def.locked) doors[d.id] = [s.open ? 1 : 0, s.locked ? 1 : 0];
    });
    const mapItems: WorldStateSave['mapItems'] = {};
    for (const [id, base] of this.baseCount) {
      const now = this.mapItemCount.get(id);
      if (now !== undefined && now !== base) mapItems[id] = now;
    }
    const items: WorldItem[] = [];
    for (const m of this.items.values()) for (const it of m.values()) if (!this.mapItemCount.has(it.id)) items.push({ ...it });
    const out: WorldStateSave = { version: 2, doors, mapItems, items, nextItem: this.nextItem, loot: this.loot.serialize(), nature: this.nature.serialize() };
    if (this.glassSpots.length || this.clearedGlass.size) out.glass = { spots: this.glassSpots.map((g) => ({ ...g })), cleared: [...this.clearedGlass] };
    return out;
  }

  /**
   * Aplica um save sobre o mundo recém-criado. Porta ou item que não existe
   * mais (mapa mudou de versão) é ignorado: save antigo não quebra o jogo.
   */
  restore(save: WorldStateSave): void {
    if (!save || (save.version !== 1 && save.version !== 2)) return;
    this.loot.restore(save.loot);
    this.nature.restore(save.nature);
    for (const [id, [open, locked]] of Object.entries(save.doors ?? {})) {
      const i = this.doorIndex.get(id);
      if (i === undefined) continue;
      this.setDoorLocked(id, false);
      this.setDoorOpen(id, open === 1);
      if (locked === 1) this.setDoorLocked(id, true);
    }
    for (const [id, count] of Object.entries(save.mapItems ?? {})) {
      const it = this.itemById(id);
      if (!it) continue;
      const remove = it.count - Math.max(0, count);
      if (remove > 0) this.takeItem(id, remove);
    }
    for (const it of save.items ?? []) {
      if (!itemDef(it.defId) || !(it.count > 0) || this.itemById(it.id)) continue;
      this.insertItem({ ...it });
      this.emit({ type: 'items', chunk: this.itemChunk.get(it.id)! });
    }
    this.nextItem = Math.max(this.nextItem, save.nextItem ?? 1);
    this.glassSpots = (save.glass?.spots ?? []).filter((g) => Number.isFinite(g.x) && Number.isFinite(g.y));
    for (const k of save.glass?.cleared ?? []) this.clearedGlass.add(k);
  }
}

/** Segmento × retângulo (Liang–Barsky). */
function segmentHitsRect(ax: number, ay: number, bx: number, by: number, r: { x: number; y: number; w: number; h: number }): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dy = by - ay;
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  return clip(-dx, ax - r.x) && clip(dx, r.x + r.w - ax) && clip(-dy, ay - r.y) && clip(dy, r.y + r.h - ay) && t0 <= t1;
}

/** Estado inicial de uma porta: sorteio determinístico por semente + id. */
function startsOpen(d: DoorPlacement, seed: number, kind: string | undefined): boolean {
  if (kind && DOOR_TUNING.alwaysClosedKinds.includes(kind)) return false;
  const chance = d.style === 'rolling' ? DOOR_TUNING.startOpenChance.rolling : d.exterior ? DOOR_TUNING.startOpenChance.exterior : DOOR_TUNING.startOpenChance.interior;
  return hashString(`${seed}:${d.id}`) / 4294967296 < chance;
}
