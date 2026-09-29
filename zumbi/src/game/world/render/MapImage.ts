/**
 * IMAGEM DO MAPA da cidade, gerada UMA vez (canvas, `imagePxPerTile` px por
 * tile): chão com cores de mapa (rua, calçada, grama, terra), faixa da rua,
 * prédios pelo tipo com sombra, árvores como mata e os nomes das regiões
 * ficam para a tela. Serve ao minimapa (recorte) e ao mapa completo.
 * Também a névoa do não explorado (1 px por célula, redesenhada só quando muda).
 */
import { MAP_TUNING as T } from '../../config/MapTuning';
import type { PlayerMarks } from '../PlayerMarks';
import { Ground as G, type BuildingKind, type MapData } from '../MapTypes';

const GROUND_RGB: Record<number, [number, number, number]> = {
  [G.Grass]: [88, 112, 70],
  [G.GrassDark]: [72, 96, 58],
  [G.Dirt]: [118, 100, 76],
  [G.Gravel]: [128, 122, 110],
  [G.Asphalt]: [58, 61, 67],
  [G.Sidewalk]: [150, 148, 142],
  [G.Concrete]: [136, 138, 134],
  [G.Parking]: [74, 77, 82],
  [G.WoodFloor]: [150, 118, 86],
  [G.TileFloor]: [176, 172, 162],
  [G.Carpet]: [120, 104, 112],
  [G.GarageFloor]: [112, 114, 112],
};

/** Telhado de cada tipo de prédio no mapa (cor de "planta de cidade"). */
export const BUILDING_COLOR: Record<BuildingKind, string> = {
  house: '#9a7a60',
  store: '#5f8a5a',
  garage: '#a8844a',
  shelter: '#9a7a60',
  pharmacy: '#b05656',
  restaurant: '#a36a9a',
  clothing: '#5a82a8',
  warehouse: '#7a7e84',
};

export const BUILDING_LABEL: Record<BuildingKind, string> = {
  house: 'Casa',
  store: 'Mercado',
  garage: 'Oficina',
  shelter: 'Casa',
  pharmacy: 'Farmácia',
  restaurant: 'Restaurante',
  clothing: 'Loja de roupas',
  warehouse: 'Galpão',
};

const TREE = /^tree/;

export function drawMapImage(map: MapData): HTMLCanvasElement {
  const s = T.imagePxPerTile;
  const w = map.widthTiles;
  const h = map.cityHeightTiles ?? map.heightTiles;
  const canvas = document.createElement('canvas');
  canvas.width = w * s;
  canvas.height = h * s;
  const ctx = canvas.getContext('2d')!;
  // Chão: 1 px por tile, depois ampliado sem borrar.
  const tiny = document.createElement('canvas');
  tiny.width = w;
  tiny.height = h;
  const tctx = tiny.getContext('2d')!;
  const img = tctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const c = GROUND_RGB[map.ground[i]!] ?? [40, 40, 40];
    // Leve variação por tile: o mapa não fica "chapado".
    const n = ((i * 2654435761) >>> 28) - 8;
    img.data[i * 4] = c[0] + n;
    img.data[i * 4 + 1] = c[1] + n;
    img.data[i * 4 + 2] = c[2] + n;
    img.data[i * 4 + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tiny, 0, 0, w * s, h * s);
  const px = s / map.tileSize;
  // Faixas da rua (centro das avenidas em amarelo, o resto em branco discreto).
  for (const m of map.markings) {
    const len = m.length * px;
    const th = Math.max(1, m.thickness * px);
    if (m.kind === 'curb' || m.kind === 'stall') continue;
    ctx.fillStyle = m.kind === 'lane-double' ? 'rgba(214,186,80,0.75)' : m.kind === 'crosswalk' ? 'rgba(235,235,230,0.55)' : 'rgba(230,230,225,0.4)';
    if (m.vertical) ctx.fillRect(m.x * px - th / 2, m.y * px - len / 2, th, len);
    else ctx.fillRect(m.x * px - len / 2, m.y * px - th / 2, len, th);
  }
  // Mata: copas das árvores (verde escuro, redondo).
  ctx.fillStyle = 'rgba(38,70,34,0.85)';
  for (const p of map.props) {
    if (!TREE.test(p.type)) continue;
    ctx.beginPath();
    ctx.arc(p.x * px, p.y * px, Math.max(1.2, 1.1 * s), 0, Math.PI * 2);
    ctx.fill();
  }
  // Prédios: sombra, telhado pela cor do tipo, contorno.
  for (const b of map.buildings) {
    if (b.floorOf) continue;
    const x = b.bounds.x * px;
    const y = b.bounds.y * px;
    const bw = b.bounds.w * px;
    const bh = b.bounds.h * px;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + s * 0.6, y + s * 0.6, bw, bh);
    ctx.fillStyle = BUILDING_COLOR[b.kind] ?? '#888';
    ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = 'rgba(20,20,24,0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
  }
  return canvas;
}

/** Névoa do não explorado: 1 px por célula (preto transparente onde já viu). */
export function drawFog(marks: PlayerMarks, canvas?: HTMLCanvasElement): HTMLCanvasElement {
  const c = canvas ?? document.createElement('canvas');
  c.width = marks.cols;
  c.height = marks.rows;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(marks.cols, marks.rows);
  for (let y = 0; y < marks.rows; y++) {
    for (let x = 0; x < marks.cols; x++) {
      const i = (y * marks.cols + x) * 4;
      img.data[i] = 10;
      img.data[i + 1] = 11;
      img.data[i + 2] = 14;
      img.data[i + 3] = marks.explored(x, y) ? 0 : 200;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
