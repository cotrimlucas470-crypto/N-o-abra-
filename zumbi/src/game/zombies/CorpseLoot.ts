/**
 * O QUE O CORPO TEM (puro): quem a pessoa era decide o que estava nos bolsos
 * — o policial tem cassetete e munição, a enfermeira atadura e luva, o
 * mecânico chave de fenda, o morador de rua isqueiro e garrafa — mais as
 * roupas que ele VESTE (a mesma aparência do desenho), sujas de sangue,
 * rasgadas e gastas. Gerado uma vez, com a semente do zumbi (nada infinito).
 */
import { Random } from '../core/Random';
import { Flag } from '../items/condition';
import type { ItemStack } from '../items/ItemContainer';
import { itemDef } from '../items/ItemCatalog';
import { generateLoot } from '../loot/generate';
import type { LootEntry, LootTable } from '../loot/LootTypes';
import type { ArchId, BottomKind, HatKind, TopKind, VestKind } from './Archetypes';
import type { Zombie } from './Zombie';

const i = (item: string, w: number, n?: readonly [number, number]): LootEntry => (n ? { item, w, n } : { item, w });

/** Bolsos de qualquer pessoa. */
const POCKETS: LootTable = {
  rolls: [0, 3],
  empty: 0.2,
  wear: 'rua',
  entries: [
    i('carteira', 5), i('dinheiro', 5, [5, 120]), i('documentos', 3), i('chaveCasa', 3), i('chaveCarro', 1.4), i('celular', 3),
    i('isqueiro', 2), i('fosforos', 1), i('fotografia', 2), i('relogioPulso', 1.4), i('alianca', 1), i('anelOuro', 0.4), i('colar', 0.5),
    i('analgesico', 1), i('bilhete', 0.8), i('canivete', 0.6), i('lanterna', 0.4), i('pilhas', 0.6), i('curativoAdesivo', 0.8),
  ],
};

/** O que o trabalho deixa nos bolsos. */
const BY_WORK: Partial<Record<ArchId, LootTable>> = {
  policial: {
    rolls: [1, 3],
    empty: 0.1,
    wear: 'trabalho',
    entries: [i('cassetete', 3), i('municao40', 2.5, [3, 12]), i('carregador40', 1), i('pistola40', 0.35), i('radioComunicador', 1.6), i('lanterna', 2), i('chaveCarro', 1.2)],
  },
  militar: {
    rolls: [1, 3],
    empty: 0.1,
    wear: 'trabalho',
    entries: [i('faca', 2), i('facaCacador', 1), i('atadura', 2), i('lanterna', 1.5), i('radioComunicador', 1), i('municao9', 2, [5, 15]), i('carregador9', 1), i('municao308', 0.6, [3, 10])],
  },
  enfermeiro: {
    rolls: [1, 3],
    empty: 0.1,
    wear: 'trabalho',
    entries: [i('atadura', 3), i('gaze', 3), i('luvasLatex', 3), i('analgesico', 3), i('antibiotico', 0.8), i('seringa', 1), i('termometro', 1), i('esparadrapo', 2), i('alcoolGel', 2), i('tesoura', 1)],
  },
  farmaceutico: {
    rolls: [1, 3],
    empty: 0.1,
    wear: 'trabalho',
    entries: [i('analgesico', 3), i('antiInflamatorio', 2), i('antialergico', 1.5), i('vitaminas', 1.5), i('luvasLatex', 2), i('mascara', 2), i('alcoolGel', 2)],
  },
  mecanico: {
    rolls: [1, 3],
    empty: 0.15,
    wear: 'trabalho',
    entries: [i('chaveFenda', 3), i('chaveInglesa', 2), i('alicate', 2), i('fitaIsolante', 2), i('trapo', 3), i('lanterna', 1), i('velaIgnicao', 1), i('parafusos', 1, [2, 8])],
  },
  operario: {
    rolls: [1, 3],
    empty: 0.15,
    wear: 'trabalho',
    entries: [i('estilete', 2), i('trena', 2), i('fita', 2), i('pregos', 2, [4, 20]), i('martelo', 0.8), i('luvasTrabalho', 1), i('lanterna', 1)],
  },
  cozinheiro: {
    rolls: [0, 2],
    empty: 0.3,
    wear: 'trabalho',
    entries: [i('faca', 2), i('isqueiro', 1.5), i('trapo', 2), i('abridor', 1)],
  },
  garcom: { rolls: [0, 2], empty: 0.3, wear: 'trabalho', entries: [i('dinheiro', 4, [5, 60]), i('abridor', 2), i('isqueiro', 1)] },
  caixa: { rolls: [0, 2], empty: 0.3, wear: 'trabalho', entries: [i('dinheiro', 4, [5, 40]), i('estilete', 1.5), i('chaveCasa', 1)] },
  moradorRua: {
    rolls: [1, 3],
    empty: 0.1,
    wear: 'lixo',
    entries: [i('garrafaVazia', 3), i('trapo', 3), i('isqueiro', 2), i('fosforos', 2), i('cachaca', 1.5), i('dinheiro', 1, [1, 10]), i('cobertor', 0.4), i('canivete', 1)],
  },
  estudante: { rolls: [0, 2], empty: 0.3, wear: 'casa', entries: [i('gibi', 2), i('livroRomance', 1), i('celular', 2), i('agua', 2), i('revista', 1)] },
  corredor: { rolls: [0, 1], empty: 0.4, wear: 'casa', entries: [i('agua', 3), i('isotonico', 2), i('celular', 2), i('chaveCasa', 1.5)] },
  executivo: { rolls: [0, 2], empty: 0.2, wear: 'casa', entries: [i('dinheiro', 4, [20, 250]), i('relogioPulso', 2), i('celular', 3), i('chaveCarro', 2.5), i('documentos', 2)] },
};

/** Peça de roupa que ele veste → item (quando existe no catálogo). */
const TOP_ITEM: Partial<Record<TopKind, string>> = {
  camiseta: 'camiseta',
  regata: 'regata',
  camisa: 'camisaSocial',
  polo: 'camiseta',
  moletom: 'moletom',
  jaqueta: 'jaquetaJeans',
  casaco: 'casacoInverno',
  jaleco: 'jaleco',
  macacao: 'macacao',
  uniforme: 'uniformePolicial',
  terno: 'camisaSocial',
  cardiga: 'camisaFlanela',
  doma: 'camisetaBranca',
  scrub: 'camisetaBranca',
  pijama: 'camiseta',
  camuflado: 'camisaFlanela',
};
const BOTTOM_ITEM: Partial<Record<BottomKind, string>> = { calca: 'calcaJeans', bermuda: 'bermuda', short: 'bermuda' };
const HAT_ITEM: Partial<Record<HatKind, string>> = { bone: 'bone', capaceteObra: 'capaceteObra', touca: 'gorro', capacete: 'capaceteMoto' };
const VEST_ITEM: Partial<Record<VestKind, string>> = { balistico: 'coleteBalistico', refletivo: 'colete' };

function worn(defId: string, r: Random, blood: number, dirt: number): ItemStack | null {
  if (!itemDef(defId)) return null;
  let f = 0;
  if (r.chance(0.35 + blood * 0.6)) f |= Flag.Ensanguentado;
  if (r.chance(0.3 + dirt * 0.6)) f |= Flag.Sujo;
  if (r.chance(0.35)) f |= Flag.Rasgado;
  return { defId, count: 1, st: { c: Math.round(r.range(0.2, 0.7) * 100) / 100, ...(f ? { f } : {}) } };
}

/** Conteúdo do corpo (sempre o mesmo para o mesmo zumbi). */
export function corpseLoot(z: Zombie, settings?: Parameters<typeof generateLoot>[2]['settings']): ItemStack[] {
  const r = new Random(z.seed ^ 0xc0f5e);
  const out: ItemStack[] = [];
  const opts = { capacity: 20, ...(settings ? { settings } : {}) };
  out.push(...generateLoot(POCKETS, r, opts));
  const work = BY_WORK[z.arch];
  if (work) out.push(...generateLoot(work, r, opts));
  // O que veste (nem sempre dá para aproveitar: rasgado demais).
  const L = z.look;
  const pieces = [TOP_ITEM[L.top.kind], L.top.kind === 'vestido' ? undefined : BOTTOM_ITEM[L.bottom.kind], L.hat ? HAT_ITEM[L.hat.kind] : undefined, L.vest ? VEST_ITEM[L.vest] : undefined];
  if (L.shoes !== null) pieces.push(z.arch === 'operario' || z.arch === 'mecanico' ? 'botaTrabalho' : z.arch === 'militar' ? 'botaMilitar' : z.arch === 'executivo' ? 'sapatoSocial' : 'tenis');
  for (const id of pieces) {
    if (!id || !r.chance(0.75)) continue;
    const s = worn(id, r, L.blood, L.dirt);
    if (s) out.push(s);
  }
  if (L.backpack !== undefined && r.chance(0.8)) {
    const bag = z.arch === 'militar' ? 'mochilaMilitar' : z.arch === 'moradorRua' ? 'mochilaTrilha' : 'mochilaEscolar';
    const s = worn(bag, r, L.blood * 0.5, L.dirt);
    if (s) out.push(s);
  }
  return out.filter((s) => itemDef(s.defId));
}

/** Para testes: todas as tabelas de corpo. */
export const CORPSE_TABLES: readonly LootTable[] = [POCKETS, ...Object.values(BY_WORK)];
