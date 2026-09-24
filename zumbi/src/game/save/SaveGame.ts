/**
 * SAVE no aparelho (localStorage). Um slot + BACKUP automático:
 *
 * - Antes de gravar, o save anterior vira backup (`.bak`). Se o save novo
 *   vier corrompido ou a gravação falhar no meio, o backup ainda está lá.
 * - Começar um jogo novo NÃO apaga nada: o save atual é arquivado (`.old`)
 *   e a tela de título pede confirmação antes (regra do projeto).
 * - Carregar tenta o slot; se estiver ilegível, tenta o backup.
 *
 * O conteúdo vem de cada sistema (`serialize()`/`snapshot()`); aqui só se
 * junta, versiona e grava. Campo desconhecido é ignorado ao carregar.
 */
import { GAME_VERSION } from '../config/GameConfig';
import type { SandboxSettings } from '../config/Sandbox';
import { readJson, writeJson } from '../core/Storage';
import type { PlayerStatsSnapshot } from '../entities/player/PlayerStats';
import type { PlayerInventorySave } from '../items/PlayerInventory';
import type { ClockSnapshot } from '../sim/GameClock';
import type { WorldStateSave } from '../sim/WorldState';
import type { BodySnapshot } from '../survival/Body';

export interface GameSave {
  version: 1;
  /** Data real da gravação (ISO). */
  savedAt: string;
  /** Versão do jogo que gravou. */
  game: string;
  settings: SandboxSettings;
  clock: ClockSnapshot;
  player: { x: number; y: number; facing: number; stats: PlayerStatsSnapshot };
  body: BodySnapshot;
  inventory: PlayerInventorySave;
  world: WorldStateSave;
  /** Módulos das etapas seguintes (ferimentos, habilidades, veículos, obras...). */
  modules?: Record<string, unknown>;
}

export interface SaveSummary {
  day: number;
  savedAt: string;
  game: string;
}

const SLOT = 'save.slot1';
const BACKUP = 'save.slot1.bak';
const ARCHIVE = 'save.slot1.old';

function valid(s: unknown): s is GameSave {
  const g = s as GameSave | null;
  return !!g && g.version === 1 && typeof g.clock?.minutes === 'number' && !!g.world && !!g.inventory && !!g.player && !!g.settings;
}

export function saveGame(data: Omit<GameSave, 'version' | 'savedAt' | 'game'>): boolean {
  const full: GameSave = { version: 1, savedAt: new Date().toISOString(), game: GAME_VERSION, ...data };
  const prev = readJson<unknown>(SLOT, null);
  if (valid(prev)) writeJson(BACKUP, prev);
  return writeJson(SLOT, full);
}

/** Save atual (ou o backup, se o atual estiver estragado). */
export function loadGame(): GameSave | null {
  const s = readJson<unknown>(SLOT, null);
  if (valid(s)) return s;
  const b = readJson<unknown>(BACKUP, null);
  return valid(b) ? b : null;
}

export function saveSummary(): SaveSummary | null {
  const s = loadGame();
  if (!s) return null;
  return { day: Math.floor(s.clock.minutes / 1440) + 1, savedAt: s.savedAt, game: s.game };
}

/**
 * Jogo novo: o save atual é ARQUIVADO (não apagado). O próximo salvamento
 * automático do jogo novo grava no slot; o antigo continua em `.old`.
 */
export function archiveCurrent(): void {
  const s = readJson<unknown>(SLOT, null);
  if (valid(s)) writeJson(ARCHIVE, s);
}
