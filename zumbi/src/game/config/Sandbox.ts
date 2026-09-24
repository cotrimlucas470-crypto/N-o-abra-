/**
 * OPÇÕES DE MUNDO (sandbox): o painel central de ajuste do jogo.
 *
 * Tudo que muda a experiência de uma partida (tamanho da cidade, duração do
 * dia, multiplicadores do personagem e, nas próximas fases, população de
 * zumbis, fome, loot, clima...) mora AQUI, com faixa válida e presets.
 * Sistemas leem `settings.<seção>.<valor>` — nunca números soltos.
 *
 * Seções futuras (entram junto com o sistema que as usa):
 *   zombies (Fase 5), survival (3), combat (6/7), medical (8),
 *   weather/temperature (11), utilities (12), farming (13), vehicles (14).
 */
import { clamp } from '../core/math';

export interface SandboxSettings {
  version: 1;
  world: {
    /** Semente do gerador: mesma semente = mesma cidade. */
    seed: number;
    /** Tamanho da cidade em setores (cada setor = 72 × 56 tiles, ~96 × 75 m na escala do jogo). */
    sectorsX: number;
    sectorsY: number;
  };
  time: {
    /** Minutos REAIS que dura um dia do jogo. */
    dayLengthMinutes: number;
    startDay: number;
    /** Hora do jogo em que a partida começa (0–23,99). */
    startHour: number;
  };
  player: {
    walkSpeedMultiplier: number;
    runSpeedMultiplier: number;
    staminaDrainMultiplier: number;
    staminaRegenMultiplier: number;
  };
  loot: {
    /** Quantidade geral de itens nos recipientes (1 = normal). */
    abundance: number;
    /** Multiplica a chance de itens raros (0 = nunca, 1 = normal). */
    rareMultiplier: number;
    /** Chance extra de um recipiente já ter sido esvaziado por alguém. */
    alreadyLooted: number;
    /** Dias entre o colapso e o dia 1: comida já passada, pilhas mais fracas. */
    collapseAgeDays: number;
    /** Itens soltos pelo chão das construções (1 = normal, 0 = nenhum). */
    floorItems: number;
  };
  nature: {
    /** Dias para uma árvore frutífera repor um fruto. */
    fruitRegrowDays: number;
    /** Densidade da vegetação/objetos da camada de ambiente (0 = nenhuma). */
    density: number;
  };
}

export type SandboxPresetId = 'padrao' | 'cidade-pequena' | 'cidade-grande';

export const SANDBOX_DEFAULTS: SandboxSettings = {
  version: 1,
  world: { seed: 1337, sectorsX: 3, sectorsY: 3 },
  time: { dayLengthMinutes: 48, startDay: 1, startHour: 8 },
  player: { walkSpeedMultiplier: 1, runSpeedMultiplier: 1, staminaDrainMultiplier: 1, staminaRegenMultiplier: 1 },
  loot: { abundance: 1, rareMultiplier: 1, alreadyLooted: 0, collapseAgeDays: 0, floorItems: 1 },
  nature: { fruitRegrowDays: 3, density: 1 },
};

export const SANDBOX_PRESETS: Record<SandboxPresetId, { name: string; description: string; settings: SandboxSettings }> = {
  padrao: { name: 'Padrão', description: 'Cidade 3×3 setores, dia de 48 minutos.', settings: SANDBOX_DEFAULTS },
  'cidade-pequena': {
    name: 'Cidade pequena',
    description: 'Só o setor inicial. Para aparelhos fracos e testes.',
    settings: { ...SANDBOX_DEFAULTS, world: { ...SANDBOX_DEFAULTS.world, sectorsX: 1, sectorsY: 1 } },
  },
  'cidade-grande': {
    name: 'Cidade grande',
    description: 'Cidade 5×5 setores.',
    settings: { ...SANDBOX_DEFAULTS, world: { ...SANDBOX_DEFAULTS.world, sectorsX: 5, sectorsY: 5 } },
  },
};

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** Faixas válidas: qualquer valor de fora (save antigo, URL, bug) é trazido para dentro. */
export function sanitizeSandbox(input: DeepPartial<SandboxSettings> | null | undefined): SandboxSettings {
  const d = SANDBOX_DEFAULTS;
  const i = input ?? {};
  const num = (v: unknown, def: number, min: number, max: number, int = false) => {
    const n = typeof v === 'number' && Number.isFinite(v) ? v : def;
    return clamp(int ? Math.round(n) : n, min, max);
  };
  return {
    version: 1,
    world: {
      seed: num(i.world?.seed, d.world.seed, 0, 2 ** 31 - 1, true),
      sectorsX: num(i.world?.sectorsX, d.world.sectorsX, 1, 9, true),
      sectorsY: num(i.world?.sectorsY, d.world.sectorsY, 1, 9, true),
    },
    time: {
      dayLengthMinutes: num(i.time?.dayLengthMinutes, d.time.dayLengthMinutes, 2, 24 * 60),
      startDay: num(i.time?.startDay, d.time.startDay, 1, 9999, true),
      startHour: num(i.time?.startHour, d.time.startHour, 0, 23.99),
    },
    player: {
      walkSpeedMultiplier: num(i.player?.walkSpeedMultiplier, d.player.walkSpeedMultiplier, 0.5, 2),
      runSpeedMultiplier: num(i.player?.runSpeedMultiplier, d.player.runSpeedMultiplier, 0.5, 2),
      staminaDrainMultiplier: num(i.player?.staminaDrainMultiplier, d.player.staminaDrainMultiplier, 0, 5),
      staminaRegenMultiplier: num(i.player?.staminaRegenMultiplier, d.player.staminaRegenMultiplier, 0.1, 5),
    },
    loot: {
      abundance: num(i.loot?.abundance, d.loot.abundance, 0.1, 4),
      rareMultiplier: num(i.loot?.rareMultiplier, d.loot.rareMultiplier, 0, 5),
      alreadyLooted: num(i.loot?.alreadyLooted, d.loot.alreadyLooted, 0, 0.95),
      collapseAgeDays: num(i.loot?.collapseAgeDays, d.loot.collapseAgeDays, 0, 365),
      floorItems: num(i.loot?.floorItems, d.loot.floorItems, 0, 3),
    },
    nature: {
      fruitRegrowDays: num(i.nature?.fruitRegrowDays, d.nature.fruitRegrowDays, 0.5, 60),
      density: num(i.nature?.density, d.nature.density, 0, 2),
    },
  };
}

/**
 * Lê ajustes de teste da URL (só para desenvolvimento):
 *   ?setores=1x1   ?semente=42   ?dia=10 (minutos reais por dia)   ?hora=20
 *   ?loot=2 (abundância)   ?colapso=30 (dias desde o colapso)
 */
export function sandboxFromUrl(search: string, base: SandboxSettings = SANDBOX_DEFAULTS): SandboxSettings {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return base;
  }
  const out: DeepPartial<SandboxSettings> = structuredClone(base);
  const sectors = params.get('setores')?.match(/^(\d+)x(\d+)$/);
  if (sectors) out.world = { ...out.world, sectorsX: Number(sectors[1]), sectorsY: Number(sectors[2]) };
  const seed = params.get('semente');
  if (seed !== null && /^\d+$/.test(seed)) out.world = { ...out.world, seed: Number(seed) };
  const day = params.get('dia');
  if (day !== null && Number.isFinite(Number(day))) out.time = { ...out.time, dayLengthMinutes: Number(day) };
  const loot = params.get('loot');
  if (loot !== null && Number.isFinite(Number(loot))) out.loot = { ...out.loot, abundance: Number(loot) };
  const colapso = params.get('colapso');
  if (colapso !== null && Number.isFinite(Number(colapso))) out.loot = { ...out.loot, collapseAgeDays: Number(colapso) };
  const hour = params.get('hora');
  if (hour !== null && Number.isFinite(Number(hour))) out.time = { ...out.time, startHour: Number(hour) };
  return sanitizeSandbox(out);
}
