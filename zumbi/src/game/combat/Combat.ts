/**
 * COMBATE e FORÇA BRUTA (puro): golpe corpo a corpo e tiro contra o que
 * estiver à frente — móvel, porta, janela (e, na etapa dos zumbis, corpos).
 *
 * - Dano = arma (ou soco) × condição da arma × estado físico × material do
 *   alvo (machado racha madeira; faca quase não faz nada em metal).
 * - Toda pancada gasta fôlego, faz barulho e desgasta a arma; soco em coisa
 *   dura machuca a mão; soco em vidro corta (luva protege).
 * - Tiro: precisa de bala na arma, pode emperrar (arma gasta/suja/enferrujada
 *   emperra mais), atravessa vidro, para em parede, faz MUITO barulho.
 * Quem chama desenha o efeito, larga os destroços e mostra a mensagem.
 */
import { clamp } from '../core/math';
import { Flag, condition, effectiveness, isBroken, jamChance, type ItemState } from '../items/condition';
import { itemDef } from '../items/ItemCatalog';
import type { ItemDef } from '../items/ItemTypes';
import type { PlayerInventory } from '../items/PlayerInventory';
import type { TimedActionSpec } from '../sim/Actions';
import { WorldState } from '../sim/WorldState';
import type { Survivor } from '../survival/Survivor';
import { propSolids } from '../world/collision';
import { doorGapRect, doorLabel } from '../world/doors';
import type { DoorPlacement, PropPlacement, WallPiece } from '../world/MapTypes';
import { IMPACT_NOISE, PROP_DURABILITY, type Material } from '../world/PropDurability';
import { chunkKey, chunkOf } from '../sim/ChunkGrid';

export interface Drop {
  defId: string;
  count: number;
  st?: ItemState;
  x: number;
  y: number;
}

export interface AttackResult {
  ok: boolean;
  message?: string;
  tone?: 'ok' | 'info' | 'warn' | 'bad';
  /** Onde bateu e como ficou (para a barrinha de resistência). */
  hit?: { x: number; y: number; name: string; hp: number; max: number; destroyed: boolean };
  noise?: { x: number; y: number; radius: number; source: string };
  drops?: Drop[];
  /** Tiro: linha do disparo. */
  tracer?: { x1: number; y1: number; x2: number; y2: number };
  /** Golpe: arco do movimento. */
  swing?: { x: number; y: number; angle: number; reach: number };
  /** Segundos até poder bater de novo. */
  cooldown: number;
}

export interface CombatHooks {
  stamina(): number;
  spendStamina(n: number): void;
}

/** Soco: arma "invisível". */
const FIST = { damage: 3, speed: 1.4, reach: 0.45, durability: Infinity, kind: 'impacto' as const };

type Target =
  | { kind: 'prop'; prop: PropPlacement; dist: number; x: number; y: number }
  | { kind: 'door'; door: DoorPlacement; dist: number; x: number; y: number }
  | { kind: 'window'; wall: WallPiece; id: string; dist: number; x: number; y: number };

/** Quanto cada tipo de golpe rende em cada material. */
function materialFactor(kind: 'corte' | 'impacto' | 'perfuracao', tags: readonly string[], m: Material): number {
  if (m === 'vidro') return 3;
  if (m === 'planta') return tags.includes('cortar-lenha') ? 1.6 : kind === 'corte' ? 0.4 : 0.15;
  if (m === 'pedra') return tags.includes('quebrar-pedra') ? 1.4 : 0.1;
  if (m === 'metal') return tags.includes('demolir') ? 0.8 : kind === 'impacto' ? 0.45 : 0.2;
  if (m === 'madeira') return tags.includes('cortar-lenha') || tags.includes('demolir') ? 1.5 : kind === 'corte' ? 0.8 : 1;
  if (m === 'tecido') return kind === 'corte' ? 1.4 : 0.6;
  return 1;
}

const DEG = Math.PI / 180;

function edgeDist(x: number, y: number, p: PropPlacement): number {
  let best = Infinity;
  for (const s of propSolids(p)) {
    const d = s.kind === 'circle' ? Math.hypot(x - s.x, y - s.y) - s.r : Math.hypot(Math.max(s.x - x, 0, x - (s.x + s.w)), Math.max(s.y - y, 0, y - (s.y + s.h)));
    best = Math.min(best, d);
  }
  return best;
}

function rectDist(x: number, y: number, r: { x: number; y: number; w: number; h: number }): number {
  return Math.hypot(Math.max(r.x - x, 0, x - (r.x + r.w)), Math.max(r.y - y, 0, y - (r.y + r.h)));
}

/** Ângulo entre a direção do olhar e o alvo (rad). */
function off(facing: number, x: number, y: number, tx: number, ty: number): number {
  const a = Math.atan2(ty - y, tx - x);
  return Math.abs(Math.atan2(Math.sin(a - facing), Math.cos(a - facing)));
}

export class Combat {
  constructor(
    private readonly state: WorldState,
    private readonly survivor: Survivor,
    private readonly inventory: PlayerInventory,
    private readonly hooks: CombatHooks,
    private readonly rng: () => number = Math.random,
  ) {}

  /** A arma na mão (null = mãos livres). */
  private weapon(): { def: ItemDef | null; st: ItemState | undefined } {
    const h = this.inventory.hand;
    const d = h ? itemDef(h.defId) : null;
    return { def: d, st: h?.st };
  }

  /** Alvo à frente dentro do alcance. */
  findTarget(x: number, y: number, facing: number, reach: number, arc = 65 * DEG): Target | null {
    let best: Target | null = null;
    const consider = (t: Target, cx: number, cy: number) => {
      if (t.dist > reach || off(facing, x, y, cx, cy) > arc) return;
      if (!best || t.dist < best.dist) best = t;
    };
    for (const { prop } of this.state.propsNear(x, y, reach + 140)) {
      if (!PROP_DURABILITY[prop.type]) continue;
      consider({ kind: 'prop', prop, dist: edgeDist(x, y, prop), x: prop.x, y: prop.y }, prop.x, prop.y);
    }
    const map = this.state.model.map;
    const { cx, cy } = chunkOf(x, y);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (const i of this.state.model.index.get(chunkKey(cx + dx, cy + dy))?.doors ?? []) {
          const d = map.doors[i]!;
          const st = this.state.doorState(d.id);
          if (!st || st.open || st.broken) continue;
          consider({ kind: 'door', door: d, dist: rectDist(x, y, doorGapRect(d)), x: d.x, y: d.y }, d.x, d.y);
        }
      }
    }
    for (const w of this.state.windowsNear(x, y, reach)) {
      if (this.state.isWindowBroken(w.id)) continue;
      const wx = w.wall.x + w.wall.w / 2;
      const wy = w.wall.y + w.wall.h / 2;
      consider({ kind: 'window', wall: w.wall, id: w.id, dist: w.distance, x: wx, y: wy }, wx, wy);
    }
    return best;
  }

  /** Golpe corpo a corpo para onde o jogador olha. */
  melee(x: number, y: number, facing: number): AttackResult {
    const { def, st } = this.weapon();
    const m = def?.melee ?? FIST;
    const fx = this.survivor.effects();
    const weight = def?.weight ?? 0;
    const cost = 3 + weight * 2.2;
    if (this.hooks.stamina() < cost * 0.5) return { ok: false, message: 'Sem fôlego para bater.', tone: 'warn', cooldown: 0.4 };
    if (def && isBroken(def, st)) return { ok: false, message: `${def.name} está quebrado.`, tone: 'warn', cooldown: 0.3 };
    this.hooks.spendStamina(cost);
    const reach = 34 + m.reach * 56;
    const cooldown = clamp(0.95 / (m.speed * (0.6 + 0.4 * fx.melee)), 0.35, 2.2);
    const swing = { x, y, angle: facing, reach };
    const t = this.findTarget(x, y, facing, reach);
    if (!t) return { ok: true, swing, cooldown };
    const tags = def?.tags ?? [];
    const base = m.damage * (def ? effectiveness(def, st) : 1) * fx.melee;
    return { ...this.hitTarget(t, base, m.kind, tags, !def, 'golpe'), swing, cooldown };
  }

  /** Aplica dano no alvo (golpe ou tiro). */
  private hitTarget(t: Target, base: number, kind: 'corte' | 'impacto' | 'perfuracao', tags: readonly string[], bare: boolean, source: string): Omit<AttackResult, 'cooldown'> {
    const drops: Drop[] = [];
    let message: string | undefined;
    let tone: AttackResult['tone'] = 'info';
    if (t.kind === 'prop') {
      const dur = PROP_DURABILITY[t.prop.type]!;
      const dmg = base * materialFactor(kind, tags, dur.material);
      const hp = this.state.damageProp(t.prop.id, dmg, dur.hp);
      this.wearWeapon(dur.material === 'metal' || dur.material === 'pedra' ? 2 : 1);
      if (bare) message = this.hurtHand(dur.material);
      const destroyed = hp <= 0;
      if (destroyed) {
        for (const c of this.state.removeProp(t.prop.id)) drops.push({ ...c, x: t.prop.x, y: t.prop.y });
        for (const y of dur.debris ?? []) drops.push({ defId: y.item, count: y.n, x: t.prop.x, y: t.prop.y });
        message = `${cap(dur.name)} quebrou.`;
        tone = 'ok';
      }
      return { ok: true, ...(message ? { message, tone } : {}), hit: { x: t.x, y: t.y, name: dur.name, hp: Math.max(0, hp), max: dur.hp, destroyed }, noise: { x: t.x, y: t.y, radius: IMPACT_NOISE[dur.material] * (destroyed ? 1.3 : 1), source }, drops };
    }
    if (t.kind === 'door') {
      const d = t.door;
      const material: Material = d.material === 'glass' ? 'vidro' : d.material === 'metal' ? 'metal' : 'madeira';
      const max = this.state.doorHealth(d.id);
      const hp = this.state.damageDoor(d.id, base * materialFactor(kind, tags, material));
      this.wearWeapon(material === 'metal' ? 2 : 1);
      if (bare) message = this.hurtHand(material);
      const destroyed = hp <= 0;
      if (destroyed) {
        message = d.material === 'glass' ? 'O vidro da porta estourou!' : 'A porta cedeu!';
        tone = 'ok';
      }
      return { ok: true, ...(message ? { message, tone } : {}), hit: { x: t.x, y: t.y, name: doorLabel(d), hp: Math.max(0, hp), max: Math.max(max, 1), destroyed }, noise: { x: t.x, y: t.y, radius: IMPACT_NOISE[material] * (destroyed ? 1.4 : 1.1), source } };
    }
    // Janela
    this.state.breakWindow(t.wall);
    this.wearWeapon(0.5);
    if (bare) {
      const gloves = this.inventory.protection(['maos']).scratch;
      if (this.rng() > gloves * 1.5) {
        this.survivor.health.add(this.rng() < 0.5 ? 'maoE' : 'maoD', 'corte', 0.3 + this.rng() * 0.4);
        message = 'Quebrou a janela com a mão. Cortou!';
        tone = 'bad';
      }
    }
    return { ok: true, message: message ?? 'A janela estourou.', tone: message ? tone : 'info', hit: { x: t.x, y: t.y, name: 'janela', hp: 0, max: 1, destroyed: true }, noise: { x: t.x, y: t.y, radius: IMPACT_NOISE.vidro, source: 'vidro' } };
  }

  /** Soco em coisa dura machuca (luva grossa protege). */
  private hurtHand(m: Material): string | undefined {
    if (m === 'tecido' || m === 'planta') return undefined;
    const gloves = this.inventory.protection(['maos']).scratch;
    if (this.rng() < (m === 'metal' || m === 'pedra' ? 0.45 : 0.25) * (1 - gloves)) {
      this.survivor.health.add(this.rng() < 0.5 ? 'maoE' : 'maoD', 'contusao', 0.25 + this.rng() * 0.3);
      return 'Machucou a mão.';
    }
    return undefined;
  }

  /** Desgasta a arma/ferramenta da mão (um golpe = 1/durabilidade). */
  private wearWeapon(mult: number): void {
    const h = this.inventory.hand;
    const def = h ? itemDef(h.defId) : null;
    if (!h || !def?.melee || def.condition !== 'durable') return;
    const c = Math.max(0, condition(h.st) - mult / def.melee.durability);
    this.inventory.updateHand({ ...(h.st ?? {}), c });
  }

  // ---------------------------------------------------------------- armas de fogo

  /** Atira para onde o jogador olha. */
  shoot(x: number, y: number, facing: number): AttackResult {
    const { def, st } = this.weapon();
    const g = def?.gun;
    if (!def || !g) return { ok: false, message: 'Nada para atirar.', tone: 'warn', cooldown: 0.3 };
    if (((st?.f ?? 0) & Flag.Emperrada) !== 0) return { ok: false, message: 'Arma emperrada. DESTRAVAR.', tone: 'warn', cooldown: 0.3 };
    const am = st?.am ?? 0;
    if (am <= 0) return { ok: false, message: 'Clique. Sem bala.', tone: 'warn', cooldown: 0.4 };
    if (this.rng() < jamChance(def, st)) {
      this.inventory.updateHand({ ...(st ?? {}), f: (st?.f ?? 0) | Flag.Emperrada });
      return { ok: false, message: 'Emperrou!', tone: 'bad', cooldown: 0.5 };
    }
    const fx = this.survivor.effects();
    const spread = (this.rng() - 0.5) * (0.04 + fx.aimShake * 0.25);
    const a = facing + spread;
    const range = g.range * 64;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    this.inventory.updateHand({ ...(st ?? {}), am: am - 1, c: Math.max(0, condition(st) - 0.002) });
    const noise = { x, y, radius: g.noise, source: 'tiro' };
    const near = this.state.propsNear(x + (dx * range) / 2, y + (dy * range) / 2, range / 2 + 120).filter(({ prop }) => PROP_DURABILITY[prop.type]);
    let end = { x: x + dx * range, y: y + dy * range };
    let hit: AttackResult | null = null;
    for (let d = 20; d <= range; d += 8) {
      const px = x + dx * d;
      const py = y + dy * d;
      // Janela: estoura e a bala segue.
      const win = this.state.windowsNear(px, py, 2).find((w) => !this.state.isWindowBroken(w.id));
      if (win) this.state.breakWindow(win.wall);
      const door = this.doorAt(px, py);
      if (door) {
        const t: Target = { kind: 'door', door, dist: d, x: px, y: py };
        hit = { ...this.hitTarget(t, g.damage * 1.2, 'perfuracao', ['bala'], false, 'tiro'), cooldown: 0 };
        end = { x: px, y: py };
        break;
      }
      const p = near.find(({ prop }) => edgeDist(px, py, prop) <= 0);
      if (p) {
        hit = { ...this.hitTarget({ kind: 'prop', prop: p.prop, dist: d, x: px, y: py }, g.damage, 'perfuracao', ['bala'], false, 'tiro'), cooldown: 0 };
        end = { x: px, y: py };
        break;
      }
      if (this.opaqueAt(px, py)) {
        end = { x: px, y: py };
        break;
      }
    }
    const cooldown = def.sub === 'automatica' ? 0.12 : def.sub === 'espingarda' || def.sub === 'rifle' ? 0.9 : 0.35;
    return {
      ok: true,
      tracer: { x1: x + dx * 18, y1: y + dy * 18, x2: end.x, y2: end.y },
      noise,
      cooldown,
      ...(hit?.hit ? { hit: hit.hit } : {}),
      ...(hit?.drops?.length ? { drops: hit.drops } : {}),
      ...(hit?.message ? { message: hit.message, tone: hit.tone } : {}),
    };
  }

  private opaqueAt(x: number, y: number): boolean {
    const s = this.state.model.sight;
    return s.isOpaque(Math.floor(x / s.cell), Math.floor(y / s.cell));
  }

  private doorAt(x: number, y: number): DoorPlacement | null {
    const map = this.state.model.map;
    for (const i of this.state.model.index.get(this.state.model.index.chunkOfPoint(x, y))?.doors ?? []) {
      const d = map.doors[i]!;
      const st = this.state.doorState(d.id);
      if (!st || st.open || st.broken) continue;
      if (rectDist(x, y, doorGapRect(d)) <= 0) return d;
    }
    return null;
  }

  /** Munição que serve na arma, espalhada pelo inventário. */
  private ammoFor(caliber: string): { container: import('../items/ItemContainer').ItemContainer; index: number; count: number }[] {
    const out: { container: import('../items/ItemContainer').ItemContainer; index: number; count: number }[] = [];
    for (const s of this.inventory.stacks()) if (s.def.ammo && s.def.ammo.rounds > 0 && s.def.ammo.caliber === caliber) out.push({ container: s.container, index: s.index, count: s.stack.count });
    return out;
  }

  /** Recarregar (ação com tempo) — ou o motivo de não dar. */
  reload(speed = 1): TimedActionSpec | string {
    const { def, st } = this.weapon();
    const g = def?.gun;
    if (!def || !g) return 'Nada para recarregar.';
    const need = g.capacity - (st?.am ?? 0);
    if (need <= 0) return 'Já está cheia.';
    const have = this.ammoFor(g.caliber).reduce((n, a) => n + a.count, 0);
    if (have <= 0) return `Sem munição ${g.caliber === '12' ? 'calibre 12' : g.caliber}.`;
    const n = Math.min(need, have);
    // Com carregador extra, a troca é rápida; bala por bala demora.
    const spare = g.magazine ? this.inventory.countOf(g.magazine) > 0 : false;
    const minutes = (spare ? 0.8 : 0.3 + n * 0.12) * speed;
    return {
      id: 'recarregar',
      label: `Recarregando ${def.name.toLowerCase()}`,
      minutes,
      realSeconds: Math.max(0.8, minutes * 1.6),
      done: () => {
        const h = this.inventory.hand;
        if (!h || h.defId !== def.id) return { ok: false, message: 'A arma saiu da mão.', tone: 'warn' };
        let left = Math.min(g.capacity - (h.st?.am ?? 0), n);
        let loaded = 0;
        for (const a of this.ammoFor(g.caliber).reverse()) {
          if (left <= 0) break;
          const k = Math.min(left, a.count);
          a.container.take(a.index, k);
          left -= k;
          loaded += k;
        }
        this.inventory.updateHand({ ...(h.st ?? {}), am: (h.st?.am ?? 0) + loaded });
        return { ok: true, message: `Recarregou (${(h.st?.am ?? 0) + loaded}/${g.capacity}).`, tone: 'ok' };
      },
    };
  }

  /** Destravar arma emperrada. */
  unjam(): TimedActionSpec | string {
    const { def, st } = this.weapon();
    if (!def?.gun || ((st?.f ?? 0) & Flag.Emperrada) === 0) return 'Não está emperrada.';
    return {
      id: 'destravar',
      label: 'Destravando a arma',
      minutes: 0.6,
      realSeconds: 1.2,
      done: () => {
        const h = this.inventory.hand;
        if (h) this.inventory.updateHand({ ...(h.st ?? {}), f: (h.st?.f ?? 0) & ~Flag.Emperrada });
        return { ok: true, message: 'Arma destravada.', tone: 'ok' };
      },
    };
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Id de janela exportado para a interface. */
export const windowIdOf = WorldState.windowId;
