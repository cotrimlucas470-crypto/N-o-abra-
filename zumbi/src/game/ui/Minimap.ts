/**
 * MINIMAPA no canto da HUD: um recorte da imagem da cidade em volta do
 * jogador (sem redesenhar nada: só muda o recorte), a névoa do que ainda
 * não foi explorado, a seta do jogador (para onde olha), a moradia e o alvo
 * escolhido (na borda, se estiver longe). Embaixo, a bússola: nome, rumo e
 * distância do alvo. Tocar abre o mapa completo.
 */
import Phaser from 'phaser';
import { MAP_TUNING as T } from '../config/MapTuning';
import type { GameServices } from '../core/Services';
import { compass, MARK_CATS, meters, metersLabel } from '../world/PlayerMarks';
import { UI, textStyle } from './theme';
import { drawMarkIcon, mapTextures } from './mapShared';

export class Minimap {
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly img: Phaser.GameObjects.Image;
  private readonly fog: Phaser.GameObjects.Image;
  private readonly over: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly zone: Phaser.GameObjects.Zone;
  private box = { x: 0, y: 0, s: 0 };
  private k = 1;
  private ready = false;
  visible = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly s: GameServices,
    dpr: number,
    open: () => void,
  ) {
    this.bg = scene.add.graphics().setDepth(94);
    this.img = scene.add.image(0, 0, '__MISSING').setOrigin(0, 0).setDepth(94).setVisible(false);
    this.fog = scene.add.image(0, 0, '__MISSING').setOrigin(0, 0).setDepth(94).setVisible(false);
    this.over = scene.add.graphics().setDepth(95);
    this.label = scene.add.text(0, 0, '', textStyle(10, UI.text, '800')).setOrigin(0.5, 0).setResolution(dpr).setDepth(95);
    this.label.setBackgroundColor('rgba(12,13,16,0.7)').setPadding(5, 2, 5, 2);
    this.zone = scene.add.zone(0, 0, 10, 10).setOrigin(0, 0).setDepth(96).setInteractive({ useHandCursor: true });
    this.zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => open());
  }

  contains(x: number, y: number): boolean {
    const b = this.box;
    return this.visible && this.ready && x >= b.x && y >= b.y && x <= b.x + b.s && y <= b.y + b.s + 18 * this.k;
  }

  layout(x: number, y: number, k: number): void {
    this.k = k;
    const s = T.miniSize * k;
    this.box = { x, y, s };
    this.zone.setPosition(x, y).setSize(s, s);
    if (this.zone.input?.hitArea instanceof Phaser.Geom.Rectangle) this.zone.input.hitArea.setTo(0, 0, s, s);
  }

  setVisible(v: boolean): void {
    this.visible = v;
    for (const o of [this.bg, this.over, this.label]) o.setVisible(v && this.ready);
    this.img.setVisible(v && this.ready);
    this.fog.setVisible(v && this.ready);
    this.zone.setVisible(v && this.ready);
  }

  update(): void {
    const ses = this.s.session;
    const map = ses.map;
    const marks = ses.marks;
    const pl = ses.player;
    if (!map || !marks || !pl) {
      if (this.ready) {
        this.ready = false;
        this.setVisible(this.visible);
      }
      return;
    }
    const tex = mapTextures(this.scene, map, marks);
    if (!this.ready) {
      this.ready = true;
      this.img.setTexture(tex.map);
      this.fog.setTexture(tex.fog);
      this.setVisible(this.visible);
    }
    if (!this.visible) return;
    const { x: bx, y: by, s: size } = this.box;
    const k = this.k;
    const px = T.imagePxPerTile;
    const cs = T.miniTiles * px;
    const scale = size / cs;
    const cx = (pl.x / map.tileSize) * px;
    const cy = (pl.y / map.tileSize) * px;
    const cropX = cx - cs / 2;
    const cropY = cy - cs / 2;
    this.img.setScale(scale).setPosition(bx - cropX * scale, by - cropY * scale).setCrop(cropX, cropY, cs, cs);
    // Névoa: 1 px por célula do explorado.
    const cell = T.exploreCell * px;
    const fs = scale * cell;
    this.fog.setScale(fs).setPosition(bx - (cropX / cell) * fs, by - (cropY / cell) * fs).setCrop(cropX / cell, cropY / cell, cs / cell, cs / cell);
    // Moldura
    this.bg.clear().fillStyle(0x0b0c0f, 0.9).fillRoundedRect(bx - 3 * k, by - 3 * k, size + 6 * k, size + 6 * k, 8 * k);
    const g = this.over.clear();
    g.lineStyle(1.5, 0xffffff, 0.22).strokeRoundedRect(bx - 3 * k, by - 3 * k, size + 6 * k, size + 6 * k, 8 * k);
    const toScreen = (wx: number, wy: number) => ({ x: bx + ((wx / map.tileSize) * px - cropX) * scale, y: by + ((wy / map.tileSize) * px - cropY) * scale });
    const clampIn = (p: { x: number; y: number }) => {
      const m = 7 * k;
      const inside = p.x >= bx + m && p.x <= bx + size - m && p.y >= by + m && p.y <= by + size - m;
      return { x: Math.max(bx + m, Math.min(bx + size - m, p.x)), y: Math.max(by + m, Math.min(by + size - m, p.y)), inside };
    };
    // Marcadores perto aparecem; moradia e alvo sempre (na borda se longe).
    for (const m of marks.marks) {
      const p = toScreen(m.x, m.y);
      const c = clampIn(p);
      if (!c.inside && marks.target !== m.id) continue;
      drawMarkIcon(g, c.x, c.y, 5 * k, m.cat, MARK_CATS.find((x) => x.id === m.cat)?.color ?? 0xe0a84a, marks.target === m.id);
    }
    if (marks.home) {
      const c = clampIn(toScreen(marks.home.x, marks.home.y));
      drawMarkIcon(g, c.x, c.y, 6 * k, 'moradia', 0xf2e6c8, marks.target === 0);
    }
    // Jogador: seta para onde olha.
    const a = pl.facing;
    const mx = bx + size / 2;
    const my = by + size / 2;
    const r = 7 * k;
    g.fillStyle(0x0b0c0f, 1).fillCircle(mx, my, r * 0.9);
    g.fillStyle(0xf0f0ea, 1).fillTriangle(mx + Math.cos(a) * r, my + Math.sin(a) * r, mx + Math.cos(a + 2.5) * r * 0.75, my + Math.sin(a + 2.5) * r * 0.75, mx + Math.cos(a - 2.5) * r * 0.75, my + Math.sin(a - 2.5) * r * 0.75);
    // Norte
    g.fillStyle(0xd0453a, 1).fillTriangle(bx + size - 10 * k, by + 4 * k, bx + size - 14 * k, by + 12 * k, bx + size - 6 * k, by + 12 * k);
    // Bússola do alvo
    const t = marks.targetPoint();
    if (t) {
      const d = meters(pl.x, pl.y, t.x, t.y);
      this.label.setText(`${t.name} · ${metersLabel(d)} ${d > 8 ? compass(pl.x, pl.y, t.x, t.y) : ''}`.trim()).setScale(k).setPosition(bx + size / 2, by + size + 5 * k).setVisible(true);
    } else this.label.setVisible(false);
  }
}
