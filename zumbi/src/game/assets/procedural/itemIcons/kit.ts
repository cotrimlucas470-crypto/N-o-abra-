/**
 * Ferramentas de desenho dos ícones de item (canvas quadrado de lado `s`).
 * Luz de cima/esquerda, contorno escuro, cores chapadas com leve gradiente:
 * legível em 30 px no chão e em 36 px no inventário.
 */
import type { IconSpec } from '../../../items/ItemTypes';
import { rgba, roundRect, shade as shadeHex, type Ctx } from '../canvas';

export type IconDrawer = (ctx: Ctx, s: number, spec: IconSpec) => void;

export const OUTLINE = 'rgba(20,18,16,0.85)';

/** Clareia/escurece cores #rrggbb; cores rgba() (vidro, plástico) ficam como estão. */
export function shade(color: string, amount: number): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? shadeHex(color, amount) : color;
}

/** Retângulo arredondado com gradiente de luz. */
export function box(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, color: string, outline: string | null = OUTLINE, lw = 1.4): void {
  const g = ctx.createLinearGradient(x, y, x + w * 0.4, y + h);
  g.addColorStop(0, shade(color, 0.18));
  g.addColorStop(1, shade(color, -0.18));
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = g;
  ctx.fill();
  if (outline) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = outline;
    ctx.stroke();
  }
}

export function poly(ctx: Ctx, pts: readonly (readonly [number, number])[], color: string, outline: string | null = OUTLINE, lw = 1.3): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  const ys = pts.map((p) => p[1]);
  const g = ctx.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys));
  g.addColorStop(0, shade(color, 0.15));
  g.addColorStop(1, shade(color, -0.15));
  ctx.fillStyle = g;
  ctx.fill();
  if (outline) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = outline;
    ctx.stroke();
  }
}

export function disc(ctx: Ctx, x: number, y: number, r: number, color: string, outline: string | null = OUTLINE, lw = 1.3): void {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, shade(color, 0.25));
  g.addColorStop(1, shade(color, -0.2));
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  if (outline) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = outline;
    ctx.stroke();
  }
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string, outline: string | null = OUTLINE, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (outline) {
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = outline;
    ctx.stroke();
  }
}

export function stroke(ctx: Ctx, pts: readonly (readonly [number, number])[], color: string, w: number, cap: CanvasLineCap = 'round'): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = cap;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** Traço com contorno (cabo, barra): desenha a borda escura e o miolo colorido. */
export function bar(ctx: Ctx, pts: readonly (readonly [number, number])[], color: string, w: number, cap: CanvasLineCap = 'round'): void {
  stroke(ctx, pts, OUTLINE, w + 2.4, cap);
  stroke(ctx, pts, color, w, cap);
  if (/^#[0-9a-f]{6}$/i.test(color)) stroke(ctx, pts.map(([x, y]) => [x - w * 0.18, y - w * 0.18] as const), rgba(shade(color, 0.45), 0.55), Math.max(1, w * 0.28), cap);
}

/** Desenha girado em torno do centro (itens compridos ficam na diagonal). */
export function rotated(ctx: Ctx, s: number, deg: number, draw: () => void): void {
  ctx.save();
  ctx.translate(s / 2, s / 2);
  ctx.rotate((deg * Math.PI) / 180);
  ctx.translate(-s / 2, -s / 2);
  draw();
  ctx.restore();
}

/** Brilho (reflexo) vertical. */
export function shine(ctx: Ctx, x: number, y: number, w: number, h: number, alpha = 0.3): void {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fillRect(x, y, w, h);
}

export function label(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x + w * 0.15, y + h * 0.3, w * 0.5, Math.max(1, h * 0.14));
}

export const c1 = (spec: IconSpec, def: string) => spec.c ?? def;
export const c2 = (spec: IconSpec, def: string) => spec.c2 ?? def;
