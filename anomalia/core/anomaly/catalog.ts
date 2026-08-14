/**
 * Carga dos catálogos e as asserções de build.
 *
 * §0 regra 7 — dados em JSON, sem hardcode de conteúdo. Nenhuma frase que o
 * jogador lê nasce em arquivo .ts; tudo vem daqui.
 *
 * As asserções deste módulo são o que transforma as regras inegociáveis de §0
 * em falha de build em vez de comentário: um catálogo que fura §0 não compila
 * o teste.
 */

import anomalyData from '../../data/anomalies/anomalies.json' with { type: 'json' };
import contactData from '../../data/anomalies/contact.json' with { type: 'json' };
import mutationData from '../../data/anomalies/mutations.json' with { type: 'json' };
import optionData from '../../data/anomalies/options.json' with { type: 'json' };
import bladeData from '../../data/anomalies/blades.json' with { type: 'json' };
import carryData from '../../data/anomalies/carry.json' with { type: 'json' };

import type {
  AnomalyDef, BackpackDef, BladeItem, ContactTable, CraftRecipe,
  EncounterOption, ModuleDef, MutationDef, Stimulus,
} from './types.ts';

export const ANOMALIES: readonly AnomalyDef[] =
  anomalyData.anomalias as unknown as AnomalyDef[];

export const CONTACT_TABLES: readonly ContactTable[] =
  contactData.tabelas as unknown as ContactTable[];

export const MUTATIONS: readonly MutationDef[] =
  mutationData.mutacoes as unknown as MutationDef[];

export const MUTATION_ENTRADA = {
  diaInicial: mutationData.diaInicial,
  chanceInicial: mutationData.chanceInicial,
  chancePorDia: mutationData.chancePorDia,
  chanceMaxima: mutationData.chanceMaxima,
};

export const OPTIONS: readonly EncounterOption[] =
  optionData.opcoes as unknown as EncounterOption[];

export const PHANTOM_OPTIONS: readonly EncounterOption[] =
  optionData.fantasmas as unknown as EncounterOption[];

export const BLADES: readonly BladeItem[] =
  bladeData.armas as unknown as BladeItem[];

export const RECIPES: readonly CraftRecipe[] =
  bladeData.receitas as unknown as CraftRecipe[];

export const BACKPACKS: readonly BackpackDef[] =
  carryData.mochilas as unknown as BackpackDef[];

export const MODULES: readonly ModuleDef[] =
  carryData.modulos as unknown as ModuleDef[];

export const SOBRECARGA = carryData.sobrecarga;

export const VOLUME = carryData.volume;

const byId = <T extends { id: string }>(xs: readonly T[]): ReadonlyMap<string, T> => {
  const m = new Map<string, T>();
  for (const x of xs) m.set(x.id, x);
  return m;
};

export const ANOMALY_BY_ID = byId(ANOMALIES);
export const CONTACT_BY_ID = byId(CONTACT_TABLES);
export const MUTATION_BY_ID = byId(MUTATIONS);
export const OPTION_BY_ID = byId([...OPTIONS, ...PHANTOM_OPTIONS]);
export const BLADE_BY_ID = byId(BLADES);
export const BACKPACK_BY_ID = byId(BACKPACKS);
export const MODULE_BY_ID = byId(MODULES);

export function anomaly(id: string): AnomalyDef {
  const def = ANOMALY_BY_ID.get(id);
  if (!def) throw new Error(`anomalia desconhecida: ${id}`);
  return def;
}

export function blade(id: string): BladeItem {
  const b = BLADE_BY_ID.get(id);
  if (!b) throw new Error(`arma desconhecida: ${id}`);
  return { ...b };
}

const ESTIMULOS: readonly Stimulus[] = [
  'SOM', 'MOVIMENTO', 'CHEIRO', 'LUZ',
  'CALOR', 'METAL', 'VOZ', 'SANGUE', 'MEMORIA',
];

/**
 * As regras de §0 e §8 que dependem só do dado, verificadas de uma vez.
 * Chamada pelos testes; qualquer entrada nova que fure alguma delas quebra o
 * build antes de chegar ao jogador.
 */
export function assertCatalogoSano(): void {
  if (ANOMALIES.length !== 12) {
    throw new Error(`§2 declara 12 anomalias canônicas; o catálogo tem ${ANOMALIES.length}`);
  }

  for (const a of ANOMALIES) {
    // §0 regra 2 — ela é um conjunto de regras de percepção
    if (a.senses.length === 0 && !a.estatica) {
      throw new Error(`${a.id}: sem sentido nenhum e não é estática`);
    }
    for (const s of a.senses) {
      if (!ESTIMULOS.includes(s.stimulus)) throw new Error(`${a.id}: estímulo ${s.stimulus}`);
      if (s.weight <= 0 || s.weight > 1) throw new Error(`${a.id}/${s.stimulus}: weight fora de (0,1]`);
      if (s.threshold < 0 || s.threshold > 100) throw new Error(`${a.id}/${s.stimulus}: threshold`);
      if (s.range < 1 || s.range > 40) throw new Error(`${a.id}/${s.stimulus}: range fora de 1..40`);
      if (s.decay < 0 || s.decay >= 1) throw new Error(`${a.id}/${s.stimulus}: decay fora de [0,1)`);
      if (a.blindTo.includes(s.stimulus)) {
        throw new Error(`${a.id}: percebe e é cega para ${s.stimulus} ao mesmo tempo`);
      }
    }

    // §0 regra 5 — fraqueza de comportamento descobrível por observação.
    // A11 é a exceção declarada na tabela de §2 ("Sem fraqueza. Fuga pura"),
    // e por isso ela paga em outro lugar: é a única com delayResistance alta
    // e persistence longa, para que fugir seja caro mesmo dando certo.
    if (a.blindTo.length === 0 && a.id !== 'A11_FOME') {
      throw new Error(`${a.id}: sem blindTo — não há fraqueza para descobrir (regra 5)`);
    }

    // §0 regra 3 — as três camadas de aviso precisam existir para serem emitidas
    if (a.telegraphs.ambient.length === 0) throw new Error(`${a.id}: sem telegraph ambiente`);
    if (a.telegraphs.audio.length === 0) throw new Error(`${a.id}: sem telegraph de áudio`);
    if (a.telegraphs.direct.length === 0) throw new Error(`${a.id}: sem telegraph direto`);
    if (a.encounterText.length === 0) throw new Error(`${a.id}: sem texto de encontro`);

    if (!CONTACT_BY_ID.has(a.contactTableId)) {
      throw new Error(`${a.id}: tabela de contato ${a.contactTableId} não existe`);
    }
    for (const m of a.mutationPool) {
      if (!MUTATION_BY_ID.has(m)) throw new Error(`${a.id}: mutação ${m} não existe`);
    }
    if (a.delayResistance < 0 || a.delayResistance > 1) {
      throw new Error(`${a.id}: delayResistance fora de [0,1]`);
    }
  }

  // §8 — a rolagem é de 1 a 100 e não pode ter casa vazia nem sobreposta
  for (const t of CONTACT_TABLES) {
    let esperado = 1;
    for (const linha of t.roll) {
      const [lo, hi] = linha.range;
      if (lo !== esperado) throw new Error(`${t.id}: faixa começa em ${lo}, esperado ${esperado}`);
      if (hi < lo) throw new Error(`${t.id}: faixa invertida ${lo}..${hi}`);
      esperado = hi + 1;
    }
    if (esperado !== 101) throw new Error(`${t.id}: a tabela termina em ${esperado - 1}, não em 100`);
    if (!t.roll.some((r) => r.result === 'MORTE')) {
      throw new Error(`${t.id}: sem faixa de MORTE`);
    }
  }

  // §7 — as tabelas de desfecho são sorteio ponderado e os pesos fecham em 1
  for (const o of [...OPTIONS, ...PHANTOM_OPTIONS]) {
    const soma = o.outcomes.reduce((acc, x) => acc + x.r, 0);
    if (Math.abs(soma - 1) > 1e-9) {
      throw new Error(`${o.id}: pesos de outcomes somam ${soma}, não 1`);
    }
    if (!o.texto || o.texto.length < 10) throw new Error(`${o.id}: sem texto`);
  }

  // §13 — toda arma tem função de utilidade
  for (const b of BLADES) {
    if (!b.secondaryUse) throw new Error(`${b.id}: §13 exige uso secundário`);
    if (b.durability > b.maxDurability) throw new Error(`${b.id}: durabilidade acima do teto`);
    if (b.metalNoise < 0 || b.metalNoise > 100) throw new Error(`${b.id}: metalNoise fora de 0..100`);
  }
}
