/** Aviso curto no topo da tela ("Mercadinho", "Zona Residencial"...). */
import type Phaser from 'phaser';
import { UI, textStyle } from './theme';

export class Toast {
  private readonly title: Phaser.GameObjects.Text;
  private readonly sub: Phaser.GameObjects.Text;
  private y = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    dpr: number,
  ) {
    this.title = scene.add.text(0, 0, '', textStyle(20, UI.text, '800')).setOrigin(0.5, 0).setDepth(95).setAlpha(0).setResolution(dpr);
    this.title.setShadow(0, 2, 'rgba(0,0,0,0.7)', 6, false, true);
    this.title.setLetterSpacing(2);
    this.sub = scene.add.text(0, 0, '', textStyle(12, UI.textDim, '600')).setOrigin(0.5, 0).setDepth(95).setAlpha(0).setResolution(dpr);
    this.sub.setShadow(0, 1, 'rgba(0,0,0,0.7)', 4, false, true);
  }

  setPosition(x: number, y: number, scale: number): void {
    this.y = y;
    this.title.setPosition(x, y).setScale(scale);
    this.sub.setPosition(x, y + 26 * scale).setScale(scale);
  }

  private queue: { title: string; subtitle: string; holdMs: number }[] = [];
  private busyUntil = 0;

  /** Mostra um aviso; se outro estiver na tela, entra na fila (máx. 2 esperando). */
  show(title: string, subtitle = '', holdMs = 1600): void {
    const now = this.scene.time.now;
    if (now < this.busyUntil) {
      this.queue.push({ title, subtitle, holdMs });
      if (this.queue.length > 2) this.queue.shift();
      return;
    }
    const tw = this.scene.tweens;
    tw.killTweensOf([this.title, this.sub]);
    this.title.setText(title.toUpperCase()).setAlpha(0).setY(this.y - 6);
    this.sub.setText(subtitle).setAlpha(0);
    tw.add({ targets: this.title, alpha: 1, y: this.y, duration: 280, ease: 'Sine.easeOut' });
    tw.add({ targets: this.sub, alpha: 1, duration: 280, delay: 60 });
    tw.add({ targets: [this.title, this.sub], alpha: 0, delay: 340 + holdMs, duration: 600, ease: 'Sine.easeIn' });
    // O próximo pode entrar quando este começa a sumir.
    const total = 340 + holdMs + 250;
    this.busyUntil = now + total;
    this.scene.time.delayedCall(total, () => {
      const next = this.queue.shift();
      if (next) this.show(next.title, next.subtitle, next.holdMs);
    });
  }
}
