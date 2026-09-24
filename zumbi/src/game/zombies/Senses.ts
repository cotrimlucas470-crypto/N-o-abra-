/**
 * SENTIDOS do zumbi (puro). Visão por cone, com alcance que depende de luz,
 * tempo, postura do jogador e dos olhos de cada um; nunca através de parede
 * (grade de visão). Audição vem do sistema de ruído (sim/Noise.ts): o zumbi
 * recebe só um palpite do lugar.
 *
 * Detecção é ACUMULADA: um vulto longe na periferia leva segundos para virar
 * certeza; de frente, perto e com luz, é quase na hora. Dá para passar
 * agachado no escuro atrás de um zumbi distraído — e dá para ser visto de
 * longe correndo com a lanterna acesa.
 */
import { ZOMBIE_TUNING as T } from '../config/ZombieTuning';
import { angleDelta } from '../core/math';
import type { SightGrid } from '../world/nav/SightGrid';
import type { Zombie } from './Zombie';

export type Posture = 'furtivo' | 'parado' | 'andando' | 'correndo';

/** O que um zumbi pode perceber do jogador (a cena preenche a cada quadro). */
export interface PlayerSense {
  x: number;
  y: number;
  floor: number;
  vx: number;
  vy: number;
  radius: number;
  posture: Posture;
  inVehicle: boolean;
  alive: boolean;
  /** Derrubado no chão. */
  down: boolean;
}

/** Luz e tempo no lugar do jogador. */
export interface LightEnv {
  /** Luz ambiente (0 breu … 1 dia claro); dentro de casa já vem menor. */
  ambient: number;
  /** Lanterna acesa (direção e alcance), ou null. */
  beam: { angle: number; range: number } | null;
  /** Chama/vela na mão ou fogueira do lado (0..1). */
  glow: number;
  /** Chuva e neblina (0..1). */
  rain: number;
  fog: number;
}

const POSTURE_VIS: Record<Posture, number> = {
  furtivo: T.sneakVisibility,
  parado: T.stillVisibility,
  andando: 1,
  correndo: T.runVisibility,
};

/** Alcance de visão do zumbi até o jogador agora (px), antes da linha de visão. */
export function sightRange(z: Zombie, p: PlayerSense, env: LightEnv, beamOnZombie: boolean): number {
  let lit = Math.max(env.ambient, env.glow * 0.85);
  if (env.beam) lit = Math.max(lit, beamOnZombie ? 1 : 0.55);
  const light = T.darkVision + (1 - T.darkVision) * lit;
  const weather = (1 - env.rain * 0.35) * (1 - env.fog * 0.55);
  const posture = p.inVehicle ? T.vehicleVisibility : POSTURE_VIS[p.posture];
  // Metade da postura mexe no alcance; a outra metade, na velocidade de perceber.
  return T.visionRange * z.traits.vision * light * weather * Math.sqrt(posture) * (z.mind.state === 'CHASE' ? 1.25 : 1);
}

/** A lanterna está apontada para o zumbi? */
export function beamHits(env: LightEnv, p: PlayerSense, zx: number, zy: number): boolean {
  if (!env.beam) return false;
  const d = Math.hypot(zx - p.x, zy - p.y);
  if (d > env.beam.range * 1.8) return false;
  return Math.abs(angleDelta(env.beam.angle, Math.atan2(zy - p.y, zx - p.x))) < 0.4;
}

/**
 * Taxa de detecção por segundo (0 = não vê). Faz a linha de visão só se
 * todo o resto permitir (é a parte cara).
 */
export function sightRate(z: Zombie, p: PlayerSense, env: LightEnv, sight: SightGrid): number {
  if (!p.alive || z.floor !== p.floor) return 0;
  const dx = p.x - z.x;
  const dy = p.y - z.y;
  const d = Math.hypot(dx, dy);
  // Colado: sente (encostou, respirou, fez sombra).
  if (d < T.touchRange) return sight.hasLineOfSight(z.x, z.y, p.x, p.y) ? 2.5 : 0;
  const off = Math.abs(angleDelta(z.facing, Math.atan2(dy, dx)));
  let ang: number;
  if (off <= T.fovHalf) ang = 1;
  else if (off <= T.peripheralHalf) ang = T.peripheralRate;
  else return 0;
  const beam = beamHits(env, p, z.x, z.y);
  const range = sightRange(z, p, env, beam);
  if (d >= range) return 0;
  if (!sight.hasLineOfSight(z.x, z.y, p.x, p.y)) return 0;
  const close = 1 - d / range;
  const posture = p.inVehicle ? T.vehicleVisibility : POSTURE_VIS[p.posture];
  const moving = Math.hypot(p.vx, p.vy) > 30 ? 1.3 : 0.8;
  return T.detectRate * ang * (0.25 + 0.75 * close * close) * Math.sqrt(posture) * moving * (beam ? 1.6 : 1) * (0.6 + 0.4 * z.traits.aggression);
}

/** Vê outro zumbi (para seguir o grupo): cone largo, sem luz (movimento chama atenção). */
export function seesZombie(z: Zombie, o: Zombie, sight: SightGrid, range: number): boolean {
  if (z.floor !== o.floor) return false;
  const d = Math.hypot(o.x - z.x, o.y - z.y);
  if (d > range * z.traits.vision) return false;
  if (Math.abs(angleDelta(z.facing, Math.atan2(o.y - z.y, o.x - z.x))) > T.peripheralHalf) return false;
  return sight.hasLineOfSight(z.x, z.y, o.x, o.y);
}
