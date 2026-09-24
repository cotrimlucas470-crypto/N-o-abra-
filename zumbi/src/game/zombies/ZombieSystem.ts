/**
 * SISTEMA DE ZUMBIS (puro, sem Phaser): cada zumbi é um indivíduo com
 * mente própria — percebe (visão, audição), lembra, decide e age.
 *
 * Estados: IDLE, WANDER, INVESTIGATE, ALERT, SEARCH, CHASE, ATTACK, GRAB,
 * BITE, STAGGER, FALL, GET_UP, LOSE_TARGET, RETURN, GROUP (e DEAD).
 *
 * Nível de simulação pela distância do jogador (nunca some ninguém):
 *  - perto (LOD 0): todo quadro — visão, audição, rota, colisão exata,
 *    empurra-empurra, ataques;
 *  - médio (LOD 1): 5×/s, mesmas regras, passos maiores;
 *  - longe (LOD 2): a cada ~2,5 s, passo barato pela grade — continuam
 *    vagando, migrando e indo atrás de barulho.
 *
 * Regras: nada de teleporte, nada de nascer perto do jogador, nada de saber
 * onde ele está sem ver/ouvir (quem perde de vista vai ao ÚLTIMO ponto e
 * procura em volta). O perigo vem de quantos, onde e do barulho — não do
 * relógio.
 */
import { ZOMBIE_TUNING as T } from '../config/ZombieTuning';
import { angleDelta, clamp, rotateTowards } from '../core/math';
import type { NoiseEvent, NoiseKind, NoiseSystem } from '../sim/Noise';
import { SolidIndex, type TaggedSolid } from '../sim/SolidIndex';
import { WorldState } from '../sim/WorldState';
import type { Solid } from '../world/collision';
import { FlowField } from '../world/nav/FlowField';
import { Pathfinder } from '../world/nav/Pathfinder';
import type { WorldModel } from '../world/WorldModel';
import { escapeRate, type AttackKind, type AttackOutcome, type PlayerDefense } from './Assault';
import type { ZombieDifficulty } from './Difficulty';
import { hitZombie, shoveZombie, type ZombieHit, type ZombieHitResult } from './Wounding';
import { bodyRadius, farStep, moveBy, pressPlayer, separate, stepToward } from './ZombieMotion';
import { bangOnce, climbTarget, obstacleFrom, obstacleKey, obstacleStands, tryPushDoor, windowOf, type ObstacleCtx } from './ZombieObstacles';
import { seesZombie, sightRate, sightRange, beamHits, type LightEnv, type PlayerSense } from './Senses';
import { ZombieStore } from './ZombieStore';
import { canGrab, isCrawler, moveSpeed, type Point, type Zombie, type ZState } from './Zombie';

export interface ZombieHooks {
  /** Um ataque chegou ao jogador: a cena resolve (Assault) e devolve o resultado. */
  attack(z: Zombie, kind: AttackKind): AttackOutcome | null;
  /** Som feito por zumbi (gemido, pancada, vidro). */
  noise(x: number, y: number, kind: NoiseKind, radius?: number, source?: string): void;
  /** Um zumbi caiu de vez. */
  killed?(z: Zombie): void;
}

/** O jogador sob ataque: quem agarra, caído, registro para explicar a morte. */
export class PlayerThreat {
  readonly grabbers: Zombie[] = [];
  /** Progresso para se soltar (0..1). */
  escape = 0;
  /** Segundos ainda no chão. */
  downT = 0;
  /** Última vez que um zumbi feriu (s de simulação). */
  lastHarm = -99;
  /** Últimos acontecimentos (morte explicada). */
  readonly log: { t: number; text: string }[] = [];

  note(t: number, text: string): void {
    this.log.push({ t, text });
    if (this.log.length > 14) this.log.shift();
  }

  get grabbed(): number {
    return this.grabbers.length;
  }

  get down(): boolean {
    return this.downT > 0;
  }

  /** Quanto o jogador consegue andar (agarrado anda arrastando; no chão, nada). */
  moveFactor(): number {
    if (this.downT > 0) return 0;
    const n = this.grabbers.length;
    if (!n) return 1;
    return T.grabbedSlow / (1 + 0.8 * (n - 1));
  }

  release(z: Zombie): void {
    const i = this.grabbers.indexOf(z);
    if (i >= 0) this.grabbers.splice(i, 1);
    if (!this.grabbers.length) this.escape = 0;
  }
}

export interface ZombieFrame {
  /** Segundos de SIMULAÇÃO (tempo acelerado já multiplicado). */
  dt: number;
  player: PlayerSense;
  light: LightEnv;
}

export interface ZombieStats {
  alive: number;
  dead: number;
  lod: [number, number, number];
  updated: number;
  paths: number;
  flow: number;
  states: Partial<Record<ZState, number>>;
}

const BUSY: ReadonlySet<ZState> = new Set(['ATTACK', 'GRAB', 'BITE', 'STAGGER', 'FALL', 'GET_UP', 'DEAD']);
const CALM: ReadonlySet<ZState> = new Set(['IDLE', 'WANDER', 'RETURN', 'SEARCH', 'GROUP', 'LOSE_TARGET', 'INVESTIGATE']);
/** Estados de quem vai a algum lugar com vontade (outros seguem). */
const PURPOSE: ReadonlySet<ZState> = new Set(['CHASE', 'INVESTIGATE', 'GROUP']);

/** Peso do tipo de som para a curiosidade. */
const NOISE_INTEREST: Partial<Record<NoiseKind, number>> = {
  tiro: 1.6,
  vidro: 1.4,
  alarme: 1.3,
  buzina: 1.2,
  batida: 1.1,
  demolicao: 1.2,
  grito: 1.2,
  motor: 1,
  gerador: 0.9,
  passo: 0.9,
  corrida: 1,
  furtivo: 0.9,
  zumbi: 0.7,
  radio: 1,
};

export class ZombieSystem {
  readonly store: ZombieStore;
  readonly solids: SolidIndex;
  readonly threat = new PlayerThreat();
  /** Relógio de simulação (s). */
  now = 0;
  player: PlayerSense = { x: 0, y: 0, floor: 0, vx: 0, vy: 0, radius: 15, posture: 'parado', inVehicle: false, alive: true, down: false };
  light: LightEnv = { ambient: 1, beam: null, glow: 0, rain: 0, fog: 0 };
  /** Zumbi em que o debug está de olho. */
  focus: string | null = null;
  private readonly pf: Pathfinder;
  private readonly flow: FlowField;
  private flowAt = -1;
  private flowUsers = 0;
  private readonly pathQueue: Zombie[] = [];
  private readonly bangers = new Map<string, number>();
  private readonly near: Zombie[] = [];
  private readonly near2: Zombie[] = [];
  private readonly obsCtx: ObstacleCtx;
  private statsNow: ZombieStats = { alive: 0, dead: 0, lod: [0, 0, 0], updated: 0, paths: 0, flow: 0, states: {} };
  private pathsThisSecond = 0;
  private flowsThisSecond = 0;
  private secondAt = 0;

  constructor(
    readonly model: WorldModel,
    readonly state: WorldState,
    readonly noise: NoiseSystem,
    readonly diff: ZombieDifficulty,
    readonly hooks: ZombieHooks,
    readonly rng: () => number = Math.random,
  ) {
    this.store = new ZombieStore(model.widthPx, model.heightPx);
    this.solids = new SolidIndex(state);
    this.pf = new Pathfinder(model.nav);
    this.flow = new FlowField(model.nav, 38, 14);
    this.obsCtx = { state, diff, rng, noise: (x, y, k, r, src) => hooks.noise(x, y, k, r, src) };
    noise.onNoise((e) => this.hear(e));
  }

  // ================================================================ quadro

  /** Um quadro. Devolve o empurrão do grupo no jogador (px). */
  update(f: ZombieFrame): { x: number; y: number } {
    const dt = f.dt;
    this.now += dt;
    this.player = f.player;
    this.light = f.light;
    const push = { x: 0, y: 0 };
    if (dt <= 0) return push;
    const p = this.player;
    const th = this.threat;
    if (th.downT > 0) {
      // Cercado por mais de um: não levanta.
      th.downT = th.grabbers.length >= 2 ? Math.max(th.downT, 0.5) : th.downT - dt;
      if (th.downT < 0) th.downT = 0;
    }
    // Campo de fluxo em volta do jogador para quem persegue (um para todos).
    if (this.flowUsers > 0 && this.now >= this.flowAt) {
      this.flow.build(p.x, p.y);
      this.flowAt = this.now + 0.35;
      this.flowsThisSecond++;
    }
    this.flowUsers = 0;
    // Quantos batem em cada obstáculo (pressão do grupo).
    this.bangers.clear();
    for (const z of this.store.all) {
      if (z.dead || !z.mind.bang) continue;
      const k = obstacleKey(z.mind.bang);
      this.bangers.set(k, (this.bangers.get(k) ?? 0) + 1);
    }
    // Rotas pedidas (orçamento por quadro).
    for (let i = 0; i < T.pathsPerFrame && this.pathQueue.length; i++) this.solvePath(this.pathQueue.shift()!);

    const full2 = T.lodFull * T.lodFull;
    const near2 = T.lodNear * T.lodNear;
    const lod: [number, number, number] = [0, 0, 0];
    let updated = 0;
    const states: Partial<Record<ZState, number>> = {};
    let dead = 0;
    for (const z of this.store.all) {
      if (z.dead) {
        dead++;
        continue;
      }
      const d2 = (z.x - p.x) ** 2 + (z.y - p.y) ** 2;
      const l: 0 | 1 | 2 = z.floor === p.floor && d2 < full2 ? 0 : d2 < near2 ? 1 : 2;
      if (l !== z.lod) {
        z.lod = l;
        z.rt.next = this.now;
      }
      lod[l]++;
      states[z.mind.state] = (states[z.mind.state] ?? 0) + 1;
      const rt = z.rt;
      if (l === 0) {
        this.tick(z, dt);
        rt.last = this.now;
        updated++;
      } else if (this.now >= rt.next) {
        const step = Math.min(this.now - rt.last, l === 1 ? 0.6 : 8);
        rt.last = this.now;
        rt.next = this.now + (l === 1 ? 0.2 : T.farTick) * (0.8 + this.rng() * 0.4);
        if (l === 1) this.tick(z, step);
        else this.farTick(z, step);
        updated++;
      }
      this.store.moved(z);
    }
    // Empurra-empurra (só perto) e o jogador no meio.
    for (const z of this.store.all) {
      if (z.dead || z.lod !== 0) continue;
      for (const o of this.store.aliveNear(z.x, z.y, 40, this.near)) {
        if (o === z || o.id < z.id || o.lod !== 0) continue;
        if (separate(z, o)) {
          this.fixPosition(z);
          this.fixPosition(o);
        }
      }
      if (p.alive && !p.inVehicle && z.floor === p.floor && Math.abs(z.x - p.x) < 50 && Math.abs(z.y - p.y) < 50) {
        if (pressPlayer(z, p.x, p.y, p.radius, push) > 0) this.fixPosition(z);
      }
    }
    // Estatística por segundo (debug).
    if (this.now - this.secondAt >= 1) {
      this.statsNow = { alive: this.store.size - dead, dead, lod, updated, paths: this.pathsThisSecond, flow: this.flowsThisSecond, states };
      this.pathsThisSecond = 0;
      this.flowsThisSecond = 0;
      this.secondAt = this.now;
    } else {
      this.statsNow.lod = lod;
      this.statsNow.updated = updated;
      this.statsNow.states = states;
    }
    // Empurrão do grupo: limitado (ninguém é arremessado).
    const m = Math.hypot(push.x, push.y);
    if (m > 3) {
      push.x *= 3 / m;
      push.y *= 3 / m;
    }
    return push;
  }

  stats(): ZombieStats {
    return this.statsNow;
  }

  private fixPosition(z: Zombie): void {
    const q = { x: z.x, y: z.y };
    this.solids.resolve(q, bodyRadius(z));
    z.x = q.x;
    z.y = q.y;
  }

  // ================================================================ mente (perto e médio)

  private setState(z: Zombie, s: ZState, timer = 0): void {
    const m = z.mind;
    if (m.state === s) {
      if (timer) m.timer = timer;
      return;
    }
    const holding = s === 'GRAB' || s === 'BITE';
    if ((m.state === 'GRAB' || m.state === 'BITE') && !holding) this.threat.release(z);
    m.state = s;
    m.t = 0;
    m.timer = timer;
    if (s !== 'ATTACK') m.attack = null;
    if (!holding) m.grab = null;
    if (BUSY.has(s)) m.bang = null;
  }

  /** Volta ao que fazia depois de cambalear/levantar. */
  private resume(z: Zombie): void {
    const m = z.mind;
    if (m.lastSeen && this.now - m.lastSeen.t < z.traits.memory) this.setState(z, 'CHASE');
    else if (m.lastHeard && this.now - m.lastHeard.t < 25) {
      m.target = { x: m.lastHeard.x, y: m.lastHeard.y };
      this.setState(z, 'INVESTIGATE');
    } else this.setState(z, 'IDLE', 2 + this.rng() * 6);
  }

  private tick(z: Zombie, dt: number): void {
    const m = z.mind;
    const rt = z.rt;
    m.t += dt;
    m.cooldown = Math.max(0, m.cooldown - dt);
    m.moan -= dt;
    z.anim.sway += dt;
    // Braços: esticados quando quer pegar alguém.
    const want = m.state === 'CHASE' || m.state === 'ATTACK' || m.state === 'GRAB' || m.state === 'BITE' ? 1 : m.state === 'INVESTIGATE' || m.state === 'ALERT' || m.bang ? 0.55 : m.state === 'GROUP' ? 0.35 : 0.05;
    z.anim.arms += (want - z.anim.arms) * Math.min(1, dt * 3);

    // Estados de corpo (não pensa enquanto isso).
    if (m.state === 'STAGGER') {
      m.timer -= dt;
      moveBy(z, Math.cos(z.anim.hitDir) * 38 * dt, Math.sin(z.anim.hitDir) * 38 * dt, dt, this.solids);
      if (m.timer <= 0) this.resume(z);
      return;
    }
    if (m.state === 'FALL') {
      m.timer -= dt;
      z.vx = 0;
      z.vy = 0;
      if (m.timer <= 0) {
        if (isCrawler(z)) this.resume(z);
        else this.setState(z, 'GET_UP', 1.1 + (1 - z.traits.coordination) * 1.4);
      }
      return;
    }
    if (m.state === 'GET_UP') {
      m.timer -= dt;
      if (m.timer <= 0) this.resume(z);
      return;
    }
    if (m.climb) {
      this.climbTick(z, dt);
      return;
    }

    this.perceive(z, dt);
    this.decide(z, dt);
    if (rt.stuck > 0 && Math.hypot(z.x - rt.sx, z.y - rt.sy) > 24) rt.stuck = 0;
  }

  /** Visão acumulada (10×/s perto, 4×/s no médio). */
  private perceive(z: Zombie, dt: number): void {
    const rt = z.rt;
    const m = z.mind;
    rt.lookAcc += dt;
    rt.look -= dt;
    if (rt.look > 0) return;
    const acc = rt.lookAcc;
    rt.lookAcc = 0;
    rt.look = z.lod === 0 ? 0.1 : 0.25;
    const p = this.player;
    const rate = p.alive ? sightRate(z, p, this.light, this.model.sight) : 0;
    if (rate > 0) {
      m.alert = Math.min(1.5, m.alert + rate * acc);
      rt.noticed = { x: p.x, y: p.y };
    } else m.alert = Math.max(0, m.alert - T.detectDecay * acc);
    const sees = rate > 0 && m.alert >= 1;
    rt.sees = sees;
    if (sees) {
      m.lastSeen = { x: p.x, y: p.y, t: this.now };
      rt.seenV = { x: p.vx, y: p.vy };
    }
  }

  private decide(z: Zombie, dt: number): void {
    const m = z.mind;
    const rt = z.rt;
    // Viu com certeza: persegue (quem está ocupado termina antes).
    if (rt.sees && !BUSY.has(m.state) && m.state !== 'CHASE') {
      this.setState(z, 'CHASE');
      m.bang = null;
      z.path.length = 0;
      if (m.moan <= 1) this.moan(z, 1.4);
    } else if (!rt.sees && m.alert >= T.alertAt && CALM.has(m.state) && m.state !== 'INVESTIGATE' && rt.noticed) {
      this.setState(z, 'ALERT');
    }

    switch (m.state) {
      case 'IDLE':
        return this.idle(z, dt);
      case 'WANDER':
        return this.wander(z, dt);
      case 'ALERT': {
        if (rt.noticed) {
          z.facing = rotateTowards(z.facing, Math.atan2(rt.noticed.y - z.y, rt.noticed.x - z.x), T.turnRate * 0.6 * dt);
          m.target = { ...rt.noticed };
        }
        z.vx = z.vy = 0;
        if (m.alert < T.alertAt * 0.5) {
          // Não teve certeza: vai ver o que era (os curiosos).
          if (rt.noticed && this.rng() < 0.35 + z.traits.investigation * 0.6) {
            m.target = { ...rt.noticed };
            this.setState(z, 'INVESTIGATE');
          } else this.setState(z, 'IDLE', 3);
        } else if (m.t > 6) {
          if (rt.noticed) {
            m.target = { ...rt.noticed };
            this.setState(z, 'INVESTIGATE');
          } else this.setState(z, 'IDLE', 3);
        }
        return;
      }
      case 'INVESTIGATE':
        return this.investigate(z, dt);
      case 'CHASE':
        return this.chase(z, dt);
      case 'ATTACK':
        return this.attack(z, dt);
      case 'GRAB':
      case 'BITE':
        return this.holding(z, dt);
      case 'LOSE_TARGET': {
        // Olha em volta onde perdeu.
        z.facing += Math.sin(m.t * 2.2) * dt * 1.8;
        z.vx = z.vy = 0;
        if (m.t > 1.2 + (1 - z.traits.aggression) * 1.5) {
          m.searchCenter = m.lastSeen ? { x: m.lastSeen.x, y: m.lastSeen.y } : { x: z.x, y: z.y };
          m.searchLeft = T.searchMin + (T.searchMax - T.searchMin) * z.traits.investigation;
          m.target = null;
          this.setState(z, 'SEARCH');
        }
        return;
      }
      case 'SEARCH':
        return this.search(z, dt);
      case 'RETURN':
        return this.returnHome(z, dt);
      case 'GROUP':
        return this.group(z, dt);
      default:
        return;
    }
  }

  // ---------------------------------------------------------------- estados calmos

  private idle(z: Zombie, dt: number): void {
    const m = z.mind;
    z.vx = z.vy = 0;
    // Balança e vira devagar de vez em quando.
    if (this.rng() < dt * 0.15) m.heading = z.facing + (this.rng() - 0.5) * 2.2;
    z.facing = rotateTowards(z.facing, m.heading, 0.8 * dt);
    m.timer -= dt;
    this.social(z, dt);
    if (m.state !== 'IDLE') return;
    if (m.timer <= 0) {
      const indoor = this.indoor(z);
      if (this.rng() < (indoor ? 0.25 : 0.62) * (0.6 + 0.4 * this.diff.migration)) this.startWander(z);
      else m.timer = 4 + this.rng() * 16;
    }
  }

  private indoor(z: Zombie): boolean {
    for (const b of this.model.index.buildingsNear(z.x, z.y)) {
      const r = b.bounds;
      if (z.x >= r.x && z.x < r.x + r.w && z.y >= r.y && z.y < r.y + r.h) return true;
    }
    return false;
  }

  private startWander(z: Zombie): void {
    const m = z.mind;
    const indoor = this.indoor(z);
    const leash = (indoor ? 220 : 700) * (0.6 + 0.4 * this.diff.migration);
    // Direção: continua mais ou menos para onde ia; puxa de volta se foi longe de casa.
    let a = m.heading + (this.rng() - 0.5) * 1.8;
    const hd = Math.hypot(m.home.x - z.x, m.home.y - z.y);
    if (hd > leash) a = Math.atan2(m.home.y - z.y, m.home.x - z.x) + (this.rng() - 0.5) * 0.8;
    const dist = (indoor ? 60 : 120) + this.rng() * (indoor ? 140 : 320);
    const tx = z.x + Math.cos(a) * dist;
    const ty = z.y + Math.sin(a) * dist;
    m.heading = a;
    m.target = { x: tx, y: ty };
    z.path.length = 0;
    this.setState(z, 'WANDER', 20);
  }

  private wander(z: Zombie, dt: number): void {
    const m = z.mind;
    m.timer -= dt;
    this.social(z, dt);
    if (m.state !== 'WANDER') return;
    const t = m.target;
    if (!t || m.timer <= 0 || Math.hypot(t.x - z.x, t.y - z.y) < 26) {
      // Migração lenta: a "casa" acompanha um pouco.
      const drift = 0.15 * this.diff.migration;
      m.home = { x: m.home.x + (z.x - m.home.x) * drift, y: m.home.y + (z.y - m.home.y) * drift };
      this.setState(z, 'IDLE', 3 + this.rng() * 12);
      return;
    }
    const moved = this.navigate(z, t.x, t.y, moveSpeed(z, false) * 0.75, dt, false);
    if (!moved) this.setState(z, 'IDLE', 2 + this.rng() * 5);
  }

  private investigate(z: Zombie, dt: number): void {
    const m = z.mind;
    const t = m.target ?? (m.lastHeard ? { x: m.lastHeard.x, y: m.lastHeard.y } : null);
    if (!t) return this.setState(z, 'IDLE', 3);
    const urgent = (m.lastHeard?.s ?? 0) > 0.45;
    const d = Math.hypot(t.x - z.x, t.y - z.y);
    if (d < 40 || m.t > 45) {
      m.searchCenter = { ...t };
      m.searchLeft = (T.searchMin + (T.searchMax - T.searchMin) * z.traits.investigation) * 0.6;
      m.target = null;
      this.setState(z, 'SEARCH');
      return;
    }
    // Quem corre também "apressa" atrás de barulho forte.
    const speed = moveSpeed(z, false) * (urgent ? 1.2 : 0.95);
    const moved = this.navigate(z, t.x, t.y, speed, dt, urgent);
    if (!moved && z.rt.stuck > 3) {
      m.searchCenter = { x: z.x, y: z.y };
      m.searchLeft = 8;
      this.setState(z, 'SEARCH');
    }
    if (m.moan <= 0) this.moan(z, 2.5);
  }

  private search(z: Zombie, dt: number): void {
    const m = z.mind;
    m.searchLeft -= dt;
    if (m.searchLeft <= 0 || !m.searchCenter) {
      this.setState(z, 'RETURN');
      return;
    }
    if (!m.target || Math.hypot(m.target.x - z.x, m.target.y - z.y) < 24 || z.rt.stuck > 1.5) {
      m.timer -= dt;
      z.vx = z.vy = 0;
      if (m.timer > 0) return;
      const a = this.rng() * Math.PI * 2;
      const r = this.rng() * T.searchRadius;
      const tx = m.searchCenter.x + Math.cos(a) * r;
      const ty = m.searchCenter.y + Math.sin(a) * r;
      m.target = this.model.nav.isWalkableAt(tx, ty) ? { x: tx, y: ty } : { ...m.searchCenter };
      m.timer = 0.6 + this.rng() * 1.8;
      z.path.length = 0;
      z.rt.stuck = 0;
      return;
    }
    this.navigate(z, m.target.x, m.target.y, moveSpeed(z, false) * 0.85, dt, false);
  }

  private returnHome(z: Zombie, dt: number): void {
    const m = z.mind;
    const d = Math.hypot(m.home.x - z.x, m.home.y - z.y);
    // Longe de casa: fica por aqui mesmo (migrou).
    if (d > 900 * (0.6 + 0.4 * this.diff.migration)) m.home = { x: z.x, y: z.y };
    if (d < 40 || d > 900) {
      this.setState(z, 'IDLE', 4 + this.rng() * 10);
      return;
    }
    const moved = this.navigate(z, m.home.x, m.home.y, moveSpeed(z, false) * 0.7, dt, false);
    if (!moved && z.rt.stuck > 2) {
      m.home = { x: z.x, y: z.y };
      this.setState(z, 'IDLE', 5);
    }
  }

  private group(z: Zombie, dt: number): void {
    const m = z.mind;
    const leader = m.leader ? this.store.get(m.leader) : null;
    if (!leader || leader.dead || m.t > 45 || !PURPOSE.has(leader.mind.state) || Math.hypot(leader.x - z.x, leader.y - z.y) > 700) {
      // O bando para: ficam por aqui (concentrações naturais).
      m.leader = null;
      m.home = { x: z.x, y: z.y };
      this.setState(z, 'IDLE', 4 + this.rng() * 8);
      return;
    }
    const off = (hashId(z.id) % 628) / 100;
    const tx = leader.x - Math.cos(leader.facing) * 40 + Math.cos(off) * 30;
    const ty = leader.y - Math.sin(leader.facing) * 40 + Math.sin(off) * 30;
    if (Math.hypot(tx - z.x, ty - z.y) < 30) {
      z.vx = z.vy = 0;
      z.facing = rotateTowards(z.facing, leader.facing, 2 * dt);
    } else this.navigate(z, tx, ty, moveSpeed(z, false), dt, false);
    if (m.moan <= 0) this.moan(z, 4);
  }

  /** Vê outro zumbi indo com vontade para algum lugar → vai junto (grupos, hordas). */
  private social(z: Zombie, dt: number): void {
    const rt = z.rt;
    rt.social -= dt;
    if (rt.social > 0) return;
    rt.social = 0.5 + this.rng() * 0.3;
    if (z.traits.groupiness <= 0) return;
    for (const o of this.store.aliveNear(z.x, z.y, 280, this.near2)) {
      if (o === z || !PURPOSE.has(o.mind.state) || (o.mind.state === 'GROUP' && o.mind.leader === z.id)) continue;
      if (!seesZombie(z, o, this.model.sight, 280)) continue;
      if (this.rng() < 0.35 * z.traits.groupiness) {
        z.mind.leader = o.mind.state === 'GROUP' && o.mind.leader ? o.mind.leader : o.id;
        this.setState(z, 'GROUP');
      }
      return;
    }
  }

  // ---------------------------------------------------------------- perseguir e atacar

  private chase(z: Zombie, dt: number): void {
    const m = z.mind;
    const rt = z.rt;
    const p = this.player;
    let tx: number;
    let ty: number;
    if (rt.sees) {
      tx = p.x;
      ty = p.y;
    } else if (m.lastSeen) {
      const since = this.now - m.lastSeen.t;
      if (since > z.traits.memory) {
        this.setState(z, 'LOSE_TARGET');
        return;
      }
      // Vai para onde o viu por último — um pouco adiante, na direção em que ia.
      const lead = Math.min(1.2, since) * 0.8;
      tx = m.lastSeen.x + rt.seenV.x * lead;
      ty = m.lastSeen.y + rt.seenV.y * lead;
      if (!this.model.nav.isWalkableAt(tx, ty)) {
        tx = m.lastSeen.x;
        ty = m.lastSeen.y;
      }
      if (Math.hypot(tx - z.x, ty - z.y) < 34) {
        this.setState(z, 'LOSE_TARGET');
        return;
      }
    } else {
      this.setState(z, 'LOSE_TARGET');
      return;
    }
    const d = Math.hypot(p.x - z.x, p.y - z.y);
    const reach = z.traits.reach + p.radius;
    // Ataque: perto, vendo, sem porta no meio.
    if (rt.sees && p.alive && m.cooldown <= 0 && !m.bang) {
      const lunge = z.traits.sprint > 0 && !isCrawler(z) && d > reach * 1.1 && d < reach * 1.9 && this.rng() < dt * 1.5 * z.traits.aggression;
      if ((d <= reach + 4 || lunge) && this.canReach(z, p.x, p.y)) {
        this.startAttack(z, lunge ? 'lunge' : null);
        return;
      }
    }
    const run = rt.sees || (m.lastSeen !== null && this.now - m.lastSeen.t < 2.5);
    let speed = moveSpeed(z, run);
    if (!rt.sees || z.traits.sprint === 0 || speed < 100) speed *= 1.12; // "apressado"
    // Colado no jogador: não empurra além do alcance.
    if (d < reach * 0.55 && rt.sees) {
      z.facing = rotateTowards(z.facing, Math.atan2(p.y - z.y, p.x - z.x), T.turnRate * dt);
      z.vx = z.vy = 0;
    } else this.navigate(z, tx, ty, speed, dt, true, rt.sees);
    if (m.moan <= 0) this.moan(z, 1);
  }

  private startAttack(z: Zombie, forced: AttackKind | null): void {
    const m = z.mind;
    const p = this.player;
    let kind: AttackKind;
    if (forced) kind = forced;
    else if (p.down) kind = 'bite';
    else if (isCrawler(z)) kind = 'ankle';
    else {
      const crowd = this.crowdAround(p.x, p.y);
      const grab = canGrab(z) ? 4.5 * this.diff.grab * (0.6 + 0.4 * z.traits.aggression) : 0;
      const w: [AttackKind, number][] = [['grab', grab], ['swipe', 3.5], ['push', 1 + crowd * 0.8]];
      let total = 0;
      for (const [, x] of w) total += x;
      let r = this.rng() * total;
      kind = 'swipe';
      for (const [k, x] of w) {
        r -= x;
        if (r < 0) {
          kind = k;
          break;
        }
      }
    }
    const windup = (T.windupMax - (T.windupMax - T.windupMin) * clamp(z.traits.aggression, 0, 1)) * (kind === 'lunge' ? 0.7 : kind === 'bite' ? 0.6 : 1) * (0.85 + this.rng() * 0.3);
    this.setState(z, 'ATTACK');
    m.attack = { kind, t: 0, windup };
  }

  private attack(z: Zombie, dt: number): void {
    const m = z.mind;
    const a = m.attack;
    const p = this.player;
    if (!a) return this.setState(z, 'CHASE');
    const kind = a.kind;
    a.t += dt;
    const ang = Math.atan2(p.y - z.y, p.x - z.x);
    z.facing = rotateTowards(z.facing, ang, T.turnRate * 1.2 * dt);
    const d = Math.hypot(p.x - z.x, p.y - z.y);
    const reach = z.traits.reach + p.radius + (kind === 'lunge' ? 26 : 0);
    // Na preparação ainda se aproxima (o bote avança rápido).
    if (d > reach * 0.7) {
      const sp = kind === 'lunge' ? Math.max(moveSpeed(z, true), 160) * 1.3 : moveSpeed(z, false) * 0.35;
      stepToward(z, p.x, p.y, sp, dt, this.solids, 1.5);
    } else z.vx = z.vy = 0;
    if (a.t < a.windup) return;
    // Golpe: confere se ainda alcança (dá para desviar recuando).
    const inReach = p.alive && d <= reach && Math.abs(angleDelta(z.facing, ang)) < 1.1 && this.canReach(z, p.x, p.y);
    m.attack = null;
    m.cooldown = T.attackCooldown * (1.35 - 0.4 * clamp(z.traits.aggression, 0, 1)) * (0.85 + this.rng() * 0.3);
    if (!inReach) {
      this.setState(z, 'CHASE');
      return;
    }
    const out = this.hooks.attack(z, kind);
    this.afterAttack(z, out);
  }

  /** Aplica o resultado de um ataque (vindo da cena). */
  private afterAttack(z: Zombie, out: AttackOutcome | null): void {
    const th = this.threat;
    if (!out) {
      this.setState(z, 'CHASE');
      return;
    }
    if (out.landed && (out.wound === 'mordida' || out.wound === 'laceracao' || out.wound === 'corte' || out.wound === 'arranhao' || out.knockdown)) th.lastHarm = this.now;
    th.note(this.now, out.text);
    if (out.knockdown) th.downT = Math.max(th.downT, out.knockdown);
    if (out.grab && !th.grabbers.includes(z)) {
      th.grabbers.push(z);
      this.setState(z, 'GRAB');
      z.mind.grab = { t: 0, biteAt: (T.biteDelayMin + (T.biteDelayMax - T.biteDelayMin) * this.rng()) / Math.max(0.5, z.traits.aggression) };
      return;
    }
    if (out.kind === 'bite' && th.grabbers.includes(z)) {
      this.setState(z, 'GRAB');
      z.mind.grab = { t: 0, biteAt: (T.biteDelayMin + (T.biteDelayMax - T.biteDelayMin) * this.rng()) * 1.2 };
      return;
    }
    this.setState(z, 'CHASE');
  }

  /** Segurando o jogador: acompanha e morde. */
  private holding(z: Zombie, dt: number): void {
    const m = z.mind;
    const p = this.player;
    const th = this.threat;
    const d = Math.hypot(p.x - z.x, p.y - z.y);
    if (!p.alive || !th.grabbers.includes(z) || d > z.traits.reach * 1.9 + p.radius || !m.grab) {
      th.release(z);
      this.setState(z, 'CHASE');
      m.cooldown = 0.6;
      return;
    }
    const ang = Math.atan2(p.y - z.y, p.x - z.x);
    z.facing = rotateTowards(z.facing, ang, T.turnRate * dt);
    // Fica colado (acompanha o jogador que se arrasta).
    const keep = z.traits.reach * 0.55 + p.radius;
    if (d > keep) stepToward(z, p.x, p.y, Math.max(60, moveSpeed(z, false)) * 1.3, dt, this.solids, 2);
    else z.vx = z.vy = 0;
    m.grab.t += dt;
    if (m.state === 'GRAB' && m.grab.t >= m.grab.biteAt) {
      // Puxa para a boca: meio segundo para reagir (empurrar, bater).
      this.setState(z, 'BITE');
      m.grab = { t: 0, biteAt: 0.35 + (1 - clamp(z.traits.aggression, 0, 1)) * 0.3 };
      return;
    }
    if (m.state === 'BITE' && m.grab.t >= m.grab.biteAt) {
      const out = this.hooks.attack(z, 'bite');
      this.setState(z, 'GRAB');
      m.grab = { t: 0, biteAt: (T.biteDelayMin + (T.biteDelayMax - T.biteDelayMin) * this.rng()) * 1.3 };
      if (out) {
        th.note(this.now, out.text);
        if (out.landed && !out.blocked) th.lastHarm = this.now;
        if (out.knockdown) th.downT = Math.max(th.downT, out.knockdown);
      }
    }
  }

  /** Quantos zumbis colados no jogador. */
  crowdAround(x: number, y: number, r = 62): number {
    let n = 0;
    for (const o of this.store.aliveNear(x, y, r, this.near2)) if (o.lod === 0 && o.mind.state !== 'FALL') n++;
    return n;
  }

  /** O braço dele alcança o ponto? (parede, porta fechada, vidro inteiro, barricada no meio: não). */
  canReach(z: Zombie, x: number, y: number): boolean {
    if (!this.model.sight.hasLineOfSight(z.x, z.y, x, y)) return false;
    const mx = (z.x + x) / 2;
    const my = (z.y + y) / 2;
    const half = Math.hypot(x - z.x, y - z.y) / 2 + 4;
    for (const t of this.solids.query(mx, my, half, this.reachScratch)) {
      if (t.kind === 'prop') continue;
      if (t.kind === 'window') {
        const w = this.model.map.walls[Number(t.id)];
        const wid = w ? WorldState.windowId(w) : '';
        if (w && this.state.isWindowBroken(wid) && !this.state.boardedOn(wid)) continue;
      }
      if (segHits(z.x, z.y, x, y, t.s)) return false;
    }
    return true;
  }

  private readonly reachScratch: TaggedSolid[] = [];

  // ---------------------------------------------------------------- andar com rota, fluxo e obstáculos

  /**
   * Anda até (tx, ty). `soft` = pode atravessar obstáculo quebrável (bate,
   * empurra, pula). `flow` = usar o campo de fluxo do jogador.
   * Devolve false se está travado.
   */
  private navigate(z: Zombie, tx: number, ty: number, speed: number, dt: number, soft: boolean, flow = false): boolean {
    const m = z.mind;
    const rt = z.rt;
    // Batendo num obstáculo: continua até ceder (ou até o alvo mudar de lado).
    if (m.bang) {
      if (!soft) {
        m.bang = null;
      } else {
        this.bangTick(z, dt);
        return true;
      }
    }
    let wx = tx;
    let wy = ty;
    rt.softAhead = false;
    const nav = this.model.nav;
    const d = Math.hypot(tx - z.x, ty - z.y);
    if (d < 480 && nav.lineWalkable(z.x, z.y, tx, ty, 12)) {
      z.path.length = 0;
    } else {
      const f = flow && this.flow.ready && Math.hypot(this.flow.tx - tx, this.flow.ty - ty) < 96 ? this.flow.next(z.x, z.y) : null;
      if (flow) this.flowUsers++;
      if (f) {
        wx = f.x;
        wy = f.y;
        rt.softAhead = f.soft;
        z.path.length = 0;
      } else {
        const goalMoved = !z.pathGoal || Math.hypot(z.pathGoal.x - tx, z.pathGoal.y - ty) > 64;
        z.pathAge += dt;
        if ((goalMoved || z.pathAge > 4 || (!z.path.length && z.pathAge > 1) || rt.pathSoft !== soft) && !rt.pathPending) this.requestPath(z, tx, ty, soft);
        while (z.path.length && Math.hypot(z.path[0]!.x - z.x, z.path[0]!.y - z.y) < 18) z.path.shift();
        const wp = z.path[0];
        if (wp) {
          wx = wp.x;
          wy = wp.y;
          const c = nav.cellOf(wp.x, wp.y);
          rt.softAhead = nav.isSoftOnly(c.cx, c.cy);
        } else if (rt.pathPending) {
          // Esperando a rota: vira para o alvo.
          z.facing = rotateTowards(z.facing, Math.atan2(ty - z.y, tx - z.x), T.turnRate * 0.5 * dt);
          z.vx = z.vy = 0;
          return true;
        }
      }
    }
    const hit = stepToward(z, wx, wy, speed, dt, this.solids);
    // Travou?
    const movedSq = z.vx * z.vx + z.vy * z.vy;
    if (movedSq < (speed * 0.15) ** 2) {
      if (rt.stuck === 0) {
        rt.sx = z.x;
        rt.sy = z.y;
      }
      rt.stuck += dt;
    }
    if (hit && soft && (rt.softAhead || hit.kind === 'door' || hit.kind === 'structure')) {
      const ob = obstacleFrom(hit, this.state);
      if (ob && Math.hypot(ob.x - wx, ob.y - wy) < 90) {
        this.meetObstacle(z, ob, dt);
        return true;
      }
    }
    if (rt.stuck > 1.4) {
      // Desvia: rota nova (e, se nada, desiste para o estado decidir).
      z.path.length = 0;
      z.pathAge = 99;
      if (rt.stuck > 4) return false;
    }
    return true;
  }

  private meetObstacle(z: Zombie, ob: NonNullable<Zombie['mind']['bang']>, dt: number): void {
    const m = z.mind;
    if (ob.kind === 'window') {
      const w = windowOf(ob, this.state);
      if (w && this.state.isWindowBroken(WorldState.windowId(w))) {
        const to = climbTarget(w, z.x, z.y, this.solids);
        if (to) {
          const dur = T.climbTime / (0.45 + z.traits.coordination);
          m.climb = { fx: z.x, fy: z.y, tx: to.x, ty: to.y, t: 0, dur };
          z.path.length = 0;
          return;
        }
      }
    }
    if (tryPushDoor(z, ob, dt, this.obsCtx)) {
      z.path.length = 0;
      return;
    }
    m.bang = ob;
    z.rt.bangT = 0.3 + this.rng() * 0.4;
  }

  private bangTick(z: Zombie, dt: number): void {
    const m = z.mind;
    const ob = m.bang!;
    if (!obstacleStands(ob, this.state)) {
      m.bang = null;
      z.path.length = 0;
      z.pathAge = 99;
      return;
    }
    z.vx = z.vy = 0;
    z.facing = rotateTowards(z.facing, Math.atan2(ob.y - z.y, ob.x - z.x), T.turnRate * dt);
    // Porta destrancada que abre para longe: continua tentando empurrar.
    if (ob.kind === 'door' && tryPushDoor(z, ob, dt, this.obsCtx)) {
      m.bang = null;
      z.path.length = 0;
      return;
    }
    z.rt.bangT -= dt;
    if (z.rt.bangT > 0) return;
    const interval = (1.05 + this.rng() * 0.5) / Math.max(0.4, z.traits.aggression);
    z.rt.bangT = interval;
    z.anim.hitAt = this.now; // tranco do braço no desenho
    const pressure = this.bangers.get(obstacleKey(ob)) ?? 1;
    const r = bangOnce(z, ob, interval, pressure, this.obsCtx);
    if (r !== 'hit') {
      m.bang = null;
      z.path.length = 0;
      z.pathAge = 99;
    }
  }

  private climbTick(z: Zombie, dt: number): void {
    const c = z.mind.climb!;
    c.t += dt;
    const k = Math.min(1, c.t / c.dur);
    // Devagar no parapeito, depois cai do outro lado.
    const e = k < 0.7 ? (k / 0.7) * 0.55 : 0.55 + ((k - 0.7) / 0.3) * 0.45;
    z.x = c.fx + (c.tx - c.fx) * e;
    z.y = c.fy + (c.ty - c.fy) * e;
    z.facing = Math.atan2(c.ty - c.fy, c.tx - c.fx);
    z.vx = z.vy = 0;
    if (k >= 1) {
      z.mind.climb = null;
      z.path.length = 0;
      z.pathAge = 99;
      // Cai do outro lado às vezes (cacos, altura).
      if (this.rng() < 0.35 * (1 - z.traits.coordination)) this.setState(z, 'FALL', 0.8 + this.rng());
    }
  }

  private requestPath(z: Zombie, tx: number, ty: number, soft: boolean): void {
    z.pathGoal = { x: tx, y: ty };
    z.rt.pathSoft = soft;
    z.rt.pathPending = true;
    this.pathQueue.push(z);
  }

  private solvePath(z: Zombie): void {
    z.rt.pathPending = false;
    if (z.dead || !z.pathGoal) return;
    const r = this.pf.find(z.x, z.y, z.pathGoal.x, z.pathGoal.y, { maxExpanded: T.pathBudget, agentRadius: 12, ...(z.rt.pathSoft ? { soft: 14 } : {}) });
    z.path = r.points;
    z.pathAge = 0;
    this.pathsThisSecond++;
  }

  // ================================================================ longe (LOD 2)

  private farTick(z: Zombie, dt: number): void {
    const m = z.mind;
    m.t += dt;
    m.cooldown = 0;
    m.bang = null;
    m.climb = null;
    z.rt.sees = false;
    m.alert = Math.max(0, m.alert - T.detectDecay * dt);
    // Longe não há ataque nem corpo a corpo: vira "indo ver".
    switch (m.state) {
      case 'ATTACK':
      case 'GRAB':
      case 'BITE':
      case 'CHASE':
      case 'ALERT':
      case 'LOSE_TARGET': {
        const t = m.lastSeen ?? m.lastHeard;
        if (t && this.now - t.t < z.traits.memory * 2) {
          m.target = { x: t.x, y: t.y };
          this.setState(z, 'INVESTIGATE');
        } else this.setState(z, 'IDLE', 5);
        break;
      }
      case 'STAGGER':
      case 'GET_UP':
        this.resume(z);
        break;
      case 'FALL':
        m.timer -= dt;
        if (m.timer <= 0) this.resume(z);
        return;
    }
    const s = m.state;
    if (s === 'IDLE') {
      m.timer -= dt;
      if (m.timer <= 0) {
        if (this.rng() < 0.5 * (0.6 + 0.4 * this.diff.migration)) this.startWander(z);
        else m.timer = 6 + this.rng() * 20;
      }
      return;
    }
    let t: Point | null = m.target;
    if (s === 'RETURN') t = m.home;
    if (s === 'GROUP') {
      const l = m.leader ? this.store.get(m.leader) : null;
      t = l && !l.dead ? { x: l.x, y: l.y } : null;
    }
    if (s === 'SEARCH') {
      m.searchLeft -= dt;
      if (m.searchLeft <= 0) {
        this.setState(z, 'IDLE', 5);
        return;
      }
    }
    if (!t) {
      this.setState(z, 'IDLE', 5);
      return;
    }
    const speed = moveSpeed(z, false) * 0.8;
    const ok = farStep(z, t.x, t.y, speed, dt, this.model.nav);
    if (!ok || Math.hypot(t.x - z.x, t.y - z.y) < 40 || m.t > 90) {
      if (s === 'WANDER' || s === 'INVESTIGATE') {
        m.home = { x: m.home.x + (z.x - m.home.x) * 0.3 * this.diff.migration, y: m.home.y + (z.y - m.home.y) * 0.3 * this.diff.migration };
      }
      this.setState(z, 'IDLE', 4 + this.rng() * 10);
    }
  }

  // ================================================================ audição

  private hear(e: NoiseEvent): void {
    const maxHear = e.radius * 2.6;
    const list = this.store.aliveNear(e.x, e.y, maxHear, this.near);
    for (const z of list) {
      if (z.mind.state === 'FALL' || z.mind.state === 'GET_UP') continue;
      // O próprio gemido não conta.
      if (e.kind === 'zumbi' && Math.abs(e.x - z.x) < 2 && Math.abs(e.y - z.y) < 2) continue;
      const h = this.noise.heard(e, z.x, z.y, z.traits.hearing, z.floor);
      if (!h) continue;
      const m = z.mind;
      const interest = h.strength * (0.45 + z.traits.investigation) * (NOISE_INTEREST[e.kind] ?? 1);
      if (interest < 0.1) continue;
      // Perseguindo e vendo: ignora; perseguindo sem ver: o som reorienta.
      if (m.state === 'CHASE' && z.rt.sees) continue;
      if (BUSY.has(m.state)) continue;
      const prev = m.lastHeard;
      const fresher = !prev || this.now - prev.t > 4 || h.strength >= prev.s * 0.8;
      if (!fresher) continue;
      m.lastHeard = { x: h.x, y: h.y, t: this.now, s: h.strength };
      if (m.state === 'CHASE') {
        // Ouviu o alvo que perdeu de vista: atualiza o "último ponto" (com erro).
        if (e.byPlayer && m.lastSeen) m.lastSeen = { x: h.x, y: h.y, t: this.now };
        continue;
      }
      if (e.kind === 'zumbi' && z.traits.groupiness > 0 && m.state !== 'INVESTIGATE') {
        // Gemido de outro: vai na direção (o bando se forma).
        if (this.rng() < 0.5 * z.traits.groupiness) {
          m.target = { x: h.x, y: h.y };
          z.path.length = 0;
          this.setState(z, 'INVESTIGATE');
        }
        continue;
      }
      m.target = { x: h.x, y: h.y };
      z.path.length = 0;
      z.pathAge = 99;
      m.alert = Math.max(m.alert, Math.min(0.3, h.strength));
      this.setState(z, 'INVESTIGATE');
    }
  }

  private moan(z: Zombie, scale: number): void {
    z.mind.moan = T.moanChase * scale * (0.6 + this.rng() * 0.8);
    this.hooks.noise(z.x, z.y, 'zumbi', undefined, 'gemido');
  }

  // ================================================================ o jogador contra eles

  /** Zumbi (vivo) mais à frente no alcance do golpe. */
  meleeTarget(x: number, y: number, facing: number, reach: number, arc = 1.1): Zombie | null {
    let best: Zombie | null = null;
    let bestScore = Infinity;
    for (const z of this.store.aliveNear(x, y, reach + 30, this.near)) {
      if (z.floor !== this.player.floor) continue;
      const d = Math.hypot(z.x - x, z.y - y) - bodyRadius(z);
      if (d > reach) continue;
      const off = Math.abs(angleDelta(facing, Math.atan2(z.y - y, z.x - x)));
      if (off > arc) continue;
      if (!this.model.sight.hasLineOfSight(x, y, z.x, z.y) || this.state.closedDoorBetween(x, y, z.x, z.y)) continue;
      const score = d + off * 40;
      if (score < bestScore) {
        bestScore = score;
        best = z;
      }
    }
    return best;
  }

  /** Primeiro zumbi (vivo) na linha do tiro, até `max` px. */
  rayTarget(x: number, y: number, angle: number, max: number): { z: Zombie; dist: number } | null {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let best: { z: Zombie; dist: number } | null = null;
    // Consulta ao longo da linha em trechos.
    for (let s = 0; s < max; s += 220) {
      const cx = x + dx * (s + 110);
      const cy = y + dy * (s + 110);
      for (const z of this.store.aliveNear(cx, cy, 170, this.near)) {
        if (z.floor !== this.player.floor) continue;
        const px = z.x - x;
        const py = z.y - y;
        const along = px * dx + py * dy;
        if (along < 0 || along > max) continue;
        const perp = Math.abs(px * dy - py * dx);
        const r = bodyRadius(z) * (isCrawler(z) || z.mind.state === 'FALL' ? 1.2 : 1.05);
        if (perp > r) continue;
        const dist = along - Math.sqrt(Math.max(0, r * r - perp * perp));
        if (!best || dist < best.dist) best = { z, dist };
      }
      if (best && best.dist < s + 220) break;
    }
    return best;
  }

  /** Golpe/tiro/atropelo num zumbi: dano no corpo e reação. */
  hit(z: Zombie, h: ZombieHit): ZombieHitResult {
    const r = hitZombie(z, h, this.now, this.rng);
    const m = z.mind;
    // Apanhou: sabe onde está quem bateu (sente o golpe).
    if (!r.killed && this.player.alive) {
      m.alert = Math.max(m.alert, 1);
      m.lastSeen = { x: this.player.x, y: this.player.y, t: this.now };
    }
    if (r.killed) {
      this.kill(z, h.dir);
      return r;
    }
    if (r.fall) this.setState(z, 'FALL', (T.knockdownMin + (T.knockdownMax - T.knockdownMin) * this.rng()) * (1.2 - z.traits.coordination * 0.4));
    else if (r.stagger) this.setState(z, 'STAGGER', 0.35 + this.rng() * 0.5);
    else if (m.state === 'ATTACK' && h.kind !== 'tiro' && this.rng() < 0.4) this.setState(z, 'STAGGER', 0.25);
    if (r.severed && (r.part === 'bracoE' || r.part === 'bracoD') && !canGrab(z)) this.threat.release(z);
    return r;
  }

  /** Empurrão do jogador: quem está à frente cambaleia/cai; quem agarra pode soltar. */
  shove(x: number, y: number, facing: number, strength: number, defense: PlayerDefense): { hit: number; freed: boolean } {
    let hit = 0;
    for (const z of this.store.aliveNear(x, y, 72, this.near)) {
      if (z.floor !== this.player.floor) continue;
      const off = Math.abs(angleDelta(facing, Math.atan2(z.y - y, z.x - x)));
      const d = Math.hypot(z.x - x, z.y - y);
      if (off > 1.1 || d > 62 + bodyRadius(z)) continue;
      const r = shoveZombie(z, strength, this.rng);
      z.anim.hitAt = this.now;
      z.anim.hitDir = Math.atan2(z.y - y, z.x - x);
      z.mind.alert = Math.max(z.mind.alert, 1);
      z.mind.lastSeen = { x, y, t: this.now };
      if (r.fall) this.setState(z, 'FALL', 1.2 + this.rng() * 1.2);
      else if (r.stagger) this.setState(z, 'STAGGER', 0.5 + this.rng() * 0.5);
      else if (z.mind.state === 'ATTACK') z.mind.attack!.t = 0;
      hit++;
    }
    const freed = this.struggle(0.45, defense, 'empurrando');
    return { hit, freed };
  }

  /**
   * Tentar se soltar por `dt` s. Devolve true se soltou um agarrão.
   * (A cena chama todo quadro enquanto agarrado: parado quase não solta.)
   */
  struggle(dt: number, defense: PlayerDefense, effort: 'parado' | 'puxando' | 'empurrando'): boolean {
    const th = this.threat;
    if (!th.grabbers.length) return false;
    th.escape += escapeRate(defense, th.grabbers, this.diff, effort) * dt;
    if (th.escape < 1) return false;
    // Solta o mais fraco.
    let weakest = th.grabbers[0]!;
    for (const z of th.grabbers) if (z.traits.strength < weakest.traits.strength) weakest = z;
    th.release(weakest);
    th.escape = 0;
    this.setState(weakest, 'STAGGER', 0.4);
    weakest.anim.hitDir = Math.atan2(weakest.y - this.player.y, weakest.x - this.player.x);
    weakest.mind.cooldown = 0.8;
    return true;
  }

  private kill(z: Zombie, dir: number): void {
    this.threat.release(z);
    z.dead = true;
    z.deadAt = this.now;
    z.corpseAngle = dir + (this.rng() - 0.5) * 0.8;
    z.mind.state = 'DEAD';
    z.mind.attack = null;
    z.mind.grab = null;
    z.mind.bang = null;
    z.mind.climb = null;
    z.vx = z.vy = 0;
    z.path.length = 0;
    z.anim.ver++;
    this.hooks.killed?.(z);
  }

  /** Corpos para colisão/interação perto (vivos e mortos). */
  bodiesNear(x: number, y: number, r: number): Zombie[] {
    return this.store.near(x, y, r, []);
  }

  /** Visão atual de um zumbi (debug): alcance e se enxerga. */
  visionOf(z: Zombie): { range: number; sees: boolean } {
    return { range: sightRange(z, this.player, this.light, beamHits(this.light, this.player, z.x, z.y)), sees: z.rt.sees };
  }

  // ================================================================ população

  /** Coloca um zumbi pronto no mundo (população inicial, save, debug). */
  add(z: Zombie): void {
    z.rt.next = this.now + this.rng() * T.farTick;
    z.rt.last = this.now;
    this.store.add(z);
  }
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Segmento × sólido. */
function segHits(ax: number, ay: number, bx: number, by: number, s: Solid): boolean {
  if (s.kind === 'circle') {
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    const t = clamp(((s.x - ax) * dx + (s.y - ay) * dy) / l2, 0, 1);
    return Math.hypot(ax + dx * t - s.x, ay + dy * t - s.y) < s.r;
  }
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dy = by - ay;
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  return clip(-dx, ax - s.x) && clip(dx, s.x + s.w - ax) && clip(-dy, ay - s.y) && clip(dy, s.y + s.h - ay) && t0 < t1;
}
