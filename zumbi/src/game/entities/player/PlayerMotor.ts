import { PLAYER_TUNING } from '../../config/PlayerTuning';
import { clamp, length } from '../../core/math';

/**
 * Física de movimento do personagem — lógica pura, sem Phaser.
 *
 * A velocidade anda em direção ao alvo com aceleração limitada
 * ("moveTowards" vetorial). Resultado: arranque suave, parada firme,
 * curvas sem deslizar, e o mesmo comportamento a 30, 60 ou 120 FPS.
 */
export interface MoveIntent {
  /** Direção desejada, magnitude 0..1 (joystick analógico ou teclado). */
  x: number;
  y: number;
  sprint: boolean;
}

export interface Velocity {
  x: number;
  y: number;
}

/** Velocidade alvo para um input. Diagonal nunca fica mais rápida que reto. */
export function targetVelocity(intent: MoveIntent, canSprint: boolean): Velocity {
  let mag = length(intent.x, intent.y);
  if (mag < 1e-4) return { x: 0, y: 0 };
  const dirX = intent.x / mag;
  const dirY = intent.y / mag;
  mag = clamp(mag, 0, 1);
  const t = PLAYER_TUNING;
  // Joystick analógico: pouca inclinação = passo lento, mas nunca "quase parado".
  const factor = t.minAnalogSpeedFactor + (1 - t.minAnalogSpeedFactor) * mag;
  const running = intent.sprint && canSprint && mag > 0.5;
  const speed = running ? t.runSpeed : t.walkSpeed * factor;
  return { x: dirX * speed, y: dirY * speed };
}

/** Aproxima `current` de `target` respeitando aceleração/desaceleração. */
export function stepVelocity(
  current: Velocity,
  target: Velocity,
  dt: number,
  accel: number = PLAYER_TUNING.accel,
  decel: number = PLAYER_TUNING.decel,
): Velocity {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const dist = length(dx, dy);
  if (dist < 1e-6) return { x: target.x, y: target.y };

  // Frear (alvo menor ou em outra direção) usa a desaceleração, mais forte.
  const currentSpeed = length(current.x, current.y);
  const targetSpeed = length(target.x, target.y);
  const along = currentSpeed > 1e-6 ? (current.x * target.x + current.y * target.y) / currentSpeed : targetSpeed;
  const braking = targetSpeed < currentSpeed || along < currentSpeed * 0.7;
  const rate = braking ? decel : accel;

  const maxDelta = rate * dt;
  if (dist <= maxDelta) return { x: target.x, y: target.y };
  return { x: current.x + (dx / dist) * maxDelta, y: current.y + (dy / dist) * maxDelta };
}
