/**
 * HORTA (puro): canteiro com semente plantada cresce pelo relógio do jogo
 * enquanto tiver água (chuva ou rega). Seca dois dias, para de crescer;
 * cinco dias sem água, morre. Frio segura o crescimento; adubo acelera.
 * Madura, colhe; esperou demais, passa do ponto e rende menos; muito
 * tempo depois, apodrece no pé. Nada aparece do nada: só cresce o que foi
 * plantado.
 */
import { FARM_TUNING } from '../config/BuildTuning';
import { itemDef } from '../items/ItemCatalog';
import type { Structure } from './Structures';

/** O que cada cultura rende na colheita (por canteiro). */
export const CROP_YIELD: Record<string, { item: string; n: number }> = {
  tomate: { item: 'tomate', n: 6 },
  alface: { item: 'alface', n: 3 },
  cenoura: { item: 'cenoura', n: 6 },
  milho: { item: 'milhoVerde', n: 4 },
  feijao: { item: 'feijaoCru', n: 1 },
  abobora: { item: 'abobora', n: 2 },
  mandioca: { item: 'mandioca', n: 4 },
};

/** Cor do fruto no desenho (por semente). */
export const CROP_COLOR: Record<string, number> = {
  sementeTomate: 0xd8342a,
  sementeAlface: 0x9ad86a,
  sementeCenoura: 0xe8762a,
  sementeMilho: 0xe8c83a,
  sementeFeijao: 0x6a3a2a,
  sementeAbobora: 0xe8922a,
  ramaMandioca: 0x8a5a3a,
};

export type CropStage = 'vazio' | 'broto' | 'crescendo' | 'madura' | 'passou' | 'morta';

const DAY = 1440;

function spec(seed: string): { crop: string; growDays: number } | null {
  const s = itemDef(seed)?.seed;
  return s ? { crop: s.crop, growDays: s.growDays } : null;
}

/** Dias de crescimento para ficar madura (com a velocidade do sandbox). */
export function daysToRipe(seed: string, speed: number): number {
  return (spec(seed)?.growDays ?? 60) / Math.max(0.1, speed);
}

export function plant(s: Structure, seed: string, now: number): boolean {
  if (s.crop || !spec(seed)) return false;
  s.crop = { seed, planted: now, growth: 0, watered: now };
  s.tickAt = now;
  return true;
}

export function waterPlot(s: Structure, now: number): void {
  if (s.crop && !s.crop.dead) s.crop.watered = now;
}

/**
 * Acerta o crescimento até agora. `rain` 0..1 lá fora, `temp` °C, `speed`
 * do sandbox. Devolve 'morreu' se morreu nesta conta.
 */
export function tickPlot(s: Structure, now: number, rain: number, temp: number, speed: number): 'morreu' | null {
  const c = s.crop;
  const last = s.tickAt ?? now;
  s.tickAt = now;
  if (!c || c.dead) return null;
  if (rain >= FARM_TUNING.rainWaters) c.watered = now;
  const dtDays = Math.max(0, now - last) / DAY;
  const dry = (now - c.watered) / DAY;
  const T = FARM_TUNING;
  if (dry < T.dryStopDays) {
    const cold = temp < T.coldStop ? 0 : temp < T.coldSlow ? 0.4 : 1;
    c.growth += dtDays * speed * cold * (c.fert ? T.fertBoost : 1);
  }
  const ripe = spec(c.seed)?.growDays ?? 60;
  if (dry >= T.dryDieDays || c.growth >= ripe * T.rotAfter) {
    c.dead = 1;
    return 'morreu';
  }
  return null;
}

export function cropStage(s: Structure, _now: number): CropStage {
  const c = s.crop;
  if (!c) return 'vazio';
  if (c.dead) return 'morta';
  const ripe = spec(c.seed)?.growDays ?? 60;
  const g = c.growth / ripe;
  if (g >= FARM_TUNING.overripe) return 'passou';
  if (g >= 1) return 'madura';
  return g < 0.25 ? 'broto' : 'crescendo';
}

/** Colhe: o que rende (e algumas sementes de volta). Limpa o canteiro. */
export function harvest(s: Structure, rng: () => number = Math.random): { id: string; n: number }[] {
  const c = s.crop;
  if (!c) return [];
  const stage = cropStage(s, 0);
  delete s.crop;
  if (stage !== 'madura' && stage !== 'passou') return [];
  const sp = spec(c.seed);
  const y = sp ? CROP_YIELD[sp.crop] : undefined;
  if (!y) return [];
  const n = stage === 'passou' ? Math.max(1, Math.floor(y.n / 2)) : y.n + (c.fert ? 1 : 0);
  const out = [{ id: y.item, n }];
  // Parte vira semente de novo (a horta se sustenta se cuidada).
  const seeds = 1 + Math.floor(rng() * 3);
  out.push({ id: c.seed, n: seeds });
  return out;
}

/** Texto curto ("Tomate · crescendo · 40% · regado"). */
export function plotLabel(s: Structure, now: number): string {
  const c = s.crop;
  if (!c) return 'Canteiro vazio';
  const name = itemDef(c.seed)?.name.replace(/^Sementes de |^Rama de /, '') ?? 'Planta';
  const stage = cropStage(s, now);
  const ripe = spec(c.seed)?.growDays ?? 60;
  const pct = Math.min(100, Math.round((c.growth / ripe) * 100));
  const dry = (now - c.watered) / DAY;
  const water = dry < 1 ? 'regado' : dry < FARM_TUNING.dryStopDays ? 'secando' : 'seco';
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  if (stage === 'morta') return `${cap} · morreu`;
  if (stage === 'madura') return `${cap} · pronto para colher`;
  if (stage === 'passou') return `${cap} · passou do ponto`;
  return `${cap} · ${stage} · ${pct}% · ${water}`;
}
