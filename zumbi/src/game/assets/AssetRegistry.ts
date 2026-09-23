/**
 * Registro central de sprites: dado um id lógico ("prop.car.red"),
 * devolve a textura/quadro a usar — o PNG substituto se existir,
 * senão o desenho procedural do atlas.
 *
 * O resto do jogo NUNCA usa chaves de textura diretamente: sempre
 * `assets.ref(id)`. É isso que permite trocar a arte depois.
 */
import Phaser from 'phaser';
import type { AtlasFrameRef } from './AtlasBuilder';
import { overrideKey } from './AssetOverrides';

export interface SpriteRef {
  key: string;
  frame?: string | number;
}

export class AssetRegistry {
  private atlas = new Map<string, AtlasFrameRef>();

  constructor(private readonly textures: Phaser.Textures.TextureManager) {}

  setAtlas(refs: Map<string, AtlasFrameRef>): void {
    for (const [id, ref] of refs) this.atlas.set(id, ref);
  }

  /** Sprite único (ou quadro `index` de uma folha animada). */
  ref(id: string, index?: number): SpriteRef {
    const ovr = overrideKey(id);
    if (this.textures.exists(ovr)) {
      return index === undefined ? { key: ovr } : { key: ovr, frame: index };
    }
    const atlasId = index === undefined ? id : `${id}/${index}`;
    const a = this.atlas.get(atlasId);
    if (a) return { key: a.key, frame: a.frame };
    console.warn(`[assets] sprite desconhecido: ${atlasId}`);
    return { key: '__MISSING' };
  }

  /** Sombra pré-calculada do sprite (sempre procedural, gerada também para PNGs substitutos). */
  shadowRef(id: string): SpriteRef | null {
    const a = this.atlas.get(`${id}#shadow`);
    return a ? { key: a.key, frame: a.frame } : null;
  }

  has(id: string): boolean {
    return this.textures.exists(overrideKey(id)) || this.atlas.has(id);
  }

  /** Largura real do quadro em pixels de textura (para escalar arte de qualquer resolução). */
  frameWidth(ref: SpriteRef): number {
    const tex = this.textures.get(ref.key);
    const f = tex.get(ref.frame);
    return f?.realWidth ?? 1;
  }

  frameHeight(ref: SpriteRef): number {
    const tex = this.textures.get(ref.key);
    const f = tex.get(ref.frame);
    return f?.realHeight ?? 1;
  }
}
