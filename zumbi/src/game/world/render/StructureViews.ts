/**
 * Desenho do que o jogador montou (parte Phaser), por chunk. A fogueira:
 * anel de pedras, lenha cruzada, brasa e chama que tremula quando acesa;
 * cinza quando acabou. Só as acesas na tela são redesenhadas por quadro.
 */
import Phaser from 'phaser';
import { fuelLeft, isBurning, strength } from '../../build/Fire';
import { STRUCTURE_DEFS } from '../../build/StructureCatalog';
import type { Structure } from '../../build/Structures';
import { DEPTH } from '../../config/GameConfig';
import type { WorldState } from '../../sim/WorldState';
import type { WorldRenderer } from './WorldRenderer';

interface View {
  s: Structure;
  g: Phaser.GameObjects.Graphics;
}

export class StructureViews {
  private readonly byChunk = new Map<number, View[]>();
  private readonly byId = new Map<string, View>();
  private readonly unsubs: (() => void)[] = [];
  private t = 0;
  private frameTimer = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly state: WorldState,
    private readonly renderer: WorldRenderer,
    private readonly minutes: () => number,
  ) {
    this.unsubs.push(
      renderer.onChunk({ load: (k) => this.load(k), unload: (k) => this.unload(k) }),
      state.structures.onChange(({ s, removed }) => this.changed(s, removed)),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubs.forEach((u) => u()));
  }

  private load(key: number): void {
    const list: View[] = [];
    for (const s of this.state.structures.inChunk(key)) {
      const v = this.make(s);
      list.push(v);
    }
    if (list.length) this.byChunk.set(key, list);
  }

  private unload(key: number): void {
    for (const v of this.byChunk.get(key) ?? []) {
      v.g.destroy();
      this.byId.delete(v.s.id);
    }
    this.byChunk.delete(key);
  }

  private make(s: Structure): View {
    const g = this.scene.add.graphics().setDepth(STRUCTURE_DEFS[s.type].solid ? DEPTH.object : DEPTH.floorProp + 1);
    const v = { s, g };
    this.byId.set(s.id, v);
    this.draw(v);
    return v;
  }

  private changed(s: Structure, removed: boolean): void {
    const v = this.byId.get(s.id);
    if (removed) {
      if (!v) return;
      v.g.destroy();
      this.byId.delete(s.id);
      for (const [k, list] of this.byChunk) {
        const i = list.indexOf(v);
        if (i >= 0) {
          list.splice(i, 1);
          if (!list.length) this.byChunk.delete(k);
        }
      }
      return;
    }
    if (v) {
      v.s = s;
      this.draw(v);
      return;
    }
    // Nova estrutura num chunk já carregado: cria agora.
    const key = this.state.model.index.chunkOfPoint(s.x, s.y);
    if (!this.renderer.isChunkLoaded(key)) return;
    const nv = this.make(s);
    const list = this.byChunk.get(key) ?? [];
    list.push(nv);
    this.byChunk.set(key, list);
  }

  private draw(v: View): void {
    const d = STRUCTURE_DEFS[v.s.type];
    if (d.fire) this.drawFire(v);
  }

  private drawFire(v: View): void {
    const { s, g } = v;
    const now = this.minutes();
    const lit = isBurning(s, now);
    const fuel = fuelLeft(s, now);
    g.clear();
    // Chão queimado e anel de pedras.
    g.fillStyle(0x1c1a18, 0.55).fillCircle(s.x, s.y, 21);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      g.fillStyle(i % 2 ? 0x8a8a82 : 0x6f6f68, 1).fillCircle(s.x + Math.cos(a) * 19, s.y + Math.sin(a) * 19, 5);
    }
    if (fuel > 0) {
      // Lenha cruzada (escura se apagada).
      const wood = lit ? 0x6a4428 : 0x4a3424;
      for (const [a, len] of [[0.5, 26], [2.1, 24], [3.7, 22]] as const) {
        const cx = Math.cos(a) * len * 0.5;
        const cy = Math.sin(a) * len * 0.5;
        g.lineStyle(6, wood, 1).lineBetween(s.x - cx, s.y - cy, s.x + cx, s.y + cy);
      }
    } else {
      g.fillStyle(0x6a6660, 0.9).fillCircle(s.x, s.y, 10);
      g.fillStyle(0x8a8580, 0.8).fillCircle(s.x - 3, s.y + 2, 5);
    }
    if (!lit) return;
    const k = strength(s, now);
    const f = Math.sin(this.t * 13 + s.x) * 0.5 + Math.sin(this.t * 7.3 + s.y) * 0.5;
    g.fillStyle(0xff5a1a, 0.35).fillCircle(s.x, s.y, 16 + 3 * k);
    g.fillStyle(0xff7a20, 0.9).fillEllipse(s.x, s.y - 3 - f, (13 + f * 2) * k + 5, (18 + f * 3) * k + 6);
    g.fillStyle(0xffc84a, 0.95).fillEllipse(s.x, s.y - 2 - f * 0.5, (7 + f) * k + 3, (11 + f * 2) * k + 3);
    g.fillStyle(0xfff2c0, 0.9).fillEllipse(s.x, s.y, 4 * k + 2, 5 * k + 2);
  }

  /** Chama tremulando (só as fogueiras acesas carregadas; ~20 quadros/s). */
  update(dt: number): void {
    this.t += dt;
    this.frameTimer -= dt;
    if (this.frameTimer > 0) return;
    this.frameTimer = 0.05;
    const now = this.minutes();
    for (const v of this.byId.values()) if (STRUCTURE_DEFS[v.s.type].fire && (v.s.lit || isBurning(v.s, now))) this.drawFire(v);
  }
}
