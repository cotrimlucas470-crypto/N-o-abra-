/**
 * FABRICAÇÃO (puro): confere se dá para fazer uma receita com o que o
 * jogador carrega e, na hora de terminar, gasta os ingredientes, desgasta as
 * ferramentas e entrega o resultado.
 *
 * A conferência simula o consumo unidade por unidade (reserva), então dois
 * ingredientes nunca contam o mesmo item, e garrafa pela metade é gasta
 * antes da cheia. Comida estragada não "renasce" cozida: o prato sai
 * contaminado.
 */
import { fuelMinutes } from '../build/Fire';
import { charge, doses, Flag, freshness, isBroken, type ItemState } from '../items/condition';
import { emptyAfter, toolUses } from '../items/consumables';
import type { ItemContainer, ItemStack } from '../items/ItemContainer';
import { itemDef } from '../items/ItemCatalog';
import type { ItemDef } from '../items/ItemTypes';
import type { PlayerInventory } from '../items/PlayerInventory';
import type { StructureType } from '../build/StructureCatalog';
import { STATION_LABEL, type Opt, type Recipe, type Station, type ToolReq } from './Recipes';

export interface CraftEnv {
  stations: ReadonlySet<Station>;
  /** Dia de jogo (fração): frescor dos ingredientes e do prato. */
  now: number;
  /** A estrutura pode ser montada aqui? Motivo, ou null. */
  canPlace?(type: StructureType): string | null;
}

export interface NeedLine {
  label: string;
  ok: boolean;
  kind: 'input' | 'tool' | 'station' | 'place';
}

export interface CraftCheck {
  ok: boolean;
  lines: NeedLine[];
  /** Primeiro motivo de não dar ("Falta: Panela"). */
  reason: string | null;
}

export interface CraftResult {
  ok: boolean;
  message: string;
  /** O que entrou no inventário e o que não coube (vai para o chão). */
  given: { id: string; n: number; st?: ItemState }[];
  overflow: { id: string; n: number; st?: ItemState }[];
  /** Estrutura a montar e a lenha inicial dela. */
  structure?: StructureType;
  fuel?: number;
}

// ------------------------------------------------------------------ unidades virtuais

interface Unit {
  container: ItemContainer;
  stack: ItemStack;
  def: ItemDef;
  /** Quanto a unidade ainda rende na medida usada (doses, carga) — ou 1. */
  amt: number;
  /** Consumida inteira nesta receita. */
  gone: boolean;
  /** Quanto foi tirado dela (dose/carga). */
  taken: number;
}

const EPS = 1e-6;

function unitsOf(inv: PlayerInventory): Unit[] {
  const out: Unit[] = [];
  for (const s of inv.stacks()) {
    for (let i = 0; i < s.stack.count; i++) out.push({ container: s.container, stack: s.stack, def: s.def, amt: 1, gone: false, taken: 0 });
  }
  return out;
}

function measure(o: Opt): 'n' | 'dose' | 'charge' {
  return o.dose !== undefined ? 'dose' : o.charge !== undefined ? 'charge' : 'n';
}

function contaminated(def: ItemDef, st: ItemState | undefined): boolean {
  return ((st?.f ?? 0) & Flag.Contaminado) !== 0 || def.tags.includes('contaminada');
}

function matches(u: Unit, o: Opt): boolean {
  if (u.gone) return false;
  const d = u.def;
  if (o.id ? d.id !== o.id : !d.tags.includes(o.tag!)) return false;
  if (isBroken(d, u.stack.st)) return false;
  if (o.clean && contaminated(d, u.stack.st)) return false;
  if (o.noRaw && d.food?.raw) return false;
  const m = measure(o);
  if (m === 'dose') return (d.drink !== undefined || d.med?.doses !== undefined) && left(u, m) > EPS;
  if (m === 'charge') return d.condition === 'battery' && left(u, m) > EPS;
  return true;
}

function left(u: Unit, m: 'n' | 'dose' | 'charge'): number {
  if (m === 'dose') return doses(u.def, u.stack.st) - u.taken;
  if (m === 'charge') return charge(u.def, u.stack.st) - u.taken;
  return u.gone ? 0 : 1;
}

/** Reserva o ingrediente nas unidades (muda `units`); devolve as usadas ou null. */
function reserve(units: Unit[], o: Opt): Unit[] | null {
  const m = measure(o);
  const need = o.dose ?? o.charge ?? o.n ?? 1;
  const cand = units.filter((u) => matches(u, o));
  if (m === 'n') {
    if (cand.length < need) return null;
    const used = cand.slice(0, need);
    for (const u of used) u.gone = true;
    return used;
  }
  // Dose/carga: primeiro o que já está aberto/pela metade.
  cand.sort((a, b) => left(a, m) - left(b, m));
  const total = cand.reduce((t, u) => t + left(u, m), 0);
  if (total + EPS < need) return null;
  let rest = need;
  const used: Unit[] = [];
  for (const u of cand) {
    if (rest <= EPS) break;
    const take = Math.min(left(u, m), rest);
    u.taken += take;
    rest -= take;
    if (left(u, m) <= EPS) u.gone = true;
    used.push(u);
  }
  return used;
}

function toolAvailable(inv: PlayerInventory, units: Unit[], t: ToolReq): boolean {
  const okDef = (d: ItemDef, st: ItemState | undefined) => t.tags.some((x) => d.tags.includes(x)) && !isBroken(d, st) && (d.condition !== 'battery' || charge(d, st) > 0.01);
  const hd = inv.handDef;
  if (hd && okDef(hd, inv.hand?.st)) return true;
  for (const e of inv.worn.values()) {
    const d = itemDef(e.defId);
    if (d && okDef(d, e.st)) return true;
  }
  return units.some((u) => !u.gone && u.taken === 0 && okDef(u.def, u.stack.st));
}

interface Plan {
  check: CraftCheck;
  /** Unidades usadas por ingrediente (na ordem da receita). */
  used: Unit[][];
  units: Unit[];
}

function plan(r: Recipe, inv: PlayerInventory, env: CraftEnv): Plan {
  const units = unitsOf(inv);
  const lines: NeedLine[] = [];
  const used: Unit[][] = [];
  for (const ing of r.inputs) {
    let got: Unit[] | null = null;
    for (const o of ing.opts) {
      // Tenta numa cópia do estado das unidades para não reservar pela metade.
      const snap = units.map((u) => ({ gone: u.gone, taken: u.taken }));
      got = reserve(units, o);
      if (got) break;
      units.forEach((u, i) => {
        u.gone = snap[i]!.gone;
        u.taken = snap[i]!.taken;
      });
    }
    used.push(got ?? []);
    lines.push({ label: ing.label, ok: !!got, kind: 'input' });
  }
  for (const t of r.tools ?? []) lines.push({ label: t.label, ok: toolAvailable(inv, units, t), kind: 'tool' });
  if (r.station) lines.push({ label: STATION_LABEL[r.station], ok: env.stations.has(r.station), kind: 'station' });
  if (r.structure && env.canPlace) {
    const why = env.canPlace(r.structure);
    lines.push({ label: why ?? 'Lugar livre aqui', ok: !why, kind: 'place' });
  }
  const bad = lines.find((l) => !l.ok);
  const reason = bad ? (bad.kind === 'station' ? `Precisa: ${bad.label.toLowerCase()}` : bad.kind === 'place' ? bad.label : `Falta: ${bad.label}`) : null;
  return { check: { ok: !bad, lines, reason }, used, units };
}

export function checkRecipe(r: Recipe, inv: PlayerInventory, env: CraftEnv): CraftCheck {
  return plan(r, inv, env).check;
}

/** Desgasta a primeira ferramenta que serve (mão, depois bolsos). */
function wearTool(inv: PlayerInventory, t: ToolReq): void {
  const fits = (d: ItemDef, st: ItemState | undefined) => t.tags.some((x) => d.tags.includes(x)) && !isBroken(d, st) && (d.condition !== 'battery' || charge(d, st) > 0.01);
  const cost = (d: ItemDef) => (t.wear ?? 1) / toolUses(d);
  const next = (d: ItemDef, st: ItemState | undefined): ItemState | undefined => {
    if (d.condition === 'battery') return { ...(st ?? {}), ch: Math.max(0, charge(d, st) - cost(d)) };
    if (d.condition === 'durable' || d.condition === 'device') return { ...(st ?? {}), c: Math.max(0, (st?.c ?? 1) - cost(d)) };
    return st;
  };
  const hd = inv.handDef;
  if (hd && fits(hd, inv.hand?.st)) {
    inv.updateHand(next(hd, inv.hand?.st) ?? {});
    return;
  }
  for (const [slot, e] of inv.worn) {
    const d = itemDef(e.defId);
    if (d && fits(d, e.st)) {
      inv.updateWorn(slot, next(d, e.st));
      return;
    }
  }
  for (const s of inv.stacks()) {
    if (!fits(s.def, s.stack.st)) continue;
    s.container.updateOne(s.index, next(s.def, s.stack.st));
    return;
  }
}

/**
 * Faz a receita agora (a ação com tempo terminou). Confere de novo: o
 * jogador pode ter largado algo no meio.
 */
export function craftRecipe(r: Recipe, inv: PlayerInventory, env: CraftEnv): CraftResult {
  const p = plan(r, inv, env);
  if (!p.check.ok) return { ok: false, message: p.check.reason ?? 'Não deu.', given: [], overflow: [] };

  // O que os ingredientes dizem sobre o resultado.
  let spoiled = false;
  let fuel = 0;
  const firstDoses = p.used[0]?.[0] ? doses(p.used[0][0].def, p.used[0][0].stack.st) : 0;
  const empties: string[] = [];
  for (const list of p.used) {
    for (const u of list) {
      const fr = freshness(u.def, u.stack.st, env.now);
      if (fr === 'estragado' || fr === 'podre' || (u.def.food && contaminated(u.def, u.stack.st))) spoiled = true;
      if (u.gone && r.fuelFromInputs) fuel += fuelMinutes(u.def);
    }
  }

  // Aplica o consumo pilha por pilha (inteiras primeiro, depois as parciais).
  const byStack = new Map<ItemStack, { container: ItemContainer; def: ItemDef; whole: number; partial: ItemState[] }>();
  for (const list of p.used) {
    for (const u of list) {
      let e = byStack.get(u.stack);
      if (!e) byStack.set(u.stack, (e = { container: u.container, def: u.def, whole: 0, partial: [] }));
      const st = u.stack.st;
      if (u.gone) {
        e.whole++;
        const empty = u.taken > 0 ? emptyAfter(u.def) : null;
        if (empty) empties.push(empty);
      } else if (u.taken > 0) {
        if (u.def.condition === 'battery') e.partial.push({ ...(st ?? {}), ch: charge(u.def, st) - u.taken });
        else e.partial.push({ ...(st ?? {}), open: 1, dose: Math.round(doses(u.def, st) - u.taken) });
      }
    }
  }
  for (const [stack, e] of byStack) {
    if (e.whole > 0) {
      const i = e.container.stacks.indexOf(stack);
      if (i >= 0) e.container.take(i, e.whole);
    }
    for (const st of e.partial) {
      const i = e.container.stacks.indexOf(stack);
      if (i >= 0) e.container.updateOne(i, st);
    }
  }
  for (const t of r.tools ?? []) wearTool(inv, t);

  const given: CraftResult['given'] = [];
  const overflow: CraftResult['overflow'] = [];
  const put = (id: string, n: number, st?: ItemState) => {
    const got = inv.add(id, n, st);
    if (got > 0) given.push(st ? { id, n: got, st } : { id, n: got });
    if (got < n) overflow.push(st ? { id, n: n - got, st } : { id, n: n - got });
  };
  for (const e of empties) put(e, 1);
  for (const o of r.out) {
    const def = itemDef(o.id);
    if (!def) continue;
    const st: ItemState = {};
    if (def.condition === 'perishable') st.born = env.now;
    if (spoiled && (def.food || def.condition === 'perishable')) st.f = Flag.Contaminado;
    if (def.condition === 'drink') {
      st.open = 1;
      if (r.keepDoses && firstDoses > 0) st.dose = Math.min(def.drink?.doses ?? firstDoses, firstDoses);
    }
    put(o.id, o.n, Object.keys(st).length ? st : undefined);
  }
  inv.changed();

  const main = r.out[0];
  const name = main ? (itemDef(main.id)?.name ?? r.name) : r.name;
  const count = main && main.n > 1 ? `${main.n} ` : '';
  const message = r.structure ? `${r.name} montada.` : spoiled ? `${count}${name} — ingrediente estragado, cuidado.` : `Fez: ${count}${name}`;
  const res: CraftResult = { ok: true, message, given, overflow };
  if (r.structure) {
    res.structure = r.structure;
    res.fuel = fuel;
  }
  return res;
}

/** Minutos reais de trabalho (habilidade e estado do corpo). */
export function craftMinutes(r: Recipe, skillSpeed: number, actionTime: number): number {
  return Math.max(1, Math.round((r.minutes / Math.max(0.3, skillSpeed)) * actionTime));
}
