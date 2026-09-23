/**
 * Personagem visto de cima, olhando para +x. Duas folhas de 8 quadros:
 *  - tronco (ombros, mochila, braços balançando, cabeça): gira para a MIRA;
 *  - pernas (passada): giram para a direção do MOVIMENTO.
 * Quadro 0 = pés juntos (parado). Quadros 2 e 6 = pé tocando o chão.
 *
 * Arte final: spritesheet 8 quadros de qualquer tamanho quadrado em
 * overrides.json ("player.torso" / "player.legs"), mesma ordem de quadros.
 */
import { PALETTE } from '../../config/Palette';
import { ball, circle, line, makeCanvas, roundRect, shade } from './canvas';

export const PLAYER_FRAME = 64;
export const PLAYER_FRAMES = 8;

function phase(i: number): number {
  return (i / PLAYER_FRAMES) * Math.PI * 2;
}

export function drawLegsFrame(i: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(PLAYER_FRAME, PLAYER_FRAME);
  const c = PLAYER_FRAME / 2;
  const stride = Math.sin(phase(i)) * 14;
  const lift = Math.cos(phase(i));
  const leg = (side: number, s: number, lifted: boolean) => {
    const y = c + side * 6.5;
    line(ctx, c - 1, y, c + s, y, PALETTE.pants, 9);
    const shoeLen = lifted ? 14 : 12.5;
    ctx.fillStyle = lifted ? shade(PALETTE.shoes, 0.12) : PALETTE.shoes;
    roundRect(ctx, c + s - shoeLen / 2 + 2, y - 4.5, shoeLen, 9, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(c + s - shoeLen / 2 + 4, y - 3.5, shoeLen - 5, 2);
  };
  leg(-1, stride, lift > 0.2);
  leg(1, -stride, lift < -0.2);
  return canvas;
}

export function drawTorsoFrame(i: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(PLAYER_FRAME, PLAYER_FRAME);
  const c = PLAYER_FRAME / 2;
  const swing = -Math.sin(phase(i)) * 8;

  // braços (atrás do tronco)
  const arm = (side: number, s: number) => {
    const sy = c + side * 14;
    const hx = c + 3 + s;
    const hy = c + side * 16.5;
    line(ctx, c - 1, sy, hx, hy, PALETTE.jacketDark, 8);
    circle(ctx, hx + 1.5, hy, 4.2, PALETTE.skin, shade(PALETTE.skin, -0.35), 1);
  };
  arm(-1, swing);
  arm(1, -swing);

  // mochila
  ctx.fillStyle = PALETTE.backpack;
  roundRect(ctx, c - 17, c - 10, 11, 20, 4);
  ctx.fill();
  ctx.strokeStyle = shade(PALETTE.backpack, -0.4);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = shade(PALETTE.backpack, 0.15);
  ctx.fillRect(c - 15, c - 8, 4, 16);

  // tronco/ombros
  const g = ctx.createRadialGradient(c - 4, c - 6, 2, c, c, 17);
  g.addColorStop(0, shade(PALETTE.jacket, 0.18));
  g.addColorStop(1, shade(PALETTE.jacket, -0.2));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(c - 1, c, 9.5, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = shade(PALETTE.jacket, -0.5);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // alças da mochila
  line(ctx, c - 6, c - 12, c + 3, c - 8, shade(PALETTE.backpack, -0.25), 2.5);
  line(ctx, c - 6, c + 12, c + 3, c + 8, shade(PALETTE.backpack, -0.25), 2.5);

  // cabeça: rosto aparece na frente, cabelo cobre o resto
  circle(ctx, c + 3.2, c, 8.8, PALETTE.skin);
  ball(ctx, c + 1, c, 8.6, PALETTE.hair, false);
  circle(ctx, c + 2.6, c - 8.2, 2, PALETTE.skin);
  circle(ctx, c + 2.6, c + 8.2, 2, PALETTE.skin);
  ctx.strokeStyle = shade(PALETTE.hair, -0.4);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(c + 1.5, c, 9.2, 0, Math.PI * 2);
  ctx.stroke();
  return canvas;
}
