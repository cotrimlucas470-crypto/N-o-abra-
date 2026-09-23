/**
 * Câmera que segue o jogador com suavidade e "olha à frente":
 * mirando, desloca para onde ele mira (vê o perigo antes);
 * andando, antecipa um pouco o movimento. Limitada às bordas do mapa.
 */
import type Phaser from 'phaser';
import { damp } from '../core/math';

export interface CameraTarget {
  x: number;
  y: number;
  facingAngle: number;
  isAiming: boolean;
  body: { velocity: { x: number; y: number } };
}

const LOOK_AIM = 150;
const LOOK_MOVE = 0.26; // segundos de antecipação do movimento
const LOOK_MOVE_MAX = 90;

export class CameraDirector {
  private cx: number;
  private cy: number;
  private lookX = 0;
  private lookY = 0;

  constructor(
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
    private readonly target: CameraTarget,
  ) {
    this.cx = target.x;
    this.cy = target.y;
    camera.centerOn(this.cx, this.cy);
  }

  setZoom(zoom: number): void {
    this.camera.setZoom(zoom);
  }

  /** Chamado após a física, a cada frame. */
  update(dt: number): void {
    const t = this.target;
    let tx = 0;
    let ty = 0;
    if (t.isAiming) {
      tx = Math.cos(t.facingAngle) * LOOK_AIM;
      ty = Math.sin(t.facingAngle) * LOOK_AIM;
    } else {
      tx = t.body.velocity.x * LOOK_MOVE;
      ty = t.body.velocity.y * LOOK_MOVE;
      const m = Math.hypot(tx, ty);
      if (m > LOOK_MOVE_MAX) {
        tx = (tx / m) * LOOK_MOVE_MAX;
        ty = (ty / m) * LOOK_MOVE_MAX;
      }
    }
    const kLook = damp(t.isAiming ? 4 : 2.5, dt);
    this.lookX += (tx - this.lookX) * kLook;
    this.lookY += (ty - this.lookY) * kLook;

    const k = damp(9, dt);
    this.cx += (t.x + this.lookX - this.cx) * k;
    this.cy += (t.y + this.lookY - this.cy) * k;
    this.camera.centerOn(this.cx, this.cy);
  }

  /** Pula direto para o alvo (ao nascer/teleportar). */
  snap(): void {
    this.cx = this.target.x;
    this.cy = this.target.y;
    this.lookX = 0;
    this.lookY = 0;
    this.camera.centerOn(this.cx, this.cy);
  }
}
