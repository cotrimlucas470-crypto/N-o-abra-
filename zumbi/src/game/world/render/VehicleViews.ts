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
import type { AssetRegistry } from '../../assets/AssetRegistry';
import { PROP_DEFS } from '../PropCatalog';
import { propSolids } from '../collision';

/** Carro fora do lugar do mapa: desenho próprio que acompanha a pose. */
interface MovedView {
  prop: PropPlacement;
  img: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image | null;
  g: Phaser.GameObjects.Graphics;
  zones: Phaser.GameObjects.Zone[];
  /** Pose desenhada (para saber se precisa redesenhar). */
  drawn: string;
  seen: number;
}

const DOOR_FILL = 0x3f454c;
const DOOR_STROKE = 0x16181b;
const DEG = Math.PI / 180;

export class VehicleViews {
  private readonly byChunk = new Map<number, { prop: PropPlacement; g: Phaser.GameObjects.Graphics }[]>();
  private readonly byId = new Map<string, { prop: PropPlacement; g: Phaser.GameObjects.Graphics }>();
  private readonly unsubs: (() => void)[] = [];
  private blink = 0;
  private readonly moved = new Map<string, MovedView>();
  /** Carro sendo dirigido agora (sem colisão física: o jogador está dentro). */
  driving: string | null = null;
  /** Faróis acesos (noite, dirigindo). */
  headlights = false;
  private frame = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly state: WorldState,
    private readonly renderer: WorldRenderer,
    private readonly assets: AssetRegistry,
  ) {
    this.unsubs.push(
      renderer.onChunk({ load: (k) => this.load(k), unload: (k) => this.unload(k) }),
      state.vehicles.onChange((id) => {
        const v = this.byId.get(id);
        if (v) this.draw(v.prop, v.g);
        const m = this.moved.get(id);
        if (m) m.drawn = '';
      }),
      state.onChange((c) => {
        if (c.type !== 'vehicle') return;
        // Saiu do lugar: some a vista presa ao chunk do mapa.
        const st = this.byId.get(c.id);
        if (st) {
          st.g.destroy();
          this.byId.delete(c.id);
        }
        const m = this.moved.get(c.id);
        if (m) {
          m.drawn = '';
          this.setColliders(m, c.parked && this.driving !== c.id);
        }
      }),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubs.forEach((u) => u());
      for (const m of this.moved.values()) this.destroyMoved(m);
      this.moved.clear();
    });
  }

  private load(key: number): void {
    const map = this.state.model.map;
    const list: { prop: PropPlacement; g: Phaser.GameObjects.Graphics }[] = [];
    for (const i of this.state.model.index.get(key)?.props ?? []) {
      const p = map.props[i]!;
      if (!isVehicle(p.type) || this.state.isPropHidden(p.id)) continue;
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

  /** Pisca o alarme; carros dirigidos seguem a pose. */
  update(dt: number, cam?: Phaser.Cameras.Scene2D.Camera): void {
    this.frame++;
    const before = this.blink % 1 < 0.5;
    this.blink += dt * 2.2;
    const flip = before !== this.blink % 1 < 0.5;
    if (flip) for (const e of this.byId.values()) if (this.state.vehicles.alarming(e.prop.id) || this.state.vehicles.state(e.prop.id)?.alarmLeft === 0) this.draw(e.prop, e.g);
    if (!cam) return;
    const v = cam.worldView;
    const m = 400;
    for (const p of this.state.vehicles.moved()) {
      if (this.state.isPropRemoved(p.id)) continue;
      const near = p.x > v.x - m && p.x < v.right + m && p.y > v.y - m && p.y < v.bottom + m;
      let mv = this.moved.get(p.id);
      if (!near && p.id !== this.driving) continue;
      if (!mv) mv = this.makeMoved(p);
      mv.seen = this.frame;
      const key = `${p.x.toFixed(1)},${p.y.toFixed(1)},${p.angle.toFixed(2)},${this.headlights && p.id === this.driving}`;
      if (mv.drawn !== key || (flip && this.state.vehicles.alarming(p.id))) {
        mv.drawn = key;
        mv.img.setPosition(p.x, p.y).setAngle(p.angle);
        if (mv.shadow) {
          const def = PROP_DEFS[p.type];
          const o = this.renderer.shadows.offset(def.shadowHeight);
          mv.shadow.setPosition(p.x + o.x, p.y + o.y).setAngle(p.angle).setAlpha(this.renderer.shadows.alpha * 1.6);
        }
        this.draw(p, mv.g);
        if (this.headlights && p.id === this.driving) this.drawHeadlights(p, mv.g);
      }
    }
    for (const mv of [...this.moved.values()]) {
      if (mv.seen === this.frame) continue;
      this.destroyMoved(mv);
      this.moved.delete(mv.prop.id);
    }
  }

  private makeMoved(p: PropPlacement): MovedView {
    const def = PROP_DEFS[p.type];
    const id = def.sprites[p.variant] ?? def.sprites[0]!;
    const ref = this.assets.ref(id);
    const img = this.scene.add.image(p.x, p.y, ref.key, ref.frame).setAngle(p.angle).setDepth(DEPTH.object);
    img.setScale(def.width / this.assets.frameWidth(ref), def.height / this.assets.frameHeight(ref));
    if (p.flipX) img.setFlipX(true);
    let shadow: Phaser.GameObjects.Image | null = null;
    const sref = this.assets.shadowRef(id);
    if (sref && def.shadowHeight > 0) {
      shadow = this.scene.add.image(p.x, p.y, sref.key, sref.frame).setAngle(p.angle).setDepth(DEPTH.shadow);
      if (p.flipX) shadow.setFlipX(true);
    }
    const g = this.scene.add.graphics().setDepth(DEPTH.object + 0.5);
    const mv: MovedView = { prop: p, img, shadow, g, zones: [], drawn: '', seen: this.frame };
    this.moved.set(p.id, mv);
    this.setColliders(mv, this.driving !== p.id);
    return mv;
  }

  /** Colisão física do carro parado (o jogador esbarra); dirigindo, nenhuma. */
  private setColliders(mv: MovedView, on: boolean): void {
    for (const z of mv.zones) this.renderer.removeSolid(z);
    mv.zones = [];
    if (!on) return;
    for (const sd of propSolids(mv.prop)) {
      let z: Phaser.GameObjects.Zone;
      if (sd.kind === 'rect') {
        z = this.scene.add.zone(sd.x + sd.w / 2, sd.y + sd.h / 2, sd.w, sd.h);
        this.scene.physics.add.existing(z, true);
      } else {
        z = this.scene.add.zone(sd.x, sd.y, sd.r * 2, sd.r * 2);
        this.scene.physics.add.existing(z, true);
        (z.body as Phaser.Physics.Arcade.StaticBody).setCircle(sd.r);
      }
      this.renderer.solids.add(z);
      mv.zones.push(z);
    }
  }

  private destroyMoved(mv: MovedView): void {
    for (const z of mv.zones) this.renderer.removeSolid(z);
    mv.img.destroy();
    mv.shadow?.destroy();
    mv.g.destroy();
  }

  /** Estacionou/saiu do carro: a colisão volta. */
  refreshColliders(id: string): void {
    const mv = this.moved.get(id);
    if (mv) this.setColliders(mv, this.driving !== id);
  }

  /** Dois fachos de farol à frente. */
  private drawHeadlights(p: PropPlacement, g: Phaser.GameObjects.Graphics): void {
    const spec = VEHICLE_SPECS[p.type as VehicleType];
    const [hx, hy] = spec.half;
    g.fillStyle(0xfff6d8, 0.95);
    for (const sy of [-hy + 10, hy - 10]) {
      const q = toWorld(p, hx - 2, sy);
      g.fillCircle(q.x, q.y, 5);
    }
  }
}
