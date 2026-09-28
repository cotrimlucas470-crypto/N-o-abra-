/**
 * ESCADA: subir e descer entre os andares do prédio. A ação principal é
 * subir quando há andar acima (descer fica no "⋯"); no último andar,
 * descer. Quem faz a viagem (tela escurece, câmera, barulho do degrau) é a cena.
 */
import type { StairPlacement } from '../world/MapTypes';
import type { WorldModel } from '../world/WorldModel';
import type { InteractionCandidate, InteractionOption, InteractionProvider, InteractionResult, Interactor } from './InteractionSystem';

export interface StairHooks {
  go(stair: StairPlacement, toLevel: number): InteractionResult;
}

/** "térreo", "1º andar"... */
export function levelName(level: number): string {
  return level === 0 ? 'térreo' : `${level}º andar`;
}

export class StairInteractions implements InteractionProvider {
  constructor(
    private readonly model: WorldModel,
    private readonly hooks: StairHooks,
  ) {}

  collect(who: Interactor, out: InteractionCandidate[]): void {
    const floors = this.model.floors;
    if (!floors.any) return;
    for (const s of floors.stairsNear(who.x, who.y, 34 + who.radius)) {
      // Só a escada do espaço em que o jogador está (andar ou cidade).
      if (floors.spaceAt(s.x + s.w / 2, s.y + s.h / 2) !== floors.spaceAt(who.x, who.y)) continue;
      const top = floors.top(s.building);
      const opts: InteractionOption[] = [];
      if (s.up && s.level < top) opts.push({ label: `Subir para o ${levelName(s.level + 1)}`, enabled: true, perform: () => this.hooks.go(s, s.level + 1) });
      if (s.down && s.level > 0) opts.push({ label: `Descer para o ${levelName(s.level - 1)}`, enabled: true, perform: () => this.hooks.go(s, s.level - 1) });
      const main = opts[0];
      if (!main) continue;
      const dx = Math.max(s.x - who.x, 0, who.x - (s.x + s.w));
      const dy = Math.max(s.y - who.y, 0, who.y - (s.y + s.h));
      out.push({
        target: { key: `escada:${s.id}`, kind: 'stair', x: s.x + s.w / 2, y: s.y + s.h / 2, rect: { x: s.x, y: s.y, w: s.w, h: s.h }, verb: main.label.startsWith('Subir') ? 'SUBIR' : 'DESCER', label: main.label, enabled: true },
        distance: Math.hypot(dx, dy) - 6,
        perform: () => main.perform(),
        more: () => opts.slice(1),
      });
    }
  }
}
