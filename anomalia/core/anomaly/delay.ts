/**
 * Sistema de atraso — §7. A arma branca não mata: compra segundos.
 *
 * `resolveBladeDelay` é o bloco de §7 com a mesma forma e as mesmas tabelas.
 * Três reconciliações, todas declaradas:
 *
 *   1. §7 chama o campo de `blade.weight`; §13, que é a definição completa do
 *      item, chama de `blade.class` e acrescenta IMPROVISADA e UTIL. O campo
 *      aqui é `class`, e `classeDeAtraso` mapeia as duas novas para as três
 *      tabelas que §7 traz.
 *   2. §7 deriva o `base` da classe (3/4/6); §13 dá um atraso por arma
 *      (estilete 2, faca 3, ambos LEVE). O da arma vence quando existe, que é
 *      o dado mais específico; a fórmula em volta é a de §7, intacta.
 *   3. A linha da tabela de §6 diz "22% de perder a arma, 11% de contato" para
 *      Cortar passagem. §7 traz números por classe, e nenhum bate com esses
 *      22/11 — quem resolve é §7, porque é o que está escrito como código.
 *      A linha de §6 ficou como o que o jogador acha que sabe.
 */

import type {
  AnomalyDef, BladeItem, DelayClass, DelayOutcome, DelayResult, WeightedOutcome,
} from './types.ts';
import type { Rng } from './rng.ts';
import { roll } from './rng.ts';

export function classeDeAtraso(blade: BladeItem): DelayClass {
  switch (blade.class) {
    case 'LEVE':
    case 'UTIL':          return 'LEVE';
    case 'MEDIA':
    case 'IMPROVISADA':   return 'MEDIA';
    case 'PESADA':        return 'PESADA';
  }
}

const TABELA_LEVE: WeightedOutcome[] = [
  { r: 0.62, out: 'ESCAPE_LIMPO' },
  { r: 0.20, out: 'ESCAPE_ARRASTADO' },
  { r: 0.11, out: 'PERDEU_ARMA' },
  { r: 0.07, out: 'CONTATO' },
];

const TABELA_MEDIA: WeightedOutcome[] = [
  { r: 0.55, out: 'ESCAPE_LIMPO' },
  { r: 0.22, out: 'ESCAPE_ARRASTADO' },
  { r: 0.14, out: 'PERDEU_ARMA' },
  { r: 0.09, out: 'CONTATO' },
];

const TABELA_PESADA: WeightedOutcome[] = [
  { r: 0.48, out: 'ESCAPE_LIMPO' },
  { r: 0.20, out: 'ESCAPE_ARRASTADO' },
  { r: 0.19, out: 'PERDEU_ARMA' },
  { r: 0.13, out: 'CONTATO' },
];

export const TABELAS_DE_ATRASO: Record<DelayClass, WeightedOutcome[]> = {
  LEVE: TABELA_LEVE, MEDIA: TABELA_MEDIA, PESADA: TABELA_PESADA,
};

export function resolveBladeDelay(
  blade: BladeItem,
  def: AnomalyDef,
  rng: Rng,
): DelayResult {
  const classe = classeDeAtraso(blade);

  const base = blade.delayTicks > 0
    ? blade.delayTicks
    : classe === 'LEVE' ? 3 : classe === 'MEDIA' ? 4 : 6;

  // §13: a baioneta é o único item que causa recuo real
  const recuo = blade.recuoExtra ?? 0;

  const ticks = Math.max(1, Math.round(base * (1 - def.delayResistance))) + recuo;

  const table = TABELAS_DE_ATRASO[classe];

  // §13: enrolar a lâmina em pano abafa o metal e come a lâmina
  const desgaste = (blade.class === 'PESADA' ? 2 : 1) + (blade.enrolada ? 1 : 0);
  blade.durability -= desgaste;

  return {
    ticks,
    outcome: roll(table, rng) as DelayOutcome,
    bladeBroken: blade.durability <= 0,
  };
}

/**
 * §13 — arma em durability <= 2 emite som de rachadura ao usar: swingNoise +40.
 * Quebrada não some: vira sucata e continua ocupando espaço.
 */
export const LIMIAR_DE_RACHADURA = 2;
export const RUIDO_DE_RACHADURA = 40;

export function ruidoDoGolpe(blade: BladeItem): number {
  const rachada = blade.durability <= LIMIAR_DE_RACHADURA ? RUIDO_DE_RACHADURA : 0;
  return blade.swingNoise + rachada;
}

/** §13: o metal que a arma põe no rastro. O pano tira 30%. */
export function metalDaArma(blade: BladeItem): number {
  const base = blade.enrolada ? blade.metalNoise * 0.7 : blade.metalNoise;
  return Math.round(base);
}

/** §13: a lâmina de vidro-osso não é metal para quem só lê metal. */
export function invisivelPara(blade: BladeItem, anomalyId: string): boolean {
  return blade.invisivelPara?.includes(anomalyId) ?? false;
}

export function quebrar(blade: BladeItem): BladeItem {
  return { ...blade, durability: 0, sucata: true };
}
