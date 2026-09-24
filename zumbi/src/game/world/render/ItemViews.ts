/**
 * Itens no chão, desenhados por chunk. Cada item é um ícone pequeno,
 * levemente girado (fixo por id: não "pula" ao recarregar o chunk).
 * Quando o WorldState muda os itens de um chunk carregado, o chunk é refeito.
 */
import Phaser from 'phaser';
import { DEPTH } from '../../config/GameConfig';
import { hashString } from '../../core/Random';
import type { AssetRegistry } from '../../assets/AssetRegistry';
import { itemDef } from '../../items/ItemCatalog';
import type { WorldState } from '../../sim/WorldState';
import type { CullEntry } from './SpatialCuller';
import type { WorldRenderer } from './WorldRenderer';

/** Tamanho do ícone no chão (px de mundo). */
const GROUND_SIZE = 30;

interface ItemView {
  img: Phaser.GameObjects.Image;
  cull: CullEntry;
}

export class ItemViews {
  private readonly byChunk = new Map<number, ItemView[]>();
  private readonly unsubs: (() => void)[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly state: WorldState,
    private readonly renderer: WorldRenderer,
    private readonly assets: AssetRegistry,
  ) {
    this.unsubs.push(
      state.onChange((c) => {
        if (c.type !== 'items' || !renderer.isChunkLoaded(c.chunk)) return;
        this.unload(c.chunk);
        this.load(c.chunk);
      }),
      renderer.onChunk({ load: (k) => this.load(k), unload: (k) => this.unload(k) }),
    );
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubs.forEach((u) => u()));
  }

  private load(key: number): void {
    const items = this.state.itemsInChunk(key);
    if (items.length === 0) return;
    const views: ItemView[] = [];
    for (const it of items) {
      const def = itemDef(it.defId);
      if (!def) continue;
      const ref = this.assets.ref(def.icon);
      const h = hashString(it.id);
      const img = this.scene.add.image(it.x, it.y, ref.key, ref.frame).setDepth(DEPTH.item);
      img.setScale(GROUND_SIZE / this.assets.frameWidth(ref), GROUND_SIZE / this.assets.frameHeight(ref));
      img.setAngle((h % 70) - 35);
      const cull = this.renderer.culler.addCentered(img, it.x, it.y, GROUND_SIZE, GROUND_SIZE);
      views.push({ img, cull });
    }
    this.byChunk.set(key, views);
  }

  private unload(key: number): void {
    const views = this.byChunk.get(key);
    if (!views) return;
    for (const v of views) {
      this.renderer.culler.remove(v.cull);
      v.img.destroy();
    }
    this.byChunk.delete(key);
  }

  get count(): number {
    let n = 0;
    for (const v of this.byChunk.values()) n += v.length;
    return n;
  }
}
