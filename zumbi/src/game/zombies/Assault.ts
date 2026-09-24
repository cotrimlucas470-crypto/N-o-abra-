/**
 * ATAQUES DOS ZUMBIS no jogador (puro). Cada ataque é uma tentativa com
 * causa e efeito claros — nada de "dano por segundo":
 *
 * - UNHADA: arranhão ou corte num braço/mão/tronco; roupa grossa segura.
 * - AGARRÃO: segura; parado ou lento, o jogador vira alvo de MORDIDA.
 *   Solta correndo com força, empurrando ou batendo — mais difícil cansado,
 *   pesado, ferido, e impossível com vários agarrando.
 * - EMPURRÃO / CERCO: o grupo empurra; com fôlego baixo, carga pesada,
 *   perna ferida ou cercado, o jogador CAI — e no chão é mordido.
 * - BOTE (quem corre): pula em cima, pode derrubar.
 * - TORNOZELO (quem rasteja): morde o pé/perna ou faz tropeçar.
 *
 * Mordida quase sempre infecta; arranhão raramente. A roupa conta (couro,
 * jaqueta, luva, bota). O estado do jogador conta (fôlego, peso, dor,
 * ferimentos). A dificuldade só mexe em chances e gravidade.
 */
import { clamp } from '../core/math';
import type { Health } from '../health/Health';
import { PART_INFO, type BodyPart, type WoundKind } from '../health/Wounds';
import type { WearSlot } from '../items/ItemTypes';
import type { PhysicalEffects } from '../survival/Effects';
import type { ZombieDifficulty } from './Difficulty';
import { grabPower, type Zombie } from './Zombie';

export type AttackKind = 'swipe' | 'grab' | 'push' | 'lunge' | 'bite' | 'ankle';

/** O que o ataque precisa saber do jogador. */
export interface PlayerDefense {
  health: Health;
  protection(slots: readonly WearSlot[]): { bite: number; scratch: number };
  /** Fôlego 0..1. */
  stamina: number;
  fx: PhysicalEffects;
  /** Peso sentido / capacidade (0..1+). */
  load: number;
  /** Correndo agora e para longe do zumbi. */
  fleeing: boolean;
  down: boolean;
  /** Quantos já estão agarrando. */
  grabbed: number;
  /** Quantos zumbis colados (cerco). */
  crowd: number;
}

export interface AttackOutcome {
  kind: AttackKind;
  landed: boolean;
  part?: BodyPart;
  wound?: WoundKind;
  /** A roupa segurou. */
  blocked?: boolean;
  grab?: boolean;
  /** Derrubado por tantos segundos. */
  knockdown?: number;
  /** Empurrado (px, na direção do zumbi → jogador). */
  push?: number;
  /** Fôlego perdido (0..1 da barra). */
  stamina?: number;
  /** Pegou a infecção (o jogador não sabe na hora). */
  infected?: boolean;
  /** Frase para a tela e para o registro de morte. */
  text: string;
  tone: 'info' | 'warn' | 'bad';
}

type W = readonly (readonly [BodyPart, number])[];
const SWIPE: W = [['bracoE', 22], ['bracoD', 22], ['maoE', 12], ['maoD', 12], ['tronco', 20], ['pescoco', 4], ['cabeca', 6]];
const BITE_STANDING: W = [['bracoE', 22], ['bracoD', 22], ['maoE', 8], ['maoD', 8], ['pescoco', 16], ['tronco', 14], ['cabeca', 3], ['pernaE', 2], ['pernaD', 2]];
const BITE_DOWN: W = [['pescoco', 26], ['bracoE', 15], ['bracoD', 15], ['maoE', 6], ['maoD', 6], ['tronco', 14], ['cabeca', 6], ['pernaE', 6], ['pernaD', 6]];
const ANKLE: W = [['peE', 30], ['peD', 30], ['pernaE', 20], ['pernaD', 20]];

function pick(w: W, rng: () => number): BodyPart {
  let t = 0;
  for (const [, x] of w) t += x;
  let r = rng() * t;
  for (const [p, x] of w) {
    r -= x;
    if (r < 0) return p;
  }
  return 'tronco';
}

/** "no braço esquerdo" */
function where(part: BodyPart): string {
  return PART_INFO[part].where;
}

/** Quanto o jogador aguenta (0..~1,4): força, fôlego, peso, dor, braços. */
export function playerFirmness(d: PlayerDefense): number {
  const load = d.load > 0.7 ? 1 - clamp((d.load - 0.7) / 0.5, 0, 0.6) : 1;
  const pain = 1 - clamp(d.health.pain / 160, 0, 0.5);
  return clamp(d.fx.melee * (0.45 + 0.65 * d.stamina) * load * pain, 0.1, 1.4);
}

/** Chance de ir ao chão empurrado/cercado. */
function knockChance(d: PlayerDefense, base: number, diff: ZombieDifficulty): number {
  const legs = d.health.effects().legs;
  const load = d.load > 0.7 ? clamp((d.load - 0.7) / 0.3, 0, 1.5) : 0;
  const crowd = Math.max(0, d.crowd - 1);
  return clamp(base * diff.knockdown * (1 + crowd * 0.7) * (1 + load * 0.8) * (1 + legs) * (1.5 - d.stamina) * (d.grabbed > 0 ? 1.4 : 1), 0, 0.92);
}

function infect(kind: WoundKind, diff: ZombieDifficulty, rng: () => number): boolean {
  const p = kind === 'mordida' ? diff.infectBite : kind === 'laceracao' ? diff.infectLaceration : kind === 'corte' ? diff.infectScratch * 2 : diff.infectScratch;
  return rng() < p;
}

/** Resolve um ataque que CHEGOU a tocar (distância e ângulo já conferidos por quem chama). */
export function resolveAttack(z: Zombie, kind: AttackKind, d: PlayerDefense, diff: ZombieDifficulty, rng: () => number = Math.random): AttackOutcome {
  const str = z.traits.strength;
  const dmg = diff.damage;
  switch (kind) {
    case 'swipe': {
      // Quem está fugindo leva menos (a mão pega de raspão ou erra).
      if (rng() > (d.fleeing ? 0.45 : 0.8)) return { kind, landed: false, text: 'A mão passou raspando.', tone: 'info' };
      const part = pick(SWIPE, rng);
      const prot = d.protection(PART_INFO[part].slots).scratch;
      if (rng() < prot) {
        return { kind, landed: true, blocked: true, part, stamina: 0.03, text: `Unhada ${where(part)}: a roupa segurou.`, tone: 'info' };
      }
      const roll = rng() * (0.8 + 0.4 * str * dmg);
      const wound: WoundKind = roll > 1.05 ? 'laceracao' : roll > 0.75 ? 'corte' : 'arranhao';
      const sev = clamp((0.2 + rng() * 0.45) * dmg * (0.8 + 0.3 * str), 0.1, 1);
      d.health.add(part, wound, sev);
      const infected = infect(wound, diff, rng);
      const label = wound === 'arranhao' ? 'Arranhão' : wound === 'corte' ? 'Corte' : 'Corte fundo';
      return { kind, landed: true, part, wound, infected, stamina: 0.04, text: `${label} ${where(part)}!`, tone: wound === 'arranhao' ? 'warn' : 'bad' };
    }
    case 'grab': {
      const hold = grabPower(z) * diff.grab;
      const escape = playerFirmness(d) * (d.fleeing ? 1.5 : 1);
      const p = clamp(0.62 * hold * (1 + 0.45 * d.grabbed) - escape * 0.32, 0.04, 0.95);
      if (rng() >= p) return { kind, landed: false, text: d.fleeing ? 'Escapou de uma agarrada.' : 'Desvencilhou-se da mão.', tone: 'info', stamina: 0.03 };
      return { kind, landed: true, grab: true, stamina: 0.06, text: d.grabbed > 0 ? 'Mais um agarrou!' : 'Agarrado! Empurre, bata ou corra para se soltar.', tone: 'bad' };
    }
    case 'push': {
      const pk = knockChance(d, 0.07 * str, diff);
      if (rng() < pk) {
        const t = 1.8 + rng() * 1.2;
        return { kind, landed: true, knockdown: t, stamina: 0.12, text: d.crowd > 1 ? `Derrubado pelo grupo (${d.crowd} em volta)!` : 'Derrubado!', tone: 'bad' };
      }
      return { kind, landed: true, push: 18 + 16 * str, stamina: 0.05, text: 'Empurrão.', tone: 'warn' };
    }
    case 'lunge': {
      const pk = knockChance(d, 0.3 * str, diff);
      if (rng() < pk) return { kind, landed: true, knockdown: 2 + rng() * 1.5, stamina: 0.15, text: 'Ele pulou em cima e derrubou você!', tone: 'bad' };
      return resolveAttack(z, 'grab', d, diff, rng);
    }
    case 'bite': {
      const part = pick(d.down ? BITE_DOWN : BITE_STANDING, rng);
      const prot = d.protection(PART_INFO[part].slots).bite;
      if (rng() < prot) {
        d.health.add(part, 'contusao', 0.25 + rng() * 0.2);
        return { kind, landed: true, blocked: true, part, wound: 'contusao', text: `Mordida ${where(part)}: não atravessou a roupa.`, tone: 'warn' };
      }
      const sev = clamp((0.45 + rng() * 0.45) * dmg * (part === 'pescoco' ? 1.25 : 1), 0.2, 1);
      d.health.add(part, 'mordida', sev);
      const infected = infect('mordida', diff, rng);
      return { kind, landed: true, part, wound: 'mordida', infected, stamina: 0.05, text: part === 'pescoco' ? 'MORDIDA NO PESCOÇO!' : `Mordida ${where(part)}!`, tone: 'bad' };
    }
    case 'ankle': {
      if (!d.down && d.fleeing && rng() < clamp(0.25 * diff.knockdown * (1.5 - d.stamina), 0, 0.6)) {
        return { kind, landed: true, knockdown: 1.2 + rng() * 0.8, text: 'Agarrou seu tornozelo — você caiu!', tone: 'bad' };
      }
      const part = pick(ANKLE, rng);
      const prot = d.protection(PART_INFO[part].slots).bite;
      if (rng() < prot) return { kind, landed: true, blocked: true, part, text: `Mordeu ${where(part).replace(/^n[oa] /, 'o ')}: a bota/calça segurou.`, tone: 'info' };
      d.health.add(part, 'mordida', clamp((0.35 + rng() * 0.35) * dmg, 0.15, 1));
      const infected = infect('mordida', diff, rng);
      return { kind, landed: true, part, wound: 'mordida', infected, text: `Mordida ${where(part)} (ele estava no chão)!`, tone: 'bad' };
    }
  }
}

/**
 * Força para se soltar por segundo (0..~1,5) contra quem agarra. Correndo
 * para longe, empurrando e batendo ajudam; cada agarrão a mais pesa.
 */
export function escapeRate(d: PlayerDefense, holders: readonly Zombie[], diff: ZombieDifficulty, effort: 'parado' | 'puxando' | 'empurrando'): number {
  if (!holders.length) return 99;
  let hold = 0;
  for (const z of holders) hold += grabPower(z) * diff.grab;
  const e = effort === 'empurrando' ? 2.2 : effort === 'puxando' ? 1 : 0.15;
  return (playerFirmness(d) * e) / Math.max(0.2, hold * (1 + 0.35 * (holders.length - 1)));
}
