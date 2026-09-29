/**
 * Peças comuns do minimapa e do mapa completo: as texturas (imagem da cidade
 * gerada uma vez por mapa; névoa redesenhada só quando o explorado muda) e o
 * desenho dos ícones de moradia/marcadores.
 */
import type Phaser from 'phaser';
import type { MapData } from '../world/MapTypes';
import type { MarkCat, PlayerMarks } from '../world/PlayerMarks';
import { drawFog, drawMapImage } from '../world/render/MapImage';

const MAP_KEY = 'ui.mapimg';
const FOG_KEY = 'ui.mapfog';
let mapFor: string | null = null;
let fogVersion = -1;
let fogCanvas: HTMLCanvasElement | null = null;

export function mapTextures(scene: Phaser.Scene, map: MapData, marks: PlayerMarks): { map: string; fog: string } {
  const tex = scene.textures;
  const id = `${map.id}:${map.seed}:${map.widthTiles}`;
  if (mapFor !== id || !tex.exists(MAP_KEY)) {
    if (tex.exists(MAP_KEY)) tex.remove(MAP_KEY);
    tex.addCanvas(MAP_KEY, drawMapImage(map));
    mapFor = id;
    fogVersion = -1;
  }
  if (fogVersion !== marks.exploredVersion || !tex.exists(FOG_KEY)) {
    fogCanvas = drawFog(marks, fogCanvas ?? undefined);
    const t = tex.exists(FOG_KEY) ? (tex.get(FOG_KEY) as Phaser.Textures.CanvasTexture) : null;
    if (t && t.getSourceImage() === fogCanvas) t.refresh();
    else {
      if (tex.exists(FOG_KEY)) tex.remove(FOG_KEY);
      tex.addCanvas(FOG_KEY, fogCanvas);
    }
    fogVersion = marks.exploredVersion;
  }
  return { map: MAP_KEY, fog: FOG_KEY };
}

/** Ícone de moradia (casinha) ou marcador (pino com a cor da categoria). */
export function drawMarkIcon(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, cat: MarkCat, color: number, selected: boolean): void {
  if (selected) g.lineStyle(2, 0xffffff, 0.95).strokeCircle(x, y, r * 1.7);
  if (cat === 'moradia') {
    g.fillStyle(0x0b0c0f, 0.9).fillCircle(x, y, r * 1.35);
    g.fillStyle(color, 1).fillTriangle(x - r, y - r * 0.05, x + r, y - r * 0.05, x, y - r);
    g.fillRect(x - r * 0.7, y - r * 0.05, r * 1.4, r * 0.95);
    g.fillStyle(0x0b0c0f, 1).fillRect(x - r * 0.18, y + r * 0.35, r * 0.36, r * 0.55);
    return;
  }
  g.fillStyle(0x0b0c0f, 0.9).fillCircle(x, y, r * 1.25);
  g.fillStyle(color, 1).fillCircle(x, y, r * 0.9);
  if (cat === 'esconderijo') g.fillStyle(0x0b0c0f, 1).fillRect(x - r * 0.45, y - r * 0.35, r * 0.9, r * 0.7);
  else if (cat === 'perigo') g.fillStyle(0x0b0c0f, 1).fillRect(x - r * 0.12, y - r * 0.55, r * 0.24, r * 0.7).fillRect(x - r * 0.12, y + r * 0.3, r * 0.24, r * 0.24);
  else if (cat === 'hospital') g.fillStyle(0xd0453a, 1).fillRect(x - r * 0.15, y - r * 0.55, r * 0.3, r * 1.1).fillRect(x - r * 0.55, y - r * 0.15, r * 1.1, r * 0.3);
  else g.fillStyle(0x0b0c0f, 1).fillCircle(x, y, r * 0.3);
}
