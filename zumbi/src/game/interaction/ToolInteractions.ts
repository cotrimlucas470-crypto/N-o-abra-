/**
 * FERRAMENTAS no mundo (ações com tempo):
 * - Desmontar móveis e objetos (martelo, chave de fenda, pé de cabra...):
 *   rende tábua, prego, parafuso, sucata, peça — conforme o objeto.
 * - Cortar árvore/arbusto (machado): tora, lenha, galho. Quebrar pedra (picareta).
 * - Portas: destrancar com a chave certa, arrombar com pé de cabra
 *   (barulho), trancar por dentro da construção.
 * - Janelas: quebrar, pular (cacos no batente cortam), tirar os cacos.
 * - Cacos no chão: juntar (com vassoura é seguro; com a mão, pode cortar).
 * A ferramenta gasta, a habilidade sobe, o esforço cansa.
 */
import { INTERACTION_TUNING } from '../config/WorldTuning';
import { condition, isBroken, type ItemState } from '../items/condition';
import { itemDef } from '../items/ItemCatalog';
import type { ItemDef } from '../items/ItemTypes';
import type { PlayerInventory } from '../items/PlayerInventory';
import type { TimedActionSpec } from '../sim/Actions';
import type { WorldState } from '../sim/WorldState';
import type { SkillId } from '../skills/Skills';
import type { Survivor } from '../survival/Survivor';
import { propSolids } from '../world/collision';
import { doorLabel } from '../world/doors';
import type { DoorPlacement, PropPlacement, WallPiece } from '../world/MapTypes';
import { PROP_DURABILITY, type Yield } from '../world/PropDurability';
import { buildingAtPoint } from '../world/shelter';
import type { InteractionCandidate, InteractionOption, InteractionProvider, InteractionResult, Interactor } from './InteractionSystem';

export interface WorldActionHooks {
  start(spec: TimedActionSpec): void;
  /** Larga itens no chão num ponto. */
  drop(items: readonly { defId: string; count: number; st?: ItemState }[], x: number, y: number): void;
  noise(x: number, y: number, radius: number, source: string): void;
  /** Coloca o jogador em outro ponto (pular janela). */
  moveTo(x: number, y: number): void;
  now(): number;
  rng?: () => number;
}

interface ToolRef {
  where: 'hand' | 'inv';
  def: ItemDef;
  st: ItemState | undefined;
  /** Para desgastar. */
  apply(st: ItemState): void;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Distância da borda do objeto. */
function edge(p: PropPlacement, x: number, y: number): number {
  let best = Infinity;
  for (const s of propSolids(p)) {
    const d = s.kind === 'circle' ? Math.hypot(x - s.x, y - s.y) - s.r : Math.hypot(Math.max(s.x - x, 0, x - (s.x + s.w)), Math.max(s.y - y, 0, y - (s.y + s.h)));
    best = Math.min(best, d);
  }
  return best === Infinity ? Math.hypot(p.x - x, p.y - y) : best;
}

export class ToolInteractions implements InteractionProvider {
  constructor(
    private readonly state: WorldState,
    private readonly inventory: PlayerInventory,
    private readonly survivor: Survivor,
    private readonly hooks: WorldActionHooks,
  ) {}

  private rng(): number {
    return (this.hooks.rng ?? Math.random)();
  }

  /** Melhor ferramenta (não quebrada) com alguma das etiquetas: primeiro a da mão. */
  tool(tags: readonly string[]): ToolRef | null {
    const inv = this.inventory;
    const h = inv.hand;
    const hd = inv.handDef;
    if (h && hd && hd.tags.some((t) => tags.includes(t)) && !isBroken(hd, h.st)) return { where: 'hand', def: hd, st: h.st, apply: (st) => inv.updateHand(st) };
    for (const s of inv.stacks()) {
      if (s.def.tags.some((t) => tags.includes(t)) && !isBroken(s.def, s.stack.st)) {
        const c = s.container;
        const i = s.index;
        return { where: 'inv', def: s.def, st: s.stack.st, apply: (st) => (c.updateOne(i, st), inv.changed()) };
      }
    }
    return null;
  }

  /** Desgasta a ferramenta por um uso (tool.durability usos quando nova). */
  private wear(t: ToolRef, uses = 1): string | null {
    const dur = t.def.tool?.durability ?? t.def.melee?.durability;
    if (!dur || t.def.condition !== 'durable') return null;
    const c = Math.max(0, condition(t.st) - uses / dur);
    t.apply({ ...(t.st ?? {}), c });
    return c <= 0 ? `${t.def.name} quebrou.` : null;
  }

  private speed(skill?: string): number {
    const s = skill ? this.survivor.skills.speed(skill as SkillId) : 1;
    return s * this.survivor.effects().actionTime;
  }

  /** Coloca o que rendeu no inventário; o que não couber cai aos pés. */
  private give(yields: readonly Yield[], x: number, y: number): string {
    const dropped: { defId: string; count: number }[] = [];
    const got: string[] = [];
    for (const yl of yields) {
      const n = this.inventory.add(yl.item, yl.n);
      if (n < yl.n) dropped.push({ defId: yl.item, count: yl.n - n });
      if (yl.n > 0) got.push(`${yl.n} ${itemDef(yl.item)?.name.toLowerCase() ?? yl.item}`);
    }
    if (dropped.length) this.hooks.drop(dropped, x, y);
    return got.join(', ') + (dropped.length ? ' (parte ficou no chão)' : '');
  }

  // ---------------------------------------------------------------- objetos

  collect(who: Interactor, out: InteractionCandidate[]): void {
    for (const { prop } of this.state.propsNear(who.x, who.y, 150)) {
      const dur = PROP_DURABILITY[prop.type];
      if (!dur) continue;
      const d = edge(prop, who.x, who.y) - who.radius;
      if (d > INTERACTION_TUNING.doorReach) continue;
      const opts = this.propOptions(prop);
      if (!opts.length) continue;
      const main = opts.find((o) => o.enabled) ?? opts[0]!;
      out.push({
        target: { key: `ferramenta:${prop.id}`, kind: 'tool', x: prop.x, y: prop.y, radius: 26, verb: main.label.split(' ')[0]!.toUpperCase(), label: main.label, enabled: main.enabled },
        // Abrir, colher, sentar ganham quando estão igualmente perto: ferramenta fica no "⋯".
        distance: d + 45,
        perform: () => main.perform(),
        more: () => opts.filter((o) => o !== main),
      });
    }
    // Cacos no chão.
    const g = this.state.glassNear(who.x, who.y, 30);
    if (g) {
      out.push({
        target: { key: `cacos:${g.key}`, kind: 'glass', x: g.x, y: g.y, radius: 18, verb: 'JUNTAR', label: 'Juntar cacos de vidro', enabled: true },
        distance: Math.hypot(g.x - who.x, g.y - who.y) + 20,
        perform: () => this.sweep(g),
      });
    }
  }

  private containerFull(prop: PropPlacement): boolean {
    for (const suffix of ['', ':luvas', ':malas']) {
      const c = this.state.loot.peek(prop.id + suffix, true);
      if (c && !c.isEmpty) return true;
    }
    return false;
  }

  propOptions(prop: PropPlacement): InteractionOption[] {
    const dur = PROP_DURABILITY[prop.type]!;
    const out: InteractionOption[] = [];
    if (dur.dismantle) {
      const t = this.tool(dur.dismantle.tools);
      const full = this.state.loot.ref(prop.id) ? this.containerFull(prop) : false;
      out.push({
        label: `Desmontar ${dur.name}`,
        enabled: !!t && !full,
        perform: () => {
          if (full) return { ok: false, message: 'Esvazie antes de desmontar.' };
          if (!t) return { ok: false, message: `Precisa de ${dur.dismantle!.tools.includes('martelar') ? 'martelo' : 'chave de fenda'} (ou pé de cabra).` };
          return this.dismantle(prop, t);
        },
      });
    }
    if (dur.cut) {
      const t = this.tool(['cortar-lenha']);
      out.push({ label: `Cortar ${dur.name}`, enabled: !!t, perform: () => (t ? this.cut(prop, t) : { ok: false, message: 'Precisa de machado ou machadinha.' }) });
    }
    if (dur.mine) {
      const t = this.tool(['quebrar-pedra']);
      out.push({ label: `Quebrar ${dur.name}`, enabled: !!t, perform: () => (t ? this.mine(prop, t) : { ok: false, message: 'Precisa de picareta.' }) });
    }
    return out;
  }

  private dismantle(prop: PropPlacement, t: ToolRef): InteractionResult {
    const dur = PROP_DURABILITY[prop.type]!;
    const dm = dur.dismantle!;
    const skill = dm.skill as SkillId | undefined;
    this.hooks.start({
      id: 'desmontar',
      label: `Desmontando ${dur.name}`,
      minutes: dm.minutes * this.speed(skill),
      done: () => {
        if (this.state.isPropRemoved(prop.id)) return { ok: false };
        const leftovers = this.state.removeProp(prop.id);
        if (leftovers.length) this.hooks.drop(leftovers, prop.x, prop.y);
        // Habilidade rende mais (nível 3+: uma tábua/peça a mais no primeiro item).
        const lvl = skill ? this.survivor.skills.level(skill) : 0;
        const yields = dm.yields.map((yl, i) => (i === 0 && lvl >= 3 ? { item: yl.item, n: yl.n + 1 } : yl));
        const got = this.give(yields, prop.x, prop.y);
        const broke = this.wear(t, 3);
        if (skill) this.gainXp(skill, 12);
        this.hooks.noise(prop.x, prop.y, 260, 'desmonte');
        this.survivor.body.fatigue = Math.min(100, this.survivor.body.fatigue + dm.minutes / 60 * 4);
        return { ok: true, message: `Desmontou: ${got}.${broke ? ` ${broke}` : ''}`, tone: 'ok' };
      },
    });
    return { ok: true };
  }

  private cut(prop: PropPlacement, t: ToolRef): InteractionResult {
    const dur = PROP_DURABILITY[prop.type]!;
    const minutes = dur.cut!.minutes * this.speed() / (0.5 + 0.5 * condition(t.st));
    this.hooks.start({
      id: 'cortar',
      label: `Cortando ${dur.name}`,
      minutes,
      done: () => {
        if (this.state.isPropRemoved(prop.id)) return { ok: false };
        this.state.removeProp(prop.id);
        this.hooks.drop(dur.cut!.yields.map((y) => ({ defId: y.item, count: y.n })), prop.x, prop.y);
        const broke = this.wear(t, 8);
        this.hooks.noise(prop.x, prop.y, 380, 'machado');
        this.survivor.body.fatigue = Math.min(100, this.survivor.body.fatigue + minutes / 60 * 8);
        return { ok: true, message: `${cap(dur.name)} no chão: madeira aos pés.${broke ? ` ${broke}` : ''}`, tone: 'ok' };
      },
    });
    return { ok: true };
  }

  private mine(prop: PropPlacement, t: ToolRef): InteractionResult {
    const dur = PROP_DURABILITY[prop.type]!;
    const minutes = dur.mine!.minutes * this.speed() / (0.5 + 0.5 * condition(t.st));
    this.hooks.start({
      id: 'quebrar',
      label: `Quebrando ${dur.name}`,
      minutes,
      done: () => {
        if (this.state.isPropRemoved(prop.id)) return { ok: false };
        this.state.removeProp(prop.id);
        this.hooks.drop(dur.mine!.yields.map((y) => ({ defId: y.item, count: y.n })), prop.x, prop.y);
        const broke = this.wear(t, 10);
        this.hooks.noise(prop.x, prop.y, 420, 'picareta');
        this.survivor.body.fatigue = Math.min(100, this.survivor.body.fatigue + minutes / 60 * 10);
        return { ok: true, message: `Pedra quebrada.${broke ? ` ${broke}` : ''}`, tone: 'ok' };
      },
    });
    return { ok: true };
  }

  private gainXp(skill: SkillId, xp: number): void {
    this.survivor.skills.gain(skill, xp);
  }

  private sweep(g: { x: number; y: number; key: string }): InteractionResult {
    const broom = this.tool(['cabo']);
    this.hooks.start({
      id: 'cacos',
      label: broom ? 'Varrendo os cacos' : 'Juntando cacos com a mão',
      minutes: broom ? 3 : 5,
      done: () => {
        this.state.clearGlass(g.key);
        let msg = 'Cacos juntados.';
        if (!broom && this.rng() > this.inventory.protection(['maos']).scratch * 2) {
          this.survivor.health.add(this.rng() < 0.5 ? 'maoE' : 'maoD', 'arranhao', 0.3);
          msg = 'Juntou os cacos. Cortou o dedo.';
        }
        this.inventory.add('cacoVidro', 2) || this.hooks.drop([{ defId: 'cacoVidro', count: 2 }], g.x, g.y);
        return { ok: true, message: msg, tone: 'info' };
      },
    });
    return { ok: true };
  }

  // ---------------------------------------------------------------- portas

  /** Ações extras de uma porta (menu "⋯"). */
  doorOptions(d: DoorPlacement, who: Interactor): InteractionOption[] {
    const s = this.state.doorState(d.id);
    if (!s || s.broken) return [];
    const out: InteractionOption[] = [];
    const name = doorLabel(d);
    if (s.locked) {
      const key = this.keyFor(d);
      if (key) out.push({ label: `Destrancar (${key})`, enabled: true, perform: () => (this.state.unlockDoor(d.id), { ok: true, message: 'Destrancada.' }) });
      const bar = this.tool(['arrombar', 'alavanca']);
      out.push({
        label: `Arrombar ${name}`,
        enabled: !!bar && d.material !== 'metal',
        perform: () => {
          if (!bar) return { ok: false, message: 'Precisa de pé de cabra.' };
          if (d.material === 'metal') return { ok: false, message: 'Metal demais para arrombar. Tente outra entrada.' };
          this.hooks.start({
            id: 'arrombar',
            label: `Arrombando a ${name}`,
            minutes: 4 * this.speed(),
            done: () => {
              this.state.unlockDoor(d.id);
              this.state.setDoorOpen(d.id, true);
              const broke = this.wear(bar, 6);
              this.hooks.noise(d.x, d.y, 420, 'arrombamento');
              return { ok: true, message: `Arrombou a ${name}.${broke ? ` ${broke}` : ''}`, tone: 'ok' };
            },
          });
          return { ok: true };
        },
      });
    } else if (!s.open && d.exterior && d.buildingId) {
      // Trancar por dentro (a tranca de dentro não precisa de chave).
      const inside = buildingAtPoint(this.state.model, who.x, who.y)?.id === d.buildingId;
      if (inside) out.push({ label: `Trancar a ${name}`, enabled: true, perform: () => (this.state.setDoorLocked(d.id, true), { ok: true, message: 'Trancada por dentro.' }) });
    }
    return out;
  }

  /** Tem a chave desta porta? Devolve o nome da chave. */
  private keyFor(d: DoorPlacement): string | null {
    if (!d.buildingId) return null;
    for (const s of this.inventory.stacks()) if (s.def.tags.includes('chave') && s.stack.st?.key === d.buildingId) return s.def.name.toLowerCase();
    return null;
  }
}

// ---------------------------------------------------------------- janelas

export class WindowInteractions implements InteractionProvider {
  constructor(
    private readonly state: WorldState,
    private readonly inventory: PlayerInventory,
    private readonly survivor: Survivor,
    private readonly hooks: WorldActionHooks,
  ) {}

  private rng(): number {
    return (this.hooks.rng ?? Math.random)();
  }

  collect(who: Interactor, out: InteractionCandidate[]): void {
    for (const w of this.state.windowsNear(who.x, who.y, 40 + who.radius)) {
      const broken = this.state.isWindowBroken(w.id);
      const cx = w.wall.x + w.wall.w / 2;
      const cy = w.wall.y + w.wall.h / 2;
      const opts: InteractionOption[] = [];
      if (broken) {
        opts.push({ label: 'Pular a janela', enabled: true, perform: () => this.climb(w.wall, w.id, who) });
        if (this.state.windowHasShards(w.id)) opts.push({ label: 'Tirar cacos da janela', enabled: true, perform: () => this.clearShards(w.id) });
      } else {
        opts.push({ label: 'Quebrar a janela', enabled: true, perform: () => this.smash(w.wall) });
      }
      const main = opts[0]!;
      out.push({
        target: { key: `janela:${w.id}`, kind: 'window', x: cx, y: cy, rect: { x: w.wall.x, y: w.wall.y, w: w.wall.w, h: w.wall.h }, verb: main.label.split(' ')[0]!.toUpperCase(), label: main.label, enabled: true },
        // Janela quebrada é passagem (vale como porta); inteira, só se nada melhor.
        distance: w.distance - who.radius + (broken ? 5 : 40),
        perform: () => main.perform(),
        more: () => opts.slice(1),
      });
    }
  }

  private smash(wall: WallPiece): InteractionResult {
    const cx = wall.x + wall.w / 2;
    const cy = wall.y + wall.h / 2;
    const hasWeapon = !!this.inventory.handDef;
    this.state.breakWindow(wall);
    this.hooks.noise(cx, cy, 520, 'vidro');
    if (!hasWeapon && this.rng() > this.inventory.protection(['maos']).scratch * 1.5) {
      this.survivor.health.add(this.rng() < 0.5 ? 'maoE' : 'maoD', 'corte', 0.35 + this.rng() * 0.3);
      return { ok: true, message: 'Quebrou com a mão e se cortou.' };
    }
    return { ok: true, message: 'A janela estourou.' };
  }

  private clearShards(id: string): InteractionResult {
    this.hooks.start({
      id: 'cacos',
      label: 'Tirando os cacos do batente',
      minutes: 4,
      done: () => {
        this.state.clearWindowShards(id);
        return { ok: true, message: 'Batente limpo: dá para passar sem se cortar.', tone: 'ok' };
      },
    });
    return { ok: true };
  }

  private climb(wall: WallPiece, id: string, who: Interactor): InteractionResult {
    const vertical = wall.h > wall.w;
    const cx = wall.x + wall.w / 2;
    const cy = wall.y + wall.h / 2;
    const th = (vertical ? wall.w : wall.h) / 2 + 26;
    const tx = vertical ? (who.x < cx ? cx + th : cx - th) : Math.min(Math.max(who.x, wall.x + 16), wall.x + wall.w - 16);
    const ty = vertical ? Math.min(Math.max(who.y, wall.y + 16), wall.y + wall.h - 16) : who.y < cy ? cy + th : cy - th;
    this.hooks.start({
      id: 'pular',
      label: 'Pulando a janela',
      minutes: 1,
      realSeconds: 1.2,
      done: () => {
        this.hooks.moveTo(tx, ty);
        if (this.state.windowHasShards(id) && this.rng() < 0.6 * (1 - this.inventory.protection(['tronco-externo']).scratch)) {
          const part = this.rng() < 0.5 ? (this.rng() < 0.5 ? 'bracoE' : 'bracoD') : this.rng() < 0.5 ? 'pernaE' : 'pernaD';
          this.survivor.health.add(part, this.rng() < 0.3 ? 'laceracao' : 'corte', 0.3 + this.rng() * 0.4);
          return { ok: true, message: 'Passou — e os cacos cortaram.', tone: 'bad' };
        }
        return { ok: true, message: 'Passou pela janela.', tone: 'info' };
      },
    });
    return { ok: true };
  }
}

/** Nome de ferramenta por etiqueta (mensagens). */
export function toolName(def: ItemDef | null): string {
  return def?.name.toLowerCase() ?? 'ferramenta';
}
