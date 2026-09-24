/**
 * Móveis de descanso: cama (dormir), sofá (sentar; dormir), poltrona,
 * cadeira e banco (sentar). Dormir exige sono; a ação é com tempo e o
 * relógio acelera (ver survival/Sleep.ts).
 */
import { propSolids } from '../world/collision';
import type { PropPlacement } from '../world/MapTypes';
import type { PropType } from '../world/PropCatalog';
import type { WorldState } from '../sim/WorldState';
import type { SleepPlace } from '../survival/Sleep';
import type { InteractionCandidate, InteractionOption, InteractionProvider, InteractionResult, Interactor } from './InteractionSystem';

interface Seat {
  name: string;
  sleep?: SleepPlace;
  sit?: boolean;
}

const SEATS: Partial<Record<PropType, Seat>> = {
  bedDouble: { name: 'cama', sleep: 'cama', sit: true },
  bedSingle: { name: 'cama', sleep: 'cama', sit: true },
  sofa: { name: 'sofá', sleep: 'sofa', sit: true },
  armchair: { name: 'poltrona', sit: true },
  chair: { name: 'cadeira', sit: true },
  bench: { name: 'banco', sit: true },
};

export interface RestHooks {
  sleep(place: SleepPlace): InteractionResult;
  rest(where: string): InteractionResult;
}

/** Distância do corpo do jogador até a borda do móvel. */
function edgeDistance(p: PropPlacement, x: number, y: number): number {
  let best = Infinity;
  for (const s of propSolids(p)) {
    const d =
      s.kind === 'circle'
        ? Math.hypot(x - s.x, y - s.y) - s.r
        : Math.hypot(Math.max(s.x - x, 0, x - (s.x + s.w)), Math.max(s.y - y, 0, y - (s.y + s.h)));
    best = Math.min(best, d);
  }
  return best === Infinity ? Math.hypot(p.x - x, p.y - y) : best;
}

export class FurnitureInteractions implements InteractionProvider {
  constructor(
    private readonly state: WorldState,
    private readonly hooks: RestHooks,
  ) {}

  collect(who: Interactor, out: InteractionCandidate[]): void {
    for (const { prop } of this.state.propsNear(who.x, who.y, 130)) {
      const seat = SEATS[prop.type];
      if (!seat) continue;
      const d = edgeDistance(prop, who.x, who.y) - who.radius;
      if (d > 40) continue;
      const main = seat.sleep === 'cama' ? 'sleep' : 'sit';
      const label = main === 'sleep' ? `Dormir na ${seat.name}` : `Sentar no${seat.name === 'poltrona' || seat.name === 'cadeira' ? 'a' : ''} ${seat.name}`;
      out.push({
        target: { key: `movel:${prop.id}`, kind: 'furniture', x: prop.x, y: prop.y, radius: 26, verb: main === 'sleep' ? 'DORMIR' : 'SENTAR', label, enabled: true },
        // Recipientes e portas ganham de móvel de descanso quando estão igualmente perto.
        distance: d + 24,
        perform: () => (main === 'sleep' ? this.hooks.sleep('cama') : this.hooks.rest(`n${seat.name === 'poltrona' || seat.name === 'cadeira' ? 'a' : 'o'} ${seat.name}`)),
        more: () => this.more(seat),
      });
    }
  }

  private more(seat: Seat): InteractionOption[] {
    const out: InteractionOption[] = [];
    if (seat.sleep === 'sofa') out.push({ label: 'Dormir no sofá', enabled: true, perform: () => this.hooks.sleep('sofa') });
    if (seat.sleep === 'cama') out.push({ label: 'Descansar na cama', enabled: true, perform: () => this.hooks.rest('na cama') });
    return out;
  }
}
