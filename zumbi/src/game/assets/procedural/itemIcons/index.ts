/**
 * Registro das famílias de ícone de item. `drawItemIcon` desenha um ícone a
 * partir do `iconSpec` do catálogo; a sombra curta é aplicada no final, sobre
 * a silhueta inteira (sem sombras empilhadas entre as partes).
 */
import type { IconSpec } from '../../../items/ItemTypes';
import { makeCanvas, type Ctx } from '../canvas';
import { ammo, blunt, cutlery, dish, gun, knife, pot, tool } from './gear';
import { bread, cheese, egg, fish, fruit, meat, mushroom, veg } from './foods';
import type { IconDrawer } from './kit';
import { bag, bar, bottle, box_, bucket, can, carton, cup, jar, sack } from './packs';
import { battery, bits, blister, board, book, brick, bulb, candle, chair, coil, device, jewel, kit, log, pill, plank, roll, seeds, sheet, stick, stone, syringe, tube } from './stuff';
import { backpack, cloth, gloves, handbag, hat, jacket, pants, shirt, shoes, towel, vest } from './wear';

export const ICON_FAMILIES: Record<string, IconDrawer> = {
  can,
  bag,
  bar,
  box: box_,
  carton,
  bottle,
  jar,
  cup,
  sack,
  bucket,
  fruit,
  veg,
  meat,
  fish,
  egg,
  cheese,
  bread,
  mushroom,
  tool,
  knife,
  blunt,
  gun,
  ammo,
  pot,
  dish,
  cutlery,
  shirt,
  jacket,
  pants,
  vest,
  shoes,
  gloves,
  hat,
  handbag,
  backpack,
  towel,
  cloth,
  bits,
  coil,
  sheet,
  roll,
  tube,
  brick,
  plank,
  log,
  stick,
  stone,
  blister,
  pill,
  kit,
  syringe,
  device,
  battery,
  board,
  bulb,
  seeds,
  candle,
  chair,
  book,
  jewel,
};

export function hasIconFamily(spec: IconSpec): boolean {
  return !!ICON_FAMILIES[spec.f];
}

/** Desenha o ícone num canvas `s`×`s` já com a sombra curta de "objeto largado". */
export function drawItemIcon(ctx: Ctx, s: number, spec: IconSpec): void {
  const draw = ICON_FAMILIES[spec.f];
  if (!draw) return;
  const { canvas, ctx: tmp } = makeCanvas(s, s);
  draw(tmp, s, spec);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 1.5;
  ctx.shadowOffsetY = 2;
  ctx.drawImage(canvas, 0, 0);
  ctx.restore();
}
