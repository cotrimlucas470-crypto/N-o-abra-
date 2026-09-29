/**
 * ARQUÉTIPOS de prédio (dados + receitas que variam): cada lugar da cidade
 * tem identidade — tamanho, riqueza, como se entra, que cômodos tem e em
 * que arranjo. A receita é sorteada a cada prédio (mesma semente = mesmo
 * prédio), então duas casas "iguais" no arquétipo saem diferentes.
 */
import type { Random } from '../../../core/Random';
import type { BuildingKind, RoofStyle } from '../../MapTypes';
import type { EntranceSpec, LayoutRecipe } from './layout';
import type { RoomKind } from './rooms';

export type Condition = 'conservado' | 'abandonado' | 'saqueado' | 'incendiado' | 'ocupado';

export interface Archetype {
  id: string;
  kind: BuildingKind;
  /** Nome que aparece ao entrar (sorteado; a riqueza escolhe entre os três). */
  names: readonly [string, string, string];
  w: readonly [number, number];
  h: readonly [number, number];
  wealth: readonly [number, number];
  roofs: readonly RoofStyle[];
  entrance: EntranceSpec;
  /** Planta: sorteada conforme tamanho e riqueza. */
  recipe(W: number, H: number, wealth: number, rng: Random): LayoutRecipe;
  openPlan?: number;
  /** Pode ganhar andar de cima (deixa o vão da escada livre). */
  floors?: boolean;
  /** Pesos de conservação (padrão da cidade se faltar). */
  condition?: Partial<Record<Condition, number>>;
}

function shuffle<T>(rng: Random, list: T[]): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list;
}

/** Quantos quartos cabem (área útil do fundo). */
function bedrooms(W: number, H: number, wealth: number, rng: Random): number {
  const area = W * H;
  const base = area < 55 ? 1 : area < 85 ? 2 : area < 130 ? 3 : 4;
  return Math.max(1, Math.min(4, base + (wealth === 2 ? 1 : 0) - (rng.chance(0.3) ? 1 : 0)));
}

const HOUSE_ROOFS: readonly RoofStyle[] = ['shingle-a', 'shingle-b'];

// ---------------------------------------------------------------- moradia

const barraco: Archetype = {
  id: 'barraco',
  kind: 'house',
  names: ['Barraco', 'Casinha', 'Casinha'],
  w: [5, 7],
  h: [4, 6],
  wealth: [0, 0],
  roofs: ['flat', 'shingle-b'],
  entrance: { main: 'single', back: 0.3 },
  recipe: (W, H, _w, rng) => ({ style: 'bands', front: rng.chance(0.5) ? ['Sala'] : ['Sala', 'Cozinha'], back: W * H >= 30 ? ['Quarto', 'Banheiro'] : ['Banheiro'], depth: [0.55, 0.7] }),
  openPlan: 0.7,
  condition: { conservado: 1, abandonado: 2, saqueado: 2, ocupado: 1.5 },
};

const casaSimples: Archetype = {
  id: 'casaSimples',
  kind: 'house',
  names: ['Casa simples', 'Casa', 'Casa'],
  w: [7, 9],
  h: [6, 8],
  wealth: [0, 1],
  roofs: HOUSE_ROOFS,
  entrance: { main: 'single', back: 0.6, side: 0.15 },
  recipe: (W, H, wealth, rng) => {
    const beds = bedrooms(W, H, wealth, rng);
    const back: RoomKind[] = shuffle(rng, [...Array.from({ length: beds }, () => 'Quarto' as RoomKind), 'Banheiro' as RoomKind]);
    const kitchenFront = rng.chance(0.5);
    return { style: 'bands', front: kitchenFront ? ['Sala', 'Cozinha'] : ['Sala'], back: kitchenFront ? back : [...back, 'Cozinha' as RoomKind].slice(0, 4), depth: [0.4, 0.55] };
  },
  openPlan: 0.45,
  floors: true,
};

const casaMadeira: Archetype = {
  id: 'casaMadeira',
  kind: 'house',
  names: ['Casa de madeira', 'Casa de madeira', 'Chalé'],
  w: [7, 10],
  h: [6, 8],
  wealth: [0, 1],
  roofs: ['shingle-b'],
  entrance: { main: 'single', back: 0.5 },
  recipe: (W, H, _w, rng) => ({ style: 'bands', front: ['Sala'], back: shuffle(rng, ['Quarto', 'Cozinha', 'Banheiro', ...(W * H > 60 ? ['Quarto' as RoomKind] : [])]), depth: [0.35, 0.5] }),
  openPlan: 0.3,
  condition: { conservado: 1, abandonado: 2, saqueado: 1.5, incendiado: 0.6 },
};

const casaMedia: Archetype = {
  id: 'casaMedia',
  kind: 'house',
  names: ['Casa', 'Casa', 'Casa de dois quartos'],
  w: [9, 12],
  h: [7, 10],
  wealth: [1, 1],
  roofs: HOUSE_ROOFS,
  entrance: { main: 'single', back: 0.7, side: 0.25, garage: true },
  recipe: (W, H, wealth, rng) => {
    const beds = bedrooms(W, H, wealth, rng);
    const quartos = Array.from({ length: beds }, (_, i) => (i === 1 && rng.chance(0.4) ? 'Quarto de criança' : 'Quarto') as RoomKind);
    const front: RoomKind[] = W >= 11 && rng.chance(0.45) ? ['Sala', 'Garagem'] : rng.chance(0.4) ? ['Sala', 'Cozinha'] : ['Sala'];
    const back: RoomKind[] = [...quartos, 'Banheiro'];
    if (!front.includes('Cozinha')) back.push('Cozinha');
    if (rng.chance(0.4)) back.push('Área de serviço');
    return { style: 'bands', front, back: shuffle(rng, back).slice(0, 5), depth: [0.38, 0.5], corridor: back.length >= 4 && rng.chance(0.6) ? rng.pick([1.25, 1.5]) : undefined };
  },
  openPlan: 0.35,
  floors: true,
};

const sobrado: Archetype = {
  id: 'sobrado',
  kind: 'house',
  names: ['Sobrado', 'Sobrado', 'Sobrado'],
  w: [8, 11],
  h: [8, 10],
  wealth: [1, 2],
  roofs: HOUSE_ROOFS,
  entrance: { main: 'single', back: 0.6, garage: true },
  recipe: (W, _H, _w, rng) => ({
    style: 'bands',
    front: W >= 10 && rng.chance(0.5) ? ['Sala', 'Garagem'] : ['Sala'],
    back: shuffle(rng, ['Cozinha', 'Banheiro', rng.chance(0.5) ? 'Escritório' : 'Sala de jantar', 'Área de serviço']),
    depth: [0.4, 0.55],
  }),
  openPlan: 0.5,
  floors: true,
};

const casaRica: Archetype = {
  id: 'casaRica',
  kind: 'house',
  names: ['Casa grande', 'Casa grande', 'Mansão'],
  w: [12, 16],
  h: [9, 12],
  wealth: [2, 2],
  roofs: HOUSE_ROOFS,
  entrance: { main: 'double', back: 0.9, side: 0.5, garage: true },
  recipe: (W, H, wealth, rng) => {
    const beds = bedrooms(W, H, wealth, rng);
    const front: RoomKind[] = shuffle(rng, ['Sala', 'Sala de jantar', rng.chance(0.6) ? 'Garagem' : 'Escritório']);
    front.sort((a) => (a === 'Sala' ? -1 : 0));
    const back: RoomKind[] = [...Array.from({ length: beds }, (_, i) => (i === 2 ? 'Quarto de criança' : 'Quarto') as RoomKind), 'Banheiro', 'Banheiro', 'Cozinha', 'Área de serviço'];
    if (rng.chance(0.5)) back.push('Despensa');
    return { style: 'bands', front, back: shuffle(rng, back).slice(0, 7), depth: [0.35, 0.45], corridor: rng.pick([1.5, 2]) };
  },
  openPlan: 0.55,
  floors: true,
  condition: { conservado: 2, abandonado: 0.6, saqueado: 2.5, incendiado: 0.4, ocupado: 1 },
};

const kitnet: Archetype = {
  id: 'kitnet',
  kind: 'apartment',
  names: ['Kitnets', 'Kitnets', 'Studios'],
  w: [10, 14],
  h: [8, 11],
  wealth: [0, 1],
  roofs: ['flat'],
  entrance: { main: 'single', back: 0.5 },
  recipe: (W, H, _w, rng) => {
    const n = Math.max(2, Math.min(6, Math.floor((W * H) / 22)));
    return { style: 'corridor', rooms: shuffle(rng, [...Array.from({ length: n - 1 }, () => 'Quarto' as RoomKind), 'Banheiro', ...(rng.chance(0.5) ? ['Cozinha' as RoomKind] : [])]), width: [1.5, 2] };
  },
  floors: true,
  condition: { conservado: 1, abandonado: 1.5, saqueado: 2, ocupado: 1.5 },
};

const pensao: Archetype = {
  id: 'pensao',
  kind: 'apartment',
  names: ['Pensão', 'Pensão', 'Hospedaria'],
  w: [11, 15],
  h: [9, 12],
  wealth: [0, 1],
  roofs: ['shingle-a', 'flat'],
  entrance: { main: 'single', back: 0.7 },
  recipe: (_W, _H, _w, rng) => ({ style: 'corridor', rooms: shuffle(rng, ['Quarto', 'Quarto', 'Quarto', 'Banheiro', 'Cozinha', 'Quarto']), lobby: 'Sala', width: [1.5, 2] }),
  floors: true,
};

const predio: Archetype = {
  id: 'predio',
  kind: 'apartment',
  names: ['Prédio residencial', 'Edifício', 'Edifício'],
  w: [12, 16],
  h: [10, 14],
  wealth: [0, 2],
  roofs: ['flat'],
  entrance: { main: 'double', back: 0.6 },
  recipe: (_W, _H, _w, rng) => ({ style: 'corridor', rooms: shuffle(rng, ['Sala', 'Quarto', 'Cozinha', 'Banheiro', 'Quarto', 'Depósito']), lobby: 'Recepção', width: [1.8, 2.4] }),
  floors: true,
};

// ---------------------------------------------------------------- comércio

const mercadinho: Archetype = {
  id: 'mercadinho',
  kind: 'store',
  names: ['Mercadinho', 'Mercearia', 'Empório'],
  w: [10, 14],
  h: [8, 11],
  wealth: [0, 1],
  roofs: ['flat'],
  entrance: { main: 'double', back: 0.8 },
  recipe: (_W, _H, _w, rng) => ({ style: 'bands', front: ['Salão'], back: shuffle(rng, ['Estoque', 'Banheiro', rng.chance(0.5) ? 'Escritório' : 'Estoque']), depth: [0.62, 0.75] }),
  // Pode ter andar em cima (apartamento/escritório): guarda o vão da escada.
  floors: true,
};

const supermercado: Archetype = {
  id: 'supermercado',
  kind: 'store',
  names: ['Supermercado', 'Supermercado', 'Atacadão'],
  w: [18, 24],
  h: [13, 17],
  wealth: [1, 1],
  roofs: ['flat'],
  entrance: { main: 'double', twin: true, back: 1 },
  recipe: (_W, _H, _w, rng) => ({ style: 'bands', front: ['Salão'], back: shuffle(rng, ['Estoque', 'Estoque', 'Vestiário', 'Banheiro', 'Escritório', 'Despensa']), depth: [0.68, 0.76] }),
};

const conveniencia: Archetype = {
  id: 'conveniencia',
  kind: 'store',
  names: ['Loja de conveniência', 'Conveniência', 'Conveniência'],
  w: [8, 10],
  h: [6, 8],
  wealth: [1, 1],
  roofs: ['flat'],
  entrance: { main: 'double', back: 0.6 },
  recipe: () => ({ style: 'bands', front: ['Salão'], back: ['Estoque', 'Banheiro'], depth: [0.65, 0.75] }),
  // Pode ter andar em cima (apartamento/escritório): guarda o vão da escada.
  floors: true,
};

const farmacia: Archetype = {
  id: 'farmacia',
  kind: 'pharmacy',
  names: ['Farmácia', 'Drogaria', 'Drogaria'],
  w: [8, 12],
  h: [7, 10],
  wealth: [1, 2],
  roofs: ['flat'],
  entrance: { main: 'double', back: 0.7 },
  recipe: (_W, _H, _w, rng) => ({ style: 'bands', front: ['Salão'], back: shuffle(rng, ['Estoque', 'Banheiro', rng.chance(0.5) ? 'Escritório' : 'Despensa']), depth: [0.58, 0.7] }),
  // Pode ter andar em cima (apartamento/escritório): guarda o vão da escada.
  floors: true,
};

const lanchonete: Archetype = {
  id: 'lanchonete',
  kind: 'restaurant',
  names: ['Lanchonete', 'Pastelaria', 'Lanchonete'],
  w: [7, 10],
  h: [6, 9],
  wealth: [0, 1],
  roofs: ['flat'],
  entrance: { main: 'double', back: 0.8 },
  recipe: (_W, _H, _w, rng) => ({ style: 'bands', front: ['Sala de jantar'], back: shuffle(rng, ['Cozinha industrial', 'Banheiro', ...(rng.chance(0.5) ? ['Despensa' as RoomKind] : [])]), depth: [0.55, 0.65] }),
  // Pode ter andar em cima (apartamento/escritório): guarda o vão da escada.
  floors: true,
};

const restaurante: Archetype = {
  id: 'restaurante',
  kind: 'restaurant',
  names: ['Restaurante', 'Restaurante', 'Churrascaria'],
  w: [11, 15],
  h: [9, 12],
  wealth: [1, 2],
  roofs: ['flat', 'shingle-a'],
  entrance: { main: 'double', back: 1, side: 0.3 },
  recipe: (_W, _H, _w, rng) => ({ style: 'bands', front: ['Sala de jantar'], back: shuffle(rng, ['Cozinha industrial', 'Despensa', 'Banheiro', 'Banheiro', 'Escritório']), depth: [0.55, 0.65] }),
  // Pode ter andar em cima (apartamento/escritório): guarda o vão da escada.
  floors: true,
};

const padaria: Archetype = {
  id: 'padaria',
  kind: 'bakery',
  names: ['Padaria', 'Panificadora', 'Confeitaria'],
  w: [8, 12],
  h: [7, 10],
  wealth: [0, 2],
  roofs: ['flat'],
  entrance: { main: 'double', back: 0.9 },
  recipe: (_W, _H, _w, rng) => ({ style: 'bands', front: ['Salão'], back: shuffle(rng, ['Cozinha industrial', 'Despensa', 'Banheiro']), depth: [0.5, 0.6] }),
  // Pode ter andar em cima (apartamento/escritório): guarda o vão da escada.
  floors: true,
};

const bar: Archetype = {
  id: 'bar',
  kind: 'bar',
  names: ['Bar', 'Boteco', 'Bar e lanches'],
  w: [7, 10],
  h: [6, 9],
  wealth: [0, 1],
  roofs: ['flat', 'shingle-b'],
  entrance: { main: 'double', back: 0.6 },
  recipe: (_W, _H, _w, rng) => ({ style: 'bands', front: ['Sala de jantar'], back: shuffle(rng, ['Despensa', 'Banheiro', ...(rng.chance(0.5) ? ['Cozinha' as RoomKind] : [])]), depth: [0.6, 0.72] }),
  condition: { conservado: 1, abandonado: 1, saqueado: 3, ocupado: 1 },
  // Pode ter andar em cima (apartamento/escritório): guarda o vão da escada.
  floors: true,
};

const lojaRoupas: Archetype = {
  id: 'lojaRoupas',
  kind: 'clothing',
  names: ['Loja de roupas', 'Boutique', 'Moda'],
  w: [8, 12],
  h: [7, 10],
  wealth: [1, 2],
  roofs: ['flat'],
  entrance: { main: 'double', back: 0.6 },
  recipe: (_W, _H, _w, rng) => ({ style: 'bands', front: ['Salão'], back: shuffle(rng, ['Estoque', 'Vestiário', 'Banheiro']), depth: [0.62, 0.74] }),
  // Pode ter andar em cima (apartamento/escritório): guarda o vão da escada.
  floors: true,
};

const ferragem: Archetype = {
  id: 'ferragem',
  kind: 'hardware',
  names: ['Ferragem', 'Material de construção', 'Casa de ferragens'],
  w: [10, 15],
  h: [8, 12],
  wealth: [1, 1],
  roofs: ['flat'],
  entrance: { main: 'double', back: 1, side: 0.3 },
  recipe: (_W, _H, _w, rng) => ({ style: 'bands', front: ['Salão'], back: shuffle(rng, ['Depósito', 'Estoque', 'Banheiro', 'Escritório']), depth: [0.55, 0.68] }),
  // Pode ter andar em cima (apartamento/escritório): guarda o vão da escada.
  floors: true,
};

const lavanderia: Archetype = {
  id: 'lavanderia',
  kind: 'laundry',
  names: ['Lavanderia', 'Lavanderia', 'Lavanderia'],
  w: [7, 10],
  h: [6, 8],
  wealth: [1, 1],
  roofs: ['flat'],
  entrance: { main: 'double', back: 0.5 },
  recipe: () => ({ style: 'bands', front: ['Salão'], back: ['Área de serviço', 'Banheiro'], depth: [0.6, 0.72] }),
  // Pode ter andar em cima (apartamento/escritório): guarda o vão da escada.
  floors: true,
};

// ---------------------------------------------------------------- trabalho

const oficina: Archetype = {
  id: 'oficina',
  kind: 'garage',
  names: ['Oficina mecânica', 'Auto center', 'Oficina'],
  w: [10, 14],
  h: [8, 11],
  wealth: [0, 1],
  roofs: ['flat'],
  entrance: { main: 'rolling', back: 0.5 },
  recipe: (_W, _H, _w, rng) => ({ style: 'hall', main: 'Oficina', strip: shuffle(rng, ['Escritório', 'Banheiro', 'Depósito']), side: rng.pick(['back', 'left', 'right'] as const), depth: [2.5, 3.5] }),
  // Pode ter andar em cima (apartamento/escritório): guarda o vão da escada.
  floors: true,
};

const borracharia: Archetype = {
  id: 'borracharia',
  kind: 'garage',
  names: ['Borracharia', 'Borracharia', 'Borracharia'],
  w: [7, 9],
  h: [6, 8],
  wealth: [0, 0],
  roofs: ['flat'],
  entrance: { main: 'rolling' },
  recipe: () => ({ style: 'hall', main: 'Oficina', strip: ['Depósito', 'Banheiro'], side: 'back', depth: [2.2, 2.8] }),
  // Pode ter andar em cima (apartamento/escritório): guarda o vão da escada.
  floors: true,
};

const serralheria: Archetype = {
  id: 'serralheria',
  kind: 'factory',
  names: ['Serralheria', 'Marcenaria', 'Metalúrgica'],
  w: [12, 16],
  h: [9, 12],
  wealth: [0, 1],
  roofs: ['flat'],
  entrance: { main: 'rolling', back: 0.7, side: 0.3 },
  recipe: (_W, _H, _w, rng) => ({ style: 'hall', main: 'Oficina', strip: shuffle(rng, ['Escritório', 'Vestiário', 'Depósito', 'Banheiro']), side: rng.pick(['back', 'left', 'right'] as const), depth: [2.8, 3.6] }),
  // Pode ter andar em cima (apartamento/escritório): guarda o vão da escada.
  floors: true,
};

const galpao: Archetype = {
  id: 'galpao',
  kind: 'warehouse',
  names: ['Galpão', 'Depósito', 'Centro de distribuição'],
  w: [14, 20],
  h: [10, 14],
  wealth: [0, 1],
  roofs: ['flat'],
  entrance: { main: 'rolling', back: 0.8, side: 0.4 },
  recipe: (_W, _H, _w, rng) => ({ style: 'hall', main: 'Galpão', strip: shuffle(rng, ['Escritório', 'Banheiro', 'Vestiário', 'Refeitório']), side: rng.pick(['back', 'left', 'right'] as const), depth: [3, 4] }),
  // Pode ter andar em cima (apartamento/escritório): guarda o vão da escada.
  floors: true,
};

// ---------------------------------------------------------------- serviços

const escritorio: Archetype = {
  id: 'escritorio',
  kind: 'office',
  names: ['Escritório', 'Contabilidade', 'Imobiliária'],
  w: [10, 14],
  h: [8, 11],
  wealth: [1, 2],
  roofs: ['flat'],
  entrance: { main: 'double', back: 0.5 },
  recipe: (_W, _H, _w, rng) => ({ style: 'corridor', rooms: shuffle(rng, ['Escritório', 'Escritório', 'Banheiro', 'Escritório', 'Cozinha']), lobby: 'Recepção', width: [1.5, 2] }),
  floors: true,
};

const postoSaude: Archetype = {
  id: 'postoSaude',
  kind: 'clinic',
  names: ['Posto de saúde', 'Clínica', 'Clínica'],
  w: [12, 16],
  h: [10, 13],
  wealth: [1, 1],
  roofs: ['flat'],
  entrance: { main: 'double', back: 0.8, side: 0.3 },
  recipe: (_W, _H, _w, rng) => ({ style: 'corridor', rooms: shuffle(rng, ['Consultório', 'Consultório', 'Enfermaria', 'Banheiro', 'Despensa', 'Escritório']), lobby: 'Recepção', width: [1.8, 2.2] }),
  // Pode ter andar em cima (apartamento/escritório): guarda o vão da escada.
  floors: true,
};

const escola: Archetype = {
  id: 'escola',
  kind: 'school',
  names: ['Escola', 'Escola municipal', 'Colégio'],
  w: [16, 22],
  h: [12, 16],
  wealth: [0, 1],
  roofs: ['flat'],
  entrance: { main: 'double', back: 1, side: 0.5 },
  recipe: (_W, _H, _w, rng) => ({ style: 'corridor', rooms: shuffle(rng, ['Sala de aula', 'Sala de aula', 'Sala de aula', 'Sala de aula', 'Escritório', 'Banheiro']), lobby: 'Recepção', backHall: 'Refeitório', width: [2, 2.5] }),
  // Pode ter andar em cima (apartamento/escritório): guarda o vão da escada.
  floors: true,
};

const igreja: Archetype = {
  id: 'igreja',
  kind: 'church',
  names: ['Igreja', 'Capela', 'Igreja'],
  w: [9, 13],
  h: [11, 15],
  wealth: [0, 1],
  roofs: ['shingle-a'],
  entrance: { main: 'double', back: 0.4, side: 0.5 },
  recipe: (_W, _H, _w, rng) => ({ style: 'hall', main: 'Nave', strip: shuffle(rng, ['Escritório', 'Banheiro', 'Depósito']), side: 'back', depth: [2.5, 3.2] }),
};

const academia: Archetype = {
  id: 'academia',
  kind: 'gym',
  names: ['Academia', 'Academia', 'Studio fitness'],
  w: [10, 14],
  h: [8, 11],
  wealth: [1, 2],
  roofs: ['flat'],
  entrance: { main: 'double', back: 0.5 },
  recipe: (_W, _H, _w, rng) => ({ style: 'hall', main: 'Salão', strip: shuffle(rng, ['Vestiário', 'Vestiário', 'Recepção', 'Banheiro']), side: rng.pick(['back', 'left', 'right'] as const), depth: [2.5, 3.2] }),
};

export const ARCHETYPES = {
  barraco,
  casaSimples,
  casaMadeira,
  casaMedia,
  sobrado,
  casaRica,
  kitnet,
  pensao,
  predio,
  mercadinho,
  supermercado,
  conveniencia,
  farmacia,
  lanchonete,
  restaurante,
  padaria,
  bar,
  lojaRoupas,
  ferragem,
  lavanderia,
  oficina,
  borracharia,
  serralheria,
  galpao,
  escritorio,
  postoSaude,
  escola,
  igreja,
  academia,
} as const satisfies Record<string, Archetype>;

export type ArchetypeId = keyof typeof ARCHETYPES;
