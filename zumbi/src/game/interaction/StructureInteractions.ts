/**
 * Interação com o que o jogador montou:
 * - fogueira e fogão a lenha: acender (isqueiro/fósforo; papel ou capim
 *   ajudam, álcool garante), pôr lenha, apagar, cozinhar (abre FABRICAR);
 * - porta: abrir/fechar, pôr/tirar cadeado;
 * - cama e cadeira: dormir, descansar;
 * - canteiro: plantar, regar, adubar, colher, limpar;
 * - coletor de chuva: encher garrafas e baldes (água de chuva: ferva);
 * - qualquer peça: DESMONTAR com a ferramenta certa (devolve material) ou
 *   DERRUBAR com marreta/machado (devolve menos). Parede, janela, piso e
 *   telhado só oferecem isso com a ferramenta NA MÃO, para o botão de
 *   interagir não ficar aparecendo em toda parede.
 * Móveis com gaveta/prateleira abrem pelo sistema de recipientes.
 */
import { BUILD_TUNING } from '../config/BuildTuning';
import { cropStage, harvest, plant, plotLabel, waterPlot } from '../build/Farm';
import { rectOf } from '../build/StructureGeometry';
import { itemDef } from '../items/ItemCatalog';
import type { SleepPlace } from '../survival/Sleep';
import type { Survivor } from '../survival/Survivor';
import { Flag, type ItemState } from '../items/condition';
import { findTool, giveItems, type ToolHandle } from './toolUse';
import { addFuel, extinguish, fireLabel, fuelLeft, fuelMinutes, ignite, isAccelerant, isBurning, isTinder } from '../build/Fire';
import { STRUCTURE_DEFS, type StructureDef } from '../build/StructureCatalog';
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
  sleep?(place: SleepPlace): InteractionResult;
  rest?(where: string): InteractionResult;
  noise?(x: number, y: number, radius: number, source: string): void;
  drop?(defId: string, count: number, st: ItemState | undefined, x: number, y: number): void;
}

/** "a fogueira" / "o fogão a lenha". */
function the(d: StructureDef): string {
  return `${d.masc ? 'o' : 'a'} ${d.name.toLowerCase()}`;
}
function inThe(d: StructureDef): string {
  return `${d.masc ? 'no' : 'na'} ${d.name.toLowerCase()}`;
}

/** Ferramentas que derrubam qualquer coisa (devolve menos material). */
const SMASH = ['demolir', 'derrubar-parede'];

/** Ordem de preferência do que pôr no fogo (lenha primeiro, pano por último). */
function fuelRank(d: ItemDef): number {
  if (d.id === 'lenha') return 0;
  if (d.id === 'tora') return 1;
  if (d.tags.includes('lenha') || (d.tags.includes('madeira') && !d.tags.includes('tabua'))) return 2;
  // Tábua serve para construir: só depois do galho.
  if (d.tags.includes('tabua')) return 4;
  if (isTinder(d)) return 5;
  return 6;
}

export class StructureInteractions implements InteractionProvider {
  constructor(
    private readonly state: WorldState,
    private readonly inventory: PlayerInventory,
    private readonly survivor: Survivor,
    private readonly hooks: StructureHooks,
  ) {}

  collect(who: Interactor, out: InteractionCandidate[]): void {
    for (const s of this.state.structures.near(who.x, who.y, 200)) {
      const def = STRUCTURE_DEFS[s.type];
      const r = rectOf(s);
      const d = Math.hypot(Math.max(r.x - who.x, 0, who.x - (r.x + r.w)), Math.max(r.y - who.y, 0, who.y - (r.y + r.h))) - who.radius;
      if (d > 44) continue;
      const c = def.fire ? this.fireCandidate(s, d) : this.candidate(s, def, d);
      if (c) out.push(c);
    }
  }

  // ---------------------------------------------------------------- genérico

  private target(s: Structure, verb: string, label: string, enabled: boolean) {
    const r = rectOf(s);
    return { key: `estrutura:${s.id}`, kind: 'structure', x: s.x, y: s.y, rect: r, verb, label, enabled };
  }

  private candidate(s: Structure, d: StructureDef, dist: number): InteractionCandidate | null {
    const opts: InteractionOption[] = [];
    let main: InteractionOption | null = null;
    let bonus = 0;
    if (d.kind === 'porta') {
      main = { label: s.open ? `Fechar ${the(d)}` : `Abrir ${the(d)}`, enabled: true, perform: () => this.toggleDoor(s) };
      opts.push(s.locked ? { label: 'Tirar o cadeado', enabled: true, perform: () => this.padlock(s, false) } : { label: 'Pôr cadeado', enabled: !s.open && this.inventory.countOf('cadeado') > 0, perform: () => this.padlock(s, true) });
      bonus = 0;
    } else if (d.seat) {
      if (d.seat.sleep) {
        main = { label: `Dormir ${inThe(d)}`, enabled: true, perform: () => this.hooks.sleep?.(d.seat!.sleep!) ?? { ok: false } };
        opts.push({ label: `Descansar ${inThe(d)}`, enabled: true, perform: () => this.hooks.rest?.(inThe(d)) ?? { ok: false } });
      } else main = { label: `Sentar ${inThe(d)}`, enabled: true, perform: () => this.hooks.rest?.(inThe(d)) ?? { ok: false } };
      bonus = 24;
    } else if (d.farm) {
      const f = this.farmOptions(s);
      main = f[0] ?? null;
      opts.push(...f.slice(1));
      bonus = 10;
    } else if (d.water) {
      const n = this.fillable();
      const w = Math.floor(s.water ?? 0);
      main = { label: w > 0 ? `Encher recipientes (${w} doses de chuva)` : 'Coletor de chuva vazio', enabled: w > 0 && n > 0, perform: () => this.fillFromCollector(s) };
      bonus = 10;
    }
    // Desmontar/derrubar: sempre no "⋯"; como ação principal só com a ferramenta na mão.
    const tools = this.dismantleOptions(s, d);
    opts.push(...tools);
    const handTool = tools.find((o) => o.enabled && this.toolInHand(d));
    if (!main) {
      // Parede, janela, piso, telhado, móvel com gaveta: só aparece com ferramenta na mão.
      if (!handTool) return null;
      main = handTool;
      bonus = 30;
    }
    const first = main;
    return {
      target: this.target(s, first.label.split(' ')[0]!.toUpperCase(), first.label, first.enabled),
      distance: dist + bonus,
      perform: () => first.perform(),
      more: () => [...(d.farm || d.water ? [{ label: d.farm ? plotLabel(s, this.hooks.minutes()) : `Coletor: ${Math.floor(s.water ?? 0)}/${d.water!.max} doses`, enabled: false, perform: () => ({ ok: false }) }] : []), ...opts.filter((o) => o !== first)],
    };
  }

  private toolInHand(d: StructureDef): boolean {
    const tags = [...(d.dismantleTools ?? []), ...SMASH];
    return !!findTool(this.inventory, tags, true);
  }

  private dismantleOptions(s: Structure, d: StructureDef): InteractionOption[] {
    const out: InteractionOption[] = [];
    const proper = d.dismantleTools ? findTool(this.inventory, d.dismantleTools) : null;
    if (d.dismantleTools) {
      out.push({
        label: `Desmontar ${the(d)}`,
        enabled: !!proper,
        perform: () => (proper ? this.takeDown(s, d, proper, false) : { ok: false, message: 'Precisa da ferramenta certa (martelo, pé de cabra, chave de fenda...).' }),
      });
    }
    const smash = findTool(this.inventory, SMASH);
    if (smash && d.kind !== 'canteiro') out.push({ label: `Derrubar ${the(d)}`, enabled: true, perform: () => this.takeDown(s, d, smash, true) });
    return out;
  }

  /** Desmontar (devolve material) ou derrubar (devolve menos, faz mais barulho). */
  private takeDown(s: Structure, d: StructureDef, tool: ToolHandle, smash: boolean): InteractionResult {
    if (d.fire && isBurning(s, this.hooks.minutes())) return { ok: false, message: 'Apague o fogo antes.' };
    const base = d.dismantleMinutes ?? 10;
    const minutes = Math.max(2, Math.round((smash ? base * 0.6 : base) / Math.max(0.3, this.survivor.skills.speed('carpintaria')) * this.survivor.effects().actionTime));
    this.hooks.start({
      id: smash ? 'derrubar' : 'desmontar',
      label: `${smash ? 'Derrubando' : 'Desmontando'} ${the(d)}`,
      minutes,
      done: () => {
        if (!this.state.structures.get(s.id)) return { ok: false, message: 'Já não está aí.' };
        const broke = tool.wear(smash ? 4 : 2);
        this.state.removeStructure(s.id);
        const k = smash ? BUILD_TUNING.smashSalvage : 1;
        const items = (d.salvage ?? []).map((x) => ({ id: x.id, n: Math.floor(x.n * k) })).filter((x) => x.n > 0);
        const got = giveItems(this.inventory, items, (id, n) => this.hooks.drop?.(id, n, undefined, s.x, s.y), (id) => itemDef(id)?.name ?? id);
        this.hooks.noise?.(s.x, s.y, smash ? BUILD_TUNING.demolishNoise * 0.6 : BUILD_TUNING.hammerNoise, smash ? 'demolição' : 'martelo');
        this.survivor.skills.gain('carpintaria', smash ? 1 : 2);
        const what = `${d.name} ${smash ? 'derrubad' : 'desmontad'}${d.masc ? 'o' : 'a'}.`;
        return { ok: true, message: `${what}${got ? ` +${got}` : ''}${broke ? ` ${broke}` : ''}`, tone: 'ok' };
      },
    });
    return { ok: true };
  }

  // ---------------------------------------------------------------- porta

  private toggleDoor(s: Structure): InteractionResult {
    if (!s.open && s.locked) return { ok: false, message: 'Trancada com cadeado. Tire o cadeado para abrir.' };
    if (s.open) {
      s.open = undefined;
      delete s.open;
    } else s.open = 1;
    this.state.structures.changed(s);
    return { ok: true };
  }

  private padlock(s: Structure, lock: boolean): InteractionResult {
    if (lock) {
      if (s.open) return { ok: false, message: 'Feche a porta antes.' };
      const c = [...this.inventory.stacks()].find((x) => x.def.id === 'cadeado');
      if (!c) return { ok: false, message: 'Precisa de um cadeado.' };
      c.container.take(c.index, 1);
      this.inventory.changed();
      s.locked = 1;
    } else {
      delete s.locked;
      if (this.inventory.add('cadeado', 1) < 1) this.hooks.drop?.('cadeado', 1, undefined, s.x, s.y);
    }
    this.state.structures.changed(s);
    return { ok: true, message: lock ? 'Cadeado posto.' : 'Cadeado tirado.' };
  }

  // ---------------------------------------------------------------- horta

  private seeds(): ItemDef[] {
    const seen = new Map<string, ItemDef>();
    for (const x of this.inventory.stacks()) if (x.def.seed && !seen.has(x.def.id)) seen.set(x.def.id, x.def);
    return [...seen.values()];
  }

  private farmOptions(s: Structure): InteractionOption[] {
    const now = this.hooks.minutes();
    const stage = cropStage(s, now);
    const out: InteractionOption[] = [];
    if (stage === 'vazio') {
      const seeds = this.seeds();
      if (!seeds.length) out.push({ label: 'Canteiro vazio (precisa de sementes)', enabled: false, perform: () => ({ ok: false, message: 'Sem sementes na bolsa.' }) });
      for (const sd of seeds.slice(0, 4)) out.push({ label: `Plantar ${sd.name.toLowerCase().replace(/^sementes de |^rama de /, '')}`, enabled: true, perform: () => this.plantSeed(s, sd.id) });
      return out;
    }
    if (stage === 'madura' || stage === 'passou') out.push({ label: 'Colher', enabled: true, perform: () => this.harvestPlot(s) });
    if (stage === 'morta') out.push({ label: 'Limpar o canteiro', enabled: true, perform: () => this.harvestPlot(s) });
    if (stage !== 'morta') {
      const hasWater = [...this.inventory.stacks()].some((x) => x.def.tags.includes('agua') && x.def.condition === 'drink' && doses(x.def, x.stack.st) > 0);
      out.push({ label: 'Regar', enabled: hasWater, perform: () => this.waterIt(s) });
      if (!s.crop?.fert) out.push({ label: 'Adubar', enabled: this.inventory.hasTag('adubo'), perform: () => this.fertilize(s) });
      if (stage !== 'madura' && stage !== 'passou') out.push({ label: 'Arrancar a planta', enabled: true, perform: () => this.harvestPlot(s) });
    }
    return out;
  }

  private plantSeed(s: Structure, seedId: string): InteractionResult {
    this.hooks.start({
      id: 'plantar',
      label: 'Plantando',
      minutes: 10,
      done: () => {
        const st = [...this.inventory.stacks()].find((x) => x.def.id === seedId);
        if (!st) return { ok: false, message: 'Acabaram as sementes.' };
        if (!plant(s, seedId, this.hooks.minutes())) return { ok: false, message: 'Já tem planta aí.' };
        st.container.take(st.index, 1);
        this.inventory.changed();
        this.state.structures.changed(s);
        this.survivor.skills.gain('agricultura', 3);
        return { ok: true, message: 'Plantado. Regue (ou torça por chuva).', tone: 'ok' };
      },
    });
    return { ok: true };
  }

  private waterIt(s: Structure): InteractionResult {
    const w = [...this.inventory.stacks()].find((x) => x.def.tags.includes('agua') && x.def.condition === 'drink' && doses(x.def, x.stack.st) > 0);
    if (!w) return { ok: false, message: 'Precisa de água.' };
    const left = doses(w.def, w.stack.st) - 1;
    if (left <= 0) {
      w.container.take(w.index, 1);
      const empty = emptyAfter(w.def);
      if (empty) this.inventory.add(empty, 1);
    } else w.container.updateOne(w.index, { ...(w.stack.st ?? {}), open: 1, dose: left });
    this.inventory.changed();
    waterPlot(s, this.hooks.minutes());
    this.state.structures.changed(s);
    this.survivor.skills.gain('agricultura', 1);
    return { ok: true, message: 'Regado.' };
  }

  private fertilize(s: Structure): InteractionResult {
    const a = [...this.inventory.stacks()].find((x) => x.def.tags.includes('adubo'));
    if (!a || !s.crop) return { ok: false, message: 'Precisa de adubo.' };
    a.container.take(a.index, 1);
    this.inventory.changed();
    s.crop.fert = 1;
    this.state.structures.changed(s);
    return { ok: true, message: 'Adubado: cresce mais rápido e rende mais.' };
  }

  private harvestPlot(s: Structure): InteractionResult {
    const items = harvest(s, this.hooks.rng ?? Math.random);
    this.state.structures.changed(s);
    if (!items.length) return { ok: true, message: 'Canteiro limpo.' };
    const now = this.hooks.minutes() / 1440;
    const got: string[] = [];
    for (const it of items) {
      const def = itemDef(it.id);
      const st: ItemState | undefined = def?.condition === 'perishable' ? { born: now } : undefined;
      const n = this.inventory.add(it.id, it.n, st);
      if (n < it.n) this.hooks.drop?.(it.id, it.n - n, st, s.x, s.y);
      got.push(`${it.n} ${def?.name.toLowerCase() ?? it.id}`);
    }
    this.survivor.skills.gain('agricultura', 6);
    return { ok: true, message: `Colheu: ${got.join(', ')}` };
  }

  // ---------------------------------------------------------------- coletor

  private fillable(): number {
    let n = 0;
    for (const x of this.inventory.stacks()) if (['garrafaPet', 'garrafaVazia', 'garrafaVidro', 'balde'].includes(x.def.id)) n += x.stack.count;
    return n;
  }

  /** Enche garrafas e baldes vazios com a água do coletor (suja: ferva). (Público para testes.) */
  fillFromCollector(s: Structure): InteractionResult {
    let water = Math.floor(s.water ?? 0);
    if (water <= 0) return { ok: false, message: 'O coletor está vazio.' };
    let filled = 0;
    for (let guard = 0; guard < 100 && water > 0; guard++) {
      const x = [...this.inventory.stacks()].find((y) => ['garrafaPet', 'garrafaVazia', 'garrafaVidro', 'balde'].includes(y.def.id));
      if (!x) break;
      const bucket = x.def.id === 'balde';
      const outId = bucket ? 'baldeAgua' : 'aguaSuja';
      const give = Math.min(itemDef(outId)?.drink?.doses ?? 2, water);
      x.container.take(x.index, 1);
      const st: ItemState = { open: 1, dose: give, ...(bucket ? { f: Flag.Contaminado } : {}) };
      if (x.container.add(outId, 1, st) < 1 && this.inventory.add(outId, 1, st) < 1) this.hooks.drop?.(outId, 1, st, s.x, s.y);
      water -= give;
      filled++;
    }
    this.inventory.changed();
    if (!filled) return { ok: false, message: 'Nenhuma garrafa ou balde vazio.' };
    s.water = Math.max(0, water);
    this.state.structures.changed(s);
    return { ok: true, message: `Encheu ${filled}. Água de chuva: ferva ou trate antes de beber.` };
  }

  // ---------------------------------------------------------------- fogueira

  private fireCandidate(s: Structure, d: number): InteractionCandidate {
    const now = this.hooks.minutes();
    const lit = isBurning(s, now);
    const fuel = this.bestFuel();
    const left = fuelLeft(s, now);
    const def = STRUCTURE_DEFS[s.type];
    let verb: string;
    let label: string;
    let enabled: boolean;
    let perform: () => InteractionResult;
    if (lit) {
      verb = 'LENHA';
      label = fuel ? `Pôr ${fuel.def.name.toLowerCase()} ${inThe(def)}` : `${def.name} ${def.masc ? 'aceso' : 'acesa'} · sem lenha na bolsa`;
      enabled = !!fuel;
      perform = () => this.feed(s);
    } else if (left > 0) {
      verb = 'ACENDER';
      label = `Acender ${the(def)}`;
      enabled = hasLighter(this.inventory);
      perform = () => (enabled ? this.light(s) : { ok: false, message: 'Precisa de isqueiro ou fósforo.' });
    } else {
      verb = 'LENHA';
      label = fuel ? `Pôr ${fuel.def.name.toLowerCase()} ${inThe(def)}` : `${def.name} sem lenha`;
      enabled = !!fuel;
      perform = () => this.feed(s);
    }
    return {
      target: this.target(s, verb, label, enabled),
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
    const d = STRUCTURE_DEFS[s.type];
    if (lit) {
      out.push({ label: 'Cozinhar aqui (abre FABRICAR)', enabled: true, perform: () => (this.hooks.openCraft(), { ok: true }) });
      out.push({ label: `Apagar ${the(d)}`, enabled: true, perform: () => this.putOut(s) });
    } else {
      if (fuelLeft(s, now) > 0) out.push({ label: `Acender ${the(d)}`, enabled: hasLighter(this.inventory), perform: () => this.light(s) });
      if (d.solid) out.push(...this.dismantleOptions(s, d));
      else out.push({ label: `Desmontar ${the(d)}`, enabled: true, perform: () => this.dismantle(s) });
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
    if (fuelLeft(s, now) >= fire.maxFuel - 5) return { ok: false, message: 'Já está cheio de lenha.' };
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
    return { ok: true, message: 'Fogo apagado. A lenha que sobrou fica.' };
  }

  private dismantle(s: Structure): InteractionResult {
    if (isBurning(s, this.hooks.minutes())) return { ok: false, message: 'Apague antes.' };
    const left = fuelLeft(s, this.hooks.minutes());
    this.state.removeStructure(s.id);
    // A lenha que não queimou volta como lenha (arredondando para baixo).
    const back = Math.floor(left / 60);
    if (back > 0) this.inventory.add('lenha', back);
    return { ok: true, message: back > 0 ? `Fogueira desmontada (+${back} lenha).` : 'Fogueira desmontada.' };
  }
}
