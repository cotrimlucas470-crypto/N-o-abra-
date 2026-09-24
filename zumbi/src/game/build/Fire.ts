/**
 * Regras do FOGO (puro): acender, alimentar, queimar lenha com o relógio,
 * apagar na chuva, calor e luz em volta.
 *
 * A lenha é contada "preguiçosamente": a estrutura guarda quanto tinha no
 * minuto `at`; quanto sobra agora é conta, não um timer por quadro. O
 * sistema de fogo só acerta as contas de vez em quando (chuva muda o ritmo).
 */
import { FIRE_TUNING } from '../config/CraftTuning';
import type { ItemDef } from '../items/ItemTypes';
import type { Structure } from './Structures';
import { STRUCTURE_DEFS } from './StructureCatalog';

/** Minutos de queima que o item rende na fogueira (0 = não queima). */
export function fuelMinutes(def: ItemDef): number {
  const t = def.tags;
  const T = FIRE_TUNING.fuel;
  if ((t.includes('lenha') || t.includes('tabua') || t.includes('madeira') || def.sub === 'movel') && !def.metal) return Math.round(def.weight * T.woodPerKg);
  if (t.includes('isca-fogo') || t.includes('papel')) return T.tinder;
  if (t.includes('tecido') || t.includes('tecido-fonte') || def.category === 'roupa') return T.cloth;
  return 0;
}

/** Serve para pegar fogo rápido (papel, capim, folhas). */
export function isTinder(def: ItemDef): boolean {
  return def.tags.includes('isca-fogo');
}

/** Acelerante: álcool, gasolina, óleo, cachaça. */
export function isAccelerant(def: ItemDef): boolean {
  return def.tags.includes('combustivel') && !def.tags.includes('lenha');
}

function spec(s: Structure) {
  return STRUCTURE_DEFS[s.type].fire ?? null;
}

/** Lenha que sobra agora (minutos), sem mudar nada. */
export function fuelLeft(s: Structure, now: number): number {
  const f = s.fuel ?? 0;
  if (!s.lit) return f;
  return Math.max(0, f - Math.max(0, now - (s.at ?? now)));
}

export function isBurning(s: Structure, now: number): boolean {
  return !!s.lit && fuelLeft(s, now) > 0;
}

/**
 * Acerta a conta da lenha até agora. `rate` > 1 queima mais rápido (chuva).
 * Devolve 'apagou' quando o fogo acabou nesta conta.
 */
export function settle(s: Structure, now: number, rate = 1): 'apagou' | null {
  if (!s.lit) {
    s.at = now;
    return null;
  }
  const dt = Math.max(0, now - (s.at ?? now));
  s.fuel = Math.max(0, (s.fuel ?? 0) - dt * rate);
  s.at = now;
  if (s.fuel <= 0) {
    delete s.lit;
    s.fuel = 0;
    return 'apagou';
  }
  return null;
}

/** Põe lenha. Devolve os minutos que entraram (o resto não cabe). */
export function addFuel(s: Structure, minutes: number, now: number): number {
  const sp = spec(s);
  if (!sp) return 0;
  settle(s, now);
  const room = Math.max(0, sp.maxFuel - (s.fuel ?? 0));
  const n = Math.min(room, minutes);
  s.fuel = (s.fuel ?? 0) + n;
  return n;
}

export function ignite(s: Structure, now: number): boolean {
  if ((s.fuel ?? 0) <= 0) return false;
  settle(s, now);
  s.lit = 1;
  s.at = now;
  return true;
}

export function extinguish(s: Structure, now: number): void {
  settle(s, now);
  delete s.lit;
}

/**
 * Ritmo de queima com o tempo lá fora: chuva no fogo descoberto consome a
 * lenha mais rápido; chuva forte apaga fogo fraco.
 */
export function burnRate(rain: number, sheltered: boolean): number {
  if (sheltered || rain <= 0.05) return 1;
  return 1 + rain * FIRE_TUNING.rainBurn;
}

export function rainPutsOut(s: Structure, now: number, rain: number, sheltered: boolean): boolean {
  return !sheltered && rain >= FIRE_TUNING.rainPutOut && fuelLeft(s, now) < FIRE_TUNING.weakFuel;
}

/** Força do fogo (0..1): pouca lenha, fogo fraco. */
export function strength(s: Structure, now: number): number {
  if (!isBurning(s, now)) return 0;
  return Math.min(1, 0.45 + fuelLeft(s, now) / 120);
}

/** Calor de um conjunto de fogos no ponto (0..1). */
export function heatAt(fires: Iterable<Structure>, x: number, y: number, now: number): number {
  let best = 0;
  for (const s of fires) {
    const sp = spec(s);
    if (!sp || !isBurning(s, now)) continue;
    const d = Math.hypot(s.x - x, s.y - y);
    if (d >= sp.heatRange) continue;
    const h = (1 - d / sp.heatRange) ** 0.8 * strength(s, now);
    if (h > best) best = h;
  }
  return Math.min(1, best);
}

/** Texto curto do estado ("Acesa · lenha para 1h20"). */
export function fireLabel(s: Structure, now: number): string {
  const left = fuelLeft(s, now);
  const h = Math.floor(left / 60);
  const m = Math.round(left % 60);
  const t = h > 0 ? `${h}h${m ? String(m).padStart(2, '0') : ''}` : `${m} min`;
  if (isBurning(s, now)) return `Acesa · lenha para ${t}`;
  return left > 0 ? `Apagada · lenha para ${t}` : 'Apagada · sem lenha';
}
