/**
 * Botão redondo de toque (px CSS). Pode ser de "tocar" (pausa) ou de
 * "alternar" (correr liga/desliga). A área de toque é maior que o
 * desenho: dedo não precisa ser preciso.
 */
import type Phaser from 'phaser';

export type IconDrawer = (g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number, alpha: number) => void;

export class TouchButton {
  x = 0;
  y = 0;
  radius = 30;
  pointerId: number | null = null;
  /** Estado ligado (botões alternáveis). */
  on = false;
  /** Desabilitado visualmente (ex.: correr sem fôlego). */
  dimmed = false;
  private readonly g: Phaser.GameObjects.Graphics;
  private visible = true;

  constructor(
    scene: Phaser.Scene,
    private readonly icon: IconDrawer,
    depth: number,
    private readonly opts: { accent: number; hitScale?: number; subtle?: boolean } = { accent: 0xe0a84a },
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  setLayout(x: number, y: number, radius: number): void {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.redraw();
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.g.setVisible(v);
    if (!v) this.pointerId = null;
  }

  get isVisible(): boolean {
    return this.visible;
  }

  hit(px: number, py: number): boolean {
    if (!this.visible) return false;
    const r = this.radius * (this.opts.hitScale ?? 1.3);
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= r * r;
  }

  setState(on: boolean, dimmed: boolean): void {
    if (on === this.on && dimmed === this.dimmed) return;
    this.on = on;
    this.dimmed = dimmed;
    this.redraw();
  }

  press(id: number): void {
    this.pointerId = id;
    this.redraw();
  }

  release(): void {
    this.pointerId = null;
    this.redraw();
  }

  redraw(): void {
    const g = this.g;
    g.clear();
    if (!this.visible) return;
    const pressed = this.pointerId !== null;
    const r = this.radius * (pressed ? 0.94 : 1);
    const subtle = this.opts.subtle ?? false;
    g.fillStyle(this.on ? this.opts.accent : 0x0b0c0f, this.on ? 0.85 : subtle ? 0.35 : 0.42);
    g.fillCircle(this.x, this.y, r);
    g.lineStyle(2, this.on ? 0xffffff : 0xffffff, this.on ? 0.8 : 0.32);
    g.strokeCircle(this.x, this.y, r);
    const iconColor = this.on ? 0x16171a : 0xf2efe6;
    this.icon(g, this.x, this.y, r * 0.62, iconColor, this.dimmed ? 0.35 : pressed ? 1 : 0.9);
  }
}
