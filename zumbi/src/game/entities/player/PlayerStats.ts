import { HEALTH_TUNING, STAMINA_TUNING } from '../../config/PlayerTuning';
import { clamp } from '../../core/math';

/**
 * Atributos do personagem — lógica pura, sem Phaser (testada em tests/).
 * Vida e fôlego. Fome, sede, sono e temperatura moram em survival/Body.ts;
 * os efeitos deles no fôlego chegam por `setBodyEffects`.
 */
export interface PlayerStatsSnapshot {
  health: number;
  stamina: number;
  exhausted: boolean;
}

export class PlayerStats {
  health: number = HEALTH_TUNING.max;
  readonly maxHealth: number = HEALTH_TUNING.max;
  stamina: number = STAMINA_TUNING.max;
  readonly maxStamina: number = STAMINA_TUNING.max;
  /** Zerou a stamina e ainda não recuperou o suficiente para correr de novo. */
  exhausted = false;

  private regenCooldown = 0;
  /** Efeitos do estado físico (fome, sono, ferimentos, carga) — atualizados pela cena. */
  private body = { drain: 1, regen: 1, canSprint: true };

  constructor(private readonly mods: { drain: number; regen: number } = { drain: 1, regen: 1 }) {}

  setBodyEffects(e: { staminaDrain: number; staminaRegen: number; canSprint: boolean }): void {
    this.body.drain = e.staminaDrain;
    this.body.regen = e.staminaRegen;
    this.body.canSprint = e.canSprint;
  }

  /** Pode começar/continuar a correr agora? */
  canSprint(): boolean {
    return this.body.canSprint && !this.exhausted && this.stamina > 0;
  }

  /** Gasta fôlego numa ação (golpe, esforço). */
  spend(amount: number): void {
    this.stamina = Math.max(0, this.stamina - amount * this.body.drain);
    this.regenCooldown = STAMINA_TUNING.regenDelay;
    if (this.stamina <= 0) this.exhausted = true;
  }

  /**
   * Avança o tempo. `sprinting` = está de fato correndo neste frame.
   * Retorna true se o personagem pode continuar correndo depois do update.
   */
  update(dt: number, sprinting: boolean): boolean {
    const t = STAMINA_TUNING;
    if (sprinting && this.canSprint()) {
      this.stamina = Math.max(0, this.stamina - t.drainPerSecond * this.mods.drain * this.body.drain * dt);
      this.regenCooldown = t.regenDelay;
      if (this.stamina <= 0) this.exhausted = true;
    } else {
      if (this.regenCooldown > 0) {
        this.regenCooldown = Math.max(0, this.regenCooldown - dt);
      } else {
        this.stamina = Math.min(this.maxStamina, this.stamina + t.regenPerSecond * this.mods.regen * this.body.regen * dt);
      }
      if (this.exhausted && this.stamina >= this.maxStamina * t.exhaustedRecoverFraction) {
        this.exhausted = false;
      }
    }
    return this.canSprint();
  }

  setHealth(value: number): void {
    this.health = clamp(value, 0, this.maxHealth);
  }

  snapshot(): PlayerStatsSnapshot {
    return { health: this.health, stamina: this.stamina, exhausted: this.exhausted };
  }

  restore(s: PlayerStatsSnapshot): void {
    this.health = clamp(s.health, 0, this.maxHealth);
    this.stamina = clamp(s.stamina, 0, this.maxStamina);
    this.exhausted = s.exhausted;
  }
}
