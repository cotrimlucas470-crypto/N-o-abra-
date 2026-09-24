/**
 * Ler e mudar UMA unidade de item onde quer que ela esteja (bolsos, mochila,
 * mão, roupa vestida, recipiente do mundo). As ações usam isto para gastar
 * dose, desgastar, carregar munição, ligar a lanterna...
 */
import type { ItemState } from '../../items/condition';
import type { ItemActionContext } from './types';

/** Muda o estado de uma unidade (as outras da pilha ficam como estavam). */
export function setState(c: ItemActionContext, st: ItemState | undefined): void {
  const loc = c.loc;
  if (loc.where === 'inv' && c.container) {
    c.container.updateOne(loc.index, st);
    c.inventory.changed();
  } else if (loc.where === 'hand') c.inventory.updateHand(st ?? {});
  else if (loc.where === 'worn') {
    c.inventory.updateWorn(loc.slot, st);
    c.inventory.changed();
  } else if (loc.where === 'loot' && c.openContainerId) {
    c.state.loot.peek(c.openContainerId)?.updateOne(loc.index, st);
    c.state.containerChanged(c.openContainerId);
  }
}

/** Gasta uma unidade (comeu, usou o curativo). */
export function consumeOne(c: ItemActionContext): void {
  const loc = c.loc;
  if (loc.where === 'inv' && c.container) {
    c.container.take(loc.index, 1);
    c.inventory.changed();
  } else if (loc.where === 'hand') c.inventory.updateHand(null);
  else if (loc.where === 'loot' && c.openContainerId) {
    c.state.loot.peek(c.openContainerId)?.take(loc.index, 1);
    c.state.containerChanged(c.openContainerId);
  }
}

/** Primeira pilha do inventário com a etiqueta (e que passe no filtro). */
export function findTagged(c: ItemActionContext, tag: string, filter?: (st: ItemState | undefined) => boolean) {
  for (const s of c.inventory.stacks()) {
    if (s.def.tags.includes(tag) && (!filter || filter(s.stack.st))) return s;
  }
  return null;
}
