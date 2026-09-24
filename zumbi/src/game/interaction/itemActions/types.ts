/**
 * Ações de item: o que dá para fazer com um item dependendo de ONDE ele está
 * (bolsos/mochila, na mão, vestido, num recipiente aberto do mundo).
 *
 * Cada ação é um dado (`ItemActionDef`): quando aparece, se está liberada
 * (ou o motivo de não estar) e o que faz. Etapas novas acrescentam listas de
 * ações sem mexer nas antigas (comer/beber/vestir, tratar ferida, ler,
 * recarregar, fabricar...).
 */
import type { ItemState, Tone } from '../../items/condition';
import type { ItemContainer } from '../../items/ItemContainer';
import type { ItemDef, WearSlot } from '../../items/ItemTypes';
import type { PlayerInventory } from '../../items/PlayerInventory';
import type { TimedActionSpec } from '../../sim/Actions';
import type { WorldState } from '../../sim/WorldState';
import type { Survivor } from '../../survival/Survivor';

/** Onde o item está (serializável: vai em eventos do HUD). */
export type ItemWhere =
  | { where: 'inv'; containerId: string; index: number }
  | { where: 'loot'; index: number }
  | { where: 'hand' }
  | { where: 'worn'; slot: WearSlot }
  | { where: 'bag' };

export interface ItemResult {
  ok: boolean;
  message?: string;
  tone?: Tone;
  /** Ação demorada: a cena põe na fila de ações com tempo. */
  timed?: TimedActionSpec;
}

/** Tudo o que uma ação pode precisar. */
export interface ItemActionContext {
  def: ItemDef;
  st: ItemState | undefined;
  count: number;
  loc: ItemWhere;
  /** Recipiente do jogador onde o item está (só para 'inv'). */
  container: ItemContainer | null;
  inventory: PlayerInventory;
  survivor: Survivor;
  state: WorldState;
  /** Dia de jogo (fração). */
  now: number;
  /** Recipiente do mundo aberto agora (geladeira, porta-malas...). */
  openContainerId: string | null;
  /** Posição do jogador (largar no chão, barulho). */
  x: number;
  y: number;
  /** Serviços da cena (barulho, abrir telas). */
  hooks: ItemHooks;
}

export interface ItemHooks {
  noise(radius: number, source: string): void;
  /** Largar no chão aos pés. */
  drop(defId: string, count: number, st: ItemState | undefined): void;
  /** Abrir uma tela (mapa, leitura) — a interface decide como. */
  show?(kind: string, data?: unknown): void;
  /** Recarregar/destravar a arma da mão (ação com tempo ou motivo de não dar). */
  reload?(): TimedActionSpec | string;
  unjam?(): TimedActionSpec | string;
  /** Luz em volta do jogador (0 = breu, 1 = dia claro), para ler. */
  light?(): number;
  /** Ouviu o rádio no dia: libera a previsão. */
  radioHeard?(): void;
  /** Hora do jogo (minuto do dia) e dia. */
  time?(): { minuteOfDay: number; day: number };
  rng?(): number;
}

export interface ItemActionDef {
  id: string;
  /** Texto do botão (curto, MAIÚSCULO). */
  label: string | ((c: ItemActionContext) => string);
  /** Aparece para este item neste lugar? */
  when(c: ItemActionContext): boolean;
  /** Liberada? true, ou o motivo (aparece, mas avisa ao tocar). */
  can?(c: ItemActionContext): true | string;
  run(c: ItemActionContext): ItemResult;
  /** Ordem (menor = primeiro). A primeira ação liberada é a principal. */
  order?: number;
}

export const ok = (message?: string, tone: Tone = 'ok'): ItemResult => (message ? { ok: true, message, tone } : { ok: true });
export const fail = (message: string, tone: Tone = 'warn'): ItemResult => ({ ok: false, message, tone });
