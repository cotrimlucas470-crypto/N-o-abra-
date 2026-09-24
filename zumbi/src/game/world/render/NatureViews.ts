/**
 * Desenho do que a natureza tem agora: frutos por cima da copa das
 * frutíferas (cheia / poucos / nenhum) e montinhos de galho, pedra e
 * cogumelo no chão. Por chunk, como o resto do mundo.
 *
 * A quantidade vem do NatureState (calculada pelo tempo do jogo); o desenho
 * se atualiza ao colher e, de tempos em tempos, para mostrar a rebrota.
 */
import Phaser from 'phaser';
import { DEPTH } from '../../config/GameConfig';
import type { AssetRegistry } from '../../assets/AssetRegistry';
import { PROP_HARVEST, RESOURCE_HARVEST, RESOURCE_SIZE, type HarvestDef } from '../../nature/NatureCatalog';
import type { WorldState } from '../../sim/WorldState';
import { PROP_DEFS } from '../PropCatalog';
import type { Canopy } from './CanopyFader';
import type { CullEntry } from './SpatialCuller';
import type { WorldRenderer } from './WorldRenderer';

interface View {
  id: string;
  def: HarvestDef;
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  /** Raio para o recorte e (copas) para ficar translúcido com o jogador embaixo. */
  radius: number;
  tree: boolean;
  /** Registrado no recorte/no esmaecer só enquanto tem algo para mostrar. */
  cull: CullEntry | null;
  canopy: Canopy | null;
  /** Sprite base ("fruit.apple") para trocar entre cheia e poucos. */
  base: string;
  level: -1 | 0 | 1 | 2;
}

const REFRESH_SECONDS = 2;

export class NatureViews {
  private readonly byChunk = new Map<number, View[]>();
  private readonly byId = new Map<string, View>();
  private readonly unsubs: (() => void)[] = [];
  private timer = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly state: WorldState,
    private readonly renderer: WorldRenderer,
    private readonly assets: AssetRegistry,
    private readonly now: () => number,
  ) {
    this.unsubs.push(
      state.onChange((c) => {
        if (c.type === 'nature') {
          const v = this.byId.get(c.id);
          if (v) this.refresh(v);
        }
      }),
      renderer.onChunk({ load: (k) => this.load(k), unload: (k) => this.unload(k) }),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubs.forEach((u) => u()));
  }

  private load(key: number): void {
    const content = this.state.model.index.get(key);
    if (!content) return;
    const map = this.state.model.map;
    const views: View[] = [];
    for (const i of content.props) {
      const p = map.props[i]!;
      const def = PROP_HARVEST[p.type];
      if (!def?.overlay) continue;
      const pdef = PROP_DEFS[p.type];
      const img = this.image(def.overlay, p.x, p.y, pdef.width, pdef.height, DEPTH.overhead + 1).setAngle(p.angle);
      if (p.flipX) img.setFlipX(true);
      views.push({ id: p.id, def, img, x: p.x, y: p.y, radius: Math.min(pdef.width, pdef.height) / 2, tree: true, cull: null, canopy: null, base: def.overlay, level: -1 });
    }
    for (const i of content.resources) {
      const r = map.resources[i]!;
      const def = RESOURCE_HARVEST[r.type];
      const img = this.image(def.sprite!, r.x, r.y, RESOURCE_SIZE, RESOURCE_SIZE, DEPTH.floorProp + 1);
      views.push({ id: r.id, def, img, x: r.x, y: r.y, radius: RESOURCE_SIZE / 2, tree: false, cull: null, canopy: null, base: def.sprite!, level: -1 });
    }
    if (!views.length) return;
    for (const v of views) {
      this.byId.set(v.id, v);
      this.refresh(v);
    }
    this.byChunk.set(key, views);
  }

  private image(id: string, x: number, y: number, w: number, h: number, depth: number): Phaser.GameObjects.Image {
    const ref = this.assets.ref(id);
    const img = this.scene.add.image(x, y, ref.key, ref.frame).setDepth(depth);
    img.setScale(w / this.assets.frameWidth(ref), h / this.assets.frameHeight(ref));
    return img;
  }

  private unload(key: number): void {
    const views = this.byChunk.get(key);
    if (!views) return;
    for (const v of views) {
      this.show(v, false);
      v.img.destroy();
      this.byId.delete(v.id);
    }
    this.byChunk.delete(key);
  }

  /** Nível 0 = vazio (some), 1 = poucos, 2 = cheio. */
  private refresh(v: View): void {
    const n = this.state.nature.count(v.id, v.def, this.now());
    const level: View['level'] = n <= 0 ? 0 : n < v.def.max * 0.5 && v.tree ? 1 : 2;
    if (level === v.level) return;
    v.level = level;
    if (level > 0 && v.tree) {
      const ref = this.assets.ref(level === 1 ? `${v.base}.few` : v.base);
      v.img.setTexture(ref.key, ref.frame);
    }
    this.show(v, level > 0);
  }

  /**
   * Vazio sai do recorte e do esmaecer (os dois mexem na visibilidade/opacidade);
   * com algo para mostrar, volta para eles.
   */
  private show(v: View, on: boolean): void {
    if (on && !v.cull) {
      v.cull = this.renderer.culler.addCentered(v.img, v.x, v.y, v.radius, v.radius);
      if (v.tree) v.canopy = this.renderer.canopies.add(v.img, v.x, v.y, v.radius);
      v.img.setAlpha(1);
    } else if (!on && v.cull) {
      this.renderer.culler.remove(v.cull);
      v.cull = null;
      if (v.canopy) this.renderer.canopies.remove(v.canopy);
      v.canopy = null;
    }
    if (!on) v.img.setVisible(false);
  }

  update(dt: number): void {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = REFRESH_SECONDS;
    for (const v of this.byId.values()) this.refresh(v);
  }

  get count(): number {
    return this.byId.size;
  }
}
