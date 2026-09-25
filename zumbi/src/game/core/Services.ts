/**
 * Serviços compartilhados entre cenas (um por jogo).
 * Evita variáveis globais soltas e deixa claro quem depende de quê.
 */
import type Phaser from 'phaser';
import type { AssetRegistry } from '../assets/AssetRegistry';
import type { OverrideManifest } from '../assets/AssetOverrides';
import type { PlayerStats } from '../entities/player/PlayerStats';
import type { SandboxSettings } from '../config/Sandbox';
import type { GameClock } from '../sim/GameClock';
import type { InteractionTarget } from '../interaction/InteractionSystem';
import type { PlayerInventory } from '../items/PlayerInventory';
import type { ItemContainer } from '../items/ItemContainer';
import type { ItemUse } from '../interaction/ItemUse';
import type { GameSave } from '../save/SaveGame';
import type { SurvivalLoop } from '../survival/SurvivalLoop';
import type { CraftService } from '../crafting/CraftService';
import { KeyboardMouseState, TouchInputState } from '../input/InputState';
import type { Viewport } from '../systems/Viewport';
import { EventBus } from './EventBus';

export interface GameSession {
  /** Atributos do jogador em jogo (o HUD lê daqui). */
  stats: PlayerStats | null;
  /** Relógio da partida em andamento. */
  clock: GameClock | null;
  /** O que o jogador carrega (o painel de inventário lê daqui). */
  inventory: PlayerInventory | null;
  /** Recipiente do mundo aberto agora (geladeira, porta-malas...), ou null. */
  openContainer: { id: string; name: string; container: ItemContainer } | null;
  /** Dia de jogo atual (fração), para condição de itens na interface. */
  nowDays: () => number;
  /** Alvo de interação atual (o botão e o aviso do HUD leem daqui). */
  interaction: InteractionTarget | null;
  /** HUD com painel aberto por cima do ponteiro: o mouse não mira. */
  pointerOverUi: boolean;
  paused: boolean;
  /** Corpo, clima, ações com tempo (o HUD lê daqui). */
  survival: SurvivalLoop | null;
  /** Ações de item (o painel pergunta o que dá para fazer). */
  itemUse: ItemUse | null;
  /** Menu "⋯": ações por perto montadas no último pedido. */
  options: { label: string; enabled: boolean }[] | null;
  /** Save a carregar quando a cena do jogo começar (CONTINUAR). */
  pendingLoad: GameSave | null;
  /** Fabricação (a aba FABRICAR confere receitas por aqui). */
  crafting: CraftService | null;
  /** Modo construir ligado: o que mostrar na barra. */
  build: import('../ui/BuildBar').BuildInfo | null;
  /** Ameaça dos zumbis para o HUD (furtivo, agarrado, caído, quantos perto). */
  threat: { sneaking: boolean; grabbed: number; down: boolean; escape: number } | null;
  /** Morreu: relatório (a tela de morte mostra). */
  death: import('../survival/Death').DeathReport | null;
}

export interface GameServices {
  bus: EventBus;
  viewport: Viewport;
  touch: TouchInputState;
  keyboardMouse: KeyboardMouseState;
  assets: AssetRegistry | null;
  overrides: OverrideManifest;
  /** Opções de mundo da partida (ver config/Sandbox.ts). */
  settings: SandboxSettings;
  session: GameSession;
}

const registry = new WeakMap<Phaser.Game, GameServices>();

export function createServices(game: Phaser.Game, viewport: Viewport, bus: EventBus, settings: SandboxSettings): GameServices {
  const s: GameServices = {
    bus,
    viewport,
    touch: new TouchInputState(),
    keyboardMouse: new KeyboardMouseState(),
    assets: null,
    overrides: { sprites: {}, patterns: {} },
    settings,
    session: {
      stats: null,
      clock: null,
      inventory: null,
      openContainer: null,
      nowDays: () => 0,
      interaction: null,
      pointerOverUi: false,
      paused: false,
      survival: null,
      itemUse: null,
      crafting: null,
      build: null,
      threat: null,
      death: null,
      options: null,
      pendingLoad: null,
    },
  };
  registry.set(game, s);
  return s;
}

export function services(game: Phaser.Game): GameServices {
  const s = registry.get(game);
  if (!s) throw new Error('Serviços do jogo não inicializados');
  return s;
}
