/**
 * Joystick virtual (coordenadas em px CSS da tela).
 * Flutuante: a base nasce onde o polegar toca (dentro da sua zona),
 * então funciona para mãos de qualquer tamanho. Parado, mostra um
 * "fantasma" na posição padrão para o jogador saber onde fica.
 */
import type Phaser from 'phaser';
import { emptyStick, type StickValue } from '../InputState';
import { clampKnob, computeStick } from './joystickMath';

export interface JoystickOptions {
  deadzone: number;
  accent: number;
  /** Ícone desenhado no pino (opcional). */
  drawIcon?: (g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number, alpha: number) => void;
}

export class VirtualJoystick {
  pointerId: number | null = null;
  value: StickValue = emptyStick();
  private home = { x: 0, y: 0 };
  private origin = { x: 0, y: 0 };
  private knob = { x: 0, y: 0 };
  private radius = 60;
  private readonly g: Phaser.GameObjects.Graphics;
  private screen = { w: 0, h: 0 };
  private visible = true;

  constructor(
    scene: Phaser.Scene,
    private readonly opts: JoystickOptions,
    depth: number,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  /** Posição padrão e tamanho (chamado a cada mudança de layout). */
  setLayout(x: number, y: number, radius: number, screenW: number, screenH: number): void {
    this.home = { x, y };
    this.radius = radius;
    this.screen = { w: screenW, h: screenH };
    if (this.pointerId === null) {
      this.origin = { ...this.home };
      this.knob = { x: 0, y: 0 };
    }
    this.redraw();
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.g.setVisible(v);
  }

  get isActive(): boolean {
    return this.pointerId !== null;
  }

  begin(pointerId: number, x: number, y: number): void {
    this.pointerId = pointerId;
    // A base inteira precisa caber na tela.
    const m = this.radius + 8;
    this.origin = {
      x: Math.max(m, Math.min(this.screen.w - m, x)),
      y: Math.max(m, Math.min(this.screen.h - m, y)),
    };
    this.move(x, y);
  }

  move(x: number, y: number): void {
    if (this.pointerId === null) return;
    const dx = x - this.origin.x;
    const dy = y - this.origin.y;
    this.value = computeStick(dx, dy, this.radius, this.opts.deadzone);
    this.knob = clampKnob(dx, dy, this.radius);
    this.redraw();
  }

  end(): void {
    this.pointerId = null;
    this.value = emptyStick();
    this.origin = { ...this.home };
    this.knob = { x: 0, y: 0 };
    this.redraw();
  }

  private redraw(): void {
    const g = this.g;
    g.clear();
    if (!this.visible) return;
    const active = this.pointerId !== null;
    const { x, y } = this.origin;
    const r = this.radius;
    const baseAlpha = active ? 1 : 0.55;

    g.fillStyle(0x0b0c0f, 0.26 * baseAlpha);
    g.fillCircle(x, y, r);
    g.lineStyle(2, 0xffffff, 0.3 * baseAlpha);
    g.strokeCircle(x, y, r);
    g.lineStyle(1, 0xffffff, 0.12 * baseAlpha);
    g.strokeCircle(x, y, r * 0.55);

    if (active && this.value.magnitude > 0) {
      const a = Math.atan2(this.value.y, this.value.x);
      g.lineStyle(4, this.opts.accent, 0.35 + this.value.magnitude * 0.55);
      g.beginPath();
      g.arc(x, y, r - 1, a - 0.5, a + 0.5);
      g.strokePath();
    }

    const kx = x + this.knob.x;
    const ky = y + this.knob.y;
    const kr = r * 0.42;
    g.fillStyle(0xffffff, active ? 0.42 : 0.2);
    g.fillCircle(kx, ky, kr);
    g.lineStyle(2, 0xffffff, active ? 0.7 : 0.35);
    g.strokeCircle(kx, ky, kr);
    this.opts.drawIcon?.(g, kx, ky, kr * 0.75, 0x16171a, active ? 0.75 : 0.45);
  }
}
