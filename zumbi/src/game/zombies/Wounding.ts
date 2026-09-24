/**
 * DANO NO CORPO DO ZUMBI (puro): o golpe acerta UMA parte — escolhida pela
 * direção, pela arma e pela pose (braços esticados na frente aparam; caído,
 * a cabeça fica exposta) — e a parte perde integridade conforme o tipo de
 * golpe, a resistência daquele corpo e o que ele veste (capacete, colete).
 *
 * Não existe barra de vida: cabeça ou pescoço destruído mata; perna
 * destruída derruba e faz rastejar; braço destruído não agarra; tronco
 * estraçalhado mata. Pancada forte desequilibra (cambaleia, cai) conforme o
 * equilíbrio DAQUELE zumbi e o estado das pernas.
 */
import { clamp, angleDelta } from '../core/math';
import { ZOMBIE_TUNING as T } from '../config/ZombieTuning';
import type { BodyPart } from '../health/Wounds';
import { balanceNow, isCrawler, isDestroyed, type Zombie } from './Zombie';

export type ZombieHitKind = 'corte' | 'impacto' | 'perfuracao' | 'tiro' | 'atropelo' | 'queimado';

export interface ZombieHit {
  kind: ZombieHitKind;
  /** Dano base (arma × condição × força de quem bate). */
  damage: number;
  /** Direção do golpe (rad: de quem bate para o zumbi). */
  dir: number;
  /** Alcance da arma (0..1,3): arma longa pega mais a cabeça por cima. */
  reach?: number;
  /** Mira (tiro): 0 no meio do corpo … 1 caprichando na cabeça. */
  aim?: number;
  /** Parte forçada (pisão na cabeça, atropelo nas pernas). */
  part?: BodyPart;
}

export interface ZombieHitResult {
  part: BodyPart;
  /** Integridade da parte antes e depois. */
  before: number;
  after: number;
  killed: boolean;
  /** Membro arrancado/destruído agora. */
  severed: boolean;
  stagger: boolean;
  fall: boolean;
  /** Frase curta para o efeito na tela ("cabeça esmagada"). */
  note?: string;
}

type W = readonly (readonly [BodyPart, number])[];

/** De pé, de frente: braços na frente aparam boa parte. */
const FRONT: W = [['cabeca', 17], ['pescoco', 5], ['tronco', 30], ['bracoE', 12], ['bracoD', 12], ['maoE', 3], ['maoD', 3], ['pernaE', 7], ['pernaD', 7], ['peE', 2], ['peD', 2]];
/** De costas: nada na frente da cabeça e do tronco. */
const BACK: W = [['cabeca', 24], ['pescoco', 8], ['tronco', 40], ['bracoE', 5], ['bracoD', 5], ['pernaE', 8], ['pernaD', 8], ['peE', 1], ['peD', 1]];
/** No chão: a cabeça fica exposta (pisão, golpe de cima). */
const GROUND: W = [['cabeca', 50], ['pescoco', 8], ['tronco', 26], ['bracoE', 5], ['bracoD', 5], ['pernaE', 3], ['pernaD', 3]];
/** Tiro: mira no meio do corpo. */
const SHOT: W = [['cabeca', 11], ['pescoco', 4], ['tronco', 44], ['bracoE', 8], ['bracoD', 8], ['maoE', 1.5], ['maoD', 1.5], ['pernaE', 9], ['pernaD', 9], ['peE', 1.5], ['peD', 1.5]];

function pick(weights: W, rng: () => number, boostHead = 0): BodyPart {
  let total = 0;
  for (const [p, w] of weights) total += p === 'cabeca' ? w * (1 + boostHead) : w;
  let roll = rng() * total;
  for (const [p, w] of weights) {
    roll -= p === 'cabeca' ? w * (1 + boostHead) : w;
    if (roll < 0) return p;
  }
  return 'tronco';
}

/** Quanto cada tipo de golpe rende em cada parte. */
function kindFactor(kind: ZombieHitKind, part: BodyPart): number {
  const limb = part.startsWith('braco') || part.startsWith('perna');
  const tip = part.startsWith('mao') || part.startsWith('pe');
  switch (kind) {
    case 'impacto':
      return part === 'cabeca' ? 1.35 : part === 'tronco' ? 0.55 : limb ? 0.9 : 1;
    case 'corte':
      return part === 'pescoco' ? 1.7 : limb ? 1.25 : tip ? 1.3 : part === 'cabeca' ? 0.95 : 0.7;
    case 'perfuracao':
      return part === 'cabeca' ? 1.6 : part === 'pescoco' ? 1.3 : part === 'tronco' ? 0.4 : 0.6;
    case 'tiro':
      return part === 'cabeca' ? 2.2 : part === 'pescoco' ? 1.5 : part === 'tronco' ? 0.6 : limb ? 1.1 : 1.2;
    case 'atropelo':
      return part === 'tronco' ? 0.7 : limb ? 1.4 : 1;
    case 'queimado':
      return 0.5;
  }
}

/** Proteção do que ele veste na parte, contra o tipo de golpe. */
function armorOn(z: Zombie, part: BodyPart, kind: ZombieHitKind): number {
  const a = z.look.armor;
  const region = part === 'cabeca' ? a.cabeca : part === 'tronco' ? a.tronco : part.startsWith('braco') || part.startsWith('mao') ? a.bracos : part === 'pescoco' ? 0 : a.pernas;
  // Colete e capacete seguram bala melhor que golpe cortante; pancada passa um pouco.
  const k = kind === 'tiro' ? 0.9 : kind === 'corte' || kind === 'perfuracao' ? 0.75 : kind === 'impacto' ? 0.45 : 0.2;
  return clamp(region * k, 0, 0.85);
}

const PART_NAME: Record<BodyPart, string> = {
  cabeca: 'cabeça',
  pescoco: 'pescoço',
  tronco: 'tronco',
  bracoE: 'braço',
  bracoD: 'braço',
  maoE: 'mão',
  maoD: 'mão',
  pernaE: 'perna',
  pernaD: 'perna',
  peE: 'pé',
  peD: 'pé',
};

/** Aplica um golpe. Muda as partes, o estado (cambaleia/cai/morre) e a aparência. */
export function hitZombie(z: Zombie, hit: ZombieHit, now: number, rng: () => number = Math.random): ZombieHitResult {
  const down = z.mind.state === 'FALL' || z.mind.state === 'GET_UP' || isCrawler(z);
  // De costas? (golpe vindo por trás do olhar dele)
  const fromBehind = Math.abs(angleDelta(z.facing, hit.dir)) < Math.PI * 0.45;
  let part: BodyPart;
  if (hit.part) part = hit.part;
  else if (hit.kind === 'tiro') part = pick(down ? GROUND : SHOT, rng, (hit.aim ?? 0) * 1.5);
  else if (down) part = pick(GROUND, rng);
  else part = pick(fromBehind ? BACK : FRONT, rng, Math.max(0, (hit.reach ?? 0.8) - 0.8) * 0.8);
  // Braços esticados aparam o golpe de frente.
  if (!hit.part && !fromBehind && !down && (part === 'cabeca' || part === 'pescoco') && z.anim.arms > 0.6 && rng() < 0.22 * z.anim.arms) part = rng() < 0.5 ? 'bracoE' : 'bracoD';
  // Parte que já não existe: o golpe pega no vizinho.
  if (z.parts[part] <= 0 && part !== 'cabeca') part = part.startsWith('mao') || part.startsWith('braco') ? 'tronco' : part.startsWith('pe') ? (part === 'peE' ? 'pernaE' : 'pernaD') : 'tronco';

  const hp = (T.partHp[part] ?? 30) * z.traits.toughness;
  const dmg = hit.damage * kindFactor(hit.kind, part) * (1 - armorOn(z, part, hit.kind));
  const before = z.parts[part];
  const after = Math.max(0, before - dmg / hp);
  z.parts[part] = after;
  let severed = before > 0 && after <= 0;
  // Pescoço destruído = cabeça fora.
  if (part === 'pescoco' && after <= 0) z.parts.cabeca = 0;
  // Braço destruído leva a mão; perna destruída, o pé.
  if (severed && part.startsWith('braco')) z.parts[part === 'bracoE' ? 'maoE' : 'maoD'] = 0;
  if (severed && part.startsWith('perna')) z.parts[part === 'pernaE' ? 'peE' : 'peD'] = Math.min(z.parts[part === 'pernaE' ? 'peE' : 'peD'], 0.2);
  if (part === 'tronco' || part === 'cabeca') severed = false;

  // Aparência: sangue e marca nova.
  z.look.blood = Math.min(1, z.look.blood + (hit.kind === 'impacto' ? 0.05 : 0.09));
  z.hits.push({ part, kind: hit.kind === 'atropelo' ? 'impacto' : hit.kind });
  if (z.hits.length > 24) z.hits.shift();
  z.anim.hitAt = now;
  z.anim.hitDir = hit.dir;
  z.anim.ver++;

  const killed = isDestroyed(z);
  let stagger = false;
  let fall = false;
  if (!killed) {
    // Desequilíbrio: pancada e atropelo empurram muito; corte e bala menos.
    const push = hit.kind === 'impacto' ? 1 : hit.kind === 'atropelo' ? 3 : hit.kind === 'tiro' ? 0.55 : 0.4;
    const force = (dmg / 22) * push;
    const bal = balanceNow(z);
    const wasStaggering = z.mind.state === 'STAGGER';
    if (!down) {
      stagger = rng() < clamp(force * (1.15 - bal), 0.05, 0.95);
      fall = (stagger && (wasStaggering || rng() < clamp(force * 0.6 * (1.1 - bal), 0, 0.8))) || isCrawler(z) || hit.kind === 'atropelo';
      // Perna acertada em cheio derruba.
      if ((part.startsWith('perna') || part.startsWith('pe')) && after < 0.35 && rng() < 0.6) fall = true;
    }
  }
  let note: string | undefined;
  if (killed) note = part === 'cabeca' ? (hit.kind === 'impacto' ? 'cabeça esmagada' : hit.kind === 'tiro' ? 'tiro na cabeça' : 'golpe na cabeça') : part === 'pescoco' ? 'decapitado' : 'caiu de vez';
  else if (severed) note = `${PART_NAME[part]} arrancad${part.startsWith('mao') || part.startsWith('perna') ? 'a' : 'o'}`;
  else if (fall) note = 'caiu';
  return { part, before, after, killed, severed, stagger, fall, ...(note ? { note } : {}) };
}

/** Empurrão do jogador: sem dano, desequilibra conforme força × equilíbrio. */
export function shoveZombie(z: Zombie, strength: number, rng: () => number = Math.random): { stagger: boolean; fall: boolean } {
  const bal = balanceNow(z);
  const heavy = z.look.mass / 75;
  const p = clamp((strength * 0.9) / heavy - bal * 0.55, 0.1, 0.97);
  const stagger = rng() < p;
  const fall = stagger && rng() < clamp(p - 0.35, 0, 0.7);
  return { stagger, fall };
}
