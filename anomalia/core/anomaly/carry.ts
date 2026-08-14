/**
 * Mochilas e capacidade — §14. O peso é a decisão.
 *
 * `overloadPenalty` é o bloco de §14 sem alteração. As duas tabelas —
 * mochilas e módulos — estão em data/anomalies/carry.json.
 *
 * O dilema central da seção está implementado como consequência, não como
 * número solto: `ruidoCarregado` soma o `noiseFloor` da mochila com o
 * `metalNoise` das fivelas e das lâminas, e esse total entra no rastro. A
 * mochila grande é a que te mata porque ela literalmente aumenta o score de
 * detecção de quem lê som e de quem lê metal.
 */

import type {
  BackpackDef, CarrySystem, Inventory, ModuleDef, OverloadPenalty,
} from './types.ts';
import { BACKPACK_BY_ID, MODULE_BY_ID, SOBRECARGA } from './catalog.ts';
import { clamp, type Rng } from './rng.ts';
import { pesoDasLaminas } from './blades.ts';

export function mochila(id: string): BackpackDef {
  const b = BACKPACK_BY_ID.get(id);
  if (!b) throw new Error(`mochila desconhecida: ${id}`);
  return b;
}

export function modulo(id: string): ModuleDef {
  const m = MODULE_BY_ID.get(id);
  if (!m) throw new Error(`módulo desconhecido: ${id}`);
  return m;
}

/** A mochila com os módulos instalados. Os percentuais entram por último. */
export function sistemaDeCarga(inv: Inventory): CarrySystem & { metalNoise: number } {
  const base = mochila(inv.backpackId);
  let slots = base.slots;
  let weightMax = base.weightMax;
  let quickSlots = base.quickSlots;
  let noiseFloor = base.noiseFloor;
  let metalNoise = base.metalNoise ?? 0;
  let pctRuido = 0;

  for (const id of inv.modules) {
    const m = modulo(id);
    slots += m.slots ?? 0;
    weightMax += m.weightMax ?? 0;
    quickSlots += m.quickSlots ?? 0;
    metalNoise += m.metalNoise ?? 0;
    pctRuido += m.noiseFloorPct ?? 0;
  }

  noiseFloor = Math.max(0, Math.round(noiseFloor * (1 + pctRuido / 100)));

  return {
    slots: Math.max(0, slots),
    weightMax: Math.max(1, weightMax),
    quickSlots: Math.max(0, quickSlots),
    noiseFloor,
    metalNoise,
  };
}

/**
 * §13 — a arma quebrada não some, vira sucata e continua ocupando espaço.
 * Por isso a sucata pesa: carregar o cabo quebrado é uma decisão, e uma
 * decisão que não custa nada não é decisão.
 */
export function pesoTotal(inv: Inventory): number {
  return inv.cargaKg + pesoDasLaminas(inv.blades);
}

export function overloadPenalty(w: number, max: number): OverloadPenalty {
  const r = w / max;
  if (r <= 0.70) return { speed: 0, fatigue: 1.0, noise: 0 };
  if (r <= 0.90) return { speed: -1, fatigue: 1.3, noise: +10 };
  if (r <= 1.00) return { speed: -2, fatigue: 1.7, noise: +25, sanity: -1 };
  return {
    speed: -4, fatigue: 2.5, noise: +45, dropChance: 0.20,
    text: 'A alça morde o ombro. Alguma coisa cai atrás de você. Você não volta pra ver.',
  };
}

export function penalidadeDoInventario(inv: Inventory): OverloadPenalty {
  const sistema = sistemaDeCarga(inv);
  const base = overloadPenalty(pesoTotal(inv), sistema.weightMax);
  const mochilaDef = mochila(inv.backpackId);
  return { ...base, speed: base.speed + (mochilaDef.velocidadeFuga ?? 0) };
}

/**
 * O ruído que o jogador carrega antes de fazer qualquer coisa. É isto que
 * §13 chama de farol: quem anda armado até os dentes é o mais fácil de achar.
 */
export function ruidoCarregado(inv: Inventory): { som: number; metal: number } {
  const sistema = sistemaDeCarga(inv);
  const penalidade = penalidadeDoInventario(inv);
  const metalDasLaminas = inv.blades
    .filter((b) => !b.sucata)
    .reduce((acc, b) => acc + (b.enrolada ? b.metalNoise * 0.7 : b.metalNoise), 0);

  return {
    som: clamp(sistema.noiseFloor + penalidade.noise, 0, 100),
    metal: clamp(sistema.metalNoise + metalDasLaminas, 0, 100),
  };
}

/** §14 — a sacola de pano rasga: 4% por saída. A alça reforçada tira isso. */
export function rasgou(inv: Inventory, rng: Rng): boolean {
  if (inv.modules.some((id) => modulo(id).removeRasgo)) return false;
  const chance = mochila(inv.backpackId).tearChance ?? 0;
  return rng.chance(chance);
}

// ---------- descarte em fuga (§14) ----------

export const LIMIAR_DE_DESCARTE = SOBRECARGA.descarteAcimaDe;
export const CHANCE_DE_RECUPERAR = SOBRECARGA.recuperacaoNoDiaSeguinte;

export function ofereceDescarte(inv: Inventory): boolean {
  const sistema = sistemaDeCarga(inv);
  return pesoTotal(inv) / sistema.weightMax > LIMIAR_DE_DESCARTE;
}

export interface MochilaLargada {
  locationId: string;
  day: number;
  valor: number;
}

/**
 * §14 — recuperação no dia seguinte: 55%, e só se a anomalia não tiver
 * migrado para cima dela.
 */
export function recuperar(
  largada: MochilaLargada,
  anomaliaEmCima: boolean,
  rng: Rng,
): { ok: boolean; texto: string } {
  if (anomaliaEmCima || !rng.chance(CHANCE_DE_RECUPERAR)) {
    return { ok: false, texto: SOBRECARGA.textoFalhaRecuperacao };
  }
  return { ok: true, texto: 'Está onde você deixou. Molhada, mas está.' };
}

/** §14 — a costurada à mão é âncora do V5: destruída, custa 30 de sanidade. */
export function custoDePerderAMochila(inv: Inventory): number {
  const def = mochila(inv.backpackId);
  return def.ehAncora ? (def.sanityOnDestroy ?? 0) : 0;
}
