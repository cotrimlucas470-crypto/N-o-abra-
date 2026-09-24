/**
 * Mexer na estrutura do MAPA:
 * - DERRUBAR um trecho de parede (marreta ou picareta NA MÃO) ou de cerca
 *   (marreta, machado, pé de cabra, serrote, alicate): abre um vão de ~1 tile
 *   no ponto mais perto. Demora, cansa e faz muito barulho. Rende entulho.
 * - PREGAR TÁBUAS em janela ou porta do mapa (tábuas, pregos, martelo): vira
 *   barricada — não passa, não se vê através. Arrancar devolve parte.
 * A ferramenta precisa estar na mão para derrubar (o botão de interagir não
 * fica oferecendo "derrubar" em toda parede por que se passa).
 */
import { BUILD_TUNING } from '../config/BuildTuning';
import type { Structure } from '../build/Structures';
import { itemDef } from '../items/ItemCatalog';
import type { PlayerInventory } from '../items/PlayerInventory';
import type { WorldState } from '../sim/WorldState';
import type { Survivor } from '../survival/Survivor';
import type { DoorPlacement, WallPiece } from '../world/MapTypes';
import type { InteractionCandidate, InteractionOption, InteractionProvider, InteractionResult, Interactor } from './InteractionSystem';
import type { WorldActionHooks } from './ToolInteractions';
import { findTool, giveItems } from './toolUse';

const WALL_TOOLS = ['derrubar-parede'];
const FENCE_TOOLS = ['derrubar-parede', 'demolir', 'cortar-arame', 'serrar', 'cortar-lenha'];

const BOARD_COST = [
  { id: 'tabua', n: 2 },
  { id: 'pregos', n: 4 },
] as const;

export class DemolishInteractions implements InteractionProvider {
  constructor(
    private readonly state: WorldState,
    private readonly inventory: PlayerInventory,
    private readonly survivor: Survivor,
    private readonly hooks: WorldActionHooks,
  ) {}

  collect(who: Interactor, out: InteractionCandidate[]): void {
    const hand = this.inventory.handDef;
    if (!hand) return;
    const wallTool = hand.tags.some((t) => WALL_TOOLS.includes(t));
    const fenceTool = hand.tags.some((t) => FENCE_TOOLS.includes(t));
    if (!wallTool && !fenceTool) return;
    for (const w of this.state.wallsNear(who.x, who.y, 36 + who.radius)) {
      const fence = w.wall.kind === 'fence';
      if (fence ? !fenceTool : !wallTool) continue;
      const label = fence ? 'Derrubar trecho da cerca' : 'Derrubar trecho da parede';
      // Ponto do vão: o ponto da parede mais perto do jogador.
      const px = Math.max(w.wall.x, Math.min(who.x, w.wall.x + w.wall.w));
      const py = Math.max(w.wall.y, Math.min(who.y, w.wall.y + w.wall.h));
      out.push({
        target: { key: `parede:${w.id}:${Math.round(px / 32)},${Math.round(py / 32)}`, kind: 'wall', x: px, y: py, radius: 30, verb: 'DERRUBAR', label, enabled: true },
        // Porta, recipiente, item: tudo ganha da parede.
        distance: w.distance - who.radius + 35,
        perform: () => this.demolish(w.wall, w.id, px, py),
      });
    }
  }

  private demolish(wall: WallPiece, id: string, x: number, y: number): InteractionResult {
    const fence = wall.kind === 'fence';
    const tool = findTool(this.inventory, fence ? FENCE_TOOLS : WALL_TOOLS, true);
    if (!tool) return { ok: false, message: fence ? 'Precisa de marreta, machado, serrote ou alicate na mão.' : 'Precisa de marreta ou picareta na mão.' };
    if (this.survivor.body.fatigue > 90) return { ok: false, message: 'Cansado demais para isso.' };
    const base = fence ? BUILD_TUNING.demolishFenceMinutes : BUILD_TUNING.demolishWallMinutes;
    this.hooks.start({
      id: 'derrubarParede',
      label: fence ? 'Derrubando a cerca' : 'Derrubando a parede',
      minutes: Math.max(3, Math.round(base * this.survivor.effects().actionTime)),
      done: () => {
        if (!this.state.cutWall(id, x, y)) return { ok: false, message: 'Aí já está aberto.' };
        const broke = tool.wear(fence ? 3 : 10);
        this.survivor.body.fatigue = Math.min(100, this.survivor.body.fatigue + (fence ? 3 : BUILD_TUNING.demolishFatigue));
        this.hooks.noise(x, y, fence ? BUILD_TUNING.demolishNoise * 0.6 : BUILD_TUNING.demolishNoise, 'demolição');
        const got = giveItems(this.inventory, fence ? BUILD_TUNING.fenceRubble : BUILD_TUNING.wallRubble, (defId, count) => this.hooks.drop([{ defId, count }], x, y), (i) => itemDef(i)?.name ?? i);
        return { ok: true, message: `${fence ? 'Cerca' : 'Parede'} aberta. +${got}${broke ? ` ${broke}` : ''}`, tone: 'ok' };
      },
    });
    return { ok: true };
  }
}

// ---------------------------------------------------------------- tábuas pregadas (janelas e portas do mapa)

function hasBoards(inv: PlayerInventory): boolean {
  return BOARD_COST.every((c) => inv.countOf(c.id) >= c.n);
}

function payBoards(inv: PlayerInventory): boolean {
  if (!hasBoards(inv)) return false;
  for (const c of BOARD_COST) {
    let left: number = c.n;
    for (const s of [...inv.stacks()]) {
      if (left <= 0) break;
      if (s.def.id !== c.id) continue;
      const i = s.container.stacks.indexOf(s.stack);
      const got = s.container.take(i, left);
      left -= got?.count ?? 0;
    }
  }
  inv.changed();
  return true;
}

export interface BoardSpot {
  /** Id da janela/porta (a barricada guarda). */
  id: string;
  x: number;
  y: number;
  len: number;
  vertical: boolean;
}

export function windowSpot(wall: WallPiece, id: string): BoardSpot {
  const vertical = wall.h > wall.w;
  return { id, x: wall.x + wall.w / 2, y: wall.y + wall.h / 2, len: vertical ? wall.h : wall.w, vertical };
}

export function doorSpot(d: DoorPlacement): BoardSpot {
  return { id: d.id, x: d.x, y: d.y, len: d.length, vertical: d.vertical };
}

/** "Pregar tábuas" / "Arrancar tábuas" para uma janela ou porta do mapa. */
export function boardOptions(state: WorldState, inv: PlayerInventory, survivor: Survivor, hooks: WorldActionHooks, spot: BoardSpot, what: string): InteractionOption[] {
  const boards = state.boardedOn(spot.id);
  if (boards) return [pryOption(state, inv, hooks, boards, what)];
  const hammer = findTool(inv, ['martelar']);
  return [
    {
      label: `Pregar tábuas ${what}`,
      enabled: !!hammer && hasBoards(inv),
      perform: () => {
        if (!hammer) return { ok: false, message: 'Precisa de martelo.' };
        if (!hasBoards(inv)) return { ok: false, message: 'Precisa de 2 tábuas e 4 pregos.' };
        hooks.start({
          id: 'pregarTabuas',
          label: `Pregando tábuas ${what}`,
          minutes: Math.max(3, Math.round(12 / survivor.skills.speed('carpintaria'))),
          done: () => {
            if (state.boardedOn(spot.id)) return { ok: false, message: 'Já está pregada.' };
            if (!payBoards(inv)) return { ok: false, message: 'Faltou tábua ou prego.' };
            hammer.wear(1);
            state.structures.add('tabuasPregadas', spot.x, spot.y, spot.vertical ? 1 : 0, { len: spot.len, on: spot.id });
            hooks.noise(spot.x, spot.y, BUILD_TUNING.hammerNoise, 'martelo');
            survivor.skills.gain('carpintaria', 3);
            return { ok: true, message: 'Tábuas pregadas: ninguém passa por aí.', tone: 'ok' };
          },
        });
        return { ok: true };
      },
    },
  ];
}

function pryOption(state: WorldState, inv: PlayerInventory, hooks: WorldActionHooks, boards: Structure, what: string): InteractionOption {
  const bar = findTool(inv, ['alavanca', 'martelar']);
  return {
    label: `Arrancar as tábuas ${what}`,
    enabled: !!bar,
    perform: () => {
      if (!bar) return { ok: false, message: 'Precisa de pé de cabra ou martelo.' };
      hooks.start({
        id: 'arrancarTabuas',
        label: 'Arrancando as tábuas',
        minutes: 6,
        done: () => {
          if (!state.structures.get(boards.id)) return { ok: false, message: 'Já foram arrancadas.' };
          state.removeStructure(boards.id);
          bar.wear(1);
          const got = giveItems(inv, [{ id: 'tabua', n: 1 }, { id: 'pregos', n: 2 }], (defId, count) => hooks.drop([{ defId, count }], boards.x, boards.y), (i) => itemDef(i)?.name ?? i);
          hooks.noise(boards.x, boards.y, 300, 'tábuas');
          return { ok: true, message: `Tábuas arrancadas. +${got}`, tone: 'ok' };
        },
      });
      return { ok: true };
    },
  };
}
