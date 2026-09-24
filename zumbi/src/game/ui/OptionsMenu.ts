/**
 * Menu "⋯": todas as ações por perto (carro: cada porta, porta-malas,
 * examinar; móvel: abrir, sentar, dormir, desmontar...). Uma coluna de
 * botões perto do botão de interagir; tocar fora fecha.
 */
import type Phaser from 'phaser';
import { UiButton } from './UiButton';
import { UI, textStyle } from './theme';

const MAX = 8;
const BTN_W = 230;
const BTN_H = 34;

export class OptionsMenu {
  private readonly buttons: UiButton[] = [];
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private box = { x: 0, y: 0, w: 0, h: 0 };
  open = false;

  constructor(scene: Phaser.Scene, dpr: number, onChoose: (index: number) => void) {
    this.bg = scene.add.graphics().setDepth(125).setVisible(false);
    this.title = scene.add.text(0, 0, 'O QUE FAZER', textStyle(11, UI.textDim, '800')).setResolution(dpr).setDepth(126).setVisible(false);
    this.title.setLetterSpacing(1);
    for (let i = 0; i < MAX; i++) {
      const b = new UiButton(scene, '', BTN_W, BTN_H, () => onChoose(i), false, dpr);
      b.setDepth(126).setVisible(false);
      this.buttons.push(b);
    }
  }

  /** Mostra as opções ancoradas acima de (ax, ay) — canto do botão. */
  show(options: readonly { label: string; enabled: boolean }[], ax: number, ay: number, cssW: number, k: number): void {
    const n = Math.min(MAX, options.length);
    this.open = n > 0;
    const w = BTN_W * k + 16 * k;
    const h = n * (BTN_H + 6) * k + 30 * k;
    const x = Math.max(8, Math.min(cssW - w - 8, ax - w + 30 * k));
    const y = Math.max(8, ay - h - 10 * k);
    this.box = { x, y, w, h };
    this.bg.clear().setVisible(this.open);
    this.title.setVisible(this.open);
    if (!this.open) return this.hideButtons();
    this.bg.fillStyle(0x0e0f12, 0.94).fillRoundedRect(x, y, w, h, 12 * k);
    this.bg.lineStyle(1.5, 0xffffff, 0.14).strokeRoundedRect(x, y, w, h, 12 * k);
    this.title.setPosition(x + 10 * k, y + 8 * k).setScale(k);
    this.buttons.forEach((b, i) => {
      const o = options[i];
      b.setVisible(!!o && i < n);
      if (!o) return;
      b.setLabel(o.label).setDim(!o.enabled).setScale(k).setPosition(x + w / 2, y + 26 * k + (i + 0.5) * (BTN_H + 6) * k);
    });
  }

  hide(): void {
    this.open = false;
    this.bg.setVisible(false);
    this.title.setVisible(false);
    this.hideButtons();
  }

  private hideButtons(): void {
    for (const b of this.buttons) b.setVisible(false);
  }

  contains(x: number, y: number): boolean {
    const b = this.box;
    return this.open && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  /** Posição de um botão pela etiqueta (testes). */
  buttonAt(label: string): { x: number; y: number } | null {
    const b = this.buttons.find((x) => x.visible && x.text === label);
    return b ? { x: b.x, y: b.y } : null;
  }
}
