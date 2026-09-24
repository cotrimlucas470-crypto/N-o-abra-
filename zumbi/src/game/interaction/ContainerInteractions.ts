/**
 * Recipientes do mapa: geladeira, armários, guarda-roupa, prateleiras,
 * caçamba, porta-luvas, porta-malas... Abrir mostra o conteúdo no painel
 * (o jogo não pausa). Revirar lixo e abrir porta-malas faz um pouco de barulho.
 */
import { INTERACTION_TUNING } from '../config/WorldTuning';
import type { EventBus } from '../core/EventBus';
import type { ContainerRef } from '../loot/LootSystem';
import type { WorldState } from '../sim/WorldState';
import type { InteractionCandidate, InteractionProvider, InteractionResult, Interactor } from './InteractionSystem';

const NOISE: Partial<Record<ContainerRef['kind'], number>> = { cacamba: 260, portaMalas: 200, tambor: 180, sacoLixo: 120 };

export class ContainerInteractions implements InteractionProvider {
  constructor(
    private readonly state: WorldState,
    private readonly bus: EventBus,
  ) {}

  collect(who: Interactor, out: InteractionCandidate[]): void {
    const reach = INTERACTION_TUNING.doorReach;
    for (const { ref, distance } of this.state.loot.refsNear(who.x, who.y, reach + who.radius)) {
      const d = distance - who.radius;
      const searched = this.state.loot.isSearched(ref.id);
      const empty = searched && (this.state.loot.peek(ref.id)?.isEmpty ?? false);
      const verb = ref.verb;
      const name = ref.name.charAt(0).toLowerCase() + ref.name.slice(1);
      const label = `${verb.charAt(0)}${verb.slice(1).toLowerCase()} ${name}${empty ? ' (vazio)' : ''}`;
      out.push({
        target: {
          key: `recipiente:${ref.id}`,
          kind: 'container',
          x: ref.x,
          y: ref.y,
          ...(ref.rect ? { rect: ref.rect } : { radius: 22 }),
          verb,
          label,
          enabled: true,
        },
        // Item à vista em cima do móvel vence o móvel (+20); recipiente já vazio perde para o resto.
        distance: d + 20 + (empty ? 16 : 0),
        perform: () => this.open(ref),
      });
    }
  }

  private open(ref: ContainerRef): InteractionResult {
    const c = this.state.openContainer(ref.id);
    if (!c) return { ok: false };
    const noise = NOISE[ref.kind];
    if (noise) this.bus.emit('world:noise', { x: ref.x, y: ref.y, radius: noise, source: ref.name });
    this.bus.emit('ui:container-open', { id: ref.id });
    return { ok: true };
  }
}
