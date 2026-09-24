/**
 * Fabricação em jogo (puro): descobre as estações por perto (fogueira acesa,
 * fogão com gás, bancada), confere receitas, começa a ação com tempo e, ao
 * terminar, entrega o resultado (ou monta a estrutura na frente do jogador).
 */
import { addFuel, isBurning } from '../build/Fire';
import { STRUCTURE_DEFS, TILE_PX, type StructureType } from '../build/StructureCatalog';
import { placementFor, rectAt, rectOf, rectsOverlap, solidOf, type Placement } from '../build/StructureGeometry';
import { Ground } from '../world/MapTypes';
import { propSolids } from '../world/collision';
import { doorGapRect } from '../world/doors';
import { PLAYER_TUNING } from '../config/PlayerTuning';
import { CRAFT_TUNING } from '../config/CraftTuning';
import type { ItemState } from '../items/condition';
import type { PlayerInventory } from '../items/PlayerInventory';
import type { ActionOutcome, TimedActionSpec } from '../sim/Actions';
import type { WorldState } from '../sim/WorldState';
import type { Survivor } from '../survival/Survivor';
import { isSheltered } from '../world/shelter';
import { checkRecipe, craftMinutes, craftRecipe, type CraftCheck, type CraftEnv } from './Crafting';
import { RECIPE_BY_ID, type Recipe, type Station } from './Recipes';

export interface CraftHooks {
  start(spec: TimedActionSpec): void;
  drop(items: { defId: string; count: number; st?: ItemState }[], x: number, y: number): void;
  /** Posição e para onde o jogador olha (radianos). */
  where(): { x: number; y: number; facing: number };
  /** Relógio: minutos e dia (fração). */
  minutes(): number;
  days(): number;
  /** Tem gás no fogão? (sandbox: dias até cortar) */
  gasOn(): boolean;
}

const MAP_STATIONS: Partial<Record<string, Station[]>> = {
  workbench: ['bancada'],
};

/** Prévia do modo construir. */
export interface BuildPreview {
  recipe: Recipe;
  type: StructureType;
  at: Placement;
  /** Lugar e ingredientes ok. */
  ok: boolean;
  reason: string | null;
}

const FARM_GROUND: ReadonlySet<number> = new Set([Ground.Grass, Ground.GrassDark, Ground.Dirt]);

export class CraftService {
  constructor(
    private readonly state: WorldState,
    private readonly inventory: PlayerInventory,
    private readonly survivor: Survivor,
    private readonly hooks: CraftHooks,
  ) {}

  /** Giro escolhido no modo construir (móveis compridos). */
  buildRot = 0;

  /** O que há por perto para cozinhar/trabalhar. */
  stations(): Set<Station> {
    const { x, y } = this.hooks.where();
    const out = new Set<Station>();
    const reach = CRAFT_TUNING.stationReach;
    const now = this.hooks.minutes();
    for (const st of this.state.structures.near(x, y, reach + 64)) {
      const d = STRUCTURE_DEFS[st.type];
      const r = rectOf(st);
      const dist = Math.hypot(Math.max(r.x - x, 0, x - (r.x + r.w)), Math.max(r.y - y, 0, y - (r.y + r.h)));
      if (dist > reach) continue;
      if (d.station) out.add(d.station);
      if (d.fire && isBurning(st, now)) {
        out.add('fogo');
        if (d.fire.oven) out.add('forno');
      }
    }
    for (const { prop } of this.state.propsNear(x, y, reach)) {
      if (prop.type === 'stove' && this.hooks.gasOn()) {
        out.add('fogo');
        out.add('forno');
      }
      for (const st of MAP_STATIONS[prop.type] ?? []) out.add(st);
    }
    return out;
  }

  /** Onde a estrutura seria montada agora (encaixe pela posição e direção do jogador). */
  spot(type: StructureType): Placement {
    const { x, y, facing } = this.hooks.where();
    return placementFor(type, x, y, facing, this.buildRot);
  }

  canPlace(type: StructureType): string | null {
    return this.canPlaceAt(type, this.spot(type));
  }

  /** O lugar serve? Motivo de não servir, ou null. */
  canPlaceAt(type: StructureType, p: Placement): string | null {
    const d = STRUCTURE_DEFS[type];
    const model = this.state.model;
    const r = rectAt(type, p.x, p.y, p.rot);
    if (r.x < 0 || r.y < 0 || r.x + r.w > model.widthPx || r.y + r.h > model.heightPx) return 'Fora do mapa.';
    const indoor = isSheltered(model, p.x, p.y, (x, y) => this.state.coveredAt(x, y));
    if (indoor && !d.indoor) return d.cover ? 'Aqui já é coberto.' : d.fire ? 'Só ao ar livre (fumaça e incêndio).' : 'Só ao ar livre.';
    if (!indoor && !d.outdoor) return 'Só dentro de casa.';
    if (d.farm) {
      const g = model.map.ground[Math.floor(p.y / TILE_PX) * model.map.widthTiles + Math.floor(p.x / TILE_PX)];
      if (g === undefined || !FARM_GROUND.has(g)) return 'Canteiro só na grama ou na terra.';
    }
    for (const o of this.state.structures.near(p.x, p.y, 200)) {
      if (STRUCTURE_DEFS[o.type].layer !== d.layer) continue;
      // Paredes que se cruzam no canto do tile não brigam; só a mesma borda.
      if (d.layer === 'edge' && o.rot % 2 !== p.rot % 2) continue;
      if (rectsOverlap(r, rectOf(o), 2)) return `Já tem ${STRUCTURE_DEFS[o.type].name.toLowerCase()} aqui.`;
    }
    // Chão livre embaixo (paredes, portas, móveis e objetos do mapa ou já construídos).
    // Conta exata (não a grade de 32 px): parede encostada em parede no canto do tile é normal.
    if (d.layer !== 'roof' && d.layer !== 'floor') {
      const pts: [number, number][] = [];
      if (d.place === 'edge') {
        const horiz = r.w >= r.h;
        for (const t of [0.25, 0.5, 0.75]) pts.push(horiz ? [r.x + r.w * t, r.y + r.h / 2] : [r.x + r.w / 2, r.y + r.h * t]);
      } else {
        const k = Math.min(8, r.w / 4, r.h / 4);
        for (let yy = r.y + k; yy <= r.y + r.h - k + 0.01; yy += Math.max(8, (r.h - 2 * k) / 3)) for (let xx = r.x + k; xx <= r.x + r.w - k + 0.01; xx += Math.max(8, (r.w - 2 * k) / 3)) pts.push([xx, yy]);
      }
      if (pts.some(([xx, yy]) => this.solidAt(xx, yy))) return 'Tem algo no caminho.';
    }
    // Peça sólida não pode nascer em cima do jogador.
    if (d.solid) {
      const { x, y } = this.hooks.where();
      const probe = solidOf({ id: '', type, x: p.x, y: p.y, rot: p.rot, hp: 1 });
      if (probe && probe.kind === 'rect') {
        const dist = Math.hypot(Math.max(probe.x - x, 0, x - (probe.x + probe.w)), Math.max(probe.y - y, 0, y - (probe.y + probe.h)));
        if (dist < PLAYER_TUNING.bodyRadius + 1) return 'Chegue um pouco para trás.';
      }
    }
    return null;
  }

  /** Algo sólido exatamente neste ponto? (paredes e janelas do mapa, vão de porta, objetos, construções) */
  private solidAt(x: number, y: number): boolean {
    const model = this.state.model;
    const inR = (r: { x: number; y: number; w: number; h: number }) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    for (const key of model.index.chunksAround(x, y)) {
      const c = model.index.get(key);
      if (!c) continue;
      for (const i of c.walls) if (this.state.wallPieces(i).some(inR)) return true;
      for (const i of c.doors) if (inR(doorGapRect(model.map.doors[i]!))) return true;
    }
    for (const { prop } of this.state.propsNear(x, y, 160)) {
      for (const sd of propSolids(prop)) if (sd.kind === 'circle' ? Math.hypot(x - sd.x, y - sd.y) <= sd.r : inR(sd)) return true;
    }
    for (const o of this.state.structures.near(x, y, 160)) {
      const sd = solidOf(o);
      if (sd && sd.kind === 'rect' && inR(sd)) return true;
    }
    return false;
  }

  /** Prévia do modo construir: onde, se o lugar serve e se tem o material. */
  preview(recipeId: string): BuildPreview | null {
    const r = RECIPE_BY_ID.get(recipeId);
    if (!r?.structure) return null;
    const at = this.spot(r.structure);
    const place = this.canPlaceAt(r.structure, at);
    const c = place ? null : this.check(r);
    const reason = place ?? (c && !c.ok ? c.reason : null);
    return { recipe: r, type: r.structure, at, ok: !reason, reason };
  }

  env(): CraftEnv {
    return { stations: this.stations(), now: this.hooks.days(), canPlace: (t) => this.canPlace(t) };
  }

  check(r: Recipe, env: CraftEnv = this.env()): CraftCheck {
    return checkRecipe(r, this.inventory, env);
  }

  minutesFor(r: Recipe): number {
    const speed = r.skill ? this.survivor.skills.speed(r.skill.id) : 1;
    return craftMinutes(r, speed, this.survivor.effects().actionTime);
  }

  /** Começa a fazer. Estrutura: no lugar de agora (fixado). Devolve o motivo de não dar, ou null. */
  start(recipeId: string): string | null {
    const r = RECIPE_BY_ID.get(recipeId);
    if (!r) return 'Receita desconhecida.';
    const c = this.check(r);
    if (!c.ok) return c.reason ?? 'Não dá agora.';
    const at = r.structure ? this.spot(r.structure) : undefined;
    this.hooks.start({
      id: `fabricar:${r.id}`,
      label: r.structure ? `Montando: ${r.name}` : `Fazendo: ${r.name}`,
      minutes: this.minutesFor(r),
      done: () => this.finish(r, at),
      cancelled: () => ({ ok: false, message: 'Parou no meio. Nada foi gasto.', tone: 'info' }),
    });
    return null;
  }

  /** Termina: gasta, entrega, monta. */
  finish(r: Recipe, at?: Placement): ActionOutcome {
    const env = this.env();
    // O lugar escolhido no começo continua valendo?
    if (r.structure && at) {
      const why = this.canPlaceAt(r.structure, at);
      if (why) return { ok: false, message: why, tone: 'warn' };
      env.canPlace = () => null;
    }
    const res = craftRecipe(r, this.inventory, env);
    if (!res.ok) return { ok: false, message: res.message, tone: 'warn' };
    const { x, y } = this.hooks.where();
    if (res.overflow.length) this.hooks.drop(res.overflow.map((o) => ({ defId: o.id, count: o.n, ...(o.st ? { st: o.st } : {}) })), x, y);
    if (res.structure) {
      const p = at ?? this.spot(res.structure);
      const s = this.state.structures.add(res.structure, p.x, p.y, p.rot);
      if (res.fuel) addFuel(s, res.fuel, this.hooks.minutes());
      this.state.structures.changed(s);
    }
    if (r.skill) this.survivor.skills.gain(r.skill.id, r.skill.xp);
    const extra = res.overflow.length ? ' (não coube: ficou no chão)' : '';
    return { ok: true, message: res.message + extra, tone: 'ok' };
  }
}
