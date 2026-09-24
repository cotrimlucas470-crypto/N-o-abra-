/**
 * Cartão de informação (examinar carro, detalhes): título + linhas, no
 * centro da tela. Tocar em qualquer lugar fecha; some sozinho depois de
 * alguns segundos.
 */
import Phaser from 'phaser';
import { UI, textStyle } from './theme';

export class InfoCard {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private timer = 0;
  open = false;

  constructor(scene: Phaser.Scene, dpr: number) {
    this.g = scene.add.graphics().setDepth(160).setVisible(false);
    this.title = scene.add.text(0, 0, '', textStyle(14, UI.text, '800')).setOrigin(0.5, 0).setResolution(dpr).setDepth(161).setVisible(false);
    this.body = scene.add.text(0, 0, '', textStyle(12, UI.textDim, '600')).setOrigin(0.5, 0).setAlign('center').setResolution(dpr).setDepth(161).setVisible(false).setLineSpacing(4);
  }

  show(title: string, lines: readonly string[], cssW: number, cssH: number, k: number): void {
    this.open = true;
    this.timer = 9;
    this.title.setText(title.toUpperCase()).setScale(k).setVisible(true);
    this.body.setText(lines.join('\n')).setScale(k).setVisible(true);
    const w = Math.max(this.title.width, this.body.width) * k + 40 * k;
    const h = (this.title.height + this.body.height) * k + 40 * k;
    const x = cssW / 2 - w / 2;
    const y = cssH * 0.3 - h / 2;
    this.g.clear().setVisible(true);
    this.g.fillStyle(0x0e0f12, 0.94).fillRoundedRect(x, y, w, h, 12 * k);
    this.g.lineStyle(1.5, 0xffffff, 0.16).strokeRoundedRect(x, y, w, h, 12 * k);
    this.title.setPosition(cssW / 2, y + 14 * k);
    this.body.setPosition(cssW / 2, y + 22 * k + this.title.height * k);
  }

  hide(): void {
    this.open = false;
    this.g.setVisible(false);
    this.title.setVisible(false);
    this.body.setVisible(false);
  }

  update(dt: number): void {
    if (!this.open) return;
    this.timer -= dt;
    if (this.timer <= 0) this.hide();
  }
}
