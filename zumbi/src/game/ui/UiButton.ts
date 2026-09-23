/**
 * Botão retangular de menu (px CSS). Usa a entrada interativa do Phaser:
 * dispara no "soltar o dedo" DENTRO do botão (padrão de celular — dá
 * para desistir arrastando o dedo para fora).
 */
import Phaser from 'phaser';
import { UI, textStyle } from './theme';

export class UiButton extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private btnW: number;
  private btnH: number;
  private pressed = false;

  constructor(
    scene: Phaser.Scene,
    text: string,
    w: number,
    h: number,
    private readonly onTap: () => void,
    private readonly primary = true,
    dpr = 1,
  ) {
    super(scene, 0, 0);
    this.btnW = w;
    this.btnH = h;
    this.bg = scene.add.graphics();
    this.label = scene.add.text(0, 0, text, textStyle(Math.round(h * 0.38), primary ? '#16171a' : UI.text, '700')).setOrigin(0.5).setResolution(dpr);
    this.add([this.bg, this.label]);
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.setPressed(true));
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => this.setPressed(false));
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      if (!this.pressed) return;
      this.setPressed(false);
      this.onTap();
    });
    this.draw();
    scene.add.existing(this);
  }

  setLabel(text: string): this {
    this.label.setText(text);
    return this;
  }

  private setPressed(v: boolean): void {
    this.pressed = v;
    this.draw();
  }

  private draw(): void {
    const g = this.bg;
    g.clear();
    const r = Math.min(12, this.btnH / 2);
    const s = this.pressed ? 0.97 : 1;
    const w = this.btnW * s;
    const h = this.btnH * s;
    if (this.primary) {
      g.fillStyle(this.pressed ? 0xc99440 : UI.accentNum, 1);
    } else {
      g.fillStyle(0x1b1d22, this.pressed ? 0.95 : 0.8);
      g.lineStyle(1.5, 0xffffff, 0.22);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    }
    g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  }
}
