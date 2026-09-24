/**
 * O ZUMBI como dado (puro, serializável). Cada um é um indivíduo: aparência,
 * atributos, corpo por partes, estado da mente e memória. As capacidades
 * (velocidade, agarrão, equilíbrio, poder de golpe) SAEM DO CORPO: perna
 * destruída faz rastejar; braço destruído não agarra; cabeça destruída mata.
 * Nada de barra de vida genérica.
 */
import { ZOMBIE_TUNING } from '../config/ZombieTuning';
import type { BodyPart } from '../health/Wounds';
import type { ArchId, BottomKind, HatKind, TopKind, VestKind } from './Archetypes';

export type ZState =
  | 'IDLE'
  | 'WANDER'
  | 'INVESTIGATE'
  | 'ALERT'
  | 'SEARCH'
  | 'CHASE'
  | 'ATTACK'
  | 'GRAB'
  | 'BITE'
  | 'STAGGER'
  | 'FALL'
  | 'GET_UP'
  | 'LOSE_TARGET'
  | 'RETURN'
  | 'GROUP'
  | 'DEAD';

export const ZSTATE_LABEL: Record<ZState, string> = {
  IDLE: 'parado',
  WANDER: 'vagando',
  INVESTIGATE: 'investigando',
  ALERT: 'alerta',
  SEARCH: 'procurando',
  CHASE: 'perseguindo',
  ATTACK: 'atacando',
  GRAB: 'agarrando',
  BITE: 'mordendo',
  STAGGER: 'cambaleando',
  FALL: 'caído',
  GET_UP: 'levantando',
  LOSE_TARGET: 'perdeu o alvo',
  RETURN: 'voltando',
  GROUP: 'seguindo o grupo',
  DEAD: 'morto',
};

export type HairStyle = 'careca' | 'raspado' | 'curto' | 'medio' | 'longo' | 'rabo' | 'crespo';

export interface ZombieLook {
  female: boolean;
  age: number;
  /** Altura (m), massa (kg) e escala do desenho. */
  height: number;
  mass: number;
  scale: number;
  /** Largura dos ombros (porte). */
  build: number;
  skin: number;
  hair: { style: HairStyle; color: number };
  top: { kind: TopKind; color: number };
  bottom: { kind: BottomKind; color: number };
  /** null = descalço. */
  shoes: number | null;
  hat?: { kind: HatKind; color: number };
  vest?: VestKind;
  apron?: number;
  backpack?: number;
  glasses: boolean;
  /** 0..1: pele acinzentada, olhos leitosos, carne exposta. */
  decay: number;
  dirt: number;
  blood: number;
  /** Ferimentos visíveis de quando morreu (mordida no pescoço, braço rasgado...). */
  marks: { part: BodyPart; kind: 'mordida' | 'corte' | 'rasgo' | 'queimado' }[];
  /** Proteção das roupas (golpe e bala) por região. */
  armor: { cabeca: number; tronco: number; bracos: number; pernas: number };
}

export interface ZombieTraits {
  /** px/s arrastado e correndo (0 = não corre). */
  walk: number;
  sprint: number;
  /** 1 = adulto médio. */
  strength: number;
  toughness: number;
  /** Multiplicadores de visão e audição. */
  vision: number;
  hearing: number;
  /** 0..1: quão rápido parte para cima e ataca. */
  aggression: number;
  /** s até reagir. */
  reaction: number;
  /** px do alcance do braço. */
  reach: number;
  /** 0..1: resistir a empurrão e tropeço. */
  balance: number;
  /** 0..1: quanto procura antes de desistir; curiosidade por sons. */
  investigation: number;
  /** s de memória do último ponto. */
  memory: number;
  /** 0..1: empurrar porta, passar por janela. */
  coordination: number;
  /** 0..1: tendência a seguir outros zumbis. */
  groupiness: number;
}

export interface Point {
  x: number;
  y: number;
}

/** O que está fazendo agora num obstáculo. */
export interface Obstacle {
  kind: 'door' | 'window' | 'structure' | 'vehicle';
  id: string;
  x: number;
  y: number;
}

export interface ZombieMind {
  state: ZState;
  /** s no estado atual. */
  t: number;
  /** Certeza de ter visto algo (0..1). */
  alert: number;
  /** Para onde está indo. */
  target: Point | null;
  lastSeen: (Point & { t: number }) | null;
  lastHeard: (Point & { t: number; s: number }) | null;
  /** Onde "mora" (volta para cá quando desiste). */
  home: Point;
  /** Busca: centro e tempo restante. */
  searchCenter: Point | null;
  searchLeft: number;
  /** Seguindo quem (grupo). */
  leader: string | null;
  /** Direção de passeio (rad) e contador genérico. */
  heading: number;
  timer: number;
  /** Ataque em preparação. */
  attack: { kind: 'swipe' | 'grab' | 'push' | 'lunge' | 'bite' | 'ankle'; t: number; windup: number } | null;
  /** Agarrando o jogador: mordida em `biteAt` s. */
  grab: { t: number; biteAt: number } | null;
  cooldown: number;
  /** Batendo em porta/janela/construção. */
  bang: Obstacle | null;
  /** Passando pela janela: de → para. */
  climb: { fx: number; fy: number; tx: number; ty: number; t: number; dur: number } | null;
  moan: number;
}

/** O que o desenho precisa saber além do estado (poses contínuas). */
export interface ZombieAnim {
  /** 0 braços caídos … 1 esticados para agarrar. */
  arms: number;
  /** Último golpe recebido: quando (s de simulação) e de onde veio (rad). */
  hitAt: number;
  hitDir: number;
  /** Muda quando a aparência muda (sangue, ferida nova, membro perdido): o desenho refaz a textura. */
  ver: number;
  /** Balanço do corpo ao andar (fase acumulada, rad). */
  sway: number;
}

/** Contas de simulação (não vão para o save). */
export interface ZRuntime {
  /** Última e próxima atualização (s de simulação). */
  last: number;
  next: number;
  /** Próxima olhada e dt acumulado desde a última. */
  look: number;
  lookAcc: number;
  /** Próxima checagem de grupo. */
  social: number;
  /** Enxergando o jogador agora (com certeza). */
  sees: boolean;
  /** Onde notou algo (alerta) — o ponto, não o jogador. */
  noticed: Point | null;
  /** Velocidade do jogador na última vez que o viu (para onde ia). */
  seenV: Point;
  /** Querendo andar e sem sair do lugar (s). */
  stuck: number;
  sx: number;
  sy: number;
  /** Próxima pancada no obstáculo. */
  bangT: number;
  /** A próxima célula da rota é obstáculo quebrável. */
  softAhead: boolean;
  /** Pediu rota e está esperando. */
  pathPending: boolean;
  /** A rota pode passar por obstáculo quebrável. */
  pathSoft: boolean;
}

export function freshRuntime(): ZRuntime {
  return { last: 0, next: 0, look: 0, lookAcc: 0, social: 0, sees: false, noticed: null, seenV: { x: 0, y: 0 }, stuck: 0, sx: 0, sy: 0, bangT: 0, softAhead: false, pathPending: false, pathSoft: false };
}

export interface Zombie {
  id: string;
  seed: number;
  arch: ArchId;
  look: ZombieLook;
  traits: ZombieTraits;
  x: number;
  y: number;
  floor: number;
  facing: number;
  /** Velocidade atual (px/s) — da física perto, da simulação longe. */
  vx: number;
  vy: number;
  /** Integridade de cada parte (1 inteira … 0 destruída). */
  parts: Record<BodyPart, number>;
  mind: ZombieMind;
  /** Nível de simulação (0 completo, 1 simplificado, 2 longe). */
  lod: 0 | 1 | 2;
  dead: boolean;
  /** Morto: quando e como caiu (ângulo do corpo). */
  deadAt?: number;
  corpseAngle?: number;
  /** Morto antes do jogo começar (cenário), não reanima. */
  oldCorpse?: boolean;
  /** Rota atual (não vai para o save: recalcula). */
  path: Point[];
  pathGoal: Point | null;
  pathAge: number;
  /** Andou quanto desde o último passo (animação e som). */
  stride: number;
  anim: ZombieAnim;
  /** Dias desde o colapso usados na criação (a aparência nasce igual ao recarregar). */
  collapseDays: number;
  /** Ferimentos que ganhou em jogo (aparecem no desenho e vão para o save). */
  hits: { part: BodyPart; kind: 'corte' | 'impacto' | 'perfuracao' | 'tiro' | 'queimado' }[];
  rt: ZRuntime;
}

export function freshAnim(): ZombieAnim {
  return { arms: 0, hitAt: -99, hitDir: 0, ver: 0, sway: 0 };
}

export const PARTS: readonly BodyPart[] = ['cabeca', 'pescoco', 'tronco', 'bracoE', 'bracoD', 'maoE', 'maoD', 'pernaE', 'pernaD', 'peE', 'peD'];

export function freshParts(): Record<BodyPart, number> {
  return { cabeca: 1, pescoco: 1, tronco: 1, bracoE: 1, bracoD: 1, maoE: 1, maoD: 1, pernaE: 1, pernaD: 1, peE: 1, peD: 1 };
}

export function freshMind(home: Point, heading: number): ZombieMind {
  return {
    state: 'IDLE',
    t: 0,
    alert: 0,
    target: null,
    lastSeen: null,
    lastHeard: null,
    home: { ...home },
    searchCenter: null,
    searchLeft: 0,
    leader: null,
    heading,
    timer: 0,
    attack: null,
    grab: null,
    cooldown: 0,
    bang: null,
    climb: null,
    moan: 0,
  };
}

// ------------------------------------------------------------------ o corpo decide o que dá para fazer

/** Força de cada perna (perna e pé juntos). */
export function legs(z: Zombie): { left: number; right: number; avg: number } {
  const p = z.parts;
  const left = Math.min(p.pernaE, 0.35 + p.peE * 0.65);
  const right = Math.min(p.pernaD, 0.35 + p.peD * 0.65);
  return { left, right, avg: (left + right) / 2 };
}

/** Rasteja: uma perna destruída ou as duas muito ruins. */
export function isCrawler(z: Zombie): boolean {
  const l = legs(z);
  return Math.min(l.left, l.right) <= 0.08 || l.avg < 0.3;
}

/** Manca (perna ferida). */
export function isLimping(z: Zombie): boolean {
  return !isCrawler(z) && legs(z).avg < 0.7;
}

/** Braços que ainda seguram (0, 1 ou 2). */
export function workingArms(z: Zombie): number {
  const p = z.parts;
  return (p.bracoE > 0.3 && p.maoE > 0.15 ? 1 : 0) + (p.bracoD > 0.3 && p.maoD > 0.15 ? 1 : 0);
}

export function canGrab(z: Zombie): boolean {
  return workingArms(z) > 0 && !isCrawler(z);
}

/** Força do agarrão (0..~1,8). */
export function grabPower(z: Zombie): number {
  return z.traits.strength * (0.45 + 0.275 * workingArms(z)) * (0.6 + 0.4 * z.parts.tronco);
}

/** Equilíbrio agora (ferido cai mais fácil). */
export function balanceNow(z: Zombie): number {
  return z.traits.balance * (0.45 + 0.55 * legs(z).avg) * (0.7 + 0.3 * z.parts.tronco);
}

/** Velocidade de deslocamento (px/s). `run` = quer correr (perseguindo). */
export function moveSpeed(z: Zombie, run: boolean): number {
  if (isCrawler(z)) return ZOMBIE_TUNING.crawlSpeed * (0.6 + 0.4 * (z.parts.bracoE + z.parts.bracoD) / 2);
  const l = legs(z).avg;
  const canRun = run && z.traits.sprint > 0 && l > 0.85;
  const base = canRun ? z.traits.sprint : z.traits.walk;
  return base * (l < 0.7 ? 0.45 + 0.4 * l : 1);
}

/** Morreu? Só a cabeça destruída — ou o corpo todo em pedaços. */
export function isDestroyed(z: Zombie): boolean {
  if (z.parts.cabeca <= 0) return true;
  let sum = 0;
  for (const k of PARTS) sum += z.parts[k];
  return sum / PARTS.length < 0.18 || z.parts.tronco <= 0;
}

/** Integridade média (debug e desenho). */
export function integrity(z: Zombie): number {
  let sum = 0;
  for (const k of PARTS) sum += z.parts[k];
  return sum / PARTS.length;
}

// ------------------------------------------------------------------ save

/** O que muda em jogo (o resto nasce de novo da semente). */
export interface ZombieSave {
  i: string;
  /** Arquétipo e semente (o indivíduo nasce de novo igual). */
  a: ArchId;
  sd: number;
  x: number;
  y: number;
  f: number;
  /** Andar (omitido no térreo). */
  fl?: number;
  s?: ZState;
  /** Partes danificadas (só as que não estão inteiras). */
  p?: Partial<Record<BodyPart, number>>;
  /** Casa (onde fica) e memória do último ponto, se ativa. */
  h?: [number, number];
  m?: [number, number];
  d?: [number, number];
  o?: 1;
  /** Ferimentos de jogo: [parte, tipo]. */
  k?: [number, number][];
}

const HIT_KINDS = ['corte', 'impacto', 'perfuracao', 'tiro', 'queimado'] as const;

const r1 = (v: number) => Math.round(v);
const r2 = (v: number) => Math.round(v * 100) / 100;

export function saveZombie(z: Zombie): ZombieSave {
  const out: ZombieSave = { i: z.id, a: z.arch, sd: z.seed, x: r1(z.x), y: r1(z.y), f: r2(z.facing) };
  if (z.floor) out.fl = z.floor;
  if (z.dead) {
    out.d = [r1(z.deadAt ?? 0), r2(z.corpseAngle ?? 0)];
    if (z.oldCorpse) out.o = 1;
  } else if (z.mind.state !== 'IDLE') out.s = z.mind.state;
  const p: Partial<Record<BodyPart, number>> = {};
  let any = false;
  for (const k of PARTS) {
    if (z.parts[k] < 1) {
      p[k] = r2(Math.max(0, z.parts[k]));
      any = true;
    }
  }
  if (any) out.p = p;
  if (Math.hypot(z.mind.home.x - z.x, z.mind.home.y - z.y) > 32) out.h = [r1(z.mind.home.x), r1(z.mind.home.y)];
  const mem = z.mind.lastSeen ?? z.mind.lastHeard;
  if (mem && !z.dead) out.m = [r1(mem.x), r1(mem.y)];
  if (z.hits.length) out.k = z.hits.slice(-12).map((h) => [PARTS.indexOf(h.part), HIT_KINDS.indexOf(h.kind)]);
  return out;
}

/** Estados que fazem sentido retomar do save (o resto recomeça parado). */
const RESUMABLE: ReadonlySet<ZState> = new Set(['WANDER', 'INVESTIGATE', 'SEARCH', 'RETURN', 'GROUP', 'IDLE']);

/** Aplica o save sobre o zumbi recém-criado da semente. */
export function applySave(z: Zombie, s: ZombieSave, now: number): void {
  if (Number.isFinite(s.x) && Number.isFinite(s.y)) {
    z.x = s.x;
    z.y = s.y;
  }
  if (Number.isFinite(s.f)) z.facing = s.f;
  z.floor = s.fl ?? 0;
  for (const k of PARTS) z.parts[k] = 1;
  for (const [k, v] of Object.entries(s.p ?? {})) if ((PARTS as readonly string[]).includes(k) && Number.isFinite(v)) z.parts[k as BodyPart] = Math.max(0, Math.min(1, v as number));
  z.mind.home = s.h ? { x: s.h[0], y: s.h[1] } : { x: z.x, y: z.y };
  if (s.d) {
    z.dead = true;
    z.deadAt = s.d[0];
    z.corpseAngle = s.d[1];
    z.mind.state = 'DEAD';
    if (s.o) z.oldCorpse = true;
  } else {
    z.mind.state = s.s && RESUMABLE.has(s.s) ? s.s : 'IDLE';
    // Memória volta como "ouviu algo ali" (nunca como "sabe onde o jogador está").
    if (s.m) {
      z.mind.lastHeard = { x: s.m[0], y: s.m[1], t: now, s: 0.4 };
      if (z.mind.state === 'IDLE' || z.mind.state === 'WANDER') z.mind.state = 'INVESTIGATE';
      z.mind.target = { x: s.m[0], y: s.m[1] };
    }
  }
  z.hits = (s.k ?? []).filter(([p, k]) => PARTS[p] && HIT_KINDS[k]).map(([p, k]) => ({ part: PARTS[p]!, kind: HIT_KINDS[k]! }));
  z.anim.ver++;
}
