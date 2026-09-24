/**
 * Desenha o mundo a partir do WorldModel (dados puros), EM CHUNKS:
 * só os chunks perto da câmera existem como objetos do Phaser (visuais,
 * sombras, telhados e corpos de colisão). Ao se afastar, eles são
 * destruídos; ao voltar, recriados a partir dos mesmos dados.
 *
 * O chão é uma exceção: uma única camada de tiles na GPU para o mundo todo
 * (custo fixo por pixel, não importa o tamanho do mapa).
 *
 * Nada de regra de jogo aqui — só construção visual/física do mundo.
 */
import Phaser from 'phaser';
import { DEPTH, TILE } from '../../config/GameConfig';
import { PALETTE, hex } from '../../config/Palette';
import type { EventBus } from '../../core/EventBus';
import { hash2 } from '../../core/Random';
import { CHUNK_PX, chunksInRect, keyToChunk } from '../../sim/ChunkGrid';
import { TEX } from '../../assets/AssetKeys';
import type { AssetRegistry } from '../../assets/AssetRegistry';
import { propSolids, type Solid } from '../collision';
import { DECAL_DEFS } from '../DecalCatalog';
import { GROUND_VARIANTS, type MarkingKind, type WallPiece } from '../MapTypes';
import { PROP_DEFS, type PropDef } from '../PropCatalog';
import type { WorldModel } from '../WorldModel';
import { CanopyFader, type Canopy } from './CanopyFader';
import { RoofSystem } from './RoofSystem';
import { ShadowSystem, type ShadowEntry } from './ShadowSystem';
import { SpatialCuller, type CullEntry } from './SpatialCuller';

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

/**
 * Margens de carga (px além da borda da tela). Carrega antes de aparecer;
 * só descarrega bem depois de sumir (histerese: andar para lá e para cá na
 * fronteira não fica criando e destruindo objetos).
 */
const LOAD_MARGIN = CHUNK_PX * 0.75;
const UNLOAD_MARGIN = CHUNK_PX * 1.5;
/** Chunks criados por quadro em jogo normal (espalha o custo, sem travadas). */
const LOADS_PER_FRAME = 2;

interface LoadedChunk {
  objects: Phaser.GameObjects.GameObject[];
  culls: CullEntry[];
  shadows: ShadowEntry[];
  canopies: Canopy[];
  zones: Phaser.GameObjects.Zone[];
  roofs: string[];
}

/** Quem desenha conteúdo dinâmico por chunk (portas, itens; depois zumbis, cadáveres). */
export interface ChunkListener {
  load(key: number): void;
  unload(key: number): void;
}

export interface ViewRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class WorldRenderer {
  readonly shadows = new ShadowSystem();
  readonly culler = new SpatialCuller();
  readonly canopies = new CanopyFader();
  readonly roofs: RoofSystem;
  readonly solids: Phaser.Physics.Arcade.StaticGroup;
  private readonly loaded = new Map<number, LoadedChunk>();
  private readonly markingTexH = new Map<string, number>();
  private readonly chunkListeners = new Set<ChunkListener>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: WorldModel,
    private readonly assets: AssetRegistry,
    bus: EventBus,
  ) {
    this.roofs = new RoofSystem(scene, assets, bus, this.shadows, this.culler, (x, y) => world.index.buildingsNear(x, y));
    this.solids = scene.physics.add.staticGroup();
    this.buildGround();
    for (const spec of Object.values(MARKING_TEXTURE)) {
      const img = scene.textures.get(spec.key).getSourceImage() as { height: number };
      this.markingTexH.set(spec.key, img.height);
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unloadAll());
  }

  get widthPx(): number {
    return this.world.widthPx;
  }

  get heightPx(): number {
    return this.world.heightPx;
  }

  // ------------------------------------------------------------------ chão

  private buildGround(): void {
    const map = this.world.map;
    const { widthTiles: w, heightTiles: h } = map;
    const data: number[][] = [];
    for (let y = 0; y < h; y++) {
      const row: number[] = [];
      for (let x = 0; x < w; x++) {
        const g = map.ground[y * w + x]!;
        row.push(g * GROUND_VARIANTS + pickVariant(hash2(x, y, map.seed)));
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

  /**
   * Avisa quando um chunk é criado/destruído. Quem se inscreve depois de o
   * mundo já ter chunks carregados recebe os que já existem.
   */
  onChunk(l: ChunkListener): () => void {
    this.chunkListeners.add(l);
    for (const key of this.loaded.keys()) l.load(key);
    return () => this.chunkListeners.delete(l);
  }

  isChunkLoaded(key: number): boolean {
    return this.loaded.has(key);
  }

  // ------------------------------------------------------------------ streaming

  /**
   * Carrega o que a tela vai precisar e descarrega o que ficou longe.
   * `force`: carrega tudo o que falta de uma vez (início, teleporte).
   */
  stream(view: ViewRect, force = false): void {
    const W = this.world.widthPx;
    const H = this.world.heightPx;
    const keep = new Set(
      chunksInRect(view.x - UNLOAD_MARGIN, view.y - UNLOAD_MARGIN, view.x + view.width + UNLOAD_MARGIN, view.y + view.height + UNLOAD_MARGIN, W, H),
    );
    for (const key of [...this.loaded.keys()]) if (!keep.has(key)) this.unloadChunk(key);

    const want = chunksInRect(view.x - LOAD_MARGIN, view.y - LOAD_MARGIN, view.x + view.width + LOAD_MARGIN, view.y + view.height + LOAD_MARGIN, W, H).filter(
      (k) => !this.loaded.has(k),
    );
    if (want.length === 0) return;
    // Mais perto do centro da tela primeiro.
    const cx = (view.x + view.width / 2) / CHUNK_PX - 0.5;
    const cy = (view.y + view.height / 2) / CHUNK_PX - 0.5;
    want.sort((a, b) => {
      const p = keyToChunk(a);
      const q = keyToChunk(b);
      return (p.cx - cx) ** 2 + (p.cy - cy) ** 2 - ((q.cx - cx) ** 2 + (q.cy - cy) ** 2);
    });
    const n = force ? want.length : Math.min(LOADS_PER_FRAME, want.length);
    for (let i = 0; i < n; i++) this.loadChunk(want[i]!);
  }

  /** Garante tudo carregado em volta de um ponto (antes de teleportar ou nascer). */
  ensureLoadedAround(x: number, y: number, viewW: number, viewH: number): void {
    this.stream({ x: x - viewW / 2, y: y - viewH / 2, width: viewW, height: viewH }, true);
    this.culler.update({ x: x - viewW / 2, y: y - viewH / 2, width: viewW, height: viewH }, true);
  }

  private loadChunk(key: number): void {
    const content = this.world.index.get(key);
    const lc: LoadedChunk = { objects: [], culls: [], shadows: [], canopies: [], zones: [], roofs: [] };
    this.loaded.set(key, lc);
    for (const l of this.chunkListeners) l.load(key);
    if (!content) return; // chunk vazio (só chão): nada a criar
    const map = this.world.map;
    for (const i of content.markings) this.buildMarking(lc, i);
    for (const i of content.decals) this.buildDecal(lc, i);
    for (const i of content.props) this.buildProp(lc, i);
    for (const i of content.walls) this.buildWall(lc, i);
    for (const i of content.buildings) {
      const b = map.buildings[i]!;
      this.roofs.load(b);
      lc.roofs.push(b.id);
    }
  }

  private unloadChunk(key: number): void {
    const lc = this.loaded.get(key);
    if (!lc) return;
    for (const l of this.chunkListeners) l.unload(key);
    for (const c of lc.culls) this.culler.remove(c);
    for (const s of lc.shadows) this.shadows.remove(s);
    for (const c of lc.canopies) this.canopies.remove(c);
    for (const z of lc.zones) this.solids.remove(z, true, true);
    for (const o of lc.objects) o.destroy();
    for (const id of lc.roofs) this.roofs.unload(id);
    this.loaded.delete(key);
  }

  private unloadAll(): void {
    for (const key of [...this.loaded.keys()]) this.unloadChunk(key);
  }

  // ------------------------------------------------------------------ construção de um chunk

  private buildMarking(lc: LoadedChunk, i: number): void {
    const m = this.world.map.markings[i]!;
    const spec = MARKING_TEXTURE[m.kind];
    const ts = this.scene.add.tileSprite(m.x, m.y, m.length, m.thickness, spec.key).setDepth(DEPTH.groundMarkings);
    const texH = this.markingTexH.get(spec.key) ?? m.thickness;
    const sy = spec.fitThickness ? m.thickness / texH : 1;
    ts.setTileScale(1, sy);
    // Pedaço de uma faixa longa: continua o desenho de onde o anterior parou.
    if (m.offset) ts.setTilePosition(m.offset, 0);
    if (m.vertical) ts.setAngle(90);
    const hw = (m.vertical ? m.thickness : m.length) / 2;
    const hh = (m.vertical ? m.length : m.thickness) / 2;
    lc.objects.push(ts);
    lc.culls.push(this.culler.addCentered(ts, m.x, m.y, hw, hh));
  }

  private buildDecal(lc: LoadedChunk, i: number): void {
    const d = this.world.map.decals[i]!;
    const def = DECAL_DEFS[d.type];
    const id = def.sprites[Math.floor(hash2(Math.round(d.x), Math.round(d.y), 7) * def.sprites.length)]!;
    const ref = this.assets.ref(id);
    const img = this.scene.add.image(d.x, d.y, ref.key, ref.frame);
    img.setScale((def.width / this.assets.frameWidth(ref)) * d.scale, (def.height / this.assets.frameHeight(ref)) * d.scale);
    img.setAngle(d.angle).setAlpha(d.alpha).setDepth(DEPTH.decal);
    const r = (Math.hypot(def.width, def.height) / 2) * d.scale;
    lc.objects.push(img);
    lc.culls.push(this.culler.addCentered(img, d.x, d.y, r, r));
  }

  private buildProp(lc: LoadedChunk, i: number): void {
    const p = this.world.map.props[i]!;
    const def: PropDef = PROP_DEFS[p.type];
    const id = def.sprites[p.variant] ?? def.sprites[0]!;
    const ref = this.assets.ref(id);
    const depth = def.layer === 'floor' ? DEPTH.floorProp : def.layer === 'overhead' ? DEPTH.overhead : DEPTH.object;
    const img = this.scene.add.image(p.x, p.y, ref.key, ref.frame).setAngle(p.angle).setDepth(depth);
    img.setScale(def.width / this.assets.frameWidth(ref), def.height / this.assets.frameHeight(ref));
    if (p.flipX) img.setFlipX(true);
    const r = Math.hypot(def.width, def.height) / 2;
    lc.objects.push(img);
    lc.culls.push(this.culler.addCentered(img, p.x, p.y, r, r));

    if (def.fadeWhenNear) lc.canopies.push(this.canopies.add(img, p.x, p.y, Math.min(def.width, def.height) / 2));

    if (def.shadowHeight > 0) {
      const sref = this.assets.shadowRef(id);
      if (sref) {
        const sh = this.scene.add.image(p.x, p.y, sref.key, sref.frame).setAngle(p.angle).setDepth(DEPTH.shadow);
        if (p.flipX) sh.setFlipX(true);
        lc.objects.push(sh);
        lc.shadows.push(this.shadows.add(sh, p.x, p.y, def.shadowHeight));
        const o = this.shadows.offset(def.shadowHeight);
        lc.culls.push(this.culler.addCentered(sh, p.x + o.x, p.y + o.y, r + 12, r + 12));
      }
    }
    for (const s of propSolids(p)) this.addCollider(lc, s);
  }

  private buildWall(lc: LoadedChunk, i: number): void {
    const w = this.world.map.walls[i]!;
    const cx = w.x + w.w / 2;
    const cy = w.y + w.h / 2;
    let obj: Phaser.GameObjects.Rectangle | Phaser.GameObjects.TileSprite;
    if (w.kind === 'fence') {
      const vertical = w.h > w.w;
      const len = vertical ? w.h : w.w;
      const th = vertical ? w.w : w.h;
      const ts = this.scene.add.tileSprite(cx, cy, len, th, 'pattern.fence');
      if (w.offset) ts.setTilePosition(w.offset, 0);
      if (vertical) ts.setAngle(90);
      obj = ts;
    } else if (w.kind === 'window') {
      obj = this.scene.add.rectangle(cx, cy, w.w, w.h, hex(PALETTE.window), 0.92).setStrokeStyle(2, 0x2a2f33, 1);
    } else {
      obj = this.scene.add.rectangle(cx, cy, w.w, w.h, hex(PALETTE.wall)).setStrokeStyle(2, hex(PALETTE.wallTop), 1);
    }
    obj.setDepth(DEPTH.wall);
    lc.objects.push(obj);
    lc.culls.push(this.culler.addCentered(obj, cx, cy, w.w / 2, w.h / 2));

    const s = WALL_SHADOW[w.kind];
    const shadow = this.scene.add.rectangle(cx, cy, w.w, w.h, 0x000000).setDepth(DEPTH.wallShadow);
    lc.objects.push(shadow);
    lc.shadows.push(this.shadows.add(shadow, cx, cy, s.height, s.strength));
    const o = this.shadows.offset(s.height);
    lc.culls.push(this.culler.addCentered(shadow, cx + o.x, cy + o.y, w.w / 2, w.h / 2));

    this.addCollider(lc, { kind: 'rect', x: w.x, y: w.y, w: w.w, h: w.h });
  }

  private addCollider(lc: LoadedChunk, s: Solid): void {
    let z: Phaser.GameObjects.Zone;
    if (s.kind === 'rect') {
      z = this.scene.add.zone(s.x + s.w / 2, s.y + s.h / 2, s.w, s.h);
      this.scene.physics.add.existing(z, true);
    } else {
      z = this.scene.add.zone(s.x, s.y, s.r * 2, s.r * 2);
      this.scene.physics.add.existing(z, true);
      (z.body as Phaser.Physics.Arcade.StaticBody).setCircle(s.r);
    }
    this.solids.add(z);
    lc.zones.push(z);
  }

  // ------------------------------------------------------------------ por frame

  update(camera: Phaser.Cameras.Scene2D.Camera, playerX: number, playerY: number, dt: number): void {
    this.stream(camera.worldView);
    this.culler.update(camera.worldView);
    this.canopies.update(playerX, playerY, dt);
    this.roofs.update(playerX, playerY, dt);
  }

  /** Números para o painel de debug e para testes. */
  stats(): { chunks: number; colliders: number; roofs: number; shadows: number; culled: { total: number; visible: number } } {
    let colliders = 0;
    for (const lc of this.loaded.values()) colliders += lc.zones.length;
    return { chunks: this.loaded.size, colliders, roofs: this.roofs.loadedCount, shadows: this.shadows.count, culled: this.culler.stats() };
  }

  loadedChunkKeys(): number[] {
    return [...this.loaded.keys()];
  }
}

/** Variações mais "limpas" aparecem mais; rachaduras/manchas são raras. */
function pickVariant(r: number): number {
  if (r < 0.46) return 0;
  if (r < 0.72) return 1;
  if (r < 0.88) return 2;
  return 3;
}
