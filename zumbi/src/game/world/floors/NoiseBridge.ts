/**
 * SOM ENTRE ANDARES (puro). Cada andar mora longe dos outros no mapa; o
 * barulho passa de um para outro pela ESCADA (e pela laje, abafado):
 * - barulho num andar → aparece no vão da escada dos outros andares do
 *   mesmo prédio (inclusive o térreo);
 * - barulho na cidade perto de um prédio com andares → aparece no vão da
 *   escada de cada andar de cima.
 * O alcance cai com a distância até a escada; o andar diferente ainda abafa
 * como paredes (NoiseSystem.heard, pelo `floor` de quem fez e de quem ouve).
 * `via` diz de onde veio de verdade: quem ouve sabe que é "lá em cima/embaixo".
 */
import type { NoiseEvent } from '../../sim/Noise';
import type { Floors } from './Floors';

export interface BridgedNoise {
  x: number;
  y: number;
  radius: number;
  /** Andar de onde o som saiu (a laje abafa pela diferença). */
  floor: number;
  via: NonNullable<NoiseEvent['via']>;
}

/** Sons que o barulho em (x, y) gera nos outros andares. */
export function bridgeNoise(floors: Floors, x: number, y: number, radius: number): BridgedNoise[] {
  if (!floors.any) return [];
  const out: BridgedNoise[] = [];
  const space = floors.spaceAt(x, y);
  if (space < 0) return out;
  const center = (building: string, level: number) => {
    const s = floors.stair(building, level);
    return s ? { x: s.x + s.w / 2, y: s.y + s.h / 2 } : null;
  };
  if (space > 0) {
    const f = floors.list[space - 1]!;
    const real = floors.toReal(x, y);
    const ground = center(f.building, 0);
    if (!ground) return out;
    const r = radius * 0.9 - Math.hypot(real.x - ground.x, real.y - ground.y);
    if (r < 60) return out;
    for (let level = 0; level <= floors.top(f.building); level++) {
      if (level === f.level) continue;
      const c = center(f.building, level);
      if (c) out.push({ x: c.x, y: c.y, radius: r, floor: f.level, via: { building: f.building, level: f.level, x: real.x, y: real.y } });
    }
    return out;
  }
  // Cidade: prédios com andares por perto ouvem pela escada.
  const seen = new Set<string>();
  for (const f of floors.list) {
    if (seen.has(f.building)) continue;
    seen.add(f.building);
    const ground = center(f.building, 0);
    if (!ground) continue;
    const r = radius * 0.8 - Math.hypot(x - ground.x, y - ground.y);
    if (r < 80) continue;
    for (let level = 1; level <= floors.top(f.building); level++) {
      const c = center(f.building, level);
      if (c) out.push({ x: c.x, y: c.y, radius: r, floor: 0, via: { building: f.building, level: 0, x, y } });
    }
  }
  return out;
}
