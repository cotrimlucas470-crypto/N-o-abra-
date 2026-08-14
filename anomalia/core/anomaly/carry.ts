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
 *
 * §14 abre dizendo que o inventário é **peso + volume + ruído**, "três
 * limites que brigam entre si", mas só dá números para dois deles. O volume
 * está aqui: `slots` é teto de verdade, a lâmina ocupa espaço (a sucata de
 * §13 também, que é o que dá peso àquela regra), e os quatro custos ocultos
 * da tabela de módulos — coldre, compartimento oculto, forro, alça — só
 * significam alguma coisa porque alguém os lê.
 */

import type {
  BackpackDef, Inventory, ModuleDef, OverloadPenalty,
  RevistaHumana, RuidoCarregado, SistemaDeCarga,
} from './types.ts';
import { BACKPACK_BY_ID, MODULE_BY_ID, SOBRECARGA, VOLUME } from './catalog.ts';
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
export function sistemaDeCarga(inv: Inventory): SistemaDeCarga {
  const base = mochila(inv.backpackId);
  let slots = base.slots;
  let weightMax = base.weightMax;
  let quickSlots = base.quickSlots;
  let noiseFloor = base.noiseFloor;
  let metalNoise = base.metalNoise ?? 0;
  let compartimentoOculto = 0;
  let laminasForaDoSlot = 0;
  let visual = 0;
  let pctRuido = 0;

  for (const id of inv.modules) {
    const m = modulo(id);
    slots += m.slots ?? 0;
    weightMax += m.weightMax ?? 0;
    quickSlots += m.quickSlots ?? 0;
    metalNoise += m.metalNoise ?? 0;
    compartimentoOculto += m.compartimentoOculto ?? 0;
    visual += m.visual ?? 0;
    if (m.laminaForaDoSlot) laminasForaDoSlot += 1;
    pctRuido += m.noiseFloorPct ?? 0;
  }

  noiseFloor = Math.max(0, Math.round(noiseFloor * (1 + pctRuido / 100)));

  return {
    slots: Math.max(0, slots),
    weightMax: Math.max(1, weightMax),
    quickSlots: Math.max(0, quickSlots),
    noiseFloor,
    metalNoise,
    compartimentoOculto,
    laminasForaDoSlot,
    visual,
  };
}

// ---------- peso ----------

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

/** §14 — acima de 100% do teto, 20% de deixar alguma coisa cair por saída. */
export function derrubouAlgo(inv: Inventory, rng: Rng): boolean {
  return rng.chance(penalidadeDoInventario(inv).dropChance ?? 0);
}

// ---------- volume: o segundo dos três limites ----------

export const SLOTS_POR_LAMINA = VOLUME.slotsPorLamina;
export const VOLUME_APERTADO = VOLUME.apertadoAPartirDe;
export const PENALIDADE_DE_DUTO = VOLUME.penalidadeDeDutoPadrao;

/**
 * As lâminas que ainda pesam no volume. Cada coldre instalado tira uma do
 * bolso — e a põe à mostra, que é o custo que a tabela cobra por ele.
 */
export function laminasNoVolume(inv: Inventory): number {
  const { laminasForaDoSlot } = sistemaDeCarga(inv);
  return Math.max(0, inv.blades.length - laminasForaDoSlot);
}

export function volumeUsado(inv: Inventory): number {
  return inv.slotsUsados + laminasNoVolume(inv) * SLOTS_POR_LAMINA;
}

export function capacidadeDeVolume(inv: Inventory): number {
  const s = sistemaDeCarga(inv);
  return s.slots + s.compartimentoOculto;
}

export function slotsLivres(inv: Inventory): number {
  return capacidadeDeVolume(inv) - volumeUsado(inv);
}

/** Cabe mais alguma coisa? É o que decide se o loot volta com você. */
export function cabe(inv: Inventory, itens = 1): boolean {
  return slotsLivres(inv) >= itens;
}

/**
 * §14 — "2 slots invisíveis em revista humana". Só o que está dentro da
 * mochila se esconde: a lâmina no coldre está no corpo, à vista de quem
 * revista.
 */
export function revistaHumana(inv: Inventory): RevistaHumana {
  const { compartimentoOculto } = sistemaDeCarga(inv);
  const total = inv.slotsUsados + inv.blades.length;
  const ocultos = Math.min(compartimentoOculto, inv.slotsUsados);
  return { visiveis: total - ocultos, ocultos };
}

/**
 * §14 dá "-10 de furtividade em duto" como custo oculto da mochila de trilha,
 * de 14 slots, e não repete a linha para a tática, o cargueiro e a costurada —
 * que são maiores. Tomado ao pé da letra, o cargueiro de 24 slots passaria por
 * um duto melhor que a trilha, o que inverte o dilema inteiro da seção. A
 * regra aqui é volumétrica: quem chega ao volume da trilha paga o que a
 * trilha paga. O número continua sendo o do documento.
 *
 * E vale o volume **depois** dos módulos, então o forro de espuma — que custa
 * 2 slots — passa a ser o que faz uma trilha caber no duto. Um módulo que
 * abaixa o ruído e afina o vulto: é a mesma decisão contada duas vezes.
 */
export function penalidadeDeDuto(inv: Inventory): number {
  if (capacidadeDeVolume(inv) < VOLUME_APERTADO) return 0;
  return mochila(inv.backpackId).furtividadeEmDuto ?? PENALIDADE_DE_DUTO;
}

/**
 * §14 — `quickSlots` é "acesso em encontro (1 rolagem = 1 item)". Com zero
 * deles não existe sacar nada no meio de uma: a sacola de pano é a mochila
 * que te deixa sem opção justamente na tela em que a opção decide tudo.
 */
export function podeSacarNoEncontro(inv: Inventory): boolean {
  return sistemaDeCarga(inv).quickSlots > 0;
}

// ---------- ruído ----------

/**
 * O ruído que o jogador carrega antes de fazer qualquer coisa. É isto que
 * §13 chama de farol: quem anda armado até os dentes é o mais fácil de achar.
 *
 * O canal de luz é o coldre de §14: a arma pendurada por fora reflete o que
 * houver, e quem lê luz — a A04 — passa a ter o que ler num jogador de
 * lanterna apagada. O coldre é o módulo que troca espaço por visibilidade, e
 * essa troca só existe se alguém somar os 15 em algum lugar.
 */
export function ruidoCarregado(inv: Inventory): RuidoCarregado {
  const sistema = sistemaDeCarga(inv);
  const penalidade = penalidadeDoInventario(inv);
  const metalDasLaminas = inv.blades
    .filter((b) => !b.sucata)
    .reduce((acc, b) => acc + (b.enrolada ? b.metalNoise * 0.7 : b.metalNoise), 0);

  return {
    som: clamp(sistema.noiseFloor + penalidade.noise, 0, 100),
    metal: clamp(sistema.metalNoise + metalDasLaminas, 0, 100),
    luz: clamp(exposicaoVisual(inv), 0, 100),
  };
}

/** §14 — "arma exposta: +15 visual". Coldre vazio não expõe nada. */
export function exposicaoVisual(inv: Inventory): number {
  const { visual, laminasForaDoSlot } = sistemaDeCarga(inv);
  if (laminasForaDoSlot === 0 || inv.blades.length === 0) return 0;
  return visual;
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

/**
 * §14 — a opção de largar aparece "com sobrecarga acima de 0.90". Não é a
 * qualquer momento em que se tem loot: é o preço de ter carregado demais.
 */
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
