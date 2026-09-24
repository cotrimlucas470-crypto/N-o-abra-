/**
 * ZUMBI × AMBIENTE (puro): o que ele faz quando a rota passa por uma porta,
 * janela ou construção.
 *
 * - Porta destrancada que abre PARA LONGE dele: empurra e abre (quem tem
 *   mais coordenação consegue antes). Senão, BATE.
 * - Batida tira resistência conforme força, braços que funcionam, material
 *   (vidro cede rápido, madeira aguenta, metal/tijolo aguentam muito) e a
 *   PRESSÃO do grupo: cada zumbi a mais no mesmo alvo soma e acelera.
 *   Estragos ficam (100% → 80% → 50% → 20% → quebrado) e vão para o save.
 * - Janela: quebra o vidro; tábuas pregadas precisam cair antes; janela
 *   aberta/quebrada ele PULA (devagar, dá para acertar a cabeça).
 * - Toda pancada faz barulho — que chama mais zumbis.
 */
import { ZOMBIE_TUNING as T } from '../config/ZombieTuning';
import { STRUCTURE_DEFS } from '../build/StructureCatalog';
import type { SolidIndex, TaggedSolid } from '../sim/SolidIndex';
import { WorldState } from '../sim/WorldState';
import type { NoiseKind } from '../sim/Noise';
import type { WallPiece } from '../world/MapTypes';
import type { ZombieDifficulty } from './Difficulty';
import { workingArms, type Obstacle, type Zombie } from './Zombie';

export interface ObstacleCtx {
  state: WorldState;
  diff: ZombieDifficulty;
  rng: () => number;
  noise(x: number, y: number, kind: NoiseKind, radius?: number, source?: string): void;
}

/** Obstáculo quebrável a partir do que o zumbi encostou (ou null = parede/objeto duro). */
export function obstacleFrom(tag: TaggedSolid, state: WorldState): Obstacle | null {
  if (tag.kind === 'door') {
    const d = state.doorById(tag.id);
    if (!d) return null;
    const boards = state.boardedOn(d.id);
    if (boards) return { kind: 'structure', id: boards.id, x: boards.x, y: boards.y };
    return { kind: 'door', id: d.id, x: d.x, y: d.y };
  }
  if (tag.kind === 'window') {
    const w = state.model.map.walls[Number(tag.id)];
    if (!w) return null;
    const wid = WorldState.windowId(w);
    const boards = state.boardedOn(wid);
    if (boards) return { kind: 'structure', id: boards.id, x: boards.x, y: boards.y };
    return { kind: 'window', id: tag.id, x: w.x + w.w / 2, y: w.y + w.h / 2 };
  }
  if (tag.kind === 'structure') {
    const s = state.structures.get(tag.id);
    if (!s) return null;
    return { kind: 'structure', id: s.id, x: s.x, y: s.y };
  }
  return null;
}

/** O obstáculo ainda está lá (fechado/inteiro)? */
export function obstacleStands(o: Obstacle, state: WorldState): boolean {
  if (o.kind === 'door') {
    const s = state.doorState(o.id);
    return !!s && !s.open && !s.broken;
  }
  if (o.kind === 'window') {
    const w = state.model.map.walls[Number(o.id)];
    return !!w && !state.isWindowBroken(WorldState.windowId(w));
  }
  if (o.kind === 'structure') {
    const s = state.structures.get(o.id);
    return !!s && STRUCTURE_DEFS[s.type].solid && !(s.type === 'portaMadeira' && s.open);
  }
  return false;
}

/** Chave do obstáculo (contar quantos batem no mesmo). */
export function obstacleKey(o: Obstacle): string {
  return `${o.kind}:${o.id}`;
}

/** Tenta empurrar a porta (só destrancada e abrindo para longe dele). */
export function tryPushDoor(z: Zombie, o: Obstacle, dt: number, ctx: ObstacleCtx): boolean {
  if (o.kind !== 'door') return false;
  const d = ctx.state.doorById(o.id);
  const st = ctx.state.doorState(o.id);
  if (!d || !st || st.locked || st.broken || st.open || d.style === 'rolling') return false;
  // Lado dele em relação à parede; a folha abre para `swing`: empurra quem está do lado oposto.
  const side = d.vertical ? Math.sign(z.x - d.x) : Math.sign(z.y - d.y);
  if (side !== -d.swing) return false;
  if (ctx.rng() >= T.pushDoorChance * z.traits.coordination * dt) return false;
  if (!ctx.state.setDoorOpen(d.id, true)) return false;
  ctx.noise(d.x, d.y, 'porta', undefined, 'porta empurrada');
  return true;
}

/** Quanto o material aguenta pancada (multiplica o dano). */
function materialFactor(o: Obstacle, state: WorldState): number {
  if (o.kind === 'door') {
    const d = state.doorById(o.id);
    return d?.material === 'glass' ? 3 : d?.material === 'metal' ? 0.28 : 1;
  }
  if (o.kind === 'window') return 2.5;
  const s = state.structures.get(o.id);
  if (!s) return 1;
  const m = STRUCTURE_DEFS[s.type].material;
  return m === 'tijolo' ? 0.2 : m === 'metal' ? 0.16 : m === 'pedra' ? 0.2 : m === 'tecido' ? 1.6 : 1;
}

/**
 * Uma pancada (o zumbi bate de tempos em tempos, não todo quadro).
 * `pressure` = quantos zumbis estão no mesmo alvo agora.
 * Devolve 'broken' quando cedeu.
 */
export function bangOnce(z: Zombie, o: Obstacle, interval: number, pressure: number, ctx: ObstacleCtx): 'broken' | 'hit' | 'gone' {
  const state = ctx.state;
  if (!obstacleStands(o, state)) return 'gone';
  const arms = Math.max(0.35, workingArms(z) / 2);
  const group = 1 + T.groupPressure * Math.max(0, pressure - 1);
  const amount = T.bangDps * interval * z.traits.strength * ctx.diff.destruction * arms * materialFactor(o, state) * group;
  if (o.kind === 'door') {
    const d = state.doorById(o.id)!;
    const hp = state.damageDoor(o.id, amount);
    const glass = d.material === 'glass';
    if (hp <= 0) {
      ctx.noise(d.x, d.y, glass ? 'vidro' : 'demolicao', glass ? undefined : 900, glass ? 'vidro da porta' : 'porta arrombada');
      return 'broken';
    }
    ctx.noise(d.x, d.y, 'batida', d.material === 'metal' ? 520 : 420, 'batida na porta');
    return 'hit';
  }
  if (o.kind === 'window') {
    const w = state.model.map.walls[Number(o.id)]!;
    if (state.damageWindow(w, amount)) {
      ctx.noise(o.x, o.y, 'vidro', undefined, 'janela quebrada');
      return 'broken';
    }
    ctx.noise(o.x, o.y, 'batida', 300, 'batida no vidro');
    return 'hit';
  }
  const s = state.structures.get(o.id);
  if (!s) return 'gone';
  const hp = state.damageStructure(o.id, amount);
  if (hp <= 0) {
    ctx.noise(s.x, s.y, 'demolicao', 800, `${STRUCTURE_DEFS[s.type].name.toLowerCase()} caiu`);
    return 'broken';
  }
  ctx.noise(s.x, s.y, 'batida', 440, 'batida na barricada');
  return 'hit';
}

/** Para onde vai quem pula a janela (o outro lado), ou null se não dá. */
export function climbTarget(w: WallPiece, zx: number, zy: number, solids: SolidIndex): { x: number; y: number } | null {
  const cx = w.x + w.w / 2;
  const cy = w.y + w.h / 2;
  const vertical = w.h > w.w;
  const tries: { x: number; y: number }[] = [];
  if (vertical) {
    const side = Math.sign(zx - cx) || 1;
    const tx = cx - side * (w.w / 2 + 22);
    tries.push({ x: tx, y: Math.min(Math.max(zy, w.y + 16), w.y + w.h - 16) }, { x: tx, y: cy });
  } else {
    const side = Math.sign(zy - cy) || 1;
    const ty = cy - side * (w.h / 2 + 22);
    tries.push({ x: Math.min(Math.max(zx, w.x + 16), w.x + w.w - 16), y: ty }, { x: cx, y: ty });
  }
  for (const p of tries) if (solids.free(p.x, p.y, 12)) return p;
  return null;
}

/** Janela do mapa a partir do obstáculo. */
export function windowOf(o: Obstacle, state: WorldState): WallPiece | null {
  return o.kind === 'window' ? (state.model.map.walls[Number(o.id)] ?? null) : null;
}
