/**
 * Serviços compartilhados entre cenas (um por jogo).
 * Evita variáveis globais soltas e deixa claro quem depende de quê.
 */
import type Phaser from 'phaser';
import type { AssetRegistry } from '../assets/AssetRegistry';
import type { OverrideManifest } from '../assets/AssetOverrides';
import type { PlayerStats } from '../entities/player/PlayerStats';
import { KeyboardMouseState, TouchInputState } from '../input/InputState';
import type { Viewport } from '../systems/Viewport';
import { EventBus } from './EventBus';

export interface GameSession {
  /** Atributos do jogador em jogo (o HUD lê daqui). */
  stats: PlayerStats | null;
  paused: boolean;
}

export interface GameServices {
  bus: EventBus;
  viewport: Viewport;
  touch: TouchInputState;
  keyboardMouse: KeyboardMouseState;
  assets: AssetRegistry | null;
  overrides: OverrideManifest;
  session: GameSession;
}

const registry = new WeakMap<Phaser.Game, GameServices>();

export function createServices(game: Phaser.Game, viewport: Viewport, bus: EventBus): GameServices {
  const s: GameServices = {
    bus,
    viewport,
    touch: new TouchInputState(),
    keyboardMouse: new KeyboardMouseState(),
    assets: null,
    overrides: { sprites: {}, patterns: {} },
    session: { stats: null, paused: false },
  };
  registry.set(game, s);
  return s;
}

export function services(game: Phaser.Game): GameServices {
  const s = registry.get(game);
  if (!s) throw new Error('Serviços do jogo não inicializados');
  return s;
}
