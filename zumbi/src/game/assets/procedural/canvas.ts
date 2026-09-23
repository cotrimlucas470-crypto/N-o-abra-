/**
 * Utilitários de desenho em Canvas 2D para os assets procedurais.
 * Luz padrão: vem do canto superior esquerdo (realce em cima/esquerda,
 * sombra embaixo/direita) — manter isso em todo desenho novo.
 */
import { Random } from '../../core/Random';

export type Ctx = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(w));
  canvas.height = Math.max(1, Math.ceil(h));
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) throw new Error('Canvas 2D indisponível');
  return { canvas, ctx };
}

// ------------------------------------------------------------------ cor

function parseHex(c: string): [number, number, number] {
  const h = c.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex(r: number, g: number, b: number): string {
  const f = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

/** Clareia (amount > 0) ou escurece (amount < 0). amount em -1..1. */
export function shade(color: string, amount: number): string {
  const [r, g, b] = parseHex(color);
  if (amount >= 0) return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
  return toHex(r * (1 + amount), g * (1 + amount), b * (1 + amount));
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseHex(a);
  const [r2, g2, b2] = parseHex(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export function rgba(color: string, alpha: number): string {
  const [r, g, b] = parseHex(color);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ------------------------------------------------------------------ formas

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Retângulo arredondado com gradiente de luz (claro em cima-esquerda) e contorno. */
export function shadedBox(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string,
  opts: { outline?: string | null; light?: number; lineWidth?: number } = {},
): void {
  const light = opts.light ?? 0.14;
  const g = ctx.createLinearGradient(x, y, x + w * 0.35, y + h);
  g.addColorStop(0, shade(color, light));
  g.addColorStop(1, shade(color, -light));
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = g;
  ctx.fill();
  if (opts.outline !== null) {
    ctx.lineWidth = opts.lineWidth ?? 1.5;
    ctx.strokeStyle = opts.outline ?? shade(color, -0.45);
    ctx.stroke();
  }
}

export function circle(ctx: Ctx, x: number, y: number, r: number, fill: string, stroke?: string, lw = 1.5): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

/** Círculo com volume (gradiente radial deslocado para a luz). */
export function ball(ctx: Ctx, x: number, y: number, r: number, color: string, outline = true): void {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, shade(color, 0.22));
  g.addColorStop(1, shade(color, -0.22));
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  if (outline) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = shade(color, -0.5);
    ctx.stroke();
  }
}

export function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, width: number, cap: CanvasLineCap = 'round'): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = cap;
  ctx.stroke();
}

/** Mancha orgânica (sangue, óleo, terra): polígono irregular + gotas. */
export function blob(ctx: Ctx, cx: number, cy: number, radius: number, color: string, rng: Random, spikes = 14, drops = 6): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i <= spikes; i++) {
    const a = (i / spikes) * Math.PI * 2;
    const r = radius * rng.range(0.62, 1.05);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.quadraticCurveTo(cx + Math.cos(a - 0.2) * r * 1.08, cy + Math.sin(a - 0.2) * r * 1.08, x, y);
  }
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < drops; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = radius * rng.range(1.05, 1.5);
    circle(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d, radius * rng.range(0.05, 0.14), color);
  }
}

// ------------------------------------------------------------------ textura

/**
 * Ruído por pixel sobre o que já está desenhado (granulado de asfalto,
 * grama, concreto). `amount` = variação máxima de brilho (0..255).
 */
export function grain(ctx: Ctx, w: number, h: number, amount: number, rng: Random, mono = true): void {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const n = (rng.next() - 0.5) * amount;
    if (mono) {
      d[i] = clampByte(d[i]! + n);
      d[i + 1] = clampByte(d[i + 1]! + n);
      d[i + 2] = clampByte(d[i + 2]! + n);
    } else {
      d[i] = clampByte(d[i]! + n * rng.range(0.6, 1.4));
      d[i + 1] = clampByte(d[i + 1]! + n * rng.range(0.6, 1.4));
      d[i + 2] = clampByte(d[i + 2]! + n * rng.range(0.6, 1.4));
    }
  }
  ctx.putImageData(img, 0, 0);
}

function clampByte(n: number): number {
  return n < 0 ? 0 : n > 255 ? 255 : n;
}

/** Pontinhos espalhados (pedrinhas, folhas de grama, sujeira). */
export function speckle(ctx: Ctx, w: number, h: number, count: number, colors: readonly string[], sizeMin: number, sizeMax: number, rng: Random, alpha = 1): void {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = rng.pick(colors);
    const s = rng.range(sizeMin, sizeMax);
    ctx.fillRect(rng.range(0, w), rng.range(0, h), s, s * rng.range(0.6, 1.4));
  }
  ctx.globalAlpha = 1;
}

/**
 * Gera a sombra projetada de um sprite: silhueta preta desfocada.
 * Funciona em qualquer navegador (usa shadowBlur, não ctx.filter).
 */
export function silhouetteShadow(src: CanvasImageSource, w: number, h: number, blur: number): HTMLCanvasElement {
  const pad = Math.ceil(blur * 2);
  const { canvas, ctx } = makeCanvas(w + pad * 2, h + pad * 2);
  const OFF = 10000;
  ctx.shadowColor = 'rgba(0,0,0,1)';
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = OFF;
  ctx.shadowOffsetY = 0;
  ctx.drawImage(src, pad - OFF, pad, w, h);
  return canvas;
}
