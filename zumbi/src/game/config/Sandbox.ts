/**
 * OPÇÕES DE MUNDO (sandbox): o painel central de ajuste do jogo.
 *
 * Tudo que muda a experiência de uma partida (tamanho da cidade, duração do
 * dia, multiplicadores do personagem e, nas próximas fases, população de
 * zumbis, fome, loot, clima...) mora AQUI, com faixa válida e presets.
 * Sistemas leem `settings.<seção>.<valor>` — nunca números soltos.
 *
 * Seções futuras (entram junto com o sistema que as usa):
 *   zombies (Fase 5), survival (3), loot (4), combat (6/7), medical (8),
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
}

export type SandboxPresetId = 'padrao' | 'cidade-pequena' | 'cidade-grande';

export const SANDBOX_DEFAULTS: SandboxSettings = {
  version: 1,
  world: { seed: 1337, sectorsX: 3, sectorsY: 3 },
  time: { dayLengthMinutes: 48, startDay: 1, startHour: 8 },
  player: { walkSpeedMultiplier: 1, runSpeedMultiplier: 1, staminaDrainMultiplier: 1, staminaRegenMultiplier: 1 },
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
  };
}

/**
 * Lê ajustes de teste da URL (só para desenvolvimento):
 *   ?setores=1x1   ?semente=42   ?dia=10 (minutos reais por dia)   ?hora=20
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
  const hour = params.get('hora');
  if (hour !== null && Number.isFinite(Number(hour))) out.time = { ...out.time, startHour: Number(hour) };
  return sanitizeSandbox(out);
}
