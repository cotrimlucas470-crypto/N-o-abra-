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
import { ZOMBIE_PRESETS, type ZombiePresetId } from '../zombies/Difficulty';

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
    /** Data do primeiro dia (mês 1–12, dia do mês). Define estação e clima. */
    startMonth: number;
    startDayOfMonth: number;
  };
  climate: {
    /** Soma em todas as temperaturas (°C): negativo = mundo mais frio. */
    temperatureOffset: number;
    /** Frequência da chuva (0 = nunca, 1 = normal). */
    rainMultiplier: number;
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
  survival: {
    /** Velocidade com que fome, sede e cansaço aumentam (1 = normal). */
    hungerRate: number;
    thirstRate: number;
    fatigueRate: number;
  };
  utilities: {
    /** Dias de jogo com água nas torneiras (0 = já cortada). Depois, só chuva, rio e caixa da descarga. */
    waterDays: number;
    /** Dias com gás no fogão (0 = já cortado). Depois, só fogueira e fogão a lenha. */
    gasDays: number;
  };
  farming: {
    /** Velocidade da horta (1 = realista: tomate em 60 dias; 4 = 15 dias). */
    growthSpeed: number;
  };
  /** Zumbis: ver zombies/Difficulty.ts (predefinições Passeio/Sobrevivência/Apocalipse/Extinção). */
  zombies: {
    /** População inicial (1 = normal; 0 = cidade vazia). */
    population: number;
    /** Fração que corre (0..1). */
    sprinters: number;
    speed: number;
    strength: number;
    toughness: number;
    vision: number;
    hearing: number;
    aggression: number;
    memory: number;
    damage: number;
    grab: number;
    groups: number;
    destruction: number;
    migration: number;
    /** Multiplicador da chance de infecção (0 = ninguém se infecta). */
    infection: number;
    knockdown: number;
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
  time: { dayLengthMinutes: 48, startDay: 1, startHour: 8, startMonth: 5, startDayOfMonth: 3 },
  climate: { temperatureOffset: 0, rainMultiplier: 1 },
  player: { walkSpeedMultiplier: 1, runSpeedMultiplier: 1, staminaDrainMultiplier: 1, staminaRegenMultiplier: 1 },
  loot: { abundance: 1, rareMultiplier: 1, alreadyLooted: 0, collapseAgeDays: 0, floorItems: 1 },
  survival: { hungerRate: 1, thirstRate: 1, fatigueRate: 1 },
  utilities: { waterDays: 12, gasDays: 18 },
  farming: { growthSpeed: 4 },
  zombies: { population: 1, sprinters: 0.07, speed: 1, strength: 1, toughness: 1, vision: 1, hearing: 1, aggression: 1, memory: 1, damage: 1, grab: 1, groups: 1, destruction: 1, migration: 1, infection: 1, knockdown: 1 },
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
      startMonth: num(i.time?.startMonth, d.time.startMonth, 1, 12, true),
      startDayOfMonth: num(i.time?.startDayOfMonth, d.time.startDayOfMonth, 1, 31, true),
    },
    climate: {
      temperatureOffset: num(i.climate?.temperatureOffset, d.climate.temperatureOffset, -15, 15),
      rainMultiplier: num(i.climate?.rainMultiplier, d.climate.rainMultiplier, 0, 3),
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
    survival: {
      hungerRate: num(i.survival?.hungerRate, d.survival.hungerRate, 0, 5),
      thirstRate: num(i.survival?.thirstRate, d.survival.thirstRate, 0, 5),
      fatigueRate: num(i.survival?.fatigueRate, d.survival.fatigueRate, 0, 5),
    },
    utilities: {
      waterDays: num(i.utilities?.waterDays, d.utilities.waterDays, 0, 365, true),
      gasDays: num(i.utilities?.gasDays, d.utilities.gasDays, 0, 365, true),
    },
    farming: {
      growthSpeed: num(i.farming?.growthSpeed, d.farming.growthSpeed, 0.25, 30),
    },
    zombies: {
      population: num(i.zombies?.population, d.zombies.population, 0, 6),
      sprinters: num(i.zombies?.sprinters, d.zombies.sprinters, 0, 1),
      speed: num(i.zombies?.speed, d.zombies.speed, 0.4, 2),
      strength: num(i.zombies?.strength, d.zombies.strength, 0.3, 2.5),
      toughness: num(i.zombies?.toughness, d.zombies.toughness, 0.5, 2),
      vision: num(i.zombies?.vision, d.zombies.vision, 0.3, 2.5),
      hearing: num(i.zombies?.hearing, d.zombies.hearing, 0.3, 2.5),
      aggression: num(i.zombies?.aggression, d.zombies.aggression, 0.3, 2),
      memory: num(i.zombies?.memory, d.zombies.memory, 0.3, 4),
      damage: num(i.zombies?.damage, d.zombies.damage, 0.3, 2.5),
      grab: num(i.zombies?.grab, d.zombies.grab, 0, 2.5),
      groups: num(i.zombies?.groups, d.zombies.groups, 0, 2.5),
      destruction: num(i.zombies?.destruction, d.zombies.destruction, 0, 4),
      migration: num(i.zombies?.migration, d.zombies.migration, 0, 3),
      infection: num(i.zombies?.infection, d.zombies.infection, 0, 1.2),
      knockdown: num(i.zombies?.knockdown, d.zombies.knockdown, 0, 2.5),
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
 *   ?mes=7 (começa em julho, inverno)   ?chuva=2 (chove o dobro)
 *   ?agua=0 ?gas=0 (água e gás já cortados)
 *   ?zumbis=0 (sem zumbis) ?zumbis=2 (o dobro)  ?dificuldade=passeio|sobrevivencia|apocalipse|extincao
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
  const month = params.get('mes');
  if (month !== null && Number.isFinite(Number(month))) out.time = { ...out.time, startMonth: Number(month) };
  const rain = params.get('chuva');
  if (rain !== null && Number.isFinite(Number(rain))) out.climate = { ...out.climate, rainMultiplier: Number(rain) };
  const water = params.get('agua');
  if (water !== null && Number.isFinite(Number(water))) out.utilities = { ...(out.utilities ?? {}), waterDays: Number(water) };
  const gas = params.get('gas');
  if (gas !== null && Number.isFinite(Number(gas))) out.utilities = { ...(out.utilities ?? {}), gasDays: Number(gas) };
  const zpop = params.get('zumbis');
  if (zpop !== null && Number.isFinite(Number(zpop))) out.zombies = { ...(out.zombies ?? {}), population: Number(zpop) };
  const diff = params.get('dificuldade');
  if (diff && diff in ZOMBIE_PRESETS) out.zombies = { ...ZOMBIE_PRESETS[diff as ZombiePresetId].settings };
  const hour = params.get('hora');
  if (hour !== null && Number.isFinite(Number(hour))) out.time = { ...out.time, startHour: Number(hour) };
  return sanitizeSandbox(out);
}
