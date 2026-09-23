/**
 * Estado de entrada compartilhado entre cenas.
 *
 * Cada fonte (toque, teclado, mouse, futuramente gamepad) escreve no seu
 * próprio bloco; `resolveIntent` junta tudo em UMA intenção que o
 * personagem entende. Assim o Player nunca sabe de onde veio o comando.
 */
import { length } from '../core/math';

export interface StickValue {
  x: number;
  y: number;
  /** 0..1 depois da zona morta. */
  magnitude: number;
  active: boolean;
}

export function emptyStick(): StickValue {
  return { x: 0, y: 0, magnitude: 0, active: false };
}

export class TouchInputState {
  move: StickValue = emptyStick();
  aim: StickValue = emptyStick();
  /** Botão "correr" é alternável (toque liga/desliga): com dois polegares ocupados não dá para segurar. */
  sprintToggled = false;

  reset(): void {
    this.move = emptyStick();
    this.aim = emptyStick();
  }
}

export class KeyboardMouseState {
  moveX = 0;
  moveY = 0;
  sprintHeld = false;
  /** Direção da mira pelo mouse (já normalizada), se o mouse estiver sendo usado. */
  aimX = 0;
  aimY = 0;
  aiming = false;
}

export interface PlayerIntent {
  moveX: number;
  moveY: number;
  sprint: boolean;
  aiming: boolean;
  aimX: number;
  aimY: number;
}

export function resolveIntent(touch: TouchInputState, km: KeyboardMouseState): PlayerIntent {
  const touchMoving = touch.move.active && touch.move.magnitude > 0;
  let moveX = touchMoving ? touch.move.x : km.moveX;
  let moveY = touchMoving ? touch.move.y : km.moveY;
  const mag = length(moveX, moveY);
  if (mag > 1) {
    moveX /= mag;
    moveY /= mag;
  }

  const touchAiming = touch.aim.active && touch.aim.magnitude > 0;
  const aiming = touchAiming || km.aiming;
  let aimX = touchAiming ? touch.aim.x : km.aimX;
  let aimY = touchAiming ? touch.aim.y : km.aimY;
  const aimMag = length(aimX, aimY);
  if (aimMag > 1e-6) {
    aimX /= aimMag;
    aimY /= aimMag;
  }

  return {
    moveX,
    moveY,
    sprint: km.sprintHeld || touch.sprintToggled,
    aiming: aiming && aimMag > 1e-6,
    aimX,
    aimY,
  };
}
