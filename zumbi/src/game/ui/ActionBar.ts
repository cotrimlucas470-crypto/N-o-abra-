/**
 * Barra da ação em andamento ("Enfaixando o braço…", "Dormindo…") com
 * progresso e um botão para cancelar (ou ACORDAR). Enquanto dorme, a tela
 * escurece e mostra a hora passando.
 */
import type Phaser from 'phaser';
import { UiButton } from './UiButton';
import { UI, textStyle } from './theme';

export class ActionBar {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly sleepText: Phaser.GameObjects.Text;
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly btn: UiButton;
  private x = 0;
  private y = 0;
  private w = 260;
  private k = 1;
  private cssW = 0;
  visible = false;

  constructor(scene: Phaser.Scene, dpr: number, onCancel: () => void) {
    this.dim = scene.add.rectangle(0, 0, 10, 10, 0x04050a, 0.6).setOrigin(0, 0).setDepth(84).setVisible(false);
    this.g = scene.add.graphics().setDepth(135);
    this.label = scene.add.text(0, 0, '', textStyle(12, UI.text, '700')).setOrigin(0.5, 1).setResolution(dpr).setDepth(136);
    this.sleepText = scene.add.text(0, 0, '', textStyle(22, UI.text, '800')).setOrigin(0.5).setResolution(dpr).setDepth(96).setVisible(false);
    this.sleepText.setLetterSpacing(3);
    this.btn = new UiButton(scene, 'CANCELAR', 120, 34, onCancel, false, dpr);
    this.btn.setDepth(136).setVisible(false);
  }

  layout(cssW: number, cssH: number, y: number, k: number): void {
    this.cssW = cssW;
    this.k = k;
    this.w = Math.min(260 * k, cssW * 0.42);
    this.x = cssW / 2 - this.w / 2;
    this.y = y;
    this.dim.setSize(cssW, cssH);
  }

  /** `progress` 0..1; `sleeping` escurece a tela e mostra a hora. */
  /** `cx`: centro horizontal (com o painel aberto, a barra vai para o lado livre). */
  update(label: string | null, progress: number, sleeping: boolean, clock: string, cx = this.cssW / 2): void {
    this.x = cx - this.w / 2;
    const show = label !== null;
    this.visible = show;
    this.g.clear();
    this.label.setVisible(show);
    this.btn.setVisible(show);
    this.dim.setVisible(show && sleeping);
    this.sleepText.setVisible(show && sleeping);
    if (!show) return;
    const k = this.k;
    const h = 8 * k;
    this.g.fillStyle(0x0e0f12, 0.8).fillRoundedRect(this.x - 10 * k, this.y - 26 * k, this.w + 20 * k, 40 * k, 10 * k);
    this.g.fillStyle(0xffffff, 0.12).fillRoundedRect(this.x, this.y, this.w, h, 4 * k);
    this.g.fillStyle(UI.accentNum, 0.95).fillRoundedRect(this.x, this.y, Math.max(h, this.w * Math.min(1, progress)), h, 4 * k);
    this.label.setText(label).setPosition(cx, this.y - 6 * k).setScale(k);
    this.btn.setLabel(sleeping ? 'ACORDAR' : 'CANCELAR').setScale(k).setPosition(cx, this.y + 38 * k);
    if (sleeping) this.sleepText.setText(`Z z z   ${clock}`).setPosition(cx, Math.max(24 * k, this.y - 58 * k)).setScale(k);
  }

  /** Posição do botão (testes). */
  buttonPos(): { x: number; y: number } | null {
    return this.btn.visible ? { x: this.btn.x, y: this.btn.y } : null;
  }
}
