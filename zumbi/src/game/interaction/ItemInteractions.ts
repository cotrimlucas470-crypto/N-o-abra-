/**
 * Itens no chão: pegar (se couber no peso) e largar. Pegar exige ver o
 * item: nada de catar coisa do outro lado da parede.
 */
import { INTERACTION_TUNING } from '../config/WorldTuning';
import { hashString } from '../core/Random';
import { itemDef } from '../items/ItemCatalog';
import type { ItemContainer } from '../items/ItemContainer';
import type { PlayerInventory } from '../items/PlayerInventory';
import type { WorldItem, WorldState } from '../sim/WorldState';
import type { InteractionCandidate, InteractionProvider, InteractionResult, Interactor } from './InteractionSystem';

export class ItemInteractions implements InteractionProvider {
  constructor(
    private readonly state: WorldState,
    private readonly inventory: PlayerInventory,
  ) {}

  collect(who: Interactor, out: InteractionCandidate[]): void {
    const sight = this.state.model.sight;
    for (const it of this.state.itemsNear(who.x, who.y, INTERACTION_TUNING.itemReach)) {
      const def = itemDef(it.defId);
      if (!def) continue;
      if (!sight.hasLineOfSight(who.x, who.y, it.x, it.y)) continue;
      const distance = Math.hypot(it.x - who.x, it.y - who.y);
      const count = it.count > 1 ? ` ×${it.count}` : '';
      out.push({
        target: { key: `item:${it.id}`, kind: 'item', x: it.x, y: it.y, radius: 18, verb: 'PEGAR', label: `Pegar ${def.name}${count}`, enabled: true },
        // Item conta como um pouco mais perto que porta à mesma distância: está no pé.
        distance: distance - 8,
        perform: () => this.pick(it),
      });
    }
  }

  private pick(it: WorldItem): InteractionResult {
    const def = itemDef(it.defId);
    if (!def) return { ok: false };
    const fits = this.inventory.add(it.defId, it.count);
    if (fits <= 0) return { ok: false, message: 'Pesado demais para carregar.' };
    this.state.takeItem(it.id, fits);
    const rest = fits < it.count ? ' (o resto não cabe)' : '';
    return { ok: true, message: `+${fits > 1 ? `${fits} ` : ''}${def.name}${rest}` };
  }

  /**
   * Larga `count` unidades da pilha `index` aos pés do jogador. Um pequeno
   * desvio (fixo por id) evita itens largados exatamente um sobre o outro.
   */
  drop(container: ItemContainer, index: number, count: number, x: number, y: number): InteractionResult {
    const out = this.inventory.take(container, index, count);
    if (!out) return { ok: false };
    const h = hashString(`${out.defId}:${this.state.itemCount}:${Math.round(x)},${Math.round(y)}`);
    const a = ((h % 360) * Math.PI) / 180;
    const r = 4 + (h % 7);
    this.state.dropItem(out.defId, out.count, x + Math.cos(a) * r, y + Math.sin(a) * r);
    const def = itemDef(out.defId);
    return { ok: true, message: `Largou ${out.count > 1 ? `${out.count} ` : ''}${def?.name ?? 'item'}` };
  }
}
