/**
 * DIFICULDADE dos zumbis — separada da IA. As opções de mundo
 * (`Sandbox.zombies`) viram multiplicadores e distribuições; a IA e o
 * combate leem só `ZombieDifficulty`.
 *
 * Regra: nada de "saco de vida". Deixar o jogo mais difícil muda
 * QUANTIDADE, PERCEPÇÃO, VELOCIDADE (quantos correm), AGARRÃO, INFECÇÃO e
 * DESTRUIÇÃO — não a vida dos zumbis. A resistência só varia pouco.
 * Também nada muda com os dias: o perigo vem de onde eles estão.
 */
import type { SandboxSettings } from '../config/Sandbox';

export interface ZombieDifficulty {
  /** Multiplicador da população inicial. */
  population: number;
  /** Fração dos que conseguem correr (0..1). */
  sprinters: number;
  /** Multiplicadores. */
  speed: number;
  strength: number;
  toughness: number;
  vision: number;
  hearing: number;
  aggression: number;
  memory: number;
  /** Gravidade dos ferimentos que causam. */
  damage: number;
  /** Chance de conseguir agarrar. */
  grab: number;
  /** Tendência de seguir outros zumbis (grupos e hordas). */
  groups: number;
  /** Força contra portas, janelas e construções. */
  destruction: number;
  /** Migração pelo mapa atrás de barulho. */
  migration: number;
  /** Chance de infecção: mordida, corte fundo, arranhão. */
  infectBite: number;
  infectLaceration: number;
  infectScratch: number;
  /** Cerco derruba o jogador mais fácil. */
  knockdown: number;
}

export type ZombiePresetId = 'passeio' | 'sobrevivencia' | 'apocalipse' | 'extincao';

type ZombieSettings = SandboxSettings['zombies'];

export const ZOMBIE_PRESETS: Record<ZombiePresetId, { name: string; description: string; settings: ZombieSettings }> = {
  passeio: {
    name: 'Passeio',
    description: 'Poucos, lentos, desatentos. Para aprender.',
    settings: { population: 0.5, sprinters: 0, speed: 0.85, strength: 0.8, toughness: 0.9, vision: 0.8, hearing: 0.8, aggression: 0.8, memory: 0.7, damage: 0.75, grab: 0.6, groups: 0.7, destruction: 0.6, migration: 0.6, infection: 0.5, knockdown: 0.6 },
  },
  sobrevivencia: {
    name: 'Sobrevivência',
    description: 'O padrão: maioria lenta, alguns correm; mordida quase sempre infecta.',
    settings: { population: 1, sprinters: 0.07, speed: 1, strength: 1, toughness: 1, vision: 1, hearing: 1, aggression: 1, memory: 1, damage: 1, grab: 1, groups: 1, destruction: 1, migration: 1, infection: 1, knockdown: 1 },
  },
  apocalipse: {
    name: 'Apocalipse',
    description: 'O dobro de gente, mais atentos, mais corredores.',
    settings: { population: 2, sprinters: 0.15, speed: 1.1, strength: 1.15, toughness: 1.1, vision: 1.2, hearing: 1.25, aggression: 1.2, memory: 1.4, damage: 1.2, grab: 1.25, groups: 1.3, destruction: 1.4, migration: 1.3, infection: 1, knockdown: 1.3 },
  },
  extincao: {
    name: 'Extinção',
    description: 'Cidade tomada. Um erro mata.',
    settings: { population: 3.5, sprinters: 0.3, speed: 1.2, strength: 1.3, toughness: 1.2, vision: 1.35, hearing: 1.5, aggression: 1.4, memory: 2, damage: 1.4, grab: 1.5, groups: 1.6, destruction: 2, migration: 1.6, infection: 1, knockdown: 1.6 },
  },
};

export function difficultyFrom(z: ZombieSettings): ZombieDifficulty {
  return {
    population: z.population,
    sprinters: z.sprinters,
    speed: z.speed,
    strength: z.strength,
    toughness: z.toughness,
    vision: z.vision,
    hearing: z.hearing,
    aggression: z.aggression,
    memory: z.memory,
    damage: z.damage,
    grab: z.grab,
    groups: z.groups,
    destruction: z.destruction,
    migration: z.migration,
    // Mordida quase sempre infecta; cortes e arranhões às vezes (escala com a opção).
    infectBite: Math.min(1, 0.9 * z.infection),
    infectLaceration: Math.min(1, 0.25 * z.infection),
    infectScratch: Math.min(1, 0.07 * z.infection),
    knockdown: z.knockdown,
  };
}
