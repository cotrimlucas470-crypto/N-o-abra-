/**
 * Telhados: escondem o interior enquanto o jogador está fora e somem
 * suavemente quando ele entra. Também avisam (EventBus) quando o
 * jogador entra/sai de uma construção — o HUD mostra o nome do local.
 */
import Phaser from 'phaser';
import { DEPTH } from '../../config/GameConfig';
import type { EventBus } from '../../core/EventBus';
import { Random, hashString } from '../../core/Random';
import { damp } from '../../core/math';
import type { AssetRegistry } from '../../assets/AssetRegistry';
import type { BuildingData } from '../MapTypes';
import type { ShadowSystem } from './ShadowSystem';
import type { SpatialCuller } from './SpatialCuller';

const OVERHANG = 10;
const ROOF_HEIGHT = 2.3;
const ROOF_SHADOW_STRENGTH = 1.05;

interface Roof {
  data: BuildingData;
  container: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Rectangle;
  inside: boolean;
}

export class RoofSystem {
  private roofs: Roof[] = [];
  private current: Roof | null = null;
  private shadows: ShadowSystem | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly assets: AssetRegistry,
    private readonly bus: EventBus,
  ) {}

  build(buildings: BuildingData[], shadows: ShadowSystem, culler: SpatialCuller): void {
    this.shadows = shadows;
    for (const b of buildings) {
      const roof = this.buildRoof(b, shadows);
      this.roofs.push(roof);
      const o = shadows.offset(ROOF_HEIGHT);
      culler.add(roof.container, b.bounds.x - OVERHANG, b.bounds.y - OVERHANG, b.bounds.x + b.bounds.w + OVERHANG, b.bounds.y + b.bounds.h + OVERHANG);
      culler.add(roof.shadow, b.bounds.x + o.x - OVERHANG, b.bounds.y + o.y - OVERHANG, b.bounds.x + b.bounds.w + o.x + OVERHANG, b.bounds.y + b.bounds.h + o.y + OVERHANG);
    }
  }

  private buildRoof(b: BuildingData, shadows: ShadowSystem): Roof {
    const s = this.scene;
    const x0 = b.bounds.x - OVERHANG;
    const y0 = b.bounds.y - OVERHANG;
    const w = b.bounds.w + OVERHANG * 2;
    const h = b.bounds.h + OVERHANG * 2;
    const cx = x0 + w / 2;
    const cy = y0 + h / 2;

    const shadow = s.add.rectangle(0, 0, w, h, 0x000000).setDepth(DEPTH.roofShadow);
    shadows.add(shadow, cx, cy, ROOF_HEIGHT, ROOF_SHADOW_STRENGTH);

    const container = s.add.container(0, 0).setDepth(DEPTH.roof);
    const pattern = s.add.tileSprite(cx, cy, w, h, `pattern.roof.${b.roof}`);
    container.add(pattern);

    const g = s.add.graphics();
    container.add(g);
    const rng = new Random(hashString(b.id));

    if (b.roof === 'flat') {
      // platibanda (borda elevada) + objetos no telhado
      g.lineStyle(8, 0x7d8185, 1).strokeRect(x0 + 4, y0 + 4, w - 8, h - 8);
      g.lineStyle(2, 0x3c3f42, 0.9).strokeRect(x0 + 9, y0 + 9, w - 18, h - 18);
      g.lineStyle(2, 0x2a2c2e, 1).strokeRect(x0, y0, w, h);
      const units = Math.max(1, Math.floor((w * h) / 180000));
      for (let i = 0; i < units + 1; i++) {
        const id = i === 0 || rng.chance(0.6) ? 'roof.ac' : 'roof.vent';
        const ux = x0 + rng.range(60, w - 60);
        const uy = y0 + rng.range(60, h - 60);
        const sh = this.assets.shadowRef(id);
        if (sh) container.add(s.add.image(ux + 6, uy + 9, sh.key, sh.frame).setAlpha(0.3));
        const ref = this.assets.ref(id);
        container.add(s.add.image(ux, uy, ref.key, ref.frame).setAngle(rng.pick([0, 90, 180, 270])));
      }
    } else {
      // telhado de quatro águas: faces com luz diferente dão volume
      const hw = Math.min(w, h) / 2;
      const along = w >= h;
      const r0 = along ? { x: x0 + hw, y: cy } : { x: cx, y: y0 + hw };
      const r1 = along ? { x: x0 + w - hw, y: cy } : { x: cx, y: y0 + h - hw };
      const tl = { x: x0, y: y0 };
      const tr = { x: x0 + w, y: y0 };
      const bl = { x: x0, y: y0 + h };
      const br = { x: x0 + w, y: y0 + h };
      const face = (pts: { x: number; y: number }[], color: number, alpha: number) => {
        g.fillStyle(color, alpha);
        g.fillPoints(pts.map((p) => new Phaser.Math.Vector2(p.x, p.y)), true);
      };
      if (along) {
        face([tl, tr, r1, r0], 0xffffff, 0.07); // norte (recebe luz)
        face([bl, br, r1, r0], 0x000000, 0.2); // sul
        face([tl, r0, bl], 0xffffff, 0.03); // oeste
        face([tr, r1, br], 0x000000, 0.12); // leste
      } else {
        face([tl, bl, r1, r0], 0xffffff, 0.04);
        face([tr, br, r1, r0], 0x000000, 0.14);
        face([tl, tr, r0], 0xffffff, 0.07);
        face([bl, br, r1], 0x000000, 0.2);
      }
      g.lineStyle(3, 0x241c19, 0.55);
      g.lineBetween(tl.x, tl.y, r0.x, r0.y);
      g.lineBetween(bl.x, bl.y, r0.x, r0.y);
      g.lineBetween(tr.x, tr.y, r1.x, r1.y);
      g.lineBetween(br.x, br.y, r1.x, r1.y);
      g.lineStyle(7, 0x2e2522, 1).lineBetween(r0.x, r0.y, r1.x, r1.y);
      g.lineStyle(2, 0x6d5c54, 0.8).lineBetween(r0.x, r0.y - 2, r1.x, r1.y - 2);
      g.lineStyle(2, 0x1e1816, 1).strokeRect(x0, y0, w, h);
      // chaminé
      const chx = x0 + w * rng.range(0.25, 0.75);
      const chy = y0 + h * (along ? 0.3 : rng.range(0.3, 0.7));
      g.fillStyle(0x000000, 0.3).fillRect(chx + 5, chy + 7, 26, 26);
      g.fillStyle(0x7b4a3a, 1).fillRect(chx, chy, 26, 26);
      g.fillStyle(0x5a3428, 1).fillRect(chx + 13, chy, 13, 26);
      g.fillStyle(0x1c1c1c, 1).fillRect(chx + 6, chy + 6, 14, 14);
      g.lineStyle(1.5, 0x2a1a14, 1).strokeRect(chx, chy, 26, 26);
    }

    // sujeira/folhas por cima de qualquer telhado
    for (let i = 0; i < 6; i++) {
      g.fillStyle(rng.pick([0x6d5a3a, 0x4a4a3a, 0x7a5a2e]), rng.range(0.25, 0.5));
      g.fillCircle(x0 + rng.range(20, w - 20), y0 + rng.range(20, h - 20), rng.range(2, 6));
    }

    return { data: b, container, shadow, inside: false };
  }

  /** Construção em que o ponto está (pela linha central das paredes externas). */
  buildingAt(x: number, y: number): BuildingData | null {
    for (const r of this.roofs) {
      const b = r.data.bounds;
      if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return r.data;
    }
    return null;
  }

  update(px: number, py: number, dt: number): void {
    const t = damp(9, dt);
    const shadowAlpha = (this.shadows?.alpha ?? 0.3) * ROOF_SHADOW_STRENGTH;
    let now: Roof | null = null;
    for (const r of this.roofs) {
      const b = r.data.bounds;
      r.inside = px > b.x && px < b.x + b.w && py > b.y && py < b.y + b.h;
      if (r.inside) now = r;
      const target = r.inside ? 0 : 1;
      const a = r.container.alpha;
      if (Math.abs(a - target) > 0.003) {
        const next = a + (target - a) * t;
        r.container.setAlpha(next);
        r.shadow.setAlpha(next * shadowAlpha);
      } else if (a !== target) {
        r.container.setAlpha(target);
        r.shadow.setAlpha(target * shadowAlpha);
      }
    }
    if (now !== this.current) {
      const info = (r: Roof) => ({ buildingId: r.data.id, name: r.data.name, kind: r.data.kind });
      if (this.current) this.bus.emit('player:exit-building', info(this.current));
      if (now) this.bus.emit('player:enter-building', info(now));
      this.current = now;
    }
  }
}
