/**
 * Transforma um MapData (dados puros) em objetos do Phaser:
 * chão (tilemap), faixas, decalques, objetos, paredes, sombras,
 * telhados e corpos de colisão.
 *
 * Nada de regra de jogo aqui — só construção visual/física do mundo.
 */
import Phaser from 'phaser';
import { DEPTH, TILE } from '../../config/GameConfig';
import { PALETTE, hex } from '../../config/Palette';
import type { EventBus } from '../../core/EventBus';
import { hash2 } from '../../core/Random';
import { TEX } from '../../assets/AssetKeys';
import type { AssetRegistry } from '../../assets/AssetRegistry';
import { mapSolids } from '../collision';
import { DECAL_DEFS } from '../DecalCatalog';
import { GROUND_VARIANTS, type MapData, type MarkingKind, type WallPiece } from '../MapTypes';
import { PROP_DEFS, type PropDef } from '../PropCatalog';
import { CanopyFader } from './CanopyFader';
import { RoofSystem } from './RoofSystem';
import { ShadowSystem } from './ShadowSystem';
import { SpatialCuller } from './SpatialCuller';

const MARKING_TEXTURE: Record<MarkingKind, { key: string; fitThickness: boolean }> = {
  'lane-dash': { key: 'pattern.lane.dash', fitThickness: true },
  'lane-double': { key: 'pattern.lane.double', fitThickness: true },
  crosswalk: { key: 'pattern.crosswalk', fitThickness: false },
  curb: { key: 'pattern.curb', fitThickness: true },
  stall: { key: 'pattern.stall', fitThickness: false },
};

/** Altura (para a sombra) e opacidade da sombra por tipo de parede. */
const WALL_SHADOW: Record<WallPiece['kind'], { height: number; strength: number }> = {
  wall: { height: 1.6, strength: 0.95 },
  window: { height: 1.2, strength: 0.35 },
  fence: { height: 0.9, strength: 0.7 },
};


export class WorldRenderer {
  readonly shadows = new ShadowSystem();
  readonly culler = new SpatialCuller();
  readonly canopies = new CanopyFader();
  readonly roofs: RoofSystem;
  readonly solids: Phaser.Physics.Arcade.StaticGroup;
  readonly widthPx: number;
  readonly heightPx: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly map: MapData,
    private readonly assets: AssetRegistry,
    bus: EventBus,
  ) {
    this.widthPx = map.widthTiles * map.tileSize;
    this.heightPx = map.heightTiles * map.tileSize;
    this.roofs = new RoofSystem(scene, assets, bus);

    this.buildGround();
    this.buildMarkings();
    this.buildDecals();
    this.buildProps();
    this.buildWalls();
    this.roofs.build(map.buildings, this.shadows, this.culler);
    this.solids = this.buildColliders();
  }

  // ------------------------------------------------------------------ chão

  private buildGround(): void {
    const { widthTiles: w, heightTiles: h } = this.map;
    const data: number[][] = [];
    for (let y = 0; y < h; y++) {
      const row: number[] = [];
      for (let x = 0; x < w; x++) {
        const g = this.map.ground[y * w + x]!;
        row.push(g * GROUND_VARIANTS + pickVariant(hash2(x, y, this.map.seed)));
      }
      data.push(row);
    }
    const tilemap = this.scene.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = tilemap.addTilesetImage('ground', TEX.tiles, TILE, TILE, 0, 0);
    if (!tileset) throw new Error('Tileset do chão não carregou');
    // Camada GPU: o mapa inteiro vira 1 quad desenhado por shader — ideal para celular.
    const gpu = this.scene.game.renderer.type === Phaser.WEBGL;
    const layer = tilemap.createLayer(0, tileset, 0, 0, gpu);
    if (!layer) throw new Error('Falha ao criar a camada do chão');
    layer.setDepth(DEPTH.ground);
  }

  private buildMarkings(): void {
    for (const m of this.map.markings) {
      const spec = MARKING_TEXTURE[m.kind];
      const tex = this.scene.textures.get(spec.key).getSourceImage() as { height: number };
      const ts = this.scene.add.tileSprite(m.x, m.y, m.length, m.thickness, spec.key).setDepth(DEPTH.groundMarkings);
      if (spec.fitThickness) ts.setTileScale(1, m.thickness / tex.height);
      if (m.vertical) ts.setAngle(90);
      const hw = (m.vertical ? m.thickness : m.length) / 2;
      const hh = (m.vertical ? m.length : m.thickness) / 2;
      this.culler.addCentered(ts, m.x, m.y, hw, hh);
    }
  }

  private buildDecals(): void {
    for (const d of this.map.decals) {
      const def = DECAL_DEFS[d.type];
      const id = def.sprites[Math.floor(hash2(Math.round(d.x), Math.round(d.y), 7) * def.sprites.length)]!;
      const ref = this.assets.ref(id);
      const img = this.scene.add.image(d.x, d.y, ref.key, ref.frame);
      img.setScale((def.width / this.assets.frameWidth(ref)) * d.scale, (def.height / this.assets.frameHeight(ref)) * d.scale);
      img.setAngle(d.angle).setAlpha(d.alpha).setDepth(DEPTH.decal);
      const r = (Math.hypot(def.width, def.height) / 2) * d.scale;
      this.culler.addCentered(img, d.x, d.y, r, r);
    }
  }

  // ------------------------------------------------------------------ objetos

  private buildProps(): void {
    for (const p of this.map.props) {
      const def: PropDef = PROP_DEFS[p.type];
      const id = def.sprites[p.variant] ?? def.sprites[0]!;
      const ref = this.assets.ref(id);
      const depth = def.layer === 'floor' ? DEPTH.floorProp : def.layer === 'overhead' ? DEPTH.overhead : DEPTH.object;
      const img = this.scene.add.image(p.x, p.y, ref.key, ref.frame).setAngle(p.angle).setDepth(depth);
      img.setScale(def.width / this.assets.frameWidth(ref), def.height / this.assets.frameHeight(ref));
      if (p.flipX) img.setFlipX(true);
      const r = Math.hypot(def.width, def.height) / 2;
      this.culler.addCentered(img, p.x, p.y, r, r);

      if (def.fadeWhenNear) this.canopies.add(img, p.x, p.y, Math.min(def.width, def.height) / 2);

      if (def.shadowHeight > 0) {
        const sref = this.assets.shadowRef(id);
        if (sref) {
          const sh = this.scene.add.image(p.x, p.y, sref.key, sref.frame).setAngle(p.angle).setDepth(DEPTH.shadow);
          if (p.flipX) sh.setFlipX(true);
          this.shadows.add(sh, p.x, p.y, def.shadowHeight);
          const o = this.shadows.offset(def.shadowHeight);
          this.culler.addCentered(sh, p.x + o.x, p.y + o.y, r + 12, r + 12);
        }
      }
    }
  }

  // ------------------------------------------------------------------ paredes

  private buildWalls(): void {
    for (const w of this.map.walls) {
      const cx = w.x + w.w / 2;
      const cy = w.y + w.h / 2;
      let obj: Phaser.GameObjects.Rectangle | Phaser.GameObjects.TileSprite;
      if (w.kind === 'fence') {
        const vertical = w.h > w.w;
        const len = vertical ? w.h : w.w;
        const th = vertical ? w.w : w.h;
        obj = this.scene.add.tileSprite(cx, cy, len, th, 'pattern.fence');
        if (vertical) obj.setAngle(90);
      } else if (w.kind === 'window') {
        obj = this.scene.add.rectangle(cx, cy, w.w, w.h, hex(PALETTE.window), 0.92).setStrokeStyle(2, 0x2a2f33, 1);
      } else {
        obj = this.scene.add.rectangle(cx, cy, w.w, w.h, hex(PALETTE.wall)).setStrokeStyle(2, hex(PALETTE.wallTop), 1);
      }
      obj.setDepth(DEPTH.wall);
      this.culler.addCentered(obj, cx, cy, w.w / 2, w.h / 2);

      const s = WALL_SHADOW[w.kind];
      const shadow = this.scene.add.rectangle(cx, cy, w.w, w.h, 0x000000).setDepth(DEPTH.wallShadow);
      this.shadows.add(shadow, cx, cy, s.height, s.strength);
      const o = this.shadows.offset(s.height);
      this.culler.addCentered(shadow, cx + o.x, cy + o.y, w.w / 2, w.h / 2);
    }
  }

  // ------------------------------------------------------------------ física

  private buildColliders(): Phaser.Physics.Arcade.StaticGroup {
    const group = this.scene.physics.add.staticGroup();
    for (const s of mapSolids(this.map)) {
      if (s.kind === 'rect') {
        const z = this.scene.add.zone(s.x + s.w / 2, s.y + s.h / 2, s.w, s.h);
        this.scene.physics.add.existing(z, true);
        group.add(z);
      } else {
        const z = this.scene.add.zone(s.x, s.y, s.r * 2, s.r * 2);
        this.scene.physics.add.existing(z, true);
        (z.body as Phaser.Physics.Arcade.StaticBody).setCircle(s.r);
        group.add(z);
      }
    }
    return group;
  }

  // ------------------------------------------------------------------ por frame

  update(camera: Phaser.Cameras.Scene2D.Camera, playerX: number, playerY: number, dt: number): void {
    this.culler.update(camera.worldView);
    this.canopies.update(playerX, playerY, dt);
    this.roofs.update(playerX, playerY, dt);
  }
}

/** Variações mais "limpas" aparecem mais; rachaduras/manchas são raras. */
function pickVariant(r: number): number {
  if (r < 0.46) return 0;
  if (r < 0.72) return 1;
  if (r < 0.88) return 2;
  return 3;
}

