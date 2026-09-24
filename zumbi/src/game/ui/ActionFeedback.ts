/**
 * Resposta curta a uma ação do jogador ("Trancada.", "+1 Atadura"),
 * logo abaixo do personagem. Some sozinha; uma nova substitui a anterior.
 */
import type Phaser from 'phaser';
import { UI, textStyle } from './theme';

const COLORS = { info: UI.text, ok: '#c9e7a8', warn: '#f2a77e' } as const;

export class ActionFeedback {
  private readonly text: Phaser.GameObjects.Text;
  private y = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    dpr: number,
  ) {
    this.text = scene.add.text(0, 0, '', textStyle(14, UI.text, '700')).setOrigin(0.5).setDepth(130).setAlpha(0).setResolution(dpr);
    this.text.setShadow(0, 1, 'rgba(0,0,0,0.85)', 4, false, true);
    this.text.setBackgroundColor('rgba(12,13,16,0.55)').setPadding(10, 5, 10, 5);
  }

  setPosition(x: number, y: number, k: number): void {
    this.y = y;
    this.text.setPosition(x, y).setScale(k);
  }

  show(message: string, tone: keyof typeof COLORS): void {
    const tw = this.scene.tweens;
    tw.killTweensOf(this.text);
    this.text.setText(message).setColor(COLORS[tone]).setAlpha(0).setY(this.y + 6);
    tw.add({ targets: this.text, alpha: 1, y: this.y, duration: 160, ease: 'Sine.easeOut' });
    tw.add({ targets: this.text, alpha: 0, delay: 1500, duration: 450, ease: 'Sine.easeIn' });
  }
}
