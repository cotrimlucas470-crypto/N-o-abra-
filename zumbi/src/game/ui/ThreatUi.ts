/**
 * Avisos de perigo imediato no HUD (px CSS): AGARRADO (com a barra de se
 * soltar), NO CHÃO, e o selo FURTIVO. E a TELA DE MORTE com a causa
 * explicada, os dias sobrevividos e o que fazer em seguida (carregar o
 * último save — nunca apagado — ou voltar ao menu).
 */
import Phaser from 'phaser';
import type { DeathReport } from '../survival/Death';
import { UiButton } from './UiButton';
import { UI, textStyle } from './theme';

export class ThreatBanner {
  private readonly box: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly sneak: Phaser.GameObjects.Text;
  private pulse = 0;
  private w = 0;

  constructor(scene: Phaser.Scene, dpr: number) {
    this.bg = scene.add.graphics();
    this.title = scene.add.text(0, -10, '', textStyle(18, '#ffe0d8', '900')).setOrigin(0.5).setResolution(dpr);
    this.title.setLetterSpacing(2);
    this.hint = scene.add.text(0, 12, '', textStyle(11, UI.text, '700')).setOrigin(0.5).setResolution(dpr);
    this.box = scene.add.container(0, 0, [this.bg, this.title, this.hint]).setDepth(97).setVisible(false);
    this.sneak = scene.add.text(0, 0, 'FURTIVO', textStyle(11, '#b8d8a8', '800')).setOrigin(0, 0.5).setResolution(dpr).setDepth(92).setVisible(false);
    this.sneak.setBackgroundColor('rgba(12,14,12,0.55)').setPadding(6, 2, 6, 2);
  }

  setPosition(x: number, y: number, k: number, sneakX: number, sneakY: number): void {
    this.box.setPosition(x, y).setScale(k);
    this.sneak.setPosition(sneakX, sneakY).setScale(k);
  }

  update(dt: number, t: { sneaking: boolean; grabbed: number; down: boolean; escape: number } | null, touch: boolean): void {
    this.sneak.setVisible(!!t?.sneaking);
    const on = !!t && (t.grabbed > 0 || t.down);
    this.box.setVisible(on);
    if (!on || !t) return;
    this.pulse += dt;
    const title = t.down ? 'NO CHÃO!' : t.grabbed > 1 ? `AGARRADO POR ${t.grabbed}!` : 'AGARRADO!';
    const hint = t.down ? 'Levantando… (vários em cima: não dá)' : touch ? 'Toque EMPURRAR, bata ou puxe com o joystick' : 'G empurra · F bate · ande para puxar';
    if (this.title.text !== title) this.title.setText(title);
    if (this.hint.text !== hint) this.hint.setText(hint);
    const w = Math.max(this.title.width, this.hint.width) + 34;
    this.w = w;
    const g = this.bg;
    g.clear();
    const a = 0.72 + Math.sin(this.pulse * 10) * 0.12;
    g.fillStyle(0x4a0c0a, a).fillRoundedRect(-w / 2, -26, w, 56, 10);
    g.lineStyle(2, 0xff7a6a, 0.8).strokeRoundedRect(-w / 2, -26, w, 56, 10);
    if (!t.down) {
      // Barra de "se soltar".
      g.fillStyle(0x000000, 0.5).fillRoundedRect(-w / 2 + 12, 22, w - 24, 5, 2);
      g.fillStyle(0xffd0a0, 0.95).fillRoundedRect(-w / 2 + 12, 22, Math.max(2, (w - 24) * Math.min(1, t.escape)), 5, 2);
    }
  }

  get width(): number {
    return this.w;
  }
}

export class DeathScreen {
  private readonly layer: Phaser.GameObjects.Container;
  private readonly dim: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly cause: Phaser.GameObjects.Text;
  private readonly details: Phaser.GameObjects.Text;
  private readonly stats: Phaser.GameObjects.Text;
  private readonly loadBtn: UiButton;
  private readonly menuBtn: UiButton;
  private t = 0;
  visible = false;

  constructor(scene: Phaser.Scene, dpr: number, onLoad: (() => void) | null, onMenu: () => void) {
    this.dim = scene.add.rectangle(0, 0, 10, 10, 0x0a0303, 0.86).setOrigin(0, 0);
    this.dim.setInteractive();
    this.title = scene.add.text(0, 0, '', textStyle(30, '#e05a4a', '900')).setOrigin(0.5).setResolution(dpr);
    this.title.setLetterSpacing(4);
    this.cause = scene.add.text(0, 0, '', textStyle(15, UI.text, '700')).setOrigin(0.5).setResolution(dpr);
    this.details = scene.add.text(0, 0, '', { ...textStyle(12, UI.textDim, '600'), align: 'center', lineSpacing: 4 }).setOrigin(0.5, 0).setResolution(dpr);
    this.stats = scene.add.text(0, 0, '', textStyle(12, '#c8c0a8', '700')).setOrigin(0.5).setResolution(dpr);
    this.loadBtn = new UiButton(scene, 'CARREGAR ÚLTIMO SAVE', 250, 46, () => onLoad?.(), true, dpr);
    this.menuBtn = new UiButton(scene, 'MENU', 150, 42, onMenu, false, dpr);
    if (!onLoad) this.loadBtn.setVisible(false);
    this.layer = scene.add.container(0, 0, [this.dim, this.title, this.cause, this.details, this.stats, this.loadBtn, this.menuBtn]).setDepth(180).setVisible(false).setAlpha(0);
    this.hasLoad = !!onLoad;
  }

  private readonly hasLoad: boolean;

  show(r: DeathReport): void {
    this.visible = true;
    this.t = 0;
    this.title.setText(r.title.toUpperCase());
    this.cause.setText(r.cause);
    this.details.setText(r.details.slice(0, 7).map((d) => `• ${d}`).join('\n'));
    this.stats.setText(`Sobreviveu ${r.days} dia${r.days === 1 ? '' : 's'} · ${r.kills} zumbi${r.kills === 1 ? '' : 's'} abatido${r.kills === 1 ? '' : 's'}`);
    this.loadBtn.setVisible(this.hasLoad);
    this.layer.setVisible(true);
  }

  update(dt: number): void {
    if (!this.visible) return;
    this.t += dt;
    // Entra devagar (o mundo escurece antes).
    this.layer.setAlpha(Math.min(1, Math.max(0, (this.t - 1.2) / 1.2)));
  }

  layout(w: number, h: number, k: number): void {
    this.dim.setSize(w, h);
    const cx = w / 2;
    this.title.setPosition(cx, h * 0.18).setScale(k);
    this.cause.setPosition(cx, h * 0.18 + 38 * k).setScale(k);
    this.details.setPosition(cx, h * 0.18 + 62 * k).setScale(k).setWordWrapWidth(Math.min(560, w * 0.86 / k));
    const by = Math.min(h - 70 * k, h * 0.18 + 70 * k + this.details.height * k + 60 * k);
    this.stats.setPosition(cx, by - 34 * k).setScale(k);
    this.loadBtn.setPosition(cx - (this.hasLoad ? 90 * k : 0), by + 10 * k).setScale(k);
    this.menuBtn.setPosition(this.hasLoad ? cx + 130 * k : cx, by + 10 * k).setScale(k);
  }
}
