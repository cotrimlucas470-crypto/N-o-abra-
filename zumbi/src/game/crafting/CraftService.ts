/**
 * Fabricação em jogo (puro): descobre as estações por perto (fogueira acesa,
 * fogão com gás, bancada), confere receitas, começa a ação com tempo e, ao
 * terminar, entrega o resultado (ou monta a estrutura na frente do jogador).
 */
import { addFuel } from '../build/Fire';
import type { FireSystem } from '../build/FireSystem';
import { STRUCTURE_DEFS, type StructureType } from '../build/StructureCatalog';
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

export class CraftService {
  constructor(
    private readonly state: WorldState,
    private readonly inventory: PlayerInventory,
    private readonly survivor: Survivor,
    private readonly fires: FireSystem,
    private readonly hooks: CraftHooks,
  ) {}

  /** O que há por perto para cozinhar/trabalhar. */
  stations(): Set<Station> {
    const { x, y } = this.hooks.where();
    const out = new Set<Station>();
    const reach = CRAFT_TUNING.stationReach;
    if (this.fires.burningNear(x, y, reach, this.hooks.minutes())) out.add('fogo');
    for (const { prop } of this.state.propsNear(x, y, reach)) {
      if (prop.type === 'stove' && this.hooks.gasOn()) {
        out.add('fogo');
        out.add('forno');
      }
      for (const st of MAP_STATIONS[prop.type] ?? []) out.add(st);
    }
    return out;
  }

  /** Ponto onde a estrutura seria montada (na frente do jogador). */
  spot(type: StructureType): { x: number; y: number } {
    const { x, y, facing } = this.hooks.where();
    const d = STRUCTURE_DEFS[type];
    const dist = 26 + Math.max(d.w, d.h) / 2;
    return { x: x + Math.cos(facing) * dist, y: y + Math.sin(facing) * dist };
  }

  canPlace(type: StructureType): string | null {
    const d = STRUCTURE_DEFS[type];
    const p = this.spot(type);
    const model = this.state.model;
    if (p.x < 0 || p.y < 0 || p.x >= model.widthPx || p.y >= model.heightPx) return 'Fora do mapa.';
    const indoor = isSheltered(model, p.x, p.y);
    if (indoor && !d.indoor) return 'Só ao ar livre (fumaça e incêndio).';
    if (!indoor && !d.outdoor) return 'Só dentro de casa.';
    if (!model.nav.isWalkableAt(p.x, p.y)) return 'Tem algo no caminho.';
    if (this.state.structures.near(p.x, p.y, Math.max(d.w, d.h)).length) return 'Muito perto de outra construção.';
    return null;
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

  /** Começa a fazer. Devolve o motivo de não dar, ou null. */
  start(recipeId: string): string | null {
    const r = RECIPE_BY_ID.get(recipeId);
    if (!r) return 'Receita desconhecida.';
    const c = this.check(r);
    if (!c.ok) return c.reason ?? 'Não dá agora.';
    this.hooks.start({
      id: `fabricar:${r.id}`,
      label: r.structure ? `Montando: ${r.name}` : `Fazendo: ${r.name}`,
      minutes: this.minutesFor(r),
      done: () => this.finish(r),
      cancelled: () => ({ ok: false, message: 'Parou no meio. Nada foi gasto.', tone: 'info' }),
    });
    return null;
  }

  /** Termina: gasta, entrega, monta. */
  finish(r: Recipe): ActionOutcome {
    const res = craftRecipe(r, this.inventory, this.env());
    if (!res.ok) return { ok: false, message: res.message, tone: 'warn' };
    const { x, y } = this.hooks.where();
    if (res.overflow.length) this.hooks.drop(res.overflow.map((o) => ({ defId: o.id, count: o.n, ...(o.st ? { st: o.st } : {}) })), x, y);
    if (res.structure) {
      const p = this.spot(res.structure);
      const s = this.state.structures.add(res.structure, p.x, p.y);
      if (res.fuel) addFuel(s, res.fuel, this.hooks.minutes());
      this.state.structures.changed(s);
    }
    if (r.skill) this.survivor.skills.gain(r.skill.id, r.skill.xp);
    const extra = res.overflow.length ? ' (não coube: ficou no chão)' : '';
    return { ok: true, message: res.message + extra, tone: 'ok' };
  }
}
