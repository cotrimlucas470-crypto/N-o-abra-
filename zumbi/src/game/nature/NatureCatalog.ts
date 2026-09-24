/**
 * O que a natureza dá: árvores frutíferas, arbustos de frutinha, galhos que
 * caem, cogumelos que brotam na sombra, pedras soltas.
 *
 * RENOVÁVEL (fruta, galho, cogumelo) volta aos poucos, pelo tempo do jogo —
 * a árvore produz, não "reaparece". FINITO (pedras soltas) acaba.
 * Nada disso depende do jogador estar longe: o relógio é o mesmo para todos.
 */
import type { ResourceType } from '../world/MapTypes';
import type { PropType } from '../world/PropCatalog';

export interface HarvestDef {
  /** Item que dá. */
  item: string;
  /** Quanto cabe (árvore carregada). */
  max: number;
  /** Quanto dá por vez. */
  give: number;
  /**
   * Dias para repor UMA unidade, em múltiplos do ajuste da partida
   * (`nature.fruitRegrowDays`). null = não repõe (acabou, acabou).
   */
  regrow: number | null;
  verb: string;
  /** "Colher maçãs" / "Juntar galhos". */
  label: string;
  /** Camada com os frutos por cima da copa (some ao colher). */
  overlay?: string;
  /** Sprite do montinho (recursos no chão). */
  sprite?: string;
}

export const PROP_HARVEST: Partial<Record<PropType, HarvestDef>> = {
  treeApple: { item: 'maca', max: 10, give: 4, regrow: 1, verb: 'COLHER', label: 'Colher maçãs', overlay: 'fruit.apple' },
  treeOrange: { item: 'laranja', max: 12, give: 4, regrow: 0.8, verb: 'COLHER', label: 'Colher laranjas', overlay: 'fruit.orange' },
  treeMango: { item: 'manga', max: 10, give: 3, regrow: 1, verb: 'COLHER', label: 'Colher mangas', overlay: 'fruit.mango' },
  treeLemon: { item: 'limao', max: 14, give: 5, regrow: 0.7, verb: 'COLHER', label: 'Colher limões', overlay: 'fruit.lemon' },
  treeGuava: { item: 'goiaba', max: 10, give: 4, regrow: 0.9, verb: 'COLHER', label: 'Colher goiabas', overlay: 'fruit.guava' },
  treeAvocado: { item: 'abacate', max: 6, give: 2, regrow: 1.5, verb: 'COLHER', label: 'Colher abacates', overlay: 'fruit.avocado' },
  treeJabuticaba: { item: 'jabuticaba', max: 12, give: 4, regrow: 0.6, verb: 'COLHER', label: 'Colher jabuticabas', overlay: 'fruit.jabuticaba' },
  treeBanana: { item: 'banana', max: 8, give: 4, regrow: 1.2, verb: 'COLHER', label: 'Colher bananas', overlay: 'fruit.banana' },
  bushBerry: { item: 'amora', max: 8, give: 3, regrow: 0.5, verb: 'COLHER', label: 'Colher amoras', overlay: 'fruit.berry' },
  treeDead: { item: 'galho', max: 3, give: 3, regrow: 1.5, verb: 'QUEBRAR', label: 'Quebrar galhos secos' },
};

export const RESOURCE_HARVEST: Record<ResourceType, HarvestDef> = {
  galhos: { item: 'galho', max: 4, give: 4, regrow: 0.8, verb: 'JUNTAR', label: 'Juntar galhos', sprite: 'res.branches' },
  pedras: { item: 'pedra', max: 5, give: 3, regrow: null, verb: 'PEGAR', label: 'Pegar pedras', sprite: 'res.stones' },
  cogumelos: { item: 'cogumeloComestivel', max: 5, give: 5, regrow: 1, verb: 'COLHER', label: 'Colher cogumelos', sprite: 'res.mushrooms' },
  cogumelosVenenosos: { item: 'cogumeloVenenoso', max: 5, give: 5, regrow: 1, verb: 'COLHER', label: 'Colher cogumelos', sprite: 'res.mushrooms.bad' },
};

/** Tamanho em que o montinho aparece no mundo (px). */
export const RESOURCE_SIZE = 56;

export function harvestForProp(type: PropType): HarvestDef | null {
  return PROP_HARVEST[type] ?? null;
}
