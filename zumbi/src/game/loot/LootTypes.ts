/**
 * Tipos do sistema de loot (só dados).
 *
 * - RECIPIENTE: um lugar onde há coisas (geladeira, guarda-roupa, porta-malas).
 *   Vem de um objeto do mapa (PropType) ou é "o chão" de um cômodo.
 * - TABELA: o que pode aparecer num recipiente, num CONTEXTO (tipo de
 *   construção, cômodo, zona), com pesos, quantidades e raridade.
 * - O estado inicial de cada item (condição, validade, carga) depende do
 *   lugar: loja tem coisa nova; lixo tem coisa gasta e suja.
 */
import type { BuildingKind } from '../world/MapTypes';

export type ContainerKind =
  | 'geladeira'
  | 'fogao'
  | 'armarioCozinha'
  | 'armario'
  | 'guardaRoupa'
  | 'criadoMudo'
  | 'armarioBanheiro'
  | 'escrivaninha'
  | 'rack'
  | 'prateleira'
  | 'geladeiraVitrine'
  | 'caixaRegistradora'
  | 'prateleiraFerramentas'
  | 'bancada'
  | 'caixote'
  | 'caixas'
  | 'caixa'
  | 'cacamba'
  | 'lixeira'
  | 'sacoLixo'
  | 'portaLuvas'
  | 'portaMalas'
  | 'bancoCarro'
  | 'tambor'
  | 'chao';

/** Como o lugar "trata" os itens: define condição/idade iniciais. */
export type Wear = 'novo' | 'casa' | 'trabalho' | 'lixo' | 'veiculo' | 'rua';

export interface ContainerDef {
  name: string;
  /** Capacidade (kg). */
  capacity: number;
  /** Verbo do botão ("ABRIR", "REVIRAR"). */
  verb: string;
}

export type ZoneKind = 'residencial' | 'comercial' | 'industrial' | 'parque' | 'rua';

export interface LootContext {
  building: BuildingKind | null;
  /** Nome do cômodo ("Cozinha", "Banheiro"...) ou null (fora de construção). */
  room: string | null;
  zone: ZoneKind;
}

/** Entrada de tabela: um item OU "qualquer item com a etiqueta" (ponderado pela raridade). */
export interface LootEntry {
  item?: string;
  tag?: string;
  /** Peso relativo dentro da tabela (antes da raridade). */
  w: number;
  /** Quantidade quando sai [mín, máx]. */
  n?: readonly [number, number];
}

export interface LootTable {
  /** Quantas vezes sorteia [mín, máx] (antes da abundância). */
  rolls: readonly [number, number];
  /** Chance de o recipiente já estar vazio (alguém passou antes). */
  empty: number;
  wear: Wear;
  /** Idade do estoque perecível em dias antes do colapso [mín, máx]. */
  stockAge?: readonly [number, number];
  entries: readonly LootEntry[];
}
