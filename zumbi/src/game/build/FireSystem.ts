/**
 * Fogos do mundo (puro): de tempos em tempos acerta a lenha de cada fogo
 * aceso (a chuva no descoberto acelera e apaga fogo fraco), mantém a lista
 * dos fogos perto do jogador (calor a cada quadro sem varrer o mundo) e diz
 * quem precisa de luz no desenho.
 */
import { FIRE_TUNING } from '../config/CraftTuning';
import type { WorldState } from '../sim/WorldState';
import { burnRate, heatAt, isBurning, rainPutsOut, settle, strength } from './Fire';
import { STRUCTURE_DEFS } from './StructureCatalog';
import type { Structure } from './Structures';

export interface FireLight {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  flicker?: boolean;
}

export class FireSystem {
  private nearby: Structure[] = [];

  constructor(
    private readonly state: WorldState,
    private readonly sheltered: (x: number, y: number) => boolean,
  ) {}

  private *fires(): Generator<Structure> {
    for (const s of this.state.structures.list()) if (STRUCTURE_DEFS[s.type].fire) yield s;
  }

  /**
   * Acerta as contas (chamar ~1 vez por segundo real). `now` em minutos do
   * relógio. Devolve as fogueiras que apagaram agora perto do jogador.
   */
  tick(now: number, rain: number, px: number, py: number): Structure[] {
    const out: Structure[] = [];
    const near: Structure[] = [];
    const range2 = FIRE_TUNING.lightRange ** 2;
    for (const s of this.fires()) {
      const wasLit = !!s.lit;
      const cover = this.sheltered(s.x, s.y);
      let ended = settle(s, now, burnRate(rain, cover));
      if (!ended && s.lit && rainPutsOut(s, now, rain, cover)) {
        delete s.lit;
        ended = 'apagou';
      }
      const close = (s.x - px) ** 2 + (s.y - py) ** 2 <= range2;
      if (close) near.push(s);
      if (wasLit && ended) {
        this.state.structures.changed(s);
        if (close) out.push(s);
      }
    }
    this.nearby = near;
    return out;
  }

  /** Calor no ponto (0..1), só com os fogos perto do jogador. */
  heat(x: number, y: number, now: number): number {
    return heatAt(this.nearby, x, y, now);
  }

  /** Luzes dos fogos acesos perto do jogador. */
  lights(now: number, out: FireLight[]): void {
    for (const s of this.nearby) {
      if (!isBurning(s, now)) continue;
      const f = STRUCTURE_DEFS[s.type].fire!;
      out.push({ x: s.x, y: s.y, radius: f.lightRadius * (0.7 + 0.3 * strength(s, now)), intensity: 0.95, flicker: true });
    }
  }

  /** O ponto está dentro de um fogo aceso? */
  inFire(x: number, y: number, now: number): boolean {
    const r2 = FIRE_TUNING.burnRadius ** 2;
    return this.nearby.some((s) => isBurning(s, now) && (s.x - x) ** 2 + (s.y - y) ** 2 <= r2);
  }

  /** Algum fogo aceso a até `r` px? (estação de cozinha) */
  burningNear(x: number, y: number, r: number, now: number): Structure | null {
    for (const s of this.state.structures.near(x, y, r)) if (STRUCTURE_DEFS[s.type].fire && isBurning(s, now)) return s;
    return null;
  }
}
