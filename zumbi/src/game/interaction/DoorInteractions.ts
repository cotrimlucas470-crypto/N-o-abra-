/**
 * Portas: abrir, fechar, e esbarrar numa trancada. Abrir e fechar fazem
 * barulho (evento `world:noise`), proporcional ao tipo de porta.
 */
import { DOOR_TUNING, INTERACTION_TUNING } from '../config/WorldTuning';
import type { EventBus } from '../core/EventBus';
import { chunkKey, chunkOf } from '../sim/ChunkGrid';
import type { WorldState } from '../sim/WorldState';
import { doorGapRect, doorLabel, distToRect } from '../world/doors';
import type { DoorPlacement, Rect } from '../world/MapTypes';
import type { InteractionCandidate, InteractionOption, InteractionProvider, Interactor } from './InteractionSystem';

/** Um corpo que pode estar no meio do vão (jogador; depois zumbis, NPCs). */
export interface Body {
  x: number;
  y: number;
  radius: number;
}

export class DoorInteractions implements InteractionProvider {
  constructor(
    private readonly state: WorldState,
    private readonly bus: EventBus,
    /** Corpos que impedem a porta de fechar. */
    private readonly bodies: () => Body[],
    /** Outras ações da porta (chave, pé de cabra, trancar por dentro). */
    private readonly extras?: (d: DoorPlacement, who: Interactor) => InteractionOption[],
  ) {}

  collect(who: Interactor, out: InteractionCandidate[]): void {
    const map = this.state.model.map;
    const index = this.state.model.index;
    const { cx, cy } = chunkOf(who.x, who.y);
    const reach = INTERACTION_TUNING.doorReach;
    // Porta pertence ao chunk do centro; a vizinhança 3×3 cobre o alcance.
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const content = index.get(chunkKey(cx + dx, cy + dy));
        if (!content) continue;
        for (const i of content.doors) {
          const d = map.doors[i]!;
          if (this.state.doorState(d.id)?.broken) continue;
          const rect = doorGapRect(d);
          const dist = distToRect(who.x, who.y, rect) - who.radius;
          if (dist > reach) continue;
          const c = this.candidate(d, rect, dist);
          if (this.extras) c.more = () => this.extras!(d, who);
          out.push(c);
        }
      }
    }
  }

  private candidate(d: DoorPlacement, rect: Rect, distance: number): InteractionCandidate {
    const s = this.state.doorState(d.id)!;
    const name = doorLabel(d);
    const verb = s.locked ? 'TRANCADA' : s.open ? 'FECHAR' : 'ABRIR';
    const label = s.locked ? `${capitalize(name)} trancada` : `${s.open ? 'Fechar' : 'Abrir'} ${name}`;
    return {
      target: { key: `porta:${d.id}`, kind: 'door', x: d.x, y: d.y, rect, verb, label, enabled: !s.locked },
      distance,
      perform: () => this.toggle(d, rect),
    };
  }

  private toggle(d: DoorPlacement, rect: Rect): { ok: boolean; message?: string } {
    const s = this.state.doorState(d.id);
    if (!s) return { ok: false };
    if (s.locked) {
      this.bus.emit('world:noise', { x: d.x, y: d.y, radius: DOOR_TUNING.lockedRattleRadius, source: 'maçaneta' });
      return { ok: false, message: 'Trancada.' };
    }
    if (s.open && this.bodies().some((b) => distToRect(b.x, b.y, rect) < b.radius)) {
      return { ok: false, message: 'Tem algo no caminho.' };
    }
    if (!this.state.setDoorOpen(d.id, !s.open)) return { ok: false };
    const radius = DOOR_TUNING.noiseRadius[d.style] * DOOR_TUNING.noiseMaterial[d.material];
    this.bus.emit('world:noise', { x: d.x, y: d.y, radius, source: d.style === 'rolling' ? 'portão' : 'porta' });
    return { ok: true };
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
