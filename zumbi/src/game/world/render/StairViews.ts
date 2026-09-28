/**
 * ESCADAS desenhadas por chunk (Graphics, sem colisão: pisa-se em cima).
 * Térreo: degraus subindo (mais claros no alto) e corrimão. Andar do meio:
 * vão com degraus descendo e subindo. Último andar: vão de descida com
 * guarda-corpo em volta. Uma seta pequena indica o sentido.
 */
import Phaser from 'phaser';
import { DEPTH } from '../../config/GameConfig';
import { chunkKeyAt } from '../../sim/ChunkGrid';
import type { StairPlacement } from '../MapTypes';
import type { WorldModel } from '../WorldModel';
import type { CullEntry } from './SpatialCuller';
import type { WorldRenderer } from './WorldRenderer';

interface StairView {
  g: Phaser.GameObjects.Graphics;
  cull: CullEntry;
}

export class StairViews {
  private readonly byChunk = new Map<number, StairView[]>();
  private readonly perChunk = new Map<number, StairPlacement[]>();
  private readonly unsub: () => void;

  constructor(
    private readonly scene: Phaser.Scene,
    model: WorldModel,
    private readonly renderer: WorldRenderer,
  ) {
    for (const s of model.floors.stairs) {
      const k = chunkKeyAt(s.x + s.w / 2, s.y + s.h / 2);
      const l = this.perChunk.get(k) ?? [];
      l.push(s);
      this.perChunk.set(k, l);
    }
    this.unsub = renderer.onChunk({ load: (k) => this.load(k), unload: (k) => this.unload(k) });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsub());
  }

  private load(key: number): void {
    const list = this.perChunk.get(key);
    if (!list) return;
    this.byChunk.set(
      key,
      list.map((s) => {
        const g = this.scene.add.graphics().setDepth(DEPTH.floorProp + 1);
        draw(g, s);
        const cull = this.renderer.culler.add(g, s.x - 8, s.y - 8, s.x + s.w + 8, s.y + s.h + 8);
        return { g, cull };
      }),
    );
  }

  private unload(key: number): void {
    for (const v of this.byChunk.get(key) ?? []) {
      this.renderer.culler.remove(v.cull);
      v.g.destroy();
    }
    this.byChunk.delete(key);
  }
}

function draw(g: Phaser.GameObjects.Graphics, s: StairPlacement): void {
  const along = s.h >= s.w; // degraus atravessam o lado curto
  const len = along ? s.h : s.w;
  const wide = along ? s.w : s.h;
  const n = Math.round(len / 14);
  const step = len / n;
  const at = (t: number, u: number): [number, number] => (along ? [s.x + u, s.y + t] : [s.x + t, s.y + u]);
  const rect = (t0: number, t1: number, u0: number, u1: number, color: number, alpha: number) => {
    const [x0, y0] = at(t0, u0);
    const [x1, y1] = at(t1, u1);
    g.fillStyle(color, alpha).fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
  };
  const line = (t0: number, u0: number, t1: number, u1: number, w: number, color: number, alpha: number) => {
    const [x0, y0] = at(t0, u0);
    const [x1, y1] = at(t1, u1);
    g.lineStyle(w, color, alpha).lineBetween(x0, y0, x1, y1);
  };
  // Sombra do vão.
  g.fillStyle(0x000000, 0.25).fillRect(s.x + 3, s.y + 4, s.w, s.h);
  if (s.level === 0) {
    // Térreo: sobe (degraus de madeira, o alto mais claro).
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(0x4a3322), Phaser.Display.Color.ValueToColor(0x9a7650), 100, Math.round(k * 100));
      rect(i * step, (i + 1) * step, 0, wide, Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      line(i * step, 0, i * step, wide, 1.5, 0x241a12, 0.8);
    }
  } else {
    // Andar: vão escuro com os degraus descendo (e subindo, se houver mais).
    rect(0, len, 0, wide, 0x14100c, 1);
    const half = s.up ? len / 2 : len;
    for (let i = 0; i < Math.round(half / step); i++) {
      const k = 1 - i / Math.max(1, Math.round(half / step));
      const v = Math.round(0x22 + k * 0x40);
      rect(i * step, (i + 1) * step - 1, 3, wide - 3, (v << 16) | ((v * 0.75) << 8) | (v * 0.5), 1);
    }
    if (s.up) {
      for (let i = 0; i < Math.round((len - half) / step); i++) {
        const t = half + i * step;
        const k = i / Math.max(1, Math.round((len - half) / step));
        const v = Math.round(0x60 + k * 0x40);
        rect(t, t + step - 1, 3, wide - 3, (v << 16) | ((v * 0.75) << 8) | (v * 0.5), 1);
      }
    }
    // Guarda-corpo (menos do lado de onde se entra).
    line(0, 0, len, 0, 3, 0xb8b0a0, 0.95);
    line(0, wide, len, wide, 3, 0xb8b0a0, 0.95);
    if (!s.up) line(len, 0, len, wide, 3, 0xb8b0a0, 0.95);
  }
  // Corrimão e seta.
  if (s.level === 0) line(0, wide - 2, len, wide - 2, 2.5, 0x2a2018, 0.9);
  const dir = s.level === 0 ? 1 : -1;
  const [tx, ty] = at(len * 0.5 + dir * 10, wide * 0.5);
  const [lx, ly] = at(len * 0.5 - dir * 4, wide * 0.5 - 6);
  const [rx, ry] = at(len * 0.5 - dir * 4, wide * 0.5 + 6);
  g.fillStyle(0xf2e8d0, 0.55).fillTriangle(tx, ty, lx, ly, rx, ry);
}
