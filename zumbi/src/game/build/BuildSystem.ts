/**
 * Construções que mudam com o tempo (puro): coletor de chuva enche com a
 * chuva, horta cresce, seca ou morre. Acerta as contas de vez em quando
 * (não a cada quadro) e só o que mudou avisa o desenho.
 */
import { FARM_TUNING } from '../config/BuildTuning';
import type { WorldState } from '../sim/WorldState';
import { tickPlot } from './Farm';
import { STRUCTURE_DEFS } from './StructureCatalog';
import type { Structure } from './Structures';

export class BuildSystem {
  constructor(
    private readonly state: WorldState,
    private readonly sheltered: (x: number, y: number) => boolean,
    private readonly growthSpeed: number,
  ) {}

  /** `now` em minutos do relógio; `rain` 0..1; `temp` °C lá fora. Devolve as plantas que morreram agora. */
  tick(now: number, rain: number, temp: number): Structure[] {
    const died: Structure[] = [];
    for (const s of this.state.structures.list()) {
      const d = STRUCTURE_DEFS[s.type];
      if (d.water) {
        const last = s.tickAt ?? now;
        s.tickAt = now;
        if (rain > 0.05 && !this.sheltered(s.x, s.y) && (s.water ?? 0) < d.water.max) {
          const before = Math.floor(s.water ?? 0);
          s.water = Math.min(d.water.max, (s.water ?? 0) + ((now - last) / 60) * rain * FARM_TUNING.collectorPerHour);
          // Água de chuva parada: ferva antes de beber.
          s.dirty = 1;
          if (Math.floor(s.water) !== before) this.state.structures.changed(s);
        }
      } else if (d.farm && s.crop) {
        const stage = s.crop.growth;
        const r = tickPlot(s, now, this.sheltered(s.x, s.y) ? 0 : rain, temp, this.growthSpeed);
        if (r === 'morreu') died.push(s);
        // Redesenha só quando muda de fase visível (a cada ~10% de crescimento).
        if (r || Math.floor(stage * 10) !== Math.floor(s.crop.growth * 10)) this.state.structures.changed(s);
      }
    }
    return died;
  }
}
