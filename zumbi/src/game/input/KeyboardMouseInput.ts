/**
 * Teclado e mouse (para testar no PC). WASD/setas movem, Shift corre,
 * segurar um botão do mouse mira na direção do cursor.
 */
import Phaser from 'phaser';
import type { KeyboardMouseState } from './InputState';

type Keys = Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'SHIFT', Phaser.Input.Keyboard.Key>;

export class KeyboardMouseInput {
  private keys: Keys | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT', false) as Keys;
    }
    // Clique direito não abre menu do navegador.
    scene.input.mouse?.disableContextMenu();
  }

  /** `uiBlocked`: o mouse está sobre um painel do HUD — clicar lá não é mirar. */
  read(out: KeyboardMouseState, playerX: number, playerY: number, camera: Phaser.Cameras.Scene2D.Camera, uiBlocked = false): void {
    const k = this.keys;
    if (k) {
      const x = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
      const y = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
      out.moveX = x;
      out.moveY = y;
      out.sprintHeld = k.SHIFT.isDown;
    }

    const p = this.scene.input.mousePointer;
    const mouseAiming = !!p && !p.wasTouch && p.isDown && !uiBlocked;
    if (mouseAiming) {
      const world = p.positionToCamera(camera) as Phaser.Math.Vector2;
      out.aimX = world.x - playerX;
      out.aimY = world.y - playerY;
      out.aiming = Math.hypot(out.aimX, out.aimY) > 4;
    } else {
      out.aiming = false;
    }
  }

  /** Solta tudo (ao pausar ou perder o foco). */
  reset(out: KeyboardMouseState): void {
    this.scene.input.keyboard?.resetKeys();
    out.moveX = 0;
    out.moveY = 0;
    out.sprintHeld = false;
    out.aiming = false;
  }
}
