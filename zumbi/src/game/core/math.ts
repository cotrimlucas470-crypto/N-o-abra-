/** Utilidades matemáticas puras (sem Phaser) — testáveis. */

export const TAU = Math.PI * 2;

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Normaliza um ângulo para (-PI, PI]. */
export function wrapAngle(a: number): number {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

/** Diferença angular mais curta de `from` até `to`. */
export function angleDelta(from: number, to: number): number {
  return wrapAngle(to - from);
}

/** Gira `current` em direção a `target` no máximo `maxStep` radianos. */
export function rotateTowards(current: number, target: number, maxStep: number): number {
  const d = angleDelta(current, target);
  if (Math.abs(d) <= maxStep) return wrapAngle(target);
  return wrapAngle(current + Math.sign(d) * maxStep);
}

/**
 * Suavização exponencial independente de FPS.
 * `sharpness` maior = segue mais rápido. Retorna o fator t para lerp.
 */
export function damp(sharpness: number, dt: number): number {
  return 1 - Math.exp(-sharpness * dt);
}

export interface Vec2 {
  x: number;
  y: number;
}

export function length(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}
