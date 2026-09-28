/**
 * BALANCEAMENTO DO CORPO A CORPO: quantos golpes um personagem novo leva, em
 * média, para matar um zumbi comum (morador, dificuldade Sobrevivência).
 * Simula a luta com a MESMA lógica do jogo (hitZombie: parte sorteada, braços
 * aparando, queda deixa a cabeça exposta, desgaste da arma). Alvo combinado:
 * soco ~18–22, armas brancas ~5–8, machado ~3–4.
 */
import { describe, expect, it } from 'vitest';
import { FIST } from '../src/game/combat/Combat';
import { clamp } from '../src/game/core/math';
import { itemDef } from '../src/game/items/ItemCatalog';
import { difficultyFrom, ZOMBIE_PRESETS } from '../src/game/zombies/Difficulty';
import { hitZombie } from '../src/game/zombies/Wounding';
import { createZombie } from '../src/game/zombies/ZombieFactory';
import { ZOMBIE_TUNING as T } from '../src/game/config/ZombieTuning';

const DIFF = difficultyFrom(ZOMBIE_PRESETS.sobrevivencia.settings);

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Melee = { damage: number; speed: number; reach: number; durability: number; kind: 'corte' | 'impacto' | 'perfuracao' };

function weapon(id: string | null): Melee {
  if (!id) return FIST;
  const m = itemDef(id)?.melee;
  if (!m) throw new Error(`sem golpe: ${id}`);
  return m;
}

/** Golpes até matar (jogador de frente, golpeando a cada recarga; zumbi caído fica exposto ~4 s). */
function hitsToKill(m: Melee, seed: number): number {
  const z = createZombie({ id: `b${seed}`, seed, arch: 'morador', x: 0, y: 0, collapseDays: 0 }, DIFF);
  const rng = seeded(seed * 7 + 1);
  const cooldown = clamp(0.95 / m.speed, 0.35, 2.2);
  z.facing = Math.PI; // olhando para o jogador (golpe vem de -x)
  let t = 0;
  let downUntil = -1;
  for (let n = 1; n <= 400; n++) {
    const down = t < downUntil;
    z.mind.state = down ? 'FALL' : 'CHASE';
    z.anim.arms = down ? 0 : 1;
    const cond = Number.isFinite(m.durability) ? Math.max(0, 1 - (n - 1) / m.durability) : 1;
    const r = hitZombie(z, { kind: m.kind, damage: m.damage * (0.55 + 0.45 * cond), dir: 0, reach: m.reach }, t, rng);
    if (r.killed) return n;
    if (r.fall && !down) downUntil = t + ((T.knockdownMin + T.knockdownMax) / 2) * (1.2 - z.traits.coordination * 0.4) + 1.1 + (1 - z.traits.coordination) * 1.4;
    t += cooldown;
  }
  return 400;
}

export function meanHits(id: string | null, n = 1500): number {
  const m = weapon(id);
  let sum = 0;
  for (let i = 1; i <= n; i++) sum += hitsToKill(m, i);
  return sum / n;
}

describe('balanceamento do corpo a corpo (média de golpes para matar um zumbi comum)', () => {
  const range = (id: string | null, lo: number, hi: number) => {
    const m = meanHits(id, 800);
    expect(m, `${id ?? 'soco'}: ${m.toFixed(1)} golpes`).toBeGreaterThanOrEqual(lo);
    expect(m, `${id ?? 'soco'}: ${m.toFixed(1)} golpes`).toBeLessThanOrEqual(hi);
  };

  it('soco: difícil, mas mata (~18–22 golpes)', () => range(null, 17, 24));

  it('armas brancas de verdade: ~5–8 golpes', () => {
    for (const id of ['faca', 'facaCacador', 'facao', 'tacoBeisebol', 'martelo', 'cano', 'tabuaPregos']) range(id, 4, 9);
    range('peDeCabra', 4, 8);
  });

  it('machado e marreta: ~3–4 golpes', () => {
    range('machado', 2.8, 4.3);
    range('marreta', 2.8, 4.5);
  });

  it('arma melhor mata com menos golpes que o soco', () => {
    expect(meanHits('faca', 400)).toBeLessThan(meanHits(null, 400) / 2);
  });
});
