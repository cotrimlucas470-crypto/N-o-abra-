/**
 * Opções do GERADOR montado no chão: ligar (puxar a corda) e desligar,
 * abastecer com o galão, acender/apagar as luzes da casa, puxar a extensão
 * até um prédio (gerador lá fora: sem fumaça dentro de casa) e recolher.
 *
 * O jogo não esconde o preço: o motor faz barulho que chama zumbi de longe
 * e, dentro de um prédio, a fumaça intoxica quem estiver lá.
 */
import { POWER_TUNING, addFuel, condition, cordTarget, fuelLeft, indoorBuilding, isRunning, powerLabel, poweredBuilding, settle, start, stop } from '../build/Power';
import type { Structure } from '../build/Structures';
import { STRUCTURE_DEFS } from '../build/StructureCatalog';
import { charge, type ItemState } from '../items/condition';
import type { PlayerInventory } from '../items/PlayerInventory';
import type { WorldState } from '../sim/WorldState';
import type { InteractionOption, InteractionResult } from './InteractionSystem';
import type { StructureHooks } from './StructureInteractions';

const br = (n: number) => n.toFixed(1).replace('.', ',');

export class GeneratorOptions {
  constructor(
    private readonly state: WorldState,
    private readonly inventory: PlayerInventory,
    private readonly hooks: StructureHooks,
  ) {}

  /** Ação principal e o resto (menu "⋯"). */
  options(s: Structure): { main: InteractionOption; more: InteractionOption[] } {
    const now = this.hooks.minutes();
    const running = isRunning(s, now);
    const fuel = fuelLeft(s, now);
    const main: InteractionOption = running
      ? { label: 'Desligar o gerador', enabled: true, perform: () => this.turnOff(s) }
      : { label: fuel > 0.01 ? 'Ligar o gerador' : 'Gerador sem gasolina', enabled: fuel > 0.01, perform: () => this.turnOn(s) };
    const more: InteractionOption[] = [{ label: `Gerador: ${powerLabel(s, now)}`, enabled: false, perform: () => ({ ok: false }) }];
    const can = this.fullCan();
    if (fuel < POWER_TUNING.tank - 0.2) {
      more.push({
        label: can ? 'Abastecer (galão)' : 'Abastecer (precisa de galão com gasolina)',
        enabled: !!can,
        perform: () => this.refuel(s),
      });
    }
    const b = poweredBuilding(this.state.model, s);
    if (b) more.push({ label: s.lights ? 'Apagar as luzes da casa' : 'Acender as luzes da casa', enabled: true, perform: () => this.toggleLights(s) });
    if (!indoorBuilding(this.state.model, s)) {
      if (s.link) more.push({ label: 'Recolher a extensão', enabled: !running, perform: () => this.unplug(s) });
      else {
        const t = cordTarget(this.state.model, s);
        const has = this.inventory.countOf('extensao') > 0;
        if (t) more.push({ label: has ? `Puxar extensão até ${t.name.toLowerCase()}` : 'Puxar extensão (precisa de extensão elétrica)', enabled: has, perform: () => this.plug(s) });
      }
    }
    const lost = fuel > 0.2 ? ` (perde ${br(fuel)} L de gasolina)` : '';
    more.push({ label: `Recolher o gerador${lost}`, enabled: !running, perform: () => this.pickUp(s) });
    return { main, more };
  }

  private fullCan() {
    return [...this.inventory.stacks()].find((x) => x.def.id === 'combustivel' && charge(x.def, x.stack.st) > 0.02) ?? null;
  }

  private turnOn(s: Structure): InteractionResult {
    const now = this.hooks.minutes();
    // Puxar a corda já faz barulho, pegando ou não.
    this.hooks.noise?.(s.x, s.y, 420, 'partida do gerador');
    const why = start(s, now, this.hooks.rng?.() ?? Math.random());
    this.state.structures.changed(s);
    if (why) return { ok: false, message: why };
    const inside = indoorBuilding(this.state.model, s);
    const b = poweredBuilding(this.state.model, s);
    const where = b ? `Energia chegando: ${b.name.toLowerCase()}.` : 'Nada ligado nele: puxe uma extensão até uma casa.';
    const warn = inside ? ' Dentro de casa a fumaça intoxica: saia do prédio ou ponha o gerador lá fora!' : ' O barulho chama zumbi de longe.';
    return { ok: true, message: `Gerador ligado. ${where}${warn}` };
  }

  private turnOff(s: Structure): InteractionResult {
    stop(s, this.hooks.minutes());
    this.state.structures.changed(s);
    return { ok: true, message: `Gerador desligado (${br(s.fuel ?? 0)} L no tanque).` };
  }

  private refuel(s: Structure): InteractionResult {
    const can = this.fullCan();
    if (!can) return { ok: false, message: 'Precisa de um galão com gasolina.' };
    this.hooks.start({
      id: 'abastecer-gerador',
      label: 'Abastecendo o gerador',
      minutes: 3,
      done: () => {
        if (!this.state.structures.get(s.id)) return { ok: false, message: 'O gerador não está mais aí.' };
        const liters = charge(can.def, can.stack.st) * 5;
        const put = addFuel(s, liters, this.hooks.minutes());
        can.container.take(can.index, 1);
        const left = liters - put;
        const st: ItemState | undefined = left > 0.05 ? { ch: left / 5 } : undefined;
        if (st) this.inventory.add('combustivel', 1, st);
        else this.inventory.add('galaoVazio', 1);
        this.state.structures.changed(s);
        return { ok: true, message: `Pôs ${br(put)} L no gerador (${br(s.fuel ?? 0)}/${POWER_TUNING.tank} L).`, tone: 'ok' };
      },
    });
    return { ok: true };
  }

  private toggleLights(s: Structure): InteractionResult {
    settle(s, this.hooks.minutes());
    if (s.lights) delete s.lights;
    else s.lights = 1;
    this.state.structures.changed(s);
    return { ok: true, message: s.lights ? 'Luzes acesas: gasta mais gasolina, e casa acesa de noite é vista de longe.' : 'Luzes apagadas.' };
  }

  private plug(s: Structure): InteractionResult {
    const t = cordTarget(this.state.model, s);
    if (!t) return { ok: false, message: 'Nenhuma casa ao alcance da extensão.' };
    if (this.inventory.countOf('extensao') <= 0) return { ok: false, message: 'Precisa de uma extensão elétrica.' };
    this.hooks.start({
      id: 'extensao',
      label: 'Puxando a extensão',
      minutes: 6,
      done: () => {
        if (!this.state.structures.get(s.id)) return { ok: false, message: 'O gerador não está mais aí.' };
        const ext = [...this.inventory.stacks()].find((x) => x.def.id === 'extensao');
        if (!ext) return { ok: false, message: 'Cadê a extensão?' };
        ext.container.take(ext.index, 1);
        s.link = t.id;
        this.state.structures.changed(s);
        return { ok: true, message: `Extensão puxada até ${t.name.toLowerCase()}. O gerador fica lá fora; a energia chega lá dentro.`, tone: 'ok' };
      },
    });
    return { ok: true };
  }

  private unplug(s: Structure): InteractionResult {
    delete s.link;
    delete s.lights;
    this.inventory.add('extensao', 1);
    this.state.structures.changed(s);
    return { ok: true, message: 'Extensão recolhida.' };
  }

  private pickUp(s: Structure): InteractionResult {
    if (isRunning(s, this.hooks.minutes())) return { ok: false, message: 'Desligue antes.' };
    this.hooks.start({
      id: 'recolher-gerador',
      label: 'Recolhendo o gerador',
      minutes: 3,
      done: () => {
        if (!this.state.structures.get(s.id)) return { ok: false, message: 'Já não está aí.' };
        const c = condition(s);
        const st: ItemState | undefined = c < 0.999 ? { c } : undefined;
        const hadLink = !!s.link;
        this.state.removeStructure(s.id);
        if (hadLink) this.inventory.add('extensao', 1);
        const id = STRUCTURE_DEFS[s.type].pickup ?? 'gerador';
        if (this.inventory.add(id, 1, st) >= 1) return { ok: true, message: 'Gerador recolhido.', tone: 'ok' };
        // Não cabe na bolsa (quase nunca cabe): nos braços; mãos ocupadas, fica no chão.
        if (!this.inventory.carryInArms(id, st)) return { ok: true, message: 'Gerador nos braços: pesado, devagar e sem correr.', tone: 'ok' };
        this.hooks.drop?.(id, 1, st, s.x, s.y);
        return { ok: true, message: 'Gerador desmontado do lugar: ficou no chão (mãos ocupadas).', tone: 'ok' };
      },
    });
    return { ok: true };
  }
}
