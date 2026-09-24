/**
 * LOCOMOÇÃO dos zumbis (puro). Sem física do Phaser: colisão exata contra a
 * geometria do mundo (SolidIndex), em passos curtos (nada atravessa parede
 * fina), com virar de corpo limitado — zumbi não anda de lado nem vira na
 * hora. Mancar, rastejar e cambalear saem do corpo (Zombie.ts).
 *
 * Longe do jogador, um passo barato pela grade de navegação mantém todos
 * andando (migrando, indo atrás de barulho) sem custar quase nada.
 */
import { ZOMBIE_TUNING as T } from '../config/ZombieTuning';
import { angleDelta, clamp, rotateTowards } from '../core/math';
import type { SolidIndex, TaggedSolid } from '../sim/SolidIndex';
import type { NavGrid } from '../world/nav/NavGrid';
import { isCrawler, isLimping, legs, type Zombie } from './Zombie';

/** Raio do corpo deste zumbi (porte e altura). */
export function bodyRadius(z: Zombie): number {
  return T.bodyRadius * (0.88 + z.look.build * 0.2) * Math.min(1.1, z.look.scale);
}

const scratch = { x: 0, y: 0 };

/**
 * Anda em direção a (tx, ty) na velocidade `speed` (px/s) por `dt`.
 * Vira o corpo primeiro; só anda na direção em que olha. Devolve em que
 * bateu (porta, janela, construção, parede) ou null.
 */
export function stepToward(z: Zombie, tx: number, ty: number, speed: number, dt: number, solids: SolidIndex, turn = 1): TaggedSolid | null {
  const dx = tx - z.x;
  const dy = ty - z.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.5) {
    z.vx = 0;
    z.vy = 0;
    return null;
  }
  const want = Math.atan2(dy, dx);
  const crawl = isCrawler(z);
  // Quem corre vira mais devagar (inércia); rastejando, quase não vira.
  const rate = T.turnRate * turn * (crawl ? 0.45 : speed > 140 ? 0.7 : 1);
  z.facing = rotateTowards(z.facing, want, rate * dt);
  const align = Math.cos(angleDelta(z.facing, want));
  let sp = speed * clamp((align + 0.25) / 1.25, 0.1, 1);
  // Mancando: o passo "puxa" (rápido/lento no ritmo da passada).
  if (isLimping(z)) {
    const l = legs(z);
    const bad = 1 - Math.min(l.left, l.right);
    sp *= 1 - bad * 0.55 * (0.5 + 0.5 * Math.sin(z.stride * Math.PI * 2));
  }
  const move = Math.min(sp * dt, dist);
  return moveBy(z, Math.cos(z.facing) * move, Math.sin(z.facing) * move, dt, solids);
}

/** Desloca com colisão em passos de até 8 px. */
export function moveBy(z: Zombie, mx: number, my: number, dt: number, solids: SolidIndex): TaggedSolid | null {
  const len = Math.hypot(mx, my);
  const steps = Math.max(1, Math.ceil(len / 8));
  const r = bodyRadius(z);
  let hit: TaggedSolid | null = null;
  const x0 = z.x;
  const y0 = z.y;
  for (let i = 0; i < steps; i++) {
    scratch.x = z.x + mx / steps;
    scratch.y = z.y + my / steps;
    const h = solids.resolve(scratch, r);
    if (h) hit = h;
    z.x = scratch.x;
    z.y = scratch.y;
  }
  const moved = Math.hypot(z.x - x0, z.y - y0);
  z.vx = dt > 0 ? (z.x - x0) / dt : 0;
  z.vy = dt > 0 ? (z.y - y0) / dt : 0;
  // Passada: 1 ciclo a cada ~70 px (ajusta com a altura).
  z.stride += moved / (isCrawler(z) ? 40 : 70 * z.look.scale);
  if (z.stride > 1e6) z.stride = 0;
  return hit;
}

/**
 * Passo barato para quem está longe: linha reta pela grade de navegação
 * (paredes e portas fechadas param); se bloquear, tenta desviar 45°/90°.
 * Devolve false se não conseguiu andar.
 */
export function farStep(z: Zombie, tx: number, ty: number, speed: number, dt: number, nav: NavGrid): boolean {
  const dist = Math.hypot(tx - z.x, ty - z.y);
  if (dist < 4) return true;
  const want = Math.atan2(ty - z.y, tx - z.x);
  const total = Math.min(speed * dt, dist);
  for (const off of [0, 0.7, -0.7, 1.4, -1.4]) {
    const a = want + off;
    let x = z.x;
    let y = z.y;
    let ok = true;
    const steps = Math.max(1, Math.ceil(total / 16));
    for (let i = 1; i <= steps; i++) {
      const nx = z.x + Math.cos(a) * (total * i) / steps;
      const ny = z.y + Math.sin(a) * (total * i) / steps;
      if (!nav.isWalkableAt(nx, ny)) {
        ok = i > 1;
        break;
      }
      x = nx;
      y = ny;
    }
    if (ok && (x !== z.x || y !== z.y)) {
      z.facing = a;
      z.stride += Math.hypot(x - z.x, y - z.y) / 70;
      z.x = x;
      z.y = y;
      z.vx = 0;
      z.vy = 0;
      return true;
    }
  }
  return false;
}

/** Peso na hora de empurrar/ser empurrado (quem ataca e quem agarra finca o pé). */
function pushWeight(z: Zombie): number {
  const s = z.mind.state;
  const planted = s === 'GRAB' || s === 'BITE' || s === 'ATTACK' || z.mind.bang ? 2.5 : 1;
  return (z.look.mass / 75) * planted * (s === 'FALL' ? 4 : 1);
}

/**
 * Separação entre dois zumbis colados: cada um sai na proporção do peso do
 * outro. Devolve true se mexeu.
 */
export function separate(a: Zombie, b: Zombie): boolean {
  if (a.floor !== b.floor) return false;
  const ra = bodyRadius(a) * (a.mind.state === 'FALL' || isCrawler(a) ? 1.3 : 1);
  const rb = bodyRadius(b) * (b.mind.state === 'FALL' || isCrawler(b) ? 1.3 : 1);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d2 = dx * dx + dy * dy;
  const min = (ra + rb) * 0.92;
  if (d2 >= min * min) return false;
  const d = Math.sqrt(d2) || 0.01;
  const nx = d2 > 1e-4 ? dx / d : Math.cos(a.facing + 1.3);
  const ny = d2 > 1e-4 ? dy / d : Math.sin(a.facing + 1.3);
  const overlap = min - d;
  const wa = pushWeight(a);
  const wb = pushWeight(b);
  const sa = wb / (wa + wb);
  a.x -= nx * overlap * sa;
  a.y -= ny * overlap * sa;
  b.x += nx * overlap * (1 - sa);
  b.y += ny * overlap * (1 - sa);
  return true;
}

/**
 * Zumbi × jogador: o zumbi não entra no jogador; quem está pressionando
 * (indo na direção dele) empurra o jogador — soma de todos = empurrão do
 * grupo. Devolve o deslocamento sugerido para o jogador.
 */
export function pressPlayer(z: Zombie, px: number, py: number, pr: number, out: { x: number; y: number }): number {
  const r = bodyRadius(z);
  const dx = px - z.x;
  const dy = py - z.y;
  const d = Math.hypot(dx, dy);
  const min = r + pr;
  if (d >= min || d < 1e-3) return 0;
  const nx = dx / d;
  const ny = dy / d;
  const overlap = min - d;
  // Pressionando: velocidade apontada para o jogador.
  const toward = Math.max(0, (z.vx * nx + z.vy * ny) / 60);
  const zw = (z.look.mass / 75) * (0.6 + toward) * z.traits.strength;
  const share = zw / (zw + 1.6);
  z.x -= nx * overlap * (1 - share);
  z.y -= ny * overlap * (1 - share);
  out.x += nx * overlap * share;
  out.y += ny * overlap * share;
  return share;
}
