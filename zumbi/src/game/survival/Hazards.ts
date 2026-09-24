/**
 * PERIGOS do dia a dia que machucam (sem zumbi nenhum):
 * - Tropeçar: correndo exausto ou pesado demais, dá para cair — torção no
 *   tornozelo, joelho ralado, mão esfolada. A chance vem dos efeitos
 *   físicos (Effects.tripChance).
 * - Caco de vidro no chão: descalço ou de chinelo, o caco entra no pé.
 *   Sapato protege. Cacos do mapa e de janelas quebradas.
 * - Fogo: pisar na fogueira acesa queima o pé ou a perna.
 * Puro, com gerador de aleatório injetável (testes).
 */
import { FIRE_TUNING } from '../config/CraftTuning';
import type { PlayerInventory } from '../items/PlayerInventory';
import type { WorldState } from '../sim/WorldState';
import type { BodyPart } from '../health/Wounds';
import type { PhysicalEffects } from './Effects';
import type { Survivor } from './Survivor';

export interface HazardEvent {
  message: string;
  noise?: number;
}

const CHECK = 0.25;

export class Hazards {
  private timer = 0;
  private lastGlass = '';
  private burnCooldown = 0;

  constructor(
    private readonly state: WorldState,
    private readonly survivor: Survivor,
    private readonly inventory: PlayerInventory,
    private readonly rng: () => number = Math.random,
  ) {}

  frame(dt: number, p: { x: number; y: number; moving: boolean; sprinting: boolean }, fx: PhysicalEffects): HazardEvent | null {
    if (p.sprinting && fx.tripChance > 0 && this.rng() < fx.tripChance * dt) return this.trip();
    this.timer -= dt;
    if (this.timer > 0 || !p.moving) return null;
    this.timer = CHECK;
    const g = this.state.glassNear(p.x, p.y, 14);
    if (!g) {
      this.lastGlass = '';
      return null;
    }
    const feet = this.inventory.wornIn('pes');
    const shod = !!feet && feet.defId !== 'chinelo' && feet.defId !== 'meias';
    if (shod) return null;
    const chance = feet?.defId === 'chinelo' ? 0.2 : 0.45;
    if (this.rng() >= chance) return null;
    // Mesmo caco só fere uma vez por passagem.
    if (this.lastGlass === g.key) return null;
    this.lastGlass = g.key;
    const foot: BodyPart = this.rng() < 0.5 ? 'peE' : 'peD';
    this.survivor.health.add(foot, 'estilhaco', 0.3 + this.rng() * 0.3);
    return { message: 'Um caco de vidro entrou no pé!' };
  }

  /** Parado ou andando dentro do fogo aceso: queimadura (uma a cada poucos segundos, no máximo). */
  burn(dt: number, inFire: boolean): HazardEvent | null {
    this.burnCooldown = Math.max(0, this.burnCooldown - dt);
    if (!inFire || this.burnCooldown > 0) return null;
    const feet = this.inventory.wornIn('pes');
    const chance = FIRE_TUNING.burnChancePerSec * dt * (feet && feet.defId !== 'meias' && feet.defId !== 'chinelo' ? 0.6 : 1);
    if (this.rng() >= chance) return null;
    this.burnCooldown = 2;
    const side = this.rng() < 0.5 ? 'E' : 'D';
    const leg = this.rng() < 0.3;
    this.survivor.health.add((leg ? `perna${side}` : `pe${side}`) as BodyPart, 'queimadura', 0.25 + this.rng() * 0.3);
    return { message: leg ? 'O fogo pegou na perna!' : 'Pisou no fogo! Queimou o pé.' };
  }

  private trip(): HazardEvent {
    const r = this.rng();
    const h = this.survivor.health;
    const side = this.rng() < 0.5 ? 'E' : 'D';
    if (r < 0.45) h.add(`pe${side}` as BodyPart, 'entorse', 0.3 + this.rng() * 0.4);
    else if (r < 0.75) h.add(`perna${side}` as BodyPart, 'contusao', 0.3 + this.rng() * 0.3);
    else h.add(`mao${side}` as BodyPart, 'arranhao', 0.3 + this.rng() * 0.3);
    return { message: r < 0.45 ? 'Tropeçou e torceu o pé!' : 'Tropeçou e caiu!', noise: 220 };
  }
}
