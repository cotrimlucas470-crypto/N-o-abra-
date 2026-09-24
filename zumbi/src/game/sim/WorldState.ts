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
import type { DoorPlacement, PropPlacement, WallPiece } from '../world/MapTypes';
import { propSolids } from '../world/collision';
import type { WorldModel } from '../world/WorldModel';
import { CHUNK_PX, chunkKey, chunkKeyAt, chunkOf } from './ChunkGrid';
import { DEFAULT_LOOT, type LootSettings } from '../loot/generate';
import { LootSystem, type LootSave } from '../loot/LootSystem';
import type { HarvestDef } from '../nature/NatureCatalog';
import { DEFAULT_NATURE, NatureState, type NatureSave, type NatureSettings } from '../nature/NatureState';

export interface DoorState {
  open: boolean;
  locked: boolean;
  /** Arrombada/quebrada: fica aberta para sempre (sem folha). */
  broken?: boolean;
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
  | { type: 'nature'; id: string }
  /** Objeto do mapa danificado ou removido (quebrado, desmontado, cortado). */
  | { type: 'prop'; id: string; removed: boolean; x: number; y: number }
  | { type: 'window'; id: string; x: number; y: number };

export interface WorldStateOptions {
  loot?: LootSettings;
  nature?: NatureSettings;
}

export interface WorldStateSave {
  /** 1 = só portas e itens; 2 = + recipientes (loot). Save antigo continua valendo. */
  version: 1 | 2;
  /** Portas que diferem do estado inicial: id → [aberta, trancada, quebrada?]. */
  doors: Record<string, [0 | 1, 0 | 1] | [0 | 1, 0 | 1, 0 | 1]>;
  /** Objetos do mapa removidos e os danificados (id → resistência que sobrou). */
  props?: { removed: string[]; hp: Record<string, number> };
  /** Janelas quebradas (id) e as que tiveram os cacos tirados. */
  windows?: { broken: string[]; cleared: string[] };
  /** Resistência que sobrou nas portas atacadas. */
  doorHp?: Record<string, number>;
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
  private readonly removedProps = new Set<string>();
  private readonly propHp = new Map<string, number>();
  private propIndex: Map<string, number> | null = null;
  private readonly doorHp = new Map<string, number>();
  private readonly brokenWindows = new Set<string>();
  private readonly clearedWindows = new Set<string>();

  constructor(
    readonly model: WorldModel,
    opts: WorldStateOptions = {},
  ) {
    const map = model.map;
    const kindOf = new Map(map.buildings.map((b) => [b.id, b.kind]));
    this.defaults = map.doors.map((d) => {
      const kind = d.buildingId ? kindOf.get(d.buildingId) : undefined;
      const open = startsOpen(d, map.seed, kind);
      return { open, locked: !open && startsLocked(d, map.seed, kind) };
    });
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
          if (this.removedProps.has(p.id)) continue;
          const d = Math.hypot(p.x - x, p.y - y);
          if (d <= r) out.push({ prop: p, distance: d });
        }
      }
    }
    return out;
  }

  propById(id: string): PropPlacement | null {
    if (!this.propIndex) {
      this.propIndex = new Map();
      this.model.map.props.forEach((p, i) => this.propIndex!.set(p.id, i));
    }
    const i = this.propIndex.get(id);
    return i === undefined ? null : this.model.map.props[i]!;
  }

  isPropRemoved(id: string): boolean {
    return this.removedProps.has(id);
  }

  /** Resistência atual (ou `max` se nunca apanhou). */
  propHealth(id: string, max: number): number {
    return this.propHp.get(id) ?? max;
  }

  /** Bate no objeto. Devolve a resistência que sobrou (≤0 = quebrou; quem chama remove). */
  damageProp(id: string, amount: number, max: number): number {
    const hp = this.propHealth(id, max) - amount;
    this.propHp.set(id, hp);
    const p = this.propById(id);
    if (p) this.emit({ type: 'prop', id, removed: false, x: p.x, y: p.y });
    return hp;
  }

  /**
   * Tira o objeto do mundo (quebrado, desmontado, cortado, carregado).
   * Sai da navegação; o conteúdo dos recipientes dele é devolvido (quem chama larga no chão).
   */
  removeProp(id: string): { defId: string; count: number; st?: ItemState }[] {
    const p = this.propById(id);
    if (!p || this.removedProps.has(id)) return [];
    this.removedProps.add(id);
    this.propHp.delete(id);
    for (const s of propSolids(p)) this.model.nav.removeSolid(s);
    const contents = this.loot.removeForProp(id);
    this.emit({ type: 'prop', id, removed: true, x: p.x, y: p.y });
    return contents;
  }

  // ---------------------------------------------------------------- janelas

  /** Id estável de uma janela (peça de parede do tipo janela): centro. */
  static windowId(w: WallPiece): string {
    return `janela@${Math.round(w.x + w.w / 2)},${Math.round(w.y + w.h / 2)}`;
  }

  /** Janelas a até `r` px (borda). */
  windowsNear(x: number, y: number, r: number): { wall: WallPiece; id: string; distance: number }[] {
    const out: { wall: WallPiece; id: string; distance: number }[] = [];
    const map = this.model.map;
    for (const key of this.model.index.chunksAround(x, y)) {
      for (const i of this.model.index.get(key)?.walls ?? []) {
        const w = map.walls[i]!;
        if (w.kind !== 'window') continue;
        const d = Math.hypot(Math.max(w.x - x, 0, x - (w.x + w.w)), Math.max(w.y - y, 0, y - (w.y + w.h)));
        if (d <= r) out.push({ wall: w, id: WorldState.windowId(w), distance: d });
      }
    }
    return out;
  }

  isWindowBroken(id: string): boolean {
    return this.brokenWindows.has(id);
  }

  /** Quebrou: vira passagem para quem pula (com cuidado) e espalha cacos dos dois lados. */
  breakWindow(w: WallPiece): boolean {
    const id = WorldState.windowId(w);
    if (this.brokenWindows.has(id)) return false;
    this.brokenWindows.add(id);
    const cx = w.x + w.w / 2;
    const cy = w.y + w.h / 2;
    const vertical = w.h > w.w;
    this.addGlass(cx + (vertical ? 20 : 0), cy + (vertical ? 0 : 20));
    this.addGlass(cx - (vertical ? 20 : 0), cy - (vertical ? 0 : 20));
    this.emit({ type: 'window', id, x: cx, y: cy });
    return true;
  }

  /** Cacos presos no batente: pular corta. Tirar os cacos deixa seguro. */
  windowHasShards(id: string): boolean {
    return this.brokenWindows.has(id) && !this.clearedWindows.has(id);
  }

  clearWindowShards(id: string): void {
    if (this.brokenWindows.has(id)) this.clearedWindows.add(id);
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
    if (s.broken) return false;
    if (s.open === open || (open && s.locked)) return false;
    s.open = open;
    const d = this.model.map.doors[i]!;
    this.applyClosed(d, !open);
    this.emit({ type: 'door', door: d, state: s });
    return true;
  }

  /** Resistência da porta (madeira aguenta menos que metal; vidro, quase nada). */
  doorHealth(id: string): number {
    const d = this.doorById(id);
    const max = d ? (d.material === 'glass' ? 25 : d.material === 'metal' ? 260 : d.style === 'double' ? 110 : 80) : 0;
    return this.doorHp.get(id) ?? max;
  }

  /** Bate na porta fechada. Chegou a zero: quebra (fica aberta para sempre). */
  damageDoor(id: string, amount: number): number {
    const i = this.doorIndex.get(id);
    if (i === undefined) return 0;
    const s = this.doors[i]!;
    if (s.broken || s.open) return this.doorHealth(id);
    const hp = this.doorHealth(id) - amount;
    this.doorHp.set(id, hp);
    if (hp <= 0) this.breakDoor(id);
    return hp;
  }

  /** Arrombada ou quebrada: destranca, abre e não fecha mais. */
  breakDoor(id: string): void {
    const i = this.doorIndex.get(id);
    if (i === undefined) return;
    const s = this.doors[i]!;
    if (s.broken) return;
    const d = this.model.map.doors[i]!;
    if (!s.open) this.applyClosed(d, false);
    s.open = true;
    s.locked = false;
    s.broken = true;
    if (d.material === 'glass') this.addGlass(d.x, d.y);
    this.emit({ type: 'door', door: d, state: s });
  }

  /** Destranca (chave, pé de cabra). */
  unlockDoor(id: string): boolean {
    return this.setDoorLocked(id, false);
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
      if (s.broken) doors[d.id] = [1, 0, 1];
      else if (s.open !== def.open || s.locked !== def.locked) doors[d.id] = [s.open ? 1 : 0, s.locked ? 1 : 0];
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
    if (this.removedProps.size || this.propHp.size) out.props = { removed: [...this.removedProps], hp: Object.fromEntries(this.propHp) };
    if (this.brokenWindows.size) out.windows = { broken: [...this.brokenWindows], cleared: [...this.clearedWindows] };
    if (this.doorHp.size) out.doorHp = Object.fromEntries(this.doorHp);
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
    for (const [id, [open, locked, broken]] of Object.entries(save.doors ?? {})) {
      const i = this.doorIndex.get(id);
      if (i === undefined) continue;
      if (broken === 1) {
        this.breakDoor(id);
        continue;
      }
      this.setDoorLocked(id, false);
      this.setDoorOpen(id, open === 1);
      if (locked === 1) this.setDoorLocked(id, true);
    }
    for (const [id, hp] of Object.entries(save.doorHp ?? {})) if (this.doorIndex.has(id) && Number.isFinite(hp)) this.doorHp.set(id, hp);
    // Objetos removidos: tira da navegação e dos recipientes (o conteúdo já está nos itens soltos salvos).
    for (const id of save.props?.removed ?? []) {
      const p = this.propById(id);
      if (!p || this.removedProps.has(id)) continue;
      this.removedProps.add(id);
      for (const sd of propSolids(p)) this.model.nav.removeSolid(sd);
      this.loot.removeForProp(id, false);
    }
    for (const [id, hp] of Object.entries(save.props?.hp ?? {})) if (this.propById(id) && Number.isFinite(hp)) this.propHp.set(id, hp);
    for (const id of save.windows?.broken ?? []) this.brokenWindows.add(id);
    for (const id of save.windows?.cleared ?? []) this.clearedWindows.add(id);
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

/** Porta da rua fechada começa trancada? (nunca a base do jogador nem porta interna). */
function startsLocked(d: DoorPlacement, seed: number, kind: string | undefined): boolean {
  if (!d.exterior || !kind || DOOR_TUNING.alwaysClosedKinds.includes(kind)) return false;
  const chance = DOOR_TUNING.startLockedChance[kind] ?? 0;
  return hashString(`${seed}:tranca:${d.id}`) / 4294967296 < chance;
}

/** Estado inicial de uma porta: sorteio determinístico por semente + id. */
function startsOpen(d: DoorPlacement, seed: number, kind: string | undefined): boolean {
  if (kind && DOOR_TUNING.alwaysClosedKinds.includes(kind)) return false;
  const chance = d.style === 'rolling' ? DOOR_TUNING.startOpenChance.rolling : d.exterior ? DOOR_TUNING.startOpenChance.exterior : DOOR_TUNING.startOpenChance.interior;
  return hashString(`${seed}:${d.id}`) / 4294967296 < chance;
}
