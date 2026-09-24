/**
 * Veículos (parte Phaser): por cima do desenho do carro, mostra portas
 * abertas (giradas na dobradiça; a lateral da van desliza), porta-malas e
 * capô abertos, vidros quebrados e o pisca-alerta quando o alarme dispara.
 * Por chunk, redesenha só o carro que mudou.
 */
import Phaser from 'phaser';
import { DEPTH } from '../../config/GameConfig';
import type { WorldState } from '../../sim/WorldState';
import { VEHICLE_SPECS, isVehicle, toWorld, type VehicleType } from '../../vehicles/Vehicles';
import type { PropPlacement } from '../MapTypes';
import type { WorldRenderer } from './WorldRenderer';

const DOOR_FILL = 0x3f454c;
const DOOR_STROKE = 0x16181b;
const DEG = Math.PI / 180;

export class VehicleViews {
  private readonly byChunk = new Map<number, { prop: PropPlacement; g: Phaser.GameObjects.Graphics }[]>();
  private readonly byId = new Map<string, { prop: PropPlacement; g: Phaser.GameObjects.Graphics }>();
  private readonly unsubs: (() => void)[] = [];
  private blink = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly state: WorldState,
    renderer: WorldRenderer,
  ) {
    this.unsubs.push(
      renderer.onChunk({ load: (k) => this.load(k), unload: (k) => this.unload(k) }),
      state.vehicles.onChange((id) => {
        const v = this.byId.get(id);
        if (v) this.draw(v.prop, v.g);
      }),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubs.forEach((u) => u()));
  }

  private load(key: number): void {
    const map = this.state.model.map;
    const list: { prop: PropPlacement; g: Phaser.GameObjects.Graphics }[] = [];
    for (const i of this.state.model.index.get(key)?.props ?? []) {
      const p = map.props[i]!;
      if (!isVehicle(p.type) || this.state.isPropRemoved(p.id)) continue;
      const g = this.scene.add.graphics().setDepth(DEPTH.object + 0.5);
      const e = { prop: p, g };
      this.draw(p, g);
      list.push(e);
      this.byId.set(p.id, e);
    }
    if (list.length) this.byChunk.set(key, list);
  }

  private unload(key: number): void {
    for (const e of this.byChunk.get(key) ?? []) {
      e.g.destroy();
      this.byId.delete(e.prop.id);
    }
    this.byChunk.delete(key);
  }

  /** Retângulo no referencial do carro (centro, tamanho, ângulo local em graus). */
  private rect(g: Phaser.GameObjects.Graphics, p: PropPlacement, cx: number, cy: number, w: number, h: number, localDeg: number, fill: number, alpha: number): void {
    const c = toWorld(p, cx, cy);
    const flip = p.flipX ? -1 : 1;
    const a = (p.angle + localDeg * flip) * DEG;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const pts = [
      [-w / 2, -h / 2],
      [w / 2, -h / 2],
      [w / 2, h / 2],
      [-w / 2, h / 2],
    ].map(([x, y]) => new Phaser.Math.Vector2(c.x + x! * cos - y! * sin, c.y + x! * sin + y! * cos));
    g.fillStyle(fill, alpha);
    g.fillPoints(pts, true);
    g.lineStyle(1.5, DOOR_STROKE, 0.9);
    g.strokePoints(pts, true);
  }

  private draw(p: PropPlacement, g: Phaser.GameObjects.Graphics): void {
    g.clear();
    const s = this.state.vehicles.state(p.id);
    if (!s) return;
    const spec = VEHICLE_SPECS[p.type as VehicleType];
    const [hx, hy] = spec.half;
    // Vidros quebrados: mancha escura com cacos claros na janela daquela porta.
    for (const id of s.broken) {
      const d = spec.doors.find((x) => x.id === id);
      const [wx, wy] = d ? [d.hinge[0] - d.length / 2, d.side * (hy - 11)] : id === 'frente' ? [hx - 50, 0] : [-hx + 40, 0];
      const [ww, wh] = d ? [d.length - 10, 8] : [10, hy * 1.4];
      this.rect(g, p, wx, wy, ww, wh, 0, 0x101214, 0.85);
      g.fillStyle(0xd8eef4, 0.8);
      for (let k = 0; k < 4; k++) {
        const q = toWorld(p, wx + (k - 1.5) * (ww / 5), wy + ((k % 2) - 0.5) * (wh / 3));
        g.fillCircle(q.x, q.y, 1.4);
      }
    }
    // Portas abertas.
    for (const d of spec.doors) {
      if (!s.doors[d.id]?.open) continue;
      if (d.sliding) {
        this.rect(g, p, d.hinge[0] - d.length / 2 - d.length * 0.8, d.side * (hy + 3), d.length, 6, 0, DOOR_FILL, 1);
        continue;
      }
      // Folha: da dobradiça para trás, girada 65° para fora.
      const ang = -d.side * 65;
      const rad = ang * DEG;
      const mx = d.hinge[0] - Math.cos(rad) * (d.length / 2);
      const my = d.hinge[1] - Math.sin(rad) * (d.length / 2);
      this.rect(g, p, mx, my, d.length, 6, ang, DOOR_FILL, 1);
    }
    // Porta-malas aberto: tampa para trás.
    if (s.trunk.open) this.rect(g, p, -hx - 10, 0, 22, hy * 1.7, 0, DOOR_FILL, 0.95);
    // Capô aberto: tampa levantada sobre o para-brisa.
    if (s.hood) this.rect(g, p, hx - 34, 0, 44, hy * 1.7, 0, 0x5a6068, 0.9);
    // Alarme: pisca-alerta nos quatro cantos.
    if (this.state.vehicles.alarming(p.id) && this.blink % 1 < 0.5) {
      g.fillStyle(0xffb030, 0.95);
      for (const [x, y] of [
        [hx - 4, -hy + 6],
        [hx - 4, hy - 6],
        [-hx + 4, -hy + 6],
        [-hx + 4, hy - 6],
      ] as const) {
        const q = toWorld(p, x, y);
        g.fillCircle(q.x, q.y, 6);
      }
    }
  }

  /** Pisca o alarme. */
  update(dt: number): void {
    const before = this.blink % 1 < 0.5;
    this.blink += dt * 2.2;
    if (before === this.blink % 1 < 0.5) return;
    for (const e of this.byId.values()) if (this.state.vehicles.alarming(e.prop.id) || this.state.vehicles.state(e.prop.id)?.alarmLeft === 0) this.draw(e.prop, e.g);
  }
}
