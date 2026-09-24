/**
 * Carros, vans e carcaças no mundo. Cada porta é um ponto de acesso com a
 * sua ação (abrir/fechar); o menu "⋯" junta o resto: vasculhar banco e
 * porta-luvas (com a porta aberta ou o vidro quebrado), porta-malas, capô,
 * destrancar com a chave certa, arrombar com pé de cabra, quebrar o vidro
 * (alarme!), tirar/pôr gasolina, bateria e pneu, examinar e tentar ligar.
 */
import { charge, condition, isBroken, type ItemState } from '../items/condition';
import type { PlayerInventory } from '../items/PlayerInventory';
import type { WorldState } from '../sim/WorldState';
import type { Survivor } from '../survival/Survivor';
import { VEHICLE_SPECS, isVehicle, toWorld, type VehicleType } from '../vehicles/Vehicles';
import type { PropPlacement } from '../world/MapTypes';
import type { InteractionCandidate, InteractionOption, InteractionProvider, InteractionResult, Interactor } from './InteractionSystem';
import type { WorldActionHooks } from './ToolInteractions';

export interface VehicleHooks extends WorldActionHooks {
  /** Abre um compartimento (painel de saque). */
  openContainer(id: string): void;
  /** Mostra um cartão de informação (examinar). */
  info(title: string, lines: string[]): void;
}

const REACH = 44;
const SLOT_NAME: Record<string, string> = { luvas: 'porta-luvas', bancoF: 'banco da frente', bancoT: 'banco de trás', malas: 'porta-malas' };

export class VehicleInteractions implements InteractionProvider {
  constructor(
    private readonly state: WorldState,
    private readonly inventory: PlayerInventory,
    private readonly survivor: Survivor,
    private readonly hooks: VehicleHooks,
  ) {}

  private get v() {
    return this.state.vehicles;
  }

  private rng(): number {
    return (this.hooks.rng ?? Math.random)();
  }

  collect(who: Interactor, out: InteractionCandidate[]): void {
    for (const { prop } of this.state.propsNear(who.x, who.y, 200)) {
      if (!isVehicle(prop.type)) continue;
      const spec = VEHICLE_SPECS[prop.type as VehicleType];
      const s = this.v.state(prop.id)!;
      // Portas
      for (const d of spec.doors) {
        const p = toWorld(prop, d.at[0], d.at[1]);
        const dist = Math.hypot(p.x - who.x, p.y - who.y) - who.radius;
        if (dist > REACH) continue;
        const ds = s.doors[d.id]!;
        const label = ds.jammed ? `${cap(d.label)} emperrada` : ds.locked && !ds.open ? `${cap(d.label)} trancada` : `${ds.open ? 'Fechar' : 'Abrir'} ${d.label}`;
        const enabled = !ds.jammed && (!ds.locked || ds.open);
        out.push({
          target: { key: `carro:${prop.id}:${d.id}`, kind: 'vehicle', x: p.x, y: p.y, radius: 16, verb: ds.open ? 'FECHAR' : 'ABRIR', label, enabled },
          distance: dist,
          perform: () => this.door(prop, d.id),
          more: () => this.doorMore(prop, d.id),
        });
      }
      // Porta-malas
      const t = toWorld(prop, spec.trunk[0], spec.trunk[1]);
      const td = Math.hypot(t.x - who.x, t.y - who.y) - who.radius;
      if (td <= REACH) {
        const tr = s.trunk;
        const label = tr.open ? 'Vasculhar porta-malas' : tr.jammed ? 'Porta-malas emperrado' : tr.locked ? 'Porta-malas trancado' : 'Abrir porta-malas';
        out.push({
          target: { key: `carro:${prop.id}:malas`, kind: 'vehicle', x: t.x, y: t.y, radius: 18, verb: tr.open ? 'VASCULHAR' : 'ABRIR', label, enabled: tr.open || (!tr.locked && !tr.jammed) },
          distance: td,
          perform: () => (tr.open ? this.openSlot(prop, 'malas') : this.trunk(prop)),
          more: () => this.trunkMore(prop),
        });
      }
      // Capô
      const h = toWorld(prop, spec.hood[0], spec.hood[1]);
      const hd = Math.hypot(h.x - who.x, h.y - who.y) - who.radius;
      if (hd <= REACH) {
        out.push({
          target: { key: `carro:${prop.id}:capo`, kind: 'vehicle', x: h.x, y: h.y, radius: 18, verb: s.hood ? 'EXAMINAR' : 'CAPÔ', label: s.hood ? 'Examinar o motor' : 'Abrir o capô', enabled: true },
          distance: hd + 6,
          perform: () => (s.hood ? this.examine(prop) : this.hood(prop)),
          more: () => this.hoodMore(prop),
        });
      }
    }
  }

  // ---------------------------------------------------------------- portas e compartimentos

  private door(prop: PropPlacement, doorId: string): InteractionResult {
    const err = this.v.toggleDoor(prop.id, doorId);
    if (err) {
      this.hooks.noise(prop.x, prop.y, 120, 'maçaneta');
      return { ok: false, message: err };
    }
    this.hooks.noise(prop.x, prop.y, 160, 'porta de carro');
    return { ok: true };
  }

  private openSlot(prop: PropPlacement, slot: string): InteractionResult {
    const why = this.v.access(prop.id, slot);
    if (why) return { ok: false, message: why };
    const id = `${prop.id}:${slot}`;
    if (!this.state.loot.ref(id)) return { ok: false, message: 'Nada aí.' };
    this.hooks.openContainer(id);
    return { ok: true };
  }

  private doorMore(prop: PropPlacement, doorId: string): InteractionOption[] {
    const spec = VEHICLE_SPECS[prop.type as VehicleType];
    const d = spec.doors.find((x) => x.id === doorId)!;
    const s = this.v.state(prop.id)!;
    const ds = s.doors[doorId]!;
    const out: InteractionOption[] = [];
    const reach = ds.open || s.broken.includes(doorId);
    for (const slot of d.reaches) {
      if (!this.state.loot.ref(`${prop.id}:${slot}`)) continue;
      out.push({ label: `Vasculhar ${SLOT_NAME[slot]}`, enabled: reach, perform: () => this.openSlot(prop, slot) });
    }
    if (ds.locked || ds.jammed) {
      const key = this.hasKey(prop.id);
      if (key && !ds.jammed) out.push({ label: 'Destrancar (chave)', enabled: true, perform: () => (this.v.unlockAll(prop.id), { ok: true, message: 'Destrancado.' }) });
      out.push(this.forceOption(prop, doorId, d.label));
    }
    if (!s.broken.includes(doorId)) out.push({ label: 'Quebrar o vidro', enabled: true, perform: () => this.smash(prop, doorId) });
    else if ((ds.locked || ds.jammed) && !ds.open) out.push({ label: 'Destravar por dentro', enabled: !ds.jammed, perform: () => (this.v.unlockAll(prop.id), { ok: true, message: 'Enfiou a mão e destravou.' }) });
    out.push(...this.fuelOptions(prop));
    out.push({ label: 'Tentar ligar o carro', enabled: reach, perform: () => this.tryStart(prop) });
    out.push({ label: 'Examinar o veículo', enabled: true, perform: () => this.examine(prop) });
    return out;
  }

  private trunk(prop: PropPlacement): InteractionResult {
    const err = this.v.toggleTrunk(prop.id);
    if (err) return { ok: false, message: err };
    this.hooks.noise(prop.x, prop.y, 180, 'porta-malas');
    return { ok: true };
  }

  private trunkMore(prop: PropPlacement): InteractionOption[] {
    const s = this.v.state(prop.id)!;
    const out: InteractionOption[] = [];
    if (s.trunk.open) out.push({ label: 'Fechar porta-malas', enabled: true, perform: () => this.trunk(prop) });
    else if (s.trunk.locked || s.trunk.jammed) {
      if (this.hasKey(prop.id) && !s.trunk.jammed) out.push({ label: 'Destrancar porta-malas (chave)', enabled: true, perform: () => (this.v.unlockAll(prop.id), { ok: true, message: 'Destrancado.' }) });
      out.push(this.forceOption(prop, 'malas', 'porta-malas'));
    }
    out.push(...this.fuelOptions(prop));
    out.push({ label: 'Examinar o veículo', enabled: true, perform: () => this.examine(prop) });
    return out;
  }

  private forceOption(prop: PropPlacement, part: string, name: string): InteractionOption {
    const bar = this.tool(['alavanca', 'arrombar']);
    return {
      label: `Forçar ${name} (pé de cabra)`,
      enabled: !!bar,
      perform: () => {
        if (!bar) return { ok: false, message: 'Precisa de pé de cabra.' };
        this.hooks.start({
          id: 'arrombar',
          label: `Forçando ${name}`,
          minutes: 5 * this.survivor.skills.speed('mecanica') * this.survivor.effects().actionTime,
          done: () => {
            this.v.force(prop.id, part);
            this.wear(bar, 5);
            this.hooks.noise(prop.x, prop.y, 450, 'lataria');
            const alarm = this.v.alarming(prop.id);
            return { ok: true, message: alarm ? 'Abriu... e o alarme disparou!' : `Forçou ${name}.`, tone: alarm ? 'bad' : 'ok' };
          },
        });
        return { ok: true };
      },
    };
  }

  private smash(prop: PropPlacement, doorId: string): InteractionResult {
    this.v.breakWindow(prop.id, doorId);
    const p = toWorld(prop, 0, 0);
    this.state.addGlass(p.x, p.y);
    this.hooks.noise(prop.x, prop.y, 520, 'vidro de carro');
    let msg = this.v.alarming(prop.id) ? 'Vidro estourou — e o alarme disparou!' : 'Vidro estourou.';
    if (!this.inventory.handDef && this.rng() > this.inventory.protection(['maos']).scratch * 1.5) {
      this.survivor.health.add(this.rng() < 0.5 ? 'maoE' : 'maoD', 'corte', 0.35 + this.rng() * 0.35);
      msg += ' A mão cortou.';
    }
    return { ok: true, message: msg };
  }

  // ---------------------------------------------------------------- capô, bateria, pneus

  private hood(prop: PropPlacement): InteractionResult {
    const err = this.v.toggleHood(prop.id);
    return err ? { ok: false, message: err } : { ok: true };
  }

  private hoodMore(prop: PropPlacement): InteractionOption[] {
    const s = this.v.state(prop.id)!;
    const out: InteractionOption[] = [];
    if (!s.hood) return [{ label: 'Examinar o veículo', enabled: true, perform: () => this.examine(prop) }];
    out.push({ label: 'Fechar o capô', enabled: true, perform: () => this.hood(prop) });
    const wrench = this.tool(['chave', 'mecanica']);
    if (s.battery !== null) {
      out.push({
        label: 'Tirar a bateria',
        enabled: !!wrench,
        perform: () => {
          if (!wrench) return { ok: false, message: 'Precisa de chave inglesa.' };
          this.hooks.start({
            id: 'bateria',
            label: 'Tirando a bateria',
            minutes: 10 * this.survivor.skills.speed('mecanica'),
            done: () => {
              const ch = this.v.takeBattery(prop.id);
              if (ch === null) return { ok: false };
              const st: ItemState = ch < 1 ? { ch } : {};
              if (!this.inventory.add('bateriaCarro', 1, st)) this.hooks.drop([{ defId: 'bateriaCarro', count: 1, st }], prop.x, prop.y);
              this.survivor.skills.gain('mecanica', 10);
              return { ok: true, message: `Bateria retirada (${Math.round(ch * 100)}%). Pesada!`, tone: 'ok' };
            },
          });
          return { ok: true };
        },
      });
    } else {
      const bat = [...this.inventory.stacks()].find((x) => x.def.id === 'bateriaCarro');
      out.push({
        label: 'Pôr a bateria',
        enabled: !!bat && !!wrench,
        perform: () => {
          if (!bat || !wrench) return { ok: false, message: 'Precisa de bateria de carro e chave inglesa.' };
          this.hooks.start({
            id: 'bateria',
            label: 'Instalando a bateria',
            minutes: 12 * this.survivor.skills.speed('mecanica'),
            done: () => {
              const got = bat.container.take(bat.index, 1);
              if (!got) return { ok: false };
              this.v.putBattery(prop.id, got.st?.ch ?? 1);
              this.inventory.changed();
              this.survivor.skills.gain('mecanica', 10);
              return { ok: true, message: 'Bateria instalada.', tone: 'ok' };
            },
          });
          return { ok: true };
        },
      });
    }
    const jack = this.tool(['levantar-carro']);
    const lug = this.tool(['trocar-pneu']);
    const tireIdx = s.tires.findIndex((t) => t !== null);
    const missing = s.tires.findIndex((t) => t === null);
    out.push({
      label: 'Tirar um pneu',
      enabled: !!jack && !!lug && tireIdx >= 0,
      perform: () => {
        if (!jack || !lug) return { ok: false, message: 'Precisa de macaco e chave de roda.' };
        this.hooks.start({
          id: 'pneu',
          label: 'Tirando o pneu',
          minutes: 20 * this.survivor.skills.speed('mecanica'),
          done: () => {
            const c = this.v.takeTire(prop.id, tireIdx);
            if (c === null) return { ok: false };
            if (!this.inventory.add('pneu', 1)) this.hooks.drop([{ defId: 'pneu', count: 1 }], prop.x, prop.y);
            this.survivor.skills.gain('mecanica', 12);
            return { ok: true, message: `Pneu retirado (${c < 0.15 ? 'furado' : 'bom'}).`, tone: 'ok' };
          },
        });
        return { ok: true };
      },
    });
    if (missing >= 0) {
      const tire = [...this.inventory.stacks()].find((x) => x.def.id === 'pneu');
      out.push({
        label: 'Pôr um pneu',
        enabled: !!tire && !!jack && !!lug,
        perform: () => {
          if (!tire || !jack || !lug) return { ok: false, message: 'Precisa de pneu, macaco e chave de roda.' };
          this.hooks.start({
            id: 'pneu',
            label: 'Colocando o pneu',
            minutes: 25 * this.survivor.skills.speed('mecanica'),
            done: () => {
              tire.container.take(tire.index, 1);
              this.inventory.changed();
              this.v.putTire(prop.id, missing, 0.8);
              return { ok: true, message: 'Pneu no lugar.', tone: 'ok' };
            },
          });
          return { ok: true };
        },
      });
    }
    out.push({ label: 'Examinar o veículo', enabled: true, perform: () => this.examine(prop) });
    return out;
  }

  // ---------------------------------------------------------------- gasolina

  private fuelOptions(prop: PropPlacement): InteractionOption[] {
    const s = this.v.state(prop.id)!;
    const out: InteractionOption[] = [];
    const hose = this.tool(['mangueira']);
    const can = [...this.inventory.stacks()].find((x) => x.def.id === 'galaoVazio' || (x.def.id === 'combustivel' && charge(x.def, x.stack.st) < 0.98));
    out.push({
      label: 'Tirar gasolina (mangueira)',
      enabled: !!hose && !!can && s.fuel > 0.3,
      perform: () => {
        if (!hose || !can) return { ok: false, message: 'Precisa de mangueira e um galão com espaço.' };
        if (s.fuel <= 0.3) return { ok: false, message: 'Tanque seco.' };
        this.hooks.start({
          id: 'sifao',
          label: 'Tirando gasolina',
          minutes: 8,
          done: () => {
            const cur = can.def.id === 'combustivel' ? charge(can.def, can.stack.st) * 5 : 0;
            const got = this.v.siphon(prop.id, 5 - cur);
            can.container.take(can.index, 1);
            const st: ItemState = cur + got < 4.99 ? { ch: (cur + got) / 5 } : {};
            this.inventory.add('combustivel', 1, st);
            // Sifão na boca: um gole de gasolina às vezes.
            if (this.rng() < 0.2) this.survivor.body.sickness = Math.min(1, this.survivor.body.sickness + 0.25);
            return { ok: true, message: `Tirou ${br(got)} L de gasolina.`, tone: 'ok' };
          },
        });
        return { ok: true };
      },
    });
    const full = [...this.inventory.stacks()].find((x) => x.def.id === 'combustivel' && charge(x.def, x.stack.st) > 0.02);
    const spec = VEHICLE_SPECS[prop.type as VehicleType];
    if (full && s.fuel < spec.tankLiters - 0.5) {
      out.push({
        label: 'Abastecer (galão)',
        enabled: true,
        perform: () => {
          this.hooks.start({
            id: 'abastecer',
            label: 'Abastecendo',
            minutes: 4,
            done: () => {
              const liters = charge(full.def, full.stack.st) * 5;
              const put = this.v.refuel(prop.id, liters);
              full.container.take(full.index, 1);
              const left = liters - put;
              if (left > 0.05) this.inventory.add('combustivel', 1, { ch: left / 5 });
              else this.inventory.add('galaoVazio', 1);
              return { ok: true, message: `Pôs ${br(put)} L no tanque.`, tone: 'ok' };
            },
          });
          return { ok: true };
        },
      });
    }
    return out;
  }

  // ---------------------------------------------------------------- examinar e ligar

  examine(prop: PropPlacement): InteractionResult {
    const s = this.v.state(prop.id)!;
    const spec = VEHICLE_SPECS[prop.type as VehicleType];
    const pct = (x: number) => `${Math.round(x * 100)}%`;
    const tires = s.tires.map((t) => (t === null ? 'sem' : t < 0.15 ? 'furado' : pct(t))).join(', ');
    const lines = [
      `Gasolina: ${br(s.fuel)} L de ${spec.tankLiters} L`,
      `Bateria: ${s.battery === null ? 'não tem' : pct(s.battery)}  ·  Motor: ${pct(s.engine)}`,
      `Pneus: ${tires}`,
      `Lataria: ${pct(s.body)}  ·  Vidros quebrados: ${s.broken.length}`,
      Object.values(s.doors).some((d) => d.locked) || s.trunk.locked ? `Trancado${s.alarm ? ' · tem alarme' : ''}` : 'Destrancado',
    ];
    if (s.keyInside) lines.push('A chave está no contato.');
    this.hooks.info(cap(spec.name), lines);
    return { ok: true };
  }

  private tryStart(prop: PropPlacement): InteractionResult {
    const why = this.v.cannotDrive(prop.id, !!this.hasKey(prop.id));
    if (why.length) return { ok: false, message: `Não pega: ${why.join(', ')}.` };
    this.hooks.noise(prop.x, prop.y, 700, 'motor');
    return { ok: true, message: 'O motor pegou! (dirigir chega numa próxima etapa)' };
  }

  // ---------------------------------------------------------------- utilidades

  private hasKey(vehicleId: string): string | null {
    for (const s of this.inventory.stacks()) if (s.def.id === 'chaveCarro' && s.stack.st?.key === vehicleId) return s.def.name;
    return null;
  }

  private tool(tags: readonly string[]) {
    const h = this.inventory.hand;
    const hd = this.inventory.handDef;
    if (h && hd && hd.tags.some((t) => tags.includes(t)) && !isBroken(hd, h.st)) return { hand: true, def: hd, st: h.st, container: null, index: -1 };
    for (const s of this.inventory.stacks()) if (s.def.tags.some((t) => tags.includes(t)) && !isBroken(s.def, s.stack.st)) return { hand: false, def: s.def, st: s.stack.st, container: s.container, index: s.index };
    return null;
  }

  private wear(t: NonNullable<ReturnType<VehicleInteractions['tool']>>, uses: number): void {
    const dur = t.def.tool?.durability ?? t.def.melee?.durability;
    if (!dur || t.def.condition !== 'durable') return;
    const c = Math.max(0, condition(t.st) - uses / dur);
    if (t.hand) this.inventory.updateHand({ ...(t.st ?? {}), c });
    else if (t.container) {
      t.container.updateOne(t.index, { ...(t.st ?? {}), c });
      this.inventory.changed();
    }
  }
}

/** Número com uma casa e vírgula (pt-BR). */
function br(n: number): string {
  return n.toFixed(1).replace('.', ',');
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
