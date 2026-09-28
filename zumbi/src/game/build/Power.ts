/**
 * GERADOR (puro): a gasolina é contada pelo relógio, do mesmo jeito que a
 * lenha do fogo (a estrutura guarda quanto tinha no minuto `at`; quanto
 * sobra agora é conta). Diz também qual prédio ele alimenta:
 * - dentro de um prédio: aquele prédio (e a fumaça fica lá dentro);
 * - lá fora: o prédio para onde foi puxada a extensão (`link`).
 *
 * O que a energia faz (luz nos cômodos, geladeira segurando a comida) e o
 * barulho que chama zumbi ficam no PowerSystem e na cena.
 */
import type { BuildingData } from '../world/MapTypes';
import { buildingAtPoint } from '../world/shelter';
import type { WorldModel } from '../world/WorldModel';
import type { Structure } from './Structures';
import { STRUCTURE_DEFS } from './StructureCatalog';

export const POWER_TUNING = {
  /** Tanque do gerador (L). */
  tank: 12,
  /** Consumo (L por hora de jogo) só com a geladeira; as luzes da casa gastam mais. */
  burnPerHour: 0.5,
  lightsPerHour: 0.15,
  /** Barulho: raio (px) e de quantos em quantos segundos reais sai um "pulso" para a audição. */
  noiseRadius: 900,
  noiseEvery: 2.5,
  /** Alcance da extensão: da borda do gerador até a parede do prédio (px). */
  cordReach: 8 * 64,
  /** Geladeira ligada: a comida envelhece só esta fração do tempo. */
  fridgeAging: 0.2,
  /** Fumaça num lugar fechado: quanto o enjoo sobe por minuto de jogo e a partir de quando avisa. */
  fumesPerMinute: 0.006,
  /** Gerador ruim (condição abaixo disso) às vezes não pega. */
  weakBelow: 0.35,
} as const;

export function isGenerator(s: Structure): boolean {
  return !!STRUCTURE_DEFS[s.type].power;
}

/** Litros por minuto de jogo agora. */
export function burnRate(s: Structure): number {
  const T = POWER_TUNING;
  return (T.burnPerHour + (s.lights ? T.lightsPerHour : 0)) / 60;
}

/** Gasolina que sobra agora (L), sem mudar nada. */
export function fuelLeft(s: Structure, now: number): number {
  const f = s.fuel ?? 0;
  if (!s.run) return f;
  return Math.max(0, f - Math.max(0, now - (s.at ?? now)) * burnRate(s));
}

export function isRunning(s: Structure, now: number): boolean {
  return !!s.run && fuelLeft(s, now) > 0;
}

/** Acerta a conta até agora. Devolve 'acabou' quando a gasolina acabou nesta conta. */
export function settle(s: Structure, now: number): 'acabou' | null {
  if (!s.run) {
    s.at = now;
    return null;
  }
  s.fuel = fuelLeft(s, now);
  s.at = now;
  if (s.fuel <= 0) {
    s.fuel = 0;
    delete s.run;
    return 'acabou';
  }
  return null;
}

/** Põe gasolina (L). Devolve quanto entrou. */
export function addFuel(s: Structure, liters: number, now: number): number {
  settle(s, now);
  const room = Math.max(0, POWER_TUNING.tank - (s.fuel ?? 0));
  const n = Math.min(room, Math.max(0, liters));
  s.fuel = Math.round(((s.fuel ?? 0) + n) * 1000) / 1000;
  return n;
}

/** Condição 0..1 (resistência que sobrou). */
export function condition(s: Structure): number {
  return Math.max(0, Math.min(1, s.hp / STRUCTURE_DEFS[s.type].hp));
}

/**
 * Dá a partida. `roll` = sorteio 0..1 (gerador gasto às vezes afoga).
 * Devolve null (pegou) ou o motivo.
 */
export function start(s: Structure, now: number, roll: number): string | null {
  settle(s, now);
  if ((s.fuel ?? 0) <= 0.01) return 'Sem gasolina.';
  const c = condition(s);
  if (c <= 0.05) return 'O gerador está quebrado.';
  if (c < POWER_TUNING.weakBelow && roll > c / POWER_TUNING.weakBelow) return 'Puxou a corda: tossiu e morreu. Tente de novo.';
  s.run = 1;
  s.at = now;
  return null;
}

export function stop(s: Structure, now: number): void {
  settle(s, now);
  delete s.run;
}

/** Distância do ponto até a borda do retângulo (0 dentro). */
function distToRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }): number {
  return Math.hypot(Math.max(r.x - x, 0, x - (r.x + r.w)), Math.max(r.y - y, 0, y - (r.y + r.h)));
}

/** O gerador está dentro de um prédio? (a fumaça fica lá) */
export function indoorBuilding(model: WorldModel, s: Structure): BuildingData | null {
  return buildingAtPoint(model, s.x, s.y);
}

/** Prédio mais perto ao alcance da extensão (para quem está lá fora). */
export function cordTarget(model: WorldModel, s: Structure): BuildingData | null {
  if (indoorBuilding(model, s)) return null;
  let best: BuildingData | null = null;
  let bd = Infinity;
  const seen = new Set<string>();
  for (const [dx, dy] of [[0, 0], [-POWER_TUNING.cordReach, 0], [POWER_TUNING.cordReach, 0], [0, -POWER_TUNING.cordReach], [0, POWER_TUNING.cordReach]] as const) {
    for (const b of model.index.buildingsNear(s.x + dx, s.y + dy)) {
      if (seen.has(b.id)) continue;
      seen.add(b.id);
      const d = distToRect(s.x, s.y, b.bounds);
      if (d <= POWER_TUNING.cordReach && d < bd) {
        bd = d;
        best = b;
      }
    }
  }
  return best;
}

/** Prédio que o gerador alimenta (dentro dele, ou o da extensão). */
export function poweredBuilding(model: WorldModel, s: Structure): BuildingData | null {
  const inside = indoorBuilding(model, s);
  if (inside) return inside;
  if (!s.link) return null;
  for (const b of model.index.buildingsNear(s.x, s.y)) if (b.id === s.link) return b;
  // O prédio pode estar em outro chunk: procura pelo alcance da extensão.
  const t = cordTarget(model, s);
  return t && t.id === s.link ? t : null;
}

export interface RoomLight {
  x: number;
  y: number;
  radius: number;
  intensity: number;
}

/** Uma lâmpada por cômodo (no centro, raio pelo tamanho do cômodo). */
export function roomLights(b: BuildingData, out: RoomLight[]): void {
  for (const r of b.rooms) {
    const radius = Math.min(420, Math.max(150, Math.hypot(r.rect.w, r.rect.h) * 0.62));
    out.push({ x: r.rect.x + r.rect.w / 2, y: r.rect.y + r.rect.h / 2, radius, intensity: 0.92 });
  }
}

/** Texto curto do estado (examinar / botão). */
export function powerLabel(s: Structure, now: number): string {
  const f = fuelLeft(s, now);
  const liters = f < 0.05 ? 'sem gasolina' : `${f.toFixed(1).replace('.', ',')} L`;
  const hours = isRunning(s, now) ? ` · ~${Math.max(0, Math.floor(f / (burnRate(s) * 60)))} h` : '';
  return `${isRunning(s, now) ? 'ligado' : 'desligado'} · ${liters}${hours}`;
}
