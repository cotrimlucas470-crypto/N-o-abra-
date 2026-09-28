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
import { GRASS_PALETTES, TILESET_ROWS, grassRow } from '../../assets/procedural/tiles';
import { Ground, GROUND_VARIANTS, VOID_GROUND, type GroundId, type FloorData, type MarkingKind, type PropPlacement, type Rect, type WallPiece } from '../MapTypes';
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

/** Mudanças do jogador no mundo que o desenho precisa respeitar. */
export interface WorldEdits {
  isPropRemoved(id: string): boolean;
  /** Estação no objeto (neve por cima, folhas): imagens extras com o mesmo culling. */
  dress?(img: Phaser.GameObjects.Image, p: PropPlacement, def: PropDef): Phaser.GameObjects.Image[];
  /** Árvore que perde folha no inverno. */
  seasonal?(p: PropPlacement): boolean;
  /** Pedaços que sobraram da parede `i` (vão derrubado). */
  wallPieces?(i: number): Rect[];
}

export interface ViewRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Jogador num andar de cima: o retângulo do andar e o deslocamento até a rua lá embaixo. */
export interface Upstairs {
  floor: Rect;
  dx: number;
  dy: number;
}

export class WorldRenderer {
  readonly shadows = new ShadowSystem();
  readonly culler = new SpatialCuller();
  readonly canopies = new CanopyFader();
  readonly roofs: RoofSystem;
  readonly solids: Phaser.Physics.Arcade.StaticGroup;
  private readonly loaded = new Map<number, LoadedChunk>();
  private readonly markingTexH = new Map<string, number>();
  /** Chão da cidade (para trocar a cor da grama com a estação). */
  private groundLayer: Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer | null = null;
  /** Tiles de grama: posição, tipo, variação e o sorteio que decide quando cada um muda de cor. */
  private grassCells: { x: number; y: number; g: GroundId; v: number; t: number }[] = [];
  private grassKey = -1;
  private readonly chunkListeners = new Set<ChunkListener>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: WorldModel,
    private readonly assets: AssetRegistry,
    bus: EventBus,
    private readonly edits: WorldEdits | null = null,
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
    // Só a cidade: o chão de cada andar de cima aparece só quando se está nele.
    const w = map.widthTiles;
    const h = map.cityHeightTiles ?? map.heightTiles;
    const data: number[][] = [];
    for (let y = 0; y < h; y++) {
      const row: number[] = [];
      for (let x = 0; x < w; x++) {
        const g = map.ground[y * w + x]!;
        const v = pickVariant(hash2(x, y, map.seed));
        row.push(g * GROUND_VARIANTS + v);
        if (g === Ground.Grass || g === Ground.GrassDark) this.grassCells.push({ x, y, g: g as GroundId, v, t: hash2(x, y, map.seed + 91) });
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
    // Só o tileset procedural tem as cores de estação da grama (um PNG substituto não tem).
    const rows = (this.scene.textures.get(TEX.tiles).getSourceImage() as { height: number }).height / TILE;
    this.groundLayer = rows >= TILESET_ROWS ? layer : null;
  }

  /**
   * Cor da grama pela época (0..6): cada tile muda num dia um pouco
   * diferente (sorteio fixo), então o gramado amarela/volta aos poucos.
   */
  setGrassSeason(stage: number): void {
    const layer = this.groundLayer;
    const key = Math.floor(stage * 24);
    if (!layer || key === this.grassKey) return;
    this.grassKey = key;
    const data = layer.layer.data;
    let changed = false;
    for (const c of this.grassCells) {
      const p = Math.floor(stage + c.t) % GRASS_PALETTES;
      const idx = grassRow(c.g, p) * GROUND_VARIANTS + c.v;
      const t = data[c.y]![c.x]!;
      if (t.index !== idx) {
        t.index = idx;
        changed = true;
      }
    }
    if (changed && layer instanceof Phaser.Tilemaps.TilemapGPULayer) layer.generateLayerDataTexture();
  }

  /** Chão do andar de cima em que o jogador está (um mapinha só daquele andar). */
  private floorGround: { id: string; map: Phaser.Tilemaps.Tilemap } | null = null;

  showFloorGround(f: FloorData | null): void {
    if ((f?.id ?? null) === (this.floorGround?.id ?? null)) return;
    this.floorGround?.map.destroy();
    this.floorGround = null;
    if (!f) return;
    const map = this.world.map;
    const tx0 = Math.floor(f.bounds.x / TILE);
    const ty0 = Math.floor(f.bounds.y / TILE);
    const tw = Math.ceil(f.bounds.w / TILE) + 1;
    const th = Math.ceil(f.bounds.h / TILE) + 1;
    const data: number[][] = [];
    for (let y = ty0; y < ty0 + th; y++) {
      const row: number[] = [];
      for (let x = tx0; x < tx0 + tw; x++) {
        const g = map.ground[y * map.widthTiles + x];
        row.push(g === undefined || g === VOID_GROUND ? -1 : g * GROUND_VARIANTS + pickVariant(hash2(x, y, map.seed)));
      }
      data.push(row);
    }
    const tilemap = this.scene.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = tilemap.addTilesetImage('ground', TEX.tiles, TILE, TILE, 0, 0);
    if (!tileset) return;
    const layer = tilemap.createLayer(0, tileset, tx0 * TILE, ty0 * TILE);
    layer?.setDepth(DEPTH.ground);
    this.floorGround = { id: f.id, map: tilemap };
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
  stream(view: ViewRect, force = false, floor: Rect | null = null): void {
    const W = this.world.widthPx;
    const H = this.world.heightPx;
    // Andar de cima: os chunks EXATOS do andar (sem margem: o vizinho da faixa
    // é outro prédio) + a rua lá embaixo (`view`, já em coordenadas da cidade).
    const exact = floor ? chunksInRect(floor.x, floor.y, floor.x + floor.w - 1, floor.y + floor.h - 1, W, H) : [];
    const keep = new Set([
      ...chunksInRect(view.x - UNLOAD_MARGIN, view.y - UNLOAD_MARGIN, view.x + view.width + UNLOAD_MARGIN, view.y + view.height + UNLOAD_MARGIN, W, this.cityBottom),
      ...exact,
    ]);
    for (const key of [...this.loaded.keys()]) if (!keep.has(key)) this.unloadChunk(key);

    const want = [
      ...exact,
      ...chunksInRect(view.x - LOAD_MARGIN, view.y - LOAD_MARGIN, view.x + view.width + LOAD_MARGIN, view.y + view.height + LOAD_MARGIN, W, floor ? this.cityBottom : H),
    ].filter((k, i, a) => !this.loaded.has(k) && a.indexOf(k) === i);
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
  ensureLoadedAround(x: number, y: number, viewW: number, viewH: number, up: Upstairs | null = null): void {
    const view = { x: x - viewW / 2, y: y - viewH / 2, width: viewW, height: viewH };
    if (up) {
      const below = { ...view, x: view.x - up.dx, y: view.y - up.dy };
      this.stream(below, true, up.floor);
      this.culler.update([below, { x: up.floor.x, y: up.floor.y, width: up.floor.w, height: up.floor.h }], true);
      return;
    }
    this.stream(view, true);
    this.culler.update(view, true);
  }

  /** Fim da cidade (px): a faixa dos andares fica abaixo. */
  private get cityBottom(): number {
    const m = this.world.map;
    return (m.cityHeightTiles ?? m.heightTiles) * TILE;
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
    for (const z of lc.zones) this.removeSolid(z);
    for (const o of lc.objects) o.destroy();
    for (const id of lc.roofs) this.roofs.unload(id);
    this.loaded.delete(key);
  }

  /** Recria um chunk carregado (objeto quebrado/removido ou construído). */
  refreshChunk(key: number): void {
    if (!this.loaded.has(key)) return;
    this.unloadChunk(key);
    this.loadChunk(key);
  }

  /**
   * Tira um colisor do grupo. Ao fechar a cena a física pode já ter
   * desmontado o grupo: aí só destrói o objeto.
   */
  removeSolid(z: Phaser.GameObjects.GameObject): void {
    if (this.solids.children) this.solids.remove(z, true, true);
    else z.destroy();
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
    if (this.edits?.isPropRemoved(p.id)) return;
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

    if (def.fadeWhenNear) lc.canopies.push(this.canopies.add(img, p.x, p.y, Math.min(def.width, def.height) / 2, this.edits?.seasonal?.(p) ?? false));
    for (const e of this.edits?.dress?.(img, p, def) ?? []) {
      lc.objects.push(e);
      lc.culls.push(this.culler.addCentered(e, p.x, p.y, r, r));
    }

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
    const base = this.world.map.walls[i]!;
    const pieces = this.edits?.wallPieces?.(i) ?? [base];
    const horiz = base.w >= base.h;
    for (const p of pieces) {
      // Pedaço de cerca continua o desenho de onde a peça inteira estaria.
      const shift = horiz ? p.x - base.x : p.y - base.y;
      this.buildWallPiece(lc, { ...base, ...p, offset: (base.offset ?? 0) + shift });
    }
  }

  private buildWallPiece(lc: LoadedChunk, w: WallPiece): void {
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

  update(camera: Phaser.Cameras.Scene2D.Camera, playerX: number, playerY: number, dt: number, up: Upstairs | null = null): void {
    if (up) {
      const v = camera.worldView;
      const below = { x: v.x - up.dx, y: v.y - up.dy, width: v.width, height: v.height };
      this.stream(below, false, up.floor);
      this.culler.update([below, { x: up.floor.x, y: up.floor.y, width: up.floor.w, height: up.floor.h }]);
    } else {
      this.stream(camera.worldView);
      this.culler.update(camera.worldView);
    }
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
