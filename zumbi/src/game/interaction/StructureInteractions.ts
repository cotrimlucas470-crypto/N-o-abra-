/**
 * Interação com o que o jogador montou. Nesta etapa: a FOGUEIRA —
 * acender (isqueiro/fósforo; papel ou capim ajudam, álcool garante), pôr
 * lenha, apagar, cozinhar (abre FABRICAR) e desmontar quando apagada.
 */
import { addFuel, extinguish, fireLabel, fuelLeft, fuelMinutes, ignite, isAccelerant, isBurning, isTinder } from '../build/Fire';
import { STRUCTURE_DEFS } from '../build/StructureCatalog';
import type { Structure } from '../build/Structures';
import { FIRE_TUNING } from '../config/CraftTuning';
import { charge, doses, isBroken } from '../items/condition';
import { emptyAfter, hasLighter, useLighter } from '../items/consumables';
import type { ItemDef } from '../items/ItemTypes';
import type { PlayerInventory } from '../items/PlayerInventory';
import type { ActionOutcome, TimedActionSpec } from '../sim/Actions';
import type { WorldState } from '../sim/WorldState';
import type { InteractionCandidate, InteractionOption, InteractionProvider, InteractionResult, Interactor } from './InteractionSystem';

export interface StructureHooks {
  start(spec: TimedActionSpec): void;
  /** Relógio em minutos. */
  minutes(): number;
  /** Abre o painel na aba FABRICAR. */
  openCraft(): void;
  rng?(): number;
}

/** Ordem de preferência do que pôr no fogo (lenha primeiro, pano por último). */
function fuelRank(d: ItemDef): number {
  if (d.id === 'lenha') return 0;
  if (d.tags.includes('tabua')) return 1;
  if (d.id === 'tora') return 2;
  if (d.tags.includes('lenha') || d.tags.includes('madeira')) return 3;
  if (isTinder(d)) return 5;
  return 6;
}

export class StructureInteractions implements InteractionProvider {
  constructor(
    private readonly state: WorldState,
    private readonly inventory: PlayerInventory,
    private readonly hooks: StructureHooks,
  ) {}

  collect(who: Interactor, out: InteractionCandidate[]): void {
    for (const s of this.state.structures.near(who.x, who.y, 120)) {
      const def = STRUCTURE_DEFS[s.type];
      const d = Math.hypot(s.x - who.x, s.y - who.y) - who.radius - Math.max(def.w, def.h) / 2;
      if (d > 44) continue;
      if (def.fire) out.push(this.fireCandidate(s, d));
    }
  }

  // ---------------------------------------------------------------- fogueira

  private fireCandidate(s: Structure, d: number): InteractionCandidate {
    const now = this.hooks.minutes();
    const lit = isBurning(s, now);
    const fuel = this.bestFuel();
    const left = fuelLeft(s, now);
    const name = STRUCTURE_DEFS[s.type].name.toLowerCase();
    let verb: string;
    let label: string;
    let enabled: boolean;
    let perform: () => InteractionResult;
    if (lit) {
      verb = 'LENHA';
      label = fuel ? `Pôr ${fuel.def.name.toLowerCase()} na ${name}` : `${STRUCTURE_DEFS[s.type].name} acesa · sem lenha na bolsa`;
      enabled = !!fuel;
      perform = () => this.feed(s);
    } else if (left > 0) {
      verb = 'ACENDER';
      label = `Acender a ${name}`;
      enabled = hasLighter(this.inventory);
      perform = () => (enabled ? this.light(s) : { ok: false, message: 'Precisa de isqueiro ou fósforo.' });
    } else {
      verb = 'LENHA';
      label = fuel ? `Pôr ${fuel.def.name.toLowerCase()} na ${name}` : `${STRUCTURE_DEFS[s.type].name} sem lenha`;
      enabled = !!fuel;
      perform = () => this.feed(s);
    }
    return {
      target: { key: `estrutura:${s.id}`, kind: 'structure', x: s.x, y: s.y, radius: 26, verb, label, enabled },
      distance: d,
      perform: () => (enabled ? perform() : { ok: false, message: label }),
      more: () => this.fireMore(s),
    };
  }

  private fireMore(s: Structure): InteractionOption[] {
    const now = this.hooks.minutes();
    const lit = isBurning(s, now);
    const out: InteractionOption[] = [{ label: fireLabel(s, now), enabled: false, perform: () => ({ ok: false }) }];
    // Uma opção por tipo de lenha que o jogador tem (até 3).
    const kinds = new Map<string, ItemDef>();
    for (const x of this.inventory.stacks()) if (fuelMinutes(x.def) > 0 && !kinds.has(x.def.id)) kinds.set(x.def.id, x.def);
    [...kinds.values()]
      .sort((a, b) => fuelRank(a) - fuelRank(b))
      .slice(0, 3)
      .forEach((def) => out.push({ label: `Pôr ${def.name.toLowerCase()} (+${fuelMinutes(def)} min)`, enabled: true, perform: () => this.feed(s, def.id) }));
    if (lit) {
      out.push({ label: 'Cozinhar aqui (abre FABRICAR)', enabled: true, perform: () => (this.hooks.openCraft(), { ok: true }) });
      out.push({ label: 'Apagar a fogueira', enabled: true, perform: () => this.putOut(s) });
    } else {
      if (fuelLeft(s, now) > 0) out.push({ label: 'Acender a fogueira', enabled: hasLighter(this.inventory), perform: () => this.light(s) });
      out.push({ label: 'Desmontar a fogueira', enabled: true, perform: () => this.dismantle(s) });
    }
    return out;
  }

  private bestFuel(): { def: ItemDef } | null {
    let best: ItemDef | null = null;
    for (const x of this.inventory.stacks()) {
      if (fuelMinutes(x.def) <= 0) continue;
      if (!best || fuelRank(x.def) < fuelRank(best)) best = x.def;
    }
    return best ? { def: best } : null;
  }

  /** Põe uma unidade de lenha (a melhor, ou a escolhida). */
  feed(s: Structure, defId?: string): InteractionResult {
    const now = this.hooks.minutes();
    const pick = [...this.inventory.stacks()].filter((x) => fuelMinutes(x.def) > 0 && (!defId || x.def.id === defId)).sort((a, b) => fuelRank(a.def) - fuelRank(b.def))[0];
    if (!pick) return { ok: false, message: 'Nada que queime na bolsa.' };
    const fire = STRUCTURE_DEFS[s.type].fire!;
    if (fuelLeft(s, now) >= fire.maxFuel - 5) return { ok: false, message: 'A fogueira já está cheia.' };
    const mins = fuelMinutes(pick.def);
    pick.container.take(pick.index, 1);
    this.inventory.changed();
    addFuel(s, mins, now);
    this.state.structures.changed(s);
    return { ok: true, message: `+${mins} min de fogo (${pick.def.name.toLowerCase()})` };
  }

  /** Acender leva uns minutos; pode não pegar. */
  light(s: Structure): InteractionResult {
    if (!hasLighter(this.inventory)) return { ok: false, message: 'Precisa de isqueiro ou fósforo.' };
    if (fuelLeft(s, this.hooks.minutes()) <= 0) return { ok: false, message: 'Ponha lenha antes.' };
    this.hooks.start({
      id: 'acenderFogo',
      label: 'Acendendo o fogo',
      minutes: FIRE_TUNING.lightMinutes,
      done: () => this.tryLight(s),
    });
    return { ok: true };
  }

  /** O momento de riscar o fósforo. (Público para testes.) */
  tryLight(s: Structure): ActionOutcome {
    const now = this.hooks.minutes();
    const used = useLighter(this.inventory);
    if (!used) return { ok: false, message: 'Acabou a chama do isqueiro/fósforo.', tone: 'warn' };
    const T = FIRE_TUNING.lightChance;
    // Acelerante garante; isca (papel, capim) quase sempre; só lenha, difícil.
    let chance: number = T.bare;
    let helper = '';
    const acc = [...this.inventory.stacks()].find((x) => isAccelerant(x.def) && !isBroken(x.def, x.stack.st) && (x.def.condition === 'battery' ? charge(x.def, x.stack.st) > 0.05 : doses(x.def, x.stack.st) > 0));
    const tinder = [...this.inventory.stacks()].find((x) => isTinder(x.def));
    if (acc) {
      chance = T.accelerant;
      helper = acc.def.name.toLowerCase();
      const st = acc.stack.st;
      if (acc.def.condition === 'battery') {
        const ch = charge(acc.def, st) - 0.05;
        if (ch <= 0.001) {
          acc.container.take(acc.index, 1);
          const empty = emptyAfter(acc.def);
          if (empty) this.inventory.add(empty, 1);
        } else acc.container.updateOne(acc.index, { ...(st ?? {}), ch });
      } else {
        const left = doses(acc.def, st) - 1;
        if (left <= 0) {
          acc.container.take(acc.index, 1);
          const empty = emptyAfter(acc.def);
          if (empty) this.inventory.add(empty, 1);
        } else acc.container.updateOne(acc.index, { ...(st ?? {}), open: 1, dose: left });
      }
    } else if (tinder) {
      chance = T.tinder;
      helper = tinder.def.name.toLowerCase();
      tinder.container.take(tinder.index, 1);
      addFuel(s, fuelMinutes(tinder.def), now);
    }
    this.inventory.changed();
    if ((this.hooks.rng ?? Math.random)() >= chance) return { ok: false, message: helper ? 'Não pegou. Tente de novo.' : 'Só lenha não pega fácil. Papel, capim ou álcool ajudam.', tone: 'warn' };
    ignite(s, now);
    this.state.structures.changed(s);
    return { ok: true, message: helper ? `Fogo aceso (com ${helper}).` : 'Fogo aceso.', tone: 'ok' };
  }

  private putOut(s: Structure): InteractionResult {
    extinguish(s, this.hooks.minutes());
    this.state.structures.changed(s);
    return { ok: true, message: 'Fogueira apagada. A lenha que sobrou fica.' };
  }

  private dismantle(s: Structure): InteractionResult {
    if (isBurning(s, this.hooks.minutes())) return { ok: false, message: 'Apague antes.' };
    const left = fuelLeft(s, this.hooks.minutes());
    this.state.structures.remove(s.id);
    // A lenha que não queimou volta como lenha (arredondando para baixo).
    const back = Math.floor(left / 60);
    if (back > 0) this.inventory.add('lenha', back);
    return { ok: true, message: back > 0 ? `Fogueira desmontada (+${back} lenha).` : 'Fogueira desmontada.' };
  }
}
