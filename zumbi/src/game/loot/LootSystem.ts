/**
 * Loot do mundo: onde estão os recipientes, o que há dentro e o que já foi
 * mexido. Puro, sem Phaser.
 *
 * - Os recipientes vêm dos objetos do mapa (PROP_CONTAINERS) e ganham uma
 *   tabela pelo contexto (construção, cômodo, zona).
 * - O conteúdo é gerado na PRIMEIRA vez que alguém abre (preguiçoso) e com
 *   semente própria (cidade + id): abrir, sair e voltar mostra o mesmo.
 * - Recipiente mexido vai inteiro para o save; o resto se recria igual.
 * - Itens soltos no chão dos cômodos são gerados uma vez, na criação do mundo.
 * - Nada se reabastece com o tempo: o que é pego acabou.
 */
import { hashString, Random } from '../core/Random';
import { normalizeState, type ItemState } from '../items/condition';
import { itemDef } from '../items/ItemCatalog';
import { ItemContainer, type ItemStack } from '../items/ItemContainer';
import { propSolids } from '../world/collision';
import { distToRect } from '../world/doors';
import type { Rect } from '../world/MapTypes';
import type { WorldModel } from '../world/WorldModel';
import { CONTAINER_DEFS, PROP_CONTAINERS } from './containers';
import { DEFAULT_LOOT, generateLoot, type LootSettings } from './generate';
import type { ContainerKind } from './LootTypes';
import { contextAt, tableFor } from './rules';
import { lootTable, type LootTableId } from './tables';

export interface ContainerRef {
  id: string;
  kind: ContainerKind;
  name: string;
  verb: string;
  table: LootTableId | null;
  capacity: number;
  /** Ponto de acesso (carro) ou centro do objeto. */
  x: number;
  y: number;
  /** Área do objeto (alcance medido até a borda); null = só o ponto de acesso. */
  rect: Rect | null;
}

export interface FloorItem {
  id: string;
  defId: string;
  count: number;
  x: number;
  y: number;
  st?: ItemState;
}

export interface LootSave {
  /** Recipientes já vasculhados. */
  searched: string[];
  /** Conteúdo dos recipientes mexidos. */
  containers: Record<string, ItemStack[]>;
}

const DEG = Math.PI / 180;

export class LootSystem {
  private readonly refs = new Map<string, ContainerRef>();
  private readonly byChunk = new Map<number, ContainerRef[]>();
  private readonly contents = new Map<string, ItemContainer>();
  private readonly touched = new Set<string>();
  private readonly searched = new Set<string>();
  readonly floorItems: FloorItem[];

  constructor(
    private readonly model: WorldModel,
    private readonly seed: number,
    private readonly settings: LootSettings = DEFAULT_LOOT,
  ) {
    this.buildRefs();
    this.floorItems = this.generateFloor();
  }

  // ---------------------------------------------------------------- recipientes do mapa

  private buildRefs(): void {
    const map = this.model.map;
    map.props.forEach((p) => {
      const slots = PROP_CONTAINERS[p.type];
      if (!slots) return;
      const solids = propSolids(p);
      const s0 = solids[0];
      const rect: Rect | null = s0 ? (s0.kind === 'rect' ? { x: s0.x, y: s0.y, w: s0.w, h: s0.h } : { x: s0.x - s0.r, y: s0.y - s0.r, w: s0.r * 2, h: s0.r * 2 }) : null;
      const ctx = contextAt(this.model, p.x, p.y);
      for (const slot of slots) {
        const def = CONTAINER_DEFS[slot.kind];
        let x = p.x;
        let y = p.y;
        if (slot.at) {
          const flip = p.flipX ? -1 : 1;
          const c = Math.cos(p.angle * DEG);
          const s = Math.sin(p.angle * DEG);
          const ax = slot.at[0] * flip;
          const ay = slot.at[1];
          x = p.x + ax * c - ay * s;
          y = p.y + ax * s + ay * c;
        }
        const ref: ContainerRef = {
          id: slot.slot ? `${p.id}:${slot.slot}` : p.id,
          kind: slot.kind,
          name: def.name,
          verb: def.verb,
          table: tableFor(slot.kind, ctx, p.type),
          capacity: def.capacity,
          x,
          y,
          rect: slot.at ? null : rect,
        };
        this.refs.set(ref.id, ref);
        const k = this.model.index.chunkOfPoint(x, y);
        let list = this.byChunk.get(k);
        if (!list) this.byChunk.set(k, (list = []));
        list.push(ref);
      }
    });
  }

  get containerCount(): number {
    return this.refs.size;
  }

  ref(id: string): ContainerRef | null {
    return this.refs.get(id) ?? null;
  }

  refsInChunk(key: number): readonly ContainerRef[] {
    return this.byChunk.get(key) ?? [];
  }

  /** Recipientes ao alcance (px, contados da borda do objeto ou do ponto de acesso). */
  refsNear(x: number, y: number, reach: number): { ref: ContainerRef; distance: number }[] {
    const out: { ref: ContainerRef; distance: number }[] = [];
    for (const key of this.model.index.chunksAround(x, y)) {
      for (const ref of this.byChunk.get(key) ?? []) {
        const d = ref.rect ? distToRect(x, y, ref.rect) : Math.hypot(ref.x - x, ref.y - y);
        if (d <= reach) out.push({ ref, distance: d });
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- conteúdo

  /** Abre (gera na primeira vez) e marca como vasculhado. */
  open(id: string): ItemContainer | null {
    const c = this.peek(id, true);
    if (c) this.searched.add(id);
    return c;
  }

  /** Conteúdo sem marcar como vasculhado. `generate`: cria se ainda não existir. */
  peek(id: string, generate = false): ItemContainer | null {
    const have = this.contents.get(id);
    if (have || !generate) return have ?? null;
    const ref = this.refs.get(id);
    if (!ref) return null;
    const c = new ItemContainer(id, ref.name, ref.capacity);
    const table = ref.table ? lootTable(ref.table) : null;
    if (table) {
      const rng = new Random(hashString(`${this.seed}:loot:${id}`));
      for (const s of generateLoot(table, rng, { capacity: ref.capacity, settings: this.settings })) c.add(s.defId, s.count, s.st);
    }
    this.contents.set(id, c);
    return c;
  }

  isSearched(id: string): boolean {
    return this.searched.has(id);
  }

  /** Alguém pegou/guardou algo: o conteúdo passa a ir para o save. */
  markTouched(id: string): void {
    if (this.refs.has(id)) this.touched.add(id);
  }

  // ---------------------------------------------------------------- itens soltos no chão

  /**
   * Alguns itens largados pelos cômodos (roupa, revista, garrafa, parafuso...).
   * Só em células livres da grade de navegação e longe das portas: nada fica
   * dentro de móvel nem trancando passagem.
   */
  private generateFloor(): FloorItem[] {
    const out: FloorItem[] = [];
    const floorSettings: LootSettings = { ...this.settings, abundance: this.settings.abundance * this.settings.floorItems };
    if (floorSettings.abundance <= 0) return out;
    const nav = this.model.nav;
    const map = this.model.map;
    for (const b of map.buildings) {
      const doors = map.doors.filter((d) => d.buildingId === b.id);
      b.rooms.forEach((room, ri) => {
        const table = tableFor('chao', { building: b.kind, room: room.name, zone: 'residencial' });
        const t = table ? lootTable(table) : null;
        if (!t) return;
        const rng = new Random(hashString(`${this.seed}:chao:${b.id}:${ri}`));
        const stacks = generateLoot(t, rng, { capacity: 30, settings: floorSettings });
        let n = 0;
        for (const s of stacks) {
          for (let tries = 0; tries < 24; tries++) {
            const x = rng.range(room.rect.x + 24, room.rect.x + room.rect.w - 24);
            const y = rng.range(room.rect.y + 24, room.rect.y + room.rect.h - 24);
            const cell = nav.cellOf(x, y);
            if (nav.isBlocked(cell.cx, cell.cy)) continue;
            // Vizinhas também livres: item não fica colado em móvel/parede.
            let tight = false;
            for (let dy = -1; dy <= 1 && !tight; dy++) for (let dx = -1; dx <= 1; dx++) if (nav.isBlocked(cell.cx + dx, cell.cy + dy)) tight = true;
            if (tight) continue;
            if (doors.some((d) => Math.hypot(d.x - x, d.y - y) < 56)) continue;
            const def = itemDef(s.defId);
            const st = def ? normalizeState(def, s.st) : undefined;
            out.push({ id: `chao:${b.id}:${ri}:${n++}`, defId: s.defId, count: s.count, x, y, ...(st ? { st } : {}) });
            break;
          }
        }
      });
    }
    return out;
  }

  // ---------------------------------------------------------------- save

  serialize(): LootSave {
    const containers: LootSave['containers'] = {};
    for (const id of this.touched) {
      const c = this.contents.get(id);
      if (c) containers[id] = c.serialize().stacks;
    }
    return { searched: [...this.searched], containers };
  }

  restore(save: LootSave | undefined): void {
    if (!save) return;
    for (const id of save.searched ?? []) if (this.refs.has(id)) this.searched.add(id);
    for (const [id, stacks] of Object.entries(save.containers ?? {})) {
      const ref = this.refs.get(id);
      if (!ref) continue;
      const c = new ItemContainer(id, ref.name, ref.capacity);
      c.restore({ id, stacks });
      this.contents.set(id, c);
      this.touched.add(id);
    }
  }
}
