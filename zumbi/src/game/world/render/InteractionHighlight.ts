/**
 * Destaque no mundo do alvo de interação atual: contorno pulsante no vão
 * da porta ou anel em volta do item. Vermelho quando a ação não é possível
 * (porta trancada).
 */
import Phaser from 'phaser';
import { DEPTH } from '../../config/GameConfig';
import type { InteractionTarget } from '../../interaction/InteractionSystem';

const OK = 0xe0a84a;
const BLOCKED = 0xd0564a;

export class InteractionHighlight {
  private readonly g: Phaser.GameObjects.Graphics;
  private target: InteractionTarget | null = null;
  private time = 0;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(DEPTH.fx);
  }

  set(target: InteractionTarget | null): void {
    if (target?.key !== this.target?.key) this.time = 0;
    this.target = target;
  }

  update(dt: number): void {
    const g = this.g;
    g.clear();
    const t = this.target;
    if (!t) return;
    this.time += dt;
    const pulse = 0.55 + 0.45 * Math.sin(this.time * 6);
    const color = t.enabled ? OK : BLOCKED;
    if (t.rect) {
      const pad = 5;
      g.lineStyle(3, color, 0.35 + 0.5 * pulse);
      g.strokeRoundedRect(t.rect.x - pad, t.rect.y - pad, t.rect.w + pad * 2, t.rect.h + pad * 2, 6);
    } else {
      const r = (t.radius ?? 18) + 3 * pulse;
      g.lineStyle(2.5, color, 0.4 + 0.5 * pulse);
      g.strokeCircle(t.x, t.y, r);
    }
  }
}
