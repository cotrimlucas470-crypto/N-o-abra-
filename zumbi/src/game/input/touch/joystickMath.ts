import { clamp, length } from '../../core/math';
import type { StickValue } from '../InputState';

/**
 * Converte o deslocamento do dedo (em px de tela) no valor do joystick.
 * - zona morta: pequenos tremores do polegar não movem o personagem;
 * - fora da zona morta a resposta é remapeada para 0..1 (sem "degrau");
 * - além do raio, satura em 1.
 */
export function computeStick(dx: number, dy: number, radius: number, deadzone: number): StickValue {
  const dist = length(dx, dy);
  if (radius <= 0 || dist < 1e-6) return { x: 0, y: 0, magnitude: 0, active: true };
  const raw = clamp(dist / radius, 0, 1);
  const magnitude = raw <= deadzone ? 0 : (raw - deadzone) / (1 - deadzone);
  return { x: (dx / dist) * magnitude, y: (dy / dist) * magnitude, magnitude, active: true };
}

/** Posição visual do "pino" do joystick, preso dentro do raio. */
export function clampKnob(dx: number, dy: number, radius: number): { x: number; y: number } {
  const dist = length(dx, dy);
  if (dist <= radius || dist < 1e-6) return { x: dx, y: dy };
  return { x: (dx / dist) * radius, y: (dy / dist) * radius };
}
