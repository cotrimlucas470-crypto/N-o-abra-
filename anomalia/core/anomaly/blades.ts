/**
 * Armas brancas — §13. Nenhuma mata. Toda uma compra tempo ou muda o rastro.
 *
 * O catálogo das 16 está em data/anomalies/blades.json. O que mora aqui são
 * as regras de manutenção da mesma seção, e uma delas é a que dá peso a todas
 * as outras: **toda arma reparada perde 1 de maxDurability permanentemente.**
 * Nada volta a ser novo.
 *
 * A resolução do atraso está em delay.ts, que é onde §7 mora.
 */

import type { BladeItem, CraftRecipe } from './types.ts';
import { RECIPES, BLADES } from './catalog.ts';
import { LIMIAR_DE_RACHADURA } from './delay.ts';

export { BLADES };

const RECEITA_BY_ID = new Map(RECIPES.map((r) => [r.id, r]));

export function receita(id: string): CraftRecipe {
  const r = RECEITA_BY_ID.get(id);
  if (!r) throw new Error(`receita desconhecida: ${id}`);
  return r;
}

export interface ResultadoDeReparo {
  ok: boolean;
  motivo?: 'SEM_BANCADA' | 'SEM_REPARO' | 'JA_INTEIRA' | 'SUCATA';
  blade: BladeItem;
  minutos: number;
  materiais: readonly string[];
}

/** §13 — reparo só no abrigo, em bancada. */
export function reparar(
  blade: BladeItem,
  temBancada: boolean,
): ResultadoDeReparo {
  const vazio = { blade, minutos: 0, materiais: [] as readonly string[] };
  if (!temBancada) return { ok: false, motivo: 'SEM_BANCADA', ...vazio };
  if (blade.sucata) return { ok: false, motivo: 'SUCATA', ...vazio };
  if (blade.repairCost.recipe === 'SEM_REPARO') {
    return { ok: false, motivo: 'SEM_REPARO', ...vazio };
  }
  if (blade.durability >= blade.maxDurability) {
    return { ok: false, motivo: 'JA_INTEIRA', ...vazio };
  }

  // o teto cai antes do conserto entrar: a arma nunca volta ao que era
  const maxDurability = Math.max(1, blade.maxDurability - 1);
  const durability = Math.min(maxDurability, blade.durability + blade.repairCost.restore);

  return {
    ok: true,
    blade: { ...blade, durability, maxDurability },
    minutos: blade.repairCost.time,
    materiais: blade.repairCost.in,
  };
}

/** §13 — amolar acalma. É a única manutenção que devolve cabeça. */
export function ritualDeAmolar(): { minutos: number; sanidade: number; materiais: readonly string[] } {
  const r = receita('SHARPEN_RITUAL');
  return { minutos: r.time, sanidade: r.sanity ?? 0, materiais: r.in };
}

/** §13 — enrolar em pano: -30% de metal, e come a lâmina a cada uso. */
export function enrolarEmPano(blade: BladeItem): BladeItem {
  return { ...blade, enrolada: true };
}

export function desenrolar(blade: BladeItem): BladeItem {
  const { enrolada: _enrolada, ...resto } = blade;
  return resto;
}

/** §13 — quebrada não some: vira sucata e continua ocupando espaço. */
export function viraSucata(blade: BladeItem): BladeItem {
  return { ...blade, durability: 0, sucata: true };
}

export function estaRachada(blade: BladeItem): boolean {
  return !blade.sucata && blade.durability <= LIMIAR_DE_RACHADURA;
}

export interface ResultadoDeCraft {
  ok: boolean;
  minutos: number;
  ruido: number;
  materiais: readonly string[];
}

export function craftar(id: string): ResultadoDeCraft {
  const r = receita(id);
  return { ok: true, minutos: r.time, ruido: r.noise ?? 0, materiais: r.in };
}

/** Peso total das lâminas carregadas — entra na conta de sobrecarga de §14. */
export function pesoDasLaminas(blades: readonly BladeItem[]): number {
  return blades.reduce((acc, b) => acc + b.weightKg, 0);
}
