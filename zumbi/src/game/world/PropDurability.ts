/**
 * De que cada objeto do mapa é feito, quanto aguenta apanhar e o que rende
 * desmontado (com a ferramenta certa) ou quebrado (menos e pior). Só dados.
 *
 * - `hp`: pontos de resistência (soco ≈ 3; machado ≈ 22 por golpe).
 * - `dismantle`: ferramentas aceitas (qualquer uma das etiquetas), minutos,
 *   o que sai. Ferramenta gasta um pouco a cada desmonte.
 * - `debris`: o que sobra se for destruído na pancada.
 * - `cut`/`mine`: árvore (machado) e pedra (picareta) — viram recurso.
 * Objeto sem entrada é indestrutível (poste, hidrante, ônibus...).
 */
import type { PropType } from './PropCatalog';

export type Material = 'madeira' | 'metal' | 'vidro' | 'plastico' | 'tecido' | 'pedra' | 'planta' | 'ceramica';

export interface Yield {
  item: string;
  n: number;
}

export interface PropDurability {
  hp: number;
  material: Material;
  /** Nome curto ("cadeira"). */
  name: string;
  dismantle?: { tools: readonly string[]; minutes: number; yields: readonly Yield[]; skill?: string };
  debris?: readonly Yield[];
  /** Árvore: cortar com machado. */
  cut?: { minutes: number; yields: readonly Yield[] };
  /** Pedra: quebrar com picareta. */
  mine?: { minutes: number; yields: readonly Yield[] };
  /** Pode ser carregado (móvel leve/médio): peso em kg. */
  carry?: number;
}

const HAMMER = ['martelar', 'desmontar', 'alavanca'] as const;
const SCREW = ['parafusar', 'desmontar', 'chave'] as const;
const y = (item: string, n: number): Yield => ({ item, n });

const TREE_BIG = { minutes: 45, yields: [y('tora', 2), y('galho', 4), y('lenha', 2)] };
const TREE_SMALL = { minutes: 25, yields: [y('tora', 1), y('galho', 3)] };
const TREE_FRUIT = { minutes: 30, yields: [y('tora', 1), y('galho', 3), y('lenha', 1)] };

export const PROP_DURABILITY: Partial<Record<PropType, PropDurability>> = {
  // ---------------------------------------------------------------- móveis de madeira
  chair: { hp: 25, material: 'madeira', name: 'cadeira', carry: 5, dismantle: { tools: HAMMER, minutes: 10, yields: [y('tabua', 1), y('pregos', 3)], skill: 'carpintaria' }, debris: [y('lenha', 1)] },
  diningTable: { hp: 60, material: 'madeira', name: 'mesa', carry: 18, dismantle: { tools: HAMMER, minutes: 20, yields: [y('tabua', 3), y('pregos', 6)], skill: 'carpintaria' }, debris: [y('lenha', 2)] },
  coffeeTable: { hp: 35, material: 'madeira', name: 'mesinha', carry: 8, dismantle: { tools: HAMMER, minutes: 12, yields: [y('tabua', 1), y('pregos', 4)], skill: 'carpintaria' }, debris: [y('lenha', 1)] },
  desk: { hp: 55, material: 'madeira', name: 'escrivaninha', carry: 20, dismantle: { tools: HAMMER, minutes: 20, yields: [y('tabua', 3), y('pregos', 5), y('parafusos', 4)], skill: 'carpintaria' }, debris: [y('lenha', 2)] },
  nightstand: { hp: 30, material: 'madeira', name: 'criado-mudo', carry: 7, dismantle: { tools: HAMMER, minutes: 10, yields: [y('tabua', 1), y('pregos', 3)], skill: 'carpintaria' }, debris: [y('lenha', 1)] },
  wardrobe: { hp: 90, material: 'madeira', name: 'guarda-roupa', dismantle: { tools: HAMMER, minutes: 30, yields: [y('tabua', 4), y('pregos', 8), y('dobradica', 2)], skill: 'carpintaria' }, debris: [y('lenha', 3)] },
  cabinet: { hp: 45, material: 'madeira', name: 'armário', carry: 15, dismantle: { tools: HAMMER, minutes: 15, yields: [y('tabua', 2), y('pregos', 4), y('dobradica', 1)], skill: 'carpintaria' }, debris: [y('lenha', 1)] },
  tvStand: { hp: 40, material: 'madeira', name: 'rack', carry: 12, dismantle: { tools: HAMMER, minutes: 15, yields: [y('tabua', 2), y('parafusos', 4)], skill: 'carpintaria' }, debris: [y('lenha', 1)] },
  bedSingle: { hp: 70, material: 'madeira', name: 'cama', dismantle: { tools: HAMMER, minutes: 25, yields: [y('tabua', 3), y('pregos', 6), y('tecido', 2)], skill: 'carpintaria' }, debris: [y('lenha', 2), y('trapo', 2)] },
  bedDouble: { hp: 90, material: 'madeira', name: 'cama de casal', dismantle: { tools: HAMMER, minutes: 35, yields: [y('tabua', 5), y('pregos', 8), y('tecido', 3)], skill: 'carpintaria' }, debris: [y('lenha', 3), y('trapo', 3)] },
  sofa: { hp: 60, material: 'tecido', name: 'sofá', dismantle: { tools: [...HAMMER, 'cortar'], minutes: 25, yields: [y('tabua', 2), y('tecido', 4), y('pregos', 4)], skill: 'carpintaria' }, debris: [y('trapo', 3)] },
  armchair: { hp: 40, material: 'tecido', name: 'poltrona', carry: 14, dismantle: { tools: [...HAMMER, 'cortar'], minutes: 15, yields: [y('tabua', 1), y('tecido', 2), y('pregos', 2)], skill: 'carpintaria' }, debris: [y('trapo', 2)] },
  kitchenCounter: { hp: 90, material: 'madeira', name: 'balcão', dismantle: { tools: HAMMER, minutes: 30, yields: [y('tabua', 3), y('parafusos', 6), y('pregos', 4)], skill: 'carpintaria' }, debris: [y('lenha', 2)] },
  crate: { hp: 30, material: 'madeira', name: 'caixote', carry: 6, dismantle: { tools: HAMMER, minutes: 8, yields: [y('tabua', 2), y('pregos', 4)], skill: 'carpintaria' }, debris: [y('lenha', 1)] },
  pallet: { hp: 40, material: 'madeira', name: 'palete', carry: 15, dismantle: { tools: HAMMER, minutes: 15, yields: [y('tabua', 3), y('pregos', 6)], skill: 'carpintaria' }, debris: [y('lenha', 2)] },
  bench: { hp: 60, material: 'madeira', name: 'banco', dismantle: { tools: [...HAMMER, ...SCREW], minutes: 20, yields: [y('tabua', 3), y('parafusos', 6)], skill: 'carpintaria' }, debris: [y('lenha', 2)] },
  workbench: { hp: 110, material: 'madeira', name: 'bancada', dismantle: { tools: HAMMER, minutes: 35, yields: [y('tabua', 4), y('pregos', 8), y('parafusos', 4)], skill: 'carpintaria' }, debris: [y('lenha', 3)] },
  box: { hp: 8, material: 'plastico', name: 'caixa', carry: 2, debris: [] },
  boxes: { hp: 20, material: 'plastico', name: 'caixas', debris: [] },
  // ---------------------------------------------------------------- metal e eletrodomésticos
  storeShelf: { hp: 140, material: 'metal', name: 'prateleira', dismantle: { tools: SCREW, minutes: 30, yields: [y('chapaMetal', 2), y('parafusos', 10), y('sucata', 2)] }, debris: [y('sucata', 3)] },
  toolShelf: { hp: 100, material: 'metal', name: 'estante', dismantle: { tools: SCREW, minutes: 20, yields: [y('chapaMetal', 1), y('parafusos', 8), y('sucata', 2)] }, debris: [y('sucata', 2)] },
  fridge: { hp: 150, material: 'metal', name: 'geladeira', dismantle: { tools: SCREW, minutes: 40, yields: [y('sucata', 5), y('chapaMetal', 1), y('componentes', 2), y('fioEletrico', 1)], skill: 'eletronica' }, debris: [y('sucata', 3)] },
  displayFridge: { hp: 150, material: 'metal', name: 'geladeira de bebidas', dismantle: { tools: SCREW, minutes: 45, yields: [y('sucata', 5), y('vidroPlaca', 1), y('componentes', 3), y('fioEletrico', 1)], skill: 'eletronica' }, debris: [y('sucata', 3), y('cacoVidro', 4)] },
  stove: { hp: 130, material: 'metal', name: 'fogão', dismantle: { tools: SCREW, minutes: 35, yields: [y('sucata', 5), y('chapaMetal', 1), y('parafusos', 6)] }, debris: [y('sucata', 3)] },
  checkout: { hp: 90, material: 'metal', name: 'caixa do mercado', dismantle: { tools: SCREW, minutes: 25, yields: [y('sucata', 3), y('componentes', 2), y('fioEletrico', 1)], skill: 'eletronica' }, debris: [y('sucata', 2)] },
  cart: { hp: 50, material: 'metal', name: 'carrinho', carry: 12, dismantle: { tools: SCREW, minutes: 10, yields: [y('sucata', 3), y('borracha', 1)] }, debris: [y('sucata', 2)] },
  drum: { hp: 90, material: 'metal', name: 'tambor', dismantle: { tools: ['serrar-metal', 'demolir'], minutes: 20, yields: [y('chapaMetal', 1), y('sucata', 2)] }, debris: [y('sucata', 2)] },
  trashCan: { hp: 25, material: 'plastico', name: 'lixeira', carry: 4, debris: [] },
  dumpster: { hp: 220, material: 'metal', name: 'caçamba', dismantle: { tools: ['serrar-metal'], minutes: 60, yields: [y('chapaMetal', 3), y('sucata', 4)] }, debris: [y('sucata', 3)] },
  bathSink: { hp: 60, material: 'ceramica', name: 'pia', debris: [y('cacoVidro', 2)] },
  toilet: { hp: 60, material: 'ceramica', name: 'vaso', debris: [] },
  scrapPile: { hp: 200, material: 'metal', name: 'sucata', dismantle: { tools: ['alavanca', 'chave', 'desmontar'], minutes: 30, yields: [y('sucata', 6), y('pecasMotor', 1), y('arame', 1)], skill: 'mecanica' }, debris: [] },
  tire: { hp: 40, material: 'plastico', name: 'pneu', debris: [y('borracha', 2)] },
  tireStack: { hp: 80, material: 'plastico', name: 'pneus', debris: [y('borracha', 4)] },
  barricade: { hp: 80, material: 'madeira', name: 'cavalete', dismantle: { tools: HAMMER, minutes: 15, yields: [y('tabua', 2), y('pregos', 4)] }, debris: [y('lenha', 1)] },
  cone: { hp: 6, material: 'plastico', name: 'cone', carry: 1, debris: [] },
  // ---------------------------------------------------------------- expansão do mapa
  dresser: { hp: 65, material: 'madeira', name: 'cômoda', carry: 25, dismantle: { tools: HAMMER, minutes: 20, yields: [y('tabua', 3), y('pregos', 6), y('parafusos', 4)], skill: 'carpintaria' }, debris: [y('lenha', 2)] },
  bookshelf: { hp: 60, material: 'madeira', name: 'estante', carry: 22, dismantle: { tools: HAMMER, minutes: 18, yields: [y('tabua', 3), y('pregos', 6)], skill: 'carpintaria' }, debris: [y('lenha', 2)] },
  bunkBed: { hp: 90, material: 'madeira', name: 'beliche', dismantle: { tools: HAMMER, minutes: 35, yields: [y('tabua', 5), y('pregos', 8), y('tecido', 2)], skill: 'carpintaria' }, debris: [y('lenha', 3), y('trapo', 2)] },
  crib: { hp: 40, material: 'madeira', name: 'berço', carry: 12, dismantle: { tools: HAMMER, minutes: 15, yields: [y('tabua', 2), y('parafusos', 6), y('tecido', 1)], skill: 'carpintaria' }, debris: [y('lenha', 1)] },
  washer: { hp: 140, material: 'metal', name: 'máquina de lavar', dismantle: { tools: SCREW, minutes: 35, yields: [y('sucata', 4), y('chapaMetal', 1), y('mangueira', 1), y('componentes', 2), y('fioEletrico', 1)], skill: 'eletronica' }, debris: [y('sucata', 3)] },
  laundrySink: { hp: 90, material: 'ceramica', name: 'tanque', debris: [y('pedraLasca', 2)] },
  shoeRack: { hp: 25, material: 'madeira', name: 'sapateira', carry: 6, dismantle: { tools: HAMMER, minutes: 8, yields: [y('tabua', 1), y('pregos', 3)], skill: 'carpintaria' }, debris: [y('lenha', 1)] },
  chest: { hp: 50, material: 'madeira', name: 'baú', carry: 15, dismantle: { tools: HAMMER, minutes: 15, yields: [y('tabua', 2), y('pregos', 4), y('dobradica', 2)], skill: 'carpintaria' }, debris: [y('lenha', 1)] },
  plantPot: { hp: 15, material: 'ceramica', name: 'vaso de planta', carry: 6, debris: [y('folhas', 1)] },
  freezer: { hp: 150, material: 'metal', name: 'freezer', dismantle: { tools: SCREW, minutes: 40, yields: [y('sucata', 5), y('chapaMetal', 1), y('componentes', 2), y('fioEletrico', 1)], skill: 'eletronica' }, debris: [y('sucata', 3)] },
  ironingBoard: { hp: 20, material: 'metal', name: 'tábua de passar', carry: 4, dismantle: { tools: SCREW, minutes: 6, yields: [y('sucata', 1), y('tecido', 1)] }, debris: [y('sucata', 1)] },
  gondola: { hp: 150, material: 'metal', name: 'gôndola', dismantle: { tools: SCREW, minutes: 35, yields: [y('chapaMetal', 2), y('parafusos', 12), y('sucata', 2)] }, debris: [y('sucata', 3)] },
  bakeryCounter: { hp: 90, material: 'vidro', name: 'vitrine', dismantle: { tools: SCREW, minutes: 25, yields: [y('vidroPlaca', 1), y('sucata', 2), y('parafusos', 6)] }, debris: [y('cacoVidro', 5), y('sucata', 1)] },
  clothesRack: { hp: 40, material: 'metal', name: 'arara', carry: 8, dismantle: { tools: SCREW, minutes: 8, yields: [y('cano', 1), y('parafusos', 4)] }, debris: [y('sucata', 1)] },
  mannequin: { hp: 25, material: 'plastico', name: 'manequim', carry: 7, debris: [] },
  vending: { hp: 170, material: 'metal', name: 'máquina de venda', dismantle: { tools: SCREW, minutes: 40, yields: [y('sucata', 4), y('vidroPlaca', 1), y('componentes', 3), y('fioEletrico', 1)], skill: 'eletronica' }, debris: [y('sucata', 3), y('cacoVidro', 3)] },
  barCounter: { hp: 100, material: 'madeira', name: 'balcão', dismantle: { tools: HAMMER, minutes: 30, yields: [y('tabua', 4), y('pregos', 8)], skill: 'carpintaria' }, debris: [y('lenha', 3)] },
  shopCounter: { hp: 90, material: 'madeira', name: 'balcão', dismantle: { tools: HAMMER, minutes: 25, yields: [y('tabua', 3), y('parafusos', 6)], skill: 'carpintaria' }, debris: [y('lenha', 2)] },
  palletRack: { hp: 200, material: 'metal', name: 'porta-paletes', dismantle: { tools: SCREW, minutes: 45, yields: [y('barraFerro', 2), y('parafusos', 12), y('sucata', 3)] }, debris: [y('sucata', 4)] },
  lathe: { hp: 220, material: 'metal', name: 'torno', dismantle: { tools: SCREW, minutes: 60, yields: [y('sucata', 6), y('pecasMotor', 1), y('componentes', 2), y('fioEletrico', 1)], skill: 'mecanica' }, debris: [y('sucata', 4)] },
  compressor: { hp: 120, material: 'metal', name: 'compressor', dismantle: { tools: SCREW, minutes: 30, yields: [y('sucata', 3), y('mangueira', 1), y('pecasMotor', 1), y('fioEletrico', 1)], skill: 'mecanica' }, debris: [y('sucata', 2)] },
  welder: { hp: 90, material: 'metal', name: 'máquina de solda', carry: 20, dismantle: { tools: SCREW, minutes: 25, yields: [y('fioEletrico', 2), y('componentes', 3), y('sucata', 2)], skill: 'eletronica' }, debris: [y('sucata', 2)] },
  toolbox: { hp: 80, material: 'metal', name: 'caixa de ferramentas', dismantle: { tools: SCREW, minutes: 15, yields: [y('chapaMetal', 1), y('sucata', 2), y('parafusos', 6)] }, debris: [y('sucata', 2)] },
  locker: { hp: 110, material: 'metal', name: 'armário de metal', dismantle: { tools: SCREW, minutes: 25, yields: [y('chapaMetal', 2), y('parafusos', 8), y('dobradica', 2)] }, debris: [y('sucata', 3)] },
  fileCabinet: { hp: 90, material: 'metal', name: 'arquivo', carry: 30, dismantle: { tools: SCREW, minutes: 20, yields: [y('chapaMetal', 1), y('parafusos', 6), y('sucata', 1)] }, debris: [y('sucata', 2)] },
  schoolDesk: { hp: 30, material: 'madeira', name: 'carteira', carry: 7, dismantle: { tools: [...HAMMER, ...SCREW], minutes: 8, yields: [y('tabua', 1), y('cano', 1), y('parafusos', 4)] }, debris: [y('lenha', 1)] },
  blackboard: { hp: 45, material: 'madeira', name: 'lousa', dismantle: { tools: HAMMER, minutes: 12, yields: [y('tabua', 2), y('pregos', 4)] }, debris: [y('lenha', 1)] },
  pew: { hp: 80, material: 'madeira', name: 'banco de igreja', dismantle: { tools: HAMMER, minutes: 25, yields: [y('tabua', 4), y('pregos', 8)], skill: 'carpintaria' }, debris: [y('lenha', 3)] },
  altar: { hp: 120, material: 'madeira', name: 'altar', dismantle: { tools: HAMMER, minutes: 30, yields: [y('tabua', 4), y('tecido', 2), y('pregos', 6)], skill: 'carpintaria' }, debris: [y('lenha', 3)] },
  stretcher: { hp: 70, material: 'metal', name: 'maca', dismantle: { tools: SCREW, minutes: 20, yields: [y('cano', 2), y('tecido', 2), y('parafusos', 6), y('borracha', 1)] }, debris: [y('sucata', 2)] },
  medCabinet: { hp: 70, material: 'vidro', name: 'armário de remédios', dismantle: { tools: SCREW, minutes: 15, yields: [y('vidroPlaca', 1), y('chapaMetal', 1), y('parafusos', 6)] }, debris: [y('cacoVidro', 4), y('sucata', 1)] },
  treadmill: { hp: 130, material: 'metal', name: 'esteira', dismantle: { tools: SCREW, minutes: 35, yields: [y('sucata', 4), y('borracha', 2), y('componentes', 2), y('fioEletrico', 1)], skill: 'eletronica' }, debris: [y('sucata', 3)] },
  weightBench: { hp: 90, material: 'metal', name: 'supino', dismantle: { tools: SCREW, minutes: 20, yields: [y('barraFerro', 1), y('cano', 1), y('parafusos', 6), y('tecido', 1)] }, debris: [y('sucata', 2)] },
  dumbbellRack: { hp: 140, material: 'metal', name: 'suporte de halteres', dismantle: { tools: SCREW, minutes: 20, yields: [y('barraFerro', 2), y('sucata', 3)] }, debris: [y('sucata', 3)] },
  floorLamp: { hp: 20, material: 'metal', name: 'abajur', carry: 4, dismantle: { tools: SCREW, minutes: 6, yields: [y('lampada', 1), y('fioEletrico', 1), y('sucata', 1)] }, debris: [y('cacoVidro', 1)] },
  stool: { hp: 18, material: 'madeira', name: 'banquinho', carry: 3, dismantle: { tools: HAMMER, minutes: 5, yields: [y('tabua', 1), y('pregos', 2)] }, debris: [y('lenha', 1)] },
  sideTable: { hp: 25, material: 'madeira', name: 'mesinha', carry: 6, dismantle: { tools: HAMMER, minutes: 8, yields: [y('tabua', 1), y('pregos', 3)] }, debris: [y('lenha', 1)] },
  laundryBasket: { hp: 10, material: 'plastico', name: 'cesto', carry: 2, debris: [] },
  wallShelf: { hp: 25, material: 'madeira', name: 'prateleira', carry: 6, dismantle: { tools: [...HAMMER, ...SCREW], minutes: 6, yields: [y('tabua', 1), y('parafusos', 4)] }, debris: [y('lenha', 1)] },
  coatRack: { hp: 20, material: 'madeira', name: 'cabideiro', carry: 5, dismantle: { tools: HAMMER, minutes: 5, yields: [y('tabua', 1), y('pregos', 2)] }, debris: [y('lenha', 1)] },
  toyBox: { hp: 15, material: 'plastico', name: 'caixa de brinquedos', carry: 4, debris: [] },
  grill: { hp: 80, material: 'metal', name: 'churrasqueira', carry: 18, dismantle: { tools: SCREW, minutes: 12, yields: [y('chapaMetal', 1), y('sucata', 2), y('arame', 1)] }, debris: [y('sucata', 2)] },
  waterTank: { hp: 90, material: 'plastico', name: "caixa d'água", debris: [y('borracha', 1)] },
  doghouse: { hp: 40, material: 'madeira', name: 'casinha de cachorro', carry: 14, dismantle: { tools: HAMMER, minutes: 12, yields: [y('tabua', 3), y('pregos', 6)], skill: 'carpintaria' }, debris: [y('lenha', 2)] },
  bicycle: { hp: 45, material: 'metal', name: 'bicicleta', carry: 12, dismantle: { tools: SCREW, minutes: 15, yields: [y('cano', 1), y('borracha', 2), y('corrente', 1), y('sucata', 1)] }, debris: [y('sucata', 1)] },
  busStop: { hp: 160, material: 'metal', name: 'ponto de ônibus', dismantle: { tools: SCREW, minutes: 35, yields: [y('chapaMetal', 1), y('vidroPlaca', 1), y('parafusos', 8), y('cano', 2)] }, debris: [y('cacoVidro', 4), y('sucata', 2)] },
  newsstand: { hp: 150, material: 'metal', name: 'banca de jornal', dismantle: { tools: SCREW, minutes: 40, yields: [y('chapaMetal', 3), y('parafusos', 10)] }, debris: [y('sucata', 3)] },
  // ---------------------------------------------------------------- natureza
  treeLarge: { hp: 400, material: 'planta', name: 'árvore', cut: TREE_BIG },
  treeSmall: { hp: 200, material: 'planta', name: 'árvore', cut: TREE_SMALL },
  treeBroad: { hp: 380, material: 'planta', name: 'árvore', cut: TREE_BIG },
  treeYoung: { hp: 90, material: 'planta', name: 'árvore nova', cut: { minutes: 12, yields: [y('galho', 3), y('lenha', 1)] } },
  treePine: { hp: 300, material: 'planta', name: 'pinheiro', cut: TREE_BIG },
  treeDead: { hp: 150, material: 'planta', name: 'árvore seca', cut: { minutes: 20, yields: [y('lenha', 4), y('galho', 4)] } },
  treePalm: { hp: 220, material: 'planta', name: 'palmeira', cut: TREE_SMALL },
  treeApple: { hp: 220, material: 'planta', name: 'macieira', cut: TREE_FRUIT },
  treeOrange: { hp: 220, material: 'planta', name: 'laranjeira', cut: TREE_FRUIT },
  treeMango: { hp: 350, material: 'planta', name: 'mangueira', cut: TREE_BIG },
  treeLemon: { hp: 180, material: 'planta', name: 'limoeiro', cut: TREE_FRUIT },
  treeGuava: { hp: 200, material: 'planta', name: 'goiabeira', cut: TREE_FRUIT },
  treeAvocado: { hp: 330, material: 'planta', name: 'abacateiro', cut: TREE_BIG },
  treeJabuticaba: { hp: 220, material: 'planta', name: 'jabuticabeira', cut: TREE_FRUIT },
  treeBanana: { hp: 80, material: 'planta', name: 'bananeira', cut: { minutes: 10, yields: [y('capim', 4)] } },
  bush: { hp: 40, material: 'planta', name: 'arbusto', cut: { minutes: 8, yields: [y('galho', 2), y('folhas', 3)] } },
  bushBerry: { hp: 40, material: 'planta', name: 'arbusto', cut: { minutes: 8, yields: [y('galho', 2), y('folhas', 3)] } },
  bushFlower: { hp: 35, material: 'planta', name: 'arbusto', cut: { minutes: 8, yields: [y('galho', 1), y('folhas', 3)] } },
  bushRound: { hp: 35, material: 'planta', name: 'arbusto', cut: { minutes: 8, yields: [y('galho', 1), y('folhas', 3)] } },
  hedge: { hp: 80, material: 'planta', name: 'cerca viva', cut: { minutes: 15, yields: [y('galho', 3), y('folhas', 4)] } },
  stump: { hp: 120, material: 'planta', name: 'toco', cut: { minutes: 20, yields: [y('lenha', 2)] } },
  fallenLog: { hp: 150, material: 'planta', name: 'tronco caído', cut: { minutes: 25, yields: [y('tora', 1), y('lenha', 2)] } },
  rock: { hp: 300, material: 'pedra', name: 'pedra', mine: { minutes: 30, yields: [y('pedra', 4), y('pedraLasca', 3)] } },
};

/** Barulho de uma pancada por material (px). */
export const IMPACT_NOISE: Record<Material, number> = { madeira: 320, metal: 460, vidro: 520, plastico: 200, tecido: 120, pedra: 380, planta: 220, ceramica: 360 };
