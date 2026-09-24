/**
 * Colher frutas, juntar galhos, pegar pedras, colher cogumelos.
 * O que sai vem FRESCO (colhido agora) e ocupa peso como qualquer item.
 * Árvore vazia avisa quando volta a dar fruto.
 */
import { INTERACTION_TUNING } from '../config/WorldTuning';
import { itemDef } from '../items/ItemCatalog';
import type { PlayerInventory } from '../items/PlayerInventory';
import { PROP_HARVEST, RESOURCE_HARVEST, type HarvestDef } from '../nature/NatureCatalog';
import type { WorldState } from '../sim/WorldState';
import { PROP_DEFS } from '../world/PropCatalog';
import type { InteractionCandidate, InteractionProvider, InteractionResult, Interactor } from './InteractionSystem';

export class NatureInteractions implements InteractionProvider {
  constructor(
    private readonly state: WorldState,
    private readonly inventory: PlayerInventory,
    /** Agora, em dias de jogo. */
    private readonly now: () => number,
  ) {}

  collect(who: Interactor, out: InteractionCandidate[]): void {
    const map = this.state.model.map;
    const index = this.state.model.index;
    const reach = INTERACTION_TUNING.doorReach + 8;
    const now = this.now();
    for (const key of index.chunksAround(who.x, who.y)) {
      const content = index.get(key);
      if (!content) continue;
      for (const i of content.props) {
        const p = map.props[i]!;
        const def = PROP_HARVEST[p.type];
        if (!def) continue;
        const col = PROP_DEFS[p.type].collider;
        const r = col.shape === 'circle' ? col.r : 20;
        const d = Math.hypot(p.x - who.x, p.y - who.y) - r - who.radius;
        if (d > reach) continue;
        this.offer(out, p.id, def, p.x, p.y, d, now, true);
      }
      for (const i of content.resources) {
        const res = map.resources[i]!;
        const d = Math.hypot(res.x - who.x, res.y - who.y) - who.radius;
        if (d > INTERACTION_TUNING.itemReach - 10) continue;
        this.offer(out, res.id, RESOURCE_HARVEST[res.type], res.x, res.y, d, now, false);
      }
    }
  }

  private offer(out: InteractionCandidate[], id: string, def: HarvestDef, x: number, y: number, distance: number, now: number, tree: boolean): void {
    const n = this.state.nature.count(id, def, now);
    if (n <= 0 && !tree) return;
    if (n <= 0) {
      const next = this.state.nature.nextIn(id, def, now);
      const when = next === null ? 'não volta' : next < 1 ? 'volta amanhã' : `volta em ~${Math.ceil(next)} dias`;
      out.push({
        target: { key: `natureza:${id}`, kind: 'harvest', x, y, radius: 24, verb: 'VAZIA', label: `Nada para colher · ${when}`, enabled: false },
        distance: distance + 20,
        perform: () => ({ ok: false, message: `Nada para colher agora (${when}).` }),
      });
      return;
    }
    out.push({
      target: { key: `natureza:${id}`, kind: 'harvest', x, y, radius: 24, verb: def.verb, label: `${def.label} (${n})`, enabled: true },
      distance,
      perform: () => this.take(id, def),
    });
  }

  private take(id: string, def: HarvestDef): InteractionResult {
    const now = this.now();
    const have = this.state.nature.count(id, def, now);
    const want = Math.min(def.give, have);
    if (want <= 0) return { ok: false };
    const item = itemDef(def.item);
    // Colhido agora: perecível começa fresco.
    const added = this.inventory.add(def.item, want, item?.condition === 'perishable' ? { born: now } : undefined);
    if (added <= 0) return { ok: false, message: 'Pesado demais para carregar.' };
    this.state.harvest(id, def, now, added);
    return { ok: true, message: `+${added} ${item?.name ?? def.item}` };
  }
}
