/**
 * Ações básicas: comer, beber, vestir/tirar, mochila, segurar/guardar,
 * ligar/desligar, trocar pilhas, passar entre bolsos e mochila, pegar,
 * guardar no recipiente aberto e largar no chão.
 */
import { charge, doses, drinkEffect, foodEffect, isBroken } from '../../items/condition';
import type { ItemDef } from '../../items/ItemTypes';
import { BAG_ID } from '../../items/PlayerInventory';
import { consumeOne, findTagged, setState } from './access';
import { fail, ok, type ItemActionContext, type ItemActionDef, type ItemResult } from './types';

const inPockets = (c: ItemActionContext) => c.loc.where === 'inv';
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Dá para segurar na mão? (arma, ferramenta, luz, aparelho, cabo) */
export function holdable(d: ItemDef): boolean {
  return !!(d.melee || d.gun || d.tool || d.power || d.tags.includes('cabo') || d.tags.includes('luz') || d.category === 'arma-branca' || d.category === 'ferramenta');
}

/** Garrafa que sobra quando a bebida acaba. */
function emptyBottleOf(def: ItemDef): string | null {
  if (def.iconSpec.f !== 'bottle') return null;
  const k = def.iconSpec.k;
  if (k === 'glass') return 'garrafaVidro';
  if (k === 'jug' || k === 'oil' || k === 'thermos' || k === 'milk') return null;
  return 'garrafaPet';
}

function eat(c: ItemActionContext): ItemResult {
  const eff = foodEffect(c.def, c.st, c.now)!;
  c.survivor.body.consume(eff);
  consumeOne(c);
  // Na hora só o engulho; a doença tira vida aos poucos (Body).
  if (eff.health < 0) c.survivor.body.cheer(-2);
  return { ok: true, message: eff.message, tone: eff.tone };
}

function drink(c: ItemActionContext): ItemResult {
  const eff = drinkEffect(c.def, c.st)!;
  c.survivor.body.consume(eff);
  const left = doses(c.def, c.st) - 1;
  if (left <= 0) {
    const empty = emptyBottleOf(c.def);
    consumeOne(c);
    if (empty) {
      if (c.loc.where === 'inv' && c.container) c.container.add(empty, 1);
      else c.inventory.add(empty, 1);
      c.inventory.changed();
    }
  } else {
    setState(c, { ...(c.st ?? {}), open: 1, dose: left });
  }
  return { ok: true, message: eff.message, tone: eff.tone };
}

export const BASIC_ACTIONS: ItemActionDef[] = [
  // ---------------------------------------------------------------- mundo → jogador
  {
    id: 'pegar',
    label: 'PEGAR',
    order: 1,
    when: (c) => c.loc.where === 'loot',
    run: (c) => {
      const box = c.openContainerId ? c.state.loot.peek(c.openContainerId) : null;
      if (!box || c.loc.where !== 'loot') return fail('Longe demais.');
      const s = box.stacks[c.loc.index];
      if (!s) return fail('Não está mais aí.');
      const out = box.take(c.loc.index, s.count)!;
      const n = c.inventory.add(out.defId, out.count, out.st);
      if (n < out.count) box.add(out.defId, out.count - n, out.st);
      c.state.containerChanged(c.openContainerId!);
      if (n <= 0) return fail('Pesado demais para carregar.');
      return ok(`+${n > 1 ? `${n} ` : ''}${c.def.name}`);
    },
  },
  // ---------------------------------------------------------------- comer e beber
  {
    id: 'comer',
    label: 'COMER',
    order: 10,
    when: (c) => !!c.def.food && (inPockets(c) || c.loc.where === 'loot'),
    can: (c) => {
      const needs = c.def.food?.needs;
      if (needs && !c.inventory.hasTag(needs)) return 'Precisa de abridor, faca ou canivete.';
      return true;
    },
    run: eat,
  },
  {
    id: 'beber',
    label: 'BEBER',
    order: 10,
    when: (c) => !!c.def.drink && (inPockets(c) || c.loc.where === 'loot' || c.loc.where === 'hand'),
    can: (c) => (doses(c.def, c.st) > 0 ? true : 'Vazia.'),
    run: drink,
  },
  // ---------------------------------------------------------------- roupas e mochila
  {
    id: 'vestir',
    label: 'VESTIR',
    order: 20,
    when: (c) => !!c.def.wear && inPockets(c),
    can: (c) => (isBroken(c.def, c.st) ? 'Rasgada demais para vestir.' : true),
    run: (c) => {
      const err = c.inventory.wear(c.container!, (c.loc as { index: number }).index);
      return err ? fail(err) : ok(`Vestiu: ${c.def.name}`, 'info');
    },
  },
  {
    id: 'tirar',
    label: 'TIRAR',
    order: 20,
    when: (c) => c.loc.where === 'worn',
    run: (c) => {
      if (c.loc.where !== 'worn') return fail('');
      const err = c.inventory.takeOff(c.loc.slot);
      return err ? fail(err) : ok(`Tirou: ${c.def.name}`, 'info');
    },
  },
  {
    id: 'vestirMochila',
    label: 'VESTIR',
    order: 20,
    when: (c) => !!c.def.bag && inPockets(c),
    run: (c) => {
      const err = c.inventory.equipBag(c.container!, (c.loc as { index: number }).index);
      return err ? fail(err) : ok(`Vestiu: ${c.def.name} (+${c.def.bag!.capacity} kg)`);
    },
  },
  {
    id: 'tirarMochila',
    label: 'TIRAR MOCHILA',
    order: 20,
    when: (c) => c.loc.where === 'bag',
    run: (c) => {
      const err = c.inventory.unequipBag();
      return err ? fail(err) : ok('Tirou a mochila.', 'info');
    },
  },
  // ---------------------------------------------------------------- mão
  {
    id: 'segurar',
    label: (c) => (c.def.gun || c.def.melee ? 'EMPUNHAR' : 'SEGURAR'),
    order: 25,
    when: (c) => inPockets(c) && holdable(c.def),
    run: (c) => {
      const err = c.inventory.equipHand(c.container!, (c.loc as { index: number }).index);
      return err ? fail(err) : ok(`Na mão: ${c.def.name}`, 'info');
    },
  },
  {
    id: 'guardarMao',
    label: 'GUARDAR',
    order: 60,
    when: (c) => c.loc.where === 'hand',
    run: (c) => {
      const err = c.inventory.unequipHand();
      return err ? fail(err) : ok(`Guardou: ${c.def.name}`, 'info');
    },
  },
  // ---------------------------------------------------------------- aparelhos
  {
    id: 'ligar',
    label: (c) => (c.st?.on ? 'DESLIGAR' : 'LIGAR'),
    order: 15,
    when: (c) => !!c.def.power && (c.def.tags.includes('luz') || c.def.tags.includes('radio')) && (c.loc.where === 'hand' || c.loc.where === 'worn'),
    can: (c) => (c.st?.on || charge(c.def, c.st) > 0.01 ? (isBroken(c.def, c.st) ? 'Quebrado.' : true) : 'Sem carga.'),
    run: (c) => {
      const on = !c.st?.on;
      const next = { ...(c.st ?? {}) };
      if (on) next.on = 1;
      else delete next.on;
      setState(c, next);
      return ok(on ? `${c.def.name}: ligado` : `${c.def.name}: desligado`, 'info');
    },
  },
  {
    id: 'trocarPilhas',
    label: 'TROCAR PILHA',
    order: 40,
    when: (c) => !!c.def.power?.needs && c.loc.where !== 'loot',
    can: (c) => (findTagged(c, c.def.power!.needs!, (st) => (st?.ch ?? 1) > 0.05) ? true : `Precisa de ${c.def.power!.needs === 'pilha' ? 'pilhas' : 'bateria'} com carga.`),
    run: (c) => {
      const bat = findTagged(c, c.def.power!.needs!, (st) => (st?.ch ?? 1) > 0.05)!;
      const got = bat.container.take(bat.index, 1)!;
      const ch = got.st?.ch ?? 1;
      const next = { ...(c.st ?? {}), ch };
      setState(c, next);
      c.inventory.changed();
      return ok(`Pilha nova: ${Math.round(ch * 100)}%`);
    },
  },
  // ---------------------------------------------------------------- arrumar
  {
    id: 'paraMochila',
    label: 'P/ MOCHILA',
    order: 70,
    when: (c) => c.loc.where === 'inv' && c.loc.containerId !== BAG_ID && !!c.inventory.bag,
    run: (c) => {
      const n = c.inventory.moveBetween(c.container!, (c.loc as { index: number }).index, c.inventory.bag!.container);
      return n > 0 ? ok(`${n > 1 ? `${n} ` : ''}${c.def.name} → mochila`, 'info') : fail('Não cabe na mochila.');
    },
  },
  {
    id: 'paraBolsos',
    label: 'P/ BOLSOS',
    order: 70,
    when: (c) => c.loc.where === 'inv' && c.loc.containerId === BAG_ID,
    run: (c) => {
      const n = c.inventory.moveBetween(c.container!, (c.loc as { index: number }).index, c.inventory.carried);
      return n > 0 ? ok(`${n > 1 ? `${n} ` : ''}${c.def.name} → bolsos`, 'info') : fail('Não cabe nos bolsos.');
    },
  },
  {
    id: 'guardarRecipiente',
    label: 'GUARDAR',
    order: 80,
    when: (c) => c.loc.where === 'inv' && !!c.openContainerId,
    run: (c) => {
      const box = c.state.loot.peek(c.openContainerId!);
      if (!box || c.loc.where !== 'inv') return fail('Longe demais.');
      const s = c.container!.stacks[c.loc.index];
      if (!s) return fail('');
      const n = Math.min(s.count, box.room(s.defId, s.st));
      if (n <= 0) return fail('Não cabe aí.');
      const out = c.container!.take(c.loc.index, n)!;
      box.add(out.defId, out.count, out.st);
      c.state.containerChanged(c.openContainerId!);
      c.inventory.changed();
      return ok(`Guardou ${n > 1 ? `${n} ` : ''}${c.def.name}`, 'info');
    },
  },
  {
    id: 'largar',
    label: 'LARGAR',
    order: 90,
    when: (c) => c.loc.where === 'inv' || c.loc.where === 'hand',
    run: (c) => {
      if (c.loc.where === 'hand') {
        const h = c.inventory.hand!;
        c.inventory.updateHand(null);
        c.hooks.drop(h.defId, 1, h.st);
        return ok(`Largou ${lower(c.def.name)}`, 'info');
      }
      if (c.loc.where !== 'inv') return fail('');
      const out = c.container!.take(c.loc.index, c.count);
      if (!out) return fail('');
      c.inventory.changed();
      c.hooks.drop(out.defId, out.count, out.st);
      return ok(`Largou ${out.count > 1 ? `${out.count} ` : ''}${lower(c.def.name)}`, 'info');
    },
  },
];
