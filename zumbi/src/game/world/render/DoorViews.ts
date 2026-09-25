/**
 * Desenho e colisão das portas, por chunk (junto com o resto do mundo).
 *
 * - Folhas giram na dobradiça ao abrir/fechar (animação curta).
 * - Portão de enrolar some para cima; fica a caixa do rolo do lado de dentro.
 * - Porta fechada = corpo sólido no vão (a física deixa de deixar passar).
 * - Porta da rua ganha uma "fachada" por cima da beirada do telhado:
 *   de fora dá para ver se está aberta (vão escuro) ou fechada.
 *
 * Só desenha: quem decide é o WorldState (escutado por `onChange`).
 */
import Phaser from 'phaser';
import { DEPTH } from '../../config/GameConfig';
import { DOOR_TUNING } from '../../config/WorldTuning';
import type { WorldState } from '../../sim/WorldState';
import { doorGapRect, doorLeaves, type DoorLeaf } from '../doors';
import type { DoorMaterial, DoorPlacement } from '../MapTypes';
import type { WorldRenderer } from './WorldRenderer';

const LEAF_THICKNESS = 7;
/** Quanto a fachada avança para fora da face da parede (passa 2 px da beirada do telhado, que tem 10 px). */
const FACADE_OUT = 5;

const LEAF_STYLE: Record<DoorMaterial, { fill: number; alpha: number; stroke: number }> = {
  wood: { fill: 0x8a6440, alpha: 1, stroke: 0x3b2a1a },
  glass: { fill: 0x9fcad8, alpha: 0.55, stroke: 0xd9eef4 },
  metal: { fill: 0x737a80, alpha: 1, stroke: 0x2c3034 },
};

interface DoorView {
  door: DoorPlacement;
  leaves: { leaf: DoorLeaf; obj: Phaser.GameObjects.Rectangle }[];
  shutter: Phaser.GameObjects.Graphics | null;
  housing: Phaser.GameObjects.Rectangle | null;
  facade: Phaser.GameObjects.Graphics | null;
  zone: Phaser.GameObjects.Zone | null;
  /** Rachaduras e lascas (porta apanhando). */
  cracks: Phaser.GameObjects.Graphics | null;
  /** 0 = fechada, 1 = aberta (animação). */
  t: number;
  target: number;
}

export class DoorViews {
  private readonly byChunk = new Map<number, DoorView[]>();
  private readonly byId = new Map<string, DoorView>();
  private readonly animating = new Set<DoorView>();
  private readonly unsubs: (() => void)[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly state: WorldState,
    private readonly renderer: WorldRenderer,
  ) {
    this.unsubs.push(
      state.onChange((c) => {
        if (c.type === 'door') this.refresh(c.door.id);
        else if (c.type === 'damage' && c.what === 'door') {
          const v = this.byId.get(c.id);
          if (v) this.drawCracks(v);
        }
      }),
      renderer.onChunk({ load: (k) => this.load(k), unload: (k) => this.unload(k) }),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubs.forEach((u) => u()));
  }

  private load(key: number): void {
    const content = this.state.model.index.get(key);
    if (!content || content.doors.length === 0) return;
    const views = content.doors.map((i) => this.build(this.state.model.map.doors[i]!));
    this.byChunk.set(key, views);
  }

  private unload(key: number): void {
    const views = this.byChunk.get(key);
    if (!views) return;
    for (const v of views) {
      for (const l of v.leaves) l.obj.destroy();
      v.shutter?.destroy();
      v.housing?.destroy();
      v.facade?.destroy();
      v.cracks?.destroy();
      if (v.zone) this.renderer.solids.remove(v.zone, true, true);
      this.animating.delete(v);
      this.byId.delete(v.door.id);
    }
    this.byChunk.delete(key);
  }

  private build(d: DoorPlacement): DoorView {
    const s = this.scene;
    const open = this.state.doorState(d.id)?.open ?? false;
    const style = LEAF_STYLE[d.material];
    const leaves = doorLeaves(d).map((leaf) => {
      const obj = s.add
        .rectangle(leaf.hx, leaf.hy, leaf.length - 1, LEAF_THICKNESS, style.fill, style.alpha)
        .setOrigin(0, 0.5)
        .setStrokeStyle(1.5, style.stroke, 0.9)
        .setDepth(DEPTH.door);
      return { leaf, obj };
    });

    let shutter: Phaser.GameObjects.Graphics | null = null;
    let housing: Phaser.GameObjects.Rectangle | null = null;
    if (d.style === 'rolling') {
      shutter = s.add.graphics().setDepth(DEPTH.door).setPosition(d.x, d.y).setAngle(d.vertical ? 90 : 0);
      drawShutter(shutter, d.length, d.thickness + 4);
      // Caixa do rolo, do lado de dentro, rente à parede.
      const off = d.swing * (d.thickness / 2 + 5);
      housing = s.add
        .rectangle(d.vertical ? d.x + off : d.x, d.vertical ? d.y : d.y + off, d.vertical ? 8 : d.length, d.vertical ? d.length : 8, 0x3a3e42, 0.95)
        .setStrokeStyle(1, 0x1c1e20, 1)
        .setDepth(DEPTH.door);
    }

    const facade = d.exterior ? s.add.graphics().setDepth(DEPTH.roofDoor) : null;
    const v: DoorView = { door: d, leaves, shutter, housing, facade, zone: null, cracks: null, t: open ? 1 : 0, target: open ? 1 : 0 };
    this.byId.set(d.id, v);
    this.setSolid(v, !open);
    this.pose(v);
    this.drawFacade(v, open);
    this.drawCracks(v);
    return v;
  }

  /**
   * Estrago visível: rachaduras e lascas que aumentam com as faixas de
   * resistência (80% → 50% → 20%); vidro trinca em estrela. Some com a
   * porta aberta (a folha sai do vão) e com a porta quebrada.
   */
  private drawCracks(v: DoorView): void {
    const d = v.door;
    const max = this.state.doorMaxHealth(d.id);
    const hp = this.state.doorHealth(d.id);
    const frac = max > 0 ? hp / max : 1;
    const st = this.state.doorState(d.id);
    if (frac >= 0.8 || !st || st.broken) {
      v.cracks?.destroy();
      v.cracks = null;
      return;
    }
    const g = v.cracks ?? this.scene.add.graphics().setDepth(DEPTH.door + 0.2);
    v.cracks = g;
    g.clear();
    const stage = frac > 0.5 ? 1 : frac > 0.2 ? 2 : 3;
    const r = doorGapRect(d);
    // Semente fixa pela porta: as rachaduras não "pulam" de lugar ao redesenhar.
    let seed = 0;
    for (let i = 0; i < d.id.length; i++) seed = (seed * 31 + d.id.charCodeAt(i)) | 0;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) | 0;
      return ((seed >>> 8) & 0xffff) / 0xffff;
    };
    const along = d.vertical ? r.h : r.w;
    const at = (t: number, off: number) => (d.vertical ? { x: r.x + r.w / 2 + off, y: r.y + t * along } : { x: r.x + t * along, y: r.y + r.h / 2 + off });
    if (d.material === 'glass') {
      for (let k = 0; k < stage; k++) {
        const c = at(0.2 + rnd() * 0.6, 0);
        g.lineStyle(1, 0xf2fbff, 0.9);
        for (let i = 0; i < 6 + stage * 2; i++) {
          const a = rnd() * Math.PI * 2;
          const l = 6 + rnd() * 14;
          g.lineBetween(c.x, c.y, c.x + Math.cos(a) * l, c.y + Math.sin(a) * l);
        }
      }
    } else {
      const n = stage === 1 ? 2 : stage === 2 ? 5 : 9;
      g.lineStyle(1.5, 0x140e08, 0.85);
      for (let i = 0; i < n; i++) {
        const t0 = rnd();
        const p0 = at(t0, (rnd() - 0.5) * 4);
        const p1 = at(Math.min(1, Math.max(0, t0 + (rnd() - 0.5) * 0.35)), (rnd() - 0.5) * 6);
        g.lineBetween(p0.x, p0.y, p1.x, p1.y);
      }
      // Lascas claras (madeira arrancada) e, quase caindo, buracos.
      g.fillStyle(d.material === 'metal' ? 0xb8c0c8 : 0xd8b890, 0.9);
      for (let i = 0; i < stage * 2; i++) {
        const p = at(rnd(), (rnd() - 0.5) * 5);
        g.fillRect(p.x - 1.5, p.y - 1, 3, 2);
      }
      if (stage === 3) {
        g.fillStyle(0x0a0806, 0.9);
        for (let i = 0; i < 2; i++) {
          const p = at(0.25 + rnd() * 0.5, 0);
          g.fillEllipse(p.x, p.y, d.vertical ? 5 : 9, d.vertical ? 9 : 5);
        }
      }
    }
    g.setVisible(!st.open);
  }

  /** Estado mudou: colisão na hora, desenho anima. */
  private refresh(id: string): void {
    const v = this.byId.get(id);
    if (!v) return;
    const open = this.state.doorState(id)?.open ?? false;
    v.target = open ? 1 : 0;
    this.setSolid(v, !open);
    this.drawFacade(v, open);
    this.drawCracks(v);
    this.animating.add(v);
  }

  private setSolid(v: DoorView, solid: boolean): void {
    if (solid && !v.zone) {
      const r = doorGapRect(v.door);
      const z = this.scene.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h);
      this.scene.physics.add.existing(z, true);
      this.renderer.solids.add(z);
      v.zone = z;
    } else if (!solid && v.zone) {
      this.renderer.solids.remove(v.zone, true, true);
      v.zone = null;
    }
  }

  private pose(v: DoorView): void {
    // Quebrada: a folha foi ao chão (só sobra o vão).
    if (this.state.doorState(v.door.id)?.broken) {
      for (const { obj } of v.leaves) obj.setVisible(false);
      v.shutter?.setVisible(false);
      v.housing?.setAlpha(0.3);
      return;
    }
    const e = easeOutCubic(v.t);
    for (const { leaf, obj } of v.leaves) obj.setAngle(leaf.closedAngle + (leaf.openAngle - leaf.closedAngle) * e);
    if (v.shutter) v.shutter.setAlpha(1 - v.t).setVisible(v.t < 0.999);
    if (v.housing) v.housing.setAlpha(0.35 + 0.6 * v.t);
  }

  private drawFacade(v: DoorView, open: boolean): void {
    const g = v.facade;
    if (!g) return;
    const d = v.door;
    g.clear();
    // Lado de fora = contrário de onde a porta abre (portas da rua abrem para dentro).
    const out = -d.swing;
    const len = d.length - 2;
    const th = d.thickness / 2 + FACADE_OUT;
    // Retângulo em coordenadas "ao longo × para fora" convertido para o mundo.
    const across0 = out > 0 ? -d.thickness / 2 : -th;
    const x = d.vertical ? d.x + across0 : d.x - len / 2;
    const y = d.vertical ? d.y - len / 2 : d.y + across0;
    const w = d.vertical ? th + d.thickness / 2 : len;
    const h = d.vertical ? len : th + d.thickness / 2;
    if (open) {
      g.fillStyle(0x14120f, 0.92).fillRect(x, y, w, h);
    } else {
      const style = LEAF_STYLE[d.material];
      const fill = d.style === 'rolling' ? 0x7b8086 : style.fill;
      g.fillStyle(fill, d.material === 'glass' ? 0.8 : 1).fillRect(x, y, w, h);
      if (d.style === 'rolling') {
        g.lineStyle(1, 0x4a4f54, 0.9);
        const n = Math.floor(len / 7);
        for (let i = 1; i < n; i++) {
          const p = (i * len) / n;
          if (d.vertical) g.lineBetween(x, y + p, x + w, y + p);
          else g.lineBetween(x + p, y, x + p, y + h);
        }
      } else if (d.style === 'double') {
        g.lineStyle(1.5, style.stroke, 0.9);
        if (d.vertical) g.lineBetween(x, d.y, x + w, d.y);
        else g.lineBetween(d.x, y, d.x, y + h);
      }
    }
    g.lineStyle(2, 0x241c16, 0.95).strokeRect(x, y, w, h);
  }

  /** 1x por quadro. */
  update(dt: number): void {
    for (const v of this.animating) {
      const secs = v.door.style === 'rolling' ? DOOR_TUNING.rollSeconds : DOOR_TUNING.swingSeconds;
      const step = dt / secs;
      v.t = v.target > v.t ? Math.min(v.target, v.t + step) : Math.max(v.target, v.t - step);
      this.pose(v);
      if (v.t === v.target) this.animating.delete(v);
    }
    // A fachada acompanha o telhado: some quando o jogador entra na construção.
    for (const v of this.byId.values()) {
      if (v.facade && v.door.buildingId) v.facade.setAlpha(this.renderer.roofs.alphaOf(v.door.buildingId));
    }
  }

  get count(): number {
    return this.byId.size;
  }

  colliderCount(): number {
    let n = 0;
    for (const v of this.byId.values()) if (v.zone) n++;
    return n;
  }
}

function drawShutter(g: Phaser.GameObjects.Graphics, len: number, th: number): void {
  g.fillStyle(0x7b8086, 1).fillRect(-len / 2, -th / 2, len, th);
  g.lineStyle(1, 0x4a4f54, 0.9);
  const n = Math.floor(len / 7);
  for (let i = 1; i < n; i++) {
    const x = -len / 2 + (i * len) / n;
    g.lineBetween(x, -th / 2, x, th / 2);
  }
  g.lineStyle(1.5, 0x2c3034, 1).strokeRect(-len / 2, -th / 2, len, th);
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}
