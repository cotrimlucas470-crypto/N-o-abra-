/**
 * Catálogo de objetos do mundo. Uma entrada = um tipo de objeto.
 *
 * - `sprites`: ids visuais (variações). O desenho procedural de cada id
 *   está em assets/procedural/props.ts; um PNG em assets/overrides.json
 *   substitui o desenho sem mexer aqui.
 * - `width/height`: tamanho no mundo (px), orientação natural do desenho.
 *   Carros "olham" para a direita (+x); móveis têm o fundo para cima (norte).
 * - `collider`: forma de colisão no referencial do objeto.
 * - `layer`: floor (pisável, sob o jogador), object (sólido) ou overhead
 *   (acima do jogador: copa de árvore, braço de poste).
 * - `shadowHeight`: altura relativa para a sombra projetada (0 = sem sombra).
 */
export type ColliderDef =
  | { shape: 'none' }
  | { shape: 'rect'; w: number; h: number; ox?: number; oy?: number }
  | { shape: 'circle'; r: number; ox?: number; oy?: number };

export type PropLayer = 'floor' | 'object' | 'overhead';

export interface PropDef {
  sprites: readonly string[];
  width: number;
  height: number;
  collider: ColliderDef;
  layer: PropLayer;
  shadowHeight: number;
  /** Fica translúcido quando o jogador passa por baixo (árvores). */
  fadeWhenNear?: boolean;
}

const rect = (w: number, h: number, ox = 0, oy = 0): ColliderDef => ({ shape: 'rect', w, h, ox, oy });
const circle = (r: number, ox = 0, oy = 0): ColliderDef => ({ shape: 'circle', r, ox, oy });
const none: ColliderDef = { shape: 'none' };

export const PROP_DEFS = {
  // ---------- rua ----------
  car: {
    sprites: ['prop.car.red', 'prop.car.blue', 'prop.car.white', 'prop.car.green', 'prop.car.gray'],
    width: 184, height: 88, collider: rect(176, 80), layer: 'object', shadowHeight: 1.1,
  },
  carWreck: { sprites: ['prop.car.wreck'], width: 184, height: 88, collider: rect(176, 80), layer: 'object', shadowHeight: 1 },
  van: { sprites: ['prop.van'], width: 222, height: 100, collider: rect(214, 94), layer: 'object', shadowHeight: 1.5 },
  bus: { sprites: ['prop.bus'], width: 440, height: 122, collider: rect(432, 114), layer: 'object', shadowHeight: 2 },
  barricade: { sprites: ['prop.barricade'], width: 150, height: 30, collider: rect(146, 20), layer: 'object', shadowHeight: 0.6 },
  concreteBarrier: { sprites: ['prop.barrier'], width: 128, height: 36, collider: rect(126, 32), layer: 'object', shadowHeight: 0.6 },
  cone: { sprites: ['prop.cone'], width: 28, height: 28, collider: circle(9), layer: 'object', shadowHeight: 0.5 },
  lampPost: { sprites: ['prop.lamp'], width: 100, height: 30, collider: circle(8, -36, 0), layer: 'overhead', shadowHeight: 2.6 },
  hydrant: { sprites: ['prop.hydrant'], width: 30, height: 30, collider: circle(11), layer: 'object', shadowHeight: 0.6 },
  trashBags: { sprites: ['prop.trashbags'], width: 66, height: 54, collider: circle(20), layer: 'object', shadowHeight: 0.4 },
  dumpster: { sprites: ['prop.dumpster'], width: 124, height: 72, collider: rect(120, 68), layer: 'object', shadowHeight: 1.1 },
  trashCan: { sprites: ['prop.trashcan'], width: 36, height: 36, collider: circle(15), layer: 'object', shadowHeight: 0.8 },
  bench: { sprites: ['prop.bench'], width: 112, height: 42, collider: rect(106, 30), layer: 'object', shadowHeight: 0.5 },
  tire: { sprites: ['prop.tire'], width: 38, height: 38, collider: circle(15), layer: 'object', shadowHeight: 0.3 },
  tireStack: { sprites: ['prop.tires'], width: 46, height: 46, collider: circle(21), layer: 'object', shadowHeight: 0.9 },
  pallet: { sprites: ['prop.pallet'], width: 78, height: 78, collider: none, layer: 'floor', shadowHeight: 0 },
  crate: { sprites: ['prop.crate'], width: 54, height: 54, collider: rect(52, 52), layer: 'object', shadowHeight: 0.7 },
  box: { sprites: ['prop.box'], width: 42, height: 38, collider: rect(40, 36), layer: 'object', shadowHeight: 0.5 },
  boxes: { sprites: ['prop.boxes'], width: 74, height: 64, collider: rect(70, 60), layer: 'object', shadowHeight: 0.9 },
  drum: { sprites: ['prop.drum'], width: 44, height: 44, collider: circle(20), layer: 'object', shadowHeight: 0.9 },
  cart: { sprites: ['prop.cart'], width: 62, height: 44, collider: rect(58, 40), layer: 'object', shadowHeight: 0.6 },
  treeLarge: {
    sprites: ['prop.tree.large.a', 'prop.tree.large.b'],
    width: 210, height: 210, collider: circle(16), layer: 'overhead', shadowHeight: 2.6, fadeWhenNear: true,
  },
  treeSmall: { sprites: ['prop.tree.small'], width: 140, height: 140, collider: circle(12), layer: 'overhead', shadowHeight: 2, fadeWhenNear: true },
  bush: { sprites: ['prop.bush.a', 'prop.bush.b'], width: 74, height: 64, collider: circle(24), layer: 'object', shadowHeight: 0.6 },
  hedge: { sprites: ['prop.hedge'], width: 128, height: 42, collider: rect(126, 38), layer: 'object', shadowHeight: 0.8 },

  // ---------- interiores ----------
  bedDouble: { sprites: ['prop.bed.double'], width: 128, height: 152, collider: rect(124, 148), layer: 'object', shadowHeight: 0.35 },
  bedSingle: { sprites: ['prop.bed.single'], width: 82, height: 140, collider: rect(78, 136), layer: 'object', shadowHeight: 0.35 },
  sofa: { sprites: ['prop.sofa'], width: 152, height: 62, collider: rect(148, 58), layer: 'object', shadowHeight: 0.4 },
  armchair: { sprites: ['prop.armchair'], width: 66, height: 62, collider: rect(62, 58), layer: 'object', shadowHeight: 0.4 },
  coffeeTable: { sprites: ['prop.coffeetable'], width: 92, height: 52, collider: rect(88, 48), layer: 'object', shadowHeight: 0.3 },
  tvStand: { sprites: ['prop.tv'], width: 124, height: 38, collider: rect(120, 34), layer: 'object', shadowHeight: 0.4 },
  rug: { sprites: ['prop.rug.a', 'prop.rug.b'], width: 176, height: 120, collider: none, layer: 'floor', shadowHeight: 0 },
  diningTable: { sprites: ['prop.diningtable'], width: 150, height: 122, collider: rect(112, 80), layer: 'object', shadowHeight: 0.3 },
  kitchenCounter: { sprites: ['prop.counter'], width: 164, height: 46, collider: rect(162, 44), layer: 'object', shadowHeight: 0.4 },
  fridge: { sprites: ['prop.fridge'], width: 62, height: 58, collider: rect(60, 56), layer: 'object', shadowHeight: 0.9 },
  stove: { sprites: ['prop.stove'], width: 62, height: 56, collider: rect(60, 54), layer: 'object', shadowHeight: 0.4 },
  toilet: { sprites: ['prop.toilet'], width: 40, height: 54, collider: rect(36, 48), layer: 'object', shadowHeight: 0.3 },
  bathtub: { sprites: ['prop.bathtub'], width: 152, height: 74, collider: rect(150, 72), layer: 'object', shadowHeight: 0.3 },
  bathSink: { sprites: ['prop.bathsink'], width: 58, height: 42, collider: rect(56, 40), layer: 'object', shadowHeight: 0.3 },
  wardrobe: { sprites: ['prop.wardrobe'], width: 112, height: 46, collider: rect(110, 44), layer: 'object', shadowHeight: 1 },
  nightstand: { sprites: ['prop.nightstand'], width: 38, height: 36, collider: rect(36, 34), layer: 'object', shadowHeight: 0.4 },
  desk: { sprites: ['prop.desk'], width: 112, height: 58, collider: rect(108, 54), layer: 'object', shadowHeight: 0.4 },
  chair: { sprites: ['prop.chair'], width: 38, height: 38, collider: circle(14), layer: 'object', shadowHeight: 0.3 },
  storeShelf: { sprites: ['prop.shelf.store'], width: 282, height: 54, collider: rect(280, 52), layer: 'object', shadowHeight: 1 },
  checkout: { sprites: ['prop.checkout'], width: 152, height: 58, collider: rect(150, 56), layer: 'object', shadowHeight: 0.5 },
  displayFridge: { sprites: ['prop.fridge.display'], width: 194, height: 58, collider: rect(192, 56), layer: 'object', shadowHeight: 1 },
  workbench: { sprites: ['prop.workbench'], width: 152, height: 54, collider: rect(150, 52), layer: 'object', shadowHeight: 0.5 },
  toolShelf: { sprites: ['prop.toolshelf'], width: 132, height: 42, collider: rect(130, 40), layer: 'object', shadowHeight: 1 },
  cabinet: { sprites: ['prop.cabinet'], width: 52, height: 42, collider: rect(50, 40), layer: 'object', shadowHeight: 0.8 },
} as const satisfies Record<string, PropDef>;

export type PropType = keyof typeof PROP_DEFS;

export function getPropDef(type: PropType): PropDef {
  return PROP_DEFS[type];
}

/** Todos os ids de sprite usados por objetos (o gerador procedural desenha cada um). */
export function allPropSprites(): { id: string; width: number; height: number; shadowHeight: number }[] {
  const out: { id: string; width: number; height: number; shadowHeight: number }[] = [];
  for (const def of Object.values(PROP_DEFS) as PropDef[]) {
    for (const id of def.sprites) out.push({ id, width: def.width, height: def.height, shadowHeight: def.shadowHeight });
  }
  return out;
}
