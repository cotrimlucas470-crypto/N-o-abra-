/**
 * FÁBRICA de zumbis: sorteia UM indivíduo a partir de uma semente e de quem
 * a pessoa era (arquétipo). Tudo sai da semente — aparência, corpo,
 * atributos, ferimentos antigos —, então o save só precisa guardar a semente
 * e o que mudou em jogo.
 *
 * Os atributos derivam do CORPO: idoso é lento e fraco, pesado é forte e
 * firme mas cansa o passo, recém-transformado e jovem pode correr, muito
 * decomposto enxerga mal. A dificuldade só multiplica (ver Difficulty.ts).
 */
import { clamp } from '../core/math';
import { Random } from '../core/Random';
import { ZOMBIE_TUNING as T } from '../config/ZombieTuning';
import type { BodyPart } from '../health/Wounds';
import { ARCHETYPES, type ArchId, type TopKind } from './Archetypes';
import type { ZombieDifficulty } from './Difficulty';
import { freshAnim, freshMind, freshParts, freshRuntime, type HairStyle, type Zombie, type ZombieLook, type ZombieTraits } from './Zombie';

/** Tons de pele humanos (antes da decomposição, que o desenho aplica). */
export const SKIN_TONES = [0xf3d6bb, 0xeac29e, 0xdcac80, 0xc99466, 0xae774d, 0x8f5d3b, 0x6e4631, 0x4f3325] as const;
const HAIR_YOUNG = [0x16110d, 0x2a1b12, 0x3d2616, 0x5a3a22, 0x7a5530, 0xb89258, 0xd2b378, 0x86381a] as const;
const HAIR_OLD = [0x77736e, 0x9a9690, 0xbdbab2, 0xdad7cf] as const;
const SHOES = [0x1c1a18, 0x2a2420, 0x4a3424, 0x6a4a30, 0xe6e4de, 0x8a8a8a, 0x2a3a5a, 0xa83030] as const;

/** Tops de manga comprida/grossa protegem um pouco os braços. */
const THICK_TOPS: ReadonlySet<TopKind> = new Set(['jaqueta', 'casaco', 'macacao', 'camuflado', 'moletom', 'terno', 'jaleco', 'doma']);

export interface ZombieSpawn {
  id: string;
  seed: number;
  arch: ArchId;
  x: number;
  y: number;
  floor?: number;
  /** Dias entre o colapso e agora (decomposição). */
  collapseDays: number;
}

function band(r: Random, [a, b]: readonly [number, number]): number {
  return r.range(a, b);
}

/** Aparência a partir da semente. */
export function rollLook(r: Random, arch: ArchId, collapseDays: number): ZombieLook {
  const a = ARCHETYPES[arch];
  const female = r.chance(a.female);
  // Idade: puxa para o meio da faixa (duas amostras).
  const age = Math.round((band(r, a.age) + band(r, a.age)) / 2);
  const build = clamp((band(r, a.build) + band(r, a.build)) / 2, 0, 1);
  // Altura (m): mulher e idoso são menores, em média.
  let height = female ? r.range(1.5, 1.76) : r.range(1.6, 1.9);
  if (age > 70) height -= 0.04;
  height = Math.round(height * 100) / 100;
  // Massa pelo "IMC" (19 magro … 33 pesado).
  const bmi = 19 + build * 14 + r.range(-1.5, 1.5);
  const mass = Math.round(bmi * height * height);
  const skin = r.pick(SKIN_TONES);
  // Cabelo pela idade e pelo sexo.
  const old = age > 55 && r.chance(clamp((age - 45) / 30, 0, 0.95));
  const hairColor = old ? r.pick(HAIR_OLD) : r.pick(HAIR_YOUNG);
  let style: HairStyle;
  if (female) style = r.weighted<HairStyle>([['longo', 4], ['rabo', 3], ['medio', 3], ['crespo', 1.5], ['curto', 1]]);
  else style = r.weighted<HairStyle>([['curto', 5], ['raspado', 3], ['careca', age > 45 ? 3 : 0.5], ['crespo', 1.5], ['medio', 1]]);
  const topKind = r.pick(a.tops.filter((t) => female || t !== 'vestido').length ? a.tops.filter((t) => female || t !== 'vestido') : a.tops);
  let bottomKind = r.pick(a.bottoms.filter((b) => female || b !== 'saia').length ? a.bottoms.filter((b) => female || b !== 'saia') : a.bottoms);
  if (topKind === 'vestido') bottomKind = 'saia';
  if (topKind === 'pijama' && r.chance(0.5)) bottomKind = 'calca';
  const look: ZombieLook = {
    female,
    age,
    height,
    mass,
    scale: Math.round((height / 1.72) * (0.94 + build * 0.14) * 100) / 100,
    build,
    skin,
    hair: { style, color: hairColor },
    top: { kind: topKind, color: r.pick(a.colors.top) },
    bottom: { kind: bottomKind, color: r.pick(a.colors.bottom) },
    shoes: r.pick(SHOES),
    glasses: r.chance(a.glasses ?? 0),
    decay: 0,
    dirt: band(r, a.dirt),
    blood: r.range(0.15, 0.85),
    marks: [],
    armor: { cabeca: a.armor?.cabeca ?? 0, tronco: a.armor?.tronco ?? 0, bracos: a.armor?.bracos ?? 0, pernas: a.armor?.pernas ?? 0 },
  };
  // Descalço: de pijama quase sempre; às vezes perdeu o sapato.
  if ((topKind === 'pijama' && r.chance(0.7)) || r.chance(0.04)) look.shoes = null;
  for (const h of a.hats ?? []) {
    if (r.chance(h.chance)) {
      look.hat = { kind: h.kind, color: h.colors ? r.pick(h.colors) : r.pick([0x2a2a2a, 0xc8342a, 0x2a4a8a, 0xe8e8e0, 0x3a6a3a]) };
      break;
    }
  }
  if (a.vest && r.chance(a.vest.chance)) look.vest = a.vest.kind;
  if (a.apron && r.chance(a.apron.chance)) look.apron = r.pick(a.apron.colors);
  if (a.backpack && r.chance(a.backpack)) look.backpack = r.pick([0x2a2a2a, 0x3a5a8a, 0x8a2a2a, 0x4a5a3a, 0x6a4a8a, 0xd8a03a]);
  // Proteção vinda do que veste.
  if (look.hat?.kind === 'capacete') look.armor.cabeca = Math.max(look.armor.cabeca, 0.6);
  if (look.hat?.kind === 'capaceteObra') look.armor.cabeca = Math.max(look.armor.cabeca, 0.35);
  if (look.vest === 'balistico') look.armor.tronco = Math.max(look.armor.tronco, 0.6);
  if (THICK_TOPS.has(topKind)) look.armor.bracos = Math.max(look.armor.bracos, 0.1);
  if (bottomKind === 'calca') look.armor.pernas = Math.max(look.armor.pernas, 0.05);
  // Decomposição: dias desde o colapso + quando essa pessoa se transformou.
  look.decay = clamp(0.12 + collapseDays * 0.012 + r.range(0, 0.3) + (r.chance(0.12) ? r.range(0.2, 0.4) : 0), 0, 1);
  // Marcas de como morreu (mordida no pescoço é a clássica).
  const marks = r.int(1, 3);
  for (let i = 0; i < marks; i++) {
    const part = r.weighted<BodyPart>([['pescoco', 4], ['bracoE', 2.5], ['bracoD', 2.5], ['tronco', 2.5], ['maoE', 1], ['maoD', 1], ['cabeca', 1], ['pernaE', 1], ['pernaD', 1]]);
    const kind = r.weighted<ZombieLook['marks'][number]['kind']>([['mordida', 5], ['rasgo', 3], ['corte', 2], ['queimado', 0.3]]);
    look.marks.push({ part, kind });
    if (part === 'pescoco') look.blood = Math.min(1, look.blood + 0.2);
  }
  return look;
}

/** Atributos a partir do corpo, do arquétipo e da dificuldade. */
export function rollTraits(r: Random, arch: ArchId, look: ZombieLook, diff: ZombieDifficulty): ZombieTraits {
  const a = ARCHETYPES[arch];
  const old = clamp((look.age - 50) / 35, 0, 1);
  const young = clamp((40 - look.age) / 20, 0, 1);
  const heavy = look.build;
  const fresh = 1 - look.decay;
  // Andar: velho, pesado e podre arrastam mais.
  const walkBase = r.range(T.shambleMin, T.shambleMax) * (1 - old * 0.28) * (1 - heavy * 0.12) * (0.8 + 0.2 * fresh);
  // Corre? Raro, e só quem é recente e inteiro; jovem e atleta, mais.
  const sprintChance = diff.sprinters * a.sprint * (0.35 + young * 0.9) * clamp((0.6 - look.decay) / 0.35, 0, 1.2) * (1 - old * 0.95);
  const sprint = r.chance(clamp(sprintChance, 0, 0.95)) ? r.range(T.sprintMin, T.sprintMax) * (1 - heavy * 0.12) * diff.speed : 0;
  const strength = clamp((0.8 + heavy * 0.35 + (look.female ? -0.1 : 0.08) - old * 0.25 + r.range(-0.12, 0.12)) * diff.strength, 0.2, 3);
  const toughness = clamp(r.range(0.88, 1.12) * (0.95 + heavy * 0.1) * diff.toughness, 0.4, 2.4);
  const vision = clamp(r.range(0.6, 1.2) * (1 - look.decay * 0.35) * (look.glasses ? 0.8 : 1) * diff.vision, 0.1, 3);
  const hearing = clamp(r.range(0.7, 1.3) * (1 - old * 0.2) * diff.hearing, 0.1, 3);
  const aggression = clamp(r.range(0.5, 1) * (0.9 + 0.2 * fresh) * diff.aggression, 0.1, 2);
  const reaction = clamp(r.range(0.25, 0.9) * (1 + old * 0.5 + look.decay * 0.4) / Math.max(0.3, aggression), 0.12, 2.5);
  const reach = T.reachMin + (T.reachMax - T.reachMin) * clamp((look.height - 1.5) / 0.4, 0, 1) + r.range(-2, 2);
  const balance = clamp(r.range(0.4, 0.95) * (0.85 + heavy * 0.3) * (1 - old * 0.3), 0.15, 1);
  const investigation = clamp(r.range(0.25, 1), 0, 1);
  const memory = r.range(T.memoryMin, T.memoryMax) * (0.7 + 0.3 * fresh) * diff.memory;
  const coordination = clamp(r.range(0.15, 0.85) * (0.5 + 0.7 * fresh) * (1 - old * 0.3), 0.05, 1);
  const groupiness = clamp(r.range(0.3, 1) * diff.groups, 0, 2);
  return {
    walk: Math.round(walkBase * diff.speed),
    sprint: Math.round(sprint),
    strength: round2(strength),
    toughness: round2(toughness),
    vision: round2(vision),
    hearing: round2(hearing),
    aggression: round2(aggression),
    reaction: round2(reaction),
    reach: Math.round(reach),
    balance: round2(balance),
    investigation: round2(investigation),
    memory: Math.round(memory),
    coordination: round2(coordination),
    groupiness: round2(groupiness),
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Ferimentos de antes (manca, rasteja, braço estraçalhado). */
function rollOldInjuries(r: Random, parts: Record<BodyPart, number>): void {
  const roll = r.next();
  if (roll < 0.025) {
    // Perna destruída: rasteja.
    const side = r.chance(0.5) ? 'E' : 'D';
    parts[`perna${side}`] = 0;
    parts[`pe${side}`] = r.range(0, 0.4);
  } else if (roll < 0.11) {
    // Manca.
    parts[r.chance(0.5) ? 'pernaE' : 'pernaD'] = r.range(0.3, 0.65);
  }
  if (r.chance(0.07)) {
    const side = r.chance(0.5) ? 'E' : 'D';
    parts[`braco${side}`] = r.chance(0.35) ? 0 : r.range(0.2, 0.5);
    if (parts[`braco${side}`] === 0) parts[`mao${side}`] = 0;
  }
  if (r.chance(0.05)) parts[r.chance(0.5) ? 'maoE' : 'maoD'] = r.range(0, 0.4);
  if (r.chance(0.08)) parts.tronco = r.range(0.55, 0.85);
  if (r.chance(0.04)) parts.pescoco = r.range(0.4, 0.8);
}

/** Um zumbi completo, pronto para o mundo. */
export function createZombie(spawn: ZombieSpawn, diff: ZombieDifficulty): Zombie {
  const r = new Random(spawn.seed);
  const look = rollLook(r, spawn.arch, spawn.collapseDays);
  const traits = rollTraits(r, spawn.arch, look, diff);
  const parts = freshParts();
  rollOldInjuries(r, parts);
  const heading = r.range(-Math.PI, Math.PI);
  return {
    id: spawn.id,
    seed: spawn.seed,
    arch: spawn.arch,
    look,
    traits,
    x: spawn.x,
    y: spawn.y,
    floor: spawn.floor ?? 0,
    facing: heading,
    vx: 0,
    vy: 0,
    parts,
    mind: freshMind({ x: spawn.x, y: spawn.y }, heading),
    lod: 2,
    dead: false,
    path: [],
    pathGoal: null,
    pathAge: 0,
    stride: r.range(0, 1),
    anim: freshAnim(),
    collapseDays: spawn.collapseDays,
    hits: [],
    rt: freshRuntime(),
  };
}
