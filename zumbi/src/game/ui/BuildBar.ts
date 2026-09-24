/**
 * Barra do MODO CONSTRUIR: o que está sendo montado, se dá (verde) ou o
 * motivo de não dar (vermelho), e os botões CONSTRUIR, GIRAR e SAIR.
 * O jogador anda e vira para escolher o lugar; a prévia aparece no mundo.
 */
import type Phaser from 'phaser';
import { UiButton } from './UiButton';
import { UI, textStyle } from './theme';

export interface BuildInfo {
  name: string;
  ok: boolean;
  reason: string | null;
  /** Peça que gira (móvel comprido). */
  rotates: boolean;
}

export class BuildBar {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly status: Phaser.GameObjects.Text;
  private readonly build: UiButton;
  private readonly rotate: UiButton;
  private readonly exit: UiButton;
  private box = { x: 0, y: 0, w: 0, h: 0 };
  private k = 1;
  visible = false;

  constructor(scene: Phaser.Scene, dpr: number, on: { build(): void; rotate(): void; exit(): void }) {
    this.g = scene.add.graphics().setDepth(137).setVisible(false);
    this.title = scene.add.text(0, 0, '', textStyle(12, UI.text, '800')).setOrigin(0.5, 0).setResolution(dpr).setDepth(138).setVisible(false);
    this.status = scene.add.text(0, 0, '', textStyle(11, UI.textDim, '700')).setOrigin(0.5, 0).setResolution(dpr).setDepth(138).setVisible(false);
    this.build = new UiButton(scene, 'CONSTRUIR', 108, 32, on.build, true, dpr);
    this.rotate = new UiButton(scene, 'GIRAR', 76, 32, on.rotate, false, dpr);
    this.exit = new UiButton(scene, 'SAIR', 64, 32, on.exit, false, dpr);
    for (const b of [this.build, this.rotate, this.exit]) b.setDepth(138).setVisible(false);
  }

  /** Centro horizontal e topo (px CSS). */
  layout(cx: number, top: number, maxW: number, k: number): void {
    this.k = k;
    const w = Math.min(330 * k, maxW);
    this.box = { x: cx - w / 2, y: top, w, h: 84 * k };
  }

  update(info: BuildInfo | null): void {
    const show = info !== null;
    this.visible = show;
    for (const o of [this.g, this.title, this.status, this.build, this.rotate, this.exit]) o.setVisible(show);
    if (!info) return;
    const { x, y, w, h } = this.box;
    const k = this.k;
    const cx = x + w / 2;
    this.g.clear().fillStyle(0x0e0f12, 0.86).fillRoundedRect(x, y, w, h, 10 * k);
    this.g.lineStyle(1.5, info.ok ? 0x7fc86a : 0xe0604a, 0.7).strokeRoundedRect(x, y, w, h, 10 * k);
    this.title.setText(`CONSTRUIR · ${info.name}`).setPosition(cx, y + 7 * k).setScale(k);
    this.status
      .setText(info.ok ? 'Lugar bom. Toque CONSTRUIR.' : (info.reason ?? 'Não dá aqui.'))
      .setColor(info.ok ? '#9fd88a' : '#f07a6a')
      .setPosition(cx, y + 25 * k)
      .setScale(k);
    const by = y + h - 22 * k;
    this.build.setDim(!info.ok).setScale(k).setPosition(cx - 70 * k, by);
    this.rotate.setDim(!info.rotates).setScale(k).setPosition(cx + 30 * k, by);
    this.exit.setScale(k).setPosition(cx + 104 * k, by);
  }

  contains(px: number, py: number): boolean {
    const b = this.box;
    return this.visible && px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
  }

  /** Centro de um botão (testes). */
  buttonPos(which: 'build' | 'rotate' | 'exit'): { x: number; y: number } | null {
    const b = which === 'build' ? this.build : which === 'rotate' ? this.rotate : this.exit;
    return this.visible ? { x: b.x, y: b.y } : null;
  }
}
