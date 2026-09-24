/**
 * Mapa-resumo da cidade (1 pixel por tile), usado pelo painel de debug para
 * teleportar. Cores por tipo de chão; construções em escuro.
 */
import type { MapData } from '../world/MapTypes';

const COLORS: Record<number, [number, number, number]> = {
  0: [93, 114, 73],
  1: [79, 99, 64],
  2: [110, 92, 71],
  3: [122, 117, 107],
  4: [74, 76, 80],
  5: [143, 140, 134],
  6: [131, 133, 127],
  7: [85, 87, 90],
  8: [138, 104, 72],
  9: [183, 180, 170],
  10: [106, 90, 100],
  11: [108, 110, 108],
};

export function drawDebugMap(map: MapData): HTMLCanvasElement {
  const w = map.widthTiles;
  const h = map.heightTiles;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const c = COLORS[map.ground[i]!] ?? [0, 0, 0];
    img.data[i * 4] = c[0];
    img.data[i * 4 + 1] = c[1];
    img.data[i * 4 + 2] = c[2];
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const T = map.tileSize;
  ctx.strokeStyle = 'rgba(20,20,24,0.95)';
  ctx.lineWidth = 1;
  for (const b of map.buildings) ctx.strokeRect(b.bounds.x / T + 0.5, b.bounds.y / T + 0.5, b.bounds.w / T - 1, b.bounds.h / T - 1);
  return canvas;
}
