/**
 * Mapa da cidade (item "Mapa da cidade"): a planta toda, com os bairros e
 * onde você está. O "Mapa com anotações" marca farmácias, mercados,
 * oficinas, restaurantes, lojas e galpões (alguém circulou de caneta).
 * Tocar em qualquer lugar fecha.
 */
import Phaser from 'phaser';
import { drawDebugMap } from '../debug/DebugMapTexture';
import type { BuildingKind, MapData } from '../world/MapTypes';
import { UI, textStyle } from './theme';

const TEX = 'ui.citymap';

const POI: Partial<Record<BuildingKind, { color: number; label: string }>> = {
  pharmacy: { color: 0xe05a5a, label: 'Farmácia' },
  store: { color: 0x7fc86a, label: 'Mercado' },
  garage: { color: 0xe0a84a, label: 'Oficina' },
  restaurant: { color: 0xd98bd0, label: 'Restaurante' },
  clothing: { color: 0x6fb1e8, label: 'Loja de roupas' },
  warehouse: { color: 0xb0b6bc, label: 'Galpão' },
  shelter: { color: 0xffffff, label: 'Sua base' },
};

export class MapView {
  private layer: Phaser.GameObjects.Container | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly dpr: number,
  ) {}

  get isOpen(): boolean {
    return this.layer !== null;
  }

  open(map: MapData, player: { x: number; y: number }, annotated: boolean, cssW: number, cssH: number): void {
    this.close();
    const s = this.scene;
    if (!s.textures.exists(TEX)) s.textures.addCanvas(TEX, drawDebugMap(map))?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    const mw = map.widthTiles;
    const mh = map.heightTiles;
    const scale = Math.min((cssW * 0.9) / mw, (cssH * 0.78) / mh);
    const x0 = (cssW - mw * scale) / 2;
    const y0 = (cssH - mh * scale) / 2 + 12;
    const dim = s.add.rectangle(0, 0, cssW, cssH, 0x000000, 0.78).setOrigin(0, 0).setInteractive();
    dim.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.close());
    const img = s.add.image(x0, y0, TEX).setOrigin(0, 0).setScale(scale);
    const g = s.add.graphics();
    const items: Phaser.GameObjects.GameObject[] = [dim, img, g];
    const t = map.tileSize;
    // Bairros
    for (const r of map.regions) {
      const lbl = s.add
        .text(x0 + ((r.rect.x + r.rect.w / 2) / t) * scale, y0 + ((r.rect.y + 14) / t) * scale, r.name.replace(/^Zona /, ''), textStyle(8, '#e8e4d8', '700'))
        .setOrigin(0.5, 0)
        .setResolution(this.dpr)
        .setAlpha(0.8);
      items.push(lbl);
    }
    // Lugares anotados
    if (annotated) {
      const seen = new Set<BuildingKind>();
      for (const b of map.buildings) {
        const p = POI[b.kind];
        if (!p) continue;
        seen.add(b.kind);
        const cx = x0 + ((b.bounds.x + b.bounds.w / 2) / t) * scale;
        const cy = y0 + ((b.bounds.y + b.bounds.h / 2) / t) * scale;
        g.lineStyle(2, p.color, 1).strokeCircle(cx, cy, 6);
        g.fillStyle(p.color, 0.35).fillCircle(cx, cy, 6);
      }
      let ly = y0 + 6;
      for (const kind of seen) {
        const p = POI[kind]!;
        g.fillStyle(p.color, 1).fillCircle(x0 + mw * scale + 14, ly + 6, 5);
        items.push(s.add.text(x0 + mw * scale + 24, ly, p.label, textStyle(10, UI.text, '700')).setResolution(this.dpr));
        ly += 16;
      }
    }
    // Você
    const px = x0 + (player.x / t) * scale;
    const py = y0 + (player.y / t) * scale;
    g.fillStyle(0xff4040, 1).fillCircle(px, py, 5);
    g.lineStyle(2, 0xffffff, 1).strokeCircle(px, py, 8);
    const title = s.add
      .text(cssW / 2, y0 - 6, annotated ? 'MAPA ANOTADO · você está no ponto vermelho' : 'MAPA DA CIDADE · você está no ponto vermelho', textStyle(12, UI.text, '800'))
      .setOrigin(0.5, 1)
      .setResolution(this.dpr);
    items.push(title);
    this.layer = s.add.container(0, 0, items).setDepth(170);
  }

  close(): void {
    this.layer?.destroy(true);
    this.layer = null;
  }
}
