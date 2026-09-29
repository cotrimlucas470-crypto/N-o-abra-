/**
 * RECIPIENTES: que objetos do mapa guardam coisas, com que nome, capacidade
 * e por onde se acessa. Um carro tem dois (porta-luvas e porta-malas).
 *
 * Objeto novo que guarda coisas = uma linha em PROP_CONTAINERS.
 */
import type { PropType } from '../world/PropCatalog';
import type { ContainerDef, ContainerKind } from './LootTypes';

export const CONTAINER_DEFS: Record<ContainerKind, ContainerDef> = {
  construido: { name: 'Móvel', capacity: 30, verb: 'ABRIR' },
  corpo: { name: 'Corpo', capacity: 25, verb: 'REVISTAR' },
  geladeira: { name: 'Geladeira', capacity: 30, verb: 'ABRIR' },
  fogao: { name: 'Forno', capacity: 12, verb: 'ABRIR' },
  armarioCozinha: { name: 'Armário da cozinha', capacity: 30, verb: 'ABRIR' },
  armario: { name: 'Armário', capacity: 25, verb: 'ABRIR' },
  guardaRoupa: { name: 'Guarda-roupa', capacity: 40, verb: 'ABRIR' },
  criadoMudo: { name: 'Gaveta', capacity: 6, verb: 'ABRIR' },
  armarioBanheiro: { name: 'Armário do banheiro', capacity: 8, verb: 'ABRIR' },
  escrivaninha: { name: 'Gavetas da mesa', capacity: 10, verb: 'ABRIR' },
  rack: { name: 'Rack', capacity: 12, verb: 'ABRIR' },
  prateleira: { name: 'Prateleira', capacity: 60, verb: 'VASCULHAR' },
  geladeiraVitrine: { name: 'Geladeira de bebidas', capacity: 50, verb: 'ABRIR' },
  caixaRegistradora: { name: 'Caixa registradora', capacity: 5, verb: 'ABRIR' },
  prateleiraFerramentas: { name: 'Prateleira de ferramentas', capacity: 50, verb: 'VASCULHAR' },
  bancada: { name: 'Bancada', capacity: 25, verb: 'VASCULHAR' },
  caixote: { name: 'Caixote', capacity: 25, verb: 'ABRIR' },
  caixas: { name: 'Caixas', capacity: 35, verb: 'VASCULHAR' },
  caixa: { name: 'Caixa de papelão', capacity: 12, verb: 'ABRIR' },
  cacamba: { name: 'Caçamba de lixo', capacity: 80, verb: 'REVIRAR' },
  lixeira: { name: 'Lixeira', capacity: 10, verb: 'REVIRAR' },
  sacoLixo: { name: 'Sacos de lixo', capacity: 15, verb: 'REVIRAR' },
  portaLuvas: { name: 'Porta-luvas', capacity: 3, verb: 'ABRIR' },
  portaMalas: { name: 'Porta-malas', capacity: 60, verb: 'ABRIR' },
  bancoCarro: { name: 'Banco do carro', capacity: 20, verb: 'VASCULHAR' },
  tambor: { name: 'Tambor', capacity: 40, verb: 'VASCULHAR' },
  comoda: { name: 'Cômoda', capacity: 30, verb: 'ABRIR' },
  estanteLivros: { name: 'Estante', capacity: 25, verb: 'VASCULHAR' },
  maquinaLavar: { name: 'Máquina de lavar', capacity: 12, verb: 'ABRIR' },
  sapateira: { name: 'Sapateira', capacity: 12, verb: 'ABRIR' },
  bau: { name: 'Baú', capacity: 40, verb: 'ABRIR' },
  freezer: { name: 'Freezer', capacity: 45, verb: 'ABRIR' },
  vitrine: { name: 'Vitrine', capacity: 20, verb: 'ABRIR' },
  arara: { name: 'Arara de roupas', capacity: 30, verb: 'VASCULHAR' },
  manequim: { name: 'Manequim', capacity: 6, verb: 'VASCULHAR' },
  maquinaVenda: { name: 'Máquina de venda', capacity: 20, verb: 'ABRIR' },
  balcao: { name: 'Balcão', capacity: 25, verb: 'ABRIR' },
  portaPaletes: { name: 'Porta-paletes', capacity: 150, verb: 'VASCULHAR' },
  caixaFerramentas: { name: 'Caixa de ferramentas', capacity: 20, verb: 'ABRIR' },
  armarioMetal: { name: 'Armário de metal', capacity: 30, verb: 'ABRIR' },
  arquivo: { name: 'Arquivo', capacity: 15, verb: 'ABRIR' },
  conteiner: { name: 'Contêiner', capacity: 250, verb: 'ABRIR' },
  carteiraEscolar: { name: 'Carteira', capacity: 4, verb: 'ABRIR' },
  altar: { name: 'Altar', capacity: 10, verb: 'VASCULHAR' },
  armarioRemedios: { name: 'Armário de remédios', capacity: 20, verb: 'ABRIR' },
  cesto: { name: 'Cesto de roupa', capacity: 8, verb: 'REVIRAR' },
  cabideiro: { name: 'Cabideiro', capacity: 10, verb: 'VASCULHAR' },
  brinquedos: { name: 'Caixa de brinquedos', capacity: 8, verb: 'ABRIR' },
  banca: { name: 'Banca de jornal', capacity: 20, verb: 'VASCULHAR' },
  churrasqueira: { name: 'Churrasqueira', capacity: 6, verb: 'ABRIR' },
  chao: { name: 'Chão', capacity: 999, verb: 'PEGAR' },
};

export interface PropContainerSlot {
  kind: ContainerKind;
  /** Sufixo do id do recipiente quando o objeto tem mais de um. */
  slot?: string;
  /**
   * Ponto de acesso no referencial do DESENHO (px; antes de girar). Sem ele, o
   * acesso é a borda do objeto (a partir de qualquer lado).
   */
  at?: readonly [number, number];
}

export const PROP_CONTAINERS: Partial<Record<PropType, readonly PropContainerSlot[]>> = {
  fridge: [{ kind: 'geladeira' }],
  stove: [{ kind: 'fogao' }],
  kitchenCounter: [{ kind: 'armarioCozinha' }],
  cabinet: [{ kind: 'armario' }],
  wardrobe: [{ kind: 'guardaRoupa' }],
  nightstand: [{ kind: 'criadoMudo' }],
  bathSink: [{ kind: 'armarioBanheiro' }],
  desk: [{ kind: 'escrivaninha' }],
  tvStand: [{ kind: 'rack' }],
  storeShelf: [{ kind: 'prateleira' }],
  displayFridge: [{ kind: 'geladeiraVitrine' }],
  checkout: [{ kind: 'caixaRegistradora' }],
  toolShelf: [{ kind: 'prateleiraFerramentas' }],
  workbench: [{ kind: 'bancada' }],
  crate: [{ kind: 'caixote' }],
  boxes: [{ kind: 'caixas' }],
  box: [{ kind: 'caixa' }],
  dumpster: [{ kind: 'cacamba' }],
  trashCan: [{ kind: 'lixeira' }],
  trashBags: [{ kind: 'sacoLixo' }],
  drum: [{ kind: 'tambor' }],
  dresser: [{ kind: 'comoda' }],
  bookshelf: [{ kind: 'estanteLivros' }],
  washer: [{ kind: 'maquinaLavar' }],
  shoeRack: [{ kind: 'sapateira' }],
  chest: [{ kind: 'bau' }],
  freezer: [{ kind: 'freezer' }],
  gondola: [{ kind: 'prateleira' }],
  bakeryCounter: [{ kind: 'vitrine' }],
  clothesRack: [{ kind: 'arara' }],
  mannequin: [{ kind: 'manequim' }],
  vending: [{ kind: 'maquinaVenda' }],
  barCounter: [{ kind: 'balcao' }],
  shopCounter: [{ kind: 'balcao' }],
  palletRack: [{ kind: 'portaPaletes' }],
  toolbox: [{ kind: 'caixaFerramentas' }],
  locker: [{ kind: 'armarioMetal' }],
  fileCabinet: [{ kind: 'arquivo' }],
  cargoContainer: [{ kind: 'conteiner' }],
  schoolDesk: [{ kind: 'carteiraEscolar' }],
  altar: [{ kind: 'altar' }],
  medCabinet: [{ kind: 'armarioRemedios' }],
  sideTable: [{ kind: 'criadoMudo' }],
  wallShelf: [{ kind: 'prateleira' }],
  laundryBasket: [{ kind: 'cesto' }],
  coatRack: [{ kind: 'cabideiro' }],
  toyBox: [{ kind: 'brinquedos' }],
  newsstand: [{ kind: 'banca' }],
  grill: [{ kind: 'churrasqueira' }],
  // Carros "olham" para +x: porta-malas atrás (-x), porta do motorista à esquerda (-y).
  // Bancos: acesso pela porta aberta ou vidro quebrado (vehicles/Vehicles.ts decide).
  car: [
    { kind: 'portaLuvas', slot: 'luvas', at: [14, -48] },
    { kind: 'portaMalas', slot: 'malas', at: [-96, 0] },
    { kind: 'bancoCarro', slot: 'bancoF', at: [20, -48] },
    { kind: 'bancoCarro', slot: 'bancoT', at: [-30, -48] },
  ],
  van: [
    { kind: 'portaLuvas', slot: 'luvas', at: [44, -54] },
    { kind: 'portaMalas', slot: 'malas', at: [-115, 0] },
    { kind: 'bancoCarro', slot: 'bancoF', at: [60, -54] },
    { kind: 'bancoCarro', slot: 'bancoT', at: [0, 54] },
  ],
  carWreck: [
    { kind: 'portaMalas', slot: 'malas', at: [-96, 0] },
    { kind: 'bancoCarro', slot: 'bancoF', at: [20, -48] },
  ],
};
