/**
 * Ações de item de fabricação, reparo e água:
 * - COZINHAR/FERVER/PREPARAR: atalho para a receita que começa pelo item;
 * - CONSERTAR (fita/cola), REMENDAR (kit de costura + pano), AFIAR (lima ou
 *   pedra), LAVAR (água + sabão; a roupa sai molhada);
 * - RASGAR roupa/toalha/lençol em trapos; DESMONTAR eletrônico em peças;
 * - PURIFICAR água com água sanitária, ENCHER GARRAFA do balde/galão e
 *   JUNTAR CHUVA no balde ou garrafa (ao ar livre, chovendo).
 */
import { CRAFT_TUNING } from '../../config/CraftTuning';
import { recipesStartingWith, type Recipe } from '../../crafting/Recipes';
import { charge, condition, doses, Flag, isBroken, type ItemState } from '../../items/condition';
import { emptyAfter, toolUses } from '../../items/consumables';
import { itemDef } from '../../items/ItemCatalog';
import type { ItemDef } from '../../items/ItemTypes';
import type { SkillId } from '../../skills/Skills';
import { setState } from './access';
import { fail, ok, type ItemActionContext, type ItemActionDef, type ItemResult } from './types';

const has = (st: ItemState | undefined, f: number) => ((st?.f ?? 0) & f) !== 0;
const here = (c: ItemActionContext) => c.loc.where === 'inv' || c.loc.where === 'hand' || c.loc.where === 'worn';

// ------------------------------------------------------------------ achar e gastar

interface Found {
  def: ItemDef;
  st: ItemState | undefined;
  take(): void;
  update(st: ItemState | undefined): void;
}

/** Primeiro item carregado que passa no filtro (bolsos e mochila; a mão também para ferramentas). */
function find(c: ItemActionContext, test: (d: ItemDef, st: ItemState | undefined) => boolean, withHand = false): Found | null {
  const inv = c.inventory;
  if (withHand && inv.hand && inv.handDef && test(inv.handDef, inv.hand.st)) {
    return { def: inv.handDef, st: inv.hand.st, take: () => inv.updateHand(null), update: (st) => inv.updateHand(st ?? {}) };
  }
  for (const s of inv.stacks()) {
    if (!test(s.def, s.stack.st)) continue;
    // O próprio item da ação não serve de ingrediente dele mesmo.
    if (c.loc.where === 'inv' && s.container === c.container && s.index === c.loc.index && s.stack.count <= 1) continue;
    return {
      def: s.def,
      st: s.stack.st,
      take: () => {
        const i = s.container.stacks.indexOf(s.stack);
        if (i >= 0) s.container.take(i, 1);
        inv.changed();
      },
      update: (st) => {
        const i = s.container.stacks.indexOf(s.stack);
        if (i >= 0) s.container.updateOne(i, st);
        inv.changed();
      },
    };
  }
  return null;
}

/** Gasta uma fração de um consumível medido (fita, sabão, cloro); acabou, some. */
function spend(f: Found, amount: number): void {
  const left = charge(f.def, f.st) - amount;
  if (left <= 0.001) f.take();
  else f.update({ ...(f.st ?? {}), ch: left });
}

/** Desgasta uma ferramenta em um uso. */
function wear(f: Found): void {
  const cost = 1 / toolUses(f.def);
  if (f.def.condition === 'battery') f.update({ ...(f.st ?? {}), ch: Math.max(0, charge(f.def, f.st) - cost) });
  else if (f.def.condition === 'durable' || f.def.condition === 'device') f.update({ ...(f.st ?? {}), c: Math.max(0, condition(f.st) - cost) });
}

const measured = (tag: string, min: number) => (d: ItemDef, st: ItemState | undefined) => d.tags.includes(tag) && d.condition === 'battery' && charge(d, st) > min;
const unit = (...ids: string[]) => (d: ItemDef) => ids.includes(d.id);
const toolTag = (...tags: string[]) => (d: ItemDef, st: ItemState | undefined) => tags.some((t) => d.tags.includes(t)) && !isBroken(d, st);
const waterDose = (d: ItemDef, st: ItemState | undefined) => d.tags.includes('agua') && d.condition === 'drink' && doses(d, st) > 0;

/** Tira uma dose de água de onde houver (a garrafa vazia fica). */
function useWater(c: ItemActionContext): boolean {
  const w = find(c, waterDose);
  if (!w) return false;
  const left = doses(w.def, w.st) - 1;
  if (left <= 0) {
    w.take();
    const empty = emptyAfter(w.def);
    if (empty) c.inventory.add(empty, 1);
  } else w.update({ ...(w.st ?? {}), open: 1, dose: left });
  return true;
}

function timed(c: ItemActionContext, id: string, label: string, minutes: number, done: () => ItemResult, skill?: SkillId): ItemResult {
  const speed = skill ? c.survivor.skills.speed(skill) : 1;
  const mins = Math.max(1, Math.round((minutes / speed) * c.survivor.effects().actionTime));
  return {
    ok: true,
    timed: {
      id,
      label,
      minutes: mins,
      done: () => {
        const r = done();
        return { ok: r.ok, ...(r.message ? { message: r.message } : {}), ...(r.tone ? { tone: r.tone } : {}) };
      },
    },
  };
}

/** Relê o item no lugar da ação (pode ter mudado enquanto a ação corria). */
function stillThere(c: ItemActionContext): boolean {
  const loc = c.loc;
  if (loc.where === 'inv') return c.container?.stacks[loc.index]?.defId === c.def.id;
  if (loc.where === 'hand') return c.inventory.hand?.defId === c.def.id;
  if (loc.where === 'worn') return c.inventory.wornIn(loc.slot)?.defId === c.def.id;
  return false;
}

// ------------------------------------------------------------------ cozinhar (atalho de receita)

const VERB: Partial<Record<Recipe['cat'], string>> = { cozinha: 'COZINHAR', agua: 'FERVER', bebidas: 'PREPARAR', curativos: 'LAVAR' };

function shortcut(c: ItemActionContext): Recipe | null {
  const list = recipesStartingWith(c.def.id).filter((r) => VERB[r.cat]);
  if (!list.length) return null;
  const ready = c.hooks.craftReady ? list.find((r) => c.hooks.craftReady!(r.id) === true) : undefined;
  return ready ?? list[0]!;
}

// ------------------------------------------------------------------ eletrônicos

function partsOf(d: ItemDef): { id: string; n: number }[] {
  const out = [{ id: 'componentes', n: Math.max(1, Math.min(4, Math.round(d.weight * 4))) }];
  if (d.weight >= 0.3) out.push({ id: 'fioEletrico', n: 1 });
  if (d.weight >= 0.25 && d.power?.needs === undefined && d.id !== 'relogioDigital') out.push({ id: 'placaCircuito', n: 1 });
  return out;
}

const RAG_SOURCE = (d: ItemDef) => d.tags.includes('tecido-fonte');

export const CRAFT_ACTIONS: ItemActionDef[] = [
  {
    id: 'cozinhar',
    label: (c) => VERB[shortcut(c)?.cat ?? 'cozinha'] ?? 'FAZER',
    order: 12,
    when: (c) => c.loc.where === 'inv' && !!c.hooks.craft && !!shortcut(c),
    can: (c) => {
      const r = shortcut(c)!;
      const why = c.hooks.craftReady?.(r.id) ?? true;
      return why === true ? true : `${r.name}: ${String(why).replace(/^Falta: /, 'falta ').replace(/^Precisa: /, 'precisa de ')}`;
    },
    run: (c) => {
      const r = shortcut(c)!;
      const why = c.hooks.craft!(r.id);
      return why ? fail(why) : ok();
    },
  },
  // ---------------------------------------------------------------- reparos
  {
    id: 'consertar',
    label: 'CONSERTAR',
    order: 45,
    when: (c) => here(c) && (c.def.condition === 'durable' || c.def.condition === 'device') && !c.def.wear && condition(c.st) < 0.95 && condition(c.st) > 0,
    can: (c) => {
      const R = CRAFT_TUNING.repair;
      const tape = find(c, measured('fita', CRAFT_TUNING.tapeUse - 0.001));
      const glue = find(c, unit('cola', 'colaMadeira'));
      if (!tape && !glue) return 'Precisa de fita adesiva ou cola.';
      if (!glue && condition(c.st) >= R.maxTape) return 'Fita não melhora mais. Precisa de cola.';
      return true;
    },
    run: (c) =>
      timed(c, 'consertar', `Consertando: ${c.def.name}`, 6, () => {
        if (!stillThere(c)) return fail('O item não está mais aí.');
        const R = CRAFT_TUNING.repair;
        const glue = find(c, unit('cola', 'colaMadeira'));
        const tape = glue ? null : find(c, measured('fita', CRAFT_TUNING.tapeUse - 0.001));
        if (!glue && !tape) return fail('Acabou a fita e a cola.');
        const cur = condition(c.st);
        const next = glue ? Math.min(R.maxGlue, cur + R.glue) : Math.min(R.maxTape, cur + R.tape);
        if (glue) glue.take();
        else spend(tape!, CRAFT_TUNING.tapeUse);
        setState(c, { ...(c.st ?? {}), c: next });
        c.survivor.skills.gain(c.def.metal ? 'mecanica' : 'carpintaria', 2);
        return ok(`${c.def.name}: ${Math.round(cur * 100)}% → ${Math.round(next * 100)}%`);
      }),
  },
  {
    id: 'remendar',
    label: 'REMENDAR',
    order: 45,
    when: (c) => here(c) && c.def.condition === 'clothing' && (has(c.st, Flag.Rasgado) || condition(c.st) < 0.95),
    can: (c) => {
      if (!find(c, toolTag('costurar'), true)) return 'Precisa de kit de costura.';
      if (!find(c, unit('trapo', 'tecido', 'couro'))) return 'Precisa de trapo, retalho ou couro.';
      return true;
    },
    run: (c) =>
      timed(
        c,
        'remendar',
        `Remendando: ${c.def.name}`,
        12,
        () => {
          if (!stillThere(c)) return fail('A roupa não está mais aí.');
          const kit = find(c, toolTag('costurar'), true);
          const cloth = find(c, unit('trapo', 'tecido', 'couro'));
          if (!kit || !cloth) return fail('Falta kit de costura ou pano.');
          cloth.take();
          wear(kit);
          const lvl = c.survivor.skills.level('costura');
          const next = Math.min(1, condition(c.st) + CRAFT_TUNING.repair.sew + lvl * 0.05);
          setState(c, { ...(c.st ?? {}), c: next, f: (c.st?.f ?? 0) & ~Flag.Rasgado });
          c.survivor.skills.gain('costura', 4);
          return ok(`${c.def.name} remendada (${Math.round(next * 100)}%).`);
        },
        'costura',
      ),
  },
  {
    id: 'afiar',
    label: 'AFIAR',
    order: 46,
    when: (c) => here(c) && c.def.melee?.kind === 'corte' && condition(c.st) < 0.98 && condition(c.st) > 0,
    can: (c) => (find(c, (d, st) => (d.tags.includes('afiar') && !isBroken(d, st)) || d.id === 'pedra', true) ? true : 'Precisa de lima ou de uma pedra.'),
    run: (c) =>
      timed(c, 'afiar', `Afiando: ${c.def.name}`, 8, () => {
        if (!stillThere(c)) return fail('O item não está mais aí.');
        const file = find(c, (d, st) => d.tags.includes('afiar') && !isBroken(d, st), true);
        const stone = file ? null : find(c, unit('pedra'));
        if (!file && !stone) return fail('Sem lima nem pedra.');
        if (file) wear(file);
        const gain = file ? CRAFT_TUNING.repair.sharpen : CRAFT_TUNING.repair.sharpen * 0.5;
        const next = Math.min(1, condition(c.st) + gain);
        setState(c, { ...(c.st ?? {}), c: next });
        return ok(`${c.def.name} afiada (${Math.round(next * 100)}%).`);
      }),
  },
  {
    id: 'lavar',
    label: 'LAVAR',
    order: 47,
    when: (c) => here(c) && (has(c.st, Flag.Sujo) || has(c.st, Flag.Ensanguentado)),
    can: (c) => (find(c, waterDose) ? true : 'Precisa de água (uma dose).'),
    run: (c) =>
      timed(c, 'lavar', `Lavando: ${c.def.name}`, 6, () => {
        if (!stillThere(c)) return fail('O item não está mais aí.');
        if (!useWater(c)) return fail('Acabou a água.');
        const soap = find(c, measured('sabao', 0.001));
        if (soap) spend(soap, 0.1);
        let f = (c.st?.f ?? 0) & ~Flag.Sujo;
        // Sangue só sai com sabão.
        if (soap) f &= ~Flag.Ensanguentado;
        if (c.def.condition === 'clothing') f |= Flag.Molhado;
        setState(c, { ...(c.st ?? {}), f });
        const blood = (f & Flag.Ensanguentado) !== 0;
        return ok(blood ? 'Tirou a sujeira. O sangue só sai com sabão.' : c.def.condition === 'clothing' ? 'Limpa. E molhada: deixe secar.' : 'Limpo.', blood ? 'warn' : 'ok');
      }),
  },
  // ---------------------------------------------------------------- transformar
  {
    id: 'rasgar',
    label: 'RASGAR',
    order: 75,
    when: (c) => c.loc.where === 'inv' && RAG_SOURCE(c.def),
    run: (c) => {
      const n = Math.max(2, Math.min(8, Math.round(c.def.weight / 0.07)));
      const fast = !!find(c, toolTag('cortar-tecido', 'cortar'), true);
      return timed(c, 'rasgar', `Rasgando: ${c.def.name}`, fast ? 2 : 5, () => {
        if (!stillThere(c)) return fail('Não está mais aí.');
        c.container!.take((c.loc as { index: number }).index, 1);
        const got = c.inventory.add('trapo', n);
        if (got < n) c.hooks.drop('trapo', n - got, undefined);
        c.inventory.changed();
        c.survivor.skills.gain('costura', 1);
        return ok(`+${n} trapos`);
      });
    },
  },
  {
    id: 'desmontar',
    label: 'DESMONTAR',
    order: 76,
    when: (c) => c.loc.where === 'inv' && c.def.category === 'eletronico' && (c.def.condition === 'device' || c.def.condition === 'durable') && c.def.id !== 'gerador',
    can: (c) => (find(c, toolTag('parafusar', 'desmontar'), true) ? true : 'Precisa de chave de fenda.'),
    run: (c) =>
      timed(
        c,
        'desmontarAparelho',
        `Desmontando: ${c.def.name}`,
        12,
        () => {
          if (!stillThere(c)) return fail('Não está mais aí.');
          const tool = find(c, toolTag('parafusar', 'desmontar'), true);
          if (!tool) return fail('Sem chave de fenda.');
          const st = c.st;
          c.container!.take((c.loc as { index: number }).index, 1);
          wear(tool);
          const parts = partsOf(c.def);
          // Pilha que estava dentro volta com a carga que tinha.
          if (c.def.power?.needs === 'pilha' && (st?.ch ?? 1) > 0.02) parts.push({ id: 'pilhas', n: 1 });
          const names: string[] = [];
          for (const p of parts) {
            const pst = p.id === 'pilhas' && st?.ch !== undefined ? { ch: st.ch } : undefined;
            const got = c.inventory.add(p.id, p.n, pst);
            if (got < p.n) c.hooks.drop(p.id, p.n - got, pst);
            names.push(`${p.n > 1 ? `${p.n} ` : ''}${(itemDef(p.id)?.name ?? p.id).toLowerCase()}`);
          }
          c.inventory.changed();
          c.survivor.skills.gain('eletronica', 5);
          return ok(`Rendeu: ${names.join(', ')}`);
        },
        'eletronica',
      ),
  },
  // ---------------------------------------------------------------- água
  {
    id: 'purificar',
    label: 'PURIFICAR',
    order: 13,
    when: (c) => c.loc.where === 'inv' && c.def.tags.includes('agua') && (c.def.id === 'aguaSuja' || has(c.st, Flag.Contaminado)),
    can: (c) => (find(c, measured('tratar-agua', 0.001)) ? true : 'Precisa de água sanitária (ou ferva no fogo).'),
    run: (c) =>
      timed(c, 'purificar', 'Tratando a água', 3, () => {
        if (!stillThere(c)) return fail('Não está mais aí.');
        const bleach = find(c, measured('tratar-agua', 0.001));
        if (!bleach) return fail('Acabou a água sanitária.');
        const d = doses(c.def, c.st);
        spend(bleach, CRAFT_TUNING.bleachUse * Math.max(1, Math.ceil(d / 2)));
        if (c.def.id === 'aguaSuja') {
          c.container!.take((c.loc as { index: number }).index, 1);
          c.container!.add('agua', 1, { open: 1, dose: d });
        } else setState(c, { ...(c.st ?? {}), f: (c.st?.f ?? 0) & ~Flag.Contaminado });
        c.inventory.changed();
        return ok('Duas gotas por litro. Água tratada.');
      }),
  },
  {
    id: 'encherGarrafa',
    label: 'ENCHER GARRAFA',
    order: 14,
    when: (c) => c.loc.where === 'inv' && (c.def.id === 'baldeAgua' || c.def.id === 'aguaGalao') && doses(c.def, c.st) > 0,
    can: (c) => (find(c, unit('garrafaPet', 'garrafaVazia', 'garrafaVidro')) ? true : 'Precisa de uma garrafa vazia.'),
    run: (c) => {
      const bottle = find(c, unit('garrafaPet', 'garrafaVazia', 'garrafaVidro'))!;
      const dirty = has(c.st, Flag.Contaminado);
      const n = Math.min(2, doses(c.def, c.st));
      bottle.take();
      c.inventory.add(dirty ? 'aguaSuja' : 'agua', 1, { open: 1, dose: n });
      const left = doses(c.def, c.st) - n;
      if (left <= 0) {
        const empty = emptyAfter(c.def);
        c.container!.take((c.loc as { index: number }).index, 1);
        if (empty) c.container!.add(empty, 1);
      } else setState(c, { ...(c.st ?? {}), open: 1, dose: left });
      c.inventory.changed();
      return ok(dirty ? 'Garrafa cheia (água suja: ferva).' : 'Garrafa cheia.');
    },
  },
  {
    id: 'juntarChuva',
    label: 'JUNTAR CHUVA',
    order: 30,
    when: (c) => c.loc.where === 'inv' && ['balde', 'garrafaPet', 'garrafaVazia', 'garrafaVidro'].includes(c.def.id) && !!c.hooks.weather,
    can: (c) => {
      const w = c.hooks.weather!();
      if (w.sheltered) return 'Precisa estar ao ar livre.';
      if (w.rain < 0.15) return 'Não está chovendo o bastante.';
      return true;
    },
    run: (c) =>
      timed(c, 'juntarChuva', 'Juntando água da chuva', 30, () => {
        if (!stillThere(c)) return fail('Não está mais aí.');
        const rain = c.hooks.weather!().rain;
        const bucket = c.def.id === 'balde';
        const out = bucket ? 'baldeAgua' : 'aguaSuja';
        const max = itemDef(out)?.drink?.doses ?? 2;
        const n = Math.max(1, Math.min(max, Math.round(rain * (bucket ? 16 : 3))));
        c.container!.take((c.loc as { index: number }).index, 1);
        c.container!.add(out, 1, { open: 1, dose: n, ...(bucket ? { f: Flag.Contaminado } : {}) });
        c.inventory.changed();
        return ok(`Juntou ${n} ${n > 1 ? 'doses' : 'dose'} de chuva. Ferva ou trate antes de beber.`, 'info');
      }),
  },
];
