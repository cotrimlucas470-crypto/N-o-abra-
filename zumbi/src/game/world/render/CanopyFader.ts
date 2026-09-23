/**
 * Copas de árvore ficam translúcidas quando o jogador passa por baixo,
 * para ele nunca "sumir" atrás de uma árvore.
 */
import { damp } from '../../core/math';

interface Canopy {
  obj: { alpha: number; setAlpha(a: number): unknown };
  x: number;
  y: number;
  radius: number;
}

export class CanopyFader {
  private list: Canopy[] = [];

  add(obj: Canopy['obj'], x: number, y: number, radius: number): void {
    this.list.push({ obj, x, y, radius });
  }

  update(px: number, py: number, dt: number): void {
    const t = damp(10, dt);
    for (const c of this.list) {
      const dx = px - c.x;
      const dy = py - c.y;
      const r = c.radius * 0.82;
      const target = dx * dx + dy * dy < r * r ? 0.35 : 1;
      if (Math.abs(c.obj.alpha - target) > 0.005) c.obj.setAlpha(c.obj.alpha + (target - c.obj.alpha) * t);
    }
  }
}
