/** Texturas de efeitos e de interface. */
import { makeCanvas } from './canvas';

export function drawSoftShadow(w: number, h: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(w, h);
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.9)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.save();
  ctx.scale(1, h / w);
  ctx.beginPath();
  ctx.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return canvas;
}

export function drawDust(size: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(235,228,210,0.9)');
  g.addColorStop(1, 'rgba(235,228,210,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** Escurecimento das bordas da tela (esticado para o tamanho da tela). */
export function drawVignette(size: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.28, size / 2, size / 2, size * 0.72);
  g.addColorStop(0, 'rgba(8,8,12,0)');
  g.addColorStop(0.6, 'rgba(8,8,12,0.22)');
  g.addColorStop(1, 'rgba(8,8,12,0.62)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/**
 * Luz para "apagar" a escuridão da noite (usada com erase numa textura
 * dinâmica): branco no centro, some nas bordas. Alfa = quanto clareia.
 */
export function drawLightRadial(size: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** Facho de lanterna: cone para a direita (+x) a partir do meio da borda esquerda. */
export function drawLightCone(w: number, h: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(w, h);
  const cy = h / 2;
  const g = ctx.createRadialGradient(0, cy, 0, 0, cy, w);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, cy - 6);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h);
  ctx.lineTo(0, cy + 6);
  ctx.closePath();
  ctx.fill();
  // Bordas do facho mais suaves: apaga um pouco as laterais.
  ctx.globalCompositeOperation = 'destination-out';
  const edge = ctx.createLinearGradient(0, 0, 0, h);
  edge.addColorStop(0, 'rgba(0,0,0,0.9)');
  edge.addColorStop(0.3, 'rgba(0,0,0,0)');
  edge.addColorStop(0.7, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.9)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
  return canvas;
}

/** Pingo de chuva (traço fino, claro no meio). */
export function drawRainDrop(w: number, h: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(w, h);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(200,215,235,0)');
  g.addColorStop(0.6, 'rgba(200,215,235,0.55)');
  g.addColorStop(1, 'rgba(225,235,250,0.85)');
  ctx.fillStyle = g;
  ctx.fillRect(w / 2 - 0.75, 0, 1.5, h);
  return canvas;
}
