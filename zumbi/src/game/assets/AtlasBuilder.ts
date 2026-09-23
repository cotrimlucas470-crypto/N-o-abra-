/**
 * Empacota vários canvases pequenos em poucas texturas grandes (atlas).
 * Menos texturas = menos trocas de estado na GPU = mais FPS no celular.
 * Algoritmo de prateleiras (shelf packing): simples e bom o bastante.
 */
import Phaser from 'phaser';

const PAGE = 2048;
const GAP = 2;

export interface AtlasEntry {
  id: string;
  canvas: HTMLCanvasElement;
}

export interface AtlasFrameRef {
  key: string;
  frame: string;
}

export function buildAtlas(textures: Phaser.Textures.TextureManager, prefix: string, entries: AtlasEntry[]): Map<string, AtlasFrameRef> {
  const refs = new Map<string, AtlasFrameRef>();
  // Altura decrescente empacota melhor.
  const sorted = [...entries].sort((a, b) => b.canvas.height - a.canvas.height || b.canvas.width - a.canvas.width);

  type Placed = { e: AtlasEntry; x: number; y: number };
  const pages: Placed[][] = [];
  let page: Placed[] = [];
  let x = GAP;
  let y = GAP;
  let shelfH = 0;

  for (const e of sorted) {
    const w = e.canvas.width;
    const h = e.canvas.height;
    if (w + GAP * 2 > PAGE || h + GAP * 2 > PAGE) throw new Error(`Sprite grande demais para o atlas: ${e.id}`);
    if (x + w + GAP > PAGE) {
      x = GAP;
      y += shelfH + GAP;
      shelfH = 0;
    }
    if (y + h + GAP > PAGE) {
      pages.push(page);
      page = [];
      x = GAP;
      y = GAP;
      shelfH = 0;
    }
    page.push({ e, x, y });
    x += w + GAP;
    shelfH = Math.max(shelfH, h);
  }
  if (page.length) pages.push(page);

  pages.forEach((placed, index) => {
    // Altura da página só o necessário (economiza memória de vídeo).
    const usedH = Math.max(...placed.map((p) => p.y + p.e.canvas.height)) + GAP;
    const canvas = document.createElement('canvas');
    canvas.width = PAGE;
    canvas.height = nextPow2(usedH);
    const ctx = canvas.getContext('2d')!;
    for (const p of placed) ctx.drawImage(p.e.canvas, p.x, p.y);
    const key = `${prefix}.${index}`;
    if (textures.exists(key)) textures.remove(key);
    const tex = textures.addCanvas(key, canvas);
    if (!tex) throw new Error(`Falha ao criar a textura ${key}`);
    for (const p of placed) {
      tex.add(p.e.id, 0, p.x, p.y, p.e.canvas.width, p.e.canvas.height);
      refs.set(p.e.id, { key, frame: p.e.id });
    }
  });
  return refs;
}

function nextPow2(n: number): number {
  let p = 64;
  while (p < n) p *= 2;
  return p;
}
