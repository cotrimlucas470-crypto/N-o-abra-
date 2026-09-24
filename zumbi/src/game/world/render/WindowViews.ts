/**
 * Janelas quebradas (parte Phaser): o vidro some, fica o vão escuro com
 * pontas de caco no batente — até alguém tirar os cacos. Por chunk.
 */
import Phaser from 'phaser';
import { DEPTH } from '../../config/GameConfig';
import { WorldState } from '../../sim/WorldState';
import type { WorldRenderer } from './WorldRenderer';

export class WindowViews {
  private readonly byChunk = new Map<number, Phaser.GameObjects.Graphics[]>();
  private readonly unsubs: (() => void)[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly state: WorldState,
    renderer: WorldRenderer,
  ) {
    this.unsubs.push(
      renderer.onChunk({ load: (k) => this.load(k), unload: (k) => this.unload(k) }),
      state.onChange((c) => {
        if (c.type !== 'window') return;
        const k = state.model.index.chunkOfPoint(c.x, c.y);
        if (!renderer.isChunkLoaded(k)) return;
        this.unload(k);
        this.load(k);
      }),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubs.forEach((u) => u()));
  }

  private load(key: number): void {
    const map = this.state.model.map;
    const list: Phaser.GameObjects.Graphics[] = [];
    for (const i of this.state.model.index.get(key)?.walls ?? []) {
      const w = map.walls[i]!;
      if (w.kind !== 'window') continue;
      const id = WorldState.windowId(w);
      if (!this.state.isWindowBroken(id)) continue;
      const g = this.scene.add.graphics().setDepth(DEPTH.wall + 0.5);
      // Vão escuro + batente.
      g.fillStyle(0x15171a, 1).fillRect(w.x, w.y, w.w, w.h);
      g.lineStyle(2, 0x2a2f33, 1).strokeRect(w.x, w.y, w.w, w.h);
      if (this.state.windowHasShards(id)) {
        g.fillStyle(0xbfe0e8, 0.9);
        const vertical = w.h > w.w;
        const len = vertical ? w.h : w.w;
        for (let t = 6; t < len - 4; t += 11) {
          const s = 3 + ((t * 7) % 5);
          if (vertical) g.fillTriangle(w.x, w.y + t, w.x, w.y + t + 6, w.x + s, w.y + t + 3);
          else g.fillTriangle(w.x + t, w.y, w.x + t + 6, w.y, w.x + t + 3, w.y + s);
        }
      }
      list.push(g);
    }
    if (list.length) this.byChunk.set(key, list);
  }

  private unload(key: number): void {
    for (const g of this.byChunk.get(key) ?? []) g.destroy();
    this.byChunk.delete(key);
  }
}
