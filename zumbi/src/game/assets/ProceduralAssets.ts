/**
 * Gera toda a arte procedural na inicialização e registra no AssetRegistry.
 * O que já foi carregado como PNG substituto não é desenhado de novo —
 * só ganha a sombra calculada a partir do próprio PNG.
 */
import Phaser from 'phaser';
import { ITEM_DEFS } from '../items/ItemCatalog';
import { allDecalSprites } from '../world/DecalCatalog';
import { allPropSprites } from '../world/PropCatalog';
import { TEX } from './AssetKeys';
import { overrideKey } from './AssetOverrides';
import { buildAtlas, type AtlasEntry } from './AtlasBuilder';
import type { AssetRegistry } from './AssetRegistry';
import { makeCanvas, silhouetteShadow } from './procedural/canvas';
import { drawLegsFrame, drawTorsoFrame, PLAYER_FRAMES } from './procedural/characters';
import { DECAL_DRAWERS } from './procedural/decals';
import { drawDust, drawSoftShadow, drawVignette } from './procedural/fx';
import { ITEM_DRAWERS, ITEM_ICON_SIZE } from './procedural/items';
import { drawItemIcon } from './procedural/itemIcons';
import { NATURE_OVERLAY_DRAWERS } from './procedural/nature';
import { PROP_HARVEST, RESOURCE_HARVEST, RESOURCE_SIZE } from '../nature/NatureCatalog';
import { PROP_DEFS, type PropType } from '../world/PropCatalog';
import { PATTERNS } from './procedural/patterns';
import { PROP_DRAWERS, ROOF_PROPS, seedFor } from './procedural/props';
import { drawTileset } from './procedural/tiles';

/** Desfoque da sombra conforme a altura do objeto (objetos altos = sombra mais suave). */
function shadowBlur(height: number): number {
  return Math.max(3, Math.min(9, 2.5 + height * 2.5));
}

export function generateAssets(textures: Phaser.Textures.TextureManager, registry: AssetRegistry): Record<string, number> {
  const timings: Record<string, number> = {};
  let mark = performance.now();
  const lap = (name: string) => {
    const now = performance.now();
    timings[name] = Math.round(now - mark);
    mark = now;
  };
  const entries: AtlasEntry[] = [];
  const missing: string[] = [];

  const drawSprite = (id: string, w: number, h: number, drawers: Record<string, (c: CanvasRenderingContext2D, w: number, h: number, r: ReturnType<typeof seedFor>) => void>): CanvasImageSource | null => {
    const ovr = overrideKey(id);
    if (textures.exists(ovr)) return textures.get(ovr).getSourceImage() as CanvasImageSource;
    const draw = drawers[id];
    if (!draw) {
      missing.push(id);
      return null;
    }
    const { canvas, ctx } = makeCanvas(w, h);
    draw(ctx, w, h, seedFor(id));
    entries.push({ id, canvas });
    return canvas;
  };

  for (const s of allPropSprites()) {
    const src = drawSprite(s.id, s.width, s.height, PROP_DRAWERS);
    if (src && s.shadowHeight > 0) {
      entries.push({ id: `${s.id}#shadow`, canvas: silhouetteShadow(src, s.width, s.height, shadowBlur(s.shadowHeight)) });
    }
  }
  lap('objetos');
  for (const s of allDecalSprites()) drawSprite(s.id, s.width, s.height, DECAL_DRAWERS);
  for (const s of ROOF_PROPS) {
    const src = drawSprite(s.id, s.width, s.height, PROP_DRAWERS);
    if (src) entries.push({ id: `${s.id}#shadow`, canvas: silhouetteShadow(src, s.width, s.height, 3) });
  }

  // Frutos por cima das copas (cheia e "poucos") e montinhos de recurso.
  const overlaySizes = new Map<string, [number, number]>();
  for (const [type, h] of Object.entries(PROP_HARVEST)) {
    if (!h?.overlay) continue;
    const d = PROP_DEFS[type as PropType];
    overlaySizes.set(h.overlay, [d.width, d.height]);
    overlaySizes.set(`${h.overlay}.few`, [d.width, d.height]);
  }
  for (const h of Object.values(RESOURCE_HARVEST)) if (h.sprite) overlaySizes.set(h.sprite, [RESOURCE_SIZE, RESOURCE_SIZE]);
  for (const [id, [w, h]] of overlaySizes) drawSprite(id, w, h, NATURE_OVERLAY_DRAWERS);
  lap('natureza');

  // Ícones dos itens (chão e inventário).
  // Os primeiros ícones foram desenhados à mão (ITEM_DRAWERS); o resto sai das famílias do catálogo.
  const itemDrawers: Record<string, (c: CanvasRenderingContext2D, w: number) => void> = {};
  for (const def of Object.values(ITEM_DEFS)) {
    const hand = ITEM_DRAWERS[def.icon];
    itemDrawers[def.icon] = hand ? (c, w) => hand(c, w) : (c, w) => drawItemIcon(c, w, def.iconSpec);
  }
  for (const def of Object.values(ITEM_DEFS)) drawSprite(def.icon, ITEM_ICON_SIZE, ITEM_ICON_SIZE, itemDrawers);
  lap('itens');

  // Personagem: folhas animadas (a menos que haja spritesheet substituta).
  if (!textures.exists(overrideKey('player.torso'))) {
    for (let i = 0; i < PLAYER_FRAMES; i++) entries.push({ id: `player.torso/${i}`, canvas: drawTorsoFrame(i) });
  }
  if (!textures.exists(overrideKey('player.legs'))) {
    for (let i = 0; i < PLAYER_FRAMES; i++) entries.push({ id: `player.legs/${i}`, canvas: drawLegsFrame(i) });
  }

  lap('decalques+personagem');
  registry.setAtlas(buildAtlas(textures, 'atlas', entries));
  lap('atlas');

  if (!textures.exists(TEX.tiles)) textures.addCanvas(TEX.tiles, drawTileset());
  lap('chão');
  for (const p of PATTERNS) if (!textures.exists(p.key)) textures.addCanvas(p.key, p.draw());
  if (!textures.exists(TEX.shadowSoft)) textures.addCanvas(TEX.shadowSoft, drawSoftShadow(64, 44));
  if (!textures.exists(TEX.dust)) textures.addCanvas(TEX.dust, drawDust(24));
  if (!textures.exists(TEX.vignette)) textures.addCanvas(TEX.vignette, drawVignette(256));

  lap('padrões+efeitos');
  if (missing.length) console.warn('[assets] sem desenho procedural:', missing.join(', '));
  return timings;
}
